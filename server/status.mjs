/**
 * Capacity + health status for the Brachas with Rimon API — the machine-readable
 * contract the cloud watch routine reads (GET /api/status?key=…).
 *
 * Why: nothing in the cloud watched this service (the only check was a local
 * scheduled task that only runs while the desktop app is open). The operator's
 * rule: "as the app grows we must never reach the point where there are too
 * many people for it to handle". So the server measures itself — users and
 * growth, DB and volume bytes, memory, event-loop lag, vision quota, Anthropic
 * errors (credit exhaustion), daily-thought freshness, backups, push — and
 * turns thresholds into WARN/CRITICAL alerts. The routine only relays them.
 *
 * Key: STATUS_KEY env, else sha256('status:' + BROADCAST_KEY).slice(0, 24) —
 * a read-only derived key, no new secret to manage. Without BROADCAST_KEY the
 * route plays dead (404), like /api/admin/broadcast.
 *
 * Other modules record events with mark()/fail() — e.g. mark('backup', {ok:true}),
 * fail('anthropic', 402, 'analyze'). Everything here is cheap: counters in
 * memory, a handful of indexed COUNT queries, two stat() calls.
 */
import { createHash } from 'crypto';
import { existsSync, statSync, statfsSync } from 'fs';
import { join } from 'path';
import { monitorEventLoopDelay } from 'perf_hooks';

const STARTED_AT = Date.now();
const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();

/** last-event registry: kind -> { ok, at, status, where, detail, consecutiveFailures } */
const marks = new Map();
export function mark(kind, info = {}) {
  const prev = marks.get(kind) || { consecutiveFailures: 0 };
  const ok = info.ok !== false;
  marks.set(kind, {
    ...prev,
    ...info,
    ok,
    at: Date.now(),
    consecutiveFailures: ok ? 0 : (prev.consecutiveFailures || 0) + 1,
    lastOkAt: ok ? Date.now() : prev.lastOkAt ?? null,
    lastError: ok ? prev.lastError ?? null : { at: Date.now(), status: info.status ?? null, where: info.where ?? null, detail: String(info.detail ?? '').slice(0, 300) },
  });
}
export const fail = (kind, status, where, detail) => mark(kind, { ok: false, status, where, detail });
export const marksSnapshot = () => Object.fromEntries(marks);

export function statusKey() {
  if (process.env.STATUS_KEY) return process.env.STATUS_KEY.trim();
  const b = (process.env.BROADCAST_KEY || '').trim();
  return b ? createHash('sha256').update(`status:${b}`).digest('hex').slice(0, 24) : null;
}

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
/** Thresholds — env-tunable so the operator can retune without a deploy. */
export const THRESHOLDS = {
  volumeWarnPct: num(process.env.STATUS_VOLUME_WARN_PCT, 70),
  volumeCritPct: num(process.env.STATUS_VOLUME_CRIT_PCT, 85),
  rssWarnMb: num(process.env.STATUS_RSS_WARN_MB, 1024),
  rssCritMb: num(process.env.STATUS_RSS_CRIT_MB, 1800),
  loopWarnMs: num(process.env.STATUS_LOOP_WARN_MS, 200),
  loopCritMs: num(process.env.STATUS_LOOP_CRIT_MS, 1000),
  analyzeWarnPct: num(process.env.STATUS_ANALYZE_WARN_PCT, 80),
  thoughtWarnDays: num(process.env.STATUS_THOUGHT_WARN_DAYS, 2),
  thoughtCritDays: num(process.env.STATUS_THOUGHT_CRIT_DAYS, 4),
  backupCritHours: num(process.env.STATUS_BACKUP_CRIT_HOURS, 36),
  surgeUsers24h: num(process.env.STATUS_SURGE_USERS_24H, 500),
  usersSoftCeiling: num(process.env.STATUS_USERS_SOFT_CEILING, 15000),
};

const mb = (b) => Math.round((b / 1048576) * 10) / 10;
const hours = (ms) => Math.round((ms / 3_600_000) * 10) / 10;

/**
 * Build the status document.
 *  db        — node:sqlite handle (COUNT queries only)
 *  dataDir   — the volume path
 *  probes    — { analyze(), thought(), backupEnabled(), apnsEnabled(), learnedMax }
 */
export function buildStatus({ db, dataDir, probes }) {
  const now = Date.now();
  const alerts = [];
  const add = (level, code, message, data = {}) => alerts.push({ level, code, message, ...data });

  // ---- users + growth
  const q = (sql, ...p) => db.prepare(sql).get(...p);
  const users = q('SELECT COUNT(*) n FROM users').n;
  const users24h = q('SELECT COUNT(*) n FROM users WHERE created > ?', now - 86_400_000).n;
  const users7d = q('SELECT COUNT(*) n FROM users WHERE created > ?', now - 7 * 86_400_000).n;
  const testAccounts = q("SELECT COUNT(*) n FROM users WHERE email LIKE 'e2e-%@example.com' OR email LIKE 'store-demo-%@example.com' OR email LIKE 'scenario-%'").n;
  const webPush = q('SELECT COUNT(*) n FROM users WHERE push IS NOT NULL').n;
  const apns = q('SELECT COUNT(*) n FROM users WHERE apns IS NOT NULL').n;
  const boards = q('SELECT COUNT(*) n FROM boards').n;
  const messages = q('SELECT COUNT(*) n FROM board_messages').n;
  const learned = q('SELECT COUNT(*) n FROM learned_foods').n;
  if (users24h >= THRESHOLDS.surgeUsers24h) add('warn', 'signup_surge', `${users24h} new accounts in 24h — watch vision quota and memory`, { users24h });
  if (users >= THRESHOLDS.usersSoftCeiling) add('warn', 'users_soft_ceiling', `${users} users — re-run the capacity audit (single-instance SQLite design was sized for ~15k)`, { users });

  // ---- storage
  let dbBytes = 0;
  for (const f of ['rimon.db', 'rimon.db-wal', 'rimon.db-shm']) {
    const p = join(dataDir, f);
    if (existsSync(p)) dbBytes += statSync(p).size;
  }
  let volume = null;
  try {
    const s = statfsSync(dataDir);
    const total = Number(s.bsize) * Number(s.blocks);
    const free = Number(s.bsize) * Number(s.bavail);
    volume = { totalMb: mb(total), freeMb: mb(free), usedPct: total ? Math.round(((total - free) / total) * 1000) / 10 : null };
    if (volume.usedPct != null) {
      if (volume.usedPct >= THRESHOLDS.volumeCritPct) add('critical', 'volume_full', `volume ${volume.usedPct}% used`, volume);
      else if (volume.usedPct >= THRESHOLDS.volumeWarnPct) add('warn', 'volume_high', `volume ${volume.usedPct}% used`, volume);
    }
  } catch (e) {
    volume = { error: e.message };
  }

  // ---- process
  const mem = process.memoryUsage();
  const rssMb = mb(mem.rss);
  if (rssMb >= THRESHOLDS.rssCritMb) add('critical', 'memory_critical', `RSS ${rssMb} MB`, { rssMb });
  else if (rssMb >= THRESHOLDS.rssWarnMb) add('warn', 'memory_high', `RSS ${rssMb} MB`, { rssMb });
  const loopP99Ms = Math.round(loop.percentile(99) / 1e6);
  const loopMaxMs = Math.round(loop.max / 1e6);
  loop.reset();
  if (loopP99Ms >= THRESHOLDS.loopCritMs) add('critical', 'event_loop_blocked', `event-loop p99 ${loopP99Ms} ms`, { loopP99Ms, loopMaxMs });
  else if (loopP99Ms >= THRESHOLDS.loopWarnMs) add('warn', 'event_loop_slow', `event-loop p99 ${loopP99Ms} ms`, { loopP99Ms, loopMaxMs });

  // ---- vision / Anthropic
  const analyze = probes.analyze();
  const pct = analyze.globalCap ? Math.round((analyze.today / analyze.globalCap) * 100) : 0;
  if (pct >= 100) add('critical', 'vision_quota_exhausted', `vision calls today ${analyze.today}/${analyze.globalCap} — photo identification is refusing new calls until midnight UTC`, analyze);
  else if (pct >= THRESHOLDS.analyzeWarnPct) add('warn', 'vision_quota_high', `vision calls today ${analyze.today}/${analyze.globalCap} (${pct}%)`, analyze);
  const anthropic = marks.get('anthropic') || null;
  if (anthropic?.lastError && !anthropic.ok) {
    const st = anthropic.lastError.status;
    if (st === 401 || st === 402 || st === 403 || (st === 400 && /credit|billing/i.test(anthropic.lastError.detail || '')))
      add('critical', 'anthropic_credit_or_key', `Anthropic API ${st} at ${anthropic.lastError.where} — vision, food research and the daily thought are DOWN until credit/key is fixed`, anthropic.lastError);
    else if (anthropic.consecutiveFailures >= 3)
      add('warn', 'anthropic_failing', `${anthropic.consecutiveFailures} consecutive Anthropic failures (last ${st} at ${anthropic.lastError.where})`, anthropic.lastError);
  }
  if (!probes.visionKey()) add('warn', 'vision_key_missing', 'ANTHROPIC_API_KEY unset — photo identification runs in demo mode');

  // ---- daily thought
  const thought = probes.thought();
  if (thought.cachedDateKey) {
    const ageDays = thought.ageDays ?? 0;
    if (ageDays >= THRESHOLDS.thoughtCritDays) add('critical', 'daily_thought_stale', `daily thought is ${ageDays} days old (${thought.lastReject || thought.lastError || 'no fresh lesson accepted'})`, thought);
    else if (ageDays >= THRESHOLDS.thoughtWarnDays) add('warn', 'daily_thought_stale', `daily thought is ${ageDays} days old (${thought.lastReject || thought.lastError || 'no fresh lesson accepted'})`, thought);
  } else if (probes.visionKey()) add('warn', 'daily_thought_missing', 'no daily thought cached yet', thought);

  // ---- learned foods
  const learnedMax = probes.learnedMax;
  if (learned >= learnedMax) add('warn', 'learned_cap_reached', `learned foods at cap ${learned}/${learnedMax} — new foods stay unmatched`, { learned, learnedMax });

  // ---- backups
  const backup = marks.get('backup') || null;
  if (!probes.backupEnabled()) add('warn', 'backups_disabled', 'off-volume backups are OFF (BACKUP_KEY/BACKUP_REPO/BACKUP_TOKEN unset) — the Railway volume is the only copy of every account');
  else if (backup?.lastOkAt && now - backup.lastOkAt > THRESHOLDS.backupCritHours * 3_600_000)
    add('critical', 'backup_stale', `last successful backup ${hours(now - backup.lastOkAt)}h ago`, backup.lastError || {});
  else if (backup && !backup.ok && !backup.lastOkAt) add('critical', 'backup_never_succeeded', 'backups enabled but no upload has succeeded yet', backup.lastError || {});

  // ---- push
  const apnsMark = marks.get('apns') || null;
  if (apns > 0 && !probes.apnsEnabled()) add('warn', 'apns_key_missing', `${apns} native devices registered but APNS_KEY/APNS_KEY_ID/APNS_TEAM_ID unset — no native pushes are delivered`);
  if (apnsMark && !apnsMark.ok && apnsMark.consecutiveFailures >= 5) add('warn', 'apns_failing', `${apnsMark.consecutiveFailures} consecutive APNs failures (last ${apnsMark.lastError?.status})`, apnsMark.lastError || {});
  for (const dep of ['hebcal', 'sefaria', 'webpush']) {
    const m = marks.get(dep);
    if (m && !m.ok && m.consecutiveFailures >= 5) add('warn', `${dep}_failing`, `${m.consecutiveFailures} consecutive ${dep} failures`, m.lastError || {});
  }

  const level = alerts.some((a) => a.level === 'critical') ? 'critical' : alerts.some((a) => a.level === 'warn') ? 'warn' : 'ok';
  return {
    ok: level !== 'critical',
    level,
    generated_at: new Date(now).toISOString(),
    uptime_hours: hours(now - STARTED_AT),
    node: process.version,
    users: { total: users, real_estimate: Math.max(0, users - testAccounts), test_accounts: testAccounts, new_24h: users24h, new_7d: users7d, web_push: webPush, apns_devices: apns },
    social: { boards, messages, learned_foods: learned, learned_max: learnedMax },
    storage: { db_mb: mb(dbBytes), volume },
    process: { rss_mb: rssMb, heap_used_mb: mb(mem.heapUsed), event_loop_p99_ms: loopP99Ms, event_loop_max_ms: loopMaxMs, analyze_in_flight: analyze.inFlight },
    vision: { today: analyze.today, global_cap: analyze.globalCap, per_user_cap: analyze.perUserCap, key_set: probes.visionKey(), pct_of_cap: pct },
    daily_thought: thought,
    backups: { enabled: probes.backupEnabled(), last_ok_at: backup?.lastOkAt ? new Date(backup.lastOkAt).toISOString() : null, last_error: backup?.lastError ?? null },
    dependencies: Object.fromEntries([...marks].map(([k, v]) => [k, { ok: v.ok, at: new Date(v.at).toISOString(), consecutive_failures: v.consecutiveFailures, last_ok_at: v.lastOkAt ? new Date(v.lastOkAt).toISOString() : null, last_error: v.lastError }])),
    thresholds: THRESHOLDS,
    alerts,
  };
}

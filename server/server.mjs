/**
 * Brachas with Rimon — backend (Railway).
 * Accounts (email+password, Apple/Google OAuth, legacy friend-code sign-in),
 * friend leagues, shareable boards, Web-Push mealtime reminders, and the
 * Claude vision proxy.
 *
 * Design rules (mirrors the app's CLAUDE.md):
 *  - Claude ONLY identifies foods and maps them to database keys (enum-forced
 *    tool schema); all halachic logic stays in the client.
 *  - ANTHROPIC_API_KEY lives ONLY here (Railway variable). Without it,
 *    /api/analyze returns 503 and the client falls back to demo mode.
 *  - Storage: SQLite on the Railway volume (DATA_DIR/rimon.db). Session
 *    tokens live ONLY as sha256 digests (tokens table); reading the volume
 *    never yields a usable session.
 */
import { createServer } from 'http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { createPublicKey, randomBytes, scrypt as scryptCb, timingSafeEqual, verify as cryptoVerify } from 'crypto';
import { promisify } from 'util';
import { join } from 'path';
import webpush from 'web-push';
import { apnsReady, sendApns } from './apns.mjs';
import { backupReady, runBackup } from './backup.mjs';
import * as store from './store.mjs';

const PORT = Number(process.env.PORT || 3300);
const DATA_DIR = process.env.DATA_DIR || './data';

// Volume guard: on Railway the DB MUST live on the mounted volume. Booting on
// ephemeral disk (DATA_DIR unset, or mangled to a non-volume path — both have
// happened) silently starts an EMPTY database and strands every new write. We
// refuse to boot instead: a loud crash-loop is recoverable and shows up in the
// crash-mail; a quiet empty DB looks like every account vanished. No RAILWAY_*
// vars locally, so dev and the scenario suite (explicit temp DATA_DIR) are
// unaffected.
const onRailway = !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
if (onRailway) {
  const VOL = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (!VOL) throw new Error('FATAL: no Railway volume mounted — refusing to boot on ephemeral disk (data would be lost)');
  const norm = (s) => s.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!process.env.DATA_DIR || (norm(DATA_DIR) !== norm(VOL) && !norm(DATA_DIR).startsWith(norm(VOL) + '/')))
    throw new Error(`FATAL: DATA_DIR (${process.env.DATA_DIR ?? 'unset'}) is not on the volume ${VOL} — refusing to boot`);
}
mkdirSync(DATA_DIR, { recursive: true });

const VAPID_FILE = join(DATA_DIR, 'vapid.json');

// ------------------------------------------------------------------ storage
// SQLite (see db.mjs / store.mjs). Legacy users.json is imported on first
// boot — including existing sessions, so nobody is signed out by the move.
store.initStore(DATA_DIR);

// ------------------------------------------------------------------- VAPID
let vapid;
if (existsSync(VAPID_FILE)) vapid = JSON.parse(readFileSync(VAPID_FILE, 'utf8'));
else {
  vapid = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_FILE, JSON.stringify(vapid));
}
webpush.setVapidDetails('mailto:shancoh18@gmail.com', vapid.publicKey, vapid.privateKey);

// ------------------------------------------------------------------- CORS
const ALLOWED_ORIGINS = new Set([
  'https://shancoh18.github.io',
  'http://localhost:5199',
  'http://localhost:4173',
  // Capacitor WKWebView origins — without these every API call from the
  // native iOS app fails CORS (sign-in, league, account: all of it).
  'capacitor://localhost',
  'https://localhost',
  'ionic://localhost',
]);
const cors = (req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
};

// ------------------------------------------------------------------ helpers
const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
// Default 64KB cap — every JSON route (auth, sync, chat, broadcast) fits easily.
// /api/analyze passes a larger cap explicitly for the base64 photo. Previously
// EVERY route accepted 12MB, so an unauthenticated broadcast probe could make
// the server buffer 12MB before the secret was even checked.
const readBody = (req, maxBytes = 64 * 1024) =>
  new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => {
      d += c;
      if (d.length > maxBytes) {
        // stop buffering AND kill the stream, or the closure keeps growing
        req.destroy();
        reject(new Error('too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
const auth = (req) => {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  const user = store.userByToken(t); // digest lookup; tokens aren't stored raw
  return user ? { token: t, user } : null;
};

// A board is a social circle, not a public feed: bound both directions so one
// viral code can't turn every /api/boards call into a huge computation.
const MAX_BOARDS_PER_USER = 20;
const MAX_BOARD_MEMBERS = 200;
const BOARD_ROWS = 50; // standings shown; "you" is always included
const DURATION_LABEL = { week: 'one week', month: 'one month', year: 'one year' };
/** A member's score inside the current round: points earned since their
 *  baseline snapshot (round start, or the moment they joined). Never negative
 *  — a merge can't lower totals, but belt-and-braces. */
const roundScore = (m, field = 'points') => {
  const total = field === 'points' ? m.progress?.points ?? 0 : m.progress?.totalBrachos ?? 0;
  const base = field === 'points' ? m.pointsBaseline ?? 0 : m.brachosBaseline ?? 0;
  return Math.max(0, total - base);
};

/** Top rows of a board, with the caller's own row kept even if far down.
 *  Friend codes are stripped: a board code is shareable, so shipping every
 *  member's personal code would let any joiner friend them all unilaterally.
 *  Rows are ROUND-scoped (everyone started this round at 0) and carry wins. */
const standings = (me, scoredMembers) => {
  const rows = scoredMembers
    .map((m) => ({
      name: m.name,
      code: m.code,
      totalBrachos: m.progress?.totalBrachos ?? 0,
      points: roundScore(m, 'points'),
      brachos: roundScore(m, 'brachos'),
      // legacy field names the deployed client renders — keep them aliased to
      // the round scores so an un-updated app shows the right numbers
      weekPoints: roundScore(m, 'points'),
      weekBrachos: roundScore(m, 'brachos'),
      todayPoints: dayTotal(m, 'points'),
      streak: m.progress?.streakCurrent ?? 0,
      wins: m.wins ?? 0,
      you: m.id === me.id,
    }))
    .sort((a, b) => b.points - a.points || b.brachos - a.brachos || b.totalBrachos - a.totalBrachos);
  const capped =
    rows.length <= BOARD_ROWS
      ? rows
      : (() => {
          const top = rows.slice(0, BOARD_ROWS);
          return top.some((r) => r.you) ? top : [...top, rows.find((r) => r.you)].filter(Boolean);
        })();
  return capped.map((r, i) => ({ ...r, code: r.you ? r.code : `m${i}` }));
};

// ------------------------------------------------- abuse limits (in-memory)
// Vision spend: per-account daily cap + global concurrency ceiling.
const ANALYZE_MAX_PER_DAY = 30;
const ANALYZE_MAX_INFLIGHT = 8;
// Keyed by user id, NOT token: sign-in now mints a fresh token every time, so
// a token-keyed cap would reset itself on every sign-in.
const analyzeUse = new Map(); // user id -> {day, count}
let analyzeInFlight = 0;
// Auth endpoints: crude per-IP throttle against credential stuffing and
// friend-code enumeration (923k code space). Window resets every 10 min.
const authHits = new Map(); // ip -> {t0, count}
// Railway's Envoy edge APPENDS the caller's address to X-Forwarded-For, so the
// FIRST element is client-supplied and forgeable (spoof it to a new value per
// request and a naive throttle never triggers). Trust Envoy's single-value
// header, else the LAST hop (edge-appended), else the socket. Bounded length.
const clientIp = (req) => {
  const chain = String(req.headers['x-forwarded-for'] || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return String(
    String(req.headers['x-envoy-external-address'] || '').trim() ||
    chain[chain.length - 1] ||
    req.socket.remoteAddress || '?',
  ).slice(0, 64);
};
const throttled = (req, max = 30) => {
  const ip = clientIp(req);
  const now = Date.now();
  const e = authHits.get(ip);
  if (!e || now - e.t0 > 600_000) {
    if (authHits.size > 50_000) authHits.clear(); // spoofed keys can't grow it unbounded
    authHits.set(ip, { t0: now, count: 1 });
    return false;
  }
  e.count++;
  return e.count > max;
};
// Per-email sign-in failure cap — hop-independent, so it holds even if the IP
// throttle is somehow bypassed, and it hard-bounds total scrypt CPU.
const pwFails = new Map(); // email -> {t0, count}
const emailThrottled = (mail) => {
  const now = Date.now();
  const e = pwFails.get(mail);
  if (!e || now - e.t0 > 600_000) {
    if (pwFails.size > 50_000) pwFails.clear();
    pwFails.set(mail, { t0: now, count: 0 });
    return false;
  }
  return e.count >= 10;
};
const noteFail = (mail) => { const e = pwFails.get(mail); if (e) e.count++; };
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of authHits) if (now - v.t0 > 600_000) authHits.delete(k);
  if (analyzeUse.size > 10_000) analyzeUse.clear(); // daily counters, bounded
}, 300_000);
// Chat + competition pushes: hard per-user caps so a chatty board can't spam.
const chatHits = new Map(); // user id -> {t0, count} — 20 messages / 5 min
const chatThrottled = (userId) => {
  const now = Date.now();
  const e = chatHits.get(userId);
  if (!e || now - e.t0 > 300_000) {
    chatHits.set(userId, { t0: now, count: 1 });
    return false;
  }
  e.count++;
  return e.count > 20;
};
const pushStamp = new Map(); // "kind:user:key" -> last-sent ms
const pushAllowed = (kind, userId, key, gapMs) => {
  const k = `${kind}:${userId}:${key}`;
  const last = pushStamp.get(k) ?? 0;
  const now = Date.now();
  if (now - last < gapMs) return false;
  pushStamp.set(k, now);
  if (pushStamp.size > 20_000) pushStamp.clear(); // bounded
  return true;
};
/** True if we can reach this user on ANY push channel. The native iOS app has
 *  no Web Push (WKWebView) — it registers an APNs device token instead. */
const hasPushChannel = (user) => !!(user?.push?.subscription || (user?.apns && apnsReady()));
const sendPush = (user, title, body) => {
  const sub = user?.push?.subscription;
  if (sub)
    webpush
      .sendNotification(sub, JSON.stringify({ title, body }), { timeout: 5000 })
      .catch((e) => {
        if (e.statusCode === 404 || e.statusCode === 410) store.setPush(user.id, null); // expired
      });
  if (user?.apns && apnsReady())
    sendApns(user.apns, title, body)
      .then((r) => {
        if (r.gone) store.setApns(user.id, null); // device unregistered
      })
      .catch(() => undefined);
};

/** New chat message → nudge the other members. Smarter than a flat cooldown:
 *  (a) never buzz someone who's actively in the room (read it in the last 60s —
 *      the sheet marks read every 5s while open), and
 *  (b) at most one push per member per board per 5 minutes otherwise.
 *  So an active reader is never interrupted, and someone away gets one prompt
 *  per burst instead of one per message. */
const CHAT_PUSH_GAP_MS = 5 * 60_000;
const CHAT_ACTIVE_MS = 60_000;
const notifyBoardChat = (board, sender, text) => {
  const now = Date.now();
  for (const member of store.boardMembers(board.id)) {
    if (member.id === sender.id || !hasPushChannel(member)) continue;
    if (now - store.boardLastRead(board.id, member.id) < CHAT_ACTIVE_MS) continue; // in the room
    if (!pushAllowed('chat', member.id, board.id, CHAT_PUSH_GAP_MS)) continue;
    sendPush(member, `💬 ${board.title}`, `${sender.name}: ${text.slice(0, 90)}`);
  }
};

/** My lifetime points rose oldPts → newPts: everyone I just passed gets a
 *  competitive nudge. Two arenas, each scored its own way:
 *   - the all-time friends league (lifetime points crossing), and
 *   - every ACTIVE shared board round (round-score crossing — both sides
 *     measured from their own baselines).
 *  One push per rival per sync, board context preferred; 2h throttle/pair. */
const notifyOvertaken = (me, oldPts, newPts) => {
  const now = Date.now();
  // rival user id -> text of the overtake that names the best arena
  const passed = new Map();
  for (const b of store.boardsOf(me.id)) {
    if (!b.duration || b.ends_at <= now) continue; // finished rounds are frozen
    const scored = store.boardMembersScored(b.id);
    const myRow = scored.find((m) => m.id === me.id);
    if (!myRow) continue;
    const myNew = Math.max(0, newPts - (myRow.pointsBaseline ?? 0));
    const myOld = Math.max(0, oldPts - (myRow.pointsBaseline ?? 0));
    if (myNew <= myOld) continue;
    for (const peer of scored) {
      if (peer.id === me.id) continue;
      const pw = Math.max(0, (peer.progress?.points ?? 0) - (peer.pointsBaseline ?? 0));
      if (!(myOld <= pw && pw < myNew)) continue;
      passed.set(peer.id, {
        peer,
        body: `${me.name} just moved ahead of you in “${b.title}” — ${myNew} pts this round. Say a bracha to take it back!`,
      });
    }
  }
  for (const peer of store.friendsOf(me.id)) {
    if (passed.has(peer.id)) continue; // board context already covers this rival
    const pw = peer.progress?.points ?? 0;
    if (!(oldPts <= pw && pw < newPts)) continue;
    passed.set(peer.id, {
      peer,
      body: `${me.name} just moved ahead of you in the all-time league — ${newPts} pts. Say a bracha to take it back!`,
    });
  }
  for (const { peer, body } of passed.values()) {
    if (!hasPushChannel(peer)) continue;
    if (!pushAllowed('overtake', peer.id, me.id, 2 * 60 * 60_000)) continue;
    sendPush(peer, '🏆 You’ve been passed!', body);
  }
};

/** People paste codes in every shape: bare, lowercased, spaced, prefixed. */
const normalizeCode = (raw) => {
  const t = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = t.startsWith('RIMON') ? t.slice(5) : t;
  return `RIMON-${body}`;
};

// ------------------------------------------------------------ auth (passwords)
// scrypt with a per-user salt; stored as { salt, hash } hex pair.
// scrypt is deliberately CPU-heavy; scryptSync BLOCKS the single event loop, so
// a burst of sign-ins froze the whole API. Use the async form — hashing now
// degrades throughput instead of freezing every other request.
const scryptAsync = promisify(scryptCb);
const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(String(password).slice(0, 200), salt, 64)).toString('hex');
  return { salt, hash };
};
const checkPassword = async (password, pass) => {
  if (!pass?.salt || !pass?.hash) return false;
  const candidate = await scryptAsync(String(password).slice(0, 200), pass.salt, 64);
  const stored = Buffer.from(pass.hash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
};
const PASSWORD_MIN = 8;

// ------------------------------------------- auth (Apple / Google ID tokens)
// Verify RS256 identity tokens against the provider's published JWKS.
// No SDK: decode header → fetch JWKS (cached 1h) → crypto.verify → check
// iss / aud / exp. Returns the payload or null.
const JWKS = {
  apple: { url: process.env.APPLE_JWKS_URL || 'https://appleid.apple.com/auth/keys', keys: null, fetched: 0 },
  google: { url: process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs', keys: null, fetched: 0 },
};
const APPLE_AUDS = (process.env.APPLE_CLIENT_IDS || 'com.shancoh.brachaswithrimon')
  .split(',').map((s) => s.trim()).filter(Boolean);
const GOOGLE_AUDS = (process.env.GOOGLE_CLIENT_IDS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const b64urlJson = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

async function jwksKey(provider, kid) {
  const jwks = JWKS[provider];
  if (!jwks.keys || Date.now() - jwks.fetched > 3_600_000 || !jwks.keys.find((k) => k.kid === kid)) {
    const r = await fetch(jwks.url);
    if (!r.ok) throw new Error(`jwks ${r.status}`);
    jwks.keys = (await r.json()).keys ?? [];
    jwks.fetched = Date.now();
  }
  return jwks.keys.find((k) => k.kid === kid) ?? null;
}

async function verifyIdToken(provider, idToken) {
  try {
    const [h, p, sig] = String(idToken).split('.');
    if (!h || !p || !sig) return null;
    const header = b64urlJson(h);
    if (header.alg !== 'RS256') return null;
    const jwk = await jwksKey(provider, header.kid);
    if (!jwk) return null;
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    const ok = cryptoVerify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, Buffer.from(sig, 'base64url'));
    if (!ok) return null;
    const payload = b64urlJson(p);
    if (payload.exp * 1000 < Date.now() - 60_000) return null;
    const iss = provider === 'apple' ? ['https://appleid.apple.com'] : ['https://accounts.google.com', 'accounts.google.com'];
    if (!iss.includes(payload.iss)) return null;
    const auds = provider === 'apple' ? APPLE_AUDS : GOOGLE_AUDS;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.some((a) => auds.includes(a))) return null;
    return payload;
  } catch {
    return null;
  }
}

// The built-in friends league is ALL-TIME (owner directive 2026-08-10):
// lifetime points rank it, lifetime brachos break ties, and every row carries
// the member's leaderboard-round win count. week/today fields still ride along
// for the home-screen catch-up nudge and the "+N today" chips.
const leagueRows = (me, people) =>
  people
    .map((u) => ({
      name: u.name,
      code: u.code,
      totalBrachos: u.progress?.totalBrachos ?? 0,
      weekBrachos: weekTotal(u, 'brachos'),
      points: u.progress?.points ?? 0,
      weekPoints: weekTotal(u, 'points'),
      todayPoints: dayTotal(u, 'points'),
      streak: u.progress?.streakCurrent ?? 0,
      wins: u.wins ?? 0,
      you: u.id === me.id,
    }))
    .sort(
      (a, b) => b.points - a.points || b.totalBrachos - a.totalBrachos || b.weekPoints - a.weekPoints,
    );

// A user's friend code is a SIGN-IN credential (email + code unlocks a
// password-less account), so it must never ship to anyone but its owner.
// standings() masks board rows separately; this covers the friends league
// on /api/league, /api/sync, and /api/friends/add. Masked ids stay unique so
// the client can keep using them as React keys.
const leagueFor = (me) =>
  leagueRows(me, [me, ...store.friendsOf(me.id)]).map((r, i) => ({ ...r, code: r.you ? r.code : `f${i}` }));

const weekTotal = (u, field = 'brachos') => {
  // tolerant of already-stored malformed rows so one bad account can't 500
  // every board/league it appears in
  const hist = Array.isArray(u.progress?.history) ? u.progress.history : [];
  const cutoff = Date.now() - 7 * 86_400_000;
  return hist
    .filter((h) => h && new Date(h.day).getTime() >= cutoff)
    .reduce((s, h) => s + (Number.isFinite(h[field]) ? h[field] : 0), 0);
};

// --------------------------------------------------------- progress merge
// /api/sync used to REPLACE stored progress with whatever the client sent, so
// signing in on a fresh device (local points 0, empty history) wiped the
// account server-side and blasted a spurious "you've been passed" to nobody.
// We now MERGE: cumulative fields take the max, history unions by day taking
// the per-day max. A payload can only ever raise a total, never lower it.
const num = (v, max = 1e9) => (Number.isFinite(+v) ? Math.min(max, Math.max(0, Math.trunc(+v))) : 0);
const cleanHistory = (h) =>
  (Array.isArray(h) ? h : [])
    .filter((e) => e && typeof e === 'object')
    .slice(-60)
    .map((e) => ({ day: String(e.day ?? '').slice(0, 10), brachos: num(e.brachos, 1e6), points: num(e.points, 1e6) }))
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.day));
const mergeByDay = (a, b) => {
  const byDay = new Map();
  for (const e of [...cleanHistory(a), ...cleanHistory(b)]) {
    const prev = byDay.get(e.day);
    byDay.set(e.day, prev
      ? { day: e.day, brachos: Math.max(prev.brachos, e.brachos), points: Math.max(prev.points, e.points) }
      : e);
  }
  return [...byDay.values()].sort((x, y) => (x.day < y.day ? -1 : 1)).slice(-30);
};
const mergeProgress = (cur, incoming) => {
  cur = cur ?? {};
  incoming = incoming ?? {};
  const incFresh = num(incoming.points) === 0 && cleanHistory(incoming.history).length === 0;
  return {
    totalBrachos: Math.max(num(cur.totalBrachos), num(incoming.totalBrachos)),
    points: Math.max(num(cur.points), num(incoming.points)),
    // a fresh/empty device must not reset an established streak
    streakCurrent: incFresh && num(cur.points) > 0 ? num(cur.streakCurrent) : num(incoming.streakCurrent),
    history: mergeByDay(cur.history, incoming.history),
  };
};
const dayTotal = (u, field = 'points') => {
  // history day-strings are the USER's local day; Railway runs UTC, so compare
  // against the user's local "today", not the server's. The offset rides push
  // prefs (Date.getTimezoneOffset, same convention the reminder scheduler uses);
  // users without reminders fall back to UTC as before — no regression.
  const off = u.push?.tzOffsetMinutes ?? 0;
  const today = new Date(Date.now() - off * 60_000).toISOString().slice(0, 10);
  const hist = Array.isArray(u.progress?.history) ? u.progress.history : [];
  return hist.filter((h) => h && h.day === today).reduce((s, h) => s + (Number.isFinite(h[field]) ? h[field] : 0), 0);
};

// --------------------------------------------------------- Claude vision
// FOOD_DATABASE_KEYS baked at deploy time (foods-keys.json is generated from
// src/data/foods.ts by the deploy script — single source of truth) — PLUS
// entries the research pipeline has learned at runtime (LEARNED_FILE).
const FOOD_KEYS = JSON.parse(readFileSync(join(import.meta.dirname, 'foods-keys.json'), 'utf8'));

// ------------------------------------------- learned foods (self-growing DB)
// When vision reports a food with no database match, researchFood() derives
// its entry FROM THE THREE APPROVED SITES ONLY (web_search hard-limited via
// allowed_domains — the halachic rule still never comes from the model's own
// head) and persists it here. Entries carry the citing URL.
const LEARNED_MAX = 500; // hard cap — the enum/system-prompt grows per entry
const allFoodKeys = () => [...FOOD_KEYS, ...store.learnedKeys()];

const BRACHA_ENUM = ['hamotzi', 'mezonos', 'hagafen', 'haetz', 'haadama', 'shehakol'];
const ACHRONA_ENUM = ['birkat_hamazon', 'al_hamichya', 'al_hagefen', 'al_haetz', 'borei_nefashos'];
const RESEARCH_DOMAINS = ['chabad.org', 'brachos.org', 'oukosher.org'];

const RESEARCH_TOOL = {
  name: 'report_food_entry',
  description: 'Report the researched bracha entry for one food, or not_found.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean' },
      key: { type: 'string', description: 'lowercase_snake_case canonical id, e.g. kombucha' },
      names: { type: 'array', items: { type: 'string' }, description: 'display name first, then aliases' },
      brachaRishona: { type: 'string', enum: BRACHA_ENUM },
      brachaAchrona: { type: 'string', enum: ACHRONA_ENUM },
      isDrink: { type: 'boolean' },
      isTreeFruit: { type: 'boolean' },
      isFiveGrain: { type: 'boolean' },
      isWineGrape: { type: 'boolean' },
      notes: { type: 'string', description: 'one short sentence for the Why panel' },
      sourceUrl: { type: 'string', description: 'the exact page on an approved site that states this ruling' },
    },
    required: ['found'],
  },
};

async function researchFood(description, apiKey) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 3000,
      system: `You research the correct bracha (blessing) for foods, for a Jewish blessings app.
You may ONLY conclude a ruling that an approved site states. Search the web (results
are restricted to chabad.org, brachos.org and oukosher.org) and report via
report_food_entry with the citing URL. A ruling counts when a page either
(a) addresses this food specifically, or (b) states a GENERAL rule that plainly
covers it — e.g. "all drinks other than wine and grape juice are Shehakol",
"raw vegetables are Ha'adama" — cite that general-rule page and apply it.
What you may NOT do is derive halacha from your own knowledge or reason beyond
what a page plainly states; if neither a specific nor a clearly applicable
general ruling exists on these sites, report found:false. When in doubt about
which category a food belongs to, report found:false rather than guess.`,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          allowed_domains: RESEARCH_DOMAINS,
          max_uses: 5,
        },
        RESEARCH_TOOL,
      ],
      messages: [
        { role: 'user', content: `Food to research: ${description}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`research http ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const tu = data.content?.find((c) => c.type === 'tool_use' && c.name === 'report_food_entry');
  const e = tu?.input;
  if (!e || e.found !== true) return null;
  // Validate hard before it can ever reach a user.
  if (!BRACHA_ENUM.includes(e.brachaRishona) || !ACHRONA_ENUM.includes(e.brachaAchrona)) return null;
  let host = '';
  try { host = new URL(e.sourceUrl).hostname.replace(/^www\./, ''); } catch { return null; }
  if (!RESEARCH_DOMAINS.includes(host)) return null;
  // The cited page must actually exist — a fabricated URL never persists.
  try {
    const page = await fetch(e.sourceUrl, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!page.ok) return null;
    const finalHost = new URL(page.url).hostname.replace(/^www\./, '');
    if (!RESEARCH_DOMAINS.includes(finalHost)) return null;
  } catch {
    return null;
  }
  const key = String(e.key || description).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  if (!key || allFoodKeys().includes(key)) return null; // already known — nothing to learn
  // CITATION RELEVANCE (added 2026-08-07 after a batch dry-run caught it):
  // when no page rules on the food, the model would fall back to a broad essay
  // and still answer — one Passover article got cited for stuffing, falafel,
  // breadcrumbs AND matzah meal. A per-food/category ruling page is fine
  // (ravioli→/brachos/pasta/); a general ARTICLE that never names the food is
  // not. Reject those: better an honest "unknown" than a mis-sourced ruling.
  if (/\/(blog|articles|news)\//.test(String(e.sourceUrl))) {
    const slug = String(e.sourceUrl).toLowerCase();
    const foodWords = [key, ...(Array.isArray(e.names) ? e.names : []), description]
      .join(' ').toLowerCase().split(/[^a-z]+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.replace(/(ies|es|s)$/, ''));
    if (!foodWords.some((w) => slug.includes(w))) {
      console.log(`research rejected (essay citation, food not named): ${description} -> ${e.sourceUrl}`);
      return null;
    }
  }
  return {
    key,
    names: Array.isArray(e.names) && e.names.length ? e.names.map(String).slice(0, 6) : [description],
    category: e.isDrink ? 'Beverages' : 'Other',
    brachaRishona: e.brachaRishona,
    brachaAchrona: e.brachaAchrona,
    shivasHaminim: false,
    isFiveGrain: !!e.isFiveGrain,
    isTreeFruit: !!e.isTreeFruit,
    isWineGrape: !!e.isWineGrape,
    isDrink: !!e.isDrink,
    notes: e.notes ? String(e.notes).slice(0, 300) : undefined,
    source: host === 'oukosher.org' ? 'OU' : host,
    sourceUrl: String(e.sourceUrl),
    learned: true,
    learnedAt: new Date().toISOString(),
  };
}

/** Research unmatched foods (first few only — fan-out is attacker-visible cost).
 *  Resolves with the entries that finished inside `budgetMs`, each tagged with
 *  the description it answers; the rest keep going in the background so the DB
 *  still grows for next time. */
function researchUnmatched(unmatched, apiKey, budgetMs = 12_000) {
  const finished = []; // {desc, entry} collected as tasks land — no name re-matching
  const tasks = unmatched.slice(0, 3).map((desc) =>
    researchFood(desc, apiKey)
      .then((entry) => {
        if (entry && store.learnedCount() < LEARNED_MAX && !allFoodKeys().includes(entry.key)) {
          store.addLearned(entry);
          console.log(`learned: ${entry.key} -> ${entry.brachaRishona}/${entry.brachaAchrona} (${entry.sourceUrl})`);
          finished.push({ desc, entry });
        } else if (!entry) {
          console.log(`research no-ruling: ${desc}`);
        }
      })
      .catch((err) => {
        console.log(`research failed: ${desc}: ${err.message}`);
      }),
  );
  const timeout = new Promise((resolve) => setTimeout(resolve, budgetMs, 'timeout'));
  return Promise.race([Promise.allSettled(tasks), timeout]).then(() => [...finished]);
}

const SYSTEM_PROMPT = () => `You are the food-identification engine for a Jewish blessings (bracha) app.
You will receive a photo of a meal. Identify each distinct edible item.
You MUST map every item to exactly one canonical key from the provided
FOOD_DATABASE_KEYS list. Never invent a food name outside this list; if an
item is not in the list, return it under "unmatched" with your best plain
description. Do not guess the blessing yourself — only identify and map.
Return ONLY the structured tool output. Distinguish preparation state where
visible (raw vs cooked, whole vs cut) since it can change the mapping.

FOOD_DATABASE_KEYS: ${allFoodKeys().join(', ')}`;

const TOOL = () => ({
  name: 'report_foods',
  description: 'Report every identified food item mapped to a database key.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            db_key: { type: 'string', enum: allFoodKeys() },
            display_name: { type: 'string' },
            state: { type: 'string', enum: ['raw', 'cooked', 'baked', 'whole', 'cut', 'liquid', 'unknown'] },
            confidence: { type: 'number' },
            count_estimate: { type: 'integer' },
          },
          required: ['db_key', 'display_name', 'confidence'],
        },
      },
      unmatched: { type: 'array', items: { type: 'string' } },
    },
    required: ['items'],
  },
});

async function analyze(body) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { code: 503, body: { error: 'no_api_key' } };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT(),
      tools: [TOOL()],
      tool_choice: { type: 'tool', name: 'report_foods' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: body.media_type || 'image/jpeg', data: body.image } },
            { type: 'text', text: 'Identify every edible item in this meal photo and map each to a database key.' },
          ],
        },
      ],
    }),
  });
  if (!r.ok) return { code: 502, body: { error: 'anthropic_error', detail: (await r.text()).slice(0, 400) } };
  const data = await r.json();
  const toolUse = data.content?.find((c) => c.type === 'tool_use' && c.name === 'report_foods');
  if (!toolUse?.input) return { code: 502, body: { error: 'no_tool_output' } };

  const out = toolUse.input;
  // Self-growing DB: research any unmatched foods against the approved sites.
  // Whatever resolves within the budget joins THIS meal; the rest lands in the
  // learned DB in the background for next time.
  if (Array.isArray(out.unmatched) && out.unmatched.length) {
    console.log(`unmatched: ${out.unmatched.join(', ')}`);
    try {
      const found = await researchUnmatched(out.unmatched, key);
      if (found.length) {
        out.learned_entries = found.map((f) => f.entry);
        out.items = out.items || [];
        const answered = new Set(found.map((f) => f.desc));
        for (const { desc, entry } of found) {
          out.items.push({ db_key: entry.key, display_name: desc, state: 'unknown', confidence: 0.9 });
        }
        out.unmatched = out.unmatched.filter((d) => !answered.has(d));
      }
    } catch (err) {
      console.log(`research pipeline error: ${err.message}`);
    }
  }
  return { code: 200, body: out };
}

// ------------------------------------------------------- reminder scheduler
// Client sends tzOffsetMinutes (Date.getTimezoneOffset()) + "HH:MM" times.
const firedToday = new Map(); // user id -> "YYYY-MM-DD-HH:MM"
setInterval(async () => {
  const now = Date.now();
  // Sends are batched in parallel with a per-push timeout: at a shared
  // mealtime minute, sequential awaits would serialize hundreds of pushes
  // (and one hung endpoint would stall everyone after it).
  const batch = [];
  for (const u of store.pushSubscribers()) {
    const token = u.id;
    const p = u.push;
    const local = new Date(now - (p.tzOffsetMinutes ?? 0) * 60_000);
    const hhmm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
    if (!p.times.includes(hhmm)) continue;
    const stamp = `${local.toISOString().slice(0, 10)}-${hhmm}`;
    if (firedToday.get(token) === stamp) continue;
    firedToday.set(token, stamp);
    try {
      // League-aware nudge: if a friend leads today's points, make it a race.
      let body = `Eating soon, ${u.name}? Ten seconds for the bracha first — your streak is waiting.`;
      if (store.friendsOf(u.id).length) {
        const league = leagueFor(u);
        const byToday = [...league].sort((a, b) => b.todayPoints - a.todayPoints);
        const leader = byToday[0];
        const meRow = byToday.find((r) => r.you);
        if (leader && meRow && !leader.you && leader.todayPoints > 0) {
          const gap = leader.todayPoints - meRow.todayPoints;
          // ~10 points per daily challenge — frame the gap as an actionable count
          const challenges = Math.max(1, Math.ceil(gap / 10));
          body = `${leader.name} is in the lead today with ${leader.todayPoints} points — complete ${challenges} challenge${challenges === 1 ? '' : 's'} to catch up! 🏆`;
        }
      }
      batch.push(
        webpush
          .sendNotification(p.subscription, JSON.stringify({ title: 'Rimon here 🍎', body }), { timeout: 5000 })
          .catch((e) => {
            if (e.statusCode === 404 || e.statusCode === 410) store.setPush(u.id, null); // expired
          }),
      );
    } catch (e) {
      console.error(`push prep failed: ${e.message}`);
    }
  }
  if (batch.length) await Promise.allSettled(batch);
}, 30_000);

// ---------------------------------------------- leaderboard round lifecycle
// Boards are timed ROUNDS now. One boot pass converts pre-duration boards to
// 1-week rounds (members told via push), then a 60s sweep drives the clock:
//   1. finalize ended rounds — freeze the podium, crown the winner (+1 win),
//      and tell every member to come watch the reveal (never spoiling WHO won),
//   2. "last day" push as a round enters its final 24h (member-local morning),
//   3. daily leader pushes in the member-local evening — per board, plus the
//      all-time friends league's "X is in the lead today" home-card as a push.
// Push stamps are in-memory (pushAllowed): a redeploy can repeat at most one
// daily nudge, same class of tolerance as the mealtime scheduler's firedToday.
// Env knobs exist for the scenario suite ONLY (fast rounds, quiet sweep):
//   ROUND_SWEEP_MS=0 disables the sweep, EVENING_HOUR/MORNING_HOUR move the
//   local-time gates. Production uses the defaults.
const ROUND_SWEEP_MS = Number(process.env.ROUND_SWEEP_MS ?? 60_000);
const EVENING_HOUR = Number(process.env.EVENING_HOUR ?? 18);
const MORNING_HOUR = Number(process.env.MORNING_HOUR ?? 8);
const localHour = (u) => new Date(Date.now() - (u.push?.tzOffsetMinutes ?? 0) * 60_000).getUTCHours();

const finalizeEndedRounds = () => {
  for (const b of store.unfinalizedBoards()) {
    const scored = store.boardMembersScored(b.id);
    const rows = scored
      .map((m) => ({
        userId: m.id,
        name: m.name,
        points: Math.max(0, (m.progress?.points ?? 0) - (m.pointsBaseline ?? 0)),
        brachos: Math.max(0, (m.progress?.totalBrachos ?? 0) - (m.brachosBaseline ?? 0)),
      }))
      .sort((a, z) => z.points - a.points || z.brachos - a.brachos);
    // a winner needs points on the board — an all-zero round crowns nobody
    const winner = rows[0] && rows[0].points > 0 ? rows[0] : null;
    store.addBoardResult(b.id, b.round ?? 1, rows, winner?.userId ?? null);
    if (winner) store.incrementWins(winner.userId);
    console.log(`board round ended: "${b.title}" round ${b.round} — winner ${winner?.name ?? 'none'}`);
    for (const m of scored) {
      if (!hasPushChannel(m)) continue;
      sendPush(m, '🏁 Time’s up!', `“${b.title}” has ended — open the app to see the podium revealed! 🥇`);
    }
  }
};

const sweepRounds = () => {
  finalizeEndedRounds();
  const now = Date.now();
  for (const b of store.activeBoards(now)) {
    const scored = store.boardMembersScored(b.id);
    if (scored.length < 2) continue; // nobody to race
    const rows = [...scored].sort(
      (a, z) =>
        Math.max(0, (z.progress?.points ?? 0) - (z.pointsBaseline ?? 0)) -
        Math.max(0, (a.progress?.points ?? 0) - (a.pointsBaseline ?? 0)),
    );
    const leader = rows[0];
    const leaderPts = Math.max(0, (leader.progress?.points ?? 0) - (leader.pointsBaseline ?? 0));
    const lastDay = b.ends_at - now <= 86_400_000;
    const hoursLeft = Math.max(1, Math.round((b.ends_at - now) / 3_600_000));
    for (const m of scored) {
      if (!hasPushChannel(m)) continue;
      const hour = localHour(m);
      // (2) final 24h — one heads-up per member per round, from morning on
      if (lastDay && hour >= MORNING_HOUR && pushAllowed('lastday', m.id, `${b.id}:${b.round}`, 3 * 86_400_000))
        sendPush(
          m,
          '⏳ Last day!',
          `Final ${hoursLeft}h of “${b.title}” — ${
            m.id === leader.id
              ? 'you’re in front. Hold the lead!'
              : leaderPts > 0
                ? `${leader.name} leads with ${leaderPts} pts. Still time to take it!`
                : 'the podium is wide open. Any bracha could win it!'
          }`,
        );
      // (3) evening standings nudge — non-leaders only, once a day per board
      if (
        hour === EVENING_HOUR &&
        leaderPts > 0 &&
        m.id !== leader.id &&
        pushAllowed('boardlead', m.id, b.id, 20 * 3_600_000)
      )
        sendPush(
          m,
          `🏆 ${b.title}`,
          `${leader.name} is leading with ${leaderPts} pts this round — say a bracha and climb the board!`,
        );
    }
  }
  // the home-screen "X is in the lead today" card, as an evening push
  for (const u of store.pushAudience()) {
    if (localHour(u) !== EVENING_HOUR) continue;
    if (!store.friendsOf(u.id).length) continue;
    const byToday = leagueFor(u).sort((a, z) => (z.todayPoints ?? 0) - (a.todayPoints ?? 0));
    const leader = byToday[0];
    const meRow = byToday.find((r) => r.you);
    if (!leader || !meRow || leader.you || (leader.todayPoints ?? 0) <= 0) continue;
    if (!pushAllowed('leaguelead', u.id, 'friends', 20 * 3_600_000)) continue;
    const gap = (leader.todayPoints ?? 0) - (meRow.todayPoints ?? 0);
    const challenges = Math.max(1, Math.ceil(gap / 10));
    sendPush(
      u,
      'Rimon here 🍎',
      `${leader.name} is in the lead today with ${leader.todayPoints} points — complete ${challenges} challenge${challenges === 1 ? '' : 's'} to catch up! 🏆`,
    );
  }
};

// one-time conversion of legacy (untimed) boards → 1-week rounds, then sweep
for (const b of store.convertLegacyBoards()) {
  console.log(`board converted to timed round: "${b.title}" — 1 week from now`);
  for (const m of store.boardMembers(b.id)) {
    if (!hasPushChannel(m)) continue;
    sendPush(
      m,
      '🏁 Leaderboard started!',
      `“${b.title}” now runs in timed rounds — this round is one week and everyone starts at 0. Most points wins! 🥇`,
    );
  }
}
if (ROUND_SWEEP_MS > 0) {
  setInterval(sweepRounds, ROUND_SWEEP_MS);
  setTimeout(sweepRounds, Math.min(5_000, ROUND_SWEEP_MS)).unref(); // catch rounds that ended while we were down
}

// ------------------------------------------------------------ daily thought
// "Daily Wisdom" (chabad.org/dailystudy/dailywisdom_cdo) — one lesson per day
// adapted from the Rebbe's teachings; the Learn tab shows a faithful digest +
// deep link (owner feature 2026-08-11). chabad.org sits behind Cloudflare, so
// a plain server fetch gets a challenge page — the content rides the SAME
// sanctioned pipeline as researchFood: Anthropic web_search hard-locked to
// chabad.org. One lesson per US-East day, cached on the volume.
const THOUGHT_FILE = join(DATA_DIR, 'daily-thought.json');
const thoughtDateKey = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
let thoughtRefreshing = false;

const THOUGHT_TOOL = {
  name: 'report_daily_thought',
  description: "Report today's Daily Wisdom lesson as a faithful digest.",
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean' },
      title: { type: 'string', description: 'the lesson title, e.g. "Trusting in G-d"' },
      dayLabel: { type: 'string', description: 'weekday + parsha, e.g. "Wednesday · Parshat Shoftim"' },
      digest: {
        type: 'string',
        description:
          'a faithful 150-220 word digest of the lesson IN YOUR OWN WORDS — cover its full arc (verse, question, teaching, takeaway); never invent content the page does not carry',
      },
      url: { type: 'string', description: 'the exact chabad.org Daily Wisdom lesson page URL for today' },
    },
    required: ['found'],
  },
};

async function fetchDailyThought(apiKey) {
  const estNow = new Date(Date.now() - 5 * 3_600_000);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'][estNow.getUTCDay()];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 3000,
      system: `You find and digest ONE page for a Jewish learning app: today's lesson in
chabad.org's "Daily Wisdom" series (URLs contain /dailystudy/dailywisdom_cdo/), the
daily Torah thought adapted from the Rebbe's teachings, arranged by weekly parsha
with one lesson per weekday. Search (results are restricted to chabad.org) for the
CURRENT week's parsha edition and today's weekday lesson. Digest ONLY what that
page says — never pad it with your own Torah. Report via report_daily_thought with
the exact lesson URL. If you cannot find today's lesson, report found:false.`,
      tools: [
        { type: 'web_search_20250305', name: 'web_search', allowed_domains: ['chabad.org'], max_uses: 6 },
        THOUGHT_TOOL,
      ],
      messages: [
        {
          role: 'user',
          content: `Today is ${weekday}, ${thoughtDateKey()} (US-East). Find today's Daily Wisdom lesson (this week's parsha, ${weekday}'s entry) and digest it.`,
        },
      ],
    }),
  });
  if (!r.ok) throw new Error(`daily-thought http ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const t = data.content?.find((c) => c.type === 'tool_use' && c.name === 'report_daily_thought')?.input;
  if (!t || t.found !== true) return null;
  // Validate hard before it can reach a user: chabad.org Daily Wisdom URL only,
  // and a digest long enough to be the real lesson (not a stub).
  let u;
  try { u = new URL(t.url); } catch { return null; }
  if (u.hostname.replace(/^www\./, '') !== 'chabad.org' || !/dailywisdom/i.test(u.pathname)) return null;
  const digest = String(t.digest || '').trim();
  if (digest.length < 400) return null;
  return {
    dateKey: thoughtDateKey(),
    title: String(t.title || 'Daily Wisdom').slice(0, 120),
    dayLabel: String(t.dayLabel || weekday).slice(0, 80),
    digest: digest.slice(0, 2400),
    url: t.url,
    fetched: Date.now(),
  };
}

const readThought = () => {
  try { return JSON.parse(readFileSync(THOUGHT_FILE, 'utf8')); } catch { return null; }
};

async function refreshThoughtIfStale() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || thoughtRefreshing) return;
  if (readThought()?.dateKey === thoughtDateKey()) return;
  thoughtRefreshing = true;
  try {
    const t = await fetchDailyThought(key);
    if (t) {
      writeFileSync(THOUGHT_FILE, JSON.stringify(t));
      console.log(`daily-thought: cached "${t.title}" (${t.dateKey})`);
    }
  } catch (e) {
    console.error(`daily-thought refresh failed: ${e.message}`);
  }
  thoughtRefreshing = false;
}
setTimeout(() => void refreshThoughtIfStale(), 20_000).unref(); // after boot settles
setInterval(() => void refreshThoughtIfStale(), 3 * 3_600_000).unref(); // catches the EST day rollover

// -------------------------------------------------------------------- server
const server = createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const url = new URL(req.url, 'http://x');

  try {
    // Learn library auto-update: extra lessons live in DATA_DIR/lessons.json on
    // the volume — updatable any time (admin push / future daily generator)
    // without redeploying. Client merges by id with its built-in library.
    if (url.pathname === '/api/lessons') {
      const f = join(DATA_DIR, 'lessons.json');
      const lessons = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
      return json(res, 200, { lessons, updated: existsSync(f) ? statSync(f).mtimeMs : null });
    }

    if (url.pathname === '/health') return json(res, 200, { ok: true, users: store.userCount(), vision: !!process.env.ANTHROPIC_API_KEY });

    // Today's Daily Wisdom digest (public Torah content, like /api/lessons).
    // Serves the cache immediately — possibly yesterday's while a refresh runs;
    // {thought:null} until the first successful fetch (or with no API key).
    if (url.pathname === '/api/daily-thought') {
      const cur = readThought();
      const fresh = cur?.dateKey === thoughtDateKey();
      if (!fresh) void refreshThoughtIfStale();
      return json(res, 200, { thought: cur ?? null, fresh });
    }

    if (url.pathname === '/api/register' && req.method === 'POST') {
      if (throttled(req)) return json(res, 429, { error: 'slow_down' });
      const { name, email, password } = await readBody(req);
      if (!name || String(name).trim().length < 1) return json(res, 400, { error: 'name_required' });
      let mail = null;
      if (email != null && String(email).trim() !== '') {
        mail = String(email).trim().toLowerCase().slice(0, 254);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return json(res, 400, { error: 'email_invalid' });
        if (store.emailTaken(mail)) return json(res, 409, { error: 'email_taken' });
      }
      let pass = null;
      if (password != null && String(password) !== '') {
        if (String(password).length < PASSWORD_MIN) return json(res, 400, { error: 'password_short' });
        pass = await hashPassword(String(password).slice(0, 200));
      }
      const created = store.createUser({ name: String(name).trim().slice(0, 20), email: mail, pass });
      return json(res, 200, { token: created.token, code: created.code, email: mail });
    }

    // Sign in on a new device. Two key pairs are accepted:
    //   email + password       (accounts that set one)
    //   email + friend code    (legacy no-password accounts — still valid)
    if (url.pathname === '/api/signin' && req.method === 'POST') {
      if (throttled(req)) return json(res, 429, { error: 'slow_down' });
      const { email, code, password } = await readBody(req);
      const mail = String(email || '').trim().toLowerCase();
      if (password != null && String(password) !== '') {
        if (emailThrottled(mail)) return json(res, 429, { error: 'slow_down' });
        const u = store.userByEmail(mail);
        if (!u) { noteFail(mail); return json(res, 404, { error: 'no_match' }); }
        if (!u.pass) return json(res, 403, { error: 'no_password' }); // account predates passwords
        if (!(await checkPassword(password, u.pass))) { noteFail(mail); return json(res, 404, { error: 'no_match' }); }
        pwFails.delete(mail); // success clears the counter
        return json(res, 200, { token: store.issueToken(u.id), code: u.code, name: u.name, email: u.email });
      }
      // Friend-code sign-in is ONLY for accounts that predate passwords. The
      // code is a PUBLISHED invite identifier (it ships in invite texts), so
      // it must never unlock an account that has a real password.
      const c = normalizeCode(code);
      const u = store.userByEmail(mail);
      if (!u || u.code !== c) return json(res, 404, { error: 'no_match' });
      // The code unlocks ONLY genuinely legacy accounts (no password, no OAuth
      // provider). An account with a password or an Apple/Google link must sign
      // in through that — otherwise the published invite code is a back door.
      if (u.pass) return json(res, 403, { error: 'use_password' });
      if (u.apple || u.google) return json(res, 403, { error: 'use_provider' });
      return json(res, 200, { token: store.issueToken(u.id), code: u.code, name: u.name, email: u.email });
    }

    // Sign in with Apple / Google: the client sends the provider's identity
    // token; we verify signature + iss/aud/exp against the provider JWKS.
    // Links by provider sub first, then by verified email; creates otherwise.
    if (url.pathname === '/api/oauth' && req.method === 'POST') {
      if (throttled(req)) return json(res, 429, { error: 'slow_down' });
      const { provider, idToken, name } = await readBody(req);
      if (provider !== 'apple' && provider !== 'google') return json(res, 400, { error: 'bad_provider' });
      if (provider === 'google' && !GOOGLE_AUDS.length) return json(res, 501, { error: 'google_not_configured' });
      const payload = await verifyIdToken(provider, idToken);
      if (!payload?.sub) return json(res, 401, { error: 'token_invalid' });
      const sub = String(payload.sub);
      const mail = payload.email ? String(payload.email).toLowerCase() : null;

      // Match by provider `sub` ONLY. Auto-linking by email would let anyone
      // who pre-registered a victim's email capture their Apple/Google
      // sign-in into an attacker-controlled account.
      let u = store.userByProvider(provider, sub);
      let token;
      if (!u) {
        const displayName = String(name || (mail ? mail.split('@')[0] : 'Friend')).trim().slice(0, 20) || 'Friend';
        // never claim an email another account already holds
        const freeMail = mail && !store.emailTaken(mail) ? mail : null;
        const created = store.createUser({
          name: displayName,
          email: freeMail,
          apple: provider === 'apple' ? sub : null,
          google: provider === 'google' ? sub : null,
        });
        token = created.token;
        u = store.userById(created.id);
      } else {
        if (mail && !u.email && !store.emailTaken(mail)) {
          store.setEmail(u.id, mail); // provider-verified email fills an empty slot
          u = store.userById(u.id);
        }
        token = store.issueToken(u.id);
      }
      return json(res, 200, { token, code: u.code, name: u.name, email: u.email ?? null });
    }

    if (url.pathname === '/api/foods/learned' && req.method === 'GET') {
      // ETag: the list is identical between learnings, and every client asks
      // on every launch — 304s keep that from growing into real bandwidth.
      const st = store.learnedStamp();
      const tag = `W/"${st.n}-${st.m}"`;
      if (req.headers['if-none-match'] === tag) {
        res.writeHead(304, { ETag: tag });
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': 'application/json', ETag: tag, 'Cache-Control': 'no-cache' });
      return res.end(JSON.stringify({ entries: store.allLearned() }));
    }

    // One-shot owner broadcast (release announcements). Requires the
    // BROADCAST_KEY service variable — without it the route plays dead, and a
    // wrong secret is indistinguishable from the route not existing.
    // Owner-only batch pre-research: seeds the learned-foods table with common
    // groceries BEFORE users hit them, so "unknown food" gets rarer. Same
    // researchFood path as the live flow — three approved domains only, the
    // model still never rules from its own knowledge. `dryRun` returns what it
    // WOULD learn without persisting, so rulings can be eyeballed first.
    if (url.pathname === '/api/admin/research' && req.method === 'POST') {
      if (throttled(req, 10)) return json(res, 429, { error: 'slow_down' });
      const key = process.env.BROADCAST_KEY || '';
      const { secret, foods, dryRun } = await readBody(req);
      const sBuf = Buffer.from(String(secret || ''));
      const kBuf = Buffer.from(key);
      if (!key || sBuf.length !== kBuf.length || !timingSafeEqual(sBuf, kBuf))
        return json(res, 404, { error: 'not_found' });
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return json(res, 503, { error: 'vision_not_configured' });
      const list = (Array.isArray(foods) ? foods : []).map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 12);
      if (!list.length) return json(res, 400, { error: 'foods_required' });
      const known = new Set(allFoodKeys());
      const learned = [], skipped = [], failed = [];
      await Promise.allSettled(
        list.map((desc) =>
          researchFood(desc, apiKey)
            .then((entry) => {
              if (!entry) return failed.push({ desc, why: 'no ruling on approved sites' });
              if (known.has(entry.key)) return skipped.push({ desc, key: entry.key, why: 'already known' });
              if (store.learnedCount() >= LEARNED_MAX) return failed.push({ desc, why: 'learned cap reached' });
              if (!dryRun) store.addLearned(entry);
              known.add(entry.key);
              learned.push({ desc, key: entry.key, names: entry.names, rishona: entry.brachaRishona, achrona: entry.brachaAchrona, source: entry.sourceUrl });
            })
            .catch((e) => failed.push({ desc, why: String(e.message).slice(0, 120) })),
        ),
      );
      return json(res, 200, { ok: true, dryRun: !!dryRun, learned, skipped, failed, total: store.learnedCount() });
    }

    if (url.pathname === '/api/admin/broadcast' && req.method === 'POST') {
      if (throttled(req)) return json(res, 429, { error: 'slow_down' });
      const key = process.env.BROADCAST_KEY || '';
      const { secret, title, body } = await readBody(req);
      const sBuf = Buffer.from(String(secret || ''));
      const kBuf = Buffer.from(key);
      if (!key || sBuf.length !== kBuf.length || !timingSafeEqual(sBuf, kBuf))
        return json(res, 404, { error: 'not_found' });
      const cleanTitle = String(title || 'Rimon here 🍎').slice(0, 60);
      const cleanBody = String(body || '').trim().slice(0, 180);
      if (!cleanBody) return json(res, 400, { error: 'body_required' });
      // Both channels: Web Push subscribers AND native APNs devices.
      const subs = store.pushAudience();
      let sent = 0, expired = 0, failed = 0;
      await Promise.allSettled(
        subs.flatMap((u) => {
          const jobs = [];
          if (u.push?.subscription)
            jobs.push(
              webpush
                .sendNotification(u.push.subscription, JSON.stringify({ title: cleanTitle, body: cleanBody }), { timeout: 5000 })
                .then(() => sent++)
                .catch((e) => {
                  if (e.statusCode === 404 || e.statusCode === 410) {
                    store.setPush(u.id, null); // expired
                    expired++;
                  } else failed++;
                }),
            );
          if (u.apns && apnsReady())
            jobs.push(
              sendApns(u.apns, cleanTitle, cleanBody).then((r) => {
                if (r.ok) sent++;
                else if (r.gone) {
                  store.setApns(u.id, null);
                  expired++;
                } else failed++;
              }),
            );
          return jobs;
        }),
      );
      return json(res, 200, { ok: true, subscribers: subs.length, sent, expired, failed });
    }

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      // Vision costs real money per call: require a token, cap per-account
      // daily use, and cap global concurrency so one client can't OOM the box.
      const who = auth(req);
      if (!who) return json(res, 401, { error: 'unauthorized' });
      if (analyzeInFlight >= ANALYZE_MAX_INFLIGHT) return json(res, 429, { error: 'busy' });
      // cheap fast-fail (may be stale after the await below)
      const pre = analyzeUse.get(who.user.id);
      const today = new Date().toISOString().slice(0, 10);
      if (pre?.day === today && pre.count >= ANALYZE_MAX_PER_DAY)
        return json(res, 429, { error: 'daily_limit' });
      const body = await readBody(req, 12 * 1024 * 1024); // base64 photo
      if (!body.image) return json(res, 400, { error: 'no_image' });
      // Re-check AND increment atomically after the await: Node is single-
      // threaded, so a get/check/set with no await between them can't interleave.
      // Without this, parallel requests all read the same pre-await count and
      // could each pass the cap (multiplying vision spend).
      const use = analyzeUse.get(who.user.id);
      if (use?.day === today && use.count >= ANALYZE_MAX_PER_DAY)
        return json(res, 429, { error: 'daily_limit' });
      // charge the quota only once the request is valid — a malformed or
      // oversized body shouldn't burn one of the user's 30 daily calls
      analyzeUse.set(who.user.id, use?.day === today ? { day: today, count: use.count + 1 } : { day: today, count: 1 });
      analyzeInFlight++;
      try {
        const out = await analyze(body);
        return json(res, out.code, out.body);
      } finally {
        analyzeInFlight--;
      }
    }

    // ------- authed routes
    const a = auth(req);
    if (!a) return json(res, 401, { error: 'unauthorized' });

    if (url.pathname === '/api/sync' && req.method === 'POST') {
      const { progress, name } = await readBody(req);
      const oldPts = a.user.progress?.points ?? 0;
      if (progress) store.setProgress(a.user.id, mergeProgress(a.user.progress, progress));
      if (name) store.setName(a.user.id, String(name).trim().slice(0, 20));
      const me = store.userById(a.user.id);
      const newPts = me.progress?.points ?? 0;
      if (newPts > oldPts) notifyOvertaken(me, oldPts, newPts);
      // return the authoritative stored progress so a fresh device can adopt
      // it instead of pushing its empty state up (the wipe this merge prevents)
      return json(res, 200, { league: leagueFor(me), code: me.code, email: me.email ?? null, progress: me.progress ?? null });
    }

    // Who am I — lets a device restore its profile card from just the token.
    if (url.pathname === '/api/me') {
      return json(res, 200, {
        name: a.user.name,
        email: a.user.email ?? null,
        code: a.user.code,
        hasPassword: !!a.user.pass,
        providers: ['apple', 'google'].filter((p) => !!a.user[p]),
      });
    }

    // Account settings: change name and/or email (email stays unique).
    if (url.pathname === '/api/account' && req.method === 'POST') {
      const { name, email } = await readBody(req);
      if (name != null) {
        const n = String(name).trim().slice(0, 20);
        if (!n) return json(res, 400, { error: 'name_required' });
        store.setName(a.user.id, n);
      }
      if (email != null) {
        const mail = String(email).trim().toLowerCase().slice(0, 254);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return json(res, 400, { error: 'email_invalid' });
        const holder = store.userByEmail(mail);
        if (holder && holder.id !== a.user.id) return json(res, 409, { error: 'email_taken' });
        store.setEmail(a.user.id, mail);
      }
      const me = store.userById(a.user.id);
      return json(res, 200, { name: me.name, email: me.email ?? null, code: me.code });
    }

    // Set or change the account password. Requires the current password only
    // when one already exists (legacy accounts set their first one freely).
    if (url.pathname === '/api/account/password' && req.method === 'POST') {
      const { password, current } = await readBody(req);
      if (!password || String(password).length < PASSWORD_MIN) return json(res, 400, { error: 'password_short' });
      if (a.user.pass && !(await checkPassword(current ?? '', a.user.pass))) return json(res, 403, { error: 'wrong_password' });
      store.setPassword(a.user.id, await hashPassword(String(password).slice(0, 200)));
      // a changed password must lock out anyone holding an old session —
      // revoke every other token, keeping only the one that made this request
      store.revokeOtherTokens(a.user.id, a.token);
      return json(res, 200, { ok: true });
    }

    // Full account deletion (App Store guideline 5.1.1(v)): removes the user
    // and unlinks them from every friend list. Irreversible.
    if (url.pathname === '/api/account/delete' && req.method === 'POST') {
      store.deleteUser(a.user.id); // cascades: tokens, friendships, board rows
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/league') return json(res, 200, { league: leagueFor(a.user), code: a.user.code });

    if (url.pathname === '/api/friends/add' && req.method === 'POST') {
      if (throttled(req, 60)) return json(res, 429, { error: 'slow_down' });
      const { code } = await readBody(req);
      const raw = String(code || '').trim();
      // Code only — never email. Resolving a bare email into a friendship both
      // leaked the target's name/activity without consent AND turned any known
      // email into a takeover primitive (the response used to carry codes).
      if (raw.includes('@')) return json(res, 400, { error: 'use_code' });
      const other = store.userByCode(normalizeCode(raw));
      if (!other) return json(res, 404, { error: 'code_not_found' });
      if (other.id === a.user.id) return json(res, 400, { error: 'thats_you' });
      store.addFriend(a.user.id, other.id);
      return json(res, 200, { league: leagueFor(a.user), added: other.name });
    }

    // ------------------------------------------------------- leaderboards
    // Any user can run several named boards at once (family, shul, chevrusa)
    // and invite people with a short share code.
    if (url.pathname === '/api/boards' && req.method === 'GET') {
      const me = store.userById(a.user.id);
      const now = Date.now();
      const boards = store.boardsOf(me.id).map((b) => {
        const scored = store.boardMembersScored(b.id);
        const meRow = scored.find((m) => m.id === me.id);
        // frozen podium of the current round, once the sweep has sealed it
        const result = b.duration && b.ends_at <= now ? store.boardResult(b.id, b.round) : null;
        return {
          id: b.id,
          code: b.code,
          title: b.title,
          owner: b.owner_id === me.id,
          members: scored.length,
          league: standings(me, scored),
          unread: store.boardUnread(b.id, me.id),
          duration: b.duration ?? 'week',
          startsAt: b.starts_at,
          endsAt: b.ends_at,
          round: b.round ?? 1,
          ended: !!(b.duration && b.ends_at <= now),
          result: result
            ? {
                // names + round points only — no codes, no ids beyond "you"
                standings: result.standings.map((r) => ({
                  name: r.name,
                  points: r.points,
                  you: r.userId === me.id,
                })),
                winnerName: result.standings.find((r) => r.userId === result.winnerId)?.name ?? null,
                ended: result.ended,
                seen: (meRow?.revealRound ?? 0) >= (b.round ?? 1),
              }
            : null,
        };
      });
      return json(res, 200, { boards });
    }

    if (url.pathname === '/api/boards/create' && req.method === 'POST') {
      const { title, duration } = await readBody(req);
      const clean = String(title || '').trim().slice(0, 40);
      if (!clean) return json(res, 400, { error: 'title_required' });
      const dur = ['week', 'month', 'year'].includes(duration) ? duration : 'week';
      if (store.boardsOf(a.user.id).filter((b) => b.owner_id === a.user.id).length >= MAX_BOARDS_PER_USER)
        return json(res, 400, { error: 'too_many_boards' });
      const b = store.createBoard(a.user, clean, dur);
      // no push here — the creator is the only member and sees the countdown
      // in-UI; "started" pushes fire where OTHERS exist to tell (conversion,
      // run-it-back)
      return json(res, 200, { id: b.id, code: b.code, title: clean, duration: dur, endsAt: b.endsAt });
    }

    // The podium reveal was watched — never replay it for this member/round.
    if (url.pathname === '/api/boards/seen' && req.method === 'POST') {
      const { id } = await readBody(req);
      const board = store.boardById(String(id || ''));
      if (!board || !store.isBoardMember(board.id, a.user.id)) return json(res, 404, { error: 'board_not_found' });
      store.markRevealSeen(board.id, a.user.id, board.round ?? 1);
      return json(res, 200, { ok: true });
    }

    // "Run it back" — owner starts the next round: fresh clock, everyone at 0.
    if (url.pathname === '/api/boards/restart' && req.method === 'POST') {
      const { id, duration } = await readBody(req);
      const board = store.boardById(String(id || ''));
      if (!board || !store.isBoardMember(board.id, a.user.id)) return json(res, 404, { error: 'board_not_found' });
      if (board.owner_id !== a.user.id) return json(res, 403, { error: 'owner_only' });
      if (!(board.duration && board.ends_at <= Date.now())) return json(res, 400, { error: 'round_still_running' });
      const dur = ['week', 'month', 'year'].includes(duration) ? duration : board.duration;
      const fresh = store.restartBoard(board.id, dur);
      for (const m of store.boardMembers(board.id)) {
        if (!hasPushChannel(m)) continue;
        sendPush(
          m,
          '🏁 Leaderboard started!',
          `Round ${fresh.round} of “${board.title}” is on — everyone's back at 0. ${DURATION_LABEL[dur]} on the clock!`,
        );
      }
      return json(res, 200, { ok: true, round: fresh.round, endsAt: fresh.ends_at });
    }

    if (url.pathname === '/api/boards/join' && req.method === 'POST') {
      if (throttled(req, 60)) return json(res, 429, { error: 'slow_down' });
      const { code } = await readBody(req);
      const board = store.boardByCode(code);
      if (!board) return json(res, 404, { error: 'board_not_found' });
      const already = store.boardsOf(a.user.id).some((b) => b.id === board.id);
      if (!already) {
        if (store.boardsOf(a.user.id).length >= MAX_BOARDS_PER_USER)
          return json(res, 400, { error: 'too_many_boards' });
        if (store.boardMemberCount(board.id) >= MAX_BOARD_MEMBERS)
          return json(res, 400, { error: 'board_full' });
      }
      store.joinBoard(board.id, a.user); // baseline snapshot — newcomer starts at 0
      const me = store.userById(a.user.id);
      return json(res, 200, {
        id: board.id,
        code: board.code,
        title: board.title,
        league: standings(me, store.boardMembersScored(board.id)),
      });
    }

    if (url.pathname === '/api/boards/leave' && req.method === 'POST') {
      const { id } = await readBody(req);
      const board = store.boardById(String(id || ''));
      if (!board) return json(res, 404, { error: 'board_not_found' });
      // the owner leaving deletes the board rather than orphaning it
      if (board.owner_id === a.user.id) store.deleteBoard(board.id);
      else store.leaveBoard(board.id, a.user.id);
      return json(res, 200, { ok: true });
    }

    // ------------------------------------------------------ board group chat
    // One room per leaderboard; membership IS board membership, so joining or
    // leaving a board automatically adds/removes chat access (rows cascade).
    if (url.pathname === '/api/boards/messages' && req.method === 'GET') {
      const boardId = String(url.searchParams.get('board') || '');
      if (!store.isBoardMember(boardId, a.user.id)) return json(res, 404, { error: 'board_not_found' });
      const since = Number(url.searchParams.get('since') || 0);
      const messages = store.boardMessages(boardId, since, 100).map((m) => ({
        id: m.id,
        name: m.name,
        text: m.text,
        created: m.created,
        mine: m.user_id === a.user.id,
      }));
      store.markBoardRead(boardId, a.user.id, Date.now()); // opening the room clears the badge
      return json(res, 200, { messages, now: Date.now() });
    }

    if (url.pathname === '/api/boards/message' && req.method === 'POST') {
      const { board: boardId, text } = await readBody(req);
      const board = store.boardById(String(boardId || ''));
      if (!board || !store.isBoardMember(board.id, a.user.id)) return json(res, 404, { error: 'board_not_found' });
      const clean = String(text || '').trim().slice(0, 400);
      if (!clean) return json(res, 400, { error: 'text_required' });
      if (chatThrottled(a.user.id)) return json(res, 429, { error: 'slow_down' });
      const m = store.addBoardMessage(board.id, a.user.id, clean);
      store.markBoardRead(board.id, a.user.id, m.created);
      notifyBoardChat(board, a.user, clean); // fire-and-forget, per-member throttled
      return json(res, 200, { ok: true, id: m.id, created: m.created });
    }

    if (url.pathname === '/api/push/key') return json(res, 200, { key: vapid.publicKey });

    // Native iOS registers its APNs device token here (WKWebView has no Web
    // Push). {token:null} clears it — called on sign-out.
    if (url.pathname === '/api/push/native' && req.method === 'POST') {
      const { token } = await readBody(req);
      if (token != null && !/^[0-9a-f]{16,200}$/i.test(String(token))) return json(res, 400, { error: 'bad_token' });
      store.setApns(a.user.id, token ? String(token).toLowerCase() : null);
      return json(res, 200, { ok: true, enabled: !!token, delivery: apnsReady() ? 'apns' : 'awaiting_server_key' });
    }

    if (url.pathname === '/api/push/subscribe' && req.method === 'POST') {
      const { subscription, times, tzOffsetMinutes } = await readBody(req);
      // never store an arbitrary URL the scheduler would then POST to forever
      if (subscription) {
        try {
          const u = new URL(subscription.endpoint);
          const okHost = /(^|\.)(googleapis\.com|push\.apple\.com|windows\.com|mozilla\.com|mozaws\.net)$/.test(u.hostname);
          if (u.protocol !== 'https:' || !okHost) return json(res, 400, { error: 'bad_endpoint' });
        } catch {
          return json(res, 400, { error: 'bad_endpoint' });
        }
      }
      store.setPush(
        a.user.id,
        subscription ? { subscription, times: (times ?? []).slice(0, 6), tzOffsetMinutes: tzOffsetMinutes ?? 0 } : null,
      );
      return json(res, 200, { ok: true, enabled: !!subscription });
    }

    return json(res, 404, { error: 'not_found' });
  } catch (e) {
    return json(res, 500, { error: 'server_error', detail: String(e.message).slice(0, 200) });
  }
});

server.listen(PORT, () => console.log(`brachas-rimon-api on :${PORT} — vision ${process.env.ANTHROPIC_API_KEY ? 'LIVE' : 'demo (no ANTHROPIC_API_KEY)'}`));

// ------------------------------------------------------- process lifecycle
// Railway sends SIGTERM on every deploy/restart. Without a handler node dies
// with a non-zero exit, Railway records a CRASH, and the owner gets a crash
// email for every routine deploy. Exit 0 after flushing SQLite instead.
const shutdown = (sig) => {
  console.log(`${sig} received — draining connections, flushing SQLite`);
  server.close(() => {
    store.closeStore();
    process.exit(0);
  });
  // a hung keep-alive socket must not stall the deploy: hard-stop after 5s
  setTimeout(() => {
    store.closeStore();
    process.exit(0);
  }, 5000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ------------------------------------------------------- off-volume backups
// Guards against total loss of the Railway volume. Inert until BACKUP_KEY /
// BACKUP_REPO / BACKUP_TOKEN are set (see backup.mjs). Runs at boot, then daily.
if (backupReady()) {
  const dayStr = () => new Date().toISOString().slice(0, 10);
  const doBackup = () => runBackup(store.getDb(), DATA_DIR, dayStr()).catch(() => undefined);
  setTimeout(doBackup, 30_000).unref(); // shortly after boot, once traffic settles
  setInterval(doBackup, 24 * 60 * 60_000).unref();
  console.log('backups: ENABLED (daily off-volume snapshot)');
} else {
  console.log('backups: disabled — set BACKUP_KEY + BACKUP_REPO + BACKUP_TOKEN to enable');
}

// A stray rejection (push service hiccup, vision timeout) must LOG, not kill
// the API for every user. Sync work is SQLite-synchronous, so continuing is
// safe; anything that reaches here is a bug to fix, not a reason to go dark.
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.stack ?? e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e?.stack ?? e));

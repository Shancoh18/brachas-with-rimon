/**
 * Photo-identification capacity suite — boots the REAL server (fresh SQLite in
 * a temp dir) against a local MOCK of the Anthropic Messages API
 * (ANTHROPIC_BASE_URL), so the whole /api/analyze path runs without spending.
 *
 * Locks in the 2026-09-15 launch-readiness fixes:
 *  - an upload the phone abandons mid-body releases its slot (17 dropped
 *    uploads used to take photo ID down for everyone), and slow uploads are
 *    bounded per network / per account and never hold a vision slot;
 *  - failed photos are refunded to the user (hang-ups at most 3/day); the
 *    app-wide SPEND counter only when Anthropic can't have billed; junk never charged;
 *  - the app-wide daily cap answers its OWN code (global_limit);
 *  - a 529 overload is retried once instead of failing the photo;
 *  - each route has its own per-IP bucket (130 guest mints from one network
 *    no longer block anyone's photo or board join);
 *  - wrong friend/board codes share one strict per-network guess bucket;
 *  - the client IP comes from X-Real-IP (Railway's edge sets it), never a
 *    client-supplied X-Envoy-External-Address;
 *  - /api/status reports rate-limit counters, slot saturation and the edge
 *    client-IP diagnostic.
 *
 * Run:  node server/test/vision-capacity.mjs   (wired into scripts/preflight.mjs)
 */
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { createServer, request } from 'http';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, '..', 'server.mjs');
const PORT = 5197;
const B = `http://127.0.0.1:${PORT}`;
const GLOBAL_CAP = 40;
const BROADCAST_KEY = 'vision-capacity-secret';
const STATUS_KEY = createHash('sha256').update('status:' + BROADCAST_KEY).digest('hex').slice(0, 24);

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ mock Anthropic
// The photo's bytes carry a marker telling the mock how to behave:
//   OK       → tool_use report_foods after 50ms
//   FAIL     → 500 every time
//   OVERLOAD → 529 on the first call for that image, then OK
//   SLOW     → OK after 4s (the test hangs up before then)
const seenOverload = new Set();
let anthropicCalls = 0;
let slowAborted = 0;
const mock = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    let marker = 'OK';
    let imgKey = '';
    try {
      const j = JSON.parse(body);
      const img = j.messages?.[0]?.content?.find((c) => c.type === 'image')?.source?.data;
      if (!img) {
        // background calls (daily thought, research): a harmless answer that the
        // server rejects as "not found" — never an error status that could raise
        // an Anthropic alert or disturb the photo-call counts below
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ id: 'msg_mock', type: 'message', role: 'assistant', content: [{ type: 'text', text: 'mock: nothing here' }], stop_reason: 'end_turn' }));
      }
      anthropicCalls++; // photo calls only
      const text = Buffer.from(img, 'base64').toString('latin1');
      marker = (text.match(/MARK:([A-Z]+)/) || [])[1] || 'OK';
      imgKey = img.slice(-40);
    } catch {}
    const ok = () => {
      if (res.destroyed) return;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        id: 'msg_mock', type: 'message', role: 'assistant', model: 'mock',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'report_foods', input: { items: [{ db_key: 'apple', display_name: 'Apple', state: 'raw', confidence: 0.9 }], unmatched: [] } }],
        stop_reason: 'tool_use',
      }));
    };
    if (marker === 'NOTOOL') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ id: 'msg_mock', type: 'message', role: 'assistant', content: [{ type: 'text', text: 'no tool' }], stop_reason: 'end_turn' }));
    }
    if (marker === 'FAIL') {
      res.writeHead(500, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'mock failure' } }));
    }
    if (marker === 'OVERLOAD' && !seenOverload.has(imgKey)) {
      seenOverload.add(imgKey);
      res.writeHead(529, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'mock overloaded' } }));
    }
    if (marker === 'SLOW') {
      req.socket.on('close', () => { if (!res.writableFinished) slowAborted++; });
      await sleep(4000);
      return ok();
    }
    await sleep(50);
    ok();
  });
});
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const MOCK_PORT = mock.address().port;

// ------------------------------------------------------------------- server
const dataDir = mkdtempSync(join(tmpdir(), 'rimon-vision-'));
const child = spawn(process.execPath, ['--experimental-sqlite', SERVER], {
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    PORT: String(PORT),
    ANTHROPIC_API_KEY: 'mock-key-never-real',
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    ANALYZE_GLOBAL_MAX_PER_DAY: String(GLOBAL_CAP),
    BROADCAST_KEY,
    STATUS_KEY: '',
    APNS_KEY: '', APNS_KEY_ID: '', APNS_TEAM_ID: '',
    APPLE_SIWA_KEY: '', APPLE_SIWA_KEY_ID: '', APPLE_TEAM_ID: '',
    BACKUP_KEY: '', BACKUP_REPO: '', BACKUP_TOKEN: '',
    ROUND_SWEEP_MS: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (c) => (serverLog += c));
child.stderr.on('data', (c) => (serverLog += c));
const cleanup = async (code) => {
  child.kill();
  await new Promise((r) => mock.close(r));
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
  process.exit(code);
};

const api = async (path, { method = 'GET', token, body, ip = '203.0.113.10', signal, headers = {} } = {}) => {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};
/** a JPEG-shaped base64 photo of ~6KB carrying a mock marker + a unique tag */
let photoSeq = 0;
const photo = (marker = 'OK') =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`MARK:${marker}:${photoSeq++}:`), Buffer.alloc(6000)]).toString('base64');
const guest = async (ip) => {
  const r = await api('/api/guest', { method: 'POST', body: {}, ip });
  if (!r.json?.token) throw new Error(`guest mint failed: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json.token;
};
const analyze = (token, image, opts = {}) => api('/api/analyze', { method: 'POST', token, body: { image, media_type: 'image/jpeg' }, ...opts });
const status = async () => (await api(`/api/status?key=${STATUS_KEY}`, { ip: '198.51.100.250' })).json;

try {
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { await fetch(B + '/api/lessons'); up = true; } catch { await sleep(250); }
  }
  if (!up) throw new Error('server never accepted connections');

  // ------------------------------------------------------------ happy path
  const g1 = await guest('203.0.113.11');
  let r = await analyze(g1, photo(), { ip: '203.0.113.11' });
  check('analyze (mock Anthropic) → 200 with items', r.status === 200 && r.json?.items?.[0]?.db_key === 'apple', JSON.stringify(r.json).slice(0, 200));

  // ------------------------------------------------------ dropped uploads
  // 17 uploads (17 phones on 17 networks) that declare a 500KB body, send 1KB
  // and hang up. Before the fix each one held a slot forever and the 17th
  // user got 429 busy.
  const droppers = [];
  for (let i = 0; i < 17; i++) droppers.push({ ip: `203.0.113.${120 + i}`, tok: await guest(`203.0.113.${120 + i}`) });
  const openUpload = ({ ip, tok }, holdMs, trickle = false) => new Promise((done) => {
    const rq = request(`${B}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '500000', Authorization: `Bearer ${tok}`, 'X-Forwarded-For': ip },
    });
    let status = null;
    rq.on('response', (res) => { status = res.statusCode; res.resume(); });
    rq.on('error', () => {});
    rq.write('{"image":"' + 'A'.repeat(1000));
    const t = trickle ? setInterval(() => { try { rq.write('A'); } catch {} }, 500) : null;
    setTimeout(() => { if (t) clearInterval(t); rq.destroy(); done(status); }, holdMs);
  });
  await Promise.all(droppers.map((d) => openUpload(d, 150)));
  await sleep(600);
  let st = await status();
  check('17 abandoned uploads release every slot (uploads 0, vision in_flight 0)', st?.process?.analyze_in_flight === 0 && st?.limits?.uploads_in_progress === 0, `in_flight=${st?.process?.analyze_in_flight} uploads=${st?.limits?.uploads_in_progress}`);
  r = await analyze(g1, photo(), { ip: '203.0.113.11' });
  check('a normal photo still works after 17 abandoned uploads (no 429 busy)', r.status === 200, `${r.status} ${JSON.stringify(r.json)}`);
  check('abandoned uploads charged nobody (vision.today = the 2 real photos)', (await status())?.vision?.today === 2, `today=${(await status())?.vision?.today}`);

  // ------------------------------------------------ slow uploads (slowloris)
  // One network trickles 16 uploads with 8 guest tokens: only 6 uploads per
  // network (2 per account) are accepted, none holds a VISION slot, and a
  // phone on another network is identified immediately.
  const SLOW_NET = '198.51.100.31';
  const slowToks = [];
  for (let i = 0; i < 8; i++) slowToks.push(await guest(SLOW_NET));
  const slowRuns = Array.from({ length: 16 }, (_, i) => openUpload({ ip: SLOW_NET, tok: slowToks[i % 8] }, 3000, true));
  await sleep(800);
  st = await status();
  check('slow uploads from one network are capped at 6 and hold no vision slot', st?.limits?.uploads_in_progress === 6 && st?.process?.analyze_in_flight === 0, `uploads=${st?.limits?.uploads_in_progress} in_flight=${st?.process?.analyze_in_flight}`);
  const gOther = await guest('203.0.113.77');
  r = await analyze(gOther, photo(), { ip: '203.0.113.77' });
  check('…while a phone on another network is identified right away', r.status === 200, `${r.status} ${JSON.stringify(r.json)}`);
  const slowStatuses = await Promise.all(slowRuns);
  check('…and the extra slow uploads were told "busy" at once (429)', slowStatuses.filter((s) => s === 429).length === 10, `statuses=${slowStatuses.join(',')}`);
  const tok2 = slowToks[0];
  const both = await Promise.all([openUpload({ ip: '203.0.113.201', tok: tok2 }, 800, true), openUpload({ ip: '203.0.113.202', tok: tok2 }, 800, true), openUpload({ ip: '203.0.113.203', tok: tok2 }, 800, true)]);
  check('one account can have at most 2 photo requests in progress (3rd → 429)', both.filter((s) => s === 429).length === 1, `statuses=${both.join(',')}`);
  await sleep(400);

  // ------------------------------------------------------- junk + refunds
  const g2 = await guest('203.0.113.13');
  r = await analyze(g2, 'aGVsbG8=', { ip: '203.0.113.13' });
  check('non-image body → 400 bad_image', r.status === 400 && r.json?.error === 'bad_image', JSON.stringify(r.json));
  const todayBeforeFails = (await status()).vision.today;
  const fails = [];
  for (let i = 0; i < 12; i++) fails.push((await analyze(g2, photo('FAIL'), { ip: '203.0.113.13' })).status);
  check('Anthropic error statuses → 502, and 12 of them never use up the guest\'s 10/day', fails.every((s) => s === 502), fails.join(','));
  check('…nor the app-wide spend counter (error statuses are not billed)', (await status()).vision.today === todayBeforeFails);
  const oks = [];
  for (let i = 0; i < 11; i++) oks.push((await analyze(g2, photo(), { ip: '203.0.113.13' })).status);
  check('after the refunded failures the guest still gets exactly 10 photos, the 11th → 429 daily_limit', oks.slice(0, 10).every((s) => s === 200) && oks[10] === 429, oks.join(','));
  r = await analyze(g2, photo(), { ip: '203.0.113.13' });
  check('the per-user limit answers daily_limit (not global_limit)', r.status === 429 && r.json?.error === 'daily_limit', JSON.stringify(r.json));

  // ------------------------------------------------------ overload retry
  const g3 = await guest('203.0.113.14');
  const before529 = anthropicCalls;
  r = await analyze(g3, photo('OVERLOAD'), { ip: '203.0.113.14' });
  check('a 529 overload is retried once and the photo succeeds', r.status === 200 && anthropicCalls - before529 === 2, `${r.status} calls=${anthropicCalls - before529}`);

  // ---------------------------------------------------- billed failure
  const todayBeforeNoTool = (await status()).vision.today;
  r = await analyze(g3, photo('NOTOOL'), { ip: '203.0.113.14' });
  check('a billed answer with no tool output → 502 and STAYS on the app-wide spend counter', r.status === 502 && (await status()).vision.today === todayBeforeNoTool + 1, `${r.status} today ${todayBeforeNoTool} → ${(await status()).vision.today}`);

  // ------------------------------------------------------ phone hangs up
  const g4 = await guest('203.0.113.15');
  const hangUp = async () => {
    const ac = new AbortController();
    const pending = analyze(g4, photo('SLOW'), { ip: '203.0.113.15', signal: ac.signal }).catch(() => null);
    await sleep(700);
    ac.abort();
    await pending;
    await sleep(500);
  };
  const todayBefore = (await status())?.vision?.today;
  await hangUp();
  st = await status();
  check('a phone that hangs up mid-identification frees its slot', st?.process?.analyze_in_flight === 0, `in_flight=${st?.process?.analyze_in_flight}`);
  check('…cancels the Anthropic call', slowAborted >= 1, `slowAborted=${slowAborted}`);
  check('…keeps it on the app-wide spend counter (may be billed)', st?.vision?.today === todayBefore + 1, `${todayBefore} → ${st?.vision?.today}`);
  check('…and does not raise an Anthropic-failure alert', !st?.alerts?.some((a) => /anthropic/.test(a.code)), JSON.stringify(st?.alerts));
  await hangUp();
  await hangUp();
  await hangUp(); // 4th hang-up today: past the refund cap of 3
  const after = [];
  for (let i = 0; i < 10; i++) after.push((await analyze(g4, photo(), { ip: '203.0.113.15' })).status);
  check('hang-ups refund the user at most 3 times a day (4th counts: 9 more photos, then daily_limit)', after.slice(0, 9).every((s) => s === 200) && after[9] === 429, after.join(','));

  // ------------------------------------------------------- global cap
  // spend the rest of the app-wide cap with fresh guests (10 each)
  let used = (await status()).vision.today;
  let n = 0;
  while (used < GLOBAL_CAP) {
    const tok = await guest(`203.0.113.${40 + (n % 50)}`);
    for (let i = 0; i < 10 && used < GLOBAL_CAP; i++) {
      const rr = await analyze(tok, photo(), { ip: `203.0.113.${40 + (n % 50)}` });
      if (rr.status === 200) used++;
      else throw new Error(`unexpected ${rr.status} while filling the cap: ${JSON.stringify(rr.json)}`);
    }
    n++;
  }
  const fresh = await guest('203.0.113.99');
  r = await analyze(fresh, photo(), { ip: '203.0.113.99' });
  check(`app-wide cap (${GLOBAL_CAP}) → 429 global_limit for a brand-new guest`, r.status === 429 && r.json?.error === 'global_limit', JSON.stringify(r.json));
  st = await status();
  check('status shows the cap exhausted as CRITICAL', st?.alerts?.some((a) => a.code === 'vision_quota_exhausted'), JSON.stringify(st?.alerts));
  check('status counts 429s by reason (global_limit, daily_limit, busy)', (st?.limits?.rate_limited_since_boot?.global_limit ?? 0) >= 1 && (st?.limits?.rate_limited_since_boot?.daily_limit ?? 0) >= 2 && st?.limits?.busy_last_6h >= 11, JSON.stringify(st?.limits));

  // ----------------------------------------------------- per-route buckets
  // 130 guest mints from ONE network (over the old shared 120) — the photo
  // and board-join buckets on that same network must stay open.
  const NET = '198.51.100.60';
  const mintCodes = [];
  for (let i = 0; i < 130; i++) mintCodes.push((await api('/api/guest', { method: 'POST', body: {}, ip: NET })).status);
  check('130 guest sessions from one network all succeed (guest bucket 300/10min)', mintCodes.every((s) => s === 200), `non-200: ${mintCodes.filter((s) => s !== 200).length}`);
  const reg = await api('/api/register', { method: 'POST', body: { name: 'Shul Member', password: 'shul-member-pass-1' }, ip: NET });
  check('…registering from that network still works', reg.status === 200 && !!reg.json?.token, `${reg.status} ${JSON.stringify(reg.json)}`);
  r = await api('/api/boards/join', { method: 'POST', token: reg.json?.token, body: { code: 'ZZZZZZ' }, ip: NET });
  check('…and a board join from that network is not rate limited (404 unknown code, not 429)', r.status === 404, `${r.status} ${JSON.stringify(r.json)}`);

  // ---------------------------------------------------------- code guessing
  // wrong friend/board codes share ONE strict per-network bucket (60/10min),
  // even across many accounts — enumeration stays as slow as before.
  const GUESS_NET = '198.51.100.70';
  const guessers = [];
  for (let i = 0; i < 3; i++) guessers.push((await api('/api/register', { method: 'POST', body: { name: `Guesser ${i}`, password: 'guesser-pass-123' }, ip: GUESS_NET })).json.token);
  const guessCodes = [];
  for (let i = 0; i < 61; i++) {
    const tok = guessers[i % 3];
    const path = i % 2 ? '/api/friends/add' : '/api/boards/join';
    guessCodes.push((await api(path, { method: 'POST', token: tok, body: { code: i % 2 ? `RIMON-Q${String(i).padStart(3, '0')}` : `Q${String(i).padStart(5, '0')}` }, ip: GUESS_NET })).status);
  }
  check('60 wrong codes from one network (3 accounts, both routes) → 404s, the 61st → 429', guessCodes.slice(0, 60).every((s) => s === 404) && guessCodes[60] === 429, guessCodes.join(','));
  r = await api('/api/boards/join', { method: 'POST', token: reg.json?.token, body: { code: 'ZZZZZY' }, ip: NET });
  check('…another network is unaffected (404, not 429)', r.status === 404, `${r.status}`);

  // ---------------------------------------------------------------- edge
  st = await status();
  check('status exposes the edge diagnostic (hashed client IP, hop count)', /^[0-9a-f]{10}$/.test(st?.edge?.client_ip_hash ?? '') && st?.edge?.xff_hops === 1 && st?.edge?.real_ip_header === false, JSON.stringify(st?.edge));
  const other = await api(`/api/status?key=${STATUS_KEY}`, { ip: '192.0.2.77' });
  check('…two networks → two different client_ip_hash values', other.json?.edge?.client_ip_hash && other.json.edge.client_ip_hash !== st.edge.client_ip_hash);
  const privHop = await api(`/api/status?key=${STATUS_KEY}`, { ip: '192.0.2.77, 10.4.5.6' });
  check('…a trailing private proxy hop is skipped (same bucket as the real client)', privHop.json?.edge?.client_ip_hash === other.json?.edge?.client_ip_hash && privHop.json?.edge?.last_hop_private === true, JSON.stringify(privHop.json?.edge));
  const viaRealIp = await api(`/api/status?key=${STATUS_KEY}`, { ip: '198.51.100.1, 152.233.12.242', headers: { 'X-Real-IP': '192.0.2.77' } });
  check('…X-Real-IP (set by Railway\'s edge) wins over X-Forwarded-For', viaRealIp.json?.edge?.client_ip_hash === other.json?.edge?.client_ip_hash && viaRealIp.json?.edge?.real_ip_header === true, JSON.stringify(viaRealIp.json?.edge));
  const spoof = await api(`/api/status?key=${STATUS_KEY}`, { ip: '192.0.2.77', headers: { 'X-Envoy-External-Address': '203.0.113.250' } });
  check('…a client-supplied X-Envoy-External-Address is ignored (no picking your own bucket)', spoof.json?.edge?.client_ip_hash === other.json?.edge?.client_ip_hash, JSON.stringify(spoof.json?.edge));
  const spoofed = [];
  for (let i = 0; i < 125; i++) spoofed.push((await api('/api/signin', { method: 'POST', body: { email: `nobody${i}@example.com`, password: 'wrong-password-1' }, ip: '192.0.2.88', headers: { 'X-Envoy-External-Address': `203.0.113.${i % 250}` } })).status);
  check('…so rotating that header no longer dodges the sign-in limit (429 after 120)', spoofed.slice(120).every((s) => s === 429), `last: ${spoofed.slice(118).join(',')}`);
  check('status reports slot saturation fields', st?.limits?.analyze_max_inflight === 16 && st?.limits?.analyze_at_cap_seconds === 0 && st?.limits?.uploads_in_progress === 0, JSON.stringify(st?.limits));
  check('no unhandled 500s were logged', !/^500 /m.test(serverLog), serverLog.split('\n').filter((l) => l.startsWith('500 ')).slice(0, 3).join(' | '));
} catch (e) {
  check('vision capacity suite ran to completion', false, String(e.stack ?? e));
  console.log('--- server log tail ---');
  console.log(serverLog.slice(-2000));
}

console.log(failures === 0 ? '\nVISION-CAPACITY: ALL PASS' : `\nVISION-CAPACITY: ${failures} FAILURE(S)`);
await cleanup(failures === 0 ? 0 : 1);

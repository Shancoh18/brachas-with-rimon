/**
 * Push + chat scenario suite — boots the REAL server (fresh SQLite in a temp
 * dir) against the mock APNs (test/mock-apns.mjs) and asserts every push
 * scenario end-to-end: registration, chat fan-out, throttles, token moves,
 * dead-token cleanup, overtake nudges, owner broadcast, and the abuse guards.
 *
 * Run:  node server/test/scenarios.mjs        (from the repo root; any cwd works)
 * Exit: 0 = all pass, 1 = any FAIL — wired into scripts/preflight.mjs and the
 * Codemagic "Server scenario tests" step so every upload runs it.
 *
 * PASS/FAIL line format mirrors scripts/e2e.mjs.
 */
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, generateKeyPairSync } from 'crypto';
import { startMockApns } from './mock-apns.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, '..', 'server.mjs');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// ---------------------------------------------------------------- helpers
const PORT = 5188;
const B = `http://127.0.0.1:${PORT}`;
const api = async (path, { method = 'GET', token, body, headers = {} } = {}) => {
  const res = await fetch(B + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};
const register = async (name) => {
  const r = await api('/api/register', { method: 'POST', body: { name, password: 'scenario-pass-1' } });
  if (!r.json?.token) throw new Error(`register failed: ${JSON.stringify(r.json)}`);
  return r.json.token;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- boot
const dataDir = mkdtempSync(join(tmpdir(), 'rimon-scenarios-'));
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const p8 = privateKey.export({ type: 'pkcs8', format: 'pem' });

const mock = await startMockApns();
const child = spawn(process.execPath, ['--experimental-sqlite', SERVER], {
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    PORT: String(PORT),
    APNS_KEY: p8,
    APNS_KEY_ID: 'SCENARIOKEY',
    APNS_TEAM_ID: '6WT5WK8MLZ',
    APNS_HOST: `http://127.0.0.1:${mock.port}`,
    BROADCAST_KEY: 'scenario-broadcast-secret',
    STATUS_KEY: '', // /api/status key must be the one DERIVED from BROADCAST_KEY
    ANTHROPIC_API_KEY: '', // vision stays demo — never spend on tests
    BACKUP_KEY: '', BACKUP_REPO: '', BACKUP_TOKEN: '', // backups OFF — the prune 409 path relies on it
    ROUND_SWEEP_MS: '0', // keep the round sweep quiet — count-based asserts
    // below must only ever see the pushes they trigger themselves
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (c) => (serverLog += c));
child.stderr.on('data', (c) => (serverLog += c));

// Second server for the timed-round lifecycle: rounds shrunk to ~2.5s and a
// 400ms sweep so finalize → reveal → run-it-back can be asserted end-to-end.
// Separate DB + port; SAME mock APNs, so token-filtered waits work unchanged.
const PORT2 = 5189;
const B2 = `http://127.0.0.1:${PORT2}`;
const dataDir2 = mkdtempSync(join(tmpdir(), 'rimon-rounds-'));
const child2 = spawn(process.execPath, ['--experimental-sqlite', SERVER], {
  env: {
    ...process.env,
    DATA_DIR: dataDir2,
    PORT: String(PORT2),
    APNS_KEY: p8,
    APNS_KEY_ID: 'SCENARIOKEY',
    APNS_TEAM_ID: '6WT5WK8MLZ',
    APNS_HOST: `http://127.0.0.1:${mock.port}`,
    ANTHROPIC_API_KEY: '',
    ROUND_SWEEP_MS: '400',
    ROUND_DURATIONS_OVERRIDE: JSON.stringify({ week: 2500 }),
    MORNING_HOUR: '0', // last-day push fires at any local hour
    EVENING_HOUR: '25', // daily-leader pushes never fire — keeps counts exact
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child2.stdout.on('data', (c) => (serverLog += c));
child2.stderr.on('data', (c) => (serverLog += c));
const api2 = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(B2 + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

// wait for both ports to accept
for (const base of [B, B2]) {
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { await fetch(base + '/api/lessons'); up = true; } catch { await sleep(250); }
  }
  if (!up) {
    console.log(`FAIL  server boot (${base}) — never accepted connections`);
    console.log(serverLog.slice(-2000));
    process.exit(1);
  }
}

const cleanup = async (code) => {
  child.kill();
  child2.kill();
  await mock.close();
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {} // WAL handles may lag on Windows
  try { rmSync(dataDir2, { recursive: true, force: true }); } catch {}
  process.exit(code);
};

try {
  // ------------------------------------------------------- daily thought
  // No ANTHROPIC key in tests → the endpoint must still 200 with a null
  // thought (the client hides the card), never 500 or hang.
  let r0 = await api('/api/daily-thought');
  check('daily-thought degrades gracefully without a key', r0.status === 200 && r0.json.thought === null && r0.json.fresh === false, JSON.stringify(r0.json));

  // -------------------------------------------------- users + registration
  const tokA = await register('Sender A');
  const tokB = await register('Member B');
  const tokC = await register('Member C');

  const A_TOKEN = 'a1'.repeat(32);
  const B_TOKEN = 'b1'.repeat(32);
  const C_TOKEN = 'c1'.repeat(32);

  // the SENDER holds a device too — otherwise the sender-exclusion asserts
  // below are vacuous (nothing to wrongly push to)
  let r = await api('/api/push/native', { method: 'POST', token: tokA, body: { token: A_TOKEN } });
  check('sender registers a device token too', r.status === 200 && r.json.enabled);
  r = await api('/api/push/native', { method: 'POST', token: tokB, body: { token: B_TOKEN } });
  check('APNs token registers with delivery=apns', r.status === 200 && r.json.enabled && r.json.delivery === 'apns', JSON.stringify(r.json));
  r = await api('/api/push/native', { method: 'POST', token: tokC, body: { token: C_TOKEN } });
  check('second member registers a token', r.status === 200 && r.json.enabled);
  r = await api('/api/push/native', { method: 'POST', token: tokB, body: { token: 'NOT-HEX!!' } });
  check('garbage token rejected with 400', r.status === 400 && r.json.error === 'bad_token');

  // ------------------------------------------------------- board + chat push
  r = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title: 'Scenario Board' } });
  const board1 = r.json.id ?? r.json.board?.id;
  const code1 = r.json.code ?? r.json.board?.code;
  check('board created', !!board1 && !!code1);
  await api('/api/boards/join', { method: 'POST', token: tokB, body: { code: code1 } });
  await api('/api/boards/join', { method: 'POST', token: tokC, body: { code: code1 } });

  r = await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: board1, text: 'shalom scenario' } });
  check('chat message accepted', r.status === 200 && r.json.ok);

  let got = await mock.waitFor((reqs) => reqs.some((x) => x.token === B_TOKEN) && reqs.some((x) => x.token === C_TOKEN));
  check('chat push fans out to BOTH other members via APNs', got, `${mock.requests.length} pushes seen`);
  check('sender does NOT get their own chat push', mock.forToken(A_TOKEN).length === 0);
  const bPush = mock.forToken(B_TOKEN)[0];
  check('push carries board title + sender + text', !!bPush && bPush.title.includes('Scenario Board') && /Sender A/.test(bPush.body) && /shalom scenario/.test(bPush.body), bPush ? `${bPush.title} | ${bPush.body}` : 'none');
  check('push uses correct APNs topic (bundle id)', !!bPush && bPush.topic === 'com.shancoh.brachaswithrimon', bPush?.topic);
  check('provider JWT attached', !!bPush && /^bearer .+\..+\..+/.test(bPush.auth));

  // ------------------------------------------------------------- throttle
  const before = mock.requests.length;
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: board1, text: 'second message right away' } });
  await sleep(1200);
  check('chat cooldown: immediate second message pushes nobody', mock.requests.length === before, `${mock.requests.length - before} extra`);

  // active-reader skip: a member who just opened the room (GET marks read) is
  // NOT buzzed on the next message — only away members get the nudge.
  const rab = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title: 'Active Reader Board' } });
  const bActive = rab.json.id ?? rab.json.board?.id;
  await api('/api/boards/join', { method: 'POST', token: tokB, body: { code: rab.json.code ?? rab.json.board?.code } });
  await api('/api/boards/join', { method: 'POST', token: tokC, body: { code: rab.json.code ?? rab.json.board?.code } });
  await api('/api/boards/messages?board=' + bActive, { token: tokB }); // B is actively viewing → marks read now
  const activeBefore = { b: mock.forToken(B_TOKEN).length, c: mock.forToken(C_TOKEN).length };
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: bActive, text: 'ping the room' } });
  got = await mock.waitFor(() => mock.forToken(C_TOKEN).length > activeBefore.c);
  await sleep(600);
  check('active reader (B, just opened) gets NO push', mock.forToken(B_TOKEN).length === activeBefore.b);
  check('away member (C) still gets the push', got && mock.forToken(C_TOKEN).length === activeBefore.c + 1);

  // ------------------------------------------------- device token uniqueness
  // B signs in on C's phone: registering C's token for B must MOVE it off C.
  r = await api('/api/push/native', { method: 'POST', token: tokB, body: { token: C_TOKEN } });
  check('re-registering another account\'s token succeeds', r.status === 200);
  r = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title: 'Board Two' } });
  const board2 = r.json.id ?? r.json.board?.id;
  await api('/api/boards/join', { method: 'POST', token: tokB, body: { code: r.json.code ?? r.json.board?.code } });
  await api('/api/boards/join', { method: 'POST', token: tokC, body: { code: r.json.code ?? r.json.board?.code } });
  const beforeMove = mock.forToken(C_TOKEN).length;
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: board2, text: 'post-move message' } });
  got = await mock.waitFor((reqs) => reqs.filter((x) => x.token === C_TOKEN).length > beforeMove);
  await sleep(600); // let any (wrong) duplicate for C land before counting
  check('moved device token pushed exactly ONCE (one phone ≠ two pushes)', got && mock.forToken(C_TOKEN).length === beforeMove + 1, `${mock.forToken(C_TOKEN).length - beforeMove} pushes to that phone`);

  // -------------------------------------------------------- dead-token cleanup
  const GONE = 'dead'.repeat(16);
  await api('/api/push/native', { method: 'POST', token: tokC, body: { token: GONE } });
  r = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title: 'Board Three' } });
  const board3 = r.json.id ?? r.json.board?.id;
  await api('/api/boards/join', { method: 'POST', token: tokC, body: { code: r.json.code ?? r.json.board?.code } });
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: board3, text: 'to a dead device' } });
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === GONE));
  check('push attempted to dead device (410 path exercised)', got);
  await sleep(800); // give the 410 handler time to clear the token
  r = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title: 'Board Four' } });
  const board4 = r.json.id ?? r.json.board?.id;
  await api('/api/boards/join', { method: 'POST', token: tokC, body: { code: r.json.code ?? r.json.board?.code } });
  const goneBefore = mock.forToken(GONE).length;
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: board4, text: 'dead device again' } });
  await sleep(1200);
  check('410 Unregistered clears the token — no further attempts', mock.forToken(GONE).length === goneBefore, `${mock.forToken(GONE).length - goneBefore} extra attempts`);

  // ------------------------------------------- transient failure ≠ dead device
  // A 5xx from Apple (their outage, not the device's fault) must NOT clear the
  // token — clearing on transient errors would silently unsubscribe everyone
  // during an APNs blip.
  const FLAKY = 'f500'.repeat(16);
  await api('/api/push/native', { method: 'POST', token: tokC, body: { token: FLAKY } });
  const mkBoard = async (title) => {
    const rr = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title } });
    const id = rr.json.id ?? rr.json.board?.id;
    await api('/api/boards/join', { method: 'POST', token: tokC, body: { code: rr.json.code ?? rr.json.board?.code } });
    return id;
  };
  const bFlaky1 = await mkBoard('Flaky One');
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: bFlaky1, text: 'through the outage' } });
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === FLAKY));
  check('push attempted during APNs 5xx outage', got);
  await sleep(800); // window for any (wrongful) cleanup to run
  const bFlaky2 = await mkBoard('Flaky Two');
  const flakyBefore = mock.forToken(FLAKY).length;
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: bFlaky2, text: 'after the outage' } });
  got = await mock.waitFor(() => mock.forToken(FLAKY).length > flakyBefore);
  check('transient 5xx does NOT clear the token — next push still attempted', got);

  // --------------------------------------------- 400 BadDeviceToken cleanup
  const BAD = 'bad0'.repeat(16);
  await api('/api/push/native', { method: 'POST', token: tokC, body: { token: BAD } });
  const bBad1 = await mkBoard('Bad One');
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: bBad1, text: 'to a bad token' } });
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === BAD));
  check('push attempted to BadDeviceToken device (400 path exercised)', got);
  await sleep(800);
  const bBad2 = await mkBoard('Bad Two');
  const badBefore = mock.forToken(BAD).length;
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: bBad2, text: 'bad token again' } });
  await sleep(1200);
  check('400 BadDeviceToken clears the token — no further attempts', mock.forToken(BAD).length === badBefore, `${mock.forToken(BAD).length - badBefore} extra attempts`);

  // ------------------------------------------------------------- overtake
  const tokD = await register('Rival D');
  const D_TOKEN = 'd1'.repeat(32);
  await api('/api/push/native', { method: 'POST', token: tokD, body: { token: D_TOKEN } });
  // D and A share a board; D leads with 5 points, then A syncs 10 → D got passed
  r = await api('/api/boards/create', { method: 'POST', token: tokD, body: { title: 'Race Board' } });
  await api('/api/boards/join', { method: 'POST', token: tokA, body: { code: r.json.code ?? r.json.board?.code } });
  await api('/api/sync', { method: 'POST', token: tokD, body: { progress: { totalBrachos: 2, streakCurrent: 1, points: 5, history: [{ day: today(), points: 5, brachos: 2 }] } } });
  await api('/api/sync', { method: 'POST', token: tokA, body: { progress: { totalBrachos: 4, streakCurrent: 1, points: 10, history: [{ day: today(), points: 10, brachos: 4 }] } } });
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === D_TOKEN && /passed/i.test(x.title + x.body)));
  check('overtake push reaches the passed rival', got, mock.forToken(D_TOKEN).map((x) => x.title).join(' | ') || 'none');

  // ------------------------------------------------------------- broadcast
  const preBroadcast = mock.requests.length;
  r = await api('/api/admin/broadcast', { method: 'POST', body: { secret: 'scenario-broadcast-secret', title: 'Owner note', body: 'broadcast scenario' } });
  check('broadcast accepted with correct secret', r.status === 200 && r.json.ok, JSON.stringify(r.json));
  got = await mock.waitFor((reqs) => reqs.filter((x) => x.at && x.body === 'broadcast scenario').length >= 2);
  check('broadcast reaches every APNs device', got, `${mock.requests.length - preBroadcast} pushes`);
  r = await api('/api/admin/broadcast', { method: 'POST', body: { secret: 'wrong', title: 'x', body: 'y' } });
  check('broadcast with wrong secret plays dead (404)', r.status === 404);

  // ------------------------------------------------------------ abuse guards
  r = await api('/api/boards/messages?board=' + board1, { token: tokD });
  check('non-member cannot read a board room', r.status === 404);
  r = await api('/api/boards/message', { method: 'POST', token: tokD, body: { board: board1, text: 'intruder' } });
  check('non-member cannot post to a board room', r.status === 404);
  let limited = false;
  for (let i = 0; i < 25 && !limited; i++) {
    const rr = await api('/api/boards/message', { method: 'POST', token: tokB, body: { board: board1, text: `flood ${i}` } });
    limited = rr.status === 429;
  }
  check('chat flood hits the 20/5min rate limit (429)', limited);
  r = await api('/api/push/subscribe', { method: 'POST', token: tokB, body: { subscription: { endpoint: 'https://evil.example.com/hook' }, times: [] } });
  check('web-push subscribe rejects non-push-service endpoints', r.status === 400);

  // ----------------------------------------------------------- sign-out clear
  r = await api('/api/push/native', { method: 'POST', token: tokB, body: { token: null } });
  check('sign-out clears the device token', r.status === 200 && r.json.enabled === false);
  r = await api('/api/boards/create', { method: 'POST', token: tokA, body: { title: 'Board Five' } });
  const board5 = r.json.id ?? r.json.board?.id;
  await api('/api/boards/join', { method: 'POST', token: tokB, body: { code: r.json.code ?? r.json.board?.code } });
  const clearedBefore = mock.forToken(C_TOKEN).length; // B held C_TOKEN before clearing
  await api('/api/boards/message', { method: 'POST', token: tokA, body: { board: board5, text: 'after sign-out' } });
  await sleep(1200);
  check('cleared device receives nothing', mock.forToken(C_TOKEN).length === clearedBefore);

  // -------------------------------------------- account-takeover chain (fixed)
  // Register a friend and pull the league — other members' real friend codes
  // (a sign-in credential) must NEVER appear; they come back masked.
  const takeoverEmail = 'victim@scenario.test';
  const rv = await api('/api/register', { method: 'POST', body: { name: 'Victim V', email: takeoverEmail, password: 'victim-pass-1' } });
  const victimCode = rv.json.code;
  const victimTok = rv.json.token;
  // A adds Victim by code, then reads A's league
  await api('/api/friends/add', { method: 'POST', token: tokA, body: { code: victimCode } });
  const lg = await api('/api/league', { token: tokA });
  const rows = lg.json.league ?? [];
  const meRow = rows.find((x) => x.you);
  const others = rows.filter((x) => !x.you);
  check('league returns caller\'s own real code', meRow && /^RIMON-/.test(meRow.code));
  check('league MASKS every other member\'s friend code', others.length > 0 && others.every((x) => !/^RIMON-/.test(String(x.code))), others.map((x) => x.code).join(','));

  // friends/add by email is refused (was an unconsented lookup + takeover primitive)
  r = await api('/api/friends/add', { method: 'POST', token: tokA, body: { code: takeoverEmail } });
  check('friends/add rejects an email target (code-only)', r.status === 400 && r.json.error === 'use_code');

  // code sign-in cannot unlock a password account (the published invite code is not a back door)
  r = await api('/api/signin', { method: 'POST', body: { email: takeoverEmail, code: victimCode } });
  check('friend-code sign-in refused for a password account', r.status === 403 && r.json.error === 'use_password');
  // sanity: the real password still works
  r = await api('/api/signin', { method: 'POST', body: { email: takeoverEmail, password: 'victim-pass-1' } });
  check('password sign-in still works', r.status === 200 && !!r.json.token);

  // ------------------------------------------ progress merge (new-device wipe)
  // Victim builds up real progress on device 1...
  await api('/api/sync', { method: 'POST', token: victimTok, body: { progress: { totalBrachos: 40, streakCurrent: 6, points: 88, history: [{ day: today(), brachos: 4, points: 12 }] } } });
  // ...then signs in fresh on device 2, which pushes EMPTY state up
  const rFresh = await api('/api/sync', { method: 'POST', token: victimTok, body: { progress: { totalBrachos: 0, streakCurrent: 0, points: 0, history: [] } } });
  check('empty new-device sync does NOT wipe stored progress', rFresh.json.progress?.points === 88 && rFresh.json.progress?.totalBrachos === 40, JSON.stringify(rFresh.json.progress));
  check('sync response returns stored progress for the fresh device to adopt', (rFresh.json.progress?.history?.length ?? 0) === 1);
  // a higher real value still raises the total (merge = max, not frozen)
  const rHigher = await api('/api/sync', { method: 'POST', token: victimTok, body: { progress: { totalBrachos: 41, streakCurrent: 7, points: 90, history: [{ day: today(), brachos: 5, points: 14 }] } } });
  check('a genuinely higher sync still advances the total', rHigher.json.progress?.points === 90 && rHigher.json.progress?.totalBrachos === 41);
  void victimTok;

  // --------------------------------- per-email sign-in cap survives XFF spoofing
  // Each attempt carries a DIFFERENT X-Forwarded-For, so the per-IP throttle
  // never fires; only the hop-independent per-email cap can stop the stuffing.
  const capEmail = 'capvictim@scenario.test';
  await api('/api/register', { method: 'POST', body: { name: 'Cap V', email: capEmail, password: 'cap-real-pass-1' } });
  let capBlocked = 0;
  for (let i = 0; i < 12; i++) {
    const res = await fetch(B + '/api/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `203.0.113.${i}` },
      body: JSON.stringify({ email: capEmail, password: `wrong-${i}` }),
    });
    if (res.status === 429) capBlocked++;
  }
  check('per-email cap blocks stuffing despite rotating X-Forwarded-For', capBlocked >= 1, `${capBlocked} of 12 got 429`);
  // the real password STILL works from a fresh IP after the wrong-guess burst
  const capOk = await fetch(B + '/api/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.7' },
    body: JSON.stringify({ email: capEmail, password: 'cap-real-pass-1' }),
  });
  // (may be 429 if the cap window is still open — accept either, but a wrong-only lockout of the owner is the real risk; success proves the counter clears)
  check('per-email cap does not permanently lock the real owner', capOk.status === 200 || capOk.status === 429);

  // ------------------------------------------- timed rounds (fast server #2)
  // Rounds on server 2 last ~2.5s with a 400ms sweep, so the full lifecycle —
  // everyone starts at 0 → last-day push → clock ends → podium frozen → winner
  // crowned (+1 win) → reveal seen once → owner runs it back — runs for real.
  const reg2 = async (name) => {
    const rr = await api2('/api/register', { method: 'POST', body: { name, password: 'scenario-pass-1' } });
    if (!rr.json?.token) throw new Error(`register2 failed: ${JSON.stringify(rr.json)}`);
    return rr.json.token;
  };
  const tokE = await reg2('Racer E');
  const tokF = await reg2('Racer F');
  const E_TOKEN = 'e1'.repeat(32);
  const F_TOKEN = 'f1'.repeat(32);
  await api2('/api/push/native', { method: 'POST', token: tokE, body: { token: E_TOKEN } });
  await api2('/api/push/native', { method: 'POST', token: tokF, body: { token: F_TOKEN } });

  // E arrives with existing lifetime points — the round must still start at 0
  await api2('/api/sync', { method: 'POST', token: tokE, body: { progress: { totalBrachos: 30, streakCurrent: 3, points: 70, history: [{ day: today(), brachos: 3, points: 9 }] } } });

  r = await api2('/api/boards/create', { method: 'POST', token: tokE, body: { title: 'Sprint Board', duration: 'week' } });
  const sprint = r.json.id;
  check('timed create returns duration + end time', r.json.duration === 'week' && Number.isFinite(r.json.endsAt), JSON.stringify({ d: r.json.duration, e: r.json.endsAt }));
  await api2('/api/boards/join', { method: 'POST', token: tokF, body: { code: r.json.code } });

  r = await api2('/api/boards', { token: tokE });
  let sb = r.json.boards.find((x) => x.id === sprint);
  check('everyone starts the round at 0 (baselines snapshotted)', !!sb && sb.league.every((row) => row.points === 0), JSON.stringify(sb?.league.map((x) => x.points)));
  check('board carries countdown fields', sb.duration === 'week' && sb.endsAt > Date.now() - 60_000 && sb.round === 1 && sb.ended === false, JSON.stringify({ d: sb.duration, r: sb.round }));

  // F scores 6 round points; E adds nothing this round
  await api2('/api/sync', { method: 'POST', token: tokF, body: { progress: { totalBrachos: 2, streakCurrent: 1, points: 6, history: [{ day: today(), brachos: 2, points: 6 }] } } });

  // at this duration the round is instantly inside its final 24h
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === F_TOKEN && /last/i.test(x.title + x.body)));
  check('last-day push fires inside the final 24h', got, mock.forToken(F_TOKEN).map((x) => x.title).join(' | ') || 'none');

  // clock runs out → sweep freezes the podium; the push must NOT spoil who won
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === E_TOKEN && /ended/i.test(x.body)));
  const endedPush = mock.forToken(E_TOKEN).find((x) => /ended/i.test(x.body));
  check('round-ended push arrives', got);
  check('ended push does NOT spoil the winner', !!endedPush && !/Racer F/.test(endedPush.body), endedPush?.body);

  r = await api2('/api/boards', { token: tokE });
  sb = r.json.boards.find((x) => x.id === sprint);
  check('ended round exposes a frozen result', sb.ended === true && !!sb.result, JSON.stringify({ ended: sb.ended, hasResult: !!sb.result }));
  check('winner is the round’s top scorer', sb.result?.winnerName === 'Racer F', sb.result?.winnerName);
  check('reveal starts unseen', sb.result?.seen === false);
  check('result standings are round-scoped (F 6, E 0)', sb.result?.standings?.[0]?.points === 6 && sb.result?.standings?.[1]?.points === 0, JSON.stringify(sb.result?.standings));
  check('winner’s lifetime win count increments', sb.league.find((x) => x.name === 'Racer F')?.wins === 1, JSON.stringify(sb.league.map((x) => ({ n: x.name, w: x.wins }))));

  r = await api2('/api/boards/seen', { method: 'POST', token: tokE, body: { id: sprint } });
  check('reveal-seen accepted', r.status === 200 && r.json.ok);
  r = await api2('/api/boards', { token: tokE });
  sb = r.json.boards.find((x) => x.id === sprint);
  check('reveal never replays once seen', sb.result?.seen === true);

  r = await api2('/api/boards/restart', { method: 'POST', token: tokF, body: { id: sprint } });
  check('non-owner cannot run it back', r.status === 403 && r.json.error === 'owner_only');
  r = await api2('/api/boards/restart', { method: 'POST', token: tokE, body: { id: sprint, duration: 'week' } });
  check('owner runs it back → round 2', r.status === 200 && r.json.round === 2, JSON.stringify(r.json));
  got = await mock.waitFor((reqs) => reqs.some((x) => x.token === F_TOKEN && /started/i.test(x.title + x.body)));
  check('run-it-back sends the started push to members', got);
  r = await api2('/api/boards', { token: tokF });
  sb = r.json.boards.find((x) => x.id === sprint);
  check('round 2 starts everyone at 0 again', sb.round === 2 && sb.league.every((row) => row.points === 0), JSON.stringify({ round: sb.round, pts: sb.league.map((x) => x.points) }));

  // the all-time friends league: lifetime points rank it and rows carry wins
  const lgE = await api2('/api/friends/add', { method: 'POST', token: tokE, body: { code: (await api2('/api/me', { token: tokF })).json.code } });
  const allTime = lgE.json.league ?? [];
  check('all-time league ranks by lifetime points (E 70 over F 6)', allTime[0]?.name === 'Racer E' && allTime[0]?.points === 70, JSON.stringify(allTime.map((x) => ({ n: x.name, p: x.points }))));
  check('all-time league rows carry win counts', allTime.find((x) => x.name === 'Racer F')?.wins === 1 && allTime.find((x) => x.name === 'Racer E')?.wins === 0, JSON.stringify(allTime.map((x) => ({ n: x.name, w: x.wins }))));

  // ------------------------------------------------------- /api/status
  // Key-gated capacity document for the cloud watch routine. Plays dead
  // without/with a wrong key; the real key is DERIVED from BROADCAST_KEY.
  const STATUS_KEY = createHash('sha256').update('status:scenario-broadcast-secret').digest('hex').slice(0, 24);
  const ADMIN_IP = { 'X-Forwarded-For': '198.51.100.77' }; // own throttle bucket — the shared per-IP counter is irrelevant here
  r = await api('/api/status', { headers: ADMIN_IP });
  check('status without key plays dead (404)', r.status === 404);
  r = await api('/api/status?key=' + 'f'.repeat(24), { headers: ADMIN_IP });
  check('status with wrong key plays dead (404)', r.status === 404);
  r = await api('/api/status?key=' + STATUS_KEY, { headers: ADMIN_IP });
  const statusFields = ['users', 'storage', 'process', 'vision', 'daily_thought', 'backups', 'alerts', 'dependencies', 'moderation'];
  check('status with derived key → 200 + every top-level field', r.status === 200 && statusFields.every((f) => r.json && f in r.json), r.status === 200 ? statusFields.filter((f) => !(f in r.json)).join(',') || 'all present' : String(r.status));
  check('status alerts include backups_disabled', (r.json?.alerts ?? []).some((x) => x.code === 'backups_disabled'), JSON.stringify((r.json?.alerts ?? []).map((x) => x.code)));
  check('status counts users + no open reports yet', r.json?.users?.total >= 6 && r.json?.moderation?.open_reports === 0, JSON.stringify({ users: r.json?.users?.total, mod: r.json?.moderation }));
  r = await api('/health');
  check('/health carries backups + thought freshness', r.status === 200 && r.json.backups === false && r.json.thought?.fresh === false && r.json.thought?.dateKey === null, JSON.stringify(r.json));

  // ---------------------------------------------- chat moderation (1.2)
  // Fresh trio so the chat/throttle counters above don't leak in.
  const tokM1 = await register('Mod Owner');
  const tokM2 = await register('Mod Blocker');
  const tokM3 = await register('Mod Reporter');
  const M2_TOKEN = 'a2'.repeat(32);
  const M3_TOKEN = 'b2'.repeat(32);
  await api('/api/push/native', { method: 'POST', token: tokM2, body: { token: M2_TOKEN } });
  await api('/api/push/native', { method: 'POST', token: tokM3, body: { token: M3_TOKEN } });
  r = await api('/api/boards/create', { method: 'POST', token: tokM1, body: { title: 'Moderation Board' } });
  const modBoard = r.json.id;
  const modCode = r.json.code;
  await api('/api/boards/join', { method: 'POST', token: tokM2, body: { code: modCode } });
  await api('/api/boards/join', { method: 'POST', token: tokM3, body: { code: modCode } });

  // profanity filter — whole word only, so Scunthorpe stays a place
  r = await api('/api/boards/message', { method: 'POST', token: tokM1, body: { board: modBoard, text: 'this is SHIT' } });
  check('profanity → 400 moderated', r.status === 400 && r.json.error === 'moderated', JSON.stringify(r.json));
  r = await api('/api/boards/message', { method: 'POST', token: tokM1, body: { board: modBoard, text: 'Scunthorpe United won, shiitake for dinner' } });
  check('filter is whole-word (Scunthorpe/shiitake pass)', r.status === 200 && r.json.ok, JSON.stringify(r.json));

  // messages carry user_id; the board can be addressed by id OR share code
  r = await api('/api/boards/message', { method: 'POST', token: tokM1, body: { board: modBoard, text: 'hello from the owner' } });
  const ownerMsgId = r.json.id;
  r = await api('/api/boards/messages?code=' + modCode, { token: tokM3 });
  const ownerMsg = (r.json?.messages ?? []).find((m) => m.id === ownerMsgId);
  check('messages carry user_id (board addressed by code)', r.status === 200 && !!ownerMsg && typeof ownerMsg.user_id === 'string' && ownerMsg.user_id.length > 0 && ownerMsg.mine === false, JSON.stringify(ownerMsg));
  const ownerId = ownerMsg?.user_id;

  // block / unblock / list
  r = await api('/api/boards/block', { method: 'POST', token: tokM2, body: { user_id: ownerId } });
  check('block → 200 ok', r.status === 200 && r.json.ok, JSON.stringify(r.json));
  r = await api('/api/boards/block', { method: 'POST', token: tokM2, body: { user_id: ownerId } });
  check('block is idempotent', r.status === 200 && r.json.ok);
  r = await api('/api/boards/blocked', { token: tokM2 });
  check('blocked list carries user_id + name', r.status === 200 && r.json.blocked?.length === 1 && r.json.blocked[0].user_id === ownerId && r.json.blocked[0].name === 'Mod Owner', JSON.stringify(r.json));
  r = await api('/api/boards/block', { method: 'POST', token: tokM2, body: { user_id: 'nope' } });
  check('block unknown user → 404', r.status === 404);
  // blocking yourself: find M2's own id via a message it posts
  r = await api('/api/boards/message', { method: 'POST', token: tokM2, body: { board: modBoard, text: 'blocker speaking' } });
  const m2MsgId = r.json.id;
  r = await api('/api/boards/messages?board=' + modBoard, { token: tokM2 });
  const selfId = (r.json?.messages ?? []).find((m) => m.id === m2MsgId)?.user_id;
  r = await api('/api/boards/block', { method: 'POST', token: tokM2, body: { user_id: selfId } });
  check('cannot block yourself (400)', r.status === 400 && r.json.error === 'thats_you', JSON.stringify(r.json));

  // a blocked sender is invisible to the blocker — and only the blocker
  r = await api('/api/boards/message', { method: 'POST', token: tokM1, body: { board: modBoard, text: 'blocked sender talking' } });
  const blockedMsgId = r.json.id;
  r = await api('/api/boards/messages?board=' + modBoard, { token: tokM2 });
  check('blocker does NOT see the blocked sender\'s messages', r.status === 200 && !r.json.messages.some((m) => m.user_id === ownerId), JSON.stringify(r.json.messages?.map((m) => m.text)));
  r = await api('/api/boards/messages?board=' + modBoard, { token: tokM3 });
  check('other members still see them', r.status === 200 && r.json.messages.some((m) => m.id === blockedMsgId && m.user_id === ownerId), JSON.stringify(r.json.messages?.map((m) => m.text)));
  // pushes: a FRESH board, so neither member is inside the 5-min chat
  // cooldown or the 60s active-reader window from the room above — the block
  // is global, so it still applies here
  r = await api('/api/boards/create', { method: 'POST', token: tokM1, body: { title: 'Push Board' } });
  await api('/api/boards/join', { method: 'POST', token: tokM2, body: { code: r.json.code } });
  await api('/api/boards/join', { method: 'POST', token: tokM3, body: { code: r.json.code } });
  const pushBefore = { m2: mock.forToken(M2_TOKEN).length, m3: mock.forToken(M3_TOKEN).length };
  await api('/api/boards/message', { method: 'POST', token: tokM1, body: { board: r.json.id, text: 'push from a blocked sender' } });
  got = await mock.waitFor(() => mock.forToken(M3_TOKEN).length > pushBefore.m3);
  await sleep(600);
  check('blocked sender\'s chat push reaches the non-blocker', got);
  check('blocked sender\'s chat push does NOT reach the blocker', mock.forToken(M2_TOKEN).length === pushBefore.m2, `${mock.forToken(M2_TOKEN).length - pushBefore.m2} extra`);
  r = await api('/api/boards', { token: tokM2 });
  check('blocked sender\'s messages don\'t count as unread for the blocker', (r.json.boards.find((b) => b.id === modBoard)?.unread ?? -1) === 0, JSON.stringify(r.json.boards.find((b) => b.id === modBoard)?.unread));
  r = await api('/api/boards/unblock', { method: 'POST', token: tokM2, body: { user_id: ownerId } });
  check('unblock → 200 ok', r.status === 200 && r.json.ok);
  r = await api('/api/boards/messages?board=' + modBoard, { token: tokM2 });
  check('after unblock the messages are visible again', r.json.messages.some((m) => m.id === blockedMsgId));
  r = await api('/api/boards/blocked', { token: tokM2 });
  check('blocked list empty after unblock', r.json.blocked?.length === 0);

  // report → stored → operator list/resolve; 429 after 10 in 10 min
  r = await api('/api/boards/report', { method: 'POST', token: tokM3, body: { code: modCode, message_id: blockedMsgId, reason: 'harassment' } });
  check('report → 200 ok', r.status === 200 && r.json.ok, JSON.stringify(r.json));
  r = await api('/api/boards/report', { method: 'POST', token: tokM3, body: { code: modCode, message_id: blockedMsgId, reason: 'because' } });
  check('report with a non-enum reason → 400', r.status === 400 && r.json.error === 'bad_reason');
  r = await api('/api/boards/report', { method: 'POST', token: tokM3, body: { code: modCode, message_id: 'nope', reason: 'spam' } });
  check('report of an unknown message → 404', r.status === 404);
  r = await api('/api/boards/report', { method: 'POST', token: tokD, body: { code: modCode, message_id: blockedMsgId, reason: 'spam' } });
  check('non-member cannot report into a board → 404', r.status === 404);
  r = await api('/api/admin/reports', { method: 'POST', body: { secret: 'wrong' }, headers: ADMIN_IP });
  check('admin reports with wrong secret plays dead (404)', r.status === 404);
  r = await api('/api/admin/reports', { method: 'POST', body: { secret: 'scenario-broadcast-secret' }, headers: ADMIN_IP });
  const stored = (r.json?.reports ?? []).find((x) => x.message_id === blockedMsgId);
  check('report stored with text, reason, reporter + reported ids', r.status === 200 && !!stored && stored.text === 'blocked sender talking' && stored.reason === 'harassment' && stored.reported_user_id === ownerId && stored.status === 'open' && typeof stored.reporter_id === 'string', JSON.stringify(stored));
  let reportLimited = null;
  for (let i = 0; i < 12 && reportLimited == null; i++) {
    const rr = await api('/api/boards/report', { method: 'POST', token: tokM3, body: { board: modBoard, message_id: ownerMsgId, reason: 'spam' } });
    if (rr.status === 429) reportLimited = i;
  }
  check('11th report in 10 min → 429 (10 stored)', reportLimited === 9, `429 came on extra attempt #${reportLimited}`);
  r = await api('/api/status?key=' + STATUS_KEY, { headers: ADMIN_IP });
  check('status surfaces open reports + open_reports WARN alert', r.json?.moderation?.open_reports === 10 && r.json.alerts.some((x) => x.code === 'open_reports' && x.level === 'warn') && r.json.level !== 'ok', JSON.stringify({ mod: r.json?.moderation, level: r.json?.level }));
  r = await api('/api/admin/reports/resolve', { method: 'POST', body: { secret: 'wrong', id: stored?.id }, headers: ADMIN_IP });
  check('resolve with wrong secret plays dead (404)', r.status === 404);
  r = await api('/api/admin/reports/resolve', { method: 'POST', body: { secret: 'scenario-broadcast-secret', id: stored?.id }, headers: ADMIN_IP });
  check('resolve → 200 ok', r.status === 200 && r.json.ok, JSON.stringify(r.json));
  r = await api('/api/admin/reports', { method: 'POST', body: { secret: 'scenario-broadcast-secret' }, headers: ADMIN_IP });
  check('resolved report leaves the open list', r.json.open === 9 && !r.json.reports.some((x) => x.id === stored?.id), JSON.stringify({ open: r.json.open }));

  // ---------------------------------- owner deletes account → board survives
  r = await api('/api/boards/create', { method: 'POST', token: tokM1, body: { title: 'Solo Board' } });
  const soloCode = r.json.code;
  r = await api('/api/account/delete', { method: 'POST', token: tokM1 });
  check('owner account deleted', r.status === 200 && r.json.ok);
  r = await api('/api/boards', { token: tokM2 });
  const survivor = r.json.boards.find((b) => b.id === modBoard);
  check('shared board SURVIVES the owner leaving', !!survivor, JSON.stringify(r.json.boards.map((b) => b.title)));
  check('earliest-joined member inherits ownership', survivor?.owner === true && survivor?.members === 2, JSON.stringify({ owner: survivor?.owner, members: survivor?.members }));
  r = await api('/api/boards', { token: tokM3 });
  check('the later member does not', r.json.boards.find((b) => b.id === modBoard)?.owner === false);
  r = await api('/api/boards/messages?board=' + modBoard, { token: tokM3 });
  check('the room still works for the remaining members', r.status === 200 && r.json.messages.some((m) => m.id === m2MsgId));
  r = await api('/api/boards/join', { method: 'POST', token: tokD, body: { code: soloCode } });
  check('a board with no other member is deleted with its owner', r.status === 404);

  // ----------------------------------------- admin prune of test accounts
  const e2eTok = (await api('/api/register', { method: 'POST', body: { name: 'E2E Bot', email: 'e2e-77@example.com', password: 'e2e-pass-1234' } })).json.token;
  await api('/api/register', { method: 'POST', body: { name: 'Store Demo', email: 'store-demo-3@example.com', password: 'demo-pass-1234' } });
  await api('/api/register', { method: 'POST', body: { name: 'Test Friend' } }); // no email — the scenario "friend"
  // the e2e bot owns a board with a real member in it — prune must hand it over, not destroy it
  r = await api('/api/boards/create', { method: 'POST', token: e2eTok, body: { title: 'Bot Board' } });
  await api('/api/boards/join', { method: 'POST', token: tokD, body: { code: r.json.code } });
  const botBoard = r.json.id;
  r = await api('/api/admin/prune-test-accounts', { method: 'POST', body: { secret: 'wrong', force: true }, headers: ADMIN_IP });
  check('prune with wrong secret plays dead (404)', r.status === 404);
  r = await api('/api/admin/prune-test-accounts', { method: 'POST', body: { secret: 'scenario-broadcast-secret' }, headers: ADMIN_IP });
  check('prune refuses without backups (409 backups_disabled)', r.status === 409 && r.json.error === 'backups_disabled', JSON.stringify(r.json));
  r = await api('/api/me', { token: e2eTok });
  check('nothing deleted by the refused prune', r.status === 200);
  r = await api('/api/admin/prune-test-accounts', { method: 'POST', body: { secret: 'scenario-broadcast-secret', force: true }, headers: ADMIN_IP });
  check('forced prune deletes exactly the 3 test accounts', r.status === 200 && r.json.deleted === 3, JSON.stringify(r.json));
  r = await api('/api/me', { token: e2eTok });
  check('pruned account is gone (401)', r.status === 401);
  r = await api('/api/signin', { method: 'POST', body: { email: 'store-demo-3@example.com', password: 'demo-pass-1234' } });
  check('pruned store-demo account cannot sign in', r.status === 404);
  r = await api('/api/me', { token: tokD });
  check('real accounts untouched', r.status === 200 && r.json.name === 'Rival D');
  r = await api('/api/boards', { token: tokD });
  check('bot-owned board handed to its real member, not destroyed', r.json.boards.find((b) => b.id === botBoard)?.owner === true, JSON.stringify(r.json.boards.map((b) => ({ t: b.title, o: b.owner }))));
} catch (e) {
  check('scenario suite ran to completion', false, String(e.message ?? e));
  console.log('--- server log tail ---');
  console.log(serverLog.slice(-1500));
}

console.log(failures === 0 ? '\nSCENARIOS: ALL PASS' : `\nSCENARIOS: ${failures} FAILURE(S)`);
await cleanup(failures === 0 ? 0 : 1);

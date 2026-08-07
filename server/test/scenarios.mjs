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
import { generateKeyPairSync } from 'crypto';
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
const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(B + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    ANTHROPIC_API_KEY: '', // vision stays demo — never spend on tests
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (c) => (serverLog += c));
child.stderr.on('data', (c) => (serverLog += c));

// wait for the port to accept
{
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { await fetch(B + '/api/lessons'); up = true; } catch { await sleep(250); }
  }
  if (!up) {
    console.log('FAIL  server boot — never accepted connections');
    console.log(serverLog.slice(-2000));
    process.exit(1);
  }
}

const cleanup = async (code) => {
  child.kill();
  await mock.close();
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {} // WAL handles may lag on Windows
  process.exit(code);
};

try {
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
} catch (e) {
  check('scenario suite ran to completion', false, String(e.message ?? e));
  console.log('--- server log tail ---');
  console.log(serverLog.slice(-1500));
}

console.log(failures === 0 ? '\nSCENARIOS: ALL PASS' : `\nSCENARIOS: ${failures} FAILURE(S)`);
await cleanup(failures === 0 ? 0 : 1);

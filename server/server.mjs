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
import { createPublicKey, randomBytes, scryptSync, timingSafeEqual, verify as cryptoVerify } from 'crypto';
import { join } from 'path';
import webpush from 'web-push';
import * as store from './store.mjs';

const PORT = Number(process.env.PORT || 3300);
const DATA_DIR = process.env.DATA_DIR || './data';
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
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => {
      d += c;
      if (d.length > 12 * 1024 * 1024) {
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
/** Top rows of a board, with the caller's own row kept even if far down.
 *  Friend codes are stripped: a board code is shareable, so shipping every
 *  member's personal code would let any joiner friend them all unilaterally. */
const standings = (me, members) => {
  const rows = leagueRows(me, members);
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
const throttled = (req, max = 30) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '?';
  const now = Date.now();
  const e = authHits.get(ip);
  if (!e || now - e.t0 > 600_000) {
    authHits.set(ip, { t0: now, count: 1 });
    return false;
  }
  e.count++;
  return e.count > max;
};
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
const sendPush = (user, title, body) => {
  const sub = user?.push?.subscription;
  if (!sub) return;
  webpush
    .sendNotification(sub, JSON.stringify({ title, body }), { timeout: 5000 })
    .catch((e) => {
      if (e.statusCode === 404 || e.statusCode === 410) store.setPush(user.id, null); // expired
    });
};

/** New chat message → nudge the other members (≤1 chat push / 45min / board). */
const notifyBoardChat = (board, sender, text) => {
  for (const member of store.boardMembers(board.id)) {
    if (member.id === sender.id || !member.push?.subscription) continue;
    if (!pushAllowed('chat', member.id, board.id, 45 * 60_000)) continue;
    sendPush(member, `💬 ${board.title}`, `${sender.name}: ${text.slice(0, 90)}`);
  }
};

/** My week-points rose oldWeek → newWeek: everyone I just passed (in the
 *  friends league or any shared board) gets a competitive nudge. */
const notifyOvertaken = (me, oldWeek, newWeek) => {
  const peers = new Map();
  for (const f of store.friendsOf(me.id)) peers.set(f.id, f);
  for (const b of store.boardsOf(me.id))
    for (const m of store.boardMembers(b.id)) peers.set(m.id, m);
  peers.delete(me.id);
  for (const peer of peers.values()) {
    if (!peer.push?.subscription) continue;
    const pw = weekTotal(peer, 'points');
    if (!(oldWeek < pw && pw <= newWeek)) continue; // strictly passed this sync
    if (!pushAllowed('overtake', peer.id, me.id, 2 * 60 * 60_000)) continue;
    sendPush(
      peer,
      '🏆 You’ve been passed!',
      `${me.name} just moved ahead of you — ${newWeek} pts this week. Say a bracha to take it back!`,
    );
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
const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password).slice(0, 200), salt, 64).toString('hex');
  return { salt, hash };
};
const checkPassword = (password, pass) => {
  if (!pass?.salt || !pass?.hash) return false;
  const candidate = scryptSync(String(password).slice(0, 200), pass.salt, 64);
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
      you: u.id === me.id,
    }))
    .sort(
      (a, b) =>
        b.weekPoints - a.weekPoints || b.weekBrachos - a.weekBrachos || b.totalBrachos - a.totalBrachos,
    );

const leagueFor = (me) => leagueRows(me, [me, ...store.friendsOf(me.id)]);

const weekTotal = (u, field = 'brachos') => {
  const hist = u.progress?.history ?? [];
  const cutoff = Date.now() - 7 * 86_400_000;
  return hist.filter((h) => new Date(h.day).getTime() >= cutoff).reduce((s, h) => s + (h[field] ?? 0), 0);
};
const dayTotal = (u, field = 'points') => {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hist = u.progress?.history ?? [];
  return hist.filter((h) => h.day === today).reduce((s, h) => s + (h[field] ?? 0), 0);
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
        pass = hashPassword(String(password).slice(0, 200));
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
        const u = store.userByEmail(mail);
        if (!u) return json(res, 404, { error: 'no_match' });
        if (!u.pass) return json(res, 403, { error: 'no_password' }); // account predates passwords
        if (!checkPassword(password, u.pass)) return json(res, 404, { error: 'no_match' });
        return json(res, 200, { token: store.issueToken(u.id), code: u.code, name: u.name, email: u.email });
      }
      // Friend-code sign-in is ONLY for accounts that predate passwords. The
      // code is a PUBLISHED invite identifier (it ships in invite texts), so
      // it must never unlock an account that has a real password.
      const c = normalizeCode(code);
      const u = store.userByEmail(mail);
      if (!u || u.code !== c) return json(res, 404, { error: 'no_match' });
      if (u.pass) return json(res, 403, { error: 'use_password' });
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

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      // Vision costs real money per call: require a token, cap per-account
      // daily use, and cap global concurrency so one client can't OOM the box.
      const who = auth(req);
      if (!who) return json(res, 401, { error: 'unauthorized' });
      if (analyzeInFlight >= ANALYZE_MAX_INFLIGHT) return json(res, 429, { error: 'busy' });
      const today = new Date().toISOString().slice(0, 10);
      const use = analyzeUse.get(who.user.id);
      if (use?.day === today && use.count >= ANALYZE_MAX_PER_DAY)
        return json(res, 429, { error: 'daily_limit' });
      const body = await readBody(req);
      if (!body.image) return json(res, 400, { error: 'no_image' });
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
      const oldWeek = weekTotal(a.user, 'points');
      if (progress)
        store.setProgress(a.user.id, {
          totalBrachos: progress.totalBrachos ?? 0,
          streakCurrent: progress.streakCurrent ?? 0,
          points: progress.points ?? 0,
          history: (progress.history ?? []).slice(-30),
        });
      if (name) store.setName(a.user.id, String(name).trim().slice(0, 20));
      const me = store.userById(a.user.id);
      const newWeek = weekTotal(me, 'points');
      if (newWeek > oldWeek) notifyOvertaken(me, oldWeek, newWeek);
      return json(res, 200, { league: leagueFor(me), code: me.code, email: me.email ?? null });
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
      if (a.user.pass && !checkPassword(current ?? '', a.user.pass)) return json(res, 403, { error: 'wrong_password' });
      store.setPassword(a.user.id, hashPassword(String(password).slice(0, 200)));
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
      const other = raw.includes('@') ? store.userByEmail(raw) : store.userByCode(normalizeCode(raw));
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
      const boards = store.boardsOf(me.id).map((b) => {
        const members = store.boardMembers(b.id);
        return {
          id: b.id,
          code: b.code,
          title: b.title,
          owner: b.owner_id === me.id,
          members: members.length,
          league: standings(me, members),
          unread: store.boardUnread(b.id, me.id),
        };
      });
      return json(res, 200, { boards });
    }

    if (url.pathname === '/api/boards/create' && req.method === 'POST') {
      const { title } = await readBody(req);
      const clean = String(title || '').trim().slice(0, 40);
      if (!clean) return json(res, 400, { error: 'title_required' });
      if (store.boardsOf(a.user.id).filter((b) => b.owner_id === a.user.id).length >= MAX_BOARDS_PER_USER)
        return json(res, 400, { error: 'too_many_boards' });
      const b = store.createBoard(a.user.id, clean);
      return json(res, 200, { id: b.id, code: b.code, title: clean });
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
      store.joinBoard(board.id, a.user.id);
      const me = store.userById(a.user.id);
      return json(res, 200, {
        id: board.id,
        code: board.code,
        title: board.title,
        league: standings(me, store.boardMembers(board.id)),
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

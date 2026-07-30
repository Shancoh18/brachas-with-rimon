/**
 * Brachas with Rimon — backend (Railway).
 * Accounts (friend-code model, no passwords/emails), friend leagues,
 * Web-Push mealtime reminders, and the Claude vision proxy.
 *
 * Design rules (mirrors the app's CLAUDE.md):
 *  - Claude ONLY identifies foods and maps them to database keys (enum-forced
 *    tool schema); all halachic logic stays in the client.
 *  - ANTHROPIC_API_KEY lives ONLY here (Railway variable). Without it,
 *    /api/analyze returns 503 and the client falls back to demo mode.
 *  - Storage: JSON on the Railway volume (DATA_DIR). Small-scale by design.
 */
import { createServer } from 'http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';
import webpush from 'web-push';

const PORT = Number(process.env.PORT || 3300);
const DATA_DIR = process.env.DATA_DIR || './data';
mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = join(DATA_DIR, 'users.json');
const VAPID_FILE = join(DATA_DIR, 'vapid.json');

// ------------------------------------------------------------------ storage
/** token -> user record */
let users = existsSync(USERS_FILE) ? JSON.parse(readFileSync(USERS_FILE, 'utf8')) : {};
const save = () => writeFileSync(USERS_FILE, JSON.stringify(users));

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
      if (d.length > 12 * 1024 * 1024) reject(new Error('too large'));
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
  return users[t] ? { token: t, user: users[t] } : null;
};
const friendCode = () => {
  // human-friendly: RIMON-XXXX
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[randomBytes(1)[0] % chars.length];
  return `RIMON-${c}`;
};

const leagueFor = (me) => {
  const rows = [me, ...me.friends.map((code) => Object.values(users).find((u) => u.code === code)).filter(Boolean)];
  return rows
    .map((u) => ({
      name: u.name,
      code: u.code,
      totalBrachos: u.progress?.totalBrachos ?? 0,
      weekBrachos: weekTotal(u),
      streak: u.progress?.streakCurrent ?? 0,
      you: u.code === me.code,
    }))
    .sort((a, b) => b.weekBrachos - a.weekBrachos || b.totalBrachos - a.totalBrachos);
};
const weekTotal = (u) => {
  const hist = u.progress?.history ?? [];
  const cutoff = Date.now() - 7 * 86_400_000;
  return hist.filter((h) => new Date(h.day).getTime() >= cutoff).reduce((s, h) => s + h.brachos, 0);
};

// --------------------------------------------------------- Claude vision
// FOOD_DATABASE_KEYS baked at deploy time (foods-keys.json is generated from
// src/data/foods.ts by the deploy script — single source of truth).
const FOOD_KEYS = JSON.parse(readFileSync(join(import.meta.dirname, 'foods-keys.json'), 'utf8'));

const SYSTEM_PROMPT = `You are the food-identification engine for a Jewish blessings (bracha) app.
You will receive a photo of a meal. Identify each distinct edible item.
You MUST map every item to exactly one canonical key from the provided
FOOD_DATABASE_KEYS list. Never invent a food name outside this list; if an
item is not in the list, return it under "unmatched" with your best plain
description. Do not guess the blessing yourself — only identify and map.
Return ONLY the structured tool output. Distinguish preparation state where
visible (raw vs cooked, whole vs cut) since it can change the mapping.

FOOD_DATABASE_KEYS: ${FOOD_KEYS.join(', ')}`;

const TOOL = {
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
            db_key: { type: 'string', enum: FOOD_KEYS },
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
};

async function analyze(body) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { code: 503, body: { error: 'no_api_key' } };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
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
  return { code: 200, body: toolUse.input };
}

// ------------------------------------------------------- reminder scheduler
// Client sends tzOffsetMinutes (Date.getTimezoneOffset()) + "HH:MM" times.
const firedToday = new Map(); // token -> "YYYY-MM-DD-HH:MM"
setInterval(async () => {
  const now = Date.now();
  for (const [token, u] of Object.entries(users)) {
    const p = u.push;
    if (!p?.subscription || !p.times?.length) continue;
    const local = new Date(now - (p.tzOffsetMinutes ?? 0) * 60_000);
    const hhmm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
    if (!p.times.includes(hhmm)) continue;
    const stamp = `${local.toISOString().slice(0, 10)}-${hhmm}`;
    if (firedToday.get(token) === stamp) continue;
    firedToday.set(token, stamp);
    try {
      await webpush.sendNotification(
        p.subscription,
        JSON.stringify({
          title: 'Rimon here 🍎',
          body: `Eating soon, ${u.name}? Ten seconds for the bracha first — your streak is waiting.`,
        }),
      );
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        delete u.push.subscription; // expired subscription
        save();
      }
    }
  }
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

    if (url.pathname === '/health') return json(res, 200, { ok: true, users: Object.keys(users).length, vision: !!process.env.ANTHROPIC_API_KEY });

    if (url.pathname === '/api/register' && req.method === 'POST') {
      const { name } = await readBody(req);
      if (!name || String(name).trim().length < 1) return json(res, 400, { error: 'name_required' });
      const token = randomBytes(24).toString('hex');
      let code = friendCode();
      while (Object.values(users).some((u) => u.code === code)) code = friendCode();
      users[token] = { name: String(name).trim().slice(0, 20), code, friends: [], progress: null, push: null, created: Date.now() };
      save();
      return json(res, 200, { token, code });
    }

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.image) return json(res, 400, { error: 'no_image' });
      const out = await analyze(body);
      return json(res, out.code, out.body);
    }

    // ------- authed routes
    const a = auth(req);
    if (!a) return json(res, 401, { error: 'unauthorized' });

    if (url.pathname === '/api/sync' && req.method === 'POST') {
      const { progress, name } = await readBody(req);
      if (progress) a.user.progress = { totalBrachos: progress.totalBrachos ?? 0, streakCurrent: progress.streakCurrent ?? 0, history: (progress.history ?? []).slice(-30) };
      if (name) a.user.name = String(name).trim().slice(0, 20);
      save();
      return json(res, 200, { league: leagueFor(a.user), code: a.user.code });
    }

    if (url.pathname === '/api/league') return json(res, 200, { league: leagueFor(a.user), code: a.user.code });

    if (url.pathname === '/api/friends/add' && req.method === 'POST') {
      const { code } = await readBody(req);
      const norm = String(code || '').trim().toUpperCase();
      const other = Object.values(users).find((u) => u.code === norm);
      if (!other) return json(res, 404, { error: 'code_not_found' });
      if (other.code === a.user.code) return json(res, 400, { error: 'thats_you' });
      if (!a.user.friends.includes(other.code)) a.user.friends.push(other.code);
      if (!other.friends.includes(a.user.code)) other.friends.push(a.user.code); // mutual
      save();
      return json(res, 200, { league: leagueFor(a.user), added: other.name });
    }

    if (url.pathname === '/api/push/key') return json(res, 200, { key: vapid.publicKey });

    if (url.pathname === '/api/push/subscribe' && req.method === 'POST') {
      const { subscription, times, tzOffsetMinutes } = await readBody(req);
      a.user.push = subscription ? { subscription, times: (times ?? []).slice(0, 6), tzOffsetMinutes: tzOffsetMinutes ?? 0 } : null;
      save();
      return json(res, 200, { ok: true, enabled: !!subscription });
    }

    return json(res, 404, { error: 'not_found' });
  } catch (e) {
    return json(res, 500, { error: 'server_error', detail: String(e.message).slice(0, 200) });
  }
});

server.listen(PORT, () => console.log(`brachas-rimon-api on :${PORT} — vision ${process.env.ANTHROPIC_API_KEY ? 'LIVE' : 'demo (no ANTHROPIC_API_KEY)'}`));

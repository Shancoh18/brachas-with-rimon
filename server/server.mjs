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
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { createPublicKey, randomBytes, scryptSync, timingSafeEqual, verify as cryptoVerify } from 'crypto';
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
  return users[t] ? { token: t, user: users[t] } : null;
};
const friendCode = () => {
  // human-friendly: RIMON-XXXX
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[randomBytes(1)[0] % chars.length];
  return `RIMON-${c}`;
};

// ------------------------------------------------------------ auth (passwords)
// scrypt with a per-user salt; stored as { salt, hash } hex pair.
const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
};
const checkPassword = (password, pass) => {
  if (!pass?.salt || !pass?.hash) return false;
  const candidate = scryptSync(String(password), pass.salt, 64);
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
  const store = JWKS[provider];
  if (!store.keys || Date.now() - store.fetched > 3_600_000 || !store.keys.find((k) => k.kid === kid)) {
    const r = await fetch(store.url);
    if (!r.ok) throw new Error(`jwks ${r.status}`);
    store.keys = (await r.json()).keys ?? [];
    store.fetched = Date.now();
  }
  return store.keys.find((k) => k.kid === kid) ?? null;
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
// src/data/foods.ts by the deploy script — single source of truth) — PLUS
// entries the research pipeline has learned at runtime (LEARNED_FILE).
const FOOD_KEYS = JSON.parse(readFileSync(join(import.meta.dirname, 'foods-keys.json'), 'utf8'));

// ------------------------------------------- learned foods (self-growing DB)
// When vision reports a food with no database match, researchFood() derives
// its entry FROM THE THREE APPROVED SITES ONLY (web_search hard-limited via
// allowed_domains — the halachic rule still never comes from the model's own
// head) and persists it here. Entries carry the citing URL.
const LEARNED_FILE = join(DATA_DIR, 'learned-foods.json');
const LEARNED_MAX = 500; // hard cap — the enum/system-prompt grows with every entry
let learnedFoods = [];
try {
  if (existsSync(LEARNED_FILE)) learnedFoods = JSON.parse(readFileSync(LEARNED_FILE, 'utf8'));
} catch (err) {
  // A write cut off mid-deploy must never crash-loop the whole API.
  console.error(`learned-foods.json unreadable (${err.message}) — starting empty`);
  learnedFoods = [];
}
const saveLearned = () => {
  // atomic: tmp + rename so a SIGTERM mid-write can't truncate the file
  const tmp = LEARNED_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(learnedFoods, null, 1));
  renameSync(tmp, LEARNED_FILE);
};
const allFoodKeys = () => [...FOOD_KEYS, ...learnedFoods.map((e) => e.key)];

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
        if (entry && learnedFoods.length < LEARNED_MAX && !allFoodKeys().includes(entry.key)) {
          learnedFoods.push(entry);
          saveLearned();
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
      const { name, email, password } = await readBody(req);
      if (!name || String(name).trim().length < 1) return json(res, 400, { error: 'name_required' });
      let mail = null;
      if (email != null && String(email).trim() !== '') {
        mail = String(email).trim().toLowerCase().slice(0, 254);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return json(res, 400, { error: 'email_invalid' });
        if (Object.values(users).some((u) => u.email === mail)) return json(res, 409, { error: 'email_taken' });
      }
      let pass = null;
      if (password != null && String(password) !== '') {
        if (String(password).length < PASSWORD_MIN) return json(res, 400, { error: 'password_short' });
        pass = hashPassword(String(password).slice(0, 200));
      }
      const token = randomBytes(24).toString('hex');
      let code = friendCode();
      while (Object.values(users).some((u) => u.code === code)) code = friendCode();
      users[token] = { name: String(name).trim().slice(0, 20), email: mail, pass, code, friends: [], progress: null, push: null, created: Date.now() };
      save();
      return json(res, 200, { token, code, email: mail });
    }

    // Sign in on a new device. Two key pairs are accepted:
    //   email + password       (accounts that set one)
    //   email + friend code    (legacy no-password accounts — still valid)
    if (url.pathname === '/api/signin' && req.method === 'POST') {
      const { email, code, password } = await readBody(req);
      const mail = String(email || '').trim().toLowerCase();
      if (password != null && String(password) !== '') {
        const entry = Object.entries(users).find(([, u]) => u.email === mail);
        if (!entry) return json(res, 404, { error: 'no_match' });
        if (!entry[1].pass) return json(res, 403, { error: 'no_password' }); // account predates passwords
        if (!checkPassword(password, entry[1].pass)) return json(res, 404, { error: 'no_match' });
        return json(res, 200, { token: entry[0], code: entry[1].code, name: entry[1].name, email: entry[1].email });
      }
      const c = String(code || '').trim().toUpperCase();
      const entry = Object.entries(users).find(([, u]) => u.email === mail && u.code === c);
      if (!entry) return json(res, 404, { error: 'no_match' });
      return json(res, 200, { token: entry[0], code: entry[1].code, name: entry[1].name, email: entry[1].email });
    }

    // Sign in with Apple / Google: the client sends the provider's identity
    // token; we verify signature + iss/aud/exp against the provider JWKS.
    // Links by provider sub first, then by verified email; creates otherwise.
    if (url.pathname === '/api/oauth' && req.method === 'POST') {
      const { provider, idToken, name } = await readBody(req);
      if (provider !== 'apple' && provider !== 'google') return json(res, 400, { error: 'bad_provider' });
      if (provider === 'google' && !GOOGLE_AUDS.length) return json(res, 501, { error: 'google_not_configured' });
      const payload = await verifyIdToken(provider, idToken);
      if (!payload?.sub) return json(res, 401, { error: 'token_invalid' });
      const sub = String(payload.sub);
      const mail = payload.email ? String(payload.email).toLowerCase() : null;

      let entry = Object.entries(users).find(([, u]) => u[provider] === sub);
      if (!entry && mail) {
        entry = Object.entries(users).find(([, u]) => u.email === mail);
        if (entry) entry[1][provider] = sub; // link provider to the existing account
      }
      if (!entry) {
        const token = randomBytes(24).toString('hex');
        let code = friendCode();
        while (Object.values(users).some((u) => u.code === code)) code = friendCode();
        const displayName = String(name || (mail ? mail.split('@')[0] : 'Friend')).trim().slice(0, 20) || 'Friend';
        users[token] = { name: displayName, email: mail, [provider]: sub, pass: null, code, friends: [], progress: null, push: null, created: Date.now() };
        entry = [token, users[token]];
      } else if (mail && !entry[1].email && !Object.values(users).some((u) => u.email === mail)) {
        entry[1].email = mail; // provider-verified email fills an empty slot
      }
      save();
      return json(res, 200, { token: entry[0], code: entry[1].code, name: entry[1].name, email: entry[1].email ?? null });
    }

    if (url.pathname === '/api/foods/learned' && req.method === 'GET')
      return json(res, 200, { entries: learnedFoods });

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
      return json(res, 200, { league: leagueFor(a.user), code: a.user.code, email: a.user.email ?? null });
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
        a.user.name = n;
      }
      if (email != null) {
        const mail = String(email).trim().toLowerCase().slice(0, 254);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return json(res, 400, { error: 'email_invalid' });
        const taken = Object.entries(users).some(([t, u]) => u.email === mail && t !== a.token);
        if (taken) return json(res, 409, { error: 'email_taken' });
        a.user.email = mail;
      }
      save();
      return json(res, 200, { name: a.user.name, email: a.user.email ?? null, code: a.user.code });
    }

    // Set or change the account password. Requires the current password only
    // when one already exists (legacy accounts set their first one freely).
    if (url.pathname === '/api/account/password' && req.method === 'POST') {
      const { password, current } = await readBody(req);
      if (!password || String(password).length < PASSWORD_MIN) return json(res, 400, { error: 'password_short' });
      if (a.user.pass && !checkPassword(current ?? '', a.user.pass)) return json(res, 403, { error: 'wrong_password' });
      a.user.pass = hashPassword(String(password).slice(0, 200));
      save();
      return json(res, 200, { ok: true });
    }

    // Full account deletion (App Store guideline 5.1.1(v)): removes the user
    // and unlinks them from every friend list. Irreversible.
    if (url.pathname === '/api/account/delete' && req.method === 'POST') {
      const gone = a.user.code;
      delete users[a.token];
      for (const u of Object.values(users)) {
        u.friends = (u.friends ?? []).filter((c) => c !== gone);
      }
      save();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/league') return json(res, 200, { league: leagueFor(a.user), code: a.user.code });

    if (url.pathname === '/api/friends/add' && req.method === 'POST') {
      const { code } = await readBody(req);
      const raw = String(code || '').trim();
      const other = raw.includes('@')
        ? Object.values(users).find((u) => u.email === raw.toLowerCase())
        : Object.values(users).find((u) => u.code === raw.toUpperCase());
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

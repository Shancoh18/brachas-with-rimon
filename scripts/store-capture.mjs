/**
 * App Store asset capture — REAL UI, pixel-exact, from the deployed PWA.
 *
 *   node scripts/store-capture.mjs --out=<dir> [--w=440 --h=956 --dpr=3] [--video]
 *
 * Default viewport 440×956 @3x = 1320×2868 (6.9" iPhone screenshots).
 * 6.5": --w=428 --h=926 --dpr=3 → 1284×2778.  App preview: --video --w=443 --h=960 --dpr=2 → 886×1920.
 *
 * It creates a throwaway demo account on the live API (like scripts/e2e.mjs),
 * seeds a rich-but-plausible progress state (12-day streak, badges, points) so
 * the Journey/Home screens look lived-in, then walks every screen and saves
 * PNGs. --video records a scripted ~28s walkthrough to raw.webm (puppeteer
 * screencast; needs ffmpeg on PATH) for the App Preview composite.
 * The demo account is deleted at the end (POST /api/account/delete).
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const VIDEO = process.argv.includes('--video');
const W = Number(arg('w', 440));
const H = Number(arg('h', 956));
const DPR = Number(arg('dpr', 3));
const OUT = arg('out', 'store-assets');
const URL = 'https://shancoh18.github.io/brachas-with-rimon/';
const API = 'https://brachas-rimon-api-production-46ae.up.railway.app';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--force-device-scale-factor=' + DPR],
});
const page = await browser.newPage();
await browser.defaultBrowserContext().overridePermissions('https://shancoh18.github.io', ['notifications']);
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = async (txt, wait = 900) => {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t));
    if (b) b.click();
    return !!b;
  }, txt);
  if (!ok) console.warn(`  (no button "${txt}")`);
  await sleep(wait);
  return ok;
};
const clickNav = async (i, wait = 1100) => {
  await page.evaluate((n) => document.querySelectorAll('nav button')[n]?.click(), i);
  await sleep(wait);
};
let n = 0;
const shot = async (name, wait = 500) => {
  await sleep(wait);
  const file = join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, type: 'png' });
  console.log(`shot ${file}`);
};
const scrollTop = () => page.evaluate(() => window.scrollTo(0, 0));

// -------------------------------------------------------------------- start
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90_000 });
await sleep(2500);

let recorder = null;
if (VIDEO) {
  recorder = await page.screencast({ path: join(OUT, 'raw.webm') });
  console.log('recording…');
}

// ------------------------------------------------------------- ONBOARDING
if (!VIDEO) {
  await shot('onboard-1-hello', 1400);
  await clickText('Nice to meet you', 1200);
  await shot('onboard-2-photo');
  await clickText('Next', 1200);
  await shot('onboard-3-walk');
  await clickText('Next', 1200);
  await shot('onboard-4-bite');
  await clickText('Next', 900);
  await clickText('Next', 900);
} else {
  await clickText('Nice to meet you', 300);
  await clickText('Next', 300);
  await clickText('Next', 300);
  await clickText('Next', 300);
  await clickText('Next', 300);
}
await clickText('continue to sign-in', 1200);

// -------------------------------------------------- ACCOUNT (throwaway demo)
const email = `store-demo-${Math.floor(Math.random() * 1e9)}@example.com`;
const PASS = 'store-demo-pass-2026';
await page.type('input[placeholder="e.g. Shan"]', 'Rimon Demo');
await page.type('input[placeholder="you@example.com"]', email);
await page.type('input[placeholder="8+ characters"]', PASS);
await clickText('Create my account', 3000);
const token = await page.evaluate(() => JSON.parse(localStorage.getItem('brachas-with-rimon')).state.serverToken);
if (!token) throw new Error('account creation failed (no token)');

// ------------------------------------------------- SEED a lived-in profile
const lessonIds = [...readFileSync('src/data/learn.ts', 'utf8').matchAll(/^\s*id:\s*'([^']+)'/gm)].map((m) => m[1]);
const today = new Date();
const stamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const history = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  const brachos = 3 + ((i * 7) % 4);
  history.push({ day: stamp(d), brachos, points: brachos * 2 + (i % 2 ? 10 : 30) });
}
const progress = {
  totalBrachos: 148,
  byBracha: { Hamotzi: 31, Mezonos: 27, Hagafen: 12, Haetz: 24, Haadama: 29, Shehakol: 25 },
  mealsCompleted: 63,
  sevenSpeciesBlessed: 9,
  streakCurrent: 12,
  streakBest: 12,
  lastActiveDay: stamp(today),
  history,
  lessonsRead: lessonIds.slice(0, 4),
  points: 640,
};
const dayStats = {
  day: stamp(today),
  brachos: 4,
  byBracha: { Hamotzi: 1, Haetz: 1, Haadama: 1, Shehakol: 1 },
  foodKeys: ['apple', 'carrot'],
  mealsWithAfter: 1,
  photoFlows: 1,
  lessonsRead: 0,
  challengesDone: [],
};
await page.evaluate(
  (p, d) => {
    const raw = JSON.parse(localStorage.getItem('brachas-with-rimon'));
    raw.state.progress = p;
    raw.state.dayStats = d;
    raw.state.reminders = { enabled: true, times: ['07:30', '12:30', '18:30'], configured: true };
    localStorage.setItem('brachas-with-rimon', JSON.stringify(raw));
  },
  progress,
  dayStats,
);
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2200);

// ------------------------------------------------------------------ SHOTS
if (!VIDEO) {
  await scrollTop();
  await shot('home', 1200);

  // Learn: daily thought + parsha + library
  await clickNav(1);
  await shot('learn', 1200);
  await page.evaluate(() => document.querySelector('[data-daily-thought]')?.click());
  await sleep(1100);
  await shot('learn-daily-thought');
  await clickText('← back to Learn', 900);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Daily Torah'))?.click());
  await sleep(1100);
  await shot('learn-parsha');
  await clickText('← back', 700);

  // Journey: streak / points / badges
  await clickNav(2);
  await shot('journey', 1200);
  await page.evaluate(() => window.scrollTo(0, 620));
  await shot('journey-badges', 700);

  // Friends: league + boards
  await clickNav(3);
  await shot('friends', 1500);

  // Account
  await clickNav(5);
  await shot('account', 1000);

  // Bless: quick guide + Birkat Hamazon
  await clickNav(0);
  await clickText('Quick blessing guide', 1300);
  await shot('reference');
  await clickText('Hamotzi', 900);
  await shot('reference-hamotzi');
  await clickText('← home', 900);
  await clickText('Birkat Hamazon', 1300);
  await shot('benching');
  await clickText('← home', 900);
}

// ---------------------------------------------------- MEAL FLOW (both modes)
const addFood = async ({ q, pick }, typeDelay = 0) => {
  const ready = await page.evaluate(() => !!document.querySelector('input[placeholder="Search foods — English or עברית"]'));
  if (!ready) await clickText('+ add a food', 700);
  await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder="Search foods — English or עברית"]');
    if (inp) {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value').set.call(inp, '');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.type('input[placeholder="Search foods — English or עברית"]', q, { delay: typeDelay });
  await sleep(VIDEO ? 900 : 650);
  const picked = await page.evaluate((label) => {
    const li = [...document.querySelectorAll('li button')].find(
      (b) => (b.childNodes[0]?.textContent ?? '').trim().toLowerCase() === label,
    );
    if (li) li.click();
    return !!li;
  }, pick);
  await sleep(VIDEO ? 700 : 500);
  return picked;
};

await scrollTop();
if (VIDEO) await sleep(2600); // hold the home screen
await clickText('Add it manually', 1300);
if (!VIDEO) {
  await page.type('input[placeholder="Search foods — English or עברית"]', 'ban');
  await sleep(700);
  await shot('manual-search');
  await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder="Search foods — English or עברית"]');
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value').set.call(inp, '');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const MEAL = VIDEO
  ? [
      { q: 'apple', pick: 'apple' },
      { q: 'grape juice', pick: 'grape juice' },
      { q: 'challah', pick: 'challah' },
    ]
  : [
      { q: 'chocolate cake', pick: 'cake' },
      { q: 'grape juice', pick: 'grape juice' },
      { q: 'medjool', pick: 'date' },
      { q: 'green apple', pick: 'apple' },
      { q: 'baby carrot', pick: 'carrot' },
    ];
for (const item of MEAL) await addFood(item, VIDEO ? 55 : 0);
await scrollTop();
if (!VIDEO) await shot('confirm', 900);
else await sleep(1600);

await clickText('Guide me through', 1500);
await scrollTop();
if (!VIDEO) {
  await shot('guide', 900);
  await page.evaluate(() => document.querySelector('[data-why]')?.click());
  await sleep(900);
  await shot('guide-why');
  await page.evaluate(() => document.querySelector('[data-why]')?.click());
  await sleep(400);
} else {
  await sleep(2600);
}
// walk the blessings
for (let i = 0; i < 8; i++) {
  const finished = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('finish the meal')));
  if (finished) break;
  await clickText('I said this blessing', VIDEO ? 1500 : 900);
}
await clickText('finish the meal', 1500);
if (!VIDEO) await shot('after-savor', 800);
else await sleep(1200);
await clickText('done eating', 1300);
if (!VIDEO) await shot('after-shiur', 600);
await clickText('Show my after-blessings', 1600);
await scrollTop();
if (!VIDEO) await shot('after', 900);
else await sleep(2600);
await clickText('Finish meal', 1900);
if (!VIDEO) await shot('celebration', 900);
else await sleep(2600);
// dismiss any takeover
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /continue|keep going|done|close|home|nice/i.test(x.textContent));
  b?.click();
});
await sleep(1000);

if (VIDEO) {
  await clickNav(2, 1400);
  await sleep(2400);
  await clickNav(1, 1400);
  await sleep(2600);
  await clickNav(0, 1200);
  await sleep(1500);
  await recorder.stop();
  console.log('recording stopped');
}

// ------------------------------------------------------------- CLEANUP
try {
  const r = await fetch(`${API}/api/account/delete`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
  console.log(`demo account deleted: HTTP ${r.status}`);
} catch (e) {
  console.warn('demo account delete failed:', e.message);
}
await browser.close();
console.log('done');

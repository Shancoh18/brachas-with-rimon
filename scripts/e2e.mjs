/**
 * End-to-end debug of the DEPLOYED Brachas with Rimon.
 * Asserts every feature; prints PASS/FAIL lines; exits 1 on any FAIL.
 */
import puppeteer from 'puppeteer-core';

const URL = 'https://shancoh18.github.io/brachas-with-rimon/';
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = async (txt, wait = 1200) => {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t));
    if (b) b.click();
    return !!b;
  }, txt);
  await sleep(wait);
  return ok;
};
const text = async () => (await page.evaluate(() => document.body.innerText)).toLowerCase();

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60_000 });
await sleep(2500);

// ---------------------------------------------------------------- WELCOME
let t = await text();
check('welcome renders title', t.includes('brachas with rimon'));
check('nusach selector present', t.includes('ashkenaz') && t.includes('edot hamizrach'));
check('disclaimer present', t.includes('consult a qualified rabbi'));
check('tip of the day present', t.includes('tip of the day') || t.includes('tip of the day') || /TIP OF THE DAY/i.test(t));

// mascot asset actually renders (video or img with natural size)
const mascotOk = await page.evaluate(async () => {
  const v = document.querySelector('video');
  const img = document.querySelector('img[src*="mascot"]');
  if (v) return v.readyState >= 2 || v.videoWidth > 0 || !!v.poster;
  if (img) return img.naturalWidth > 0;
  return false;
});
check('Rimon asset loads', mascotOk);

// service worker registered
await sleep(1500);
const swCount = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
check('service worker registered', swCount > 0, `${swCount} registration(s)`);

// demo-button not covered by the tab bar (hit-test at its center)
const demoCovered = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('demo meal'));
  if (!b) return 'missing';
  const r = b.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return b.contains(el) || el === b ? 'clear' : 'covered';
});
check('demo button tap-target clear of tab bar', demoCovered === 'clear', demoCovered);

// nusach switching persists
await clickText('Ashkenaz', 600);
const nusachStored = await page.evaluate(() => JSON.parse(localStorage.getItem('brachas-with-rimon')).state.nusach);
check('nusach switch persists', nusachStored === 'ashkenaz', nusachStored);
await clickText('Nusach Ari', 600);

// ---------------------------------------------------------------- CONFIRM
await clickText('demo meal', 1600);
t = await text();
check('confirm shows all 6 demo items', ['chocolate cake', 'grape juice', 'medjool dates', 'apple slices', 'baby carrots', 'grilled chicken'].every((x) => t.includes(x)));
check('Seven Species chip on dates', t.includes('seven species'));

// remove chicken (card-scoped: walk up from each remove button)
await page.evaluate(() => {
  for (const btn of [...document.querySelectorAll('button[title="remove"]')]) {
    let up = btn, depth = 0;
    while (up && depth < 8) {
      if (String(up.className).includes('rounded-') && up.textContent.includes('Grilled chicken')) { btn.click(); return; }
      up = up.parentElement; depth++;
    }
  }
});
await sleep(700);
t = await text();
check('remove item works', !t.includes('grilled chicken'));

// add cucumber from the database, then set state=cooked → Shehakol override
await clickText('+ add a food', 700);
await page.type('input[placeholder="Search the food database…"]', 'cucumber');
await sleep(700);
await page.evaluate(() => {
  const li = [...document.querySelectorAll('li button')].find((b) => b.textContent.toLowerCase().includes('cucumber'));
  li?.click();
});
await sleep(700);
t = await text();
check('add-from-database works', t.includes('cucumber'));
const overrideOk = await page.evaluate(() => {
  const card = [...document.querySelectorAll('main div')].filter((d) => d.textContent.includes('cucumber') && d.querySelector('button'));
  const c = card[card.length - 1];
  const cooked = [...c.querySelectorAll('button')].find((b) => b.textContent === 'cooked');
  cooked?.click();
  return true;
});
await sleep(700);
t = await text();
check('cooked-cucumber state override → Shehakol', overrideOk && t.includes('shehakol'));

// ---------------------------------------------------------------- GUIDE
await clickText('Guide me through', 1500);
const order = [];
for (let i = 0; i < 6; i++) {
  t = await text();
  const m = t.match(/blessing (\d) of (\d)\s*\n\s*(.+)/);
  if (!m) break;
  order.push(m[3].trim());
  const heb = await page.evaluate(() => document.querySelector('[lang="he"]')?.textContent ?? '');
  check(`step ${m[1]}/${m[2]} ${m[3].trim()} has Hebrew`, heb.length > 20);
  const hasAudio = t.includes('hear it') || t.includes('playing');
  check(`step ${m[1]} has hear-it`, hasAudio);
  if (m[1] === m[2]) {
    await clickText('finish the meal', 1400);
    break;
  }
  await clickText('I said this blessing', 1200);
}
check(
  'kedima order Mezonos→Hagafen→Ha’etz→Ha’adama→Shehakol',
  JSON.stringify(order) === JSON.stringify(['mezonos', 'hagafen', 'ha’etz', 'ha’adama', 'shehakol']),
  order.join(' → '),
);

// ------------------------------------------------------------- ASK + SHIUR + AFTER
t = await text();
check('ask phase shows (never abrupt)', t.includes('savor it') && t.includes('no rush'));
await clickText('done eating', 1200);
t = await text();
check('shiur screen shows', t.includes('how much did you eat'));
// untick the cucumber (only tasted)
await page.evaluate(() => {
  const label = [...document.querySelectorAll('label')].find((l) => l.textContent.toLowerCase().includes('cucumber'));
  label?.querySelector('input')?.click();
});
await sleep(500);
await clickText('Show my after-blessings', 1500);
t = await text();
check('combined Me’ein Shalosh (3 inserts)', t.includes('al hamichya + al hagefen + al ha’etz'));
check('Borei Nefashos required (carrots)', t.includes('borei nefashos'));
check('coverage note lists carrots', /borei nefashos.*carrots/s.test(t));
check('streak day 1 celebrated', t.includes('day 1 of your streak') || t.includes('🔥'));
const celebrateVideo = await page.evaluate(() => {
  const v = document.querySelector('video source');
  return v?.src.includes('celebrate') ?? false;
});
check('celebrate video mounted', celebrateVideo);

// persistence across reload
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2000);
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('brachas-with-rimon')).state.progress);
check('progress persisted across reload', persisted.totalBrachos >= 6 && persisted.streakCurrent === 1, `total=${persisted.totalBrachos} streak=${persisted.streakCurrent}`);

// ---------------------------------------------------------------- JOURNEY
await page.evaluate(() => [...document.querySelectorAll('nav button')][2]?.click());
await sleep(1200);
t = await text();
check('journey streak hero shows 1', /1\s*🔥/.test(t.replace(/\n/g, ' ')));
check('activity strip shows today count', t.includes('day streak') || t.includes('day streak'));
check('challenges render', t.includes('first fruits') && t.includes('the seven species'));
const challengeProgress = t.match(/first fruits[\s\S]{0,120}?(\d+)\/10/);
check('First Fruits counts brachos', !!challengeProgress && Number(challengeProgress[1]) >= 6, challengeProgress?.[1]);

// ---------------------------------------------------------------- LEARN
await page.evaluate(() => [...document.querySelectorAll('nav button')][1]?.click());
await sleep(1000);
await page.evaluate(() => {
  const card = [...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Why say a bracha'));
  card?.click();
});
await sleep(900);
t = await text();
check('lesson opens', t.includes('berachot 35'));
await clickText('Mark as read', 900);
const lessonsRead = await page.evaluate(() => JSON.parse(localStorage.getItem('brachas-with-rimon')).state.progress.lessonsRead);
check('lesson marked read', lessonsRead.includes('why-bless'));
await sleep(600);
t = await text();
check('learn has daily rotation', t.includes("today's study") && t.includes('fresh today'));
await page.evaluate(() => {
  const s = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').includes('star lesson'));
  s?.click();
});
await sleep(600);
t = await text();
check('starring pins a lesson', t.includes('starred'));

// ---------------------------------------------------------------- FRIENDS (live server)
await page.evaluate(() => [...document.querySelectorAll('nav button')][3]?.click());
await sleep(1000);
await page.type('input[placeholder="e.g. Shan"]', 'E2E Debug');
await clickText('Join', 2200);
t = await text();
const codeMatch = (await page.evaluate(() => document.body.innerText)).match(/RIMON-[A-Z2-9]{4}/);
check('league join returns friend code', !!codeMatch, codeMatch?.[0]);
await page.type('input[placeholder="RIMON-XXXX"]', 'RIMON-HM8V');
await clickText('Add', 2200);
t = await text();
check('add friend by code works', t.includes('test friend'), 'league shows Test Friend');
check('league shows weekly counts', t.includes('this week'));

// ---------------------------------------------------------------- AUDIO + assets over network
const audioStatus = await page.evaluate(async () => {
  const r = await fetch('./audio/hamotzi.mp3', { method: 'HEAD' });
  return r.status;
});
check('bracha audio serves', audioStatus === 200);

// ---------------------------------------------------------------- console errors
const realErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('Manifest'));
check('no console/page errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(failures === 0 ? '\nE2E: ALL PASS' : `\nE2E: ${failures} FAILURE(S)`);
process.exit(failures ? 1 : 0);

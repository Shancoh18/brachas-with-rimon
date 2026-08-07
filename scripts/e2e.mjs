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
await browser.defaultBrowserContext().overridePermissions('https://shancoh18.github.io', ['notifications']);
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

// ------------------------------------------------------------- ONBOARDING
let t = await text();
check('tutorial shows on first open', t.includes('i’m rimon.') || t.includes('i’m rimon'));
check('tutorial has motion (dance loop)', await page.evaluate(() => [...document.querySelectorAll('video source')].some((s) => s.src.includes('dance'))));
await clickText('Nice to meet you', 900);
t = await text();
check('tutorial step 2 (photograph)', t.includes('show me your meal'));
await clickText('Next', 900);
t = await text();
check('tutorial step 3 has walker demo', t.includes('walk the blessings') && (await page.evaluate(() => [...document.querySelectorAll('video source')].some((s) => s.src.includes('walk')))));
await clickText('Next', 900);
t = await text();
check(
  'tutorial teaches blessing → bite with eating Rimon',
  t.includes('take a bite') &&
    (await page.evaluate(() => [...document.querySelectorAll('img')].some((i) => i.src.includes('eats-') && i.alt.includes('bite')))),
);
await clickText('Next', 900);
await clickText('Next', 900);
t = await text();
check('tutorial ends at account creation', t.includes('make it yours') && (await page.evaluate(() => !!document.querySelector('input[type="email"]'))));
await clickText('continue to sign-in', 1200);

// ----------------------------------------------------- AUTH GATE (account-first)
t = await text();
check('auth gate blocks the app until sign-in', t.includes('sign in to begin'));
const e2eEmail = 'e2e-' + Math.floor(Math.random() * 1e9) + '@example.com';
const E2E_PASS = 'e2e-pass-12345';
await page.type('input[placeholder="e.g. Shan"]', 'E2E Debug');
await page.type('input[placeholder="you@example.com"]', e2eEmail);
await page.type('input[placeholder="8+ characters"]', E2E_PASS);
await clickText('Create my account', 2600);
t = await text();
check('account created at the gate - app unlocked', t.includes('brachas with rimon') && !t.includes('sign in to begin'));

// ---------------------------------------------------------------- WELCOME
t = await text();
check('welcome renders title', t.includes('brachas with rimon'));
check('nusach selector present', t.includes('ashkenaz') && t.includes('edot hamizrach'));
check('disclaimer present', t.includes('consult a qualified rabbi'));
check('tip of the day present', /tip of the day/i.test(t));
check(
  'home widgets: streak tracker + bracha-today nudge',
  (await page.evaluate(() => !!document.querySelector('[data-home-widgets]'))) &&
    t.includes('have you said your bracha today'),
);

// ------------------------------------------------- MEALTIME REMINDER NUDGE
const nudgePlace = await page.evaluate(() => {
  const nudge = document.querySelector('[data-reminder-nudge]');
  if (!nudge) return { err: 'nudge missing' };
  const tip = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('tip of the day'));
  const nr = nudge.getBoundingClientRect();
  const tr = tip ? tip.getBoundingClientRect() : null;
  return { text: nudge.innerText, belowTip: tr ? nr.top >= tr.bottom - 2 : null };
});
check('reminder nudge on home page, under the tip', !nudgePlace.err && nudgePlace.belowTip === true, nudgePlace.err || `belowTip=${nudgePlace.belowTip}`);
check('nudge invites setting breakfast/lunch/dinner', /set your mealtimes/i.test(nudgePlace.text || '') && /breakfast.*lunch.*dinner/i.test(nudgePlace.text || ''));

const sheet = await page.evaluate(async () => {
  document.querySelector('[data-reminder-nudge]').click();
  await new Promise((r) => setTimeout(r, 700));
  const s = document.querySelector('[data-reminder-sheet]');
  if (!s) return { err: 'sheet missing' };
  const inputs = [...s.querySelectorAll('input[type="time"]')];
  return { text: s.innerText, count: inputs.length, labels: inputs.map((i) => i.getAttribute('aria-label')) };
});
check('nudge opens the mealtime sheet with 3 slots', !sheet.err && sheet.count === 3, sheet.err || `count=${sheet.count}`);
check('slots labeled Breakfast / Lunch / Dinner',
  JSON.stringify(sheet.labels) === JSON.stringify(['Breakfast reminder time', 'Lunch reminder time', 'Dinner reminder time']),
  (sheet.labels || []).join(', '));

await page.evaluate(() => {
  const s = document.querySelector('[data-reminder-sheet]');
  const inputs = [...s.querySelectorAll('input[type="time"]')];
  const set = (el, v) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set(inputs[0], '07:15'); set(inputs[1], '12:45'); set(inputs[2], '18:30');
});
await sleep(400);
await clickText('Turn on reminders', 1200);
// Signed-in enables may take the web-push path (permission + subscribe + server
// round-trip) before the sheet closes — wait for the close instead of a fixed sleep.
await page
  .waitForFunction(() => !document.querySelector('[data-reminder-sheet]'), { timeout: 9000 })
  .catch(() => {});
const nudgeSaved = await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem('brachas-with-rimon')).state.reminders;
  const n = document.querySelector('[data-reminder-nudge]');
  return { st, closed: !document.querySelector('[data-reminder-sheet]'), text: n ? n.innerText : '' };
});
check('mealtimes save + reminders enable', JSON.stringify(nudgeSaved.st.times) === JSON.stringify(['07:15', '12:45', '18:30']) && nudgeSaved.st.enabled === true, (nudgeSaved.st.times || []).join(', '));
check('nudge flips to ON with the chosen times', nudgeSaved.closed === true && /7:15 AM · 12:45 PM · 6:30 PM/.test(nudgeSaved.text), nudgeSaved.text.replaceAll('\n', ' | '));
// leave reminders off so the rest of the run is unaffected by notification popups
await page.evaluate(async () => {
  document.querySelector('[data-reminder-nudge]').click();
  await new Promise((r) => setTimeout(r, 600));
  const b = [...document.querySelectorAll('button')].find((x) => /turn reminders off/i.test(x.textContent));
  b?.click();
});
await sleep(800);

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

// the demo section is gone (owner directive) — manual add is the no-photo path
check('demo section removed from home', !t.includes('demo meal'));
const manualCovered = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Add it manually'));
  if (!b) return 'missing';
  const r = b.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return b.contains(el) || el === b ? 'clear' : 'covered';
});
check('manual-add pill tap-target clear of tab bar', manualCovered === 'clear', manualCovered);

// nusach switching persists
await clickText('Ashkenaz', 600);
const nusachStored = await page.evaluate(() => JSON.parse(localStorage.getItem('brachas-with-rimon')).state.nusach);
check('nusach switch persists', nusachStored === 'ashkenaz', nusachStored);
await clickText('Nusach Ari', 600);

// ------------------------------------------------------------ QUICK GUIDE
await page.evaluate(() => window.scrollTo(0, 600)); // scroll away first…
await sleep(300);
await clickText('Quick blessing guide', 1300);
check('screen change scrolls back to top', (await page.evaluate(() => window.scrollY)) < 5);
t = await text();
check('quick guide lists all six in order', ['hamotzi','mezonos','hagafen','ha’etz','ha’adama','shehakol'].every((x) => t.includes(x)));
check('rimon eats the food groups', await page.evaluate(() => document.querySelectorAll('img[src*="eats-"]').length === 6));
await clickText('Hamotzi', 700);
t = await text();
check('quick guide expands with full text + audio', t.includes('wash hands first') && t.includes('hear it'));
// after-blessings section (new): the three closers + the Birkat Hamazon door
check('quick guide has after-blessings section', t.includes('after the meal') && t.includes('me’ein shalosh') && t.includes('borei nefashos') && t.includes('birkat hamazon'));
await clickText('Borei Nefashos', 700);
t = await text();
check('Borei Nefashos expands with text + audio', t.includes('creator of numerous living beings') || t.includes('בורא נפשות') || t.includes('בּוֹרֵא נְפָשׁוֹת') || t.includes('ne-fa-shos'));
await clickText('Birkat Hamazon', 700);
await clickText('Open the full Birkat Hamazon guide', 1100);
t = await text();
check('Birkat Hamazon guide opens with the four blessings', t.includes('who nourishes all') && t.includes('rebuilder of jerusalem') && t.includes('when it'));
check('Birkat Hamazon guide spells out holiday additions', t.includes('yaaleh veyavo') && t.includes('al hanissim') && t.includes('shabbat'));
check('reading disclaimer cites the source', t.includes('per chabad.org'));
await clickText('← home', 1000);

// --------------------------------------------------- MANUAL ADD (no photo)
t = await text();
check('home offers manual add + Birkat Hamazon', t.includes('add it manually!') && t.includes('birkat hamazon'));
await clickText('Add it manually', 1200);
t = await text();
check('manual entry opens with search ready', t.includes('what did you eat') && (await page.evaluate(() => !!document.querySelector('input[placeholder="Search foods — English or עברית"]'))));
await page.type('input[placeholder="Search foods — English or עברית"]', 'banana');
await sleep(700);
await page.evaluate(() => {
  const li = [...document.querySelectorAll('li button')].find((b) => b.textContent.toLowerCase().includes('banana'));
  li?.click();
});
await sleep(700);
t = await text();
check('manual add puts the food on the plate', t.includes('banana') && (t.includes('haadama') || t.includes('ha’adama')));
await clickText('start over', 1100);

// ------------------------------------------- CONFIRM (via manual add — the
// demo entry point is gone, so the meal is built the way a real user builds it)
// picks are EXACT db labels (names[0]) — the demo's display names are gone
const MEAL = [
  { q: 'chocolate cake', pick: 'cake' },
  { q: 'grape juice', pick: 'grape juice' },
  { q: 'medjool', pick: 'date' },
  { q: 'green apple', pick: 'apple' },
  { q: 'baby carrot', pick: 'carrot' },
  { q: 'grilled chicken', pick: 'chicken' },
];
const addFood = async ({ q, pick }) => {
  const searchReady = await page.evaluate(() => !!document.querySelector('input[placeholder="Search foods — English or עברית"]'));
  if (!searchReady) await clickText('+ add a food', 700);
  await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder="Search foods — English or עברית"]');
    if (inp) {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value').set.call(inp, '');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.type('input[placeholder="Search foods — English or עברית"]', q);
  await sleep(650);
  const picked = await page.evaluate((label) => {
    // the li button's first text node is the food label; the bracha tag span follows
    const li = [...document.querySelectorAll('li button')].find(
      (b) => (b.childNodes[0]?.textContent ?? '').trim().toLowerCase() === label,
    );
    if (li) li.click();
    return !!li;
  }, pick);
  await sleep(500);
  return picked;
};
await clickText('Add it manually', 1300);
let allPicked = true;
for (const item of MEAL) allPicked = (await addFood(item)) && allPicked;
check('manual add builds the full 6-item meal', allPicked);
t = await text();
check('confirm shows all 6 meal items', ['cake', 'grape juice', 'date', 'apple', 'carrot', 'chicken'].every((x) => t.includes(x)));
check('Seven Species chip on dates', t.includes('seven species'));

// remove chicken: climb from its label to the first container owning a
// remove button — that container IS the item card
await page.evaluate(() => {
  let el = [...document.querySelectorAll('span')].find((s) => s.textContent.trim().toLowerCase() === 'chicken');
  while (el && !el.querySelector?.('button[title="remove"]')) el = el.parentElement;
  el?.querySelector('button[title="remove"]')?.click();
});
await sleep(700);
check(
  'remove item works',
  await page.evaluate(() => ![...document.querySelectorAll('span')].some((s) => s.textContent.trim().toLowerCase() === 'chicken')),
);
t = await text();

// add cucumber from the database, then set state=cooked → Shehakol override
await addFood({ q: 'cucumber', pick: 'cucumber' });
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
  // Why dropdown (sourced from chabad.org) — assert once, on step 1
  if (m[1] === '1') {
    const why = await page.evaluate(async () => {
      const el = document.querySelector('[data-why]');
      if (!el) return { err: 'missing' };
      const btn = el.querySelector('button');
      const panel = el.children[1];
      const closedH = panel.getBoundingClientRect().height;
      btn.click();
      await new Promise((r) => setTimeout(r, 800));
      const openH = panel.getBoundingClientRect().height;
      const link = [...panel.querySelectorAll('a')].some((a) => a.href.includes('chabad.org'));
      const hasOrder = /why (this order|it comes)/i.test(panel.innerText);
      btn.click();
      await new Promise((r) => setTimeout(r, 800));
      const reclosedH = panel.getBoundingClientRect().height;
      return { closedH, openH, reclosedH, link, hasOrder };
    });
    check('why dropdown opens with sourced content', !why.err && why.closedH === 0 && why.openH > 100 && why.link, why.err || `closed=${why.closedH} open=${Math.round(why.openH)} chabadLink=${why.link}`);
    check('why dropdown explains the order + re-collapses', why.hasOrder === true && why.reclosedH === 0);
  }
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
check('after-blessing why dropdowns present', (await page.evaluate(() => document.querySelectorAll('[data-why]').length)) >= 2);
check('coverage note lists the carrot', /borei nefashos.*carrot/s.test(t));
check('streak day 1 celebrated', t.includes('day 1 of your streak') || t.includes('🔥'));
const celebrateVideo = await page.evaluate(() => {
  const v = document.querySelector('video source');
  return v?.src.includes('celebrate') ?? false;
});
check('celebrate video mounted', celebrateVideo);

// the party: Finish meal → the streak "kindling" takeover (a first meal always
// extends the streak): flame render + ignition choreography + stat chips
await clickText('Finish meal', 1600);
t = await text();
check('streak takeover shows', t.includes('day') && t.includes('in a row') && t.includes('flame'));
const takeover = await page.evaluate(() => {
  const root = document.querySelector('[data-takeover="streak"]');
  if (!root) return { err: 'takeover root missing' };
  const img = root.querySelector('img[src*="rimon-flame"]');
  const flame = root.querySelector('.tk-flame');
  return {
    art: !!img && (img.complete ? img.naturalWidth > 0 : true),
    animated: flame ? getComputedStyle(flame).animationName.includes('tk-flame-in') : false,
  };
});
check('flame art mounted in streak takeover', !takeover.err && takeover.art === true, takeover.err || '');
check('kindling choreography animates', takeover.animated === true);
check('congratulation line present', t.includes('rimon is proud') || t.includes('whole secret') || t.includes('consistency') || t.includes('keep going') || t.includes('kol hakavod') || t.includes('savoring') || t.includes('intention'));
await clickText('Keep it going', 1400);

// persistence across reload
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2000);
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('brachas-with-rimon')).state.progress);
check('progress persisted across reload', persisted.totalBrachos >= 6 && persisted.streakCurrent === 1, `total=${persisted.totalBrachos} streak=${persisted.streakCurrent}`);
t = await text();
check('today widget flips to Bracha said ✓', t.includes('bracha said'));

// ---------------------------------------------------------------- JOURNEY
await page.evaluate(() => [...document.querySelectorAll('nav button')][2]?.click());
await sleep(1200);
t = await text();
check('journey streak hero shows 1', /1\s*🔥/.test(t.replace(/\n/g, ' ')));
// the week strip: 7 cells, Sunday-anchored, today's cell carrying the count
const strip = await page.evaluate(() => {
  const hero = [...document.querySelectorAll('div')].find((d) => /day streak/i.test(d.innerText) && d.querySelectorAll('span').length > 6);
  if (!hero) return { err: 'strip not found' };
  const cells = [...hero.querySelectorAll('span')].map((s) => (s.textContent || '').trim()).filter((x) => x.length <= 2);
  return { cells: cells.slice(0, 20), todayIdx: new Date().getDay() };
});
check(
  'week strip is Sunday-anchored with 7 day cells',
  !strip.err && strip.cells.filter((c) => /^[SMTWF]$/.test(c)).length >= 7 && strip.cells.find((c) => /^[SMTWF]$/.test(c)) === 'S',
  strip.err || strip.cells.join(' '),
);
check('challenges render', t.includes('first fruits') && t.includes('the seven species'));
check('daily challenges card renders 3 dailies', (t.match(/\+\d+ pts/g) || []).length >= 3, `pts chips: ${(t.match(/\+\d+ pts/g) || []).length}`);
check('food of the day challenge present', t.includes('food of the day'));
check('points hero shows earned points', /⭐\s*[1-9]\d*/.test(t), (t.match(/⭐\s*\d+/) || ['none'])[0]);
const challengeProgress = t.match(/first fruits[\s\S]{0,120}?(\d+)\/10/);
check('First Fruits counts brachos', !!challengeProgress && Number(challengeProgress[1]) >= 6, challengeProgress?.[1]);

// ---------------------------------------------------------------- LEARN
await page.evaluate(() => [...document.querySelectorAll('nav button')][1]?.click());
await sleep(1000);
await page.evaluate(() => {
  const card = [...document.querySelectorAll('main [role="button"]')].find((b) => b.textContent.includes('Why a Blessing'));
  card?.click();
});
await sleep(900);
t = await text();
check('lesson opens', t.includes('spark of holiness'));
check('lesson cites its chabad.org article', t.includes('read the full article'));
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
await sleep(1200);
t = await text();
const codeMatch = (await page.evaluate(() => document.body.innerText)).match(/RIMON-[A-Z2-9]{4}/);
check('league membership from gate signup - friend code shows', !!codeMatch, codeMatch?.[0]);
// Friend-add is CODE-ONLY (email adds were removed 2026-08-06 — a security fix).
// Mint a real friend via the API to get a genuine RIMON code, then add by it.
const friendReg = await fetch('https://brachas-rimon-api-production-46ae.up.railway.app/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://shancoh18.github.io' },
  body: JSON.stringify({ name: 'Test Friend', password: `e2e-friend-${Date.now()}` }),
}).then((r) => r.json());
check('minted a friend account via API for the code-add test', /^RIMON-[A-Z2-9]{4}$/.test(friendReg.code || ''), friendReg.code);
await page.type('input[placeholder="RIMON-XXXX"]', friendReg.code);
await clickText('Add', 2200);
t = await text();
check('add friend BY CODE works', t.includes('test friend'), 'league shows Test Friend');
check('league ranks by weekly points', t.includes('pts this week') && /⭐\s*\d+/.test(t));
check('league shows weekly bracha counts', t.includes('brachos'));
// the numbers must be REAL, not zeros: this account finished a 7-bracha meal
const youRow = await page.evaluate(() => {
  const chip = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'you');
  let row = chip;
  for (let i = 0; i < 6 && row; i++) {
    row = row.parentElement;
    if (row && /pts this week/i.test(row.innerText) && /brachos/i.test(row.innerText)) break;
  }
  return row ? row.innerText.replace(/\n/g, ' | ') : '';
});
check(
  'my league row carries real week numbers (points + brachos > 0)',
  /⭐\s*([1-9]\d*)/.test(youRow) && /\b[1-9]\d*[\s|]*brachos/i.test(youRow),
  youRow,
);

// ------------------------------------------ NAMED BOARDS + GROUP CHAT (live)
await clickText('+ New', 700);
await page.type('input[placeholder="e.g. Cohen Family"]', 'E2E Chevra');
await clickText('Create leaderboard', 2200);
t = await text();
check('board created with share code', t.includes('e2e chevra') && /code [a-z0-9]{4,}/.test(t));
check(
  'chat button sits left of the Share button',
  await page.evaluate(() => {
    const chat = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('💬 Chat'));
    const share = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Share');
    return !!chat && !!share && chat.getBoundingClientRect().left < share.getBoundingClientRect().left;
  }),
);
await clickText('💬 Chat', 1800);
t = await text();
check('group chat opens scoped to the board', (await page.evaluate(() => !!document.querySelector('[data-board-chat]'))) && t.includes('e2e chevra'));
await page.type('input[placeholder*="Message"]', 'Shalom from e2e! 🍎');
await clickText('Send', 2000);
t = await text();
check('chat message sends and renders', t.includes('shalom from e2e'));
await clickText('close', 900);

// ---------------------------------------------------------------- DONATE TAB
await page.evaluate(() => [...document.querySelectorAll('nav button')][4]?.click());
await sleep(1000);
t = await text();
check('donate tab opens next to the profile button', t.includes('help keep the app free') && t.includes('donate to the developers'));

// ---------------------------------------------------------------- DARK MODE
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2200);
const dark = await page.evaluate(() => {
  const body = getComputedStyle(document.body).backgroundColor;
  const card = document.querySelector('[class*="bg-white/6"], [class*="bg-white/7"], [class*="bg-white/8"], [class*="bg-white/9"]');
  return { body, card: card ? getComputedStyle(card).backgroundColor : null };
});
check('dark mode: canvas goes dark', dark.body === 'rgb(28, 22, 17)', dark.body);
check('dark mode: cards stay cream paper', dark.card === 'rgb(248, 243, 230)', String(dark.card));
await page.emulateMediaFeatures([]);
await page.reload({ waitUntil: 'networkidle2' });
await sleep(1800);

// ------------------------------------------------- ACCOUNT TAB + PASSWORD AUTH (live server)
await page.evaluate(() => [...document.querySelectorAll('nav button')][5]?.click());
await sleep(1500);
t = await text();
check('account tab opens from bottom bar (signed in)', t.includes('your account') && t.includes('save changes'));
check('friend code card shows', /rimon-[a-z2-9]{4}/.test(t));
check('password card offers change-password (set at the gate)', t.includes('change password'));
// sign out - the auth gate must re-arm; then back in with email + password
await clickText('sign out on this device', 1500);
t = await text();
check('signing out re-arms the auth gate', t.includes('sign in to begin'));
await clickText('Sign in', 800); // mode toggle (first matching button)
await page.type('input[placeholder="you@example.com"]', e2eEmail);
await page.type('input[placeholder="your password"]', E2E_PASS);
await page.evaluate(() => {
  const subs = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim().replace('✓','').trim() === 'Sign in');
  subs[subs.length - 1]?.click(); // the submit pill (the toggle is first)
});
await sleep(2200);
await page.evaluate(() => [...document.querySelectorAll('nav button')][5]?.click());
await sleep(1200);
t = await text();
const restoredName = await page.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.value).find((v) => v.includes('E2E')) ?? '');
check('email + password sign-in restores the account', t.includes('your account') && restoredName.includes('E2E Debug'), `name=${restoredName}`);
// friend-code fallback link present on the gate sign-in for legacy accounts
await clickText('sign out on this device', 1200);
await clickText('Sign in', 700);
t = await text();
check('friend-code fallback offered on sign-in', t.includes('no password? sign in with your friend code'));

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

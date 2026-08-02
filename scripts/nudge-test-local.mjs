/** Local verification of the home-page mealtime-reminder nudge on dev :5199. */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// grant notifications so the enable path runs end-to-end
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions('http://localhost:5199', ['notifications']);

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
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails++; };

await page.goto('http://localhost:5199/', { waitUntil: 'networkidle2', timeout: 60_000 });
await sleep(2500);
// onboarding
await clickText('Nice to meet you', 900);
await clickText('Next', 900);
await clickText('Next', 900);
await clickText('Next', 900);
await clickText('maybe later', 1400);

// ---------------------------------------------------------------- PLACEMENT
const place = await page.evaluate(() => {
  const nudge = document.querySelector('[data-reminder-nudge]');
  if (!nudge) return { err: 'nudge missing' };
  const tip = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('tip of the day'));
  const nr = nudge.getBoundingClientRect();
  const tr = tip ? tip.getBoundingClientRect() : null;
  return { text: nudge.innerText, belowTip: tr ? nr.top >= tr.bottom - 2 : null, tipFound: !!tip, width: Math.round(nr.width) };
});
check('nudge renders on the home page', !place.err, place.err || '');
check('nudge sits UNDER the tip of the day', place.belowTip === true, `tipFound=${place.tipFound}`);
check('nudge invites setting mealtimes', /set your mealtimes/i.test(place.text || ''), (place.text || '').replaceAll('\n', ' | '));
check('nudge mentions breakfast/lunch/dinner', /breakfast.*lunch.*dinner/i.test(place.text || ''));

// ------------------------------------------------------------------- SHEET
await page.evaluate(() => document.querySelector('[data-reminder-nudge]').click());
await sleep(700);
const sheet = await page.evaluate(() => {
  const s = document.querySelector('[data-reminder-sheet]');
  if (!s) return { err: 'sheet missing' };
  const inputs = [...s.querySelectorAll('input[type="time"]')];
  return {
    text: s.innerText,
    inputCount: inputs.length,
    labels: inputs.map((i) => i.getAttribute('aria-label')),
    values: inputs.map((i) => i.value),
  };
});
check('clicking the nudge opens the mealtime sheet', !sheet.err, sheet.err || '');
check('sheet asks when you usually eat', /when do you usually eat/i.test(sheet.text || ''));
check('sheet has exactly 3 time inputs', sheet.inputCount === 3, `count=${sheet.inputCount}`);
check('inputs are labeled Breakfast / Lunch / Dinner',
  JSON.stringify(sheet.labels) === JSON.stringify(['Breakfast reminder time', 'Lunch reminder time', 'Dinner reminder time']),
  (sheet.labels || []).join(', '));
check('inputs seed from saved defaults', JSON.stringify(sheet.values) === JSON.stringify(['08:00', '13:00', '19:00']), (sheet.values || []).join(', '));

// ------------------------------------------------------------------- SAVE
await page.evaluate(() => {
  const s = document.querySelector('[data-reminder-sheet]');
  const inputs = [...s.querySelectorAll('input[type="time"]')];
  const set = (el, v) => {
    const proto = Object.getPrototypeOf(el);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set(inputs[0], '07:15');
  set(inputs[1], '12:45');
  set(inputs[2], '18:30');
});
await sleep(500);
await clickText('Turn on reminders', 2200);

const saved = await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem('brachas-with-rimon')).state.reminders;
  const nudge = document.querySelector('[data-reminder-nudge]');
  return { st, sheetClosed: !document.querySelector('[data-reminder-sheet]'), nudgeText: nudge ? nudge.innerText : null };
});
check('sheet closes after saving', saved.sheetClosed === true);
check('times persisted', JSON.stringify(saved.st.times) === JSON.stringify(['07:15', '12:45', '18:30']), (saved.st.times || []).join(', '));
check('reminders enabled', saved.st.enabled === true);
check('marked configured', saved.st.configured === true);
check('nudge now shows the chosen times', /7:15 AM · 12:45 PM · 6:30 PM/.test(saved.nudgeText || ''), (saved.nudgeText || '').replaceAll('\n', ' | '));
check('nudge switches to ON state', /reminders on/i.test(saved.nudgeText || ''));

// ------------------------------------------------------- PERSISTS + REOPENS
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2500);
const after = await page.evaluate(async () => {
  const n = document.querySelector('[data-reminder-nudge]');
  if (!n) return { err: 'nudge gone after reload' };
  n.click();
  await new Promise((r) => setTimeout(r, 700));
  const s = document.querySelector('[data-reminder-sheet]');
  return {
    nudgeText: n.innerText,
    values: s ? [...s.querySelectorAll('input[type="time"]')].map((i) => i.value) : null,
    hasTurnOff: s ? /turn reminders off/i.test(s.innerText) : false,
    cta: s ? [...s.querySelectorAll('button')].map((b) => b.textContent.trim()).find((t) => /save times/i.test(t)) : null,
  };
});
check('nudge survives reload with times', !after.err && /7:15 AM/.test(after.nudgeText || ''), after.err || (after.nudgeText || '').replaceAll('\n', ' | '));
check('reopening seeds the saved times', JSON.stringify(after.values) === JSON.stringify(['07:15', '12:45', '18:30']), (after.values || []).join(', '));
check('sheet offers Turn reminders off when live', after.hasTurnOff === true);
check('CTA reads "Save times" when already on', !!after.cta, after.cta || 'missing');

// ------------------------------------------------------- JOURNEY STILL WORKS
await page.evaluate(() => document.querySelector('[data-reminder-sheet]')?.click());
await sleep(500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /journey/i.test(x.textContent));
  b?.click();
});
await sleep(1400);
const journey = await page.evaluate(() => {
  const t = document.body.innerText;
  const inputs = [...document.querySelectorAll('input[type="time"]')];
  return { hasReminders: /mealtime nudges/i.test(t), labeled: /breakfast/i.test(t) && /lunch/i.test(t) && /dinner/i.test(t), values: inputs.map((i) => i.value) };
});
check('Journey reminders card still renders', journey.hasReminders === true);
check('Journey times labeled by meal', journey.labeled === true);
check('Journey shows the same saved times', JSON.stringify(journey.values) === JSON.stringify(['07:15', '12:45', '18:30']), (journey.values || []).join(', '));

check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(fails === 0 ? 'NUDGE-TEST: ALL PASS' : `NUDGE-TEST: ${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);

/** Local verification of the Why dropdown on dev :5199 (headless Chrome composites, unlike the hidden Browser pane). */
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

// walk the onboarding exactly like e2e.mjs
await clickText('Nice to meet you', 900);
await clickText('Next', 900);
await clickText('Next', 900);
await clickText('Next', 900);
await clickText('maybe later', 1400);

const d1 = await clickText('demo meal', 1800);
const d2 = await clickText('Guide me', 1800);
console.log('DBG demo:', d1, 'guide:', d2);
console.log('DBG page:', (await page.evaluate(() => document.body.innerText)).slice(0, 200).replaceAll('\n', ' | '));

// ---- Guide: 5 steps, each must carry a Why dropdown that opens with content + source
for (let step = 1; step <= 5; step++) {
  const r = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const el = document.querySelector('[data-why]');
    if (!el) return { err: 'missing' };
    const btn = el.querySelector('button');
    const panel = el.children[1];
    const closedH = panel.getBoundingClientRect().height;
    btn.click();
    await sleep(800);
    const openH = panel.getBoundingClientRect().height;
    const text = panel.innerText;
    const links = [...panel.querySelectorAll('a')].map((a) => a.href);
    btn.click();
    await sleep(800);
    const reclosedH = panel.getBoundingClientRect().height;
    return { closedH, openH, reclosedH, text, links, title: document.querySelector('h2').textContent };
  });
  check(`step ${step} (${r.title}) why opens`, !r.err && r.openH > 100 && r.closedH === 0, r.err || `closed=${r.closedH} open=${Math.round(r.openH)}`);
  check(`step ${step} why re-collapses`, !r.err && r.reclosedH === 0, r.err || `reclosed=${r.reclosedH}`);
  check(`step ${step} cites chabad.org`, (r.links || []).some((l) => l.includes('chabad.org')), (r.links || []).join(' '));
  check(`step ${step} has why sections`, /why (this order|it comes|this blessing|it applies|after bread|combined)/i.test(r.text || ''));
  await clickText('I said', 1100);
}
// ---- After screen (eating phase → shiur → after-blessings)
await clickText('I’m done eating', 1600);
await clickText('Show my after-blessings', 2000);
console.log('DBG after page:', (await page.evaluate(() => document.body.innerText)).slice(0, 160).replaceAll('\n', ' | '));
const after = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const whys = [...document.querySelectorAll('[data-why]')];
  const out = [];
  for (const w of whys) {
    const btn = w.querySelector('button');
    const panel = w.children[1];
    btn.click();
    await sleep(800);
    out.push({ openH: panel.getBoundingClientRect().height, link: (panel.querySelector('a') || {}).href });
    btn.click();
    await sleep(400);
  }
  return { count: whys.length, out, title: (document.querySelector('h2') || {}).textContent };
});
check('after screen has why dropdowns', after.count >= 2, `count=${after.count} on "${after.title}"`);
for (const [i, o] of after.out.entries()) {
  check(`after why #${i + 1} opens + cites`, o.openH > 100 && (o.link || '').includes('chabad.org'), `h=${Math.round(o.openH)} ${o.link}`);
}
check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(fails === 0 ? 'WHY-TEST: ALL PASS' : `WHY-TEST: ${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);

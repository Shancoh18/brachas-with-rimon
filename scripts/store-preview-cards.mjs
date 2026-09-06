/**
 * App Preview overlay cards — intro card, end card, and caption plates,
 * rendered with the brand fonts by headless Chrome at the preview size
 * (886×1920 default). Captions are PNG plates with alpha (they are composited
 * over the footage by ffmpeg; the FINAL video has no alpha).
 *
 *   node scripts/store-preview-cards.mjs --out=<dir> [--w=886 --h=1920]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const OUT = resolve(arg('out', 'store-assets/preview-cards'));
const W = Number(arg('w', 886));
const H = Number(arg('h', 1920));
mkdirSync(OUT, { recursive: true });
const ROOT = resolve('.');
const b64 = (p) => `data:image/${p.endsWith('.webp') ? 'webp' : 'png'};base64,${readFileSync(p).toString('base64')}`;
const mascot = (n) => b64(join(ROOT, 'public', 'mascot', n));
const ICON_PATH = process.env.STORE_ICON || 'C:/Users/VR/OneDrive/Desktop/Brachas brand kit/CHOSEN-appicon-frost-glass-1024.png';
const icon = b64(ICON_PATH);

const CAPTIONS = [
  { id: 'cap-01', text: 'Meet Rimon — your blessings companion.' },
  { id: 'cap-02', text: 'Snap a photo of your meal, or add it by hand.' },
  { id: 'cap-03', text: 'Every food, the right bracha, in the right order.' },
  { id: 'cap-04', text: 'Hebrew · transliteration · English — and the why.' },
  { id: 'cap-05', text: 'Finish with the after-blessing. Done.' },
  { id: 'cap-06', text: 'Streaks, badges, and a little Torah every day.' },
  { id: 'cap-07', text: 'Every bite, a blessing.' },
];

const base = `
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
:root{--cream:#faf7e9;--espresso:#2b1d16;--mocha:#7a6555;--gold:#b8892b;--crimson:#a8322d}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--espresso);position:relative}`;

const captionHtml = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.plate{position:absolute;left:50%;bottom:${Math.round(H * 0.075)}px;transform:translateX(-50%);max-width:${Math.round(W * 0.86)}px;padding:${Math.round(W * 0.028)}px ${Math.round(W * 0.05)}px;border-radius:999px;background:rgba(43,29,22,.92);color:#fdfbf4;font-size:${Math.round(W * 0.038)}px;font-weight:600;line-height:1.3;text-align:center;letter-spacing:-.005em;box-shadow:0 ${Math.round(W * 0.012)}px ${Math.round(W * 0.035)}px rgba(43,29,22,.28)}
.plate b{color:#f2c96b;font-weight:700}
</style></head><body><div class="plate">${c.text.replace('Rimon', '<b>Rimon</b>').replace('bracha', '<b>bracha</b>').replace('blessing.', '<b>blessing.</b>')}</div></body></html>`;

const cardHtml = (kind) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
html,body{background:var(--cream)}
.grain{position:absolute;inset:0;opacity:.05;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.8'/></svg>")}
.glow{position:absolute;left:50%;top:46%;width:${W * 1.3}px;height:${W * 1.3}px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(184,137,43,.18),rgba(184,137,43,0) 70%)}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 ${Math.round(W * 0.1)}px}
.icon{width:${Math.round(W * 0.3)}px;height:${Math.round(W * 0.3)}px;border-radius:${Math.round(W * 0.068)}px;box-shadow:0 ${Math.round(W * 0.03)}px ${Math.round(W * 0.07)}px rgba(43,29,22,.25)}
.rimon{width:${Math.round(W * 0.5)}px;margin-bottom:${Math.round(W * 0.02)}px;-webkit-mask-image:radial-gradient(ellipse 46% 46% at 50% 52%,black 62%,transparent 100%);mask-image:radial-gradient(ellipse 46% 46% at 50% 52%,black 62%,transparent 100%)}
.eyebrow{margin-top:${Math.round(W * 0.07)}px;font-size:${Math.round(W * 0.03)}px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}
h1{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:800;font-size:${Math.round(W * 0.115)}px;line-height:1.05;letter-spacing:-.012em;margin-top:${Math.round(W * 0.03)}px}
h1 span{color:var(--crimson)}
.sub{margin-top:${Math.round(W * 0.04)}px;font-size:${Math.round(W * 0.04)}px;color:var(--mocha);font-weight:500;line-height:1.4}
.foot{position:absolute;left:0;right:0;bottom:${Math.round(H * 0.05)}px;text-align:center;font-size:${Math.round(W * 0.026)}px;letter-spacing:.2em;text-transform:uppercase;color:var(--mocha);font-weight:600;opacity:.7}
</style></head><body><div class="glow"></div><div class="grain"></div>
<div class="wrap">
${kind === 'intro'
    ? `<img class="rimon" src="${mascot('rimon-hello.webp')}"><div class="eyebrow">Shalom!</div><h1>Brachas <span>with Rimon</span></h1><p class="sub">Blessings, beautifully guided.</p>`
    : `<img class="icon" src="${icon}"><div class="eyebrow">Brachas with Rimon</div><h1>Every bite,<br>a <span>blessing.</span></h1><p class="sub">Photograph your meal. Say it right. Grow every day.</p>`}
</div>
<div class="foot">A study aid — consult a rabbi for practical halacha</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const render = async (id, html, transparent) => {
  const file = join(OUT, `${id}.html`);
  writeFileSync(file, html);
  await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: join(OUT, `${id}.png`), type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`card ${id}`);
};
for (const c of CAPTIONS) await render(c.id, captionHtml(c), true);
await render('intro', cardHtml('intro'), false);
await render('end', cardHtml('end'), false);
await browser.close();
console.log('done');

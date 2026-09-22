/**
 * Google Play feature graphic (1024×500, PNG/JPEG, no alpha) — the banner
 * Play shows above the listing. Brand system (cream / espresso / gold /
 * rimon), the real app icon and Rimon, no generative redraw.
 *
 *   node scripts/play-feature-graphic.mjs --out=<dir>
 *
 * Renders via headless Chrome at exactly 1024×500 (same Chrome the e2e uses;
 * CHROME_PATH overrides), then strips the alpha channel with sharp.
 */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const OUT = resolve(arg('out', 'store-assets/play'));
mkdirSync(OUT, { recursive: true });
const ROOT = resolve('.');
const b64 = (p) => `data:image/${p.endsWith('.webp') ? 'webp' : 'png'};base64,${readFileSync(p).toString('base64')}`;
const icon = b64(join(ROOT, 'art', 'icon-1024.png'));
const rimon = b64(join(ROOT, 'public', 'mascot', 'rimon-pointing.webp'));

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
:root{--cream:#faf7e9;--espresso:#2b1d16;--mocha:#7a6555;--gold:#b8892b;--crimson:#a8322d;}
html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:var(--cream);font-family:'Plus Jakarta Sans',sans-serif;color:var(--espresso)}
.glow{position:absolute;left:62%;top:50%;width:640px;height:640px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(184,137,43,.18),rgba(184,137,43,0) 70%)}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.8'/></svg>")}
.left{position:absolute;left:72px;top:0;height:500px;width:560px;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-size:13px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;color:var(--crimson)}
h1{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:800;font-size:74px;line-height:1.02;letter-spacing:-.012em;margin:14px 0 0}
h1 em{font-style:normal;color:var(--crimson)}
.rule{width:64px;height:4px;border-radius:2px;background:var(--gold);margin:22px 0 0}
.sub{margin-top:18px;max-width:520px;font-size:21px;line-height:1.4;color:var(--mocha);font-weight:500}
.right{position:absolute;right:0;top:0;width:400px;height:500px}
.icon{position:absolute;right:250px;top:70px;width:150px;height:150px;border-radius:36px;box-shadow:0 30px 60px -18px rgba(43,29,22,.35),0 6px 16px rgba(43,29,22,.12)}
/* Rimon is a cream-baked render (no alpha) — blend the square away with the
   same radial mask the app uses, and keep it clear of the icon */
.rimon{position:absolute;right:-10px;top:110px;width:300px;-webkit-mask-image:radial-gradient(ellipse 42% 48% at 50% 52%,#000 55%,transparent 82%);mask-image:radial-gradient(ellipse 42% 48% at 50% 52%,#000 55%,transparent 82%)}
.foot{position:absolute;left:72px;bottom:34px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--mocha)}
</style></head><body>
<div class="glow"></div><div class="grain"></div>
<div class="left">
  <div class="eyebrow">Brachas with Rimon</div>
  <h1>Every bite,<br>a <em>blessing</em>.</h1>
  <div class="rule"></div>
  <div class="sub">Photograph your meal — Rimon walks you through the right brachos, in the right order, and the after-blessing too.</div>
</div>
<div class="right">
  <img class="icon" src="${icon}">
  <img class="rimon" src="${rimon}">
</div>
<div class="foot">Study aid · iPhone &amp; Android · Learn, practise, race your friends</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 400));
const png = await page.screenshot({ type: 'png' });
await browser.close();
const out = join(OUT, 'feature-graphic-1024x500.png');
await sharp(png).removeAlpha().png().toFile(out);
writeFileSync(join(OUT, 'feature-graphic.html'), html);
console.log(`wrote ${out}`);

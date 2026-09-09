/**
 * App Store screenshot artboards — headline + the REAL captured screen in a
 * phone frame, on the app's cream/espresso/gold system. Pixel-exact UI (no
 * generative redraw), no alpha channel (Apple rejects transparency).
 *
 *   node scripts/store-artboards.mjs --raw=<dir with NN-name.png> --out=<dir> [--w=1320 --h=2868]
 *
 * Renders each board via headless Chrome at exactly W×H, then ffmpeg strips
 * the alpha channel (rgb24). 6.9" = 1320×2868, 6.5" = 1284×2778.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync as fs_unlink } from 'fs';
import { join, resolve } from 'path';

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const RAW = resolve(arg('raw', 'store-assets/raw69'));
const OUT = resolve(arg('out', 'store-assets/boards'));
const W = Number(arg('w', 1320));
const H = Number(arg('h', 2868));
// --bg=<dir>: full-bleed background plate per board (<id>.png, e.g. Higgsfield scene art); the phone
// narrows to --phone (fraction of W, default 0.8 / 0.66 with a plate) so the scene stays visible, and a
// cream veil keeps the headline legible over photography. The UI inside the phone is still the real capture.
const BG = arg('bg', '') ? resolve(arg('bg', '')) : '';
const PHONE = Number(arg('phone', BG ? 0.66 : 0.8));
mkdirSync(OUT, { recursive: true });

const ROOT = resolve('.');
const b64 = (p) => `data:image/${p.endsWith('.webp') ? 'webp' : 'png'};base64,${readFileSync(p).toString('base64')}`;
const rawFile = (name) => {
  const f = readdirSync(RAW).find((x) => x.replace(/^\d+-/, '').replace(/\.png$/, '') === name);
  if (!f) throw new Error(`raw shot "${name}" missing in ${RAW}`);
  return join(RAW, f);
};
const mascot = (n) => b64(join(ROOT, 'public', 'mascot', n));
const icon = b64(join(ROOT, 'art', 'icon-1024.png'));

/** The storyline: hook → value → features → proof → close. */
const BOARDS = [
  { id: '01-home', shot: 'home', eyebrow: 'Brachas with Rimon', h1: 'Every bite,\na blessing.', sub: 'Photograph your meal and Rimon walks you through the right brachos — in the right order.', rimon: null, accent: 'crimson' },
  { id: '02-confirm', shot: 'confirm', eyebrow: 'Step one', h1: 'Snap it or\nadd it by hand.', sub: 'Every food on your plate gets its blessing, from a vetted database sourced to chabad.org, brachos.org and OU Kosher.', rimon: null, accent: 'gold' },
  { id: '03-guide', shot: 'guide', eyebrow: 'Step two', h1: 'Say it right,\nin the right order.', sub: 'Hebrew with nikud, transliteration, English — hear it read aloud, and learn why it comes first.', rimon: null, accent: 'crimson' },
  { id: '04-after', shot: 'after', eyebrow: 'Step three', h1: 'Never miss the\nafter-blessing.', sub: 'Rimon resolves Birkat Hamazon, Me’ein Shalosh and Borei Nefashos for exactly what you ate.', rimon: null, accent: 'gold' },
  { id: '05-celebrate', shot: 'celebration', eyebrow: 'Kol hakavod', h1: 'Points, streaks,\ndaily challenges.', sub: 'Adult-Duolingo energy: three fresh challenges a day, badges, and a streak worth keeping.', rimon: null, accent: 'crimson' },
  { id: '06-journey', shot: 'journey', eyebrow: 'Your practice', h1: 'Build a streak\nyou’re proud of.', sub: 'Mealtime reminders on your schedule, a week-at-a-glance tracker, and milestones as you grow.', rimon: null, accent: 'gold' },
  { id: '07-learn', shot: 'learn', eyebrow: 'Learn', h1: 'A little Torah,\nevery day.', sub: 'The daily parsha one aliyah at a time, a daily thought from chabad.org, and a library on why we bless.', rimon: null, accent: 'crimson' },
  { id: '08-reference', shot: 'reference', eyebrow: 'Quick guide', h1: 'The six blessings,\none tap away.', sub: 'A pocket reference with full text, audio, and the kedima order — plus the full Birkat Hamazon.', rimon: null, accent: 'gold' },
  { id: '09-friends', shot: 'friends', eyebrow: 'Together', h1: 'Race your friends\nto the top.', sub: 'Shared leaderboards with timed rounds, friend codes, and a nudge when someone passes you.', rimon: null, accent: 'crimson' },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
:root{--cream:#faf7e9;--paper:#fdfbf4;--espresso:#2b1d16;--mocha:#7a6555;--gold:#b8892b;--crimson:#a8322d;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--cream)}
.bg{position:absolute;inset:0;background-size:cover;background-position:center bottom}
.veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(250,247,233,.94) 0%,rgba(250,247,233,.88) 26%,rgba(250,247,233,.35) 40%,rgba(250,247,233,0) 52%)}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--espresso);position:relative}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.8'/></svg>")}
.glow{position:absolute;left:50%;top:38%;width:${W * 1.1}px;height:${W * 1.1}px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(184,137,43,.16),rgba(184,137,43,0) 70%)}
.glow.crimson{background:radial-gradient(closest-side,rgba(168,50,45,.13),rgba(168,50,45,0) 70%)}
.top{position:absolute;left:0;right:0;top:${Math.round(H * 0.05)}px;z-index:3;padding:0 ${Math.round(W * 0.085)}px;text-align:center}
.eyebrow{font-size:${Math.round(W * 0.024)}px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:var(--gold)}
.eyebrow.crimson{color:var(--crimson)}
h1{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:800;font-size:${Math.round(W * 0.098)}px;line-height:1.04;letter-spacing:-.012em;margin-top:${Math.round(W * 0.028)}px;white-space:pre-line}
.sub{margin:${Math.round(W * 0.03)}px auto 0;max-width:${Math.round(W * 0.8)}px;font-size:${Math.round(W * 0.031)}px;line-height:1.45;color:var(--mocha);font-weight:500}
.rule{width:${Math.round(W * 0.09)}px;height:4px;border-radius:2px;background:var(--gold);margin:${Math.round(W * 0.032)}px auto 0}
.rule.crimson{background:var(--crimson)}
.phone{position:absolute;left:50%;top:${Math.round(H * (BG ? 0.3 : 0.315))}px;transform:translateX(-50%);width:${Math.round(W * PHONE)}px;z-index:1;border-radius:${Math.round(W * 0.085)}px;padding:${Math.round(W * 0.013)}px;background:#1a1512;box-shadow:0 ${Math.round(W * 0.04)}px ${Math.round(W * 0.09)}px rgba(43,29,22,.32),0 ${Math.round(W * 0.008)}px ${Math.round(W * 0.02)}px rgba(43,29,22,.18)}
.phone .screen{display:block;width:100%;border-radius:${Math.round(W * 0.072)}px;background:#faf7e9}
.phone .island{position:absolute;left:50%;top:${Math.round(W * 0.033)}px;transform:translateX(-50%);width:${Math.round(W * 0.2)}px;height:${Math.round(W * 0.052)}px;border-radius:999px;background:#1a1512}
.rimon{position:absolute;z-index:2;width:${Math.round(W * 0.3)}px;filter:drop-shadow(0 ${Math.round(W * 0.012)}px ${Math.round(W * 0.03)}px rgba(43,29,22,.25))}
.rimon.left{left:${Math.round(W * -0.03)}px;top:${Math.round(H * 0.66)}px;transform:rotate(-9deg)}
.rimon.right{right:${Math.round(W * -0.03)}px;top:${Math.round(H * 0.66)}px;transform:rotate(8deg)}
.foot{position:absolute;left:0;right:0;bottom:${Math.round(H * 0.022)}px;text-align:center;font-size:${Math.round(W * 0.02)}px;letter-spacing:.2em;text-transform:uppercase;color:var(--mocha);font-weight:600;opacity:.75}
.foot img{width:${Math.round(W * 0.05)}px;height:${Math.round(W * 0.05)}px;border-radius:${Math.round(W * 0.012)}px;vertical-align:middle;margin-right:${Math.round(W * 0.012)}px}
`;

const html = (b) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
${BG && existsSync(join(BG, `${b.id}.png`)) ? `<div class="bg" style="background-image:url(${b64(join(BG, `${b.id}.png`))})"></div><div class="veil"></div>` : `<div class="glow ${b.accent}"></div>`}<div class="grain"></div>
<div class="top"><div class="eyebrow ${b.accent}">${b.eyebrow}</div><h1>${b.h1}</h1><div class="rule ${b.accent}"></div><p class="sub">${b.sub}</p></div>
${b.rimon ? `<img class="rimon ${b.rimonSide || (BOARDS.indexOf(b) % 2 ? 'left' : 'right')}" src="${mascot(b.rimon)}">` : ''}
<div class="phone"><img class="screen" src="${b64(rawFile(b.shot))}"><div class="island"></div></div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
for (const b of BOARDS) {
  if (!existsSync(rawFile(b.shot))) continue;
  const file = join(OUT, `${b.id}.html`);
  writeFileSync(file, html(b));
  await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));
  const tmp = join(OUT, `${b.id}.rgba.png`);
  await page.screenshot({ path: tmp, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
  const final = join(OUT, `${b.id}.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-pix_fmt', 'rgb24', final]);
  fs_unlink(tmp);
  console.log(`board ${final}`);
}
await browser.close();
console.log('done');

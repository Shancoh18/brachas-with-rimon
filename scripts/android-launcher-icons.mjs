/**
 * Every Android / Google Play / PWA icon, generated from ONE master: the live
 * iOS App Store icon ("Frost Blush" frosted-glass pomegranate),
 *   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
 *
 *   node scripts/android-launcher-icons.mjs [--play=<dir>] [--preview=<dir>] [--dry]
 *
 * Writes (idempotent: the same master always gives byte-identical files):
 *   art/icon-1024.png, assets/icon-only.png    byte copies of the iOS master
 *   assets/icon-foreground.png                 the adaptive foreground at 1024 (@capacitor/assets input)
 *   assets/icon-background.png                 flat backdrop cream at 1024
 *   android/app/src/main/res/
 *     mipmap-<d>/ic_launcher_foreground.png    adaptive foreground, true 108dp sizes 81..432 px
 *     mipmap-<d>/ic_launcher.png               legacy icon (API 24-25), 48dp sizes 36..192 px
 *     mipmap-<d>/ic_launcher_round.png         legacy round icon, same sizes
 *     mipmap-anydpi-v26/ic_launcher(_round).xml  plain <adaptive-icon>, no <inset>, no <monochrome>
 *     values/ic_launcher_background.xml        @color/ic_launcher_background (the flat cream)
 *     (deletes the obsolete mipmap-<d>/ic_launcher_background.png)
 *   public/icon-192.png, public/icon-512.png   PWA purpose "any" (full-bleed iOS art)
 *   public/icon-maskable-512.png               PWA purpose "maskable" (iOS art at 80%)
 *   <play>/icon-512x512.png                    Google Play hi-res icon (32-bit RGBA, fully opaque)
 *   <preview>/launcher-mask-check.png          launcher masks next to the iOS icon, for eyeballing
 * --dry writes nothing in the repo (use with --preview / --play to look first).
 *
 * Do NOT regenerate these with `npx @capacitor/assets generate --android`:
 * that tool re-creates soft 192px layers wrapped in <inset> (the bug fixed on
 * 2026-10-11). The notification glyph ic_stat_rimon is NOT made here; see
 * scripts/android-stat-icon.mjs.
 *
 * HOW THE ADAPTIVE ICON IS BUILT
 * The adaptive canvas is 108dp; launchers show only the central 72dp through
 * their mask (circle, squircle, rounded square...) and Google's safe zone is
 * the central 66dp circle. The iOS art is one flat square with a faint cream
 * "plate" (a rounded square whose corner arcs sit ~45-55px in from each corner
 * on the diagonal) and a warm shadow baked in. The fruit reaches 416px from
 * the centre of the 1024 art (bottom and sides; crown tips 405px).
 *   1. The art is placed at ART (= 70%) of the canvas: 1024px art on a 1464px
 *      canvas. The 72dp viewport then shows the art minus a 24px rim, so the
 *      fruit keeps the iOS proportions (fruit radius = 85% of the visible
 *      radius, iOS 81%) and its outermost point is 30.7dp from centre: inside
 *      the 33dp safe-zone radius, crown included.
 *   2. The plate's corner arcs are cut away (keep region = rounded square,
 *      inset 4px, corner radius 196px, 12px feather) and everything outside the
 *      keep region, including the canvas margin beyond the art, is filled with
 *      a smooth extension of the art's own backdrop (push-pull interpolation
 *      of the backdrop pixels, fruit excluded, then a light blur). So no mask
 *      shape, not even a plain square, can show a plate edge, seam or
 *      tile-inside-a-tile; inside the keep region the pixels are the iOS
 *      pixels, untouched.
 *   3. The foreground is opaque out to 42dp from centre (6dp past the visible
 *      edge, for launcher parallax/scale effects) and fades to transparent by
 *      52dp, onto the flat background colour, which is the art's own edge
 *      cream (mean of the top and left 4..40px bands). The app-launch animation
 *      that stretches the background therefore shows a soft edge, not a box.
 * Legacy icons are the same 72dp viewport, masked to an iOS-style squircle /
 * a circle at 44dp inside the 48dp box. The Play icon and the PWA "any" icons
 * are the full iOS art square, corner arcs cleaned the same way.
 */
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const DRY = process.argv.includes('--dry');
const PLAY_OUT = arg('play', '');
const PREVIEW_OUT = arg('preview', '');

const MASTER = join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const MASTER_MD5 = '8fec83570a50e6d3266295ae7414dd28'; // Frost Blush, App Store 1.0 (35)
const RES = join(ROOT, 'android/app/src/main/res');

// ---- geometry (source pixels of the 1024 master unless noted) -------------
const N = 1024;
const ART = Number(arg('art', '0.70')); // art size as a fraction of the 108dp canvas (--art= is for experiments)
const C = Math.round(N / ART / 6) * 6; // canvas px; a multiple of 6 so the 72dp viewport (2/3) is whole pixels
const OFF = (C - N) / 2; // art offset on the canvas
const DP = C / 108; // canvas px per dp
const VIEW = (C * 2) / 3; // 72dp viewport, px
const VIEW_OFF = C / 6;
const K_INSET = 4; // keep region: rounded square inset from the art edge...
const K_RADIUS = 196; // ...with this corner radius (sits inside the plate's corner arcs)
const K_FEATHER = 12; // blend width from extension to original
const FRUIT_PAD = 18; // backdrop sampling stays this far from the fruit outline
const FG_SOLID_DP = 42; // foreground fully opaque out to here (half-size, dp)
const FG_FADE_DP = 10; // ...then fades out over this many dp
const FG_CORNER_DP = 12;
const MASKABLE_ART = 0.8; // PWA maskable: art at 80% of the icon

const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const PNG = { compressionLevel: 9, adaptiveFiltering: true };

// AOSP launcher mask paths (100x100 viewBox) used for the preview, plus iOS
const MASKS = {
  circle: 'M50,0 A50,50,0,1,1,50,100 A50,50,0,1,1,50,0 Z',
  squircle: 'M50,0 C10,0 0,10 0,50 0,90 10,100 50,100 90,100 100,90 100,50 100,10 90,0 50,0 Z',
  'rounded square': 'M50,0 L92,0 C96.42,0 100,4.58 100,8 L100,92 C100,96.42 96.42,100 92,100 L8,100 C4.58,100 0,96.42 0,92 L0,8 C0,4.42 4.42,0 8,0 L50,0 Z',
  teardrop: 'M50,0 A50,50,0,0,1,100,50 L100,85 A15,15,0,0,1,85,100 L50,100 A50,50,0,0,1,50,0 Z',
  square: 'M0,0 L100,0 L100,100 L0,100 Z',
};
// iOS-style continuous-corner squircle (superellipse n=5), 100x100 viewBox
const superellipse = (n = 5, steps = 360) => {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push(`${(50 + 50 * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(3)},${(50 + 50 * Math.sign(s) * Math.abs(s) ** (2 / n)).toFixed(3)}`);
  }
  return `M${pts.join(' L')} Z`;
};
const IOS_SHAPE = superellipse(5);

// ---- helpers ---------------------------------------------------------------
const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// signed distance to a rounded rectangle centred on the origin (negative inside)
const sdRoundRect = (px, py, h, r) => {
  const qx = Math.abs(px) - h + r, qy = Math.abs(py) - h + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const raw = (buf, w, h, ch) => sharp(buf, { raw: { width: w, height: h, channels: ch } });
const maskSvg = (d, size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><path d="${d}" fill="#fff"/></svg>`);
const masked = async (input, d, size) => sharp(await sharp(input).resize(size, size, { kernel: 'lanczos3' }).ensureAlpha().png().toBuffer())
  .composite([{ input: maskSvg(d, size), blend: 'dest-in' }]).png().toBuffer();
const written = [];
const write = (file, buf) => {
  if (DRY) return;
  mkdirSync(dirname(file), { recursive: true });
  const same = existsSync(file) && md5(readFileSync(file)) === md5(buf);
  if (!same) writeFileSync(file, buf);
  written.push(`${same ? 'same   ' : 'wrote  '} ${file.replace(ROOT + '/', '')}`);
};

// separable gaussian blur on a float RGB buffer (edge clamp)
function blurRGB(src, w, h, sigma) {
  const rad = Math.ceil(sigma * 3), k = [];
  let ks = 0;
  for (let i = -rad; i <= rad; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); ks += v; }
  for (let i = 0; i < k.length; i++) k[i] /= ks;
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let i = -rad; i <= rad; i++) {
      const xx = Math.min(w - 1, Math.max(0, x + i)), o = (y * w + xx) * 3, kv = k[i + rad];
      r += kv * src[o]; g += kv * src[o + 1]; b += kv * src[o + 2];
    }
    const o = (y * w + x) * 3; tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let i = -rad; i <= rad; i++) {
      const yy = Math.min(h - 1, Math.max(0, y + i)), o = (yy * w + x) * 3, kv = k[i + rad];
      r += kv * tmp[o]; g += kv * tmp[o + 1]; b += kv * tmp[o + 2];
    }
    const o = (y * w + x) * 3; out[o] = r; out[o + 1] = g; out[o + 2] = b;
  }
  return out;
}

// push-pull hole filling (Gortler et al.): colour where weight>0 is known,
// everything else is interpolated smoothly from coarser levels
function pushPull(col, wt, w, h) {
  const levels = [{ col, wt, w, h }];
  while (levels.at(-1).w > 2 || levels.at(-1).h > 2) {
    const L = levels.at(-1), W1 = Math.ceil(L.w / 2), H1 = Math.ceil(L.h / 2);
    const c1 = new Float32Array(W1 * H1 * 3), w1 = new Float32Array(W1 * H1);
    for (let y = 0; y < H1; y++) for (let x = 0; x < W1; x++) {
      let s = 0, r = 0, g = 0, b = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const xx = 2 * x + i, yy = 2 * y + j;
        if (xx >= L.w || yy >= L.h) continue;
        const k = yy * L.w + xx, a = L.wt[k];
        if (!a) continue;
        s += a; r += a * L.col[k * 3]; g += a * L.col[k * 3 + 1]; b += a * L.col[k * 3 + 2];
      }
      const o = y * W1 + x;
      if (s > 0) { c1[o * 3] = r / s; c1[o * 3 + 1] = g / s; c1[o * 3 + 2] = b / s; }
      w1[o] = Math.min(1, s);
    }
    levels.push({ col: c1, wt: w1, w: W1, h: H1 });
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l], U = levels[l + 1];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const k = y * L.w + x, a = L.wt[k];
      if (a >= 1) continue;
      const ux = Math.min(U.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), uy = Math.min(U.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(ux), y0 = Math.floor(uy), x1 = Math.min(U.w - 1, x0 + 1), y1 = Math.min(U.h - 1, y0 + 1);
      const fx = ux - x0, fy = uy - y0;
      for (let c = 0; c < 3; c++) {
        const up = (1 - fy) * ((1 - fx) * U.col[(y0 * U.w + x0) * 3 + c] + fx * U.col[(y0 * U.w + x1) * 3 + c])
          + fy * ((1 - fx) * U.col[(y1 * U.w + x0) * 3 + c] + fx * U.col[(y1 * U.w + x1) * 3 + c]);
        L.col[k * 3 + c] = a * L.col[k * 3 + c] + (1 - a) * up;
      }
    }
  }
  return levels[0].col;
}

// ---- 1. master -------------------------------------------------------------
const masterBuf = readFileSync(MASTER);
const masterMd5 = md5(masterBuf);
const meta = await sharp(masterBuf).metadata();
if (meta.width !== N || meta.height !== N) throw new Error(`master must be ${N}x${N}, is ${meta.width}x${meta.height}`);
if (masterMd5 !== MASTER_MD5) {
  console.warn(`WARNING: the iOS icon changed (md5 ${masterMd5}). The plate/fruit geometry constants were measured on`
    + ` the Frost Blush art (${MASTER_MD5}); check the --preview sheet before shipping.`);
}
for (const rel of ['art/icon-1024.png', 'assets/icon-only.png']) write(join(ROOT, rel), masterBuf);

const { data: img } = await sharp(masterBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { data: grey } = await sharp(masterBuf).greyscale().blur(1).raw().toBuffer({ resolveWithObject: true });

// ---- 2. fruit outline (outermost strong edge per angle) ---------------------
const CEN = (N - 1) / 2, BINS = 720;
const sob = (x, y) => {
  const L = (xx, yy) => grey[yy * N + xx];
  const gx = -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1);
  const gy = -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1);
  return Math.hypot(gx, gy);
};
const edgeR = new Float32Array(BINS);
for (let b = 0; b < BINS; b++) {
  const t = (b / BINS) * Math.PI * 2;
  for (let r = 470; r > 60; r -= 0.5) {
    const x = Math.round(CEN + r * Math.cos(t)), y = Math.round(CEN + r * Math.sin(t));
    if (sob(x, y) > 30) { edgeR[b] = r; break; }
  }
}
const fruitR = new Float32Array(BINS);
for (let b = 0; b < BINS; b++) {
  let m = 0;
  for (let d = -6; d <= 6; d++) m = Math.max(m, edgeR[(b + d + BINS) % BINS]);
  fruitR[b] = m + FRUIT_PAD;
}
const maxFruit = Math.max(...edgeR);
const isFruit = (x, y) => {
  const dx = x - CEN, dy = y - CEN;
  const b = Math.floor(((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * BINS) % BINS;
  return Math.hypot(dx, dy) < fruitR[b];
};
// keep weight: 1 inside the plate (minus its corner arcs), 0 outside
const keepW = (x, y) => -sdRoundRect(x - CEN, y - CEN, N / 2 - K_INSET, K_RADIUS) / K_FEATHER;

// background colour = the art's own edge cream (top + left bands, 4..40px in)
const bgSum = [0, 0, 0];
let bgN = 0;
for (let d = 4; d < 40; d++) for (let t = 200; t < 824; t++) {
  for (const [x, y] of [[t, d], [d, t]]) { const s = (y * N + x) * 3; for (let c = 0; c < 3; c++) bgSum[c] += img[s + c]; bgN++; }
}
const BG = bgSum.map((v) => Math.round(v / bgN));
const BG_HEX = hex(BG);

// ---- 3. clean extended backdrop over the whole canvas -----------------------
// known samples: the art's backdrop (fruit and plate corners excluded) and,
// pinned at the canvas rim (beyond FG_SOLID_DP + FG_FADE_DP), the flat cream,
// so the hidden margin blends from the art's edge colours into the background
const col = new Float32Array(C * C * 3), wt = new Float32Array(C * C);
const RIM = (FG_SOLID_DP + FG_FADE_DP) * DP;
for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
  if (Math.max(Math.abs(x + 0.5 - C / 2), Math.abs(y + 0.5 - C / 2)) < RIM) continue;
  const k = y * C + x;
  col[k * 3] = BG[0]; col[k * 3 + 1] = BG[1]; col[k * 3 + 2] = BG[2]; wt[k] = 1;
}
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (keepW(x, y) < 1 || isFruit(x, y)) continue;
  const k = (y + OFF) * C + (x + OFF), s = (y * N + x) * 3;
  col[k * 3] = img[s]; col[k * 3 + 1] = img[s + 1]; col[k * 3 + 2] = img[s + 2]; wt[k] = 1;
}
const ext = blurRGB(pushPull(col, wt, C, C), C, C, 8);

// E = iOS pixels inside the keep region, the extension everywhere else
const rand = mulberry32(20261011);
const E = Buffer.alloc(C * C * 3);
for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
  const k = y * C + x, ix = x - OFF, iy = y - OFF;
  const inArt = ix >= 0 && iy >= 0 && ix < N && iy < N;
  const kw = inArt ? smoothstep(0, 1, keepW(ix, iy)) : 0;
  for (let c = 0; c < 3; c++) {
    const v = inArt ? kw * img[(iy * N + ix) * 3 + c] + (1 - kw) * ext[k * 3 + c] : ext[k * 3 + c];
    // ±0.5 LSB dither against banding; exact iOS pixels (kw=1) round back to themselves
    E[k * 3 + c] = Math.max(0, Math.min(255, Math.round(v + (rand() - 0.5) * (kw === 1 ? 0 : 1))));
  }
}

// foreground: E with alpha (opaque to 42dp, gone by 52dp); composite = over BG
const FG = Buffer.alloc(C * C * 4), COMP = Buffer.alloc(C * C * 3);
for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
  const k = y * C + x;
  const d = sdRoundRect((x + 0.5 - C / 2) / DP, (y + 0.5 - C / 2) / DP, FG_SOLID_DP, FG_CORNER_DP);
  const a = 1 - smoothstep(0, FG_FADE_DP, d);
  for (let c = 0; c < 3; c++) {
    FG[k * 4 + c] = a > 0 ? E[k * 3 + c] : BG[c];
    COMP[k * 3 + c] = Math.round(a * E[k * 3 + c] + (1 - a) * BG[c]);
  }
  FG[k * 4 + 3] = Math.round(a * 255);
}
const fgPng = await raw(FG, C, C, 4).png().toBuffer();
const compPng = await raw(COMP, C, C, 3).png().toBuffer();
const viewport = await sharp(compPng).extract({ left: VIEW_OFF, top: VIEW_OFF, width: VIEW, height: VIEW }).png().toBuffer();
const artSquare = await raw(E, C, C, 3).extract({ left: OFF, top: OFF, width: N, height: N }).png().toBuffer();

// ---- 4. Android --------------------------------------------------------------
const xmlHead = '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by scripts/android-launcher-icons.mjs from the iOS App Store icon. Do not edit by hand. -->\n';
const adaptiveXml = `${xmlHead}<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
const colorXml = `${xmlHead}<resources>
    <!-- adaptive-icon backdrop: the iOS icon's own edge cream; the foreground
         layer carries the art and fades into this colour outside the 72dp viewport -->
    <color name="ic_launcher_background">${BG_HEX}</color>
</resources>
`;
write(join(RES, 'mipmap-anydpi-v26/ic_launcher.xml'), Buffer.from(adaptiveXml));
write(join(RES, 'mipmap-anydpi-v26/ic_launcher_round.xml'), Buffer.from(adaptiveXml));
write(join(RES, 'values/ic_launcher_background.xml'), Buffer.from(colorXml));

const LEGACY_SHAPE_DP = 44; // shape inside the 48dp legacy box (2dp transparent margin)
const legacy = {};
for (const [d, s] of Object.entries(DENSITIES)) {
  const fgPx = Math.round(108 * s), box = Math.round(48 * s), shape = Math.round(LEGACY_SHAPE_DP * s);
  const pad = (box - shape) / 2, padL = Math.floor(pad), padR = Math.ceil(pad);
  const ext4 = { top: padL, left: padL, bottom: padR, right: padR, background: { r: 0, g: 0, b: 0, alpha: 0 } };
  const fgOut = await sharp(fgPng).resize(fgPx, fgPx, { kernel: 'lanczos3' }).png(PNG).toBuffer();
  const sq = await sharp(await masked(viewport, IOS_SHAPE, shape)).extend(ext4).png(PNG).toBuffer();
  const rd = await sharp(await masked(viewport, MASKS.circle, shape)).extend(ext4).png(PNG).toBuffer();
  write(join(RES, `mipmap-${d}/ic_launcher_foreground.png`), fgOut);
  write(join(RES, `mipmap-${d}/ic_launcher.png`), sq);
  write(join(RES, `mipmap-${d}/ic_launcher_round.png`), rd);
  legacy[d] = { fgOut, sq, rd };
  const stale = join(RES, `mipmap-${d}/ic_launcher_background.png`);
  if (!DRY && existsSync(stale)) { rmSync(stale); written.push(`deleted ${stale.replace(ROOT + '/', '')}`); }
}
write(join(ROOT, 'assets/icon-foreground.png'), await sharp(fgPng).resize(N, N, { kernel: 'lanczos3' }).png(PNG).toBuffer());
write(join(ROOT, 'assets/icon-background.png'), await sharp({ create: { width: N, height: N, channels: 3, background: { r: BG[0], g: BG[1], b: BG[2] } } }).png(PNG).toBuffer());

// ---- 5. PWA + Play ---------------------------------------------------------------
const pwa512 = await sharp(artSquare).resize(512, 512, { kernel: 'lanczos3' }).png(PNG).toBuffer();
const pwa192 = await sharp(artSquare).resize(192, 192, { kernel: 'lanczos3' }).png(PNG).toBuffer();
const M = Math.round(N / MASKABLE_ART / 2) * 2;
const maskable = await raw(E, C, C, 3).extract({ left: (C - M) / 2, top: (C - M) / 2, width: M, height: M })
  .resize(512, 512, { kernel: 'lanczos3' }).png(PNG).toBuffer();
write(join(ROOT, 'public/icon-512.png'), pwa512);
write(join(ROOT, 'public/icon-192.png'), pwa192);
write(join(ROOT, 'public/icon-maskable-512.png'), maskable);
const play512 = await sharp(artSquare).resize(512, 512, { kernel: 'lanczos3' }).ensureAlpha(1).png(PNG).toBuffer();
if (PLAY_OUT) {
  mkdirSync(resolve(PLAY_OUT), { recursive: true });
  writeFileSync(join(resolve(PLAY_OUT), 'icon-512x512.png'), play512);
  written.push(`wrote   ${join(resolve(PLAY_OUT), 'icon-512x512.png')}`);
}

// ---- 6. preview sheet ----------------------------------------------------------------
if (PREVIEW_OUT) {
  const T = 288; // 72dp at xxxhdpi, i.e. the real on-device pixels of the viewport
  const shipFg = legacy.xxxhdpi.fgOut; // the actual xxxhdpi file
  const devComp = await sharp({ create: { width: 432, height: 432, channels: 3, background: { r: BG[0], g: BG[1], b: BG[2] } } })
    .composite([{ input: shipFg }]).png().toBuffer();
  const devView = await sharp(devComp).extract({ left: 72, top: 72, width: T, height: T }).png().toBuffer();
  const tiles = [['iOS (App Store)', await masked(masterBuf, IOS_SHAPE, T)]];
  for (const [name, d] of Object.entries(MASKS)) tiles.push([name, await masked(devView, d, T)]);
  const GAP = 24, LABEL = 30, cols = tiles.length;
  const W = GAP + cols * (T + GAP), rowH = T + LABEL + GAP;
  const label = (txt, x, y, fill) => `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="${fill}" text-anchor="middle">${txt}</text>`;
  // row 3: full canvas with viewport + safe zone, legacy icons, Play, maskable
  const canvasDbg = await sharp(devComp).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432">
    <rect x="72" y="72" width="288" height="288" fill="none" stroke="#1a73e8" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="216" cy="216" r="132" fill="none" stroke="#d93025" stroke-width="2" stroke-dasharray="6 4"/></svg>`) }]).png().toBuffer();
  const maskDbg = await sharp(maskable).resize(T, T).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
    <circle cx="${T / 2}" cy="${T / 2}" r="${T * 0.4}" fill="none" stroke="#d93025" stroke-width="2" stroke-dasharray="6 4"/></svg>`) }]).png().toBuffer();
  const row3 = [
    ['108dp canvas: blue = 72dp view, red = 66dp safe', canvasDbg, 432],
    ['legacy 192', legacy.xxxhdpi.sq, 192],
    ['legacy round 192', legacy.xxxhdpi.rd, 192],
    ['Play 512 (shown 288)', await sharp(play512).resize(T, T).png().toBuffer(), T],
    ['PWA maskable (80% circle)', maskDbg, T],
  ];
  const row3W = GAP + row3.reduce((s, r) => s + r[2] + GAP, 0);
  const SW = Math.max(W, row3W), SH = GAP + 2 * rowH + 432 + LABEL + GAP * 2;
  const comps = [], svg = [];
  const rows = [['#e9e7e2', '#333'], ['#24272c', '#ddd']];
  rows.forEach(([bgc, fc], r) => {
    const y = GAP + r * rowH;
    svg.push(`<rect x="0" y="${y - GAP / 2}" width="${SW}" height="${rowH}" fill="${bgc}"/>`);
    tiles.forEach(([name, buf], i) => {
      const x = GAP + i * (T + GAP);
      comps.push({ input: buf, left: x, top: y });
      svg.push(label(name, x + T / 2, y + T + 22, fc));
    });
  });
  let x3 = GAP;
  const y3 = GAP + 2 * rowH;
  for (const [name, buf, size] of row3) {
    comps.push({ input: buf, left: x3, top: y3 });
    svg.push(label(name, x3 + size / 2, y3 + 432 + 22, '#333'));
    x3 += size + GAP;
  }
  const sheet = await sharp({ create: { width: SW, height: SH, channels: 3, background: '#f4f3ef' } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">${svg.join('')}</svg>`), left: 0, top: 0 }, ...comps])
    .png().toBuffer();
  mkdirSync(resolve(PREVIEW_OUT), { recursive: true });
  writeFileSync(join(resolve(PREVIEW_OUT), 'launcher-mask-check.png'), sheet);
  written.push(`wrote   ${join(resolve(PREVIEW_OUT), 'launcher-mask-check.png')}`);
}

console.log(`master ${masterMd5}${masterMd5 === MASTER_MD5 ? ' (Frost Blush)' : ''}; art ${(N / C * 100).toFixed(2)}% of the 108dp canvas (${C}px canvas, art at +${OFF}px)`);
console.log(`fruit reaches ${maxFruit.toFixed(0)}px from centre = ${(maxFruit / DP).toFixed(1)}dp (safe zone 33dp, viewport 36dp); background ${BG_HEX}`);
console.log(written.join('\n') || '(dry run: nothing written in the repo)');

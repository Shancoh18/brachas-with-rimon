/**
 * Android status-bar notification icon (ic_stat_rimon):
 *   node scripts/android-stat-icon.mjs [--out=<res dir>] [--preview=<png>]
 *
 * The glyph is traced from the ENGRAVED LINE-ART pomegranate
 * (art/legacy-lineart-1024.png — the original July 2026 icon), NOT from the
 * live app icon: since 2026-10-11 assets/icon-only.png is the iOS "Frost
 * Blush" frosted-glass icon, whose cream-on-cream art has no clean silhouette.
 * Re-running this script reproduces the shipped ic_stat_rimon files exactly.
 * --out defaults to android/app/src/main/res; pass a scratch dir to test.
 */
// Android status-bar (small) notification icon: must be a WHITE silhouette on
// transparent — colour is applied by the system. Built from the line-art by
// taking every non-cream pixel as the shape.
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const SRC = join(ROOT, 'art', 'legacy-lineart-1024.png');
const OUT = resolve(arg('out', join(ROOT, 'android', 'app', 'src', 'main', 'res')));
const PREVIEW = resolve(arg('preview', join(tmpdir(), 'ic_stat_preview.png')));
const meta = await sharp(SRC).metadata();
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// Sample the corner colour as "background"; a pixel counts as shape when it
// differs from it by more than a threshold OR is fairly dark/saturated.
const bg = [data[0], data[1], data[2]];
const out = Buffer.alloc(info.width * info.height * 4);
let shape = 0;
for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
  const diff = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
  const on = a > 40 && diff > 90;
  out[i * 4] = 255; out[i * 4 + 1] = 255; out[i * 4 + 2] = 255; out[i * 4 + 3] = on ? 255 : 0;
  if (on) shape++;
}
console.log(`source ${meta.width}x${meta.height}, bg rgb(${bg}), shape px ${shape} (${(100 * shape / (info.width * info.height)).toFixed(1)}%)`);
const sizes = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
const base = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 });
const trimmed = await base.png().toBuffer();
for (const [dpi, px] of Object.entries(sizes)) {
  const dir = join(OUT, `drawable-${dpi}`);
  mkdirSync(dir, { recursive: true });
  // 2px padding at mdpi scale so the glyph doesn't touch the icon bounds
  const inner = Math.round(px * 0.84);
  await sharp(trimmed).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: Math.floor((px - inner) / 2), bottom: Math.ceil((px - inner) / 2), left: Math.floor((px - inner) / 2), right: Math.ceil((px - inner) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(join(dir, 'ic_stat_rimon.png'));
}
// preview at 160 on dark grey for a visual check
await sharp(trimmed).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .flatten({ background: '#444444' }).png().toFile(PREVIEW);
console.log(`done -> ${OUT} (preview ${PREVIEW})`);

/**
 * App Preview v2 — Higgsfield-animated Rimon scenes (A: hello → title card, B: title → real home screen,
 * C: journey board → close card) around REAL captured app footage, with the existing ElevenLabs narration
 * (segments re-timed by word timestamps) and music bed. Output 886×1920, H.264, 30 fps, stereo AAC, ≤30 s.
 *
 *   node compose-hf.mjs --a=A.mp4 --b=B.mp4 --c=C.mp4 --raw=raw.mp4 --cards=<dir> --vo=vo.mp3 --music=music.mp3 --out=preview.mp4
 */
import { execFileSync } from 'child_process';
import { join, resolve } from 'path';

const arg = (k, d) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const A = resolve(arg('a')), B = resolve(arg('b')), C = resolve(arg('c'));
const RAW = resolve(arg('raw')), CARDS = resolve(arg('cards')), VO = resolve(arg('vo')), MUSIC = resolve(arg('music'));
const OUT = resolve(arg('out', 'preview-hf.mp4'));
const W = 886, H = 1920, FPS = 30, XF = 0.4, HOLD = 0.6;

// real-footage segments of raw.mp4 (seconds in the raw capture) — the same beats as the v1 preview
const SEGS = [
  [20.4, 23.6], // add challah → plate
  [24.6, 27.6], // guide: Hamotzi (Hebrew + hear it)
  [28.2, 29.6], // guide: Hagafen
  [33.2, 34.0], // how much did you eat
  [34.6, 37.0], // Birkat Hamazon
  [38.2, 39.6], // celebration: flying Rimon
  [44.6, 46.6], // Journey: 12-day streak
];
const F = SEGS.reduce((a, [s, e]) => a + (e - s), 0); // 14.2
const A_D = 5, B_D = 5, C_D = 5, AB_XF = 0.3; // A's last frame ≈ B's first (same anchor): a short blend hides the seam
const F_AT = A_D + B_D - AB_XF - XF;    // 9.3
const C_AT = F_AT + F - XF;             // 23.4
const TOTAL = C_AT + C_D + HOLD;        // 29.0
if (TOTAL > 30) throw new Error(`over 30 s: ${TOTAL}`);
console.log(`footage ${F.toFixed(1)}s, F at ${F_AT}, C at ${C_AT}, total ${TOTAL.toFixed(1)}s`);

// narration segments [voStart, voEnd, outputAt] — from vo2-words.json word timestamps
const VO_SEGS = [
  [0.05, 2.60, 0.6],    // Meet Rimone, your blessings companion.
  [3.00, 5.40, 5.3],    // Snap a photo of your meal, or add it by hand.
  [5.84, 9.80, 9.8],    // Rimone finds every food and the right bracha, in the right order.
  [10.30, 14.60, 13.2], // Say each blessing with the Hebrew, the transliteration, and the why.
  [15.15, 17.35, 17.5], // Finish with the after-blessing. Done.
  [17.62, 20.95, 20.5], // Build a streak, earn badges, and learn a little Torah every day.
  [21.15, 24.70, 24.6], // Brachas with Rimone. Every bite, a blessing.
];
// caption plates over the real footage only (the Higgsfield scenes carry their own text)
const CAPS = [
  ['cap-03', 9.9, 12.7],
  ['cap-04', 13.0, 17.1],
  ['cap-05', 17.4, 20.2],
  ['cap-06', 20.5, 23.3],
];

const inputs = ['-i', A, '-i', B, '-i', C, '-i', RAW];
for (const [c] of CAPS) inputs.push('-loop', '1', '-t', String(TOTAL), '-i', join(CARDS, `${c}.png`));
inputs.push('-i', VO, '-i', MUSIC);
const CAP0 = 4, VO_IDX = 4 + CAPS.length, MU_IDX = VO_IDX + 1;

const f = [];
// Higgsfield clips: fit height, centre-crop to 886 wide (9:16 → 886:1920), lock fps/timebase
const fit = (i, tag, dur) => f.push(`[${i}:v]trim=0:${dur},setpts=PTS-STARTPTS,fps=${FPS},scale=-2:${H},crop=${W}:${H},setsar=1,settb=AVTB[${tag}]`);
fit(0, 'A', A_D); fit(1, 'B', B_D); fit(2, 'C', C_D);
SEGS.forEach(([s, e], i) => f.push(`[3:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H},setsar=1[s${i}]`));
f.push(`${SEGS.map((_, i) => `[s${i}]`).join('')}concat=n=${SEGS.length}:v=1:a=0,settb=AVTB[F]`);
f.push(`[A][B]xfade=transition=fade:duration=${AB_XF}:offset=${A_D - AB_XF},settb=AVTB[AB]`);
f.push(`[AB][F]xfade=transition=fade:duration=${XF}:offset=${F_AT},settb=AVTB[ABF]`);
f.push(`[ABF][C]xfade=transition=fade:duration=${XF}:offset=${C_AT},settb=AVTB[ABFC]`);
f.push(`[ABFC]tpad=stop_mode=clone:stop_duration=${HOLD}[v0]`);
let last = 'v0';
CAPS.forEach(([c, a, b], i) => {
  f.push(`[${CAP0 + i}:v]format=rgba,fade=in:st=${a}:d=0.25:alpha=1,fade=out:st=${b - 0.25}:d=0.25:alpha=1[cap${i}]`);
  f.push(`[${last}][cap${i}]overlay=0:0:enable='between(t,${a},${b})':format=auto[v${i + 1}]`);
  last = `v${i + 1}`;
});
f.push(`[${last}]format=yuv420p[vout]`);
// narration: split → trim each segment → delay to its output time → sum
f.push(`[${VO_IDX}:a]asplit=${VO_SEGS.length}${VO_SEGS.map((_, i) => `[n${i}]`).join('')}`);
VO_SEGS.forEach(([s, e, at], i) => f.push(`[n${i}]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)}[d${i}]`));
f.push(`${VO_SEGS.map((_, i) => `[d${i}]`).join('')}amix=inputs=${VO_SEGS.length}:duration=longest:normalize=0,volume=1.6,alimiter=limit=0.85:level=false,aformat=sample_fmts=fltp:channel_layouts=stereo:sample_rates=48000[vo]`);
f.push(`[${MU_IDX}:a]volume=0.16,afade=t=out:st=${TOTAL - 1.2}:d=1.2,aformat=sample_fmts=fltp:channel_layouts=stereo:sample_rates=48000[mu]`);
f.push(`[vo][mu]amix=inputs=2:duration=longest:normalize=0[aout]`);

const args = ['-v', 'error', '-y', ...inputs, '-filter_complex', f.join(';'), '-map', '[vout]', '-map', '[aout]',
  '-t', String(TOTAL), '-r', String(FPS), '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', OUT];
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log(`wrote ${OUT}`);

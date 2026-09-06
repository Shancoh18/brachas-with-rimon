/**
 * App Preview compositor — cuts the screencast (raw.mp4, 886×1920) into a
 * ≤30 s story, adds the intro/end cards, burned captions (the App Store
 * autoplays previews MUTED), the narration and a music bed. Output meets
 * Apple's spec: H.264, 30 fps, 886×1920, stereo AAC 48 kHz, .mp4.
 *
 *   node scripts/store-preview-compose.mjs --raw=raw.mp4 --cards=<dir> --vo=vo.mp3 --music=music.mp3 --out=preview.mp4
 */
import { execFileSync } from 'child_process';
import { resolve, join } from 'path';

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.slice(k.length + 3) : d;
};
const RAW = resolve(arg('raw'));
const CARDS = resolve(arg('cards'));
const VO = resolve(arg('vo'));
const MUSIC = resolve(arg('music'));
const OUT = resolve(arg('out', 'preview.mp4'));
const W = 886, H = 1920, FPS = 30;

// source segments [start, end] in raw.mp4 seconds, in story order
const SEGS = [
  [9.3, 12.0], // home
  [12.4, 16.2], // add apple by hand
  [20.4, 23.6], // add challah → plate
  [24.6, 27.6], // guide: Hamotzi (Hebrew + hear it)
  [28.2, 29.6], // guide: Hagafen
  [30.6, 31.6], // savor it
  [33.2, 34.0], // how much did you eat
  [34.6, 37.0], // Birkat Hamazon
  [38.2, 39.6], // celebration: flying Rimon
  [40.2, 42.0], // Kol hakavod
  [44.6, 46.6], // Journey: 12-day streak
  [47.6, 49.4], // Learn
];
const INTRO = 1.6, END = 2.7, XF = 0.4;
const body = SEGS.reduce((a, [s, e]) => a + (e - s), 0);
const total = INTRO + body + END - 2 * XF;
console.log(`body ${body.toFixed(1)}s, total ${total.toFixed(1)}s`);
if (total > 30) throw new Error('over 30 s');

// captions: [file, start, end] in OUTPUT seconds (narration starts at VO_AT)
const VO_AT = 0.6;
const CAPS = [
  ['cap-01', 0.7, 3.5],
  ['cap-02', 3.6, 6.3],
  ['cap-03', 6.5, 10.4],
  ['cap-04', 10.9, 15.3],
  ['cap-05', 15.8, 18.2],
  ['cap-06', 18.3, 21.7],
  ['cap-07', 21.9, 25.5],
];

const inputs = ['-i', RAW, '-loop', '1', '-t', String(INTRO + 1), '-i', join(CARDS, 'intro.png'), '-loop', '1', '-t', String(END + 1), '-i', join(CARDS, 'end.png')];
for (const [c] of CAPS) inputs.push('-loop', '1', '-i', join(CARDS, `${c}.png`));
inputs.push('-i', VO, '-i', MUSIC);
const CAP0 = 3, VO_IDX = 3 + CAPS.length, MU_IDX = VO_IDX + 1;

const f = [];
// body segments → concat
SEGS.forEach(([s, e], i) => f.push(`[0:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H},setsar=1[s${i}]`));
f.push(`${SEGS.map((_, i) => `[s${i}]`).join('')}concat=n=${SEGS.length}:v=1:a=0,settb=AVTB[body]`);
f.push(`[1:v]fps=${FPS},scale=${W}:${H},setsar=1,trim=duration=${INTRO},setpts=PTS-STARTPTS,settb=AVTB[intro]`);
f.push(`[2:v]fps=${FPS},scale=${W}:${H},setsar=1,trim=duration=${END},setpts=PTS-STARTPTS,settb=AVTB[end]`);
f.push(`[intro][body]xfade=transition=fade:duration=${XF}:offset=${(INTRO - XF).toFixed(3)},settb=AVTB[ib]`);
f.push(`[ib][end]xfade=transition=fade:duration=${XF}:offset=${(INTRO + body - 2 * XF).toFixed(3)}[base]`);
// captions with alpha fades
let cur = 'base';
CAPS.forEach(([c, a, b], i) => {
  const idx = CAP0 + i;
  f.push(`[${idx}:v]format=rgba,fade=t=in:st=${a}:d=0.25:alpha=1,fade=t=out:st=${(b - 0.25).toFixed(2)}:d=0.25:alpha=1[c${i}]`);
  f.push(`[${cur}][c${i}]overlay=0:0:enable='between(t,${a},${b})'[o${i}]`);
  cur = `o${i}`;
});
f.push(`[${cur}]format=yuv420p[v]`);
// audio: narration (normalized, delayed) + music bed under it, fade out at the end
f.push(`[${VO_IDX}:a]volume=1.6,alimiter=limit=0.85:level=false,adelay=${Math.round(VO_AT * 1000)}|${Math.round(VO_AT * 1000)},aformat=sample_fmts=fltp:channel_layouts=stereo:sample_rates=48000[vo]`);
f.push(`[${MU_IDX}:a]volume=0.16,afade=t=in:st=0:d=1,afade=t=out:st=${(total - 2.2).toFixed(2)}:d=2.2,aformat=sample_fmts=fltp:channel_layouts=stereo:sample_rates=48000[mu]`);
f.push(`[vo][mu]amix=inputs=2:duration=longest:dropout_transition=3:normalize=0[a]`);

const args = ['-v', 'error', '-y', ...inputs, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '17', '-maxrate', '12M', '-bufsize', '24M', '-r', String(FPS), '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-t', total.toFixed(3), OUT];
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log(`wrote ${OUT}`);

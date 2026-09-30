/**
 * Generate "hear it" audio for Me'ein Shalosh — all 7 insert combinations,
 * assembled by the SAME assembleMeein() the After screen renders with
 * (src/data/texts/meein.ts: every category named in both closing lines,
 * canonical order AlHamichya → AlHagefen → AlHaetz). Regenerate whenever the
 * Ari Me'ein Shalosh text changes (last: 2026-09-15 combined seal + Ari body).
 * ElevenLabs Hebrew (eleven_v3, voice Daniel), loudnormed like the six
 * brachos. LEARNING-AID pronunciations (labeled beta in the UI) — a native
 * recording pass can replace the files 1:1 later.
 *
 * Birkat Hamazon is deliberately NOT generated: the pack's sections are
 * abridged excerpts (…), so honest full audio needs a native recording.
 *
 * WEEKDAY text only: the Shabbat / Rosh Chodesh / festival lines
 * (assembleMeein's `day` argument) are not recorded — the After screen hides
 * "hear it" whenever a day line is active. Run:
 *   ENV_FILE=/path/to/group-app-ad/.env FFMPEG=/path/to/ffmpeg \
 *     node --experimental-strip-types scripts/generate-meein-audio.mjs
 * (defaults: the Windows-box paths on win32; ../group-app-ad/.env and ffmpeg
 * on PATH elsewhere), then rm public/audio/raw-*.mp3.
 * server/test/after-blessings.mjs asserts that all seven files exist.
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ARI } from '../src/data/texts/ari.ts';
import { assembleMeein } from '../src/data/texts/meein.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The key lives in the Group App .env (see reference_api_keys memory). The
// working copy sits beside group-app-ad (D:/Claude GROUP APP/ on the Windows
// box); the same sibling layout is assumed elsewhere. ENV_FILE / FFMPEG override.
const ENV_FILE =
  process.env.ENV_FILE ||
  (process.platform === 'win32' ? 'D:/Claude GROUP APP/group-app-ad/.env' : join(ROOT, '..', 'group-app-ad', '.env'));
if (!existsSync(ENV_FILE)) {
  console.error(`env file not found: ${ENV_FILE} — set ENV_FILE=/path/to/group-app-ad/.env`);
  process.exit(2);
}
const API_KEY = readFileSync(ENV_FILE, 'utf8')
  .split('\n').find((l) => l.startsWith('ELEVENLABS_API_KEY='))
  ?.split('=').slice(1).join('=').trim();
if (!API_KEY) {
  console.error(`ELEVENLABS_API_KEY missing in ${ENV_FILE}`);
  process.exit(2);
}
const WIN_FFMPEG = 'C:/Users/VR/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe';
const FFMPEG = process.env.FFMPEG && existsSync(process.env.FFMPEG)
  ? process.env.FFMPEG
  : process.platform === 'win32' && existsSync(WIN_FFMPEG)
    ? WIN_FFMPEG
    : 'ffmpeg'; // on PATH (brew / apt)

const VOICE = 'onwK4e9ZLuTAKqWW03F9'; // Daniel — same voice as the six brachos
const VS = { stability: 0.65, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true };

const ORDER = ['AlHamichya', 'AlHagefen', 'AlHaetz'];
const COMBOS = [
  ['AlHamichya'],
  ['AlHagefen'],
  ['AlHaetz'],
  ['AlHamichya', 'AlHagefen'],
  ['AlHamichya', 'AlHaetz'],
  ['AlHagefen', 'AlHaetz'],
  ['AlHamichya', 'AlHagefen', 'AlHaetz'],
];

// יְיָ is the written abbreviation; spell out אֲדֹנָי so TTS pronounces it,
// matching what generate-bracha-audio.mjs did for the six brachos.
const speak = (s) => s.replaceAll('יְיָ', 'אֲדֹנָי');

const fileFor = (combo) => `meein-${combo.map((k) => k.toLowerCase()).join('-')}`;

const OUT = join(ROOT, 'public', 'audio');
mkdirSync(OUT, { recursive: true });

for (const combo of COMBOS) {
  if (combo.some((k) => !ORDER.includes(k))) throw new Error('bad key');
  const text = speak(assembleMeein(ARI, combo).hebrew);
  const id = fileFor(combo);
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      language_code: 'he',
      voice_settings: VS,
      output_format: 'mp3_44100_96',
    }),
  });
  if (!r.ok) {
    console.error(`${id}: ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  const raw = join(OUT, `raw-${id}.mp3`);
  writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  execSync(
    `"${FFMPEG}" -y -v error -i "${raw}" -af "loudnorm=I=-18:TP=-2.0:LRA=9,silenceremove=start_periods=1:start_threshold=-45dB" -ar 44100 -b:a 96k "${join(OUT, `${id}.mp3`)}"`,
  );
  console.log(`${id} ok (${text.length} chars)`);
}
console.log('done — remember: rm public/audio/raw-*.mp3');

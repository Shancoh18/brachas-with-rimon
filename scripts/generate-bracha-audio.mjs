/**
 * Generate "hear it" audio for the six brachos + Borei Nefashos with
 * ElevenLabs (Hebrew with nikud, eleven_v3). Output: public/audio/*.mp3.
 * These are LEARNING-AID pronunciations (labeled beta in the UI) — a native
 * recording pass can replace the files 1:1 later.
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// key lives in the Group App .env (see reference_api_keys memory)
const API_KEY = readFileSync('D:/Claude GROUP APP/group-app-ad/.env', 'utf8')
  .split('\n').find((l) => l.startsWith('ELEVENLABS_API_KEY='))
  .split('=').slice(1).join('=').trim();
const FFMPEG = process.env.FFMPEG && existsSync(process.env.FFMPEG)
  ? process.env.FFMPEG
  : 'C:/Users/VR/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe';

const VOICE = 'onwK4e9ZLuTAKqWW03F9'; // Daniel — measured, warm, clear
const VS = { stability: 0.65, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true };

const OPENING = 'בָּרוּךְ אַתָּה אֲדֹנָי, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, ';

const CLIPS = [
  { id: 'hamotzi', text: OPENING + 'הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.' },
  { id: 'mezonos', text: OPENING + 'בּוֹרֵא מִינֵי מְזוֹנוֹת.' },
  { id: 'hagafen', text: OPENING + 'בּוֹרֵא פְּרִי הַגָּפֶן.' },
  { id: 'haetz', text: OPENING + 'בּוֹרֵא פְּרִי הָעֵץ.' },
  { id: 'haadama', text: OPENING + 'בּוֹרֵא פְּרִי הָאֲדָמָה.' },
  { id: 'shehakol', text: OPENING + 'שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ.' },
  {
    id: 'borei-nefashos',
    text:
      OPENING +
      'בּוֹרֵא נְפָשׁוֹת רַבּוֹת וְחֶסְרוֹנָן, עַל כָּל מַה שֶּׁבָּרָאתָ לְהַחֲיוֹת בָּהֶם נֶפֶשׁ כָּל חָי. בָּרוּךְ חֵי הָעוֹלָמִים.',
  },
];

const OUT = join(ROOT, 'public', 'audio');
mkdirSync(OUT, { recursive: true });

for (const clip of CLIPS) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: clip.text,
      model_id: 'eleven_v3',
      language_code: 'he',
      voice_settings: VS,
      output_format: 'mp3_44100_96',
    }),
  });
  if (!r.ok) {
    console.error(`${clip.id}: ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  const raw = join(OUT, `raw-${clip.id}.mp3`);
  writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  execSync(
    `"${FFMPEG}" -y -v error -i "${raw}" -af "loudnorm=I=-18:TP=-2.0:LRA=9,silenceremove=start_periods=1:start_threshold=-45dB" -ar 44100 -b:a 96k "${join(OUT, `${clip.id}.mp3`)}"`,
  );
  console.log(`${clip.id} ok`);
}
console.log('done — remember: rm public/audio/raw-*.mp3');

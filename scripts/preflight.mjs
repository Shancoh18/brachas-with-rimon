/**
 * Preflight gate — runs before ANY upload (Pages deploy, master sync, and the
 * same suite runs on Codemagic before every TestFlight build).
 *
 *   1. tsc -b --force               (client type-check)
 *   2. server/test/scenarios.mjs    (server + push mock scenarios)
 *   3. server/test/search.mjs       (food search: aliases, Hebrew, typos)
 *   … and every suite listed below — codemagic.yaml's `web_tests` steps MUST
 *   run the same list with the same flags (a suite that gates the Pages /
 *   master upload gates the store uploads too). A new suite there = its own
 *   anchored step (`- &name`) PLUS `- *name` in all three workflows; never
 *   alias the whole list (`- *web_tests` nests a list inside `scripts:` —
 *   Codemagic rejects the file and silently ignores every push; release 36).
 *
 * First, before any suite: the ICON SOURCE-OF-TRUTH guard (milliseconds, no
 * spawn). It is a check of the working tree, not a test suite, so
 * codemagic.yaml does not mirror it: master receives only trees that passed it
 * via sync-master.mjs (short of SKIP_PREFLIGHT=1).
 *
 * Called automatically by deploy-pages.mjs and sync-master.mjs; run it by hand
 * with `npm run preflight`. Escape hatch for emergencies: SKIP_PREFLIGHT=1
 * (use it consciously — it exists for production incidents, not convenience).
 *
 * The full deployed e2e (scripts/e2e.mjs, 101 asserts) still runs AFTER a
 * Pages deploy — it needs the live site. Preflight is the pre-upload gate;
 * e2e is the post-deploy proof.
 */
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const fail = (name) => {
  console.error(`\nPREFLIGHT FAILED at "${name}" — upload blocked. (SKIP_PREFLIGHT=1 overrides in an emergency.)`);
  process.exit(1);
};

const run = (name, cmd, args, { shell = false } = {}) => {
  console.log(`\npreflight → ${name}`);
  // shell only where the target is a .cmd shim (npx); node.exe must run
  // shell-less or the space in "C:\Program Files" breaks the invocation
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell });
  if (r.status !== 0) fail(name);
};

if (process.env.SKIP_PREFLIGHT === '1') {
  console.log('preflight: SKIPPED via SKIP_PREFLIGHT=1');
  process.exit(0);
}

// ONE icon source of truth (2026-10-11): the live iOS App Store icon. Every
// Android launcher, Play and PWA icon is generated from art/icon-1024.png by
// scripts/android-launcher-icons.mjs, which byte-copies the iOS master there
// and to assets/icon-only.png. Until 2026-10-11 those two still held the old
// line-art after iOS switched art, so Android, Play and the PWA shipped a
// different icon from the App Store. Any byte difference now blocks the upload.
const ICON_MASTER = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
const ICON_COPIES = ['art/icon-1024.png', 'assets/icon-only.png'];
{
  const name = 'icon source of truth (Android/Play/PWA master = iOS AppIcon)';
  console.log(`\npreflight → ${name}`);
  const read = (rel) => {
    try {
      return readFileSync(join(ROOT, rel));
    } catch {
      return null;
    }
  };
  const md5 = (buf) => createHash('md5').update(buf).digest('hex');
  const master = read(ICON_MASTER);
  if (!master) {
    console.error(`  missing ${ICON_MASTER}`);
    fail(name);
  }
  const drift = ICON_COPIES.filter((rel) => !read(rel)?.equals(master));
  if (drift.length) {
    console.error(`  ${ICON_MASTER} md5 ${md5(master)}`);
    for (const rel of drift) {
      const buf = read(rel);
      console.error(`  ${rel} ${buf ? `md5 ${md5(buf)} — differs from the iOS icon` : 'MISSING'}`);
    }
    console.error('  Fix: `node scripts/android-launcher-icons.mjs` (re-copies the master and regenerates every');
    console.error('  Android/Play/PWA icon from it). Never hand-copy one file; never use @capacitor/assets for icons.');
    fail(name);
  }
  console.log(`  ${ICON_COPIES.join(', ')} = ${ICON_MASTER} (md5 ${md5(master)})`);
  // Structural checks on the generated Android icons (not byte hashes — sharp
  // builds on other machines may encode PNGs differently): `@capacitor/assets`
  // or a template re-copy brings back the soft <inset> layout at legacy sizes.
  const RES = 'android/app/src/main/res';
  const bad = [];
  for (const xml of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const s = read(`${RES}/mipmap-anydpi-v26/${xml}`)?.toString('utf8');
    if (!s) bad.push(`${xml} missing`);
    else if (s.includes('<inset')) bad.push(`${xml} has an <inset> wrapper (soft, scaled layers)`);
  }
  const FG = { ldpi: 81, mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [d, px] of Object.entries(FG)) {
    const png = read(`${RES}/mipmap-${d}/ic_launcher_foreground.png`);
    // PNG IHDR: width/height are big-endian uint32 at bytes 16 and 20
    if (!png) bad.push(`mipmap-${d}/ic_launcher_foreground.png missing`);
    else if (png.readUInt32BE(16) !== px || png.readUInt32BE(20) !== px) {
      bad.push(`mipmap-${d}/ic_launcher_foreground.png is ${png.readUInt32BE(16)}px, needs ${px}px (108dp)`);
    }
    if (read(`${RES}/mipmap-${d}/ic_launcher_background.png`)) bad.push(`mipmap-${d}/ic_launcher_background.png is back`);
  }
  if (bad.length) {
    for (const b of bad) console.error(`  ${b}`);
    console.error('  Fix: `node scripts/android-launcher-icons.mjs`.');
    fail(name);
  }
  console.log('  Android adaptive icon: 108dp foreground layers, no <inset>, colour background');
}

// Build-mode tsc (same as `npm run build`'s check) — a bare `tsc --noEmit`
// checks NOTHING against this solution-style tsconfig (verified 2026-08-06).
// --force so a stale .tsbuildinfo can never skip the check.
run('client type-check', process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', '--force']);
run('server push/chat scenarios', process.execPath, [join(ROOT, 'server', 'test', 'scenarios.mjs')]);
// community-rules gate backfill (hotfix 2026-09-22): accounts that predate the gate are grandfathered
// once at boot, later ones stay gated, a real acceptance is never overwritten, re-running changes nothing
// --experimental-sqlite: the runner imports db.mjs (node:sqlite) directly here — the flag is a no-op on
// Node ≥ 22.13 and required below it (the other suites spawn the server with it; server/package.json too)
run('terms-gate backfill (pre-gate accounts grandfathered)', process.execPath, ['--experimental-sqlite', join(ROOT, 'server', 'test', 'terms-backfill.mjs')]);
// photo identification under launch load: dropped uploads free their slot, failures refunded,
// global_limit code, 529 retry, per-route rate-limit buckets (mock Anthropic — never spends)
run('vision capacity (photo slots, quotas, rate limits)', process.execPath, [join(ROOT, 'server', 'test', 'vision-capacity.mjs')]);
// food search: alias keys must resolve and Hebrew/typo lookups must land on the
// RIGHT entry — a mis-aimed alias would show a user the wrong bracha
run('food search + aliases', process.execPath, ['--experimental-strip-types', join(ROOT, 'server', 'test', 'search.mjs')]);
// model-written text guard: cite-tag stripping + refusal detection for every reading surface
run('content guard (daily thought / learned notes)', process.execPath, [join(ROOT, 'server', 'test', 'content-guard.mjs')]);
// daily thought v4: chabad.org's dated Daily Wisdom page via web_fetch, verified on the page itself
// (canonical lesson, today's date line, the report's URL) — every reject rule + a pause_turn continuation
run('daily thought (Daily Wisdom lookup + page checks)', process.execPath, [join(ROOT, 'server', 'test', 'daily-thought.mjs')]);
// streak rules incl. the Shabbat grace (Fri -> Sun keeps the streak)
run('streak + progress rules', process.execPath, ['--experimental-strip-types', join(ROOT, 'server', 'test', 'progress.mjs')]);
// Me'ein Shalosh closing names every category + Ari body = chabad.org + learned after-brachos never dropped
run("after-blessings (Me'ein Shalosh text + resolver)", process.execPath, ['--experimental-strip-types', join(ROOT, 'server', 'test', 'after-blessings.mjs')]);
// kedima order + exemptions: Hamotzi covers the meal, wine's Hagafen covers the other drinks
run('before-blessings (kedima order + exemptions)', process.execPath, ['--experimental-strip-types', join(ROOT, 'server', 'test', 'brachos.mjs')]);

console.log('\nPREFLIGHT: ALL GREEN — clear to upload.');

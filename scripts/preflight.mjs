/**
 * Preflight gate — runs before ANY upload (Pages deploy, master sync, and the
 * same suite runs on Codemagic before every TestFlight build).
 *
 *   1. tsc -b --force               (client type-check)
 *   2. server/test/scenarios.mjs    (server + push mock scenarios)
 *   3. server/test/search.mjs       (food search: aliases, Hebrew, typos)
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
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const run = (name, cmd, args, { shell = false } = {}) => {
  console.log(`\npreflight → ${name}`);
  // shell only where the target is a .cmd shim (npx); node.exe must run
  // shell-less or the space in "C:\Program Files" breaks the invocation
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell });
  if (r.status !== 0) {
    console.error(`\nPREFLIGHT FAILED at "${name}" — upload blocked. (SKIP_PREFLIGHT=1 overrides in an emergency.)`);
    process.exit(1);
  }
};

if (process.env.SKIP_PREFLIGHT === '1') {
  console.log('preflight: SKIPPED via SKIP_PREFLIGHT=1');
  process.exit(0);
}

// Build-mode tsc (same as `npm run build`'s check) — a bare `tsc --noEmit`
// checks NOTHING against this solution-style tsconfig (verified 2026-08-06).
// --force so a stale .tsbuildinfo can never skip the check.
run('client type-check', process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', '--force']);
run('server push/chat scenarios', process.execPath, [join(ROOT, 'server', 'test', 'scenarios.mjs')]);
// food search: alias keys must resolve and Hebrew/typo lookups must land on the
// RIGHT entry — a mis-aimed alias would show a user the wrong bracha
run('food search + aliases', process.execPath, ['--experimental-strip-types', join(ROOT, 'server', 'test', 'search.mjs')]);

console.log('\nPREFLIGHT: ALL GREEN — clear to upload.');

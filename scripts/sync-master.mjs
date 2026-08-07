/**
 * Sync local master source to GitHub via the git-data API (git push hangs on
 * this machine). Builds a full tree from the working copy (minus .git,
 * node_modules, dist) as a child of the current remote master head.
 */
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const REPO = 'repos/Shancoh18/brachas-with-rimon';
const ROOT = 'D:/Claude GROUP APP/bracha-app';

// Preflight gate: every master sync fires a TestFlight build, so nothing
// broken should ever reach GitHub. SKIP_PREFLIGHT=1 = emergency hatch.
execFileSync('node', ['scripts/preflight.mjs'], { cwd: ROOT, stdio: 'inherit' });
// .claude = local harness config/worktrees — never publish, and a half-removed
// worktree inside it can EPERM the walk
const SKIP = new Set(['.git', '.github', 'node_modules', 'dist', '.env', '.env.local', '.claude']);
// generated iOS artifacts (also git-ignored); the exFAT drive can wedge these
const SKIP_PATHS = new Set([
  'ios/App/App/public',
  'ios/capacitor-cordova-ios-plugins',
  'ios/App/Pods',
  'ios/App/build',
  'ios/App/output',
  'ios/DerivedData',
  'ios/App/App/capacitor.config.json',
  'ios/App/App/config.xml',
  'ios-wedged',
  // SQLite data dirs (real + test) — private keys + user PII, NEVER publish.
  // The repo is public; on 2026-08-06 the audit found these had shipped.
  'server/data',
  'server/data-test',
]);
// Secret-class FILENAMES — a defense-in-depth net so a new .env/.p8/.db/.key
// anywhere in the tree can never be published even if its dir isn't SKIP'd.
// The repo is PUBLIC, so this gate is load-bearing, not hygiene.
const SKIP_FILE_RE = /\.(bak|p8|pem|key|db|db-wal|db-shm|sqlite3?|mobileprovision|p12|cer)$/i;
const isSecretFile = (name) =>
  SKIP_FILE_RE.test(name) || (name.startsWith('.env') && name !== '.env.example');

const gh = (args, input) => {
  const out = execFileSync('gh', ['api', ...args], {
    input: input ? JSON.stringify(input) : undefined,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out ? JSON.parse(out) : {};
};

const files = [];
const walk = (dir) => {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    console.warn(`skip unreadable dir: ${dir}`);
    return;
  }
  for (const name of names) {
    if (SKIP.has(name) || isSecretFile(name)) continue;
    const p = join(dir, name);
    if (SKIP_PATHS.has(relative(ROOT, p).replace(/\\/g, '/'))) continue;
    let st;
    try {
      st = statSync(p);
    } catch {
      console.warn(`skip unreadable: ${p}`);
      continue;
    }
    if (st.isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(ROOT);
console.log(`${files.length} files`);

const head = gh([`${REPO}/git/refs/heads/master`]);
console.log('remote master:', head.object.sha);

// Incremental: git blob sha = sha1("blob <len>\0" + content). Anything whose
// sha already exists in the remote tree needs NO upload — this keeps the run
// to a handful of POSTs instead of ~1500 (which trips secondary rate limits).
const headCommit = gh([`${REPO}/git/commits/${head.object.sha}`]);
const remoteTree = gh([`${REPO}/git/trees/${headCommit.tree.sha}?recursive=1`]);
const remoteShas = new Set((remoteTree.tree ?? []).map((e) => e.sha));

const treeEntries = [];
let uploaded = 0;
for (const p of files) {
  const rel = relative(ROOT, p).replace(/\\/g, '/');
  const buf = readFileSync(p);
  const sha = createHash('sha1')
    .update(`blob ${buf.length}\0`)
    .update(buf)
    .digest('hex');
  if (!remoteShas.has(sha)) {
    const blob = gh(['-X', 'POST', `${REPO}/git/blobs`, '--input', '-'], {
      content: buf.toString('base64'),
      encoding: 'base64',
    });
    if (blob.sha !== sha) throw new Error(`sha mismatch for ${rel}`);
    uploaded++;
  }
  treeEntries.push({ path: rel, mode: '100644', type: 'blob', sha });
}
console.log(`blobs done (${uploaded} uploaded, ${files.length - uploaded} reused)`);

const tree = gh(['-X', 'POST', `${REPO}/git/trees`, '--input', '-'], { tree: treeEntries });
const message = execFileSync('git', ['-C', ROOT, 'log', '-1', '--pretty=%B'], {
  encoding: 'utf8',
}).trim();
const commit = gh(['-X', 'POST', `${REPO}/git/commits`, '--input', '-'], {
  message,
  tree: tree.sha,
  parents: [head.object.sha],
});
gh(['-X', 'PATCH', `${REPO}/git/refs/heads/master`, '--input', '-'], { sha: commit.sha, force: false });
console.log('master updated →', commit.sha);

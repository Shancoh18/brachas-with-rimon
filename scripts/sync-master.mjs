/**
 * Sync local master source to GitHub via the git-data API (git push hangs on
 * this machine). Builds a full tree from the working copy (minus .git,
 * node_modules, dist) as a child of the current remote master head.
 */
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const REPO = 'repos/Shancoh18/brachas-with-rimon';
const ROOT = 'D:/Claude GROUP APP/bracha-app';
const SKIP = new Set(['.git', '.github', 'node_modules', 'dist']);

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
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(ROOT);
console.log(`${files.length} files`);

const head = gh([`${REPO}/git/refs/heads/master`]);
console.log('remote master:', head.object.sha);

const treeEntries = [];
for (const p of files) {
  const rel = relative(ROOT, p).replace(/\\/g, '/');
  const blob = gh(['-X', 'POST', `${REPO}/git/blobs`, '--input', '-'], {
    content: readFileSync(p).toString('base64'),
    encoding: 'base64',
  });
  treeEntries.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
}
console.log('blobs done');

const tree = gh(['-X', 'POST', `${REPO}/git/trees`, '--input', '-'], { tree: treeEntries });
const commit = gh(['-X', 'POST', `${REPO}/git/commits`, '--input', '-'], {
  message:
    'Polish pass: hear-it audio, webp mascots, PWA offline, streak welcome, activity strip; licensed nusach texts; gamification\n\nCo-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>',
  tree: tree.sha,
  parents: [head.object.sha],
});
gh(['-X', 'PATCH', `${REPO}/git/refs/heads/master`, '--input', '-'], { sha: commit.sha, force: false });
console.log('master updated →', commit.sha);

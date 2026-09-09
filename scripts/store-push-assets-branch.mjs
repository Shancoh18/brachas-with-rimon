/**
 * Publish store assets to a throwaway branch of the (public) app repo via the GitHub git-data API,
 * so App Store Connect's uploader (which runs in the browser) can fetch them cross-origin from
 * raw.githubusercontent.com (CORS *). Delete the branch afterwards with --delete.
 *
 *   node push-store-assets.mjs --dir=<folder with files> [--branch=store-assets] [--prefix=store]
 *   node push-store-assets.mjs --delete [--branch=store-assets]
 */
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const REPO = 'repos/Shancoh18/brachas-with-rimon';
const arg = (k, d) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const BRANCH = arg('branch', 'store-assets');
const PREFIX = arg('prefix', 'store');
const gh = (args, body) => {
  const out = execFileSync('gh', ['api', ...args], { input: body ? JSON.stringify(body) : undefined, maxBuffer: 1 << 28 }).toString();
  return out ? JSON.parse(out) : null;
};

if (process.argv.includes('--delete')) {
  execFileSync('gh', ['api', '-X', 'DELETE', `${REPO}/git/refs/heads/${BRANCH}`], { stdio: 'inherit' });
  console.log(`deleted branch ${BRANCH}`);
  process.exit(0);
}

const DIR = resolve(arg('dir'));
const files = readdirSync(DIR).filter((f) => /\.(png|jpg|jpeg|mp4|mov)$/i.test(f) && statSync(join(DIR, f)).isFile());
if (!files.length) throw new Error('no files');
const master = gh([`${REPO}/git/refs/heads/master`]);
const tree = [];
for (const f of files) {
  const content = readFileSync(join(DIR, f)).toString('base64');
  const blob = gh(['-X', 'POST', `${REPO}/git/blobs`, '--input', '-'], { content, encoding: 'base64' });
  tree.push({ path: `${PREFIX}/${f}`, mode: '100644', type: 'blob', sha: blob.sha });
  console.log(`blob ${f} ${blob.sha.slice(0, 7)}`);
}
const newTree = gh(['-X', 'POST', `${REPO}/git/trees`, '--input', '-'], { tree }); // orphan-style: only the assets
const commit = gh(['-X', 'POST', `${REPO}/git/commits`, '--input', '-'], {
  message: `store assets ${new Date().toISOString().slice(0, 10)} (temporary branch for the App Store Connect upload)`,
  tree: newTree.sha,
  parents: [master.object.sha],
});
let ref;
try {
  ref = gh(['-X', 'PATCH', `${REPO}/git/refs/heads/${BRANCH}`, '--input', '-'], { sha: commit.sha, force: true });
} catch {
  ref = gh(['-X', 'POST', `${REPO}/git/refs`, '--input', '-'], { ref: `refs/heads/${BRANCH}`, sha: commit.sha });
}
console.log(`branch ${BRANCH} → ${commit.sha.slice(0, 7)}`);
for (const f of files) console.log(`https://raw.githubusercontent.com/Shancoh18/brachas-with-rimon/${BRANCH}/${PREFIX}/${f}`);

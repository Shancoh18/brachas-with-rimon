/**
 * Publish bracha-app/dist to the gh-pages branch via the GitHub git-data API
 * (avoids git push, which hangs on this machine, and avoids Actions, which
 * the token's scopes don't cover).
 */
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// Build first — IN-PROCESS args, because Git Bash mangles leading-slash args
// (--base=/x/ became a Windows path once and shipped a blank site).
execFileSync('node', ['node_modules/vite/bin/vite.js', 'build', '--base=./'], { cwd: 'D:/Claude GROUP APP/bracha-app', stdio: 'inherit' });

const REPO = 'repos/Shancoh18/brachas-with-rimon';
const DIST = 'D:/Claude GROUP APP/bracha-app/dist';

const gh = (args, input) =>
  JSON.parse(
    execFileSync('gh', ['api', ...args], {
      input: input ? JSON.stringify(input) : undefined,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  );

// collect files
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(DIST);
console.log(`${files.length} files to publish`);

// 1. blobs
const treeEntries = [];
for (const p of files) {
  const rel = relative(DIST, p).replace(/\\/g, '/');
  const content = readFileSync(p);
  const blob = gh(['-X', 'POST', `${REPO}/git/blobs`, '--input', '-'], {
    content: content.toString('base64'),
    encoding: 'base64',
  });
  treeEntries.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
  console.log(`  blob ${rel} (${(content.length / 1024).toFixed(0)} KB)`);
}

// 2. tree
const tree = gh(['-X', 'POST', `${REPO}/git/trees`, '--input', '-'], { tree: treeEntries });
console.log('tree', tree.sha);

// 3. orphan commit
const commit = gh(['-X', 'POST', `${REPO}/git/commits`, '--input', '-'], {
  message: 'Deploy Brachas with Rimon to GitHub Pages\n\nCo-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>',
  tree: tree.sha,
  parents: [],
});
console.log('commit', commit.sha);

// 4. gh-pages ref (create or force-update)
try {
  gh(['-X', 'POST', `${REPO}/git/refs`, '--input', '-'], {
    ref: 'refs/heads/gh-pages',
    sha: commit.sha,
  });
  console.log('created refs/heads/gh-pages');
} catch {
  gh(['-X', 'PATCH', `${REPO}/git/refs/heads/gh-pages`, '--input', '-'], {
    sha: commit.sha,
    force: true,
  });
  console.log('updated refs/heads/gh-pages');
}

// 5. enable Pages from the branch
try {
  gh(['-X', 'POST', `${REPO}/pages`, '--input', '-'], {
    source: { branch: 'gh-pages', path: '/' },
  });
  console.log('Pages enabled');
} catch (e) {
  try {
    gh(['-X', 'PUT', `${REPO}/pages`, '--input', '-'], {
      source: { branch: 'gh-pages', path: '/' },
    });
    console.log('Pages source updated');
  } catch (e2) {
    console.log('Pages config note:', String(e2).slice(0, 160));
  }
}

const pages = gh([`${REPO}/pages`]);
console.log('PAGES URL:', pages.html_url, '| status:', pages.status);

/**
 * Publish bracha-app/dist to the gh-pages branch via the GitHub git-data API
 * (avoids git push, which hangs on this machine, and avoids Actions, which
 * the token's scopes don't cover).
 */
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// Preflight gate: type-check + server push/chat scenario suite. A deploy that
// fails these never reaches the live site. SKIP_PREFLIGHT=1 = emergency hatch.
execFileSync('node', ['scripts/preflight.mjs'], { cwd: 'D:/Claude GROUP APP/bracha-app', stdio: 'inherit' });

// Build — IN-PROCESS args, because Git Bash mangles leading-slash args
// (--base=/x/ became a Windows path once and shipped a blank site).
execFileSync('node', ['node_modules/vite/bin/vite.js', 'build', '--base=./'], { cwd: 'D:/Claude GROUP APP/bracha-app', stdio: 'inherit' });

const REPO = 'repos/Shancoh18/brachas-with-rimon';
const DIST = 'D:/Claude GROUP APP/bracha-app/dist';

/**
 * Every call retries on transient network faults. Uploading the mascot videos
 * over a flaky link failed four deploys in a row on 2026-08-02 with
 * "TLS handshake timeout" / "http2: client conn could not be established" —
 * one hiccup used to abandon the whole publish.
 */
const gh = (args, input, attempts = 4) => {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return JSON.parse(
        execFileSync('gh', ['api', ...args], {
          input: input ? JSON.stringify(input) : undefined,
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        }),
      );
    } catch (e) {
      lastErr = e;
      const msg = String(e.stderr ?? e.message ?? '');
      const transient = /timeout|connection|conn could not|TLS handshake|EOF|reset by peer|502|503|504/i.test(msg);
      if (!transient || i === attempts) throw e;
      const waitMs = 2000 * 2 ** (i - 1); // 2s, 4s, 8s
      console.log(`  ↻ transient network fault (attempt ${i}/${attempts}), retrying in ${waitMs / 1000}s`);
      execFileSync('node', ['-e', `setTimeout(()=>{}, ${waitMs})`]);
    }
  }
  throw lastErr;
};

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

// 1. blobs — INCREMENTAL. git blob sha = sha1("blob <len>\0" + content), so
// anything already present in the previous gh-pages tree needs no upload.
// Re-uploading everything (the old behaviour) meant ~4 MB of base64 per deploy,
// where a single dropped connection lost the entire publish. Unchanged assets
// (mascot videos, audio, icons) now cost zero bytes.
let remoteShas = new Set();
try {
  const head = gh([`${REPO}/git/refs/heads/gh-pages`]);
  const headCommit = gh([`${REPO}/git/commits/${head.object.sha}`]);
  const remoteTree = gh([`${REPO}/git/trees/${headCommit.tree.sha}?recursive=1`]);
  remoteShas = new Set((remoteTree.tree ?? []).map((e) => e.sha));
} catch {
  console.log('  (no existing gh-pages tree — first publish, uploading everything)');
}

const treeEntries = [];
let uploaded = 0;
let uploadedKB = 0;
for (const p of files) {
  const rel = relative(DIST, p).replace(/\\/g, '/');
  const content = readFileSync(p);
  const sha = createHash('sha1')
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest('hex');
  if (!remoteShas.has(sha)) {
    const blob = gh(['-X', 'POST', `${REPO}/git/blobs`, '--input', '-'], {
      content: content.toString('base64'),
      encoding: 'base64',
    });
    if (blob.sha !== sha) throw new Error(`sha mismatch for ${rel}`);
    uploaded++;
    uploadedKB += content.length / 1024;
    console.log(`  ↑ ${rel} (${(content.length / 1024).toFixed(0)} KB)`);
  }
  treeEntries.push({ path: rel, mode: '100644', type: 'blob', sha });
}
console.log(
  `blobs done (${uploaded} uploaded, ${files.length - uploaded} reused, ${uploadedKB.toFixed(0)} KB sent)`,
);

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

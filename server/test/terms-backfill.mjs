/**
 * Community-rules gate backfill (hotfix 2026-09-22): accounts that existed
 * before the gate went live are stamped once at boot; later accounts stay
 * gated; a real acceptance is never overwritten; re-running changes nothing.
 * Run: node --experimental-sqlite server/test/terms-backfill.mjs
 */
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { openDb } from '../db.mjs';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};
const GATE = Date.parse('2026-09-22T17:40:00Z');
const dir = mkdtempSync(join(tmpdir(), 'terms-backfill-'));
let db = openDb(dir);
const ins = db.prepare('INSERT INTO users (id,name,code,created) VALUES (?,?,?,?)');
ins.run('old1', 'Old One', 'RIMON-OLD1', GATE - 86_400_000);
ins.run('old2', 'Old Two', 'RIMON-OLD2', GATE - 1);
ins.run('new1', 'New One', 'RIMON-NEW1', GATE + 1);
db.prepare('UPDATE users SET terms_accepted_at = ? WHERE id = ?').run(GATE + 5000, 'old2');
db.close();

db = openDb(dir); // second boot → migration + backfill
const at = (id) => db.prepare('SELECT terms_accepted_at t FROM users WHERE id = ?').get(id).t;
check('account created before the gate is grandfathered (stamped at the gate time)', at('old1') === GATE, String(at('old1')));
check('an explicit acceptance is never overwritten', at('old2') === GATE + 5000, String(at('old2')));
check('account created after the gate stays gated', at('new1') === null, String(at('new1')));
db.close();
db = openDb(dir); // third boot → no change
check('backfill is idempotent', at('old1') === GATE && at('old2') === GATE + 5000 && at('new1') === null);
db.close();
rmSync(dir, { recursive: true, force: true });
console.log(failures ? `TERMS-BACKFILL: ${failures} FAILED` : 'TERMS-BACKFILL: ALL PASS');
process.exit(failures ? 1 : 0);

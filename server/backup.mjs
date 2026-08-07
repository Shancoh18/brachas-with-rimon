/**
 * Off-volume encrypted DB backup — defends against total loss of the Railway
 * volume (the single copy of every account). Once a day (and once at boot) it:
 *   1. VACUUM INTOs a clean snapshot of the live DB to /tmp (safe on WAL),
 *   2. encrypts it with AES-256-GCM (the DB holds emails + password hashes),
 *   3. commits it to a PRIVATE GitHub repo via the contents API,
 *   4. prunes backups older than the retention window.
 *
 * DISABLED until three Railway variables are set (mirrors the APNs pattern —
 * ships inert, activates on config):
 *   BACKUP_KEY   — 64 hex chars (32 bytes). Generate: openssl rand -hex 32
 *   BACKUP_REPO  — "owner/name" of a PRIVATE repo to hold the backups
 *   BACKUP_TOKEN — a GitHub PAT with `repo` scope on that private repo
 *
 * Restore (manual, off this file's decrypt): fetch the .enc + .iv+tag, then
 * decryptBackup() below. Kept dependency-free (node:crypto + fetch).
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const KEY_HEX = (process.env.BACKUP_KEY || '').trim();
const REPO = (process.env.BACKUP_REPO || '').trim();
const TOKEN = (process.env.BACKUP_TOKEN || '').trim();
const RETAIN_DAYS = Number(process.env.BACKUP_RETAIN_DAYS || 14);

let key = null;
if (KEY_HEX && REPO && TOKEN) {
  if (/^[0-9a-f]{64}$/i.test(KEY_HEX)) key = Buffer.from(KEY_HEX, 'hex');
  else console.error('BACKUP_KEY must be 64 hex chars (32 bytes) — backups DISABLED');
}

export const backupReady = () => !!key;

/** AES-256-GCM. Output layout: [12-byte iv][16-byte tag][ciphertext]. */
const encrypt = (plain) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
};

/** Inverse of encrypt — exported for restore tooling/tests. */
export const decryptBackup = (blob, keyHex = KEY_HEX) => {
  const k = Buffer.from(keyHex, 'hex');
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const decipher = createDecipheriv('aes-256-gcm', k, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
};

const gh = async (method, path, body) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'rimon-backup',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null; // caller distinguishes missing from error
  if (!res.ok) throw new Error(`GitHub ${method} ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

/**
 * Run one backup. `db` is the open node:sqlite handle; `dataDir` gives a temp
 * location. Resolves quietly; never throws into the caller (logs instead).
 */
export async function runBackup(db, dataDir, stampDay) {
  if (!key) return;
  const tmp = join(dataDir, `backup-${stampDay}.db`);
  try {
    if (existsSync(tmp)) unlinkSync(tmp);
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const enc = encrypt(readFileSync(tmp));
    const path = `backups/rimon-${stampDay}.db.enc`;
    // upsert (contents API needs the blob sha if the file already exists)
    const existing = await gh('GET', `/contents/${path}`);
    await gh('PUT', `/contents/${path}`, {
      message: `backup ${stampDay} (${enc.length} bytes, sha256 ${createHash('sha256').update(enc).digest('hex').slice(0, 12)})`,
      content: enc.toString('base64'),
      ...(existing?.sha ? { sha: existing.sha } : {}),
    });
    console.log(`backup: uploaded ${path} (${enc.length} bytes)`);
    await prune();
  } catch (e) {
    console.error(`backup FAILED (${stampDay}): ${e.message}`);
  } finally {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
  }
}

/** Delete backups older than the retention window. */
async function prune() {
  try {
    const list = await gh('GET', '/contents/backups');
    if (!Array.isArray(list)) return;
    const cutoff = Date.now() - RETAIN_DAYS * 86_400_000;
    for (const f of list) {
      const m = f.name.match(/rimon-(\d{4}-\d{2}-\d{2})\.db\.enc$/);
      if (m && new Date(m[1]).getTime() < cutoff) {
        await gh('DELETE', `/contents/${f.path}`, { message: `prune ${f.name}`, sha: f.sha });
        console.log(`backup: pruned ${f.name}`);
      }
    }
  } catch (e) {
    console.error(`backup prune failed: ${e.message}`);
  }
}

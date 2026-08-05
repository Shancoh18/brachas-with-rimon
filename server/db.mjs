/**
 * SQLite data layer (node:sqlite — no native deps, no compile step).
 *
 * Replaces the users.json / learned-foods.json blobs. Why it matters at scale:
 *  - writes are transactional and durable (WAL), so a redeploy mid-write can
 *    no longer truncate every account,
 *  - a mutation costs one row, not a re-serialization of the whole dataset,
 *  - lookups are indexed instead of full scans.
 *
 * Security note: session tokens are stored ONLY as sha256 digests. Reading the
 * database file no longer hands over live sessions. The migration hashes the
 * old plaintext tokens, so everyone stays signed in on their device.
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export const tokenHash = (t) => createHash('sha256').update(String(t)).digest('hex');
const newId = () => randomBytes(12).toString('hex');

export function openDb(dataDir) {
  const db = new DatabaseSync(join(dataDir, 'rimon.db'));
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT,
      code        TEXT NOT NULL UNIQUE,
      pass_salt   TEXT,
      pass_hash   TEXT,
      apple_sub   TEXT,
      google_sub  TEXT,
      progress    TEXT,
      push        TEXT,
      created     INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email  ON users(email)      WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS users_apple  ON users(apple_sub)  WHERE apple_sub IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS users_google ON users(google_sub) WHERE google_sub IS NOT NULL;

    CREATE TABLE IF NOT EXISTS tokens (
      hash    TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id);

    CREATE TABLE IF NOT EXISTS friends (
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created   INTEGER NOT NULL,
      PRIMARY KEY (user_id, friend_id)
    );

    -- named leaderboards anyone can create and share by code
    CREATE TABLE IF NOT EXISTS boards (
      id       TEXT PRIMARY KEY,
      code     TEXT NOT NULL UNIQUE,
      title    TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS board_members (
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined   INTEGER NOT NULL,
      PRIMARY KEY (board_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS board_members_user ON board_members(user_id);

    CREATE TABLE IF NOT EXISTS learned_foods (
      key   TEXT PRIMARY KEY,
      entry TEXT NOT NULL,
      added INTEGER NOT NULL
    );
  `);
  return db;
}

/** One-time import of the legacy JSON blobs. Idempotent and non-destructive. */
export function migrateFromJson(db, dataDir) {
  const usersFile = join(dataDir, 'users.json');
  const learnedFile = join(dataDir, 'learned-foods.json');
  // Learned foods import independently of the account import: it must survive
  // a crash between the two, and it is idempotent (INSERT OR IGNORE + rename).
  if (existsSync(learnedFile)) {
    try {
      const entries = JSON.parse(readFileSync(learnedFile, 'utf8'));
      const ins = db.prepare('INSERT OR IGNORE INTO learned_foods (key,entry,added) VALUES (?,?,?)');
      for (const e of entries) if (e?.key) ins.run(e.key, JSON.stringify(e), Date.now());
      renameSync(learnedFile, learnedFile + '.migrated');
      console.log(`migration: imported ${entries.length} learned foods`);
    } catch (e) {
      console.error(`migration: learned-foods.json skipped (${e.message})`);
    }
  }

  const already = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (already > 0 || !existsSync(usersFile)) return { migrated: 0 };

  let legacy;
  try {
    legacy = JSON.parse(readFileSync(usersFile, 'utf8'));
  } catch (e) {
    // Fail LOUDLY. Serving an empty account table would sign everyone out, and
    // the first new signup would then satisfy the `already > 0` guard and stop
    // this import from ever running again. Crash-looping is recoverable.
    throw new Error(
      `users.json present but unreadable (${e.message}) — refusing to boot with an empty account table; repair it or move it aside`,
    );
  }

  const insUser = db.prepare(
    `INSERT INTO users (id,name,email,code,pass_salt,pass_hash,apple_sub,google_sub,progress,push,created)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insToken = db.prepare('INSERT OR IGNORE INTO tokens (hash,user_id,created) VALUES (?,?,?)');
  const insFriend = db.prepare('INSERT OR IGNORE INTO friends (user_id,friend_id,created) VALUES (?,?,?)');

  const byCode = new Map(); // legacy friend code -> new user id
  // one record per friend code (the legacy primary key); a duplicated code
  // would otherwise abort the whole import on the UNIQUE index
  const rows = [];
  const seenCode = new Set();
  let skipped = 0;
  for (const [t, u] of Object.entries(legacy)) {
    if (!u || typeof u !== 'object' || !u.code || seenCode.has(u.code)) {
      skipped++;
      console.error(`migration: SKIPPED legacy record ${u?.code ?? t} (missing or duplicate code)`);
      continue;
    }
    seenCode.add(u.code);
    rows.push([t, u]);
  }
  if (skipped) console.error(`migration: ${skipped} legacy record(s) skipped — see lines above`);

  // Email/provider ids are unique in the new schema but were never enforced in
  // JSON. Decide up front WHICH record keeps a contested value: the one that
  // can actually sign in with it (has a password), else the oldest.
  const bestFor = (pick) => {
    const owner = new Map();
    for (const [, u] of rows) {
      const v = pick(u);
      if (!v) continue;
      const cur = owner.get(v);
      if (!cur) owner.set(v, u);
      else {
        const better = (!!u.pass && !cur.pass) || (!!u.pass === !!cur.pass && (u.created ?? 0) < (cur.created ?? 0));
        if (better) owner.set(v, u);
      }
    }
    return owner;
  };
  const emailOwner = bestFor((u) => u.email);
  const appleOwner = bestFor((u) => u.apple);
  const googleOwner = bestFor((u) => u.google);

  db.exec('BEGIN');
  try {
    // pass 1 — accounts (+ their existing sessions, hashed so nobody logs out)
    for (const [rawToken, u] of rows) {
      const id = newId();
      byCode.set(u.code, id);
      insUser.run(
        id,
        String(u.name ?? 'Friend').slice(0, 20),
        emailOwner.get(u.email) === u ? u.email : null,
        u.code,
        u.pass?.salt ?? null,
        u.pass?.hash ?? null,
        appleOwner.get(u.apple) === u ? u.apple : null,
        googleOwner.get(u.google) === u ? u.google : null,
        u.progress ? JSON.stringify(u.progress) : null,
        u.push ? JSON.stringify(u.push) : null,
        u.created ?? Date.now(),
      );
      if (/^[0-9a-f]{48}$/.test(rawToken)) insToken.run(tokenHash(rawToken), id, Date.now());
    }
    // pass 2 — friendships, once every id exists
    for (const [, u] of rows) {
      const me = byCode.get(u.code);
      for (const code of u.friends ?? []) {
        const other = byCode.get(code);
        if (other && other !== me) insFriend.run(me, other, Date.now());
      }
    }
    // Refuse to half-import: a mismatch rolls everything back, leaves
    // users.json untouched, and the next boot retries from scratch.
    const got = db.prepare('SELECT COUNT(*) n FROM users').get().n;
    if (got !== rows.length) throw new Error(`imported ${got} of ${rows.length} accounts`);
    db.exec('COMMIT');
    // synchronous=NORMAL doesn't fsync on commit — force the WAL to disk
    // BEFORE the legacy file is touched, so a power loss can't lose both.
    db.exec('PRAGMA wal_checkpoint(FULL)');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error(`migration FAILED, rolled back — users.json left intact: ${e.message}`);
    throw e;
  }

  // Keep a backup of the account data — but REDACT the raw-token keys, or the
  // .migrated file would carry every live session forever and re-open the
  // exact exposure this migration closes. The records are keyed by friend
  // code instead (unique, non-secret); sessions live on as hashes in `tokens`.
  let redactedWritten = false;
  try {
    // Every legacy entry goes in — including ones the import skipped (bad
    // shape, duplicate code) — so the backup is complete even for records
    // that didn't make it into SQLite.
    const redacted = {};
    let n = 0;
    for (const [rawKey, u] of Object.entries(legacy)) {
      const isTok = /^[0-9a-f]{48}$/.test(rawKey);
      const rec = u && typeof u === 'object' ? { ...u } : u;
      if (isTok && rec && typeof rec === 'object') rec.tokenSha256 = tokenHash(rawKey);
      const key = rec?.code && !(rec.code in redacted) ? rec.code : isTok ? `entry_${n}` : rawKey;
      redacted[key] = rec;
      n++;
    }
    writeFileSync(usersFile + '.migrated', JSON.stringify(redacted));
    redactedWritten = true;
    unlinkSync(usersFile);
  } catch (e) {
    if (redactedWritten) {
      // The redacted backup exists; only the raw file's removal failed. NEVER
      // rename raw over the redacted copy — retry the delete and warn.
      try { unlinkSync(usersFile); } catch {
        console.error('WARNING: users.json (raw tokens) could not be removed; redacted backup exists — delete it manually');
      }
    } else {
      // Redaction itself failed — last resort: keep the data via plain rename,
      // but say loudly that the backup still holds RAW tokens.
      console.error(`backup redaction FAILED (${e.message}) — falling back to raw rename; scrub users.json.migrated manually`);
      try { renameSync(usersFile, usersFile + '.migrated'); } catch {}
    }
  }

  console.log(`migration: imported ${rows.length} accounts into SQLite`);
  return { migrated: rows.length };
}

export { newId };

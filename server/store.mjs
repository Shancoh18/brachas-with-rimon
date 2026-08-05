/**
 * Data access for the Brachas API. Every query is a prepared statement against
 * SQLite (see db.mjs). The rest of the server never touches SQL directly.
 */
import { randomBytes } from 'crypto';
import { openDb, migrateFromJson, tokenHash, newId } from './db.mjs';

let db;

export function initStore(dataDir) {
  db = openDb(dataDir);
  migrateFromJson(db, dataDir);
  return db;
}

const parse = (s, fallback = null) => {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
/** DB row -> the shape the API works with. */
const hydrate = (r) =>
  !r ? null : {
    id: r.id,
    name: r.name,
    email: r.email,
    code: r.code,
    pass: r.pass_salt && r.pass_hash ? { salt: r.pass_salt, hash: r.pass_hash } : null,
    apple: r.apple_sub,
    google: r.google_sub,
    progress: parse(r.progress),
    push: parse(r.push),
    created: r.created,
  };

// ------------------------------------------------------------------ lookups
export const userByToken = (rawToken) => {
  if (!/^[0-9a-f]{48}$/.test(String(rawToken || ''))) return null;
  const row = db
    .prepare('SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.hash = ?')
    .get(tokenHash(rawToken));
  return hydrate(row);
};
export const userByEmail = (email) =>
  hydrate(db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase()));
export const userByCode = (code) =>
  hydrate(db.prepare('SELECT * FROM users WHERE code = ?').get(String(code || '').toUpperCase()));
export const userById = (id) => hydrate(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
export const userByProvider = (provider, sub) =>
  hydrate(
    db.prepare(`SELECT * FROM users WHERE ${provider === 'apple' ? 'apple_sub' : 'google_sub'} = ?`).get(String(sub)),
  );
export const emailTaken = (email) =>
  !!db.prepare('SELECT 1 FROM users WHERE email = ?').get(String(email || '').toLowerCase());
export const userCount = () => db.prepare('SELECT COUNT(*) n FROM users').get().n;

// ------------------------------------------------------------------ writes
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomFrom = (n, chars = CODE_CHARS) => {
  let s = '';
  for (let i = 0; i < n; i++) s += chars[randomBytes(1)[0] % chars.length];
  return s;
};
export const freshFriendCode = () => {
  for (let i = 0; i < 50; i++) {
    const c = `RIMON-${randomFrom(4)}`;
    if (!db.prepare('SELECT 1 FROM users WHERE code = ?').get(c)) return c;
  }
  return `RIMON-${randomFrom(6)}`;
};

/** Mint a session token. Returns the RAW token; only its digest is stored. */
export function issueToken(userId) {
  const raw = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO tokens (hash,user_id,created) VALUES (?,?,?)').run(tokenHash(raw), userId, Date.now());
  return raw;
}

/** Kill every session for a user except the one holding keepRaw — used on
 *  password change so an old (possibly stolen) session can't ride it out. */
export const revokeOtherTokens = (userId, keepRaw) =>
  db.prepare('DELETE FROM tokens WHERE user_id = ? AND hash <> ?').run(userId, tokenHash(String(keepRaw ?? '')));

export function createUser({ name, email = null, pass = null, apple = null, google = null }) {
  const id = newId();
  const code = freshFriendCode();
  db.prepare(
    `INSERT INTO users (id,name,email,code,pass_salt,pass_hash,apple_sub,google_sub,progress,push,created)
     VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?)`,
  ).run(id, String(name).slice(0, 20), email, code, pass?.salt ?? null, pass?.hash ?? null, apple, google, Date.now());
  return { id, code, token: issueToken(id) };
}

export const setProgress = (id, progress) =>
  db.prepare('UPDATE users SET progress = ? WHERE id = ?').run(JSON.stringify(progress), id);
export const setName = (id, name) => db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).slice(0, 20), id);
export const setEmail = (id, email) => db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, id);
export const setPassword = (id, pass) =>
  db.prepare('UPDATE users SET pass_salt = ?, pass_hash = ? WHERE id = ?').run(pass.salt, pass.hash, id);
export const setPush = (id, push) =>
  db.prepare('UPDATE users SET push = ? WHERE id = ?').run(push ? JSON.stringify(push) : null, id);
export const deleteUser = (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id); // cascades

// ----------------------------------------------------------------- friends
export function addFriend(aId, bId) {
  const now = Date.now();
  const ins = db.prepare('INSERT OR IGNORE INTO friends (user_id,friend_id,created) VALUES (?,?,?)');
  ins.run(aId, bId, now);
  ins.run(bId, aId, now); // mutual, as the product intends
}
export const friendsOf = (id) =>
  db
    .prepare('SELECT u.* FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ?')
    .all(id)
    .map(hydrate);

// -------------------------------------------------------------- leaderboards
export const freshBoardCode = () => {
  for (let i = 0; i < 50; i++) {
    const c = randomFrom(6);
    if (!db.prepare('SELECT 1 FROM boards WHERE code = ?').get(c)) return c;
  }
  return randomFrom(8);
};
export function createBoard(ownerId, title) {
  const id = newId();
  const code = freshBoardCode();
  db.prepare('INSERT INTO boards (id,code,title,owner_id,created) VALUES (?,?,?,?,?)').run(
    id, code, String(title).trim().slice(0, 40) || 'Our leaderboard', ownerId, Date.now(),
  );
  db.prepare('INSERT INTO board_members (board_id,user_id,joined) VALUES (?,?,?)').run(id, ownerId, Date.now());
  return { id, code };
}
export const boardByCode = (code) =>
  db.prepare('SELECT * FROM boards WHERE code = ?').get(String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
export const boardById = (id) => db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
export const joinBoard = (boardId, userId) =>
  db.prepare('INSERT OR IGNORE INTO board_members (board_id,user_id,joined) VALUES (?,?,?)').run(boardId, userId, Date.now());
export const leaveBoard = (boardId, userId) =>
  db.prepare('DELETE FROM board_members WHERE board_id = ? AND user_id = ?').run(boardId, userId);
export const deleteBoard = (boardId) => db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
export const boardsOf = (userId) =>
  db
    .prepare('SELECT b.* FROM board_members m JOIN boards b ON b.id = m.board_id WHERE m.user_id = ? ORDER BY b.created')
    .all(userId);
export const boardMembers = (boardId) =>
  db
    .prepare('SELECT u.* FROM board_members m JOIN users u ON u.id = m.user_id WHERE m.board_id = ?')
    .all(boardId)
    .map(hydrate);
export const boardMemberCount = (boardId) =>
  db.prepare('SELECT COUNT(*) n FROM board_members WHERE board_id = ?').get(boardId).n;

// ----------------------------------------------------------- learned foods
export const allLearned = () =>
  db.prepare('SELECT entry FROM learned_foods ORDER BY added').all().map((r) => parse(r.entry)).filter(Boolean);
export const learnedCount = () => db.prepare('SELECT COUNT(*) n FROM learned_foods').get().n;
export const learnedKeys = () => db.prepare('SELECT key FROM learned_foods').all().map((r) => r.key);
export const addLearned = (entry) =>
  db.prepare('INSERT OR IGNORE INTO learned_foods (key,entry,added) VALUES (?,?,?)').run(entry.key, JSON.stringify(entry), Date.now());
export const learnedStamp = () =>
  db.prepare('SELECT COUNT(*) n, COALESCE(MAX(added),0) m FROM learned_foods').get();

// ------------------------------------------------------- push subscribers
export const pushSubscribers = () =>
  db
    .prepare("SELECT * FROM users WHERE push IS NOT NULL")
    .all()
    .map(hydrate)
    .filter((u) => u.push?.subscription && u.push?.times?.length);

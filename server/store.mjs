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

/** Raw DB handle — for the backup module's VACUUM INTO. */
export const getDb = () => db;

/** Flush the WAL and close — called on graceful shutdown so a deploy can
 *  never catch half-written pages (synchronous=NORMAL doesn't fsync per commit). */
export function closeStore() {
  try {
    db?.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db?.close();
  } catch { /* already closed / mid-shutdown — nothing better to do */ }
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
    apns: r.apns ?? null,
    wins: r.wins ?? 0,
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
/** APNs device token (native iOS). A token identifies the DEVICE, so signing
 *  into another account on the same phone moves it — never fan out one push
 *  to two accounts on one handset. */
export const setApns = (id, token) => {
  if (token) db.prepare('UPDATE users SET apns = NULL WHERE apns = ? AND id <> ?').run(token, id);
  db.prepare('UPDATE users SET apns = ? WHERE id = ?').run(token || null, id);
};
/** Sign in with Apple refresh token — read ONLY by the account-deletion
 *  route, which spends it on revocation. Deliberately not part of hydrate():
 *  user objects get serialized into /api/me, league rows and board members,
 *  and this token must never ride along. */
export const appleRefreshOf = (id) =>
  db.prepare('SELECT apple_refresh FROM users WHERE id = ?').get(id)?.apple_refresh ?? null;
export const setAppleRefresh = (id, token) =>
  db.prepare('UPDATE users SET apple_refresh = ? WHERE id = ?').run(token || null, id);
/** Full account deletion. Boards the leaver OWNS are handed to their
 *  earliest-joined remaining member first (a shared league must never vanish
 *  because one person closed their account — the owner_id FK cascade would
 *  take the board, its chat and its results with it); a board with nobody
 *  else in it is deleted. Then the user row goes, cascading tokens,
 *  friendships, memberships, messages, reads and blocks. One transaction. */
export function deleteUser(id) {
  db.exec('BEGIN');
  try {
    for (const b of db.prepare('SELECT id FROM boards WHERE owner_id = ?').all(id)) {
      const heir = db
        .prepare('SELECT user_id FROM board_members WHERE board_id = ? AND user_id <> ? ORDER BY joined ASC, user_id ASC LIMIT 1')
        .get(b.id, id);
      if (heir) {
        db.prepare('UPDATE boards SET owner_id = ? WHERE id = ?').run(heir.user_id, b.id);
        db.prepare('DELETE FROM board_members WHERE board_id = ? AND user_id = ?').run(b.id, id);
      } else db.prepare('DELETE FROM boards WHERE id = ?').run(b.id);
    }
    const r = db.prepare('DELETE FROM users WHERE id = ?').run(id); // cascades the rest
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
/** Accounts the test suites create (e2e, store demo, scenario "Test Friend") —
 *  the admin prune route deletes exactly these, nothing else. */
export const testAccountIds = () =>
  db
    .prepare(
      `SELECT id FROM users
        WHERE email LIKE 'e2e-%@example.com' OR email LIKE 'store-demo-%@example.com'
           OR (name = 'Test Friend' AND email IS NULL)`,
    )
    .all()
    .map((r) => r.id);

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
// Every board is a timed ROUND: week / month / year. Scores are cumulative
// points minus the member's baseline (snapshotted at round start or join), so
// everyone starts a round at 0 — including year-long boards, which daily
// history (≈60 days retained) could never sum.
// ROUND_DURATIONS_OVERRIDE (JSON, e.g. {"week":2500}) exists for the scenario
// suite only — it shrinks a round to milliseconds so finalize/reveal/restart
// can be asserted end-to-end. Production never sets it.
const durationOverride = (() => {
  try { return JSON.parse(process.env.ROUND_DURATIONS_OVERRIDE || '{}'); } catch { return {}; }
})();
export const DURATION_MS = {
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
  ...durationOverride,
};

const baselineOf = (user) => ({
  points: user?.progress?.points ?? 0,
  brachos: user?.progress?.totalBrachos ?? 0,
});

export const freshBoardCode = () => {
  for (let i = 0; i < 50; i++) {
    const c = randomFrom(6);
    if (!db.prepare('SELECT 1 FROM boards WHERE code = ?').get(c)) return c;
  }
  return randomFrom(8);
};
export function createBoard(owner, title, duration = 'week') {
  const id = newId();
  const code = freshBoardCode();
  const now = Date.now();
  const dur = DURATION_MS[duration] ? duration : 'week';
  db.prepare(
    'INSERT INTO boards (id,code,title,owner_id,created,duration,starts_at,ends_at,round) VALUES (?,?,?,?,?,?,?,?,1)',
  ).run(id, code, String(title).trim().slice(0, 40) || 'Our leaderboard', owner.id, now, dur, now, now + DURATION_MS[dur]);
  const base = baselineOf(owner);
  db.prepare(
    'INSERT INTO board_members (board_id,user_id,joined,points_baseline,brachos_baseline) VALUES (?,?,?,?,?)',
  ).run(id, owner.id, now, base.points, base.brachos);
  return { id, code, duration: dur, endsAt: now + DURATION_MS[dur] };
}
export const boardByCode = (code) =>
  db.prepare('SELECT * FROM boards WHERE code = ?').get(String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
export const boardById = (id) => db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
/** Joining mid-round starts the newcomer at 0 — their baseline is their
 *  cumulative points right now, not the round's start. */
export const joinBoard = (boardId, user) => {
  const base = baselineOf(user);
  db.prepare(
    'INSERT OR IGNORE INTO board_members (board_id,user_id,joined,points_baseline,brachos_baseline) VALUES (?,?,?,?,?)',
  ).run(boardId, user.id, Date.now(), base.points, base.brachos);
};
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
/** Members WITH their round baselines + reveal cursor — what board scoring reads. */
export const boardMembersScored = (boardId) =>
  db
    .prepare(
      `SELECT u.*, m.points_baseline, m.brachos_baseline, m.reveal_round
         FROM board_members m JOIN users u ON u.id = m.user_id WHERE m.board_id = ?`,
    )
    .all(boardId)
    .map((r) => ({
      ...hydrate(r),
      pointsBaseline: r.points_baseline ?? 0,
      brachosBaseline: r.brachos_baseline ?? 0,
      revealRound: r.reveal_round ?? 0,
    }));

// ------------------------------------------------------ timed-round lifecycle
/** Start the next round: fresh clock, every member re-snapshotted to 0. */
export function restartBoard(boardId, duration) {
  const b = boardById(boardId);
  if (!b) return null;
  const now = Date.now();
  const dur = DURATION_MS[duration] ? duration : DURATION_MS[b.duration] ? b.duration : 'week';
  db.prepare('UPDATE boards SET duration = ?, starts_at = ?, ends_at = ?, round = round + 1 WHERE id = ?').run(
    dur, now, now + DURATION_MS[dur], boardId,
  );
  rebaselineMembers(boardId);
  return boardById(boardId);
}
/** Snapshot every member's CURRENT totals as the new zero point. */
export function rebaselineMembers(boardId) {
  const upd = db.prepare(
    'UPDATE board_members SET points_baseline = ?, brachos_baseline = ? WHERE board_id = ? AND user_id = ?',
  );
  for (const m of boardMembers(boardId)) {
    const p = m.progress ?? {};
    upd.run(p.points ?? 0, p.totalBrachos ?? 0, boardId, m.id);
  }
}
/** One-time conversion of pre-duration boards → 1-week rounds starting now.
 *  Returns the converted boards so the caller can send the "started" push. */
export function convertLegacyBoards() {
  const legacy = db.prepare('SELECT * FROM boards WHERE duration IS NULL').all();
  const now = Date.now();
  for (const b of legacy) {
    db.prepare('UPDATE boards SET duration = ?, starts_at = ?, ends_at = ?, round = 1 WHERE id = ?').run(
      'week', now, now + DURATION_MS.week, b.id,
    );
    rebaselineMembers(b.id);
  }
  return legacy.map((b) => boardById(b.id));
}
/** Boards whose clock ran out but whose round has no frozen result yet. */
export const unfinalizedBoards = (now = Date.now()) =>
  db
    .prepare(
      `SELECT b.* FROM boards b
        WHERE b.duration IS NOT NULL AND b.ends_at <= ?
          AND NOT EXISTS (SELECT 1 FROM board_results r WHERE r.board_id = b.id AND r.round = b.round)`,
    )
    .all(now);
export const activeBoards = (now = Date.now()) =>
  db.prepare('SELECT * FROM boards WHERE duration IS NOT NULL AND ends_at > ?').all(now);
export const addBoardResult = (boardId, round, standings, winnerId) =>
  db.prepare(
    'INSERT OR IGNORE INTO board_results (board_id,round,standings,winner_id,ended) VALUES (?,?,?,?,?)',
  ).run(boardId, round, JSON.stringify(standings), winnerId, Date.now());
export const boardResult = (boardId, round) => {
  const r = db.prepare('SELECT * FROM board_results WHERE board_id = ? AND round = ?').get(boardId, round);
  return r ? { standings: parse(r.standings, []), winnerId: r.winner_id, ended: r.ended } : null;
};
export const incrementWins = (userId) =>
  db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(userId);
export const markRevealSeen = (boardId, userId, round) =>
  db.prepare('UPDATE board_members SET reveal_round = MAX(reveal_round, ?) WHERE board_id = ? AND user_id = ?').run(
    round, boardId, userId,
  );
export const boardMemberCount = (boardId) =>
  db.prepare('SELECT COUNT(*) n FROM board_members WHERE board_id = ?').get(boardId).n;
export const isBoardMember = (boardId, userId) =>
  !!db.prepare('SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?').get(boardId, userId);

// ------------------------------------------------------- board group chat
const MAX_MESSAGES_PER_BOARD = 500; // a chat room, not an archive

export function addBoardMessage(boardId, userId, text) {
  const id = newId();
  const created = Date.now();
  db.prepare('INSERT INTO board_messages (id,board_id,user_id,text,created) VALUES (?,?,?,?,?)').run(
    id, boardId, userId, String(text), created,
  );
  // trim the tail so one chatty board can't grow the volume forever
  db.prepare(
    `DELETE FROM board_messages WHERE board_id = ? AND id NOT IN
       (SELECT id FROM board_messages WHERE board_id = ? ORDER BY created DESC, id DESC LIMIT ?)`,
  ).run(boardId, boardId, MAX_MESSAGES_PER_BOARD);
  return { id, created };
}

/** Messages after `since`, oldest first, with sender names resolved. Senders
 *  the VIEWER has blocked are filtered here, server-side, so a blocked person
 *  never reaches the client at all (App Review 1.2 — the block must be real,
 *  not a client-side hide). */
export const boardMessages = (boardId, since = 0, limit = 100, viewerId = null) =>
  db
    .prepare(
      `SELECT m.id, m.user_id, m.text, m.created, u.name
         FROM board_messages m JOIN users u ON u.id = m.user_id
        WHERE m.board_id = ? AND m.created > ?
          AND NOT EXISTS (SELECT 1 FROM board_blocks k WHERE k.blocker_id = ? AND k.blocked_id = m.user_id)
        ORDER BY m.created ASC, m.id ASC LIMIT ?`,
    )
    .all(boardId, since, viewerId ?? '', limit);
/** One message, for the report route (null when it's gone or on another board). */
export const boardMessage = (boardId, messageId) =>
  db.prepare('SELECT id, board_id, user_id, text, created FROM board_messages WHERE id = ? AND board_id = ?').get(messageId, boardId) ?? null;

/** When this member last read the board (0 if never) — lets the notifier skip
 *  pushing to someone who's actively looking at the chat right now. */
export const boardLastRead = (boardId, userId) =>
  db.prepare('SELECT last_read FROM board_reads WHERE board_id = ? AND user_id = ?').get(boardId, userId)?.last_read ?? 0;

export const markBoardRead = (boardId, userId, ts) =>
  db
    .prepare(
      `INSERT INTO board_reads (board_id,user_id,last_read) VALUES (?,?,?)
       ON CONFLICT(board_id,user_id) DO UPDATE SET last_read = MAX(last_read, excluded.last_read)`,
    )
    .run(boardId, userId, ts);

/** Unread messages from OTHERS since this member's read cursor — blocked
 *  senders excluded, or a block would leave a badge that never matches the room. */
export const boardUnread = (boardId, userId) =>
  db
    .prepare(
      `SELECT COUNT(*) n FROM board_messages m
        WHERE m.board_id = ? AND m.user_id != ?
          AND m.created > COALESCE((SELECT last_read FROM board_reads WHERE board_id = ? AND user_id = ?), 0)
          AND NOT EXISTS (SELECT 1 FROM board_blocks k WHERE k.blocker_id = ? AND k.blocked_id = m.user_id)`,
    )
    .get(boardId, userId, boardId, userId, userId).n;

// ------------------------------------------------------- chat moderation
// Blocks are per BLOCKER, global across boards (one tap silences a person
// everywhere, which is what a user expects from "block"). Reports are stored
// for the operator; nothing here auto-punishes — a human reviews.
export const blockUser = (blockerId, blockedId) =>
  db.prepare('INSERT OR IGNORE INTO board_blocks (blocker_id,blocked_id,created) VALUES (?,?,?)').run(blockerId, blockedId, Date.now());
export const unblockUser = (blockerId, blockedId) =>
  db.prepare('DELETE FROM board_blocks WHERE blocker_id = ? AND blocked_id = ?').run(blockerId, blockedId);
export const blockedIds = (blockerId) =>
  db.prepare('SELECT blocked_id FROM board_blocks WHERE blocker_id = ?').all(blockerId).map((r) => r.blocked_id);
/** Everyone who has blocked `userId` — lets the chat notifier skip them in one query. */
export const blockersOf = (userId) =>
  db.prepare('SELECT blocker_id FROM board_blocks WHERE blocked_id = ?').all(userId).map((r) => r.blocker_id);
export const blockedUsers = (blockerId) =>
  db
    .prepare(
      `SELECT k.blocked_id AS user_id, u.name FROM board_blocks k JOIN users u ON u.id = k.blocked_id
        WHERE k.blocker_id = ? ORDER BY k.created DESC`,
    )
    .all(blockerId);

export function addReport({ boardId, messageId, reporterId, reportedUserId, text, reason }) {
  const id = newId();
  db.prepare(
    `INSERT INTO reports (id,board_id,message_id,reporter_id,reported_user_id,text,reason,created,status)
     VALUES (?,?,?,?,?,?,?,?,'open')`,
  ).run(id, boardId, messageId, reporterId, reportedUserId, String(text).slice(0, 400), String(reason).slice(0, 200), Date.now());
  return id;
}
export const openReports = (limit = 200) =>
  db.prepare("SELECT * FROM reports WHERE status = 'open' ORDER BY created DESC LIMIT ?").all(limit);
export const openReportCount = () => db.prepare("SELECT COUNT(*) n FROM reports WHERE status = 'open'").get().n;
export const resolveReport = (id) =>
  db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ? AND status = 'open'").run(String(id)).changes;
/** Reports filed by one user since `since` — the 10-per-10-min flood cap. */
export const reportCountSince = (userId, since) =>
  db.prepare('SELECT COUNT(*) n FROM reports WHERE reporter_id = ? AND created > ?').get(userId, since).n;

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

/** Everyone reachable on ANY push channel (Web Push or native APNs) —
 *  the owner-broadcast audience. */
export const pushAudience = () =>
  db
    .prepare('SELECT * FROM users WHERE push IS NOT NULL OR apns IS NOT NULL')
    .all()
    .map(hydrate)
    .filter((u) => u.push?.subscription || u.apns);

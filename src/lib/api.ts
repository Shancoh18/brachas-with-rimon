/**
 * Client for the Brachas with Rimon backend (Railway).
 * Everything degrades gracefully: no account / offline → local-only mode.
 */
import type { Lesson } from '../data/learn';
import type { ProgressState } from './progress';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://brachas-rimon-api-production-46ae.up.railway.app';

export interface LeagueRow {
  name: string;
  code: string;
  totalBrachos: number;
  weekBrachos: number;
  /** lifetime points — the all-time league ranks on this; on a board row this
   *  is the ROUND score instead (points since the round started, from 0) */
  points: number;
  /** points earned in the last 7 days */
  weekPoints: number;
  /** points earned today — powers the catch-up nudge */
  todayPoints: number;
  streak: number;
  /** leaderboard rounds won, lifetime */
  wins?: number;
  /** round brachos (board rows only) */
  brachos?: number;
  you: boolean;
}

/** Every request gives up after this long — a Railway cold start or a dead
 *  cellular link otherwise leaves a screen spinning forever with no error. */
const CALL_TIMEOUT_MS = 15_000;

/** Error shape thrown by call(): status 0 + code 'timeout' means the request
 *  never completed — screens show "Server is slow — try again" for it. */
export interface ApiError extends Error {
  status: number;
  code?: string;
}

export const isTimeout = (e: unknown): boolean => (e as ApiError | null)?.code === 'timeout';

const call = async <T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> => {
  const timeout = AbortSignal.timeout(CALL_TIMEOUT_MS);
  // honour a caller-supplied signal too — whichever fires first aborts
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers ?? {}),
      },
    });
  } catch (e) {
    // fetch rejects with AbortError (or TimeoutError in newer engines) when
    // the signal fires; either way the server never answered
    const name = (e as { name?: string }).name ?? '';
    if (name === 'AbortError' || name === 'TimeoutError' || timeout.aborted) {
      throw Object.assign(new Error('api timeout'), { status: 0, code: 'timeout' });
    }
    throw e;
  }
  if (!res.ok) {
    // carry the server's error code so callers can branch (e.g. use_provider
    // vs use_password vs no_password on sign-in)
    let body: { error?: string } = {};
    try { body = await res.json(); } catch { /* non-JSON error */ }
    throw Object.assign(new Error(`api ${res.status}`), { status: res.status, code: body.error });
  }
  return (await res.json()) as T;
};

export const apiRegister = (name: string, email: string, password?: string) =>
  call<{ token: string; code: string; email: string | null }>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, ...(password ? { password } : {}) }),
  });

export type ServerProgress = Pick<ProgressState, 'totalBrachos' | 'streakCurrent' | 'points' | 'history'>;
export const apiSync = (token: string, progress: ProgressState, name?: string) =>
  call<{ league: LeagueRow[]; code: string; progress: ServerProgress | null }>(
    '/api/sync',
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        progress: {
          totalBrachos: progress.totalBrachos,
          streakCurrent: progress.streakCurrent,
          points: progress.points ?? 0, // lifetime points — the league ranks on these
          history: progress.history.slice(-30),
        },
      }),
    },
    token,
  );

export const apiLeague = (token: string) =>
  call<{ league: LeagueRow[]; code: string }>('/api/league', {}, token);

export const apiAddFriend = (token: string, code: string) =>
  call<{ league: LeagueRow[]; added: string }>(
    '/api/friends/add',
    { method: 'POST', body: JSON.stringify({ code }) },
    token,
  );

export const apiPushKey = (token: string) => call<{ key: string }>('/api/push/key', {}, token);

/** Register (or clear, with null) the native APNs device token — the push
 *  channel for the iOS app, where Web Push doesn't exist. */
export const apiPushNative = (token: string, deviceToken: string | null) =>
  call<{ ok: boolean; enabled: boolean; delivery: string }>(
    '/api/push/native',
    { method: 'POST', body: JSON.stringify({ token: deviceToken }) },
    token,
  );

export const apiPushSubscribe = (
  token: string,
  subscription: PushSubscription | null,
  times: string[],
) =>
  call<{ ok: boolean; enabled: boolean }>(
    '/api/push/subscribe',
    {
      method: 'POST',
      body: JSON.stringify({
        subscription: subscription?.toJSON() ?? null,
        times,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    },
    token,
  );

/** urlBase64 → Uint8Array for pushManager.subscribe */
export function vapidKeyToBytes(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const apiLessons = () => call<{ lessons: Lesson[] }>('/api/lessons');

/** Today's chabad.org "Daily Wisdom" digest — null until the server has one. */
export interface DailyThought {
  dateKey: string;
  title: string;
  dayLabel: string;
  digest: string;
  url: string;
  fetched: number;
  /** server said this was TODAY's lesson when it was stored (client-stamped
   *  from the response's `fresh` flag) */
  fresh?: boolean;
}
export const apiDailyThought = () =>
  call<{ thought: DailyThought | null; fresh: boolean }>('/api/daily-thought');

export const apiMe = (token: string) =>
  call<{ name: string; email: string | null; code: string; hasPassword: boolean; providers: string[] }>(
    '/api/me',
    {},
    token,
  );

export const apiUpdateAccount = (token: string, patch: { name?: string; email?: string }) =>
  call<{ name: string; email: string | null; code: string }>(
    '/api/account',
    { method: 'POST', body: JSON.stringify(patch) },
    token,
  );

export const apiDeleteAccount = (token: string) =>
  call<{ ok: boolean }>('/api/account/delete', { method: 'POST' }, token);

/** Sign in with email + password, or email + friend code (legacy accounts). */
export const apiSignIn = (email: string, key: { password?: string; code?: string }) =>
  call<{ token: string; code: string; name: string; email: string }>('/api/signin', {
    method: 'POST',
    body: JSON.stringify({ email, ...key }),
  });

/** Exchange a verified Apple/Google identity token for an account session. */
export const apiOauth = (provider: 'apple' | 'google', idToken: string, name?: string) =>
  call<{ token: string; code: string; name: string; email: string | null }>('/api/oauth', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken, ...(name ? { name } : {}) }),
  });

/** Set (first time) or change the account password. */
export const apiSetPassword = (token: string, password: string, current?: string) =>
  call<{ ok: boolean }>(
    '/api/account/password',
    { method: 'POST', body: JSON.stringify({ password, ...(current ? { current } : {}) }) },
    token,
  );

// ------------------------------------------------------------ leaderboards
export type BoardDuration = 'week' | 'month' | 'year';

/** Frozen podium of a finished round. */
export interface BoardResult {
  standings: { name: string; points: number; you: boolean }[];
  winnerName: string | null;
  ended: number;
  /** whether THIS member has already watched the podium reveal */
  seen: boolean;
}

/** A named leaderboard anyone can create and share by code. Every board is a
 *  timed ROUND (week/month/year) — members race from 0 until the clock ends. */
export interface Board {
  id: string;
  code: string;
  title: string;
  owner: boolean;
  members: number;
  league: LeagueRow[];
  /** chat messages from others since this member last opened the room */
  unread?: number;
  duration: BoardDuration;
  startsAt: number;
  endsAt: number;
  round: number;
  /** true once the clock ran out (result may lag a sweep tick behind) */
  ended: boolean;
  /** present once the round is finalized */
  result: BoardResult | null;
}

/** One message in a board's group chat. */
export interface BoardMessage {
  id: string;
  name: string;
  text: string;
  created: number;
  mine: boolean;
  /** author id — the handle Block/Report act on (never their email/code) */
  user_id: string;
}

export const apiBoards = (token: string) => call<{ boards: Board[] }>('/api/boards', {}, token);

export const apiCreateBoard = (token: string, title: string, duration: BoardDuration = 'week') =>
  call<{ id: string; code: string; title: string; duration: BoardDuration; endsAt: number }>(
    '/api/boards/create',
    { method: 'POST', body: JSON.stringify({ title, duration }) },
    token,
  );

/** Mark the finished round's podium reveal as watched (never replays). */
export const apiBoardRevealSeen = (token: string, id: string) =>
  call<{ ok: boolean }>('/api/boards/seen', { method: 'POST', body: JSON.stringify({ id }) }, token);

/** Owner only: start the next round — fresh clock, everyone back at 0. */
export const apiRestartBoard = (token: string, id: string, duration?: BoardDuration) =>
  call<{ ok: boolean; round: number; endsAt: number }>(
    '/api/boards/restart',
    { method: 'POST', body: JSON.stringify({ id, ...(duration ? { duration } : {}) }) },
    token,
  );

export const apiJoinBoard = (token: string, code: string) =>
  call<{ id: string; code: string; title: string; league: LeagueRow[] }>(
    '/api/boards/join',
    { method: 'POST', body: JSON.stringify({ code }) },
    token,
  );

export const apiLeaveBoard = (token: string, id: string) =>
  call<{ ok: boolean }>('/api/boards/leave', { method: 'POST', body: JSON.stringify({ id }) }, token);

/** Messages from people the caller has blocked are omitted server-side. The
 *  room is addressed by board id AND share code — the moderation contract
 *  (2026-09) names the board by `code`; `board` stays for the older route. */
export const apiBoardMessages = (token: string, boardId: string, since = 0, code?: string) =>
  call<{ messages: BoardMessage[]; now: number }>(
    `/api/boards/messages?board=${encodeURIComponent(boardId)}${code ? `&code=${encodeURIComponent(code)}` : ''}&since=${since}`,
    {},
    token,
  );

/** 400 {error:'moderated'} when the server's chat filter rejects the text. */
export const apiSendBoardMessage = (token: string, boardId: string, text: string) =>
  call<{ ok: boolean; id: string; created: number }>(
    '/api/boards/message',
    { method: 'POST', body: JSON.stringify({ board: boardId, text }) },
    token,
  );

// ------------------------------------------- chat moderation (App Review 1.2)
// Block is GLOBAL per caller (every board), idempotent, and hides the blocked
// user's messages server-side from then on. Reports are stored for the
// operator (surfaced via /api/status + /api/admin/reports).
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export const apiBlockUser = (token: string, userId: string) =>
  call<{ ok: boolean }>('/api/boards/block', { method: 'POST', body: JSON.stringify({ user_id: userId }) }, token);

export const apiUnblockUser = (token: string, userId: string) =>
  call<{ ok: boolean }>('/api/boards/unblock', { method: 'POST', body: JSON.stringify({ user_id: userId }) }, token);

export const apiBlockedUsers = (token: string) =>
  call<{ blocked: { user_id: string; name: string }[] }>('/api/boards/blocked', {}, token);

/** 404 unknown board/message; 429 past 10 reports / 10 min. `board` (the id)
 *  rides along with `code` so either server-side lookup resolves the room. */
export const apiReportMessage = (
  token: string,
  args: { code: string; board?: string; message_id: string; reason: ReportReason },
) =>
  call<{ ok: boolean }>('/api/boards/report', { method: 'POST', body: JSON.stringify(args) }, token);

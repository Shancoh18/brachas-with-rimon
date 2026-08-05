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
  /** lifetime points */
  points: number;
  /** points earned in the last 7 days — the league ranks on this */
  weekPoints: number;
  /** points earned today — powers the catch-up nudge */
  todayPoints: number;
  streak: number;
  you: boolean;
}

const call = async <T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) throw Object.assign(new Error(`api ${res.status}`), { status: res.status });
  return (await res.json()) as T;
};

export const apiRegister = (name: string, email: string, password?: string) =>
  call<{ token: string; code: string; email: string | null }>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, ...(password ? { password } : {}) }),
  });

export const apiSync = (token: string, progress: ProgressState, name?: string) =>
  call<{ league: LeagueRow[]; code: string }>(
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
/** A named leaderboard anyone can create and share by code. */
export interface Board {
  id: string;
  code: string;
  title: string;
  owner: boolean;
  members: number;
  league: LeagueRow[];
}

export const apiBoards = (token: string) => call<{ boards: Board[] }>('/api/boards', {}, token);

export const apiCreateBoard = (token: string, title: string) =>
  call<{ id: string; code: string; title: string }>(
    '/api/boards/create',
    { method: 'POST', body: JSON.stringify({ title }) },
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

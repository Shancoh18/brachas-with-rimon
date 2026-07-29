/**
 * Client for the Brachas with Rimon backend (Railway).
 * Everything degrades gracefully: no account / offline → local-only mode.
 */
import type { ProgressState } from './progress';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://brachas-rimon-api-production.up.railway.app';

export interface LeagueRow {
  name: string;
  code: string;
  totalBrachos: number;
  weekBrachos: number;
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

export const apiRegister = (name: string) =>
  call<{ token: string; code: string }>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name }),
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

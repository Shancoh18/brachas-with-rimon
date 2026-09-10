/**
 * Anonymous guest session (App Review 5.1.1(v)): once onboarding is done and
 * the device has no token, the app mints a guest (POST /api/guest — no name,
 * no email, nothing typed) and renders immediately. ONE request in flight
 * app-wide; the answer is adopted only while the store is still token-less,
 * so a sign-in that lands mid-flight wins and the spare guest row is pruned
 * server-side. Shared by App.tsx (boot / foreground retries) and by
 * analyzePhoto (a photo taken before the mint finished waits for it).
 */
import { apiGuest } from './api';
import { useBracha } from '../store';

let guestInflight: Promise<void> | null = null;

/** Mint a guest session if the device still has no token. ONE request at a
 *  time app-wide — StrictMode's doubled effects, the foreground listener and
 *  a pending retry all share the same promise — and the answer is adopted
 *  only while the store is still token-less, so a sign-in that lands
 *  mid-flight wins and the spare guest row is pruned server-side. */
export function ensureGuestSession(): Promise<void> {
  if (!guestInflight) {
    guestInflight = apiGuest()
      .then((r) => {
        const s = useBracha.getState();
        if (!s.serverToken) s.setGuestSession(r.token, r.code);
      })
      .finally(() => {
        guestInflight = null;
      });
  }
  return guestInflight;
}

/** Resolve once a token exists (immediately if it already does). Never throws:
 *  a failed mint resolves too, and the caller proceeds token-less. */
export async function waitForSession(): Promise<string | null> {
  const s = useBracha.getState();
  if (s.serverToken) return s.serverToken;
  await ensureGuestSession().catch(() => undefined);
  return useBracha.getState().serverToken ?? null;
}

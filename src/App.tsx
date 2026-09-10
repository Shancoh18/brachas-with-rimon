import { useEffect, useRef, useState } from 'react';
import { isNative, registerNativePush } from './lib/native';
import { apiSync, apiPushNative, apiBoards, apiBoardRevealSeen, type Board } from './lib/api';
import { ensureGuestSession } from './lib/guestSession';
import { PodiumReveal } from './components/PodiumReveal';
import { syncWidgets } from './lib/widgetBridge';
import { fetchLearnedFoods } from './lib/learnedFoods';
import { showWebNotification } from './lib/useReminders';
import { useBracha } from './store';
import { Celebration } from './components/Celebration';
import { TabBar } from './components/TabBar';
import { Welcome } from './screens/Welcome';
import { Identify } from './screens/Identify';
import { Confirm } from './screens/Confirm';
import { Guide } from './screens/Guide';
import { After } from './screens/After';
import { Learn } from './screens/Learn';
import { Journey } from './screens/Journey';
import { Onboarding } from './screens/Onboarding';
import { Reference } from './screens/Reference';
import { Benching } from './screens/Benching';
import { Account } from './screens/Account';
import { Donate } from './screens/Donate';
import { Friends } from './screens/Friends';

/** In-app reminder ticker: fires a notification when a set mealtime passes
 *  while the app is open/installed. (Background push needs accounts.) */
function useReminderTicker() {
  const { reminders } = useBracha();
  const fired = useRef<string>('');
  useEffect(() => {
    if (!reminders.enabled || isNative()) return; // native: iOS local notifications own this
    const tick = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const stamp = `${now.toDateString()}-${hhmm}`;
      if (reminders.times.includes(hhmm) && fired.current !== stamp) {
        fired.current = stamp;
        void showWebNotification(
          'Rimon here 🍎',
          'Eating soon? Take ten seconds to say the bracha first — your streak is waiting.',
        );
      }
    };
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [reminders]);
}

// ------------------------------------------------------------ guest session
// App Review 5.1.1(v) (1.0 build 33 rejected): non-account features must not
// sit behind registration. So once onboarding is done and there is no
// session, the app SILENTLY mints an anonymous guest (POST /api/guest — no
// name, no email, nothing typed) and renders immediately; the guest token
// carries progress sync, photo identification and reminders exactly like an
// account would. If the network call fails the app still works on local
// progress (sync simply stays off until a token exists) and the mint retries
// with backoff, on the next boot and on every return to the foreground.
const GUEST_RETRY_BASE_MS = 5_000;
const GUEST_RETRY_MAX_MS = 5 * 60_000;
function useGuestSession() {
  const onboarded = useBracha((s) => s.onboarded);
  const serverToken = useBracha((s) => s.serverToken);
  const attempts = useRef(0);
  useEffect(() => {
    if (!onboarded || serverToken) {
      attempts.current = 0;
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const attempt = () => {
      if (stopped || useBracha.getState().serverToken) return;
      ensureGuestSession().catch(() => {
        if (stopped) return;
        attempts.current += 1;
        const delay = Math.min(GUEST_RETRY_BASE_MS * 2 ** (attempts.current - 1), GUEST_RETRY_MAX_MS);
        timer = setTimeout(attempt, delay);
      });
    };
    attempt();
    const onVisible = () => {
      if (document.visibilityState === 'visible') attempt();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [onboarded, serverToken]);
}

export default function App() {
  const tab = useBracha((s) => s.tab);
  const onboarded = useBracha((s) => s.onboarded);
  const screen = useBracha((s) => s.screen);
  const serverToken = useBracha((s) => s.serverToken);
  const isGuest = useBracha((s) => s.isGuest);
  useReminderTicker();
  useGuestSession();
  // every screen/tab change starts at the top — without this, opening a
  // screen from a scrolled page leaves the new screen mid-scroll
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, screen]);
  // keep the iPhone Home Screen widgets current (no-op on web / until the
  // native RimonWidgets target is set up — see ios/widgets-staging/)
  const progress = useBracha((s) => s.progress);
  const dayStats = useBracha((s) => s.dayStats);
  useEffect(() => {
    void syncWidgets(progress, dayStats);
  }, [progress, dayStats]);
  // Previously learned foods sync once per session — the DB keeps growing.
  useEffect(() => {
    void fetchLearnedFoods();
  }, []);
  // Boot league sync: adopts server progress onto a fresh device FIRST (so a
  // reinstall restores the account instead of syncing empty state up), then
  // pushes and fills the catch-up nudge. Guests sync too — that is what makes
  // an upgrade keep everything. A guest token the server no longer knows
  // (401) is dropped so the guest hook mints a fresh one.
  useEffect(() => {
    if (!serverToken) return;
    const { progress, setLeagueSnapshot, adoptServerProgress } = useBracha.getState();
    apiSync(serverToken, progress)
      .then((r) => {
        adoptServerProgress(r.progress); // no-op unless this device is blank
        setLeagueSnapshot(r.league);
      })
      .catch((e) => {
        const s = useBracha.getState(); // live flag, never a stale closure
        if (s.isGuest && (e as { status?: number }).status === 401) s.clearServerAccount();
      });
  }, [serverToken]);
  // Podium reveals: whenever the app opens (boot or return from background),
  // check for leaderboard rounds that ended since the member last looked. The
  // first unseen finished round with a winner plays the full 3rd → 2nd → 1st
  // takeover; no-winner rounds are retired silently so they don't linger.
  // Boards are account-only — guests skip the call (it would 403 anyway).
  const [reveal, setReveal] = useState<Board | null>(null);
  const revealBusy = useRef(false);
  const checkReveals = async (token: string) => {
    if (revealBusy.current) return;
    revealBusy.current = true;
    try {
      const { boards } = await apiBoards(token);
      const pending = boards.filter((b) => b.ended && b.result && !b.result.seen);
      const withWinner = pending.find((b) => b.result?.winnerName);
      for (const b of pending) {
        if (b !== withWinner && !b.result?.winnerName) void apiBoardRevealSeen(token, b.id).catch(() => undefined);
      }
      if (withWinner) setReveal(withWinner);
    } catch {
      /* offline — next open retries */
    } finally {
      revealBusy.current = false;
    }
  };
  useEffect(() => {
    if (!serverToken || isGuest) return;
    void checkReveals(serverToken);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkReveals(serverToken);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToken, isGuest]);

  // Native iOS: register the APNs device token so server-initiated pushes
  // (board chat, competitive nudges, broadcasts) reach this phone. Web Push
  // doesn't exist in the WKWebView — this is the only channel. No-op on web.
  //
  // TIMING (App Review 5.1.1 / HIG): the permission alert must follow a
  // moment where notifications make sense to the user, never the sign-in
  // itself. So: once per session, the first time reminders are switched ON
  // or the Friends tab (chat, leagues — where pushes originate) is opened
  // while signed in. Sign-out clears the token server-side from Account.
  // Guests have nothing that pushes (mealtime reminders are LOCAL
  // notifications) — registration waits for the upgrade.
  const remindersOn = useBracha((s) => s.reminders.enabled);
  const pushRegistered = useRef(false);
  useEffect(() => {
    if (!serverToken || isGuest || !isNative() || pushRegistered.current) return;
    if (!remindersOn && tab !== 'friends') return;
    pushRegistered.current = true; // one attempt per session — iOS never re-prompts a decline anyway
    void registerNativePush().then((t) => {
      if (t) apiPushNative(serverToken, t).catch(() => undefined); // retried next session
    });
  }, [serverToken, isGuest, remindersOn, tab]);
  // Any progress change syncs up (debounced 3s) — not just meals. Without
  // this, points from lessons/challenges sat local-only until the next boot,
  // so friends' leaderboards showed stale bracha counts (owner-reported
  // 2026-08-06). This is also what lets overtake pushes fire in near-realtime.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!serverToken) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const { progress: p, setLeagueSnapshot } = useBracha.getState();
      apiSync(serverToken, p)
        .then((r) => setLeagueSnapshot(r.league))
        .catch(() => undefined); // offline — next change or boot retries
    }, 3000);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [serverToken, progress]);

  if (!onboarded) return <Onboarding />;
  // No wall past onboarding: the app renders at once, on a guest session
  // (useGuestSession) or on local progress while one is still being minted.
  // Account-based features prompt inline — see AccountRequired.

  // Bless flow occupies the whole screen mid-flow; the tab bar shows on roots.
  const inFlow = tab === 'bless' && screen !== 'welcome';

  let body;
  if (tab === 'learn') body = <Learn />;
  else if (tab === 'journey') body = <Journey />;
  else if (tab === 'friends') body = <Friends />;
  else if (tab === 'donate') body = <Donate />;
  else if (tab === 'account') body = <Account />;
  else {
    switch (screen) {
      case 'identify':
        body = <Identify />;
        break;
      case 'confirm':
        body = <Confirm />;
        break;
      case 'guide':
        body = <Guide />;
        break;
      case 'after':
        body = <After />;
        break;
      case 'reference':
        body = <Reference />;
        break;
      case 'benching':
        body = <Benching />;
        break;
      default:
        body = <Welcome />;
    }
  }

  return (
    <>
      {/* pb clearance when the floating tab bar shows — without it the page's
          last content (the disclaimer) scrolls UNDER the bar and ghosts
          through it at the bottom of every root screen */}
      <div className={inFlow ? '' : 'pb-24'}>{body}</div>
      {!inFlow && <TabBar />}
      <Celebration />
      {reveal && serverToken && (
        <PodiumReveal
          board={reveal}
          onContinue={() => {
            const id = reveal.id;
            setReveal(null);
            apiBoardRevealSeen(serverToken, id)
              .catch(() => undefined) // offline: server still unseen → replays next open, acceptable
              .finally(() => void checkReveals(serverToken)); // another round may be waiting
          }}
        />
      )}
    </>
  );
}

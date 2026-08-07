import { useEffect, useRef } from 'react';
import { isNative, registerNativePush } from './lib/native';
import { apiSync, apiPushNative } from './lib/api';
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
import { AuthGate } from './screens/AuthGate';
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

export default function App() {
  const tab = useBracha((s) => s.tab);
  const onboarded = useBracha((s) => s.onboarded);
  const screen = useBracha((s) => s.screen);
  const serverToken = useBracha((s) => s.serverToken);
  useReminderTicker();
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
  // pushes and fills the catch-up nudge.
  useEffect(() => {
    if (!serverToken) return;
    const { progress, setLeagueSnapshot, adoptServerProgress } = useBracha.getState();
    apiSync(serverToken, progress)
      .then((r) => {
        adoptServerProgress(r.progress); // no-op unless this device is blank
        setLeagueSnapshot(r.league);
      })
      .catch(() => undefined);
  }, [serverToken]);
  // Native iOS: register the APNs device token so server-initiated pushes
  // (board chat, competitive nudges, broadcasts) reach this phone. Web Push
  // doesn't exist in the WKWebView — this is the only channel. No-op on web.
  useEffect(() => {
    if (!serverToken || !isNative()) return;
    void registerNativePush().then((t) => {
      if (t) apiPushNative(serverToken, t).catch(() => undefined); // retried next boot
    });
  }, [serverToken]);
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
  // Account-first: everything past onboarding requires a signed-in account.
  if (!serverToken) return <AuthGate />;

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
    </>
  );
}

import { useEffect, useRef } from 'react';
import { isNative } from './lib/native';
import { apiSync } from './lib/api';
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
  // Previously learned foods sync once per session — the DB keeps growing.
  useEffect(() => {
    void fetchLearnedFoods();
  }, []);
  // Boot league sync: pushes progress+points up and fills the catch-up nudge.
  useEffect(() => {
    if (!serverToken) return;
    const { progress, setLeagueSnapshot } = useBracha.getState();
    apiSync(serverToken, progress)
      .then((r) => setLeagueSnapshot(r.league))
      .catch(() => undefined);
  }, [serverToken]);

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
      {body}
      {!inFlow && <TabBar />}
      <Celebration />
    </>
  );
}

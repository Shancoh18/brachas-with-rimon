/**
 * Android hardware / gesture BACK.
 *
 * The app is a single page driven by zustand state (tab + screen), so the
 * WebView has no history to walk. Without a listener Capacitor's default is
 * `super.onBackPressed()` — the app CLOSES from any screen, including the
 * middle of a blessing guide. This hook gives back the meaning a user expects:
 *
 *   in the bless flow  → one step back (guide → confirm), else to the home
 *                        screen (a pending after-blessing is persisted, so
 *                        leaving After loses nothing — the home widget offers
 *                        it again)
 *   on another tab     → back to Bless (home)
 *   already on home    → minimise the app (Android's own "home" behaviour),
 *                        never a hard exit
 *
 * No-op everywhere but Android; iOS has no back button and the web keeps
 * browser history.
 */
import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { isAndroid } from './native';
import { useBracha } from '../store';

export function useAndroidBackButton(): void {
  useEffect(() => {
    if (!isAndroid()) return;
    const handle = CapApp.addListener('backButton', () => {
      const s = useBracha.getState();
      if (s.tab === 'bless' && s.screen !== 'welcome') {
        if (s.screen === 'guide') s.setScreen('confirm');
        else s.reset(); // identify / confirm / after / reference / benching → home
        return;
      }
      if (s.tab !== 'bless') {
        s.reset();
        s.setTab('bless');
        return;
      }
      void CapApp.minimizeApp().catch(() => undefined);
    });
    return () => {
      void handle.then((h) => h.remove()).catch(() => undefined);
    };
  }, []);
}

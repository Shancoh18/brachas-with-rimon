/**
 * Appearance — explicit, never inferred (owner ruling 2026-08-10).
 *
 * The app previously followed prefers-color-scheme alone, and devices that
 * REPORT dark (auto sunset schedules, low-power modes, WKWebView quirks)
 * forced the app dark on first open. The app now defaults to LIGHT; dark or
 * follow-system are explicit choices on the Account screen. The resolved
 * theme is stamped on <html data-theme> — every dark style in index.css keys
 * off that attribute, so the OS report alone can never flip the app again.
 */
import { useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { isNative } from './native';

export type Appearance = 'light' | 'dark' | 'system';

// Capacitor 8's built-in SystemBars (Android AND iOS): LIGHT = dark status-bar
// text/icons for the cream canvas, DARK = light ones for the dark chrome. iOS
// does NOT follow the in-app theme by itself — it follows the device setting,
// so in-app Dark on a Light phone left a black clock on the near-black page
// (QA 2026-10-29). The web has no bars.
const SystemBars = registerPlugin<{
  setStyle(opts: { style: 'LIGHT' | 'DARK' | 'DEFAULT'; bar?: 'StatusBar' | 'NavigationBar' }): Promise<void>;
}>('SystemBars');

const media = () =>
  typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export const resolveTheme = (pref: Appearance): 'light' | 'dark' =>
  pref === 'system' ? (media()?.matches ? 'dark' : 'light') : pref;

/** Stamp the resolved theme on <html> and keep the browser-chrome color in step. */
export function applyTheme(pref: Appearance) {
  const theme = resolveTheme(pref);
  document.documentElement.dataset.theme = theme;
  const color = theme === 'dark' ? '#1C1611' : '#FAF7E9';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.removeAttribute('media'); // one explicit color — never media-forked again
    m.setAttribute('content', color);
  });
  lastTheme = theme;
  syncBars();
}

// The Rimon takeovers are cream in BOTH themes (index.css .tk-root, the renders
// are baked on it) and full-bleed, so while one is up the status bar must keep
// dark text even in dark mode — white text on cream was unreadable (review
// 2026-10-29). Counted, so overlapping takeovers can't release it early.
let lastTheme: 'light' | 'dark' = 'light';
let lightHolds = 0;
function syncBars() {
  if (!isNative()) return;
  const style = lightHolds > 0 || lastTheme === 'light' ? 'LIGHT' : 'DARK';
  void SystemBars.setStyle({ style }).catch(() => undefined);
}
/** Keep light-canvas (dark-text) status bars while the calling component is mounted. */
export function useLightStatusBar() {
  useEffect(() => {
    lightHolds++;
    syncBars();
    return () => {
      lightHolds = Math.max(0, lightHolds - 1);
      syncBars();
    };
  }, []);
}

/** React to OS theme changes ONLY while the preference is 'system'. */
export function watchSystemTheme(getPref: () => Appearance): () => void {
  const m = media();
  if (!m) return () => undefined;
  const onChange = () => {
    if (getPref() === 'system') applyTheme('system');
  };
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}

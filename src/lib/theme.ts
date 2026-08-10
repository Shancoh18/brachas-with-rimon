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
export type Appearance = 'light' | 'dark' | 'system';

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

/**
 * iPhone Duo — layout signals for the web layer.
 *
 * The app follows Apple's advice for the Duo: design for two size classes,
 * not six poses. `useSplit()` is true when the screen is regular-width AND
 * wider than tall (the Duo's inner display, 951×669 pt, open flat or
 * half-folded like a book); split screens then lay out as two equal pages
 * that meet at the hinge (ScreenShell `aside`). The same query backs the
 * Tailwind `split:` variant in src/index.css — keep the two in step.
 */
import { useSyncExternalStore } from 'react';

// min-height keeps a phone turned sideways in a browser (≈874×402) on the
// phone layout; the Duo's inner display is 669 pt tall (Safari: 585+).
export const SPLIT_QUERY = '(min-width: 860px) and (min-height: 500px) and (orientation: landscape)';

// ONE MediaQueryList for the app's lifetime: a throwaway matchMedia() per call
// is referenced by nothing once subscribe() returns, and an engine that
// collects it would drop its 'change' listener with it. Held here, it can't.
let mql: MediaQueryList | null | undefined;
const splitQuery = () => {
  if (mql === undefined) {
    mql = typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(SPLIT_QUERY) : null;
  }
  return mql;
};

function subscribe(onChange: () => void) {
  const m = splitQuery();
  m?.addEventListener('change', onChange);
  // backup: a WebView resize (Duo opening/closing) always re-reads the query;
  // React skips the render when the answer did not change
  window.addEventListener('resize', onChange);
  return () => {
    m?.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}

/**
 * Stamps <html data-side-column> while the TRAILING edge carries an iPhone Duo
 * status column (a right inset of 44pt+ with no matching left one — upright
 * iPhones have neither; a sideways phone has both). The Duo has one on BOTH
 * displays: closed (status + camera, 84pt) and open (status, ~86pt — measured
 * in the iOS 27.1 simulator). The tab bar then stands in that column under the
 * status bar, like Apple's own bars (index.css .tab-dock), and the page needs
 * no rail gutter. Reads --safe-right, so QA's override fakes it too.
 * Call once at boot; it follows every resize (the Duo opening or closing).
 */
export function watchSideColumn(): void {
  if (typeof document === 'undefined') return;
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-left:var(--safe-left);padding-right:var(--safe-right)';
  document.body.appendChild(probe);
  const read = () => {
    const cs = getComputedStyle(probe);
    const left = parseFloat(cs.paddingLeft) || 0;
    const right = parseFloat(cs.paddingRight) || 0;
    document.documentElement.toggleAttribute('data-side-column', right >= 44 && left < 8);
  };
  read();
  window.addEventListener('resize', read);
  splitQuery()?.addEventListener('change', read);
  // the QA override lands on <html style>; re-read when it changes
  new MutationObserver(read).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
}

/** Live: flips when the Duo opens/closes or rotates (the WebView resizes). */
export function useSplit(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => splitQuery()?.matches ?? false,
    () => false,
  );
}

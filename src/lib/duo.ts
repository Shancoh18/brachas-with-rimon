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
 * Also stamps <html data-short> (index.css `short:`), from the same probe.
 * Call once at boot; it follows every resize (the Duo opening or closing).
 */
export function watchSideColumn(): void {
  if (typeof document === 'undefined') return;
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-left:var(--safe-left);padding-right:var(--safe-right);' +
    'padding-top:var(--page-top);padding-bottom:var(--page-bottom)';
  document.body.appendChild(probe);
  const read = () => {
    const cs = getComputedStyle(probe);
    const left = parseFloat(cs.paddingLeft) || 0;
    const right = parseFloat(cs.paddingRight) || 0;
    document.documentElement.toggleAttribute('data-side-column', right >= 44 && left < 8);
    // html[data-short] backs the `short:` variant (index.css): phone width and
    // at most 720pt of USABLE height — the viewport minus what <body> pads on
    // iOS (--page-top/--page-bottom, 0 elsewhere = the old media query)
    const usable = window.innerHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    document.documentElement.toggleAttribute('data-short', window.innerWidth < 640 && usable <= 720);
  };
  read();
  window.addEventListener('resize', read);
  splitQuery()?.addEventListener('change', read);
  // the QA override lands on <html style>; re-read when it changes
  new MutationObserver(read).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  // iOS fills env(safe-area-inset-*) in AFTER the first layout without any
  // resize when the WebView is full-screen (contentInset 'never', build 40):
  // the probe's padding — its whole border box — grows then, so watch that
  // (the closed Duo otherwise kept the bottom pill instead of the column bar)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(read).observe(probe, { box: 'border-box' });
  // --vv-top = how far iOS has panned the visual viewport (the keyboard is up):
  // the status-bar strip (index.css, iOS) rides it so it stays under the clock
  const vv = window.visualViewport;
  if (vv) {
    let last = -1;
    const pan = () => {
      const top = Math.max(0, Math.round(vv.offsetTop));
      if (top === last) return;
      last = top;
      // on <body> (the strip is body::before): <html style> is watched above,
      // and this fires on every keyboard-pan frame
      document.body.style.setProperty('--vv-top', `${top}px`);
    };
    vv.addEventListener('scroll', pan);
    vv.addEventListener('resize', pan);
    pan();
  }
}

/** Live: flips when the Duo opens/closes or rotates (the WebView resizes). */
export function useSplit(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => splitQuery()?.matches ?? false,
    () => false,
  );
}

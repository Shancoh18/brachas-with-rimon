/**
 * AbortSignal helpers that also run on iOS 15.
 *
 * iOS 15's WKWebView (Safari < 16) has no AbortSignal.timeout, so calling it
 * threw a TypeError before fetch even started — every API call failed on
 * those phones. AbortSignal.any is newer still (Safari 17.4). Use these two
 * everywhere instead of the statics; each falls back to a plain
 * AbortController, which WebKit has shipped since 12.1.
 */

/** the reason a timed-out signal carries — a TimeoutError, like the native one */
const timeoutReason = (): Error =>
  typeof DOMException === 'function'
    ? new DOMException('timeout', 'TimeoutError')
    : Object.assign(new Error('timeout'), { name: 'TimeoutError' });

/** AbortSignal.timeout(ms), or an equivalent that aborts after `ms` */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const ctrl = new AbortController();
  // engines before abort(reason) ignore the argument; fetch still rejects
  // with an AbortError, which api.ts treats the same as a TimeoutError
  setTimeout(() => ctrl.abort(timeoutReason()), ms);
  return ctrl.signal;
}

/** AbortSignal.any(signals), or an equivalent that aborts when any of them does */
export function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      ctrl.abort(s.reason);
      break;
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

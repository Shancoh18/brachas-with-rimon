/**
 * Donation config. When DONATE_URL is empty the Donate tab and screen hide
 * entirely — it points at the website's donate page so payment methods can
 * change with a pages deploy, never an app release.
 *
 * ⚠ App Review: on iOS, tips/donations to the developer generally must use
 * In-App Purchase (guideline 3.1.1) — an external payment link may be
 * rejected. PayPal went live on the page 2026-08-04; NATIVE_ENABLED below
 * decides whether the iOS build shows it at all.
 */
import { isNative } from './native';

export const DONATE_URL = 'https://shancoh18.github.io/brachas-with-rimon/donate.html';
// App Review 3.1.1 — external payment links are hidden in the iOS build for
// the first submission; the web PWA keeps the PayPal page. Re-enable after
// approval or ship a Tip Jar IAP.
const NATIVE_ENABLED = false;

export const donateAvailable = () => DONATE_URL.length > 0 && (NATIVE_ENABLED || !isNative());

/**
 * Donation config. When DONATE_URL is empty the Donate tab and screen hide
 * entirely — it points at the website's donate page so payment methods can
 * change with a pages deploy, never an app release.
 *
 * ⚠ App Review: on iOS, tips/donations to the developer generally must use
 * In-App Purchase (guideline 3.1.1) — an external payment link may be
 * rejected. The user chose to ship it (PayPal live on the page, 2026-08-04);
 * if review bounces it, set NATIVE_ENABLED back to false and resubmit.
 */
import { isNative } from './native';

export const DONATE_URL = 'https://shancoh18.github.io/brachas-with-rimon/donate.html';
const NATIVE_ENABLED = true;

export const donateAvailable = () => DONATE_URL.length > 0 && (NATIVE_ENABLED || !isNative());

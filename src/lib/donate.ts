/**
 * Donation config. When DONATE_URL is empty the Donate tab and screen hide
 * entirely — set it to the developer's payment link (PayPal.me / Ko-fi /
 * Buy Me a Coffee) to switch the whole feature on in one place.
 *
 * ⚠ App Review note: on iOS, tips/donations to the developer generally must
 * use In-App Purchase (guideline 3.1.1) — an external payment link may be
 * rejected. If review bounces it, gate donateAvailable() on !isNative().
 */
export const DONATE_URL = '';

export const donateAvailable = () => DONATE_URL.length > 0;

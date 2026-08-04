/**
 * Donation config. When DONATE_URL is empty the Donate tab and screen hide
 * entirely — it points at the website's donate page so payment methods can
 * change with a pages deploy, never an app release.
 *
 * ⚠ App Review: on iOS, tips/donations to the developer generally must use
 * In-App Purchase (guideline 3.1.1), and the web page currently shows a
 * placeholder until the Stripe link lands — so the tab is WEB-ONLY for now.
 * Flip NATIVE_ENABLED to true once a real payment method is live and the
 * 3.1.1 risk is a deliberate decision.
 */
import { isNative } from './native';

export const DONATE_URL = 'https://shancoh18.github.io/brachas-with-rimon/donate.html';
const NATIVE_ENABLED = false;

export const donateAvailable = () => DONATE_URL.length > 0 && (NATIVE_ENABLED || !isNative());

/**
 * Native-shell helpers (Capacitor / iOS App Store build).
 *
 * On the web these all no-op, so the PWA keeps its Web-Push + in-app ticker
 * path untouched. In the native app, mealtime reminders become iOS local
 * notifications: scheduled on-device, repeat daily, fire with the app closed,
 * and need no server round-trip.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNative = () => Capacitor.isNativePlatform();

/**
 * Remote push (APNs) — the channel for chat + competition nudges, which are
 * server-initiated and can't be local notifications. Registers with APNs and
 * resolves the device token (hex) to hand to the API, or null when the user
 * declines / registration fails. Safe to call repeatedly; iOS shows the
 * permission alert only once (shared with local notifications).
 */
export async function registerNativePush(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;
    await PushNotifications.removeAllListeners();
    return await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 10_000);
      void PushNotifications.addListener('registration', (t) => {
        clearTimeout(timer);
        resolve(t.value || null);
      });
      void PushNotifications.addListener('registrationError', () => {
        clearTimeout(timer);
        resolve(null);
      });
      void PushNotifications.register();
    });
  } catch {
    return null; // plugin missing (older binary) or APNs unreachable — never break boot
  }
}

const LINES = [
  'Eating soon? Ten seconds for the bracha first — your streak is waiting.',
  'Rimon here 🍎 — say it before you taste it.',
  'A moment of thanks before the meal. Your streak agrees.',
];

/** "HH:MM" strings → repeating daily local notifications. Returns true if scheduled. */
export async function scheduleNativeReminders(times: string[]): Promise<boolean> {
  if (!isNative()) return false;
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }

  await LocalNotifications.schedule({
    notifications: times.slice(0, 6).map((t, i) => {
      const [hour, minute] = t.split(':').map(Number);
      return {
        id: 700 + i,
        title: 'Brachas with Rimon',
        body: LINES[i % LINES.length],
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      };
    }),
  });
  return true;
}

export async function cancelNativeReminders(): Promise<void> {
  if (!isNative()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
}

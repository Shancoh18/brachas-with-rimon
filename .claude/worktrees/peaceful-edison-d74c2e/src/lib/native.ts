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

export const isNative = () => Capacitor.isNativePlatform();

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

/**
 * Native-shell helpers (Capacitor — the iOS App Store and Google Play builds).
 *
 * On the web these all no-op, so the PWA keeps its Web-Push + in-app ticker
 * path untouched. In the native apps, mealtime reminders become LOCAL
 * notifications (iOS UNUserNotificationCenter / Android AlarmManager):
 * scheduled on-device, repeat daily, fire with the app closed, and need no
 * server round-trip.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNative = () => Capacitor.isNativePlatform();
/** 'ios' | 'android' | 'web' — the shell we run in. Push channels (APNs vs
 *  FCM), Settings paths and sign-in providers differ per platform, so never
 *  treat isNative() as "is iPhone". */
export type Platform = 'ios' | 'android' | 'web';
export const platform = (): Platform => Capacitor.getPlatform() as Platform;
export const isIOS = () => platform() === 'ios';
export const isAndroid = () => platform() === 'android';

/** One Android notification channel for everything Rimon sends — pushes from
 *  the server name it (server/fcm.mjs FCM_CHANNEL_ID) and local reminders
 *  schedule into it. Android 8+ DROPS a notification aimed at a channel that
 *  doesn't exist, so both plugins create it (idempotent) before first use. */
export const ANDROID_CHANNEL = {
  id: 'rimon',
  name: 'Rimon nudges',
  description: 'Mealtime reminders, board chat and leaderboard nudges',
  importance: 4 as const, // IMPORTANCE_HIGH — heads-up, sound
  visibility: 1 as const, // VISIBILITY_PUBLIC
  vibration: true,
};

/**
 * Remote push (APNs on iOS, FCM on Android) — the channel for chat +
 * competition nudges, which are server-initiated and can't be local
 * notifications. Registers with the platform service and resolves the device
 * token (APNs hex / FCM registration token) to hand to the API together with
 * platform(), or null when the user declines / registration fails (on
 * Android also when the build carries no google-services.json — Firebase
 * throws, we swallow it, the app keeps working without pushes). Safe to call
 * repeatedly; the OS shows the permission alert only once (shared with local
 * notifications).
 */
export async function registerNativePush(): Promise<string | null> {
  if (!isNative()) return null;
  // Android WITHOUT Firebase (no android/app/google-services.json when the
  // bundle was built): the push plugin throws inside native code and
  // Capacitor rethrows it as a RuntimeException that KILLS the process — the
  // catch below never sees it (audit 2026-09-22). __ANDROID_FCM__ is defined
  // by vite.config.ts from that file's presence, so a Firebase-less build
  // simply has no server pushes, like iOS before the APNs key.
  if (isAndroid() && !__ANDROID_FCM__) return null;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;
    if (isAndroid()) await PushNotifications.createChannel(ANDROID_CHANNEL).catch(() => undefined);
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
  const perm = await LocalNotifications.requestPermissions(); // Android 13+: POST_NOTIFICATIONS prompt
  if (perm.display !== 'granted') return false;
  if (isAndroid()) await LocalNotifications.createChannel(ANDROID_CHANNEL).catch(() => undefined);

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
        // Android: file it under the Rimon channel (ignored on iOS). Without the
        // exact-alarm permission (Play reserves it for alarm/calendar apps) the
        // OS may deliver a mealtime nudge a few minutes late — acceptable.
        ...(isAndroid() ? { channelId: ANDROID_CHANNEL.id } : {}),
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

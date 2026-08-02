/**
 * Shared mealtime-reminder control. One implementation for both entry points:
 * the home-page nudge (Welcome) and the Reminders card (Journey).
 *
 * Three delivery paths, in preference order:
 *   native  → iOS local notifications (on-device, daily, app closed) — src/lib/native.ts
 *   push    → Web Push via the backend (needs an account)
 *   in-app  → the ticker in App.tsx (fires only while the app is open)
 */
import { useState } from 'react';
import { apiPushKey, apiPushSubscribe, vapidKeyToBytes } from './api';
import { cancelNativeReminders, isNative, scheduleNativeReminders } from './native';
import { useBracha } from '../store';

export type PushMode = 'background' | 'in-app' | null;

export function useReminders() {
  const { reminders, setReminders, serverToken } = useBracha();
  const [notifState, setNotifState] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [pushMode, setPushMode] = useState<PushMode>(null);

  /** Register a real Web-Push subscription with the backend (background
   *  reminders, even with the app closed). Falls back to the in-app ticker
   *  when there's no account or push is unsupported. */
  const subscribePush = async (times: string[]): Promise<'background' | 'in-app'> => {
    if (!serverToken || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'in-app';
    try {
      const reg = await navigator.serviceWorker.ready;
      const { key } = await apiPushKey(serverToken);
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToBytes(key) as BufferSource,
        }));
      await apiPushSubscribe(serverToken, sub, times);
      return 'background';
    } catch {
      return 'in-app';
    }
  };

  /**
   * Turn reminders on. `times` lets the caller commit new mealtimes in the same
   * step (the nudge flow does), so we never schedule against stale state.
   * Returns true when reminders are actually live.
   */
  const enableReminders = async (times?: string[]): Promise<boolean> => {
    const next = times ?? reminders.times;
    const configured = times ? true : reminders.configured;

    if (isNative()) {
      const ok = await scheduleNativeReminders(next);
      setNotifState(ok ? 'granted' : 'denied');
      if (!ok) return false;
      setReminders({ ...reminders, enabled: true, times: next, configured });
      setPushMode('background');
      return true;
    }

    if (typeof Notification === 'undefined') return false;
    const perm = await Notification.requestPermission();
    setNotifState(perm);
    if (perm !== 'granted') return false;

    setReminders({ ...reminders, enabled: true, times: next, configured });
    const mode = await subscribePush(next);
    setPushMode(mode);
    new Notification('Brachas with Rimon 🍎', {
      body:
        mode === 'background'
          ? 'Reminders are on — Rimon will nudge you at mealtimes, even when the app is closed.'
          : 'Reminders are on! Rimon will nudge you around mealtimes while the app is open.',
      icon: './icon-192.png',
    });
    return true;
  };

  const disableReminders = async (): Promise<void> => {
    setReminders({ ...reminders, enabled: false });
    setPushMode(null);
    if (isNative()) return void cancelNativeReminders();
    if (serverToken) {
      try {
        await apiPushSubscribe(serverToken, null, []);
      } catch {
        /* offline — server clears on next expired push */
      }
    }
  };

  /** Change one slot's time and re-schedule if reminders are already live. */
  const setTime = (index: number, value: string) => {
    const times = [...reminders.times];
    times[index] = value;
    setReminders({ ...reminders, times, configured: true });
    if (reminders.enabled) {
      if (isNative()) void scheduleNativeReminders(times);
      else void subscribePush(times).then(setPushMode);
    }
  };

  return { reminders, notifState, pushMode, enableReminders, disableReminders, setTime };
}

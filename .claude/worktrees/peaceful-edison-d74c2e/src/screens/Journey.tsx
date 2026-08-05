/** Journey tab — streak, stats, challenges, badges, reminders. */
import { useState } from 'react';
import { apiPushKey, apiPushSubscribe, vapidKeyToBytes } from '../lib/api';
import { cancelNativeReminders, isNative, scheduleNativeReminders } from '../lib/native';
import { badges, CHALLENGES, streakAlive } from '../lib/progress';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, ScreenShell } from '../components/ui';

export function Journey() {
  const { progress, reminders, setReminders, serverToken } = useBracha();
  const alive = streakAlive(progress);
  const earned = badges(progress).filter((b) => b.earned);
  const [notifState, setNotifState] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [pushMode, setPushMode] = useState<'background' | 'in-app' | null>(null);

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

  const enableReminders = async () => {
    // Native app: iOS local notifications — on-device, daily, app closed or not.
    if (isNative()) {
      const ok = await scheduleNativeReminders(reminders.times);
      setNotifState(ok ? 'granted' : 'denied');
      if (!ok) return;
      setReminders({ ...reminders, enabled: true });
      setPushMode('background');
      return;
    }
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifState(perm);
    if (perm !== 'granted') return;
    setReminders({ ...reminders, enabled: true });
    const mode = await subscribePush(reminders.times);
    setPushMode(mode);
    new Notification('Brachas with Rimon 🍎', {
      body:
        mode === 'background'
          ? 'Reminders are on — Rimon will nudge you at mealtimes, even when the app is closed.'
          : 'Reminders are on! Rimon will nudge you around mealtimes while the app is open.',
      icon: './icon-192.png',
    });
  };

  const disableReminders = async () => {
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

  return (
    <ScreenShell>
      <div className="pb-24">
        <header className="rise-in flex items-start justify-between gap-4 pb-6">
          <div className="space-y-2">
            <Eyebrow>Your practice</Eyebrow>
            <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">Journey</h2>
          </div>
          <Rimon pose={alive && progress.streakCurrent >= 3 ? 'celebrate' : 'idle'} size={88} />
        </header>

        {/* cinematic banner — a different aspect of Rimon, literally */}
        {alive && progress.streakCurrent >= 3 && (
          <Rimon variant="wide" pose="dance" className="rise-in rise-in-1 pb-4" say={"" + progress.streakCurrent + " days strong — keep the flame."} />
        )}

        {/* streak hero */}
        <Bezel className="rise-in rise-in-1" innerClassName="px-6 py-7 text-center">
          <p className="font-display text-[64px] font-black leading-none text-rimon">
            {alive ? progress.streakCurrent : 0}
            <span className="ml-1 align-super text-[22px]">🔥</span>
          </p>
          <p className="pt-2 text-[12px] font-bold uppercase tracking-[0.2em] text-mocha">
            day streak {alive ? '' : '— say a bracha today to begin'}
          </p>
          {/* last-7-days activity strip */}
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const entry = progress.history.find((h) => h.day === day);
              const initial = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      entry
                        ? 'bg-rimon text-cream shadow-[0_6px_16px_-4px_rgba(161,51,39,0.5)]'
                        : 'bg-espresso/[0.06] text-mocha'
                    }`}
                  >
                    {entry ? entry.brachos : '·'}
                  </span>
                  <span className="text-[8.5px] font-bold uppercase text-mocha">{initial}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-espresso/[0.07] pt-5">
            <div>
              <p className="font-display text-[24px] font-bold text-espresso">{progress.totalBrachos}</p>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-mocha">brachos</p>
            </div>
            <div>
              <p className="font-display text-[24px] font-bold text-espresso">{progress.mealsCompleted}</p>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-mocha">meals</p>
            </div>
            <div>
              <p className="font-display text-[24px] font-bold text-espresso">{progress.streakBest}</p>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-mocha">best streak</p>
            </div>
          </div>
        </Bezel>

        {/* badges */}
        {earned.length > 0 && (
          <div className="rise-in rise-in-2 flex flex-wrap gap-2 pt-5">
            {earned.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-[11px] font-semibold text-gold"
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* challenges */}
        <h3 className="rise-in rise-in-2 pb-3 pt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          Challenges
        </h3>
        <div className="flex flex-col gap-3">
          {CHALLENGES.map((c, idx) => {
            const value = Math.min(c.metric(progress), c.target);
            const pct = Math.round((value / c.target) * 100);
            const done = value >= c.target;
            return (
              <Bezel key={c.id} className={`rise-in rise-in-${Math.min(idx + 2, 4)}`} innerClassName="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-espresso">
                      {c.emoji} {c.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-mocha">{c.description}</p>
                  </div>
                  <span className={`shrink-0 text-[12px] font-bold ${done ? 'text-sage' : 'text-espresso-soft'}`}>
                    {done ? '✓' : `${value}/${c.target}`}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-espresso/[0.07]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${done ? 'bg-sage' : 'bg-gold'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Bezel>
            );
          })}
        </div>

        {/* reminders */}
        <h3 className="pb-3 pt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          Reminders
        </h3>
        <Bezel innerClassName="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-espresso">Mealtime nudges</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-mocha">
                Rimon reminds you to pause for a bracha around your usual mealtimes.
              </p>
            </div>
            <button
              onClick={() => (reminders.enabled ? void disableReminders() : void enableReminders())}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-500 ${
                reminders.enabled ? 'bg-sage' : 'bg-espresso/15'
              }`}
              aria-label="toggle reminders"
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  reminders.enabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          {reminders.enabled && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-espresso/[0.07] pt-4">
              {reminders.times.map((t, i) => (
                <input
                  key={i}
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const times = [...reminders.times];
                    times[i] = e.target.value;
                    setReminders({ ...reminders, times });
                    if (reminders.enabled) {
                      if (isNative()) void scheduleNativeReminders(times);
                      else void subscribePush(times).then(setPushMode);
                    }
                  }}
                  className="rounded-full bg-espresso/[0.05] px-3 py-1.5 text-[12px] font-semibold text-espresso outline-none"
                />
              ))}
            </div>
          )}
          {notifState === 'denied' && (
            <p className="mt-3 text-[10.5px] text-rimon">
              {isNative()
                ? 'Notifications are off for this app — enable them in Settings → Brachas with Rimon.'
                : 'Notifications are blocked in your browser settings — enable them for this site to get nudges.'}
            </p>
          )}
          <p className="mt-3 text-[10px] leading-snug text-mocha">
            {pushMode === 'background'
              ? 'Reminders are ON — they arrive even when the app is closed.'
              : isNative()
                ? 'Flip the toggle and reminders fire right on this device, app open or closed.'
                : serverToken
                  ? 'Reminders fire while the app is open; enable the toggle to register background push.'
                  : 'Join the league on the Friends tab to unlock background push — otherwise reminders fire while the app is open.'}
          </p>
        </Bezel>
      </div>
    </ScreenShell>
  );
}

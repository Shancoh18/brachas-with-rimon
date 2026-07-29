/** Journey tab — streak, stats, challenges, badges, reminders. */
import { useState } from 'react';
import { badges, CHALLENGES, streakAlive } from '../lib/progress';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, ScreenShell } from '../components/ui';

export function Journey() {
  const { progress, reminders, setReminders } = useBracha();
  const alive = streakAlive(progress);
  const earned = badges(progress).filter((b) => b.earned);
  const [notifState, setNotifState] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );

  const enableReminders = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifState(perm);
    if (perm === 'granted') {
      setReminders({ ...reminders, enabled: true });
      new Notification('Brachas with Rimon 🍎', {
        body: 'Reminders are on! Rimon will nudge you around mealtimes while the app is open.',
        icon: '/icon.png',
      });
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

        {/* streak hero */}
        <Bezel className="rise-in rise-in-1" innerClassName="px-6 py-7 text-center">
          <p className="font-display text-[64px] font-black leading-none text-rimon">
            {alive ? progress.streakCurrent : 0}
            <span className="ml-1 align-super text-[22px]">🔥</span>
          </p>
          <p className="pt-2 text-[12px] font-bold uppercase tracking-[0.2em] text-mocha">
            day streak {alive ? '' : '— say a bracha today to begin'}
          </p>
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
              onClick={() =>
                reminders.enabled
                  ? setReminders({ ...reminders, enabled: false })
                  : void enableReminders()
              }
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
                  }}
                  className="rounded-full bg-espresso/[0.05] px-3 py-1.5 text-[12px] font-semibold text-espresso outline-none"
                />
              ))}
            </div>
          )}
          {notifState === 'denied' && (
            <p className="mt-3 text-[10.5px] text-rimon">
              Notifications are blocked in your browser settings — enable them for this site to get
              nudges.
            </p>
          )}
          <p className="mt-3 text-[10px] leading-snug text-mocha">
            Web reminders fire while the app is open or installed to your home screen. (Full
            background push arrives with accounts.)
          </p>
        </Bezel>
      </div>
    </ScreenShell>
  );
}

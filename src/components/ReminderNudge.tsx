/**
 * Home-page mealtime-reminder nudge (sits under Rimon's tip of the day).
 *
 * Tapping it opens a sheet that asks for the user's own breakfast / lunch /
 * dinner times, then turns on auto-reminders in one step. Once configured the
 * card becomes a quiet status line that reopens the same sheet to edit.
 */
import { useEffect, useState } from 'react';
import { isNative } from '../lib/native';
import { useReminders } from '../lib/useReminders';
import { MEAL_SLOTS, useBracha } from '../store';
import { Rimon } from './Rimon';
import { PillButton } from './ui';

/** "08:00" → "8:00 AM" for the collapsed summary line. */
function pretty(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function ReminderNudge() {
  const { reminders, notifState, pushMode, enableReminders, disableReminders } = useReminders();
  const setReminders = useBracha((s) => s.setReminders);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(reminders.times);
  const [saving, setSaving] = useState(false);

  // re-seed the draft each time the sheet opens, so Cancel truly discards
  useEffect(() => {
    if (open) setDraft(reminders.times);
  }, [open, reminders.times]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const live = reminders.enabled;
  const configured = reminders.configured === true;

  const save = async () => {
    setSaving(true);
    try {
      const ok = await enableReminders(draft);
      // Permission refused? Still keep their times — they can retry from Journey.
      if (!ok) setReminders({ ...reminders, times: draft, configured: true });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const turnOff = async () => {
    await disableReminders();
    setOpen(false);
  };

  return (
    <>
      <button
        data-reminder-nudge
        onClick={() => setOpen(true)}
        className="rise-in rise-in-4 mx-auto flex w-full max-w-[320px] items-center gap-3 rounded-[1.5rem] border border-sage/25 bg-sage/[0.06] px-5 py-4 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-sage/45"
      >
        <span className="text-[19px] leading-none">{live ? '🔔' : '⏰'}</span>
        <span className="flex-1">
          <span className="block text-[9.5px] font-bold uppercase tracking-[0.2em] text-sage-deep">
            {live ? 'Mealtime reminders on' : 'Mealtime reminders'}
          </span>
          <span className="mt-1 block text-[13px] font-semibold leading-snug text-espresso">
            {live && configured
              ? draft.slice(0, 3).map(pretty).join(' · ')
              : 'Never miss a bracha — set your mealtimes'}
          </span>
          <span className="mt-0.5 block text-[10.5px] text-mocha">
            {live ? 'tap to edit your times →' : 'breakfast, lunch and dinner →'}
          </span>
        </span>
      </button>

      {open && (
        <div
          data-reminder-sheet
          className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/25 backdrop-blur-[2px] sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="sheet-rise max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-cream px-6 pb-8 pt-6 shadow-[0_-18px_60px_-20px_rgba(43,33,26,0.35)] sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-espresso/15 sm:hidden" />

            <div className="flex items-start gap-3 pb-5">
              <Rimon pose="pointing" size={72} />
              <div className="flex-1 pt-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold">
                  Auto reminders
                </p>
                <h3 className="mt-1 font-display text-[22px] font-bold leading-tight text-espresso">
                  When do you usually eat?
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-mocha">
                  Rimon will nudge you just before each meal, so the bracha comes before the first
                  bite.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {MEAL_SLOTS.map((slot, i) => (
                <label
                  key={slot.key}
                  className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-espresso/[0.07]"
                >
                  <span className="text-[17px] leading-none">{slot.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-[13.5px] font-semibold text-espresso">
                      {slot.label}
                    </span>
                    <span className="block text-[10.5px] text-mocha">{slot.hint}</span>
                  </span>
                  <input
                    type="time"
                    aria-label={`${slot.label} reminder time`}
                    value={draft[i] ?? ''}
                    onChange={(e) => {
                      const next = [...draft];
                      next[i] = e.target.value;
                      setDraft(next);
                    }}
                    className="rounded-full bg-espresso/[0.06] px-3 py-2 text-[13px] font-semibold text-espresso outline-none ring-1 ring-transparent transition-[box-shadow] duration-200 focus:ring-gold/40"
                  />
                </label>
              ))}
            </div>

            {notifState === 'denied' && (
              <p className="mt-3 text-[10.5px] leading-snug text-rimon">
                {isNative()
                  ? 'Notifications are off for this app — enable them in Settings → Brachas with Rimon, then tap Turn on again.'
                  : 'Notifications are blocked in your browser settings — enable them for this site to get nudges. Your times are still saved.'}
              </p>
            )}

            <p className="mt-3 text-[10px] leading-snug text-mocha">
              {pushMode === 'background' || (isNative() && live)
                ? 'Reminders arrive even when the app is closed.'
                : isNative()
                  ? 'Reminders fire on this device, app open or closed.'
                  : 'Reminders fire while the app is open. Join the league on the Friends tab to unlock background push.'}
            </p>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => (live ? void turnOff() : setOpen(false))}
                className="text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
              >
                {live ? 'Turn reminders off' : 'Not now'}
              </button>
              <PillButton variant="rimon" icon="🔔" onClick={() => void save()} disabled={saving}>
                {saving ? 'Setting up…' : live ? 'Save times' : 'Turn on reminders'}
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

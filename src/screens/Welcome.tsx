/** Screen 1 — nusach selector + camera. Rimon greets. */
import { useRef, useState } from 'react';
import { NUSACHIM, type NusachId } from '../data/texts';
import { useBracha } from '../store';
import { LESSONS } from '../data/learn';
import { streakAlive, todayStamp } from '../lib/progress';
import { Rimon } from '../components/Rimon';
import { LeagueNudge } from '../components/LeagueNudge';
import { ReminderNudge } from '../components/ReminderNudge';
import { Eyebrow, PillButton, ScreenShell } from '../components/ui';
import { analyzePhoto, demoMeal, resizeImage } from '../lib/analyze';
import { toMealItems } from '../lib/classify';

/** epoch ms → "just now" / "25m ago" / "2h ago" / "yesterday" / "3 days ago" */
function savedAgo(ts: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function Welcome() {
  const { nusach, setNusach, setScreen, setPhoto, setItems, setUnmatched, setDemoFallback, notePhotoFlow, progress, dayStats, setTab, pendingAfter } =
    useBracha();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const alive = streakAlive(progress);
  const today = todayStamp();
  const blessedToday = progress.lastActiveDay === today || (dayStats.day === today && dayStats.brachos > 0);
  const brachosToday = dayStats.day === today ? dayStats.brachos : 0;
  // last 7 local days, oldest first, for the streak widget's mini strip
  const week = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { day, active: progress.history.some((h) => h.day === day && h.brachos > 0) };
  });
  // Rimon's tip of the day — rotates through the Learn library by date
  const tip = LESSONS[new Date().getDate() % LESSONS.length];

  const runAnalysis = async (file?: File) => {
    setBusy(true);
    setScreen('identify');
    try {
      let result;
      let fellBack = false;
      if (file) {
        const { dataUrl, base64, mediaType } = await resizeImage(file);
        setPhoto(dataUrl);
        try {
          result = await analyzePhoto(base64, mediaType);
          notePhotoFlow(); // Snap & Bless daily
        } catch {
          // Identification unreachable/timed out. Hand back an EMPTY plate —
          // never a substitute meal. Confirm explains and opens manual search,
          // so the user adds what they are actually eating.
          result = { items: [], unmatched: [] };
          fellBack = true;
        }
      } else {
        setPhoto(null);
        result = demoMeal();
      }
      setDemoFallback(fellBack);
      setItems(toMealItems(result.items));
      setUnmatched(result.unmatched ?? []);
      setScreen('confirm');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-44 pt-8 text-center">
        <div className="rise-in">
          <Rimon pose="idle" say="Shalom! I’m Rimon. Show me your meal — we’ll learn its brachos together, and keep your streak alive." size={128} />
        </div>

        <header className="rise-in rise-in-1 space-y-4">
          <Eyebrow>Blessings, beautifully guided</Eyebrow>
          <h1 className="font-display text-[44px] font-black leading-[1.05] tracking-tight text-espresso">
            Brachas <span className="text-rimon">with Rimon</span>
          </h1>
          <p className="mx-auto max-w-[300px] text-[14px] leading-relaxed text-espresso-soft">
            Photograph your food. Learn the right blessing for each item — in the right order —
            and what to say after.
          </p>
        </header>

        {/* nusach selector */}
        <div className="rise-in rise-in-2 flex rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07]">
          {(Object.keys(NUSACHIM) as NusachId[]).map((id) => (
            <button
              key={id}
              onClick={() => setNusach(id)}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-[background-color,color,transform] duration-150 ease-out ${
                nusach === id ? 'bg-espresso text-cream shadow-sm' : 'text-espresso-soft'
              }`}
            >
              {NUSACHIM[id].label.replace(' (Chabad)', '')}
            </button>
          ))}
        </div>
        {!NUSACHIM[nusach].complete && (
          <p className="rise-in -mt-4 max-w-[300px] text-[10.5px] leading-snug text-mocha">
            Hebrew shown from the shared (Chabad-published) text; verify wording against your own
            siddur.
          </p>
        )}

        <div className="rise-in rise-in-3 flex flex-col items-center gap-3">
          <PillButton variant="rimon" icon="📷" onClick={() => fileRef.current?.click()} disabled={busy}>
            Photograph my meal
          </PillButton>
          <PillButton
            icon="🔎"
            onClick={() => {
              // manual entry: same confirm → guide → after flow, no photo needed
              setPhoto(null);
              setDemoFallback(false);
              setItems([]);
              setUnmatched([]);
              setScreen('confirm');
            }}
          >
            Add it manually!
          </PillButton>
          <PillButton icon="📖" onClick={() => setScreen('reference')}>
            Quick blessing guide
          </PillButton>
          <PillButton icon="🍞" onClick={() => setScreen('benching')}>
            Birkat Hamazon
          </PillButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runAnalysis(f);
              e.target.value = '';
            }}
          />
        </div>

        {/* after-blessings saved for later — the reminder-style home widget.
            Persisted (pendingAfter), so it survives closing the app; it
            disappears the moment the circle is closed on the After screen. */}
        {pendingAfter && pendingAfter.items.length > 0 && (
          <button
            data-after-widget
            onClick={() => setScreen('after')}
            className="rise-in rise-in-3 mx-auto flex w-full max-w-[320px] items-center gap-3 rounded-[1.5rem] border border-gold/30 bg-gold/[0.07] px-5 py-4 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-gold/50"
          >
            <span className="text-[19px] leading-none">🔖</span>
            <span className="flex-1">
              <span className="block text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold">
                After-blessings saved
              </span>
              <span className="mt-1 block text-[13px] font-semibold capitalize leading-snug text-espresso">
                {pendingAfter.items
                  .slice(0, 3)
                  .map((i) => i.label.toLowerCase())
                  .join(' · ')}
                {pendingAfter.items.length > 3 ? ` +${pendingAfter.items.length - 3} more` : ''}
              </span>
              <span className="mt-0.5 block text-[10.5px] text-mocha">
                saved {savedAgo(pendingAfter.savedAt)} · tap when you’re done eating →
              </span>
            </span>
          </button>
        )}

        {/* home widget bar — streak tracker + today's bracha check, one glance.
            Compact ON PURPOSE: a taller widget block pushed the primary CTA
            under the tab bar on first paint (blind-QA blocker). */}
        <div
          className="rise-in rise-in-4 flex w-full max-w-[330px] items-center gap-3.5 rounded-[1.25rem] border border-hairline bg-white/60 px-4 py-3 text-left shadow-[0_10px_30px_-14px_rgba(43,33,26,0.25)]"
          data-home-widgets
        >
          <div className="flex shrink-0 items-baseline gap-1">
            <span className="font-display text-[24px] font-black leading-none text-rimon">
              {alive ? progress.streakCurrent : 0}
            </span>
            <span className="text-[13px]">🔥</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex gap-1" aria-label="last seven days">
              {week.map((d) => (
                <span
                  key={d.day}
                  className={`h-1.5 flex-1 rounded-full ${d.active ? 'bg-gold' : 'bg-espresso/10'}`}
                />
              ))}
            </div>
            <p className={`mt-1.5 text-[10.5px] font-semibold leading-tight ${blessedToday ? 'text-sage-deep' : 'text-espresso'}`}>
              {blessedToday
                ? `Bracha said today ✓ ${brachosToday > 0 ? `· ${brachosToday} so far` : ''}`
                : 'Have you said your bracha today?'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setTab('learn')}
          className="rise-in rise-in-4 mx-auto max-w-[320px] rounded-[1.5rem] border border-gold/20 bg-gold/[0.05] px-5 py-4 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-gold/40"
        >
          <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold">Rimon’s tip of the day</p>
          <p className="mt-1.5 font-display text-[14.5px] italic leading-snug text-espresso">{tip.emoji} {tip.hook}</p>
          <p className="mt-1 text-[10.5px] text-mocha">read the {tip.minutes}-minute lesson →</p>
        </button>

        {/* mealtime reminders — set breakfast / lunch / dinner in one sheet */}
        <ReminderNudge />
        <LeagueNudge />
      </div>
    </ScreenShell>
  );
}

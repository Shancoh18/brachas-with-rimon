/** Screen 1 — nusach selector + camera. Rimon greets. */
import { useRef, useState } from 'react';
import { NUSACHIM, type NusachId } from '../data/texts';
import { useBracha } from '../store';
import { LESSONS } from '../data/learn';
import { streakAlive } from '../lib/progress';
import { Rimon } from '../components/Rimon';
import { LeagueNudge } from '../components/LeagueNudge';
import { ReminderNudge } from '../components/ReminderNudge';
import { Eyebrow, PillButton, ScreenShell } from '../components/ui';
import { analyzePhoto, demoMeal, resizeImage } from '../lib/analyze';
import { toMealItems } from '../lib/classify';

export function Welcome() {
  const { nusach, setNusach, setScreen, setPhoto, setItems, setUnmatched, setDemoFallback, notePhotoFlow, progress, setTab } =
    useBracha();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const alive = streakAlive(progress);
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
          // identification unreachable/timed out → demo fallback, labeled in Confirm
          result = demoMeal();
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
          {progress.totalBrachos > 0 && (
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-full bg-rimon/[0.08] px-3.5 py-1.5 text-[12px] font-bold text-rimon">🔥 {alive ? progress.streakCurrent : 0}-day streak</span>
              <span className="rounded-full bg-espresso/[0.05] px-3.5 py-1.5 text-[12px] font-bold text-espresso-soft">{progress.totalBrachos} brachos</span>
            </div>
          )}
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
            Forgot to take a photo? Add it manually!
          </PillButton>
          <PillButton icon="📖" onClick={() => setScreen('reference')}>
            Quick blessing guide
          </PillButton>
          <PillButton icon="🍞" onClick={() => setScreen('benching')}>
            Birkat Hamazon
          </PillButton>
          <button
            onClick={() => runAnalysis()}
            className="text-[12px] font-medium text-mocha underline-offset-4 transition-colors hover:text-espresso hover:underline"
          >
            or try a demo meal
          </button>
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

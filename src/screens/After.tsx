/**
 * Screen 5 — after-brachos. Shiur confirmation (kezayis / revi'is is
 * user-supplied — a photo can't measure it), then the resolver output:
 * Birkat Hamazon / ONE combined Me'ein Shalosh (with the day's insertion on
 * Shabbat, Rosh Chodesh and festivals — "Today is…") / Borei Nefashos.
 * Rimon celebrates (gen-AI video loop).
 */
import { useMemo, useState } from 'react';
import { AFTER_LABEL } from '../data/foods';
import { NUSACHIM } from '../data/texts';
import { assembleMeein, MEEIN_YOMTOV_VARIANT, toggleMeeinOccasion, type MeeinDay } from '../data/texts/meein';
import type { MeeinOccasion } from '../data/texts/types';
import { apiSync } from '../lib/api';
import { resolveAfterBrachos } from '../lib/afterBracha';
import { streakAlive, todayStamp } from '../lib/progress';
import { useBracha, type PendingAfterItem, type TextMode } from '../store';
import { HearIt } from '../components/HearIt';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell, WhyDropdown } from '../components/ui';
import { WHY_AFTER } from '../data/why';

const MODES: TextMode[] = ['hebrew', 'translit', 'english'];

/** the "Today is…" chips, calendar order — Shabbat toggles on its own, the
 *  rest are one-of (Rosh Chodesh and the festivals never share a day) */
const OCCASIONS: { key: MeeinOccasion; label: string }[] = [
  { key: 'shabbat', label: 'Shabbat' },
  { key: 'roshChodesh', label: 'Rosh Chodesh' },
  { key: 'roshHashanah', label: 'Rosh Hashanah' },
  { key: 'sukkot', label: 'Sukkot' },
  { key: 'shminiAtzeret', label: 'Shemini Atzeret' },
  { key: 'pesach', label: 'Pesach' },
  { key: 'shavuot', label: 'Shavuot' },
];
const CHIP =
  'rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]';
const chip = (on: boolean) =>
  `${CHIP} ${on ? 'bg-espresso text-cream ring-espresso' : 'bg-white/60 text-espresso-soft ring-espresso/[0.12] hover:ring-espresso/30'}`;

export function After() {
  const {
    items,
    nusach,
    textMode,
    setTextMode,
    reset,
    progress,
    setScreen,
    setPartyTime,
    celebration,
    pendingAfter,
    updatePendingItem,
    clearPendingAfter,
    completeAfter,
    meeinDay,
    setMeeinDay,
  } = useBracha();
  const pack = NUSACHIM[nusach];
  // "Today is…" — the day insertion of Me'ein Shalosh (OC 208:12). The pick is
  // kept for the local calendar day it was made on (see MeeinDayChoice).
  const today = todayStamp();
  const day: MeeinDay = meeinDay.day === today ? meeinDay : { occasions: [], yomTov: false };
  const toggleOccasion = (k: MeeinOccasion) =>
    setMeeinDay({ day: today, occasions: toggleMeeinOccasion(day.occasions, k), yomTov: !!day.yomTov });
  const setYomTov = (yomTov: boolean) => setMeeinDay({ day: today, occasions: [...day.occasions], yomTov });
  // Pesach / Sukkot under a nusach whose festival line differs on the festival
  // day itself (Ashkenaz / Edot "בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ") → offer the choice
  const yomTovChoice = day.occasions.some(
    (k) => MEEIN_YOMTOV_VARIANT.includes(k) && !!pack.meeinShalosh.occasionsYomTov?.[k as 'pesach' | 'sukkot'],
  );
  // Resumed from the home widget (no live meal in flight) → the meal is long
  // over, skip the "enjoy your meal" pause and go straight to the shiur check.
  const resumed = items.length === 0;
  /** ask → enjoy the meal first; shiur → how much; done → the after-brachos */
  const [phase, setPhase] = useState<'ask' | 'shiur' | 'done'>(resumed ? 'shiur' : 'ask');
  const confirmed = phase === 'done';
  // completeAfter clears pendingAfter, so freeze the item set at that moment
  // for the 'done' phase to keep rendering from
  const [frozen, setFrozen] = useState<PendingAfterItem[] | null>(null);

  // The guide-finish snapshot (persisted) is the single source of truth here —
  // the meal itself is already logged, only its after-blessings are open.
  const source = frozen ?? pendingAfter?.items ?? [];

  const result = useMemo(() => resolveAfterBrachos(source), [source]);

  const sayAfterNow = () => {
    const said: string[] = [];
    if (result.birkatHamazon) said.push('BirkatHamazon');
    if (result.meeinInserts.length) said.push('MeeinShalosh');
    if (result.boreiNefashos) said.push('BoreiNefashos');
    setFrozen(source);
    completeAfter(said);
    const { serverToken, progress: p } = useBracha.getState();
    if (serverToken) void apiSync(serverToken, p).catch(() => undefined);
  };

  // nothing pending and nothing frozen — e.g. a stale deep-entry; go home
  if (source.length === 0) {
    setScreen('welcome');
    return null;
  }

  // ------------------------------------------------------------- ASK phase
  // Never abrupt: the blessings are said, the meal is HAPPENING. Rimon waits.
  if (phase === 'ask') {
    return (
      <ScreenShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-16 text-center">
          <div className="rise-in">
            <Rimon
              pose="idle"
              say="Beautiful — every blessing said. Now enjoy your meal! I'll be right here when you're done."
              size={150}
            />
          </div>
          <header className="rise-in rise-in-1 space-y-3">
            <Eyebrow>B’teavon — enjoy</Eyebrow>
            <h2 className="font-display text-[34px] font-bold leading-tight text-espresso">
              Savor it.
            </h2>
            <p className="mx-auto max-w-[300px] text-[13.5px] leading-relaxed text-espresso-soft">
              When you’ve finished eating, we’ll close the meal properly with the after-blessings.
              No rush.
            </p>
          </header>
          <div className="rise-in rise-in-2 flex flex-col items-center gap-3">
            <PillButton variant="rimon" icon="✓" onClick={() => setPhase('shiur')}>
              I’m done eating — after-blessings
            </PillButton>
            <PillButton
              icon="🔖"
              onClick={() => {
                // meal already logged at guide-finish; the persisted snapshot
                // becomes the home-screen widget until the circle is closed
                if (celebration) setPartyTime(true);
                else reset();
              }}
            >
              Save after-blessings for later
            </PillButton>
            <PillButton
              variant="ghost"
              icon="→"
              onClick={() => {
                clearPendingAfter();
                if (celebration) setPartyTime(true);
                else reset();
              }}
            >
              Skip after-blessings
            </PillButton>
            <button
              onClick={() => setScreen('guide')}
              className="pt-1 text-[12px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
            >
              ← back to the blessings
            </button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  if (!confirmed) {
    return (
      <ScreenShell>
        <header className="rise-in space-y-2 pb-2 text-center">
          <Eyebrow>{resumed ? 'Welcome back — let’s finish' : 'Almost done'}</Eyebrow>
          <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">
            How much did you eat?
          </h2>
          <p className="mx-auto max-w-[320px] text-[12.5px] leading-relaxed text-espresso-soft">
            An after-blessing is only said on a <em>kezayis</em> (an olive’s volume) of food eaten
            within ~4 minutes — or a <em>revi’is</em> of a drink. Untick anything you only tasted.
          </p>
        </header>
        <div className="flex justify-center py-4">
          <Rimon pose="thinking" size={100} />
        </div>
        <div className="flex flex-col gap-2.5">
          {source.map((i, idx) => (
            <label
              key={i.id}
              className={`rise-in rise-in-${Math.min(idx + 1, 4)} flex cursor-pointer items-center justify-between rounded-[1.25rem] bg-white/70 px-5 py-3.5 ring-1 ring-espresso/[0.07] transition-[background-color,color,transform] duration-150 ease-out ${
                i.shiurMet ? '' : 'opacity-50'
              }`}
            >
              <span className="text-[14px] font-medium capitalize text-espresso">{i.label}</span>
              <input
                type="checkbox"
                checked={i.shiurMet}
                onChange={(e) => updatePendingItem(i.id, { shiurMet: e.target.checked })}
                className="h-5 w-5 accent-[#a13327]"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-center py-8">
          <PillButton
            variant="rimon"
            onClick={() => {
              sayAfterNow();
              setPhase('done');
            }}
          >
            Show my after-blessings
          </PillButton>
        </div>
      </ScreenShell>
    );
  }

  const meeinTitle =
    result.meeinInserts.length > 0
      ? `Me’ein Shalosh — ${result.meeinInserts.map((k) => AFTER_LABEL[k]).join(' + ')}`
      : '';
  const meein = result.meeinInserts.length > 0 ? assembleMeein(pack, result.meeinInserts, day) : null;

  return (
    <ScreenShell wide>
      <header className="rise-in flex flex-col items-center gap-4 pb-6 text-center">
        <Rimon
          pose="celebrate"
          say={
            result.none
              ? 'No after-blessing this time — nothing reached a kezayis.'
              : `Beautifully done! ${streakAlive(progress) ? `🔥 Day ${progress.streakCurrent} of your streak — ` : ''}here’s how to finish.`
          }
          size={140}
        />
        <div className="space-y-2">
          <Eyebrow>After the meal</Eyebrow>
          <h2 className="font-display text-[34px] font-bold leading-tight text-espresso">
            {result.birkatHamazon
              ? 'Birkat Hamazon'
              : result.none
                ? 'You’re all set'
                : 'Your after-blessings'}
          </h2>
        </div>
      </header>

      {/* text-mode toggle */}
      {!result.none && (
        <div className="rise-in rise-in-1 mx-auto mb-5 flex w-max rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07]">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setTextMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold capitalize transition-[background-color,color,transform] duration-150 ease-out ${
                textMode === m ? 'bg-espresso text-cream' : 'text-espresso-soft'
              }`}
            >
              {m === 'translit' ? 'transliteration' : m}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* ------------------------------------------------ Birkat Hamazon */}
        {result.birkatHamazon && (
          <Bezel className="rise-in rise-in-2" innerClassName="px-6 py-7">
            <p className="pb-4 text-[12px] leading-relaxed text-mocha">{pack.birkatHamazon.intro}</p>
            <div className="flex flex-col gap-6">
              {pack.birkatHamazon.sections.map((s) => (
                <div key={s.name}>
                  <h3 className="pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                    {s.name}
                  </h3>
                  {textMode === 'hebrew' && (
                    <p dir="rtl" lang="he" className="hebrew text-[22px] text-espresso">
                      {s.hebrew}
                    </p>
                  )}
                  {textMode === 'translit' && (
                    <p className="font-display text-[15px] italic leading-relaxed text-espresso">
                      {s.translit}
                    </p>
                  )}
                  {textMode === 'english' && (
                    <p className="text-[14px] leading-relaxed text-espresso">{s.english}</p>
                  )}
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-1.5 border-t border-espresso/[0.07] pt-4">
              {pack.birkatHamazon.notes.map((n) => (
                <li key={n} className="text-[11px] leading-snug text-mocha">
                  · {n}
                </li>
              ))}
            </ul>
            <WhyDropdown className="mt-5" entry={WHY_AFTER.birkatHamazon} />
          </Bezel>
        )}

        {/* --------------------------------------- Me'ein Shalosh (combined) */}
        {result.meeinInserts.length > 0 && (
          <Bezel className="rise-in rise-in-2" innerClassName="px-6 py-7">
            <h3 className="pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
              {meeinTitle}
            </h3>
            <p className="pb-4 text-[11.5px] leading-snug text-mocha">
              One combined blessing — the inserts join, they are never said separately.
            </p>
            {/* day insertion: Shabbat first, then the one day line, before "כִּי אַתָּה" */}
            <div
              className="mb-4 rounded-[1rem] bg-espresso/[0.04] px-3.5 py-3 ring-1 ring-espresso/[0.06]"
              data-meein-day={day.occasions.join('+') || 'weekday'}
            >
              <p className="pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-mocha">Today is…</p>
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={day.occasions.includes(key)}
                    onClick={() => toggleOccasion(key)}
                    className={chip(day.occasions.includes(key))}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {yomTovChoice && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5" data-meein-yomtov={day.yomTov ? 'yomtov' : 'cholhamoed'}>
                  <button type="button" aria-pressed={!day.yomTov} onClick={() => setYomTov(false)} className={chip(!day.yomTov)}>
                    Chol Hamoed
                  </button>
                  <button type="button" aria-pressed={!!day.yomTov} onClick={() => setYomTov(true)} className={chip(!!day.yomTov)}>
                    Yom Tov itself
                  </button>
                </div>
              )}
              <p className="pt-2 text-[10.5px] leading-snug text-mocha">
                {day.occasions.length
                  ? `Today’s line is added before “כִּי אַתָּה”${day.occasions.includes('shminiAtzeret') ? ' — Simchat Torah says it too' : ''}.`
                  : 'On Shabbat, Rosh Chodesh or a festival, tap the day and its line joins the blessing.'}
              </p>
            </div>
            {meein && textMode === 'hebrew' && (
              <p dir="rtl" lang="he" className="hebrew text-[22px] text-espresso" data-meein-text>
                {meein.hebrew}
              </p>
            )}
            {meein && textMode === 'translit' && (
              <p className="font-display text-[15px] italic leading-relaxed text-espresso" data-meein-text>
                {meein.translit}
              </p>
            )}
            {meein && textMode === 'english' && (
              <p className="text-[14px] leading-relaxed text-espresso" data-meein-text>
                {meein.english}
              </p>
            )}
            {meein?.israelNotes.map((n) => (
              <p
                key={n.english}
                dir={textMode === 'hebrew' ? 'rtl' : undefined}
                lang={textMode === 'hebrew' ? 'he' : undefined}
                className={`pt-2 text-mocha ${textMode === 'hebrew' ? 'hebrew text-[15px]' : 'text-[11.5px] leading-snug'}`}
              >
                ({n[textMode]})
              </p>
            ))}
            <div className="mt-5 border-t border-espresso/[0.07] pt-4">
              {/* recordings are Nusach Ari wording — never play them under another nusach's text */}
              {nusach === 'ari' && day.occasions.length === 0 ? (
                // file name mirrors the resolver's canonical insert order (michya → gefen → etz)
                <HearIt
                  src={`${import.meta.env.BASE_URL}audio/meein-${result.meeinInserts.map((k) => k.toLowerCase()).join('-')}.mp3`}
                />
              ) : nusach === 'ari' ? (
                // the recordings speak the weekday text — never play them under a day line
                <p className="text-[11px] leading-snug text-mocha" data-meein-audio="weekday-only">
                  The recording is the weekday text — with today’s line added, read it from the text above.
                </p>
              ) : (
                <p className="text-[11px] leading-snug text-mocha">
                  Audio for this blessing is recorded in Nusach Ari wording only, so it isn’t offered for {pack.label}.
                </p>
              )}
            </div>
            <WhyDropdown className="mt-5" entry={WHY_AFTER.meeinShalosh} />
          </Bezel>
        )}

        {/* ---------------------------------------------------- Borei Nefashos */}
        {result.boreiNefashos && (
          <Bezel className="rise-in rise-in-3" innerClassName="px-6 py-7">
            <h3 className="pb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
              Borei Nefashos
            </h3>
            {textMode === 'hebrew' && (
              <p dir="rtl" lang="he" className="hebrew text-[24px] text-espresso">
                {pack.boreiNefashos.hebrew}
              </p>
            )}
            {textMode === 'translit' && (
              <p className="font-display text-[15px] italic leading-relaxed text-espresso">
                {pack.boreiNefashos.translit}
              </p>
            )}
            {textMode === 'english' && (
              <p className="text-[14px] leading-relaxed text-espresso">{pack.boreiNefashos.english}</p>
            )}
            <div className="mt-5 border-t border-espresso/[0.07] pt-4">
              <HearIt src={`${import.meta.env.BASE_URL}audio/borei-nefashos.mp3`} />
            </div>
            <WhyDropdown className="mt-5" entry={WHY_AFTER.boreiNefashos} />
          </Bezel>
        )}

        {/* items no after-blessing could be placed for — never silently dropped */}
        {result.unresolved.length > 0 && (
          <Bezel className="rise-in rise-in-3" innerClassName="px-6 py-5">
            <p className="text-[12.5px] leading-relaxed text-espresso-soft" data-after-unresolved>
              <strong className="text-espresso">Ask a rabbi:</strong> the app couldn’t place{' '}
              <span className="capitalize">{result.unresolved.join(' · ').toLowerCase()}</span> in an
              after-blessing, so it isn’t shown above. Please check with a qualified rabbi.
            </p>
          </Bezel>
        )}

        {/* coverage notes */}
        {result.coverage.map((c) => (
          <p key={c.blessing} className="text-center text-[11.5px] leading-relaxed text-mocha">
            <strong className="text-espresso-soft">{c.blessing}</strong> covers:{' '}
            <span className="capitalize">{c.covers.join(' · ').toLowerCase()}</span>
          </p>
        ))}

        {!NUSACHIM[nusach].complete && (
          <p className="text-center text-[10.5px] leading-snug text-mocha">
            {NUSACHIM[nusach].completenessNote}
          </p>
        )}
      </div>

      <div className="flex justify-center py-10">
        <PillButton
          variant="rimon"
          icon="🎉"
          onClick={() => (celebration ? setPartyTime(true) : reset())}
        >
          Finish meal
        </PillButton>
      </div>
    </ScreenShell>
  );
}

/**
 * Screen 5 — after-brachos. Shiur confirmation (kezayis / revi'is is
 * user-supplied — a photo can't measure it), then the resolver output:
 * Birkat Hamazon / ONE combined Me'ein Shalosh / Borei Nefashos.
 * Rimon celebrates (gen-AI video loop).
 */
import { useMemo, useState } from 'react';
import { AFTER_LABEL } from '../data/foods';
import { NUSACHIM } from '../data/texts';
import { resolveAfterBrachos } from '../lib/afterBracha';
import { groupForRecitation } from '../lib/kedima';
import { streakAlive } from '../lib/progress';
import { useBracha, type TextMode } from '../store';
import { HearIt } from '../components/HearIt';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const MODES: TextMode[] = ['hebrew', 'translit', 'english'];

export function After() {
  const { items, updateItem, nusach, textMode, setTextMode, reset, completeMeal, progress } =
    useBracha();
  const pack = NUSACHIM[nusach];
  const [confirmed, setConfirmed] = useState(false);

  const result = useMemo(
    () =>
      resolveAfterBrachos(
        items.map((i) => ({
          id: i.id,
          label: i.label,
          achrona: i.entry.brachaAchrona,
          shiurMet: i.shiurMet,
          isBread: i.entry.brachaRishona === 'Hamotzi',
          isFiveGrain: i.entry.isFiveGrain,
          isShivaFruit: i.entry.shivasHaminim && i.entry.isTreeFruit,
          isTreeFruit: i.entry.isTreeFruit,
          isWineGrape: i.entry.isWineGrape,
          isDrink: i.entry.isDrink,
        })),
      ),
    [items],
  );

  if (!confirmed) {
    return (
      <ScreenShell>
        <header className="rise-in space-y-2 pb-2 text-center">
          <Eyebrow>Almost done</Eyebrow>
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
          {items.map((i, idx) => (
            <label
              key={i.id}
              className={`rise-in rise-in-${Math.min(idx + 1, 4)} flex cursor-pointer items-center justify-between rounded-[1.25rem] bg-white/70 px-5 py-3.5 ring-1 ring-espresso/[0.07] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                i.shiurMet ? '' : 'opacity-50'
              }`}
            >
              <span className="text-[14px] font-medium capitalize text-espresso">{i.label}</span>
              <input
                type="checkbox"
                checked={i.shiurMet}
                onChange={(e) => updateItem(i.id, { shiurMet: e.target.checked })}
                className="h-5 w-5 accent-[#a13327]"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-center py-8">
          <PillButton
            variant="rimon"
            onClick={() => {
              // record the completed meal: every before-bracha group said in
              // the guide + every after-bracha shown next
              const groups = groupForRecitation(
                items.map((i) => ({
                  id: i.id,
                  bracha: i.bracha,
                  shivaKey: i.entry.shivaKey,
                  whole: i.whole,
                  chaviv: i.chaviv,
                })),
              );
              const said: string[] = groups.map((g) => g.bracha);
              if (result.birkatHamazon) said.push('BirkatHamazon');
              if (result.meeinInserts.length) said.push('MeeinShalosh');
              if (result.boreiNefashos) said.push('BoreiNefashos');
              const sevenSpecies = items.filter((i) => i.entry.shivasHaminim && i.shiurMet).length;
              completeMeal(said, sevenSpecies);
              setConfirmed(true);
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
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold capitalize transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
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
            {textMode === 'hebrew' && (
              <p dir="rtl" lang="he" className="hebrew text-[22px] text-espresso">
                {pack.meeinShalosh.opening.hebrew}{' '}
                {result.meeinInserts.map((k) => pack.meeinShalosh.inserts[k].hebrew).join(' וְ')}{' '}
                {pack.meeinShalosh.body.hebrew}{' '}
                {pack.meeinShalosh.seals[result.meeinInserts[0]].hebrew}
              </p>
            )}
            {textMode === 'translit' && (
              <p className="font-display text-[15px] italic leading-relaxed text-espresso">
                {pack.meeinShalosh.opening.translit}{' '}
                {result.meeinInserts.map((k) => pack.meeinShalosh.inserts[k].translit).join(' v\'')}{' '}
                {pack.meeinShalosh.body.translit} {pack.meeinShalosh.seals[result.meeinInserts[0]].translit}
              </p>
            )}
            {textMode === 'english' && (
              <p className="text-[14px] leading-relaxed text-espresso">
                {pack.meeinShalosh.opening.english}{' '}
                {result.meeinInserts.map((k) => pack.meeinShalosh.inserts[k].english).join(', and ')}
                , {pack.meeinShalosh.body.english}{' '}
                {pack.meeinShalosh.seals[result.meeinInserts[0]].english}
              </p>
            )}
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
        <PillButton onClick={reset} icon="↺">
          New meal
        </PillButton>
      </div>
    </ScreenShell>
  );
}

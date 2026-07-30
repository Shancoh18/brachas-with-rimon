/**
 * Screen 4 — the kedima-ordered bracha stepper. One blessing per screen:
 * Hebrew (RTL, large), transliteration, English — nusach-aware. Grouped
 * items note what the single recitation covers.
 */
import { useMemo } from 'react';
import { BRACHA_LABEL, type Bracha } from '../data/foods';
import { NUSACHIM } from '../data/texts';
import { groupForRecitation } from '../lib/kedima';
import { useBracha, type TextMode } from '../store';
import { HearIt } from '../components/HearIt';
import { Rimon, RimonWalker } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const MODES: TextMode[] = ['hebrew', 'translit', 'english'];

/** the educational one-liner under each blessing — the "why" in one breath */
const WHY_LINE: Record<Bracha, string> = {
  Hamotzi:
    'Bread is the staff of life — the one food human hands complete. Its blessing covers nearly the whole meal.',
  Mezonos:
    '“Sustenance” — for the five grains in every form but bread. Grain is honored because it truly sustains.',
  Hagafen:
    'Wine gladdens and elevates, so it keeps a blessing of its own — even in the middle of a bread meal.',
  Haetz:
    'For fruit of the tree — a giver that returns year after year from the same trunk.',
  Haadama:
    'For what the earth itself yields — vegetables, and plants that give their fruit once.',
  Shehakol:
    '“By Whose word all things came to be” — the widest blessing, covering everything the others don’t.',
};

const AUDIO_FILE: Record<Bracha, string> = {
  Hamotzi: 'hamotzi',
  Mezonos: 'mezonos',
  Hagafen: 'hagafen',
  Haetz: 'haetz',
  Haadama: 'haadama',
  Shehakol: 'shehakol',
};

export function Guide() {
  const { items, nusach, textMode, setTextMode, guideIndex, setGuideIndex, setScreen } = useBracha();
  const pack = NUSACHIM[nusach];

  const groups = useMemo(
    () =>
      groupForRecitation(
        items.map((i) => ({
          id: i.id,
          bracha: i.bracha,
          shivaKey: i.entry.shivaKey,
          whole: i.whole,
          chaviv: i.chaviv,
          label: i.label,
        })),
      ),
    [items],
  );

  if (groups.length === 0) {
    setScreen('confirm');
    return null;
  }

  const step = Math.min(guideIndex, groups.length - 1);
  const group = groups[step];
  const liturgy = pack.brachos[group.bracha];
  const isLast = step === groups.length - 1;
  const rep = group.representative as (typeof group.representative) & { label: string };
  const covered = group.covered as ((typeof group.covered)[number] & { label: string })[];
  const others = covered.filter((c) => c.id !== rep.id);

  const sayLine =
    group.bracha === 'Hamotzi'
      ? 'Bread first — wash your hands, then this one blessing covers almost the whole meal.'
      : others.length
        ? `Say it over the ${rep.label.toLowerCase()} — it covers the rest of this group too.`
        : `This one is for your ${rep.label.toLowerCase()}.`;

  return (
    <ScreenShell>
      {/* Rimon walks the meal's blessings with you */}
      <div className="rise-in pb-2">
        <RimonWalker progress={groups.length > 1 ? step / (groups.length - 1) : 1} done={false} />
        <div className="flex items-center justify-center gap-2 pt-1">
          {groups.map((g2, i) => (
            <span
              key={g2.bracha}
              className={`h-1.5 rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                i === step ? 'w-8 bg-rimon' : i < step ? 'w-3 bg-gold' : 'w-3 bg-espresso/15'
              }`}
            />
          ))}
        </div>
      </div>

      <header className="rise-in flex items-start justify-between gap-4 pb-4">
        <div className="space-y-2">
          <Eyebrow>
            Blessing {step + 1} of {groups.length}
          </Eyebrow>
          <h2 className="font-display text-[34px] font-bold leading-tight text-espresso">
            {BRACHA_LABEL[group.bracha]}
          </h2>
          <p className="text-[12.5px] capitalize text-mocha">
            over: <strong className="text-espresso-soft">{rep.label}</strong>
            {rep.chaviv ? ' ★' : ''}
          </p>
        </div>
        <Rimon pose="pointing" say={sayLine} size={92} />
      </header>

      {/* text-mode toggle */}
      <div className="rise-in rise-in-1 mb-4 flex w-max rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07]">
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

      <Bezel className="rise-in rise-in-2" innerClassName="px-6 py-8">
        {textMode === 'hebrew' && (
          <p dir="rtl" lang="he" className="hebrew text-[30px] font-medium text-espresso">
            {liturgy.hebrew}
          </p>
        )}
        {textMode === 'translit' && (
          <p className="font-display text-[19px] italic leading-relaxed text-espresso">
            {liturgy.translit}
          </p>
        )}
        {textMode === 'english' && (
          <p className="text-[17px] leading-relaxed text-espresso">{liturgy.english}</p>
        )}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-espresso/[0.07] pt-5">
          <HearIt src={`${import.meta.env.BASE_URL}audio/${AUDIO_FILE[group.bracha]}.mp3`} />
          <p className="text-right text-[10.5px] leading-snug text-mocha">{WHY_LINE[group.bracha]}</p>
        </div>
      </Bezel>

      {others.length > 0 && (
        <p className="rise-in rise-in-3 pt-4 text-center text-[12px] leading-relaxed text-mocha">
          this blessing also covers:{' '}
          <span className="capitalize text-espresso-soft">
            {others.map((c) => c.label.toLowerCase()).join(' · ')}
          </span>
        </p>
      )}
      {group.bracha === 'Hagafen' && (
        <p className="rise-in rise-in-3 pt-2 text-center text-[11px] text-mocha">
          wine keeps its own blessing even during a bread meal — and it covers your other drinks.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 py-8">
        <button
          onClick={() => (step === 0 ? setScreen('confirm') : setGuideIndex(step - 1))}
          className="text-[12.5px] font-medium text-mocha hover:text-espresso"
        >
          ← back
        </button>
        <PillButton
          variant="rimon"
          icon={isLast ? '✓' : '→'}
          onClick={() => {
            if (isLast) {
              setGuideIndex(0);
              setScreen('after');
            } else {
              setGuideIndex(step + 1);
            }
          }}
        >
          {isLast ? 'I said it — finish the meal' : 'I said this blessing'}
        </PillButton>
      </div>
    </ScreenShell>
  );
}

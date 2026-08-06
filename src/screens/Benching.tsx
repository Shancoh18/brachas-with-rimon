/**
 * Birkat Hamazon (Grace After Meals) — the dedicated bentching reference.
 * When it's said, the four blessings + Harachaman, and the holiday additions,
 * laid out unmistakably. Text comes from the active nusach pack (the ari pack
 * is verbatim chabad.org; see src/data/texts) — halachic rules only from the
 * approved sites, never from the model.
 */
import { NUSACHIM } from '../data/texts';
import { useBracha, type TextMode } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, ScreenShell } from '../components/ui';

const MODES: TextMode[] = ['hebrew', 'translit', 'english'];

/** The holiday/occasion additions, spelled out one card each. */
const ADDITIONS = [
  {
    emoji: '🕯️',
    when: 'On Shabbat',
    what: 'Add R’tsei (within the third blessing, Boneh Yerushalayim) and the Shabbat Harachaman.',
  },
  {
    emoji: '🌒',
    when: 'Rosh Chodesh & festivals',
    what: 'Add Yaaleh Veyavo (within the third blessing).',
  },
  {
    emoji: '🕎',
    when: 'Chanukah & Purim',
    what: 'Add Al Hanissim (within the second blessing, Birkat Ha’aretz).',
  },
];

export function Benching() {
  const { setScreen, nusach, textMode, setTextMode } = useBracha();
  const pack = NUSACHIM[nusach];
  const bh = pack.birkatHamazon;

  return (
    <ScreenShell wide>
      <div className="pb-16">
        <button
          onClick={() => setScreen('welcome')}
          className="rise-in pb-4 text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
        >
          ← home
        </button>
        <header className="rise-in flex items-start justify-between gap-4 pb-2">
          <div className="space-y-2">
            <Eyebrow>Grace after meals</Eyebrow>
            <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">
              Birkat Hamazon
            </h2>
            <p className="max-w-[320px] text-[12.5px] leading-relaxed text-espresso-soft">{bh.intro}</p>
          </div>
          <Rimon pose="teaching" size={84} className="shrink-0" />
        </header>

        {/* when do I say it? — unmissable */}
        <Bezel className="rise-in rise-in-1 mb-5" innerClassName="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rimon">When it's said</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-espresso">
            <strong>Ate bread?</strong> (at least a <em>kezayis</em> — an olive-sized piece) →
            Birkat Hamazon. This one Grace covers the whole bread meal. No bread → the after-blessing
            for what you ate instead (see the Quick blessing guide).
          </p>
        </Bezel>

        {/* text-mode toggle, same control as the quick guide */}
        <div className="rise-in rise-in-1 mb-5 flex w-max rounded-full bg-espresso/[0.05] p-1 ring-1 ring-espresso/[0.07]">
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

        {/* the blessings */}
        <div className="flex flex-col gap-3">
          {bh.sections.map((s, idx) => (
            <Bezel key={s.name} className={`rise-in rise-in-${Math.min(idx + 1, 4)}`} innerClassName="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{s.name}</p>
              {textMode === 'hebrew' && (
                <p dir="rtl" lang="he" className="hebrew mt-2 text-[21px] text-espresso">
                  {s.hebrew}
                </p>
              )}
              {textMode === 'translit' && (
                <p className="mt-2 font-display text-[15px] italic leading-relaxed text-espresso">
                  {s.translit}
                </p>
              )}
              {textMode === 'english' && (
                <p className="mt-2 text-[14px] leading-relaxed text-espresso">{s.english}</p>
              )}
            </Bezel>
          ))}
        </div>

        {/* holiday additions — one clear card each */}
        <h3 className="rise-in pb-3 pt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-mocha">
          Holiday & occasion additions
        </h3>
        <div className="flex flex-col gap-3">
          {ADDITIONS.map((a) => (
            <Bezel key={a.when} className="rise-in" innerClassName="flex items-start gap-3 px-5 py-4">
              <span className="text-[22px] leading-none">{a.emoji}</span>
              <div>
                <p className="text-[13.5px] font-semibold text-espresso">{a.when}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-espresso-soft">{a.what}</p>
              </div>
            </Bezel>
          ))}
        </div>

        {/* the COMPLETE text lives on chabad.org — the in-app version is a
            study outline, so hand the full davening text over prominently */}
        <a
          href="https://www.chabad.org/library/article_cdo/aid/135366/jewish/Grace-After-Meals.htm"
          target="_blank"
          rel="noreferrer"
          className="rise-in mt-5 block rounded-[1.25rem] border border-gold/30 bg-gold/[0.08] px-5 py-4"
          data-full-text-link
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">The complete text</p>
          <p className="mt-1 text-[13.5px] font-semibold leading-snug text-espresso">
            Read the FULL Birkat Hamazon — every word, Hebrew &amp; English, with the weekday and
            special-day intros and zimmun — on chabad.org →
          </p>
          <p className="mt-1.5 text-[10.5px] leading-snug text-mocha">
            AI makes mistakes, to learn more information please read the article. This page is a
            study outline; recite the full text from the link, a siddur, or a bentcher.
          </p>
        </a>

        {/* the pack's own custom notes + honesty about the outline */}
        <div className="rise-in mt-5 rounded-[1.25rem] bg-gold/[0.05] p-4 ring-1 ring-gold/20">
          {bh.notes.map((n) => (
            <p key={n} className="py-0.5 text-[11.5px] leading-relaxed text-espresso-soft">
              · {n}
            </p>
          ))}
          <p className="mt-2 border-t border-gold/15 pt-2 text-[10.5px] leading-snug text-mocha">
            Text: the {pack.label} tradition, per chabad.org.
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 pt-8">
          <Rimon pose="idle" size={92} say="Ate bread? This is the thank-you that covers the whole meal." />
        </div>
      </div>
    </ScreenShell>
  );
}

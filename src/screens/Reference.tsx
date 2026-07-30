/**
 * The Quick Blessing Guide — a themed, always-ready reference: the six
 * brachos in their kedima order, each demonstrated by Rimon EATING that food
 * group (gen-AI stills), with examples, full text on tap, and hear-it audio.
 * For the moments you just need the blessing, no photo.
 */
import { useState } from 'react';
import { type Bracha } from '../data/foods';
import { NUSACHIM } from '../data/texts';
import { useBracha, type TextMode } from '../store';
import { HearIt } from '../components/HearIt';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, ScreenShell } from '../components/ui';

const BASE = import.meta.env.BASE_URL;
const MODES: TextMode[] = ['hebrew', 'translit', 'english'];

interface Group {
  bracha: Bracha;
  order: string;
  name: string;
  short: string;
  eats: string;
  audio: string;
  examples: string;
  note?: string;
}

/** kedima order, as recited when several are on the table */
const GROUPS: Group[] = [
  {
    bracha: 'Hamotzi',
    order: 'First — covers the meal',
    name: 'Hamotzi',
    short: 'הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ',
    eats: `${BASE}mascot/eats-bread.webp`,
    audio: 'hamotzi',
    examples: 'bread · challah · rolls · pita · bagels · matzah',
    note: 'Wash hands first. When you eat bread, this one blessing covers almost everything else in the meal (wine keeps its own).',
  },
  {
    bracha: 'Mezonos',
    order: '1st of the five',
    name: 'Mezonos',
    short: 'בּוֹרֵא מִינֵי מְזוֹנוֹת',
    eats: `${BASE}mascot/eats-cake.webp`,
    audio: 'mezonos',
    examples: 'cake · cookies · crackers · pasta · cereal · rice',
  },
  {
    bracha: 'Hagafen',
    order: '2nd',
    name: 'Hagafen',
    short: 'בּוֹרֵא פְּרִי הַגָּפֶן',
    eats: `${BASE}mascot/eats-grape-juice.webp`,
    audio: 'hagafen',
    examples: 'wine · grape juice',
  },
  {
    bracha: 'Haetz',
    order: '3rd',
    name: 'Ha’etz',
    short: 'בּוֹרֵא פְּרִי הָעֵץ',
    eats: `${BASE}mascot/eats-apple.webp`,
    audio: 'haetz',
    examples: 'apples · dates · grapes · olives · almonds · oranges',
    note: 'Seven-Species fruits (olive, date, grape, fig, pomegranate) come first among tree fruits.',
  },
  {
    bracha: 'Haadama',
    order: '4th',
    name: 'Ha’adama',
    short: 'בּוֹרֵא פְּרִי הָאֲדָמָה',
    eats: `${BASE}mascot/eats-carrot.webp`,
    audio: 'haadama',
    examples: 'vegetables · potatoes · bananas · melon · strawberries · peanuts',
  },
  {
    bracha: 'Shehakol',
    order: '5th — everything else',
    name: 'Shehakol',
    short: 'שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ',
    eats: `${BASE}mascot/eats-treats.webp`,
    audio: 'shehakol',
    examples: 'meat · fish · eggs · cheese · water · chocolate · drinks',
  },
];

export function Reference() {
  const { setScreen, nusach, textMode, setTextMode } = useBracha();
  const pack = NUSACHIM[nusach];
  const [open, setOpen] = useState<Bracha | null>(null);

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
            <Eyebrow>Quick guide</Eyebrow>
            <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">
              The six blessings, in order
            </h2>
            <p className="max-w-[320px] text-[12.5px] leading-relaxed text-espresso-soft">
              When different foods share the table, say the blessings in this order. Tap any card
              for the full text.
            </p>
          </div>
        </header>

        {/* text-mode toggle for the expanded texts */}
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

        <div className="flex flex-col gap-3">
          {GROUPS.map((g, idx) => {
            const expanded = open === g.bracha;
            const liturgy = pack.brachos[g.bracha];
            return (
              <Bezel key={g.bracha} className={`rise-in rise-in-${Math.min(idx + 1, 4)}`} innerClassName="overflow-hidden">
                <button
                  onClick={() => setOpen(expanded ? null : g.bracha)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left"
                >
                  {/* Rimon eating this food group */}
                  <img
                    src={g.eats}
                    alt={`Rimon enjoying ${g.name} foods`}
                    className="rimon-blend h-[72px] w-[72px] shrink-0 object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `${BASE}mascot/rimon-hello.webp`;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold">{g.order}</p>
                    <p className="font-display text-[19px] font-bold leading-tight text-espresso">{g.name}</p>
                    <p dir="rtl" lang="he" className="hebrew truncate text-[15px] leading-snug text-espresso-soft">
                      {g.short}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-mocha">{g.examples}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[13px] text-mocha transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${expanded ? 'rotate-90' : ''}`}
                  >
                    ›
                  </span>
                </button>
                {expanded && (
                  <div className="border-t border-espresso/[0.07] px-5 pb-5 pt-4">
                    {textMode === 'hebrew' && (
                      <p dir="rtl" lang="he" className="hebrew text-[24px] text-espresso">
                        {liturgy.hebrew}
                      </p>
                    )}
                    {textMode === 'translit' && (
                      <p className="font-display text-[16px] italic leading-relaxed text-espresso">
                        {liturgy.translit}
                      </p>
                    )}
                    {textMode === 'english' && (
                      <p className="text-[14.5px] leading-relaxed text-espresso">{liturgy.english}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <HearIt src={`${BASE}audio/${g.audio}.mp3`} />
                      {g.note && (
                        <p className="text-right text-[10.5px] leading-snug text-mocha">{g.note}</p>
                      )}
                    </div>
                  </div>
                )}
              </Bezel>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1 pt-8">
          <Rimon pose="idle" size={92} say="Same foods every day? This page is your shortcut. New plate? Photograph it!" />
        </div>
      </div>
    </ScreenShell>
  );
}

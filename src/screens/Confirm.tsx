/**
 * Screen 3 — confirm & edit. The mandatory human-in-the-loop step: the user
 * can delete, add from the database, correct state (raw/cooked), and mark a
 * chaviv favorite before any blessing is shown.
 */
import { useMemo, useState } from 'react';
import { BRACHA_LABEL, FOODS } from '../data/foods';
import { mealItemFromKey, setItemEntry, setItemState, type MealItem, type FoodState } from '../lib/classify';
import { searchFoods } from '../lib/foodSearch';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const STATES: FoodState[] = ['unknown', 'raw', 'cooked', 'baked', 'whole', 'cut', 'liquid'];

/** Gluten-free flour picker (owner feature 2026-08-11). The flour sets the
 *  bracha — every option maps to a vetted DB entry (OU Guide to Blessings,
 *  Gluten-Free Baked Goods table). "Not sure" deliberately changes NOTHING:
 *  the app never guesses halacha — it says how to find out instead. */
const GF_FLOURS: { key: string; label: string; icon: string; hint: string }[] = [
  { key: 'bread-gf-oat', label: 'Oat flour', icon: '🌾', hint: 'still real bread — Hamotzi' },
  { key: 'bread-gf-rice', label: 'Rice flour', icon: '🍚', hint: 'Mezonos, like rice' },
  { key: 'bread-gf-almond', label: 'Almond flour', icon: '🌰', hint: 'Shehakol' },
  { key: 'bread-gf-coconut', label: 'Coconut flour', icon: '🥥', hint: 'Shehakol' },
  { key: 'bread-gf-tapioca', label: 'Tapioca / potato starch', icon: '🥔', hint: 'Shehakol' },
];
const GF_KEYS = new Set(GF_FLOURS.map((x) => x.key));

/** Bread-category items get the gluten-free question; a GF entry keeps it so
 *  the flour can be corrected. */
const showsGlutenFree = (item: MealItem) => item.entry.category === 'Bread';

const BRACHA_TINT: Record<string, string> = {
  Hamotzi: 'bg-gold/15 text-gold',
  Mezonos: 'bg-gold/10 text-gold',
  Hagafen: 'bg-rimon/10 text-rimon',
  Haetz: 'bg-sage/15 text-sage',
  Haadama: 'bg-sage/10 text-sage',
  Shehakol: 'bg-espresso/8 text-espresso-soft',
};

export function Confirm() {
  const { items, updateItem, removeItem, addItem, unmatched, setScreen, reset, photo, demoFallback } = useBracha();
  const [query, setQuery] = useState('');
  // which item's gluten-free flour dropdown is open; 'unsure:<id>' shows the
  // check-the-package guidance instead of a ruling
  const [gfOpen, setGfOpen] = useState<string | null>(null);
  const [gfUnsure, setGfUnsure] = useState<string | null>(null);
  // manual entry (no photo, arrived with an empty plate): open the search
  // immediately — looking up foods IS the flow
  // open search immediately when there's nothing on the plate — whether the
  // user chose manual entry OR identification failed and left it empty
  const [manualEntry] = useState(() => items.length === 0);
  const [adding, setAdding] = useState(manualEntry);

  // Search lives in src/lib/foodSearch.ts: same token ranking as before, plus
  // Hebrew names, regional/spelling aliases, and typo tolerance. Searching
  // FOODS (not a snapshot) keeps server-learned foods findable too.
  const matches = useMemo(() => searchFoods(query, FOODS, 9), [query]);

  return (
    <ScreenShell>
      {/* manual entry arrives from home with nothing staged — a top-left back
          beats a bottom "start over" (owner 2026-08-11) */}
      {manualEntry && (
        <button
          onClick={reset}
          className="rise-in pb-4 text-[12.5px] font-medium text-mocha transition-colors duration-150 hover:text-espresso"
        >
          ← back
        </button>
      )}
      <header className="rise-in flex items-start justify-between gap-4 pb-6">
        <div className="space-y-2">
          <Eyebrow>{manualEntry ? 'Step 1 · Add your foods' : 'Step 1 · Confirm'}</Eyebrow>
          <h2 className="font-display text-[32px] font-bold leading-tight text-espresso">
            {manualEntry ? 'What did you eat?' : 'Is this your meal?'}
          </h2>
        </div>
        <Rimon pose="pointing" size={84} />
      </header>

      <p className="rise-in rise-in-1 pb-5 text-[13px] leading-relaxed text-espresso-soft">
        {manualEntry ? (
          <>
            No photo needed — search the food database and add everything on your plate, then
            Rimon guides you through the same brachas as always.
          </>
        ) : (
          <>
            Check every item — a photo can’t always tell cooked from raw, or what’s inside a
            mixture. Tap a state to correct it; star your favorite (<em>chaviv</em>).
          </>
        )}
      </p>

      {demoFallback && (
        <div className="rise-in rise-in-1 mb-5 rounded-[1.25rem] bg-rimon/8 p-4 text-[12px] leading-relaxed text-espresso ring-1 ring-rimon/20">
          <strong className="text-rimon">Heads up:</strong> Rimon couldn’t identify your photo just
          now. Nothing has been added — search below and add what’s on your plate, and every
          blessing will still be exactly right.
        </div>
      )}

      {photo && (
        <div className="rise-in rise-in-1 mb-5 overflow-hidden rounded-[1.5rem] ring-1 ring-espresso/10">
          <img src={photo} alt="your meal" className="max-h-40 w-full object-cover" />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item, idx) => (
          <Bezel key={item.id} className={`rise-in rise-in-${Math.min(idx + 1, 4)}`} innerClassName="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold capitalize text-espresso">{item.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${BRACHA_TINT[item.bracha]}`}>
                    {BRACHA_LABEL[item.bracha]}
                  </span>
                  {item.entry.shivasHaminim && item.entry.isTreeFruit && (
                    <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-gold">
                      Seven Species
                    </span>
                  )}
                  {item.lowConfidence && (
                    <span className="rounded-full bg-rimon/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-rimon">
                      please verify
                    </span>
                  )}
                </div>
                {item.entry.notes && (
                  <p className="mt-1.5 text-[11px] leading-snug text-mocha">{item.entry.notes}</p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {STATES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateItem(item.id, setItemState(item, s))}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-[background-color,color,transform] duration-150 ease-out ${
                        item.state === s
                          ? 'bg-espresso text-cream'
                          : 'bg-espresso/[0.05] text-espresso-soft hover:bg-espresso/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {showsGlutenFree(item) && (
                    <button
                      data-gluten-free-toggle
                      onClick={() => {
                        setGfUnsure(null);
                        setGfOpen(gfOpen === item.id ? null : item.id);
                      }}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-[background-color,color,transform] duration-150 ease-out ${
                        GF_KEYS.has(item.entry.key)
                          ? 'bg-sage text-cream'
                          : 'bg-sage/[0.12] text-sage hover:bg-sage/20'
                      }`}
                    >
                      {GF_KEYS.has(item.entry.key)
                        ? `gluten-free ✓ ${GF_FLOURS.find((x) => x.key === item.entry.key)?.label.toLowerCase() ?? ''}`
                        : 'gluten-free?'}
                    </button>
                  )}
                </div>
                {gfOpen === item.id && showsGlutenFree(item) && (
                  <div
                    data-gluten-free-menu
                    className="rise-in mt-2.5 rounded-2xl border border-espresso/10 bg-white/70 p-2"
                  >
                    <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-mocha">
                      Which flour is it made from?
                    </p>
                    <div className="flex flex-col">
                      {GF_FLOURS.map((fl) => (
                        <button
                          key={fl.key}
                          onClick={() => {
                            updateItem(item.id, setItemEntry(item, fl.key));
                            setGfOpen(null);
                            setGfUnsure(null);
                          }}
                          className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-espresso/[0.05] ${
                            item.entry.key === fl.key ? 'bg-sage/[0.1]' : ''
                          }`}
                        >
                          <span className="text-[15px]">{fl.icon}</span>
                          <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-espresso">{fl.label}</span>
                          <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-mocha">
                            {fl.hint}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => setGfUnsure(gfUnsure === item.id ? null : item.id)}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-espresso/[0.05]"
                      >
                        <span className="text-[15px]">🤷</span>
                        <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-espresso">Not sure</span>
                      </button>
                      {(item.origKey || GF_KEYS.has(item.entry.key)) && (
                        <button
                          onClick={() => {
                            // revert to the pre-swap entry; a board-identified GF
                            // item with no history falls back to plain bread
                            updateItem(item.id, setItemEntry(item, item.origKey ?? 'bread'));
                            setGfOpen(null);
                            setGfUnsure(null);
                          }}
                          className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-espresso/[0.05]"
                        >
                          <span className="text-[15px]">🍞</span>
                          <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-espresso">
                            Regular bread (wheat · rye · spelt)
                          </span>
                        </button>
                      )}
                    </div>
                    {gfUnsure === item.id && (
                      <p
                        data-gluten-free-unsure
                        className="mx-1 mb-1 mt-1.5 rounded-xl bg-gold/[0.08] px-3 py-2.5 text-[11px] leading-relaxed text-espresso-soft ring-1 ring-gold/20"
                      >
                        Check the ingredient panel — the <em>first flour listed</em> sets the blessing.
                        Oat flour keeps it real bread; rice flour makes it Mezonos; nut and starch
                        flours make it Shehakol. If you can’t find out, ask a rabbi — the blessing
                        below stays as-is for now.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-2">
                <button
                  onClick={() => updateItem(item.id, { chaviv: !item.chaviv })}
                  title="chaviv — my favorite"
                  className={`text-[19px] leading-none transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-90 ${item.chaviv ? '' : 'opacity-25 grayscale'}`}
                >
                  ★
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-[13px] text-mocha transition-colors hover:text-rimon"
                  title="remove"
                >
                  ✕
                </button>
              </div>
            </div>
          </Bezel>
        ))}
      </div>

      {unmatched.length > 0 && (
        <div className="mt-4 rounded-[1.25rem] border border-rimon/15 bg-rimon/[0.04] p-4 text-[12px] leading-relaxed text-espresso-soft">
          <strong className="text-rimon">Rimon couldn’t match:</strong> {unmatched.join(', ')} — add
          them from the food list below, or leave them off.
        </div>
      )}

      {/* add-from-database */}
      <div className="mt-4">
        {adding ? (
          <Bezel innerClassName="p-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods — English or עברית"
              className="w-full bg-transparent px-2 py-1.5 text-[14px] text-espresso outline-none placeholder:text-mocha"
            />
            {query.trim().length >= 2 && matches.length === 0 && (
              <p className="px-2 py-2.5 text-[11.5px] leading-snug text-mocha">
                Nothing by that name yet. Try another word for it — or photograph the food and
                Rimon will identify it and research its bracha from the approved sources.
              </p>
            )}
            {matches.length > 0 && (
              <ul className="mt-1 divide-y divide-espresso/[0.06]">
                {matches.map((food) => (
                  <li key={food.key}>
                    <button
                      className="flex w-full items-center justify-between px-2 py-2.5 text-left text-[13.5px] capitalize text-espresso transition-colors hover:text-rimon"
                      onClick={() => {
                        const item = mealItemFromKey(food.key);
                        if (item) addItem(item);
                        setQuery('');
                        setAdding(false);
                      }}
                    >
                      {food.names[0]}
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-mocha">
                        {BRACHA_LABEL[food.brachaRishona]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Bezel>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-[1.25rem] border border-dashed border-espresso/20 py-3 text-[13px] font-medium text-espresso-soft transition-colors duration-500 hover:border-espresso/40 hover:text-espresso"
          >
            + add a food
          </button>
        )}
      </div>

      <div className={`flex items-center gap-3 py-8 ${manualEntry ? 'justify-end' : 'justify-between'}`}>
        {/* photo flow keeps "start over" (discard the photo); manual entry has
            the ← back up top instead */}
        {!manualEntry && (
          <button onClick={reset} className="text-[12.5px] font-medium text-mocha hover:text-espresso">
            start over
          </button>
        )}
        <PillButton variant="rimon" onClick={() => setScreen('guide')} disabled={items.length === 0}>
          Guide me through the brachos
        </PillButton>
      </div>
    </ScreenShell>
  );
}

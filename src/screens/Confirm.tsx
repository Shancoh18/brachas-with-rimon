/**
 * Screen 3 — confirm & edit. The mandatory human-in-the-loop step: the user
 * can delete, add from the database, correct state (raw/cooked), and mark a
 * chaviv favorite before any blessing is shown.
 */
import { useMemo, useState } from 'react';
import { BRACHA_LABEL, FOODS } from '../data/foods';
import { mealItemFromKey, setItemState, type FoodState } from '../lib/classify';
import { useBracha } from '../store';
import { Rimon } from '../components/Rimon';
import { Bezel, Eyebrow, PillButton, ScreenShell } from '../components/ui';

const STATES: FoodState[] = ['unknown', 'raw', 'cooked', 'baked', 'whole', 'cut', 'liquid'];

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
  // manual entry (no photo, arrived with an empty plate): open the search
  // immediately — looking up foods IS the flow
  const [manualEntry] = useState(() => !photo && items.length === 0);
  const [adding, setAdding] = useState(manualEntry);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return FOODS.filter(
      (f) => f.names.some((n) => n.includes(q)) || f.key.includes(q),
    ).slice(0, 6);
  }, [query]);

  return (
    <ScreenShell>
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
          <strong className="text-rimon">Heads up:</strong> we couldn’t reach the identification
          service just now, so this is Rimon’s <em>demo meal</em> — not what’s in your photo.
          Check your connection and try the photo again.
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
                </div>
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
              placeholder="Search the food database…"
              className="w-full bg-transparent px-2 py-1.5 text-[14px] text-espresso outline-none placeholder:text-mocha"
            />
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

      <div className="flex items-center justify-between gap-3 py-8">
        <button onClick={reset} className="text-[12.5px] font-medium text-mocha hover:text-espresso">
          start over
        </button>
        <PillButton variant="rimon" onClick={() => setScreen('guide')} disabled={items.length === 0}>
          Guide me through the brachos
        </PillButton>
      </div>
    </ScreenShell>
  );
}

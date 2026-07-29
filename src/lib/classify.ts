/**
 * State-override resolution: a food's effective bracha can change with its
 * preparation state (e.g. cucumber cooked → Shehakol; raw onion → Shehakol),
 * per the cooked-vs-raw rules on chabad.org / OU.
 */
import { FOOD_BY_KEY, type Bracha, type FoodEntry } from '../data/foods';

export type FoodState = 'raw' | 'cooked' | 'baked' | 'whole' | 'cut' | 'liquid' | 'unknown';

export function effectiveBracha(entry: FoodEntry, state: FoodState): Bracha {
  if (state === 'cooked' && entry.stateOverrides?.cooked) return entry.stateOverrides.cooked;
  if (state === 'raw' && entry.stateOverrides?.raw) return entry.stateOverrides.raw;
  return entry.brachaRishona;
}

export interface IdentifiedItem {
  db_key: string;
  display_name: string;
  state?: FoodState;
  confidence: number;
  count_estimate?: number;
}

export interface MealItem {
  id: string;
  entry: FoodEntry;
  label: string;
  state: FoodState;
  bracha: Bracha;
  whole: boolean;
  chaviv: boolean;
  shiurMet: boolean;
  confidence: number;
  lowConfidence: boolean;
}

let nextId = 0;
export const makeItemId = () => `item-${++nextId}-${Date.now().toString(36)}`;

/** Vision output → editable meal items. Unknown keys are dropped (they arrive via `unmatched`). */
export function toMealItems(identified: IdentifiedItem[]): MealItem[] {
  const items: MealItem[] = [];
  for (const raw of identified) {
    const entry = FOOD_BY_KEY[raw.db_key];
    if (!entry) continue;
    const state: FoodState = raw.state ?? 'unknown';
    items.push({
      id: makeItemId(),
      entry,
      label: raw.display_name || entry.names[0],
      state,
      bracha: effectiveBracha(entry, state),
      whole: state === 'whole',
      chaviv: false,
      shiurMet: true, // user confirms/toggles on the after-bracha screen
      confidence: raw.confidence,
      lowConfidence: raw.confidence < 0.6,
    });
  }
  return items;
}

export function mealItemFromKey(key: string): MealItem | null {
  const entry = FOOD_BY_KEY[key];
  if (!entry) return null;
  return {
    id: makeItemId(),
    entry,
    label: entry.names[0],
    state: 'unknown',
    bracha: entry.brachaRishona,
    whole: false,
    chaviv: false,
    shiurMet: true,
    confidence: 1,
    lowConfidence: false,
  };
}

export function setItemState(item: MealItem, state: FoodState): MealItem {
  return { ...item, state, whole: state === 'whole', bracha: effectiveBracha(item.entry, state) };
}

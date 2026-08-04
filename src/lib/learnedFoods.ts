/**
 * Runtime extension of the food database with entries the server has learned.
 *
 * The server researches unmatched foods against the three approved sites only
 * (chabad.org / brachos.org / oukosher.org — enforced by web_search
 * allowed_domains) and persists what it finds. The client merges those
 * entries into FOOD_BY_KEY at boot and whenever an analyze response carries
 * fresh ones, so a food learned once is known everywhere afterwards.
 */
import { FOOD_BY_KEY, FOODS, type FoodEntry } from '../data/foods';
import { API_BASE } from './api';

export type LearnedFoodEntry = FoodEntry & {
  learned: true;
  sourceUrl: string;
  learnedAt: string;
};

const learnedKeys = new Set<string>();

export const isLearned = (key: string) => learnedKeys.has(key);

export function registerLearnedFoods(entries: LearnedFoodEntry[] | undefined) {
  if (!entries?.length) return;
  for (const e of entries) {
    if (!e?.key || FOOD_BY_KEY[e.key]) continue; // never override the vetted DB
    FOOD_BY_KEY[e.key] = e;
    FOODS.push(e);
    learnedKeys.add(e.key);
  }
}

/** Boot-time sync so previously learned foods work offline of any analyze call. */
export async function fetchLearnedFoods(): Promise<void> {
  try {
    const r = await fetch(`${API_BASE}/api/foods/learned`);
    if (!r.ok) return;
    const { entries } = (await r.json()) as { entries: LearnedFoodEntry[] };
    registerLearnedFoods(entries);
  } catch {
    /* offline is fine — the static DB still works */
  }
}

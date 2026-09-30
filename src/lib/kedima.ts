/**
 * KEDIMA — the halachic recitation-order sort.
 *
 * Rule hierarchy per chabad.org "Blessings on Combination" (verbatim):
 *   "When one is eating foods requiring different blessings, the priority of
 *    the blessings is as follows: 1) mezonot; 2) ha-gafen; 3) ha-aitz;
 *    4) ha-adamah; 5) shehakol."
 * Hamotzi, when bread is eaten, precedes everything and exempts the meal
 * (except wine, which keeps its own bracha).
 * Hagafen in turn exempts the other drinks (chabad.org, same article):
 *   "After saying the blessing borai pri hagafen over wine, additional
 *    blessings before and after other liquids or drinks are not necessary."
 *
 * Within Ha'etz: Shivas Haminim first, in verse order by proximity to
 * "eretz" (Devarim 8:8, per Shulchan Aruch OC 211:4 / Berachot 41b):
 *   olive → date → grape → fig → pomegranate.
 * Then whole-over-cut (shaleim), then chaviv (user-flagged favorite).
 *
 * DO NOT change these constants without a cited source from chabad.org,
 * brachos.org, or oukosher.org (see CLAUDE.md).
 */
import type { Bracha, ShivaKey } from '../data/foods';

export const BLESSING_RANK: Record<Bracha, number> = {
  Hamotzi: 0,
  Mezonos: 1,
  Hagafen: 2,
  Haetz: 3,
  Haadama: 4,
  Shehakol: 5,
};

/** Seven Species FRUIT precedence (lower = earlier). Grains rank via Mezonos/Hamotzi. */
export const SHIVA_RANK: Partial<Record<ShivaKey, number>> = {
  olive: 0,
  date: 1,
  grape: 2,
  fig: 3,
  pomegranate: 4,
};

export interface KedimaItem {
  id: string;
  bracha: Bracha;
  shivaKey?: ShivaKey;
  whole?: boolean;
  chaviv?: boolean;
  /** a beverage (FoodEntry.isDrink) — wine's Hagafen covers it */
  isDrink?: boolean;
}

export function kedimaSort<T extends KedimaItem>(items: T[]): T[] {
  return items.slice().sort((a, b) => {
    if (BLESSING_RANK[a.bracha] !== BLESSING_RANK[b.bracha]) {
      return BLESSING_RANK[a.bracha] - BLESSING_RANK[b.bracha];
    }
    // same bracha: Shivas Haminim first, in verse order
    const ra = a.shivaKey != null ? (SHIVA_RANK[a.shivaKey] ?? 99) : 99;
    const rb = b.shivaKey != null ? (SHIVA_RANK[b.shivaKey] ?? 99) : 99;
    if (ra !== rb) return ra - rb;
    // then whole over cut
    if (!!a.whole !== !!b.whole) return a.whole ? -1 : 1;
    // then chaviv
    if (!!a.chaviv !== !!b.chaviv) return a.chaviv ? -1 : 1;
    return 0;
  });
}

export interface BrachaGroup<T extends KedimaItem> {
  bracha: Bracha;
  /** highest-priority item — recite over this one */
  representative: T;
  /** everything this single recitation covers */
  covered: T[];
}

/**
 * Group the sorted items so ONE blessing covers each bracha-group, recited
 * over the highest-priority representative.
 *
 * Hamotzi exemption: when bread is present it exempts all other foods of the
 * meal EXCEPT wine/grape juice (Hagafen), which keeps its own bracha
 * (chabad.org).
 *
 * Hagafen exemption: wine/grape juice covers the other DRINKS (chabad.org,
 * quoted above) — a Shehakol drink joins the Hagafen group instead of
 * getting its own Shehakol. Only Shehakol drinks fold: a Shehakol FOOD
 * (chocolate) keeps its blessing, and an item the DB rules Ha'etz/Ha'adama
 * stays as ruled. With bread present the drinks already fold into Hamotzi,
 * so this only changes bread-less meals. (afterBracha applies the same rule
 * to the after-blessing.)
 */
export function groupForRecitation<T extends KedimaItem>(items: T[]): BrachaGroup<T>[] {
  const sorted = kedimaSort(items);
  const hasBread = sorted.some((i) => i.bracha === 'Hamotzi');
  const hasWine = sorted.some((i) => i.bracha === 'Hagafen');

  const groups = new Map<Bracha, T[]>();
  for (const item of sorted) {
    if (hasBread && item.bracha !== 'Hamotzi' && item.bracha !== 'Hagafen') {
      // exempted by Hamotzi — attach to the bread group
      groups.get('Hamotzi')!.push(item);
      continue;
    }
    if (hasWine && item.isDrink === true && item.bracha === 'Shehakol') {
      // exempted by Hagafen — sorted order puts every Hagafen item first, so
      // the group exists and the wine stays its representative
      groups.get('Hagafen')!.push(item);
      continue;
    }
    if (!groups.has(item.bracha)) groups.set(item.bracha, []);
    groups.get(item.bracha)!.push(item);
  }

  return [...groups.entries()].map(([bracha, members]) => ({
    bracha,
    representative: members[0],
    covered: members,
  }));
}

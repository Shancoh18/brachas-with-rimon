/**
 * BRACHA ACHRONA resolver.
 *
 * Per chabad.org "Laws of Blessings After Eating" + brachos.org:
 *  - Birkat Hamazon after a kezayis of bread (within kedei achilas pras,
 *    ~4 min) — covers the entire meal.
 *  - Me'ein Shalosh: ONE blessing with up to three combined inserts —
 *    Al Hamichya (five-grain mezonos, NOT rice), Al Hagefen (wine/grape
 *    juice), Al Ha'etz (grapes, figs, pomegranates, olives, dates).
 *  - Borei Nefashos for everything else that met its shiur.
 *
 * Exemptions:
 *  - Al Ha'etz exempts Borei Nefashos for OTHER TREE FRUIT eaten.
 *  - Al Hagefen (wine) covers other drinks.
 *  - An independently-required Borei Nefashos (vegetable, meat, etc.) is
 *    NOT covered by Me'ein Shalosh — both are said.
 *
 * Shiurim are USER-SUPPLIED (a photo cannot measure a kezayis/revi'is).
 *
 * How an item is placed:
 *  - Birkat Hamazon needs isBread (the snapshot's rishona is Hamotzi). An
 *    achrona of 'BirkatHamazon' WITHOUT it is a contradiction no vetted entry
 *    has — only bad learned data — so it triggers nothing and is reported.
 *  - A Me'ein Shalosh insert is triggered by the item's own cited achrona
 *    (AlHamichya / AlHagefen / AlHaetz) OR by its flag (isWineGrape /
 *    isShivaFruit), so either one alone places the item. Why the achrona
 *    counts on its own: learned foods carry shivasHaminim:false by design
 *    (they don't claim kedima rank), so an Al Ha'etz / Al Hagefen food learned
 *    at runtime used to match no rule and vanish from the after-blessings.
 *  - isTreeFruit / isDrink never trigger an insert; they only let one that is
 *    already said cover the item.
 *  - Borei Nefashos for an uncovered 'BoreiNefashos' item.
 * Anything still not placed lands in `unresolved` — shown as "ask a rabbi",
 * never dropped.
 *
 * DO NOT change without a cited source from the three approved sites.
 */
import type { AfterBracha } from '../data/foods';
import type { MeeinInsert } from '../data/texts/types';

export interface EatenItem {
  id: string;
  label: string;
  /** which after-bracha this item points at, from the database */
  achrona: AfterBracha;
  /** user confirmed a kezayis (solid) / revi'is (drink) within the time span */
  shiurMet: boolean;
  isBread?: boolean;
  isFiveGrain?: boolean;
  isShivaFruit?: boolean;
  isTreeFruit?: boolean;
  isWineGrape?: boolean;
  isDrink?: boolean;
}

export interface AfterBrachaResult {
  birkatHamazon: boolean;
  /** empty array = no Me'ein Shalosh */
  meeinInserts: MeeinInsert[];
  boreiNefashos: boolean;
  /** items covered by each output, for the UI's "this covers…" notes */
  coverage: { blessing: string; covers: string[] }[];
  /** labels of items that met the shiur but no output covers — ask a rabbi */
  unresolved: string[];
  none: boolean;
}

export function resolveAfterBrachos(eaten: EatenItem[]): AfterBrachaResult {
  const met = eaten.filter((i) => i.shiurMet);

  // 'BirkatHamazon' on an item that isn't bread (rishona not Hamotzi)
  // contradicts itself — only bad learned data can — so it triggers nothing,
  // is covered by nothing, and lands in `unresolved`
  const contradictory = (i: EatenItem) => i.achrona === 'BirkatHamazon' && !i.isBread;
  const placeable = met.filter((i) => !contradictory(i));
  const isMichya = (i: EatenItem) => i.achrona === 'AlHamichya';
  const isGefen = (i: EatenItem) => i.isWineGrape || i.achrona === 'AlHagefen';
  const isEtz = (i: EatenItem) => i.isShivaFruit || i.achrona === 'AlHaetz';

  // Birkat Hamazon covers the whole meal.
  if (met.some((i) => i.isBread)) {
    return {
      birkatHamazon: true,
      meeinInserts: [],
      boreiNefashos: false,
      coverage: [
        { blessing: 'Birkat Hamazon', covers: eaten.map((i) => i.label) },
      ],
      unresolved: [],
      none: false,
    };
  }

  const inserts: MeeinInsert[] = [];
  if (placeable.some(isMichya)) inserts.push('AlHamichya');
  if (placeable.some(isGefen)) inserts.push('AlHagefen');
  if (placeable.some(isEtz)) inserts.push('AlHaetz');

  const coveredByMeein = (i: EatenItem): boolean => {
    if (contradictory(i)) return false; // never quietly absorbed — ask a rabbi
    if (isMichya(i) && inserts.includes('AlHamichya')) return true;
    if (isGefen(i) && inserts.includes('AlHagefen')) return true;
    if (isEtz(i) && inserts.includes('AlHaetz')) return true;
    // Al Ha'etz exempts Borei Nefashos for other TREE fruit
    if (i.isTreeFruit && inserts.includes('AlHaetz')) return true;
    // Hagafen covers other drinks
    if (i.isDrink && inserts.includes('AlHagefen')) return true;
    return false;
  };

  const needBN = met.some((i) => i.achrona === 'BoreiNefashos' && !coveredByMeein(i));

  const PRETTY: Record<MeeinInsert, string> = {
    AlHamichya: 'Al Hamichya',
    AlHagefen: 'Al Hagefen',
    AlHaetz: 'Al Ha’etz',
  };
  const coverage: { blessing: string; covers: string[] }[] = [];
  if (inserts.length) {
    coverage.push({
      blessing: `Me’ein Shalosh (${inserts.map((i) => PRETTY[i]).join(' + ')})`,
      covers: met.filter(coveredByMeein).map((i) => i.label),
    });
  }
  if (needBN) {
    coverage.push({
      blessing: 'Borei Nefashos',
      covers: met
        .filter((i) => i.achrona === 'BoreiNefashos' && !coveredByMeein(i))
        .map((i) => i.label),
    });
  }

  const unresolved = met
    .filter((i) => !coveredByMeein(i) && !(i.achrona === 'BoreiNefashos' && needBN))
    .map((i) => i.label);

  return {
    birkatHamazon: false,
    meeinInserts: inserts,
    boreiNefashos: needBN,
    coverage,
    unresolved,
    none: inserts.length === 0 && !needBN && unresolved.length === 0,
  };
}

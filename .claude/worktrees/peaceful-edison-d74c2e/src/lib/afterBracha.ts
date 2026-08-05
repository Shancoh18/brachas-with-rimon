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
  none: boolean;
}

export function resolveAfterBrachos(eaten: EatenItem[]): AfterBrachaResult {
  const met = eaten.filter((i) => i.shiurMet);

  // Birkat Hamazon covers the whole meal.
  if (met.some((i) => i.isBread)) {
    return {
      birkatHamazon: true,
      meeinInserts: [],
      boreiNefashos: false,
      coverage: [
        { blessing: 'Birkat Hamazon', covers: eaten.map((i) => i.label) },
      ],
      none: false,
    };
  }

  const inserts: MeeinInsert[] = [];
  if (met.some((i) => i.achrona === 'AlHamichya' && i.isFiveGrain)) inserts.push('AlHamichya');
  if (met.some((i) => i.isWineGrape)) inserts.push('AlHagefen');
  if (met.some((i) => i.isShivaFruit)) inserts.push('AlHaetz');

  const coveredByMeein = (i: EatenItem): boolean => {
    if (i.achrona === 'AlHamichya' && inserts.includes('AlHamichya')) return true;
    if (i.isWineGrape && inserts.includes('AlHagefen')) return true;
    if (i.isShivaFruit && inserts.includes('AlHaetz')) return true;
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

  return {
    birkatHamazon: false,
    meeinInserts: inserts,
    boreiNefashos: needBN,
    coverage,
    none: inserts.length === 0 && !needBN,
  };
}

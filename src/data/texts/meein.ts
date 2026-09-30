/**
 * Me'ein Shalosh text assembly — the ONE place the combined blessing is built
 * (After screen, Reference, and scripts/generate-meein-audio.mjs all call it,
 * so what is shown and what is spoken can never drift apart).
 *
 * Rule (Shulchan Aruch OC 208:12; Seder Birkat HaNehenin 1:13, chabad.org):
 * every category eaten is named in the opening AND in both closing lines, in
 * the fixed order grain → wine → fruit. The Alter Rebbe's wording for all three:
 *   "…וְנוֹדֶה לְךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגֶּפֶן וְעַל הַפֵּרוֹת,
 *    בָּרוּךְ אַתָּה ה' עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגֶּפֶן וְהַפֵּרוֹת"
 *
 * Day insertions (same siman): on Shabbat, Rosh Chodesh, Rosh Hashanah and
 * the festivals one bracketed line is said between "…וּבְטָהֳרָה" and
 * "כִּי אַתָּה" — Shabbat first when it coincides with a festival (Sukkot
 * 5787 begins on Friday night). `day` carries the choice; without it the
 * weekday text is built, which is what the seven recordings speak.
 *
 * Type-only imports: this file must stay runnable under
 * `node --experimental-strip-types` for the audio script and the unit test.
 */
import type { Liturgy, MeeinInsert, MeeinOccasion, NusachPack } from './types';

/** canonical order — the resolver emits inserts in this order too */
export const MEEIN_ORDER: readonly MeeinInsert[] = ['AlHamichya', 'AlHagefen', 'AlHaetz'];

/** canonical order of the day lines: Shabbat first, then the one day line
 *  (Rosh Chodesh, Rosh Hashanah and the festivals never share a day) */
export const MEEIN_OCCASIONS: readonly MeeinOccasion[] = [
  'shabbat',
  'roshChodesh',
  'roshHashanah',
  'pesach',
  'shavuot',
  'sukkot',
  'shminiAtzeret',
];

/** the festivals with a Chol Hamoed — the only lines with a Yom Tov variant */
export const MEEIN_YOMTOV_VARIANT: readonly MeeinOccasion[] = ['pesach', 'sukkot'];

export interface MeeinDay {
  /** Shabbat and/or ONE Rosh Chodesh / festival line, any order */
  occasions: readonly MeeinOccasion[];
  /** Pesach / Sukkot: the festival day itself rather than Chol Hamoed */
  yomTov?: boolean;
}

/**
 * "Today is…" chip logic for the After screen: Shabbat toggles on its own;
 * the other lines are one-of (Rosh Chodesh and the festivals never share a
 * day), so picking a second one replaces the first. Pure — unit-tested.
 */
export function toggleMeeinOccasion(current: readonly MeeinOccasion[], k: MeeinOccasion): MeeinOccasion[] {
  if (current.includes(k)) return current.filter((o) => o !== k);
  return k === 'shabbat' ? [...current, k] : [...current.filter((o) => o === 'shabbat'), k];
}

export interface MeeinText extends Liturgy {
  /** Land-of-Israel wording for the categories eaten, to show beside the text */
  israelNotes: Liturgy[];
  /** the day lines spliced in, canonical order (empty = weekday text) */
  occasions: MeeinOccasion[];
}

type Field = keyof Liturgy;

export function assembleMeein(pack: NusachPack, inserts: readonly MeeinInsert[], day?: MeeinDay): MeeinText {
  const ms = pack.meeinShalosh;
  const cats = MEEIN_ORDER.filter((k) => inserts.includes(k));
  if (!cats.length) throw new Error('assembleMeein: no inserts');
  for (const k of day?.occasions ?? []) {
    if (!MEEIN_OCCASIONS.includes(k)) throw new Error(`assembleMeein: unknown occasion ${String(k)}`);
  }
  const occasions = MEEIN_OCCASIONS.filter((k) => day?.occasions.includes(k));
  const dayLine = (k: MeeinOccasion): Liturgy =>
    (day?.yomTov ? ms.occasionsYomTov?.[k as 'pesach' | 'sukkot'] : undefined) ?? ms.occasions[k];

  const build = (f: Field): string => {
    const opener = f === 'english' ? ', and ' : f === 'translit' ? " v'" : ' וְ';
    const open = cats.map((k) => ms.inserts[k][f]).join(opener);
    const thanks = cats.map((k) => ms.closing.thanks[k][f]).join(' ');
    const seal = cats
      .map((k, i) => (i > 0 && ms.closing.sealJoined?.[k] ? ms.closing.sealJoined[k]![f] : ms.closing.seal[k][f]))
      .join(' ');
    const body = f === 'english' ? `, ${ms.body[f]}` : ` ${ms.body[f]}`;
    // each day line is its own sentence, exactly as the siddurim bracket them
    const days = occasions.map((k) => ` ${dayLine(k)[f]}.`).join('');
    return `${ms.opening[f]} ${open}${body}${days} ${ms.kiAtah[f]} ${thanks}. ${ms.closing.baruch[f]} ${seal}.`;
  };

  return {
    hebrew: build('hebrew'),
    translit: build('translit'),
    english: build('english'),
    israelNotes: cats.map((k) => ms.closing.israelNote?.[k]).filter((n): n is Liturgy => !!n),
    occasions,
  };
}

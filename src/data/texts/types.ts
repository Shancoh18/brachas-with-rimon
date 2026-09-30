import type { AfterBracha, Bracha } from '../foods';

export interface Liturgy {
  hebrew: string;
  translit: string;
  english: string;
}

/**
 * The day insertions of Me'ein Shalosh — one bracketed line each, said between
 * "…וּבְטָהֳרָה" and "כִּי אַתָּה" (Shulchan Aruch OC 208:12). Shabbat can
 * coincide with any of the others and is said FIRST.
 */
export type MeeinOccasion =
  | 'shabbat'
  | 'roshChodesh'
  | 'roshHashanah'
  | 'pesach'
  | 'shavuot'
  | 'sukkot'
  | 'shminiAtzeret';

export interface NusachPack {
  id: 'ari' | 'ashkenaz' | 'edot';
  label: string;
  /** true = full text sourced verbatim from chabad.org; false = shared Hebrew + generated transliteration, verify against a licensed siddur */
  complete: boolean;
  completenessNote?: string;
  brachos: Record<Bracha, Liturgy>;
  boreiNefashos: Liturgy;
  /** Me'ein Shalosh — assemble it ONLY through assembleMeein() in ./meein.ts */
  meeinShalosh: {
    opening: Liturgy;
    inserts: Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>;
    /** "וְעַל תְּנוּבַת הַשָּׂדֶה … וּנְבָרֶכְךָ בִּקְדֻשָּׁה וּבְטָהֳרָה." — the day insertions (occasions) follow it */
    body: Liturgy;
    /**
     * Day insertions, printed in brackets in every siddur between `body` and
     * `kiAtah`: Shabbat "וּרְצֵה וְהַחֲלִיצֵנוּ…", Rosh Chodesh / Rosh Hashanah
     * "וְזָכְרֵנוּ לְטוֹבָה…", festivals "וְשַׂמְּחֵנוּ…". No trailing punctuation
     * — assembleMeein() adds it. For Pesach and Sukkot this is the line as
     * said on Chol Hamoed; see occasionsYomTov.
     */
    occasions: Record<MeeinOccasion, Liturgy>;
    /**
     * Pesach / Sukkot on the festival DAYS themselves (not Chol Hamoed): the
     * line that REPLACES occasions[k] — Ashkenaz (Daat) and Edot Hamizrach add
     * "בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה". Absent (Ari) = the same line all week.
     */
    occasionsYomTov?: Partial<Record<'pesach' | 'sukkot', Liturgy>>;
    /** "כִּי אַתָּה … וְנוֹדֶה לְּךָ עַל הָאָרֶץ" — the closing picks up from there */
    kiAtah: Liturgy;
    /**
     * The closing, split into per-category words so several categories JOIN in
     * both the thanks line and the chatima: Shulchan Aruch OC 208:12 "וחותם על
     * הארץ ועל המחיה ועל פרי הגפן ועל הפירות"; Seder Birkat HaNehenin 1:13.
     */
    closing: {
      /** words after "וְנוֹדֶה לְּךָ עַל הָאָרֶץ", e.g. "וְעַל הַמִּחְיָה" */
      thanks: Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>;
      /** "בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ" */
      baruch: Liturgy;
      /** words after the baruch line when the category is named FIRST */
      seal: Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>;
      /** words after the baruch line when NOT first (Ari: "וְהַפֵּרוֹת"); absent = seal */
      sealJoined?: Partial<Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>>;
      /** Land-of-Israel wording — shown BESIDE the blessing, never inside it */
      israelNote?: Partial<Record<'AlHamichya' | 'AlHagefen' | 'AlHaetz', Liturgy>>;
    };
  };
  birkatHamazon: {
    intro: string;
    sections: { name: string; hebrew: string; translit: string; english: string }[];
    notes: string[];
  };
}

export type MeeinInsert = Extract<AfterBracha, 'AlHamichya' | 'AlHagefen' | 'AlHaetz'>;

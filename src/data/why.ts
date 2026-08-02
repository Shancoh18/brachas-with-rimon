/**
 * The "Why" library — per-blessing explanations shown in the Why dropdown on
 * each bracha page: why this blessing exists, and why it comes where it does
 * in the recitation order (kedima).
 *
 * Editorial summaries written for this app; the underlying teachings are
 * drawn from chabad.org (each entry links its source article). Quotes are
 * kept under 15 words per the content rules. This is STUDY MATERIAL, not
 * psak; the app-wide disclaimer applies.
 */
import type { Bracha } from './foods';

export interface WhySection {
  label: string;
  text: string;
}

export interface WhyEntry {
  sections: WhySection[];
  sourceTitle: string;
  sourceUrl: string;
}

/** Shared framing, shown on every dropdown as the first line. */
export const WHY_INTRO =
  'A bracha acknowledges that "the earth and all that it contains" belongs to G-d — the blessing is how we ask permission before partaking, and how a plain bite becomes gratitude.';

export const WHY_INTRO_SOURCE = {
  title: 'Why a Blessing? — chabad.org',
  url: 'https://www.chabad.org/library/article_cdo/aid/90550/jewish/Why-a-Blessing.htm',
};

export const WHY_BRACHA: Record<Bracha, WhyEntry> = {
  Hamotzi: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Bread from the five grains is treated as "the most significant of all foods" — the one staple human hands complete, from earth to loaf. It even gets its own preparation: washing the hands before eating it.',
      },
      {
        label: 'Why it comes first',
        text: 'Hamotzi is the premier blessing of the table. Once said over bread, it covers nearly everything eaten in that meal (wine and dessert are the classic exceptions) — so when bread is present, it leads and most other blessings simply are not needed.',
      },
    ],
    sourceTitle: 'Hamotzi: Blessing Over Bread — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278542/jewish/Hamotzi-Blessing-Over-Bread.htm',
  },
  Mezonos: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Foods made from the five grains that are not bread — cake, crackers, pasta, cereal — get their own blessing "Borei minei mezonos," naming G-d as the One who provides sustenance. Grain is singled out because it truly sustains.',
      },
      {
        label: 'Why this order',
        text: 'When there is no bread, grain still leads: the order of precedence taught on the sources is mezonos, then hagafen, ha\'etz, ha\'adama, and shehakol. The more a food sustains — and the more specifically its blessing names it — the earlier it is honored.',
      },
    ],
    sourceTitle: 'Mezonot: The Blessing on Grains — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278543/jewish/Mezonot-The-Blessing-on-Grains.htm',
  },
  Hagafen: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Wine "occupies a special place in Jewish life" — it marks kiddush, weddings, and celebration — so the Sages gave it a blessing of its own instead of the generic drink blessing. Grape juice shares it.',
      },
      {
        label: 'Why this order',
        text: 'Hagafen stands right after grain foods and before the fruits — honored above the general fruit blessing because wine was singled out for its role in ritual and joy. Once said, it also covers your other drinks.',
      },
    ],
    sourceTitle: 'Borei Pri Hagafen: The Blessing on Wine — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278544/jewish/Borei-Pri-Hagafen-The-Blessing-on-Wine-and-Grape-Juice.htm',
  },
  Haetz: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Fruit of a perennial tree — a giver that returns year after year from the same trunk — is named specifically: "Who creates the fruit of the tree."',
      },
      {
        label: 'Why this order',
        text: 'Ha\'etz precedes Ha\'adama because it names its food more precisely — a tree fruit technically grows from the ground too, but "blessing G-d in a more specific way" is itself the honored path. Within tree fruits, the Seven Species of the Land of Israel come first in their verse order, then whole fruit over cut, then your favorite.',
      },
    ],
    sourceTitle: "Borei Pri Ha'etz: The Blessing on Fruits — chabad.org",
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278545/jewish/Borei-Pri-Haetz-The-Blessing-on-Fruits.htm',
  },
  Haadama: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'For what the earth itself yields — vegetables, legumes, melons, bananas: "Who creates the fruit of the ground." It thanks G-d for the soil\'s direct produce.',
      },
      {
        label: 'Why this order',
        text: 'More specific than Shehakol, less specific than the tree-fruit blessing — so it sits between them. When you have both a tree fruit and a ground fruit, the sources say to bless the food you prefer first.',
      },
    ],
    sourceTitle: "Borei Pri Ha'adamah: The Blessing on Vegetables — chabad.org",
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278546/jewish/Borei-Pri-Haadamah-The-Blessing-on-Vegetables.htm',
  },
  Shehakol: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Meat, fish, eggs, water, drinks, candy — everything that fits no other category — gets "Shehakol": "a broad blessing that gives praise for all of creation," for all that came to be through His word.',
      },
      {
        label: 'Why it comes last',
        text: 'Shehakol is the widest and least specific blessing, so it always yields to any blessing that names its food precisely. Whenever a more exact bracha exists, that one is honored first — which is why Shehakol closes the order.',
      },
    ],
    sourceTitle: 'Shehakol: The Blessing on All Other Foods — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278547/jewish/Shehakol-The-Blessing-on-All-Other-Foods.htm',
  },
};

/** After-blessing entries, keyed to the three cards on the After screen. */
export const WHY_AFTER: Record<'birkatHamazon' | 'meeinShalosh' | 'boreiNefashos', WhyEntry> = {
  birkatHamazon: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Blessing after eating is the one the Torah itself commands: "And you shall eat and be satisfied and you shall bless" (Deuteronomy 8:10). Birkat Hamazon thanks G-d for the food, the Land, Jerusalem, and His goodness.',
      },
      {
        label: 'Why after bread',
        text: 'A meal with bread is "a meal" in the fullest sense — Hamotzi opened it and covered what you ate, so the full Grace After Meals closes it and covers everything too.',
      },
    ],
    sourceTitle: 'Birkat Hamazon: Grace After Bread — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278548/jewish/Birkat-Hamazon-Grace-After-Bread-Bentching.htm',
  },
  meeinShalosh: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'Grain foods, wine, and the fruits of the Seven Species are the foods the Torah praises the Land for — so they earn a fuller thank-you than other foods: one condensed blessing that echoes the themes of the full Grace.',
      },
      {
        label: 'Why combined',
        text: 'However many of the three categories you ate, the inserts join into a single Me\'ein Shalosh — one blessing, never several. That is why the app assembles it for you as one text.',
      },
    ],
    sourceTitle: 'Al Hamichyah: The After-Blessing on Special Foods — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/279847/jewish/Al-Hamichyah-The-After-Blessing-on-Special-Foods.htm',
  },
  boreiNefashos: {
    sections: [
      {
        label: 'Why this blessing',
        text: 'For everything not covered by Grace After Meals or Me\'ein Shalosh, Borei Nefashos thanks the "Creator of numerous souls" — a short blessing acknowledging that every need and every food traces back to Him.',
      },
      {
        label: 'Why it applies here',
        text: 'It is the catch-all closer: any food in your meal whose after-blessing is not covered by a more specific one is gathered under Borei Nefashos.',
      },
    ],
    sourceTitle: 'Borei Nefashot: After-Blessing on Other Foods — chabad.org',
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/279850/jewish/Borei-Nefashot-After-Blessing-on-Other-Foods.htm',
  },
};

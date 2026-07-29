/**
 * Nusach Ashkenaz — LICENSED text pack.
 * Hebrew sourced from Sefaria: "Daat Siddur Ashkenaz" edition, license
 * **Public Domain** (verified via the Sefaria API, 2026-07-29):
 *   Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating.
 * Transliteration is auto-generated (flagged in-app); translations follow the
 * common rendering. Diaspora (chu"l) seal wording is used by default — the
 * Israel variants (e.g. "v'al pri gafnah") are noted inline.
 */
import type { NusachPack } from './types';

const OPENING_HE = 'בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם';
const OPENING_TL = 'Ba-ruch a-tah A-do-nai E-lo-hei-nu me-lech ha-o-lam';
const OPENING_EN = 'Blessed are You, L-rd our G-d, King of the Universe';

export const ASHKENAZ: NusachPack = {
  id: 'ashkenaz',
  label: 'Ashkenaz',
  complete: true,
  completenessNote:
    'Hebrew from the public-domain Daat Siddur Ashkenaz (via Sefaria). Transliteration auto-generated — verify pronunciation against your own siddur.',
  brachos: {
    Hamotzi: {
      hebrew: `${OPENING_HE}, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.`,
      translit: `${OPENING_TL}, ha-mo-tzi le-chem min ha-a-retz.`,
      english: `${OPENING_EN}, Who brings forth bread from the earth.`,
    },
    Mezonos: {
      hebrew: `${OPENING_HE}, בּוֹרֵא מִינֵי מְזוֹנוֹת.`,
      translit: `${OPENING_TL}, bo-rei mi-nei me-zo-not.`,
      english: `${OPENING_EN}, Who creates various kinds of sustenance.`,
    },
    Hagafen: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הַגָּפֶן.`,
      translit: `${OPENING_TL}, bo-rei pri ha-ga-fen.`,
      english: `${OPENING_EN}, Who creates the fruit of the vine.`,
    },
    Haetz: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הָעֵץ.`,
      translit: `${OPENING_TL}, bo-rei pri ha-etz.`,
      english: `${OPENING_EN}, Who creates the fruit of the tree.`,
    },
    Haadama: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הָאֲדָמָה.`,
      translit: `${OPENING_TL}, bo-rei pri ha-a-da-mah.`,
      english: `${OPENING_EN}, Who creates the fruit of the earth.`,
    },
    Shehakol: {
      hebrew: `${OPENING_HE}, שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ.`,
      translit: `${OPENING_TL}, she-ha-kol ni-h'yah bid-va-ro.`,
      english: `${OPENING_EN}, by Whose word all things came to be.`,
    },
  },
  boreiNefashos: {
    hebrew: `${OPENING_HE}, בּוֹרֵא נְפָשׁוֹת רַבּוֹת וְחֶסְרוֹנָן, עַל כָּל מַה שֶּׁבָּרָאתָ לְהַחֲיוֹת בָּהֶם נֶפֶשׁ כָּל חָי. בָּרוּךְ חֵי הָעוֹלָמִים.`,
    translit: `${OPENING_TL}, bo-rei ne-fa-shot ra-bot v'ches-ro-nan, al kol mah she-ba-ra-ta l'ha-cha-yot ba-hem ne-fesh kol chai. Ba-ruch chei ha-o-la-mim.`,
    english: `${OPENING_EN}, Creator of numerous living beings and their needs, for all the things You have created with which to sustain the soul of every living being. Blessed is the Life of the worlds.`,
  },
  meeinShalosh: {
    opening: {
      hebrew: `${OPENING_HE},`,
      translit: `${OPENING_TL},`,
      english: `${OPENING_EN},`,
    },
    inserts: {
      AlHamichya: {
        hebrew: 'עַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה',
        translit: "al ha-mich-yah v'al ha-kal-ka-lah",
        english: 'for the sustenance and for the nourishment',
      },
      AlHagefen: {
        hebrew: 'עַל הַגֶּפֶן וְעַל פְּרִי הַגֶּפֶן',
        translit: "al ha-ge-fen v'al pri ha-ge-fen",
        english: 'for the vine and for the fruit of the vine',
      },
      AlHaetz: {
        hebrew: 'עַל הָעֵץ וְעַל פְּרִי הָעֵץ',
        translit: "al ha-etz v'al pri ha-etz",
        english: 'for the tree and for the fruit of the tree',
      },
    },
    body: {
      hebrew:
        'וְעַל תְּנוּבַת הַשָּׂדֶה וְעַל אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה שֶׁרָצִיתָ וְהִנְחַלְתָּ לַאֲבוֹתֵינוּ לֶאֱכוֹל מִפִּרְיָהּ וְלִשְׂבּוֹעַ מִטּוּבָהּ. רַחֵם נָא יְיָ אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ וְעַל יְרוּשָׁלַיִם עִירֶךָ וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ, וְעַל מִזְבְּחֶךָ, וְעַל הֵיכָלֶךָ. וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְיָמֵינוּ. וְהַעֲלֵנוּ לְתוֹכָהּ וְשַׂמְּחֵנוּ בְּבִנְיָנָהּ, וְנֹאכַל מִפִּרְיָהּ וְנִשְׂבַּע מִטּוּבָהּ וּנְבָרֶכְךָ עָלֶיהָ בִּקְדֻשָּׁה וּבְטָהֳרָה. כִּי אַתָּה יְיָ טוֹב וּמֵטִיב לַכֹּל וְנוֹדֶה לְּךָ עַל הָאָרֶץ',
      translit:
        "v'al t'nu-vat ha-sa-deh v'al e-retz chem-dah to-vah ur-cha-vah she-ra-tzi-ta v'hin-chal-ta la-a-vo-tei-nu le-e-chol mi-pir-yah v'lis-bo-a mi-tu-vah. Ra-cheim na A-do-nai E-lo-hei-nu al Yis-ra-eil a-me-cha v'al Y'ru-sha-la-yim i-re-cha v'al Tzi-yon mish-kan k'vo-de-cha, v'al miz-b'che-cha, v'al hei-cha-le-cha. Uv-nei Y'ru-sha-la-yim ir ha-ko-desh bim-hei-rah v'ya-mei-nu. V'ha-a-lei-nu l'to-chah v'sam-chei-nu b'vin-ya-nah, v'no-chal mi-pir-yah v'nis-ba mi-tu-vah un-va-rech-cha a-le-ha bik-du-shah uv-ta-ho-rah. Ki a-tah A-do-nai tov u-mei-tiv la-kol v'no-deh l'cha al ha-a-retz",
      english:
        'and for the produce of the field, and for the precious, good and spacious land which You favored and gave as a heritage to our fathers, to eat of its fruit and be satiated with its goodness. Have mercy, L-rd our G-d, on Israel Your people, on Jerusalem Your city, on Zion the abode of Your glory, on Your altar and on Your Temple. Rebuild Jerusalem, the holy city, speedily in our days; bring us up to it and gladden us in its rebuilding; may we eat of its fruit and be satiated with its goodness, and bless You upon it in holiness and purity. For You, L-rd, are good and do good to all, and we thank You for the land',
    },
    seals: {
      AlHamichya: {
        hebrew: 'וְעַל הַמִּחְיָה. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה.',
        translit: "v'al ha-mich-yah. Ba-ruch a-tah A-do-nai, al ha-a-retz v'al ha-mich-yah.",
        english: 'and for the sustenance. Blessed are You, L-rd, for the land and for the sustenance.',
      },
      AlHagefen: {
        hebrew: 'וְעַל פְּרִי הַגָּפֶן. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן. (בארץ ישראל: וְעַל פְּרִי גַפְנָהּ)',
        translit: "v'al pri ha-ga-fen. Ba-ruch a-tah A-do-nai, al ha-a-retz v'al pri ha-ga-fen. (In Israel: v'al pri gaf-nah)",
        english: 'and for the fruit of the vine. Blessed are You, L-rd, for the land and for the fruit of the vine. (In Israel: “for the fruit of its vine.”)',
      },
      AlHaetz: {
        hebrew: 'וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַפֵּרוֹת. (בארץ ישראל: וְעַל פֵּרוֹתֶיהָ)',
        translit: "v'al ha-pei-rot. Ba-ruch a-tah A-do-nai, al ha-a-retz v'al ha-pei-rot. (In Israel: v'al pei-ro-te-ha)",
        english: 'and for the fruits. Blessed are You, L-rd, for the land and for the fruits. (In Israel: “for its fruits.”)',
      },
    },
  },
  birkatHamazon: {
    intro:
      'Birkat Hamazon (Grace After Meals) — recited after a meal with at least a kezayis of bread. Four blessings; recite the full text from your own siddur or bentcher. Structure:',
    sections: [
      {
        name: '1 · Hazan — Who nourishes all',
        hebrew: 'בָּרוּךְ אַתָּה יְיָ… הַזָּן אֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ… בָּרוּךְ אַתָּה יְיָ, הַזָּן אֶת הַכֹּל.',
        translit: 'Ba-ruch a-tah A-do-nai… ha-zan et ha-o-lam ku-lo b\'tu-vo… Ba-ruch a-tah A-do-nai, ha-zan et ha-kol.',
        english: 'Blessed are You… Who nourishes the whole world in His goodness… Blessed are You, L-rd, Who nourishes all.',
      },
      {
        name: '2 · Birkat Ha’aretz — For the land',
        hebrew: 'נוֹדֶה לְּךָ… עַל שֶׁהִנְחַלְתָּ לַאֲבוֹתֵינוּ אֶרֶץ חֶמְדָּה… בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמָּזוֹן.',
        translit: 'No-deh l\'cha… al she-hin-chal-ta la-a-vo-tei-nu e-retz chem-dah… Ba-ruch a-tah A-do-nai, al ha-a-retz v\'al ha-ma-zon.',
        english: 'We thank You… for the precious land You gave our fathers… Blessed are You, L-rd, for the land and for the food.',
      },
      {
        name: '3 · Boneh Yerushalayim — Rebuilder of Jerusalem',
        hebrew: 'רַחֵם… עַל יִשְׂרָאֵל עַמֶּךָ וְעַל יְרוּשָׁלַיִם עִירֶךָ… בָּרוּךְ אַתָּה יְיָ, בּוֹנֵה בְרַחֲמָיו יְרוּשָׁלָיִם. אָמֵן.',
        translit: 'Ra-cheim… al Yis-ra-eil a-me-cha v\'al Y\'ru-sha-la-yim i-re-cha… Ba-ruch a-tah A-do-nai, bo-neh v\'ra-cha-mav Y\'ru-sha-la-yim. A-mein.',
        english: 'Have mercy… on Israel Your people and on Jerusalem Your city… Blessed are You, L-rd, Who in His mercy rebuilds Jerusalem. Amen.',
      },
      {
        name: '4 · Hatov Vehametiv — Who is good and does good',
        hebrew: 'בָּרוּךְ אַתָּה יְיָ… הַמֶּלֶךְ הַטּוֹב וְהַמֵּטִיב לַכֹּל…',
        translit: 'Ba-ruch a-tah A-do-nai… ha-me-lech ha-tov v\'ha-mei-tiv la-kol…',
        english: 'Blessed are You… the King Who is good and does good to all…',
      },
    ],
    notes: [
      'Shabbat: insert R’tzei; Rosh Chodesh / festivals: Yaaleh Veyavo; Chanukah / Purim: Al Hanissim.',
      'Ashkenaz custom includes Shir Hamaalot before bentching on Shabbat and festivals.',
      'Recite the complete text from a licensed siddur or bentcher — this outline is a study aid.',
    ],
  },
};

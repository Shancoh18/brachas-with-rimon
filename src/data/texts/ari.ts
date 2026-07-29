/**
 * Nusach Ari (Chabad) — the COMPLETE text pack.
 * Liturgical Hebrew / translation / transliteration sourced verbatim from
 * chabad.org (with Borei Nefashos corroborated on brachos.org).
 * chabad.org publishes ONLY this nusach — see CLAUDE.md "Nusach".
 */
import type { NusachPack } from './types';

const OPENING_HE = 'בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם';
const OPENING_TL = 'Ba-ruch a-tah A-do-nai E-lo-hei-nu me-lech ha-o-lam';
const OPENING_EN = 'Blessed are You, L-rd our G-d, King of the Universe';

export const ARI: NusachPack = {
  id: 'ari',
  label: 'Nusach Ari (Chabad)',
  complete: true,
  brachos: {
    Hamotzi: {
      hebrew: `${OPENING_HE}, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.`,
      translit: `${OPENING_TL}, ha-mo-tzi le-chem min ha-a-retz.`,
      english: `${OPENING_EN}, Who brings forth bread from the earth.`,
    },
    Mezonos: {
      hebrew: `${OPENING_HE}, בּוֹרֵא מִינֵי מְזוֹנוֹת.`,
      translit: `${OPENING_TL}, bo-rai mi-nai me-zo-not.`,
      english: `${OPENING_EN}, Who creates various kinds of sustenance.`,
    },
    Hagafen: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הַגָּפֶן.`,
      translit: `${OPENING_TL}, bo-rai pri ha-ga-fen.`,
      english: `${OPENING_EN}, Who creates the fruit of the vine.`,
    },
    Haetz: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הָעֵץ.`,
      translit: `${OPENING_TL}, bo-rai pri ha-aitz.`,
      english: `${OPENING_EN}, Who creates the fruit of the tree.`,
    },
    Haadama: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הָאֲדָמָה.`,
      translit: `${OPENING_TL}, bo-rai pri ha-a-da-mah.`,
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
    translit: `${OPENING_TL}, bo-rei ne-fa-shos ra-bos v'ches-ro-nan, al kol mah she-ba-ra-sa l'ha-cha-yos ba-hem ne-fesh kol chai. Ba-ruch chei ha-o-la-mim.`,
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
        translit: 'al ha-mich-yah v\'al ha-kal-ka-lah',
        english: 'for the sustenance and for the nourishment',
      },
      AlHagefen: {
        hebrew: 'עַל הַגֶּפֶן וְעַל פְּרִי הַגֶּפֶן',
        translit: 'al ha-ge-fen v\'al pri ha-ga-fen',
        english: 'for the vine and for the fruit of the vine',
      },
      AlHaetz: {
        hebrew: 'עַל הָעֵץ וְעַל פְּרִי הָעֵץ',
        translit: 'al ha-aitz v\'al pri ha-aitz',
        english: 'for the tree and for the fruit of the tree',
      },
    },
    body: {
      hebrew:
        'וְעַל תְּנוּבַת הַשָּׂדֶה, וְעַל אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה, שֶׁרָצִיתָ וְהִנְחַלְתָּ לַאֲבוֹתֵינוּ, לֶאֱכוֹל מִפִּרְיָהּ וְלִשְׂבּוֹעַ מִטּוּבָהּ. רַחֵם נָא יְיָ אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ, וְעַל יְרוּשָׁלַיִם עִירֶךָ, וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ, וְעַל מִזְבְּחֶךָ וְעַל הֵיכָלֶךָ. וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְיָמֵינוּ, וְהַעֲלֵנוּ לְתוֹכָהּ, וְשַׂמְּחֵנוּ בְּבִנְיָנָהּ, וְנֹאכַל מִפִּרְיָהּ, וְנִשְׂבַּע מִטּוּבָהּ, וּנְבָרֶכְךָ עָלֶיהָ בִּקְדֻשָּׁה וּבְטָהֳרָה. כִּי אַתָּה יְיָ טוֹב וּמֵטִיב לַכֹּל, וְנוֹדֶה לְּךָ עַל הָאָרֶץ',
      translit:
        'v\'al t\'nu-vas ha-sa-deh, v\'al e-retz chem-dah to-vah ur-cha-vah, she-ra-tzi-sa v\'hin-chal-ta la-a-vo-sei-nu, le-e-chol mi-pir-yah v\'lis-bo-a mi-tu-vah. Ra-cheim na A-do-nai E-lo-hei-nu al Yis-ra-eil a-me-cha, v\'al Y\'ru-sha-la-yim i-re-cha, v\'al Tzi-yon mish-kan k\'vo-de-cha, v\'al miz-b\'che-cha v\'al hei-cha-le-cha. Uv-nei Y\'ru-sha-la-yim ir ha-ko-desh bim-hei-rah v\'ya-mei-nu, v\'ha-a-lei-nu l\'so-chah, v\'sam-chei-nu b\'vin-ya-nah, v\'no-chal mi-pir-yah, v\'nis-ba mi-tu-vah, un-va-rech-cha a-le-ha bik-du-shah uv-ta-ho-rah. Ki a-tah A-do-nai tov u-mei-tiv la-kol, v\'no-deh l\'cha al ha-a-retz',
      english:
        'and for the produce of the field; and for the precious, good and spacious land which You favored and gave as a heritage to our fathers, to eat of its fruit and be satiated with its goodness. Have mercy, L-rd our G-d, on Israel Your people, on Jerusalem Your city, on Zion the abode of Your glory, on Your altar and on Your Temple. Rebuild Jerusalem, the holy city, speedily in our days, bring us up to it and make us rejoice in its rebuilding; may we eat of its fruit and be satiated with its goodness, and bless You upon it in holiness and purity. For You, L-rd, are good and do good to all, and we thank You for the land',
    },
    seals: {
      AlHamichya: {
        hebrew: 'וְעַל הַמִּחְיָה. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה.',
        translit: 'v\'al ha-mich-yah. Ba-ruch a-tah A-do-nai, al ha-a-retz v\'al ha-mich-yah.',
        english: 'and for the sustenance. Blessed are You, L-rd, for the land and for the sustenance.',
      },
      AlHagefen: {
        hebrew: 'וְעַל פְּרִי הַגֶּפֶן. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל פְּרִי הַגֶּפֶן.',
        translit: 'v\'al pri ha-ga-fen. Ba-ruch a-tah A-do-nai, al ha-a-retz v\'al pri ha-ga-fen.',
        english: 'and for the fruit of the vine. Blessed are You, L-rd, for the land and for the fruit of the vine.',
      },
      AlHaetz: {
        hebrew: 'וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַפֵּרוֹת.',
        translit: 'v\'al ha-pei-ros. Ba-ruch a-tah A-do-nai, al ha-a-retz v\'al ha-pei-ros.',
        english: 'and for the fruits. Blessed are You, L-rd, for the land and for the fruits.',
      },
    },
  },
  birkatHamazon: {
    intro:
      'Birkat Hamazon (Grace After Meals) — recited after a meal with at least a kezayis of bread. Four blessings, per the Chabad (Nusach Ari) text on chabad.org:',
    sections: [
      {
        name: '1 · Hazan — Who nourishes all',
        hebrew:
          'בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַזָּן אֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ, בְּחֵן בְּחֶסֶד וּבְרַחֲמִים… בָּרוּךְ אַתָּה יְיָ, הַזָּן אֶת הַכֹּל.',
        translit:
          'Ba-ruch a-tah A-do-nai E-lo-hei-nu me-lech ha-o-lam, ha-zan et ha-o-lam ku-lo b\'tu-vo, b\'chein b\'che-sed uv-ra-cha-mim… Ba-ruch a-tah A-do-nai, ha-zan et ha-kol.',
        english:
          'Blessed are You… Who nourishes the whole world in His goodness, with grace, kindness and mercy… Blessed are You, L-rd, Who nourishes all.',
      },
      {
        name: '2 · Birkat Ha’aretz — For the land',
        hebrew:
          'נוֹדֶה לְּךָ יְיָ אֱלֹהֵינוּ עַל שֶׁהִנְחַלְתָּ לַאֲבוֹתֵינוּ אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה… בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמָּזוֹן.',
        translit:
          'No-deh l\'cha A-do-nai E-lo-hei-nu al she-hin-chal-ta la-a-vo-tei-nu e-retz chem-dah to-vah ur-cha-vah… Ba-ruch a-tah A-do-nai, al ha-a-retz v\'al ha-ma-zon.',
        english:
          'We thank You, L-rd our G-d, for having given the heritage of a precious, good and spacious land to our fathers… Blessed are You, L-rd, for the land and for the food.',
      },
      {
        name: '3 · Boneh Yerushalayim — Rebuilder of Jerusalem',
        hebrew:
          'רַחֵם יְיָ אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ, וְעַל יְרוּשָׁלַיִם עִירֶךָ… וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְיָמֵינוּ. בָּרוּךְ אַתָּה יְיָ, בּוֹנֵה בְרַחֲמָיו יְרוּשָׁלָיִם. אָמֵן.',
        translit:
          'Ra-cheim A-do-nai E-lo-hei-nu al Yis-ra-eil a-me-cha, v\'al Y\'ru-sha-la-yim i-re-cha… uv-nei Y\'ru-sha-la-yim ir ha-ko-desh bim-hei-rah v\'ya-mei-nu. Ba-ruch a-tah A-do-nai, bo-nei v\'ra-cha-mav Y\'ru-sha-la-yim. A-mein.',
        english:
          'Have mercy, L-rd our G-d, on Israel Your people and on Jerusalem Your city… Rebuild Jerusalem, the holy city, speedily in our days. Blessed are You, L-rd, Who in His mercy rebuilds Jerusalem. Amen.',
      },
      {
        name: '4 · Hatov Vehametiv — Who is good and does good',
        hebrew:
          'בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הָאֵל אָבִינוּ מַלְכֵּנוּ… הַמֶּלֶךְ הַטּוֹב וְהַמֵּטִיב לַכֹּל…',
        translit:
          'Ba-ruch a-tah A-do-nai E-lo-hei-nu me-lech ha-o-lam, ha-Eil a-vi-nu mal-kei-nu… ha-me-lech ha-tov v\'ha-mei-tiv la-kol…',
        english:
          'Blessed are You… the G-d Who is our Father, our King… the King Who is good and does good to all…',
      },
      {
        name: 'Harachaman — supplications',
        hebrew: 'הָרַחֲמָן הוּא יִמְלוֹךְ עָלֵינוּ לְעוֹלָם וָעֶד…',
        translit: 'Ha-ra-cha-man hu yim-loch a-lei-nu l\'o-lam va-ed…',
        english: 'May the Merciful One reign over us forever and ever…',
      },
    ],
    notes: [
      'Shabbat: insert R’tsei v’ha-cha-li-tsei-nu (within Boneh Yerushalayim) and the Shabbat Ha-ra-cha-man.',
      'Rosh Chodesh / festivals: insert Yaaleh Veyavo.',
      'Chanukah / Purim: insert Al Hanissim.',
      'Chabad custom: “Mag-dil” on weekdays, “Mig-dol” on Shabbat and festivals; Naar Hayiti is omitted.',
      'The full text is long — recite from a siddur or bentcher. This section is a study outline of the Chabad text.',
    ],
  },
};

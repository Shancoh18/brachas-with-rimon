/**
 * Edot Hamizrach — LICENSED text pack.
 * Me'ein Shalosh Hebrew sourced from Sefaria: "Siddur Edot HaMizrach —
 * Shaliehsaboo Edition", license **CC0** (verified via the Sefaria API,
 * 2026-07-29): Siddur Edot HaMizrach, Al Hamihya.
 * Distinctive features preserved: "Rachem… aleinu v'al Yisrael amach",
 * "Har Tziyon", and the Land-of-Israel seals "v'al pri gafnah" /
 * "v'al peiroteha". Diaspora seals shown by default with the Israel variant
 * noted. Transliteration auto-generated.
 */
import type { NusachPack } from './types';

const OPENING_HE = 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם';
const OPENING_TL = 'Ba-ruch a-tah A-do-nai, E-lo-hei-nu me-lech ha-o-lam';
const OPENING_EN = 'Blessed are You, L-rd our G-d, King of the Universe';

export const EDOT: NusachPack = {
  id: 'edot',
  label: 'Edot Hamizrach',
  complete: true,
  completenessNote:
    'Me’ein Shalosh Hebrew from the CC0 Shaliehsaboo Edition of Siddur Edot HaMizrach (via Sefaria). Transliteration auto-generated — verify pronunciation and personal customs against your own siddur.',
  brachos: {
    Hamotzi: {
      hebrew: `${OPENING_HE}, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.`,
      translit: `${OPENING_TL}, ha-mo-tzi le-chem min ha-a-retz.`,
      english: `${OPENING_EN}, Who brings forth bread from the earth.`,
    },
    Mezonos: {
      hebrew: `${OPENING_HE}, בּוֹרֵא מִינֵי מְזוֹנוֹת.`,
      translit: `${OPENING_TL}, bo-reh mi-nei me-zo-not.`,
      english: `${OPENING_EN}, Who creates various kinds of sustenance.`,
    },
    Hagafen: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הַגֶּפֶן.`,
      translit: `${OPENING_TL}, bo-reh pri ha-ge-fen.`,
      english: `${OPENING_EN}, Who creates the fruit of the vine. (Sephardic pronunciation: ha-gefen.)`,
    },
    Haetz: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הָעֵץ.`,
      translit: `${OPENING_TL}, bo-reh pri ha-etz.`,
      english: `${OPENING_EN}, Who creates the fruit of the tree.`,
    },
    Haadama: {
      hebrew: `${OPENING_HE}, בּוֹרֵא פְּרִי הָאֲדָמָה.`,
      translit: `${OPENING_TL}, bo-reh pri ha-a-da-mah.`,
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
    translit: `${OPENING_TL}, bo-reh ne-fa-shot ra-bot v'ches-ro-nan, al kol mah she-ba-ra-ta l'ha-cha-yot ba-hem ne-fesh kol chai. Ba-ruch chei ha-o-la-mim.`,
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
        'וְעַל תְּנוּבַת הַשָּׂדֶה, וְעַל אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה, שֶׁרָצִיתָ וְהִנְחַלְתָּ לַאֲבוֹתֵינוּ, לֶאֱכֹל מִפִּרְיָהּ וְלִשְׂבֹּעַ מִטּוּבָהּ. רַחֵם יְהֹוָה אֱלֹהֵינוּ עָלֵינוּ וְעַל יִשְׂרָאֵל עַמָּךְ, וְעַל יְרוּשָׁלַיִם עִירָךְ, וְעַל הַר צִיּוֹן מִשְׁכַּן כְּבוֹדָךְ, וְעַל מִזְבָּחָךְ וְעַל הֵיכָלָךְ. וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְיָמֵינוּ, וְהַעֲלֵנוּ לְתוֹכָהּ, וְשַׂמְּחֵנוּ בְּבִנְיָנָהּ, וּנְבָרְכָךְ עָלֶיהָ בִּקְדֻשָּׁה וּבְטָהֳרָה.',
      translit:
        "v'al t'nu-vat ha-sa-deh, v'al e-retz chem-dah to-vah ur-cha-vah, she-ra-tzi-ta v'hin-chal-ta la-a-vo-tei-nu, le-e-chol mi-pir-yah v'lis-bo-a mi-tu-vah. Ra-cheim A-do-nai E-lo-hei-nu a-lei-nu v'al Yis-ra-el a-mach, v'al Y'ru-sha-la-yim i-rach, v'al Har Tzi-yon mish-kan k'vo-dach, v'al miz-ba-chach v'al hei-cha-lach. Uv-neh Y'ru-sha-la-yim ir ha-ko-desh bim-hei-rah v'ya-mei-nu, v'ha-a-lei-nu l'to-chah, v'sam-chei-nu b'vin-ya-nah, un-va-r'chach a-le-ha bik-du-shah uv-ta-ho-rah.",
      english:
        'and for the produce of the field, and for the precious, good and spacious land which You favored and gave as a heritage to our fathers, to eat of its fruit and be satiated with its goodness. Have mercy, L-rd our G-d, upon us and upon Israel Your people, upon Jerusalem Your city, upon Mount Zion the abode of Your glory, upon Your altar and upon Your Temple. Rebuild Jerusalem, the holy city, speedily in our days; bring us up to it and gladden us in its rebuilding, and we will bless You upon it in holiness and purity.',
    },
    // Day insertions — verbatim from the Shaliehsaboo Edition (Sefaria, the
    // same CC0 edition as the body): Rosh Chodesh without the article, and
    // every festival line continues "בְּיוֹם (טוֹב) מִקְרָא קֹדֶשׁ הַזֶּה" — the
    // edition tags the טוֹב "ביום טוב" for Pesach and Sukkot (dropped on Chol
    // Hamoed → Yom Tov variant below) and prints it plainly for Shavuot and
    // Shemini Atzeret, which have no Chol Hamoed. The edition's Sukkot line
    // reads "בְּיוֹם הַסֻּכּוֹת"; the חַג its Pesach / Shavuot / Shemini Atzeret
    // lines carry (and the Torah's name, Leviticus 23:34) is restored here.
    occasions: {
      shabbat: { hebrew: 'וּרְצֵה וְהַחֲלִיצֵנוּ בְּיוֹם הַשַּׁבָּת הַזֶּה', translit: "Ur-tzei v'ha-cha-li-tzei-nu b'yom ha-Sha-bat ha-zeh", english: 'May it please You to strengthen us on this Shabbat day' },
      roshChodesh: { hebrew: 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ חֹדֶשׁ הַזֶּה', translit: "V'zoch-rei-nu l'to-vah b'yom Rosh Cho-desh ha-zeh", english: 'Remember us for good on this day of Rosh Chodesh' },
      roshHashanah: { hebrew: 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם הַזִּכָּרוֹן הַזֶּה', translit: "V'zoch-rei-nu l'to-vah b'yom ha-Zi-ka-ron ha-zeh", english: 'Remember us for good on this Day of Remembrance' },
      pesach: { hebrew: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַמַּצּוֹת הַזֶּה, בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה', translit: "V'sam-chei-nu b'yom Chag ha-Ma-tzot ha-zeh, b'yom mik-ra ko-desh ha-zeh", english: 'Grant us joy on this day of the Festival of Matzot, on this day of holy convocation' },
      shavuot: { hebrew: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַשָּׁבוּעוֹת הַזֶּה, בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה', translit: "V'sam-chei-nu b'yom Chag ha-Sha-vu-ot ha-zeh, b'yom tov mik-ra ko-desh ha-zeh", english: 'Grant us joy on this day of the Festival of Shavuot, on this festival day of holy convocation' },
      sukkot: { hebrew: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַסֻּכּוֹת הַזֶּה, בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה', translit: "V'sam-chei-nu b'yom Chag ha-Su-kot ha-zeh, b'yom mik-ra ko-desh ha-zeh", english: 'Grant us joy on this day of the Festival of Sukkot, on this day of holy convocation' },
      shminiAtzeret: { hebrew: 'וְשַׂמְּחֵנוּ בְּיוֹם שְׁמִינִי חַג עֲצֶרֶת הַזֶּה, בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה', translit: "V'sam-chei-nu b'yom Sh'mi-ni Chag A-tze-ret ha-zeh, b'yom tov mik-ra ko-desh ha-zeh", english: 'Grant us joy on this day of Shemini Atzeret, the Festival, on this festival day of holy convocation' },
    },
    // the festival DAYS of Pesach / Sukkot (not Chol Hamoed): "בְּיוֹם טוֹב"
    occasionsYomTov: {
      pesach: { hebrew: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַמַּצּוֹת הַזֶּה, בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה', translit: "V'sam-chei-nu b'yom Chag ha-Ma-tzot ha-zeh, b'yom tov mik-ra ko-desh ha-zeh", english: 'Grant us joy on this day of the Festival of Matzot, on this festival day of holy convocation' },
      sukkot: { hebrew: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַסֻּכּוֹת הַזֶּה, בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה', translit: "V'sam-chei-nu b'yom Chag ha-Su-kot ha-zeh, b'yom tov mik-ra ko-desh ha-zeh", english: 'Grant us joy on this day of the Festival of Sukkot, on this festival day of holy convocation' },
    },
    kiAtah: {
      hebrew: 'כִּי אַתָּה טוֹב וּמֵטִיב לַכֹּל, וְנוֹדֶה לְּךָ עַל הָאָרֶץ',
      translit: "Ki a-tah tov u-mei-tiv la-kol, v'no-deh l'cha al ha-a-retz",
      english: 'For You are good and do good to all, and we thank You for the land',
    },
    // Combined closing: each category keeps its own Shaliehsaboo seal words and
    // they join in both lines (Shulchan Aruch OC 208:12). The source prints no
    // combined example, so the joined form is the rule applied to its wording.
    closing: {
      thanks: {
        AlHamichya: { hebrew: 'וְעַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה', translit: "v'al ha-mich-yah v'al ha-kal-ka-lah", english: 'and for the sustenance and the nourishment' },
        AlHagefen: { hebrew: 'וְעַל פְּרִי הַגֶּפֶן', translit: "v'al pri ha-ge-fen", english: 'and for the fruit of the vine' },
        AlHaetz: { hebrew: 'וְעַל הַפֵּרוֹת', translit: "v'al ha-pei-rot", english: 'and for the fruits' },
      },
      baruch: { hebrew: 'בָּרוּךְ אַתָּה יְהֹוָה, עַל הָאָרֶץ', translit: 'Ba-ruch a-tah A-do-nai, al ha-a-retz', english: 'Blessed are You, L-rd, for the land' },
      seal: {
        AlHamichya: { hebrew: 'וְעַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה', translit: "v'al ha-mich-yah v'al ha-kal-ka-lah", english: 'and for the sustenance and the nourishment' },
        AlHagefen: { hebrew: 'וְעַל פְּרִי הַגֶּפֶן', translit: "v'al pri ha-ge-fen", english: 'and for the fruit of the vine' },
        AlHaetz: { hebrew: 'וְעַל הַפֵּרוֹת', translit: "v'al ha-pei-rot", english: 'and for the fruits' },
      },
      // the Land-of-Israel wording follows where the produce GREW, not where
      // you are when you bless (Shulchan Aruch OC 208:10)
      israelNote: {
        AlHamichya: { hebrew: 'לִמְזוֹנוֹת מִתְּבוּאַת אֶרֶץ יִשְׂרָאֵל: וְעַל מִחְיָתָהּ וְעַל כַּלְכָּלָתָהּ', translit: "For produce of Eretz Yisrael: v'al mich-ya-tah v'al kal-ka-la-tah", english: 'For grain grown in Eretz Yisrael: “for its sustenance and its nourishment.”' },
        AlHagefen: { hebrew: 'לְיַיִן מֵעַנְבֵי אֶרֶץ יִשְׂרָאֵל: וְעַל פְּרִי גַפְנָהּ', translit: "For produce of Eretz Yisrael: v'al pri gaf-nah", english: 'For wine from grapes grown in Eretz Yisrael: “for the fruit of its vine.”' },
        AlHaetz: { hebrew: 'לְפֵרוֹת אֶרֶץ יִשְׂרָאֵל: וְעַל פֵּרוֹתֶיהָ', translit: "For produce of Eretz Yisrael: v'al pei-ro-te-ha", english: 'For fruit grown in Eretz Yisrael: “for its fruits.”' },
      },
    },
  },
  birkatHamazon: {
    intro:
      'Birkat Hamazon — recited after a meal with at least a kezayis of bread. Four blessings; recite the full Edot Hamizrach text from your own siddur or bentcher. Structure:',
    sections: [
      {
        name: '1 · Hazan — Who nourishes all',
        hebrew: 'בָּרוּךְ אַתָּה יְהֹוָה… הַזָּן אוֹתָנוּ וְאֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ… בָּרוּךְ אַתָּה יְהֹוָה, הַזָּן אֶת הַכֹּל.',
        translit: 'Ba-ruch a-tah A-do-nai… ha-zan o-ta-nu v\'et ha-o-lam ku-lo b\'tu-vo… Ba-ruch a-tah A-do-nai, ha-zan et ha-kol.',
        english: 'Blessed are You… Who nourishes us and the whole world in His goodness… Blessed are You, L-rd, Who nourishes all.',
      },
      {
        name: '2 · Birkat Ha’aretz — For the land',
        hebrew: 'נוֹדֶה לְּךָ… עַל שֶׁהִנְחַלְתָּ לַאֲבוֹתֵינוּ אֶרֶץ חֶמְדָּה… בָּרוּךְ אַתָּה יְהֹוָה, עַל הָאָרֶץ וְעַל הַמָּזוֹן.',
        translit: 'No-deh l\'cha… al she-hin-chal-ta la-a-vo-tei-nu e-retz chem-dah… Ba-ruch a-tah A-do-nai, al ha-a-retz v\'al ha-ma-zon.',
        english: 'We thank You… for the precious land You gave our fathers… Blessed are You, L-rd, for the land and for the food.',
      },
      {
        name: '3 · Boneh Yerushalayim — Rebuilder of Jerusalem',
        hebrew: 'רַחֵם… עָלֵינוּ וְעַל יִשְׂרָאֵל עַמָּךְ וְעַל יְרוּשָׁלַיִם עִירָךְ… בּוֹנֵה בְרַחֲמָיו יְרוּשָׁלָיִם. אָמֵן.',
        translit: 'Ra-cheim… a-lei-nu v\'al Yis-ra-el a-mach v\'al Y\'ru-sha-la-yim i-rach… bo-neh v\'ra-cha-mav Y\'ru-sha-la-yim. A-mein.',
        english: 'Have mercy… upon us, upon Israel Your people and upon Jerusalem Your city… Who in His mercy rebuilds Jerusalem. Amen.',
      },
      {
        name: '4 · Hatov Vehametiv — Who is good and does good',
        hebrew: 'בָּרוּךְ אַתָּה יְהֹוָה… הַמֶּלֶךְ הַטּוֹב וְהַמֵּטִיב לַכֹּל…',
        translit: 'Ba-ruch a-tah A-do-nai… ha-me-lech ha-tov v\'ha-mei-tiv la-kol…',
        english: 'Blessed are You… the King Who is good and does good to all…',
      },
    ],
    notes: [
      'Shabbat: insert R’tzei; Rosh Chodesh / festivals: Yaaleh Veyavo; Chanukah / Purim: Al Hanissim.',
      'Sephardic custom varies by community (e.g. opening psalms, Ya’ale v’yavo placement) — follow your family’s siddur.',
      'Recite the complete text from a licensed siddur or bentcher — this outline is a study aid.',
    ],
  },
};

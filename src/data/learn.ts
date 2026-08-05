/**
 * The Learn library — the app's edition of chabad.org's own Brachot
 * curriculum. Every lesson is a short digest of ONE article from the
 * Blessings library on chabad.org (owner directive 2026-08-05: Learn
 * content comes ONLY from chabad.org), and every card deep-links the
 * article it teaches (`sourceUrl`). This is STUDY MATERIAL, not psak;
 * the app-wide disclaimer applies.
 */

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  emoji: string;
  hook: string;
  body: string[];
  source: string;
  /** the chabad.org article this lesson digests — rendered as a tap-through link */
  sourceUrl?: string;
}

const CH = "From chabad.org's Brachot library:";

export const LESSONS: Lesson[] = [
  {
    id: 'why-bless',
    title: 'Why a Blessing?',
    minutes: 2,
    emoji: '✨',
    hook: 'A few words before the first bite turn eating into something holy.',
    body: [
      'Few activities are as instinctive as eating. Yet before putting anything in our mouths, we pause, say a few words — and that pause transforms the most everyday act into something holy: we acknowledge G-d as the source of all sustenance, recognize that the earth and everything it yields belongs to Him, and thank Him for providing it.',
      'Chassidic teaching goes further: every food contains a G-dly spark of holiness. When we say a blessing and eat with the intention of serving G-d, we elevate the food itself and reunite it with its Divine source. The six food blessings belong to the birchot hanehenin — "blessings of pleasure," said before enjoying anything of G-d\'s world.',
      'And gratitude does not end with the last bite. The Torah itself instructs: "And you shall eat and be satisfied, and you shall bless the L-rd your G-d" (Deuteronomy 8:10) — the after-blessings. At home, at work, at a celebration: a blessing lifts the meal beyond the mundane.',
    ],
    source: `${CH} "Why a Blessing?"`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/90550/jewish/Why-a-Blessing.htm',
  },
  {
    id: 'hamotzi',
    title: 'Hamotzi — the blessing over bread',
    minutes: 2,
    emoji: '🍞',
    hook: 'Bread is honored twice: a hand-washing before it, and a blessing of its own.',
    body: [
      'Bread made from the five grains identified by our sages — wheat, barley, rye, spelt, or oat — gets Hamotzi: "…Who brings forth bread from the earth." To count as bread, the dough\'s liquid must be primarily water and it must be baked. Dough enriched with more oil or juice than water (pastries), or dough that is fried or cooked (pasta), is not "bread."',
      'Bread alone carries a further honor: before eating it we ritually wash our hands — netilat yadayim. Fill a large cup, pour three times over the right hand, three times over the left, recite the washing blessing, and dry your hands thoroughly.',
      'Then one Hamotzi does heavy lifting: it covers everything eaten as part of the meal except dessert and wine — and Grace After Meals at the end covers everything you have eaten.',
    ],
    source: `${CH} "Hamotzi: Blessing Over Bread."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278542/jewish/Hamotzi-Blessing-Over-Bread.htm',
  },
  {
    id: 'mezonot',
    title: 'Mezonot — the blessing on grains',
    minutes: 2,
    emoji: '🥐',
    hook: 'Cake, crackers, cereal, pasta — grain in every form short of bread.',
    body: [
      'Food made from the five grains — wheat, barley, rye, spelt, or oat — that is not bread gets Mezonot. That includes cakes and pastries, most crackers and cereals, pasta, and cooked grain dishes like couscous and farfel.',
      'The words say why grain stands apart: "…Who creates various kinds of sustenance." Grain is how the world is fed, and the blessing names that plainly.',
      'After eating mezonot food, the after-blessing is Al Hamichyah — the "sustenance" after-blessing reserved for the five grains.',
    ],
    source: `${CH} "Mezonot: The Blessing on Grains."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278543/jewish/Mezonot-The-Blessing-on-Grains.htm',
  },
  {
    id: 'hagafen',
    title: 'Hagafen — the blessing on wine',
    minutes: 2,
    emoji: '🍷',
    hook: 'One drink in Jewish life is honored with a blessing all its own.',
    body: [
      'Wine has special significance and uses in Jewish law — so it received its own blessing: "…Who creates the fruit of the vine," said over wine and over grape juice.',
      'The honor spreads outward: once you have recited Hagafen, other drinks at that meal no longer need a blessing of their own — the wine\'s blessing covers them.',
      'Afterward comes Al Hagefen — the vine\'s own insert of the combined after-blessing, thanking for "the fruit of the vine."',
    ],
    source: `${CH} "Borei Pri Hagafen: The Blessing on Wine and Grape Juice."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278544/jewish/Borei-Pri-Hagafen-The-Blessing-on-Wine-and-Grape-Juice.htm',
  },
  {
    id: 'haetz',
    title: "Ha'etz — the blessing on fruit",
    minutes: 2,
    emoji: '🍎',
    hook: 'In halacha, a banana is not tree fruit — but an almond is.',
    body: [
      'Tree fruit gets Ha\'etz: "…Who creates the fruit of the tree." In Jewish law a fruit is something growing from a perennial tree — one that does not renew its stem each year and does not grow too close to the ground. Apples, grapes, figs, and nuts (except peanuts) all qualify.',
      'Which is why some "fruits" surprise people: strawberries, watermelon, and bananas are not tree fruit in halacha — their blessing is Ha\'adamah, the blessing on produce of the ground.',
      "After most tree fruit, say Borei Nefashot. But after grapes, figs, dates, pomegranates, or olives — the special fruits of the Land of Israel — say the upgraded after-blessing, Al Hapeirot.",
    ],
    source: `${CH} "Borei Pri Ha'etz: The Blessing on Fruits."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278545/jewish/Borei-Pri-Haetz-The-Blessing-on-Fruits.htm',
  },
  {
    id: 'haadamah',
    title: "Ha'adamah — the blessing on vegetables",
    minutes: 2,
    emoji: '🥦',
    hook: 'Everything the soil itself hands you — plus a few surprising "fruits."',
    body: [
      'Produce of the ground gets Ha\'adamah: "…Who creates the fruit of the earth." That covers vegetables, legumes, and peanuts.',
      'It also catches the "fruits" excluded from the tree blessing: melons, bananas, pineapples, and some berries. (The Hebrew pri really means "produce" — anything the earth yields.)',
      'After eating Ha\'adamah foods, the after-blessing is Borei Nefashot.',
    ],
    source: `${CH} "Borei Pri Ha'adamah: The Blessing on Vegetables."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278546/jewish/Borei-Pri-Haadamah-The-Blessing-on-Vegetables.htm',
  },
  {
    id: 'shehakol',
    title: 'Shehakol — the blessing on everything else',
    minutes: 2,
    emoji: '💧',
    hook: 'Meat, fish, eggs, water, candy — one blessing wide enough for all of it.',
    body: [
      'All foods that do not grow from the ground get Shehakol. That includes animal products — meat, chicken, fish, and eggs — water and every other drink except wine, and miscellaneous foods like mushrooms and candy.',
      'Its words are the broadest praise in the set: "…by Whose word all things came to be." One blessing that takes in the whole of creation.',
      'After eating Shehakol foods, say Borei Nefashot, the after-blessing on "other foods."',
    ],
    source: `${CH} "Shehakol: The Blessing on All Other Foods."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278547/jewish/Shehakol-The-Blessing-on-All-Other-Foods.htm',
  },
  {
    id: 'combinations',
    title: 'Combinations — order and mixtures',
    minutes: 3,
    emoji: '🥣',
    hook: 'Crackers, coleslaw, eggs: three blessings — said in a fixed order.',
    body: [
      'Several foods of one category take a single blessing — said over the preferred item, with the rest in mind. Foods from different categories each get their own blessing, in this order of priority: Mezonot, then Hagafen, Ha\'etz, Ha\'adamah, Shehakol. (Between a tree fruit and a ground food, bless whichever you prefer first.)',
      'A mixed dish follows its main food: tuna salad with vegetable bits gets the tuna\'s blessing. Grain outranks the room — a mezonot ingredient counts as the main one even in the minority, as in fruit pie or macaroni and cheese — unless the flour is only there to bind, thicken, or color.',
      'Form matters too: juices and fully ground foods generally take Shehakol, while food still recognizable and normally eaten that way — chunky applesauce — keeps its original blessing. Genuinely unsure? Eat the food inside a bread meal covered by Hamotzi, or say blessings over two other foods that cover both possibilities.',
    ],
    source: `${CH} "Blessings on Combination" — the source of this app's ordering.`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/91116/jewish/Blessings-on-Combination.htm',
  },
  {
    id: 'birkat-hamazon',
    title: 'Birkat Hamazon — Grace after bread',
    minutes: 2,
    emoji: '🙏',
    hook: 'Four blessings, four eras: Moses, Joshua, David and Solomon, the Sages.',
    body: [
      '"And you shall eat, and be sated, and bless the L-rd your G-d" (Deuteronomy 8:10). Grace After Meals is the Torah\'s own instruction — gratitude commanded precisely for the moment of satisfaction.',
      'Its four blessings carry Jewish history inside them: the first was composed by Moses when the manna came down in the desert; the second by Joshua when Israel ate the first harvest of the Land; the third by Kings David and Solomon; the fourth by the Sages in mishnaic times.',
      'The full Grace is recited only after a meal that includes bread — and it covers everything eaten during that meal.',
    ],
    source: `${CH} "Birkat Hamazon: Grace After Bread (Bentching)."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/278548/jewish/Birkat-Hamazon-Grace-After-Bread-Bentching.htm',
  },
  {
    id: 'al-hamichyah',
    title: 'Al Hamichyah — the after-blessing on special foods',
    minutes: 2,
    emoji: '🍇',
    hook: 'One after-blessing with three faces — and a love letter to the Land of Israel.',
    body: [
      'The middle tier of after-blessings has three versions: Al Hamichyah after (non-bread) food of the five grains — whatever took Mezonot before; Al Hagefen after wine or grape juice; and Al Haaretz v\'al Hapeirot after the special fruits of the Land of Israel — grapes, figs, pomegranates, olives, and dates.',
      'Ate a combination? The versions merge into one blessing — the inserts are simply combined, so grain and wine and special fruit are all thanked in a single breath.',
      'Every version thanks G-d for "the precious, good and spacious land" — these are after-blessings that thank not just for food, but for the Land of Israel itself, with extra lines added on Shabbat and the holidays.',
    ],
    source: `${CH} "Al Hamichyah: The After-Blessing on Special Foods."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/279847/jewish/Al-Hamichyah-The-After-Blessing-on-Special-Foods.htm',
  },
  {
    id: 'borei-nefashot',
    title: 'Borei Nefashot — the after-blessing on other foods',
    minutes: 2,
    emoji: '🌎',
    hook: 'The pocket-sized after-blessing that covers most of the menu.',
    body: [
      'Borei Nefashot is said after all food not made from grain or the seven special fruits of the Land of Israel: everything that took Ha\'adamah or Shehakol before — fish, meat, eggs, drinks (except wine), candy — plus ordinary tree fruit outside the special five.',
      'It is short, but its meaning is enormous: "Creator of numerous living beings and their needs, for all the things You have created with which to sustain the soul of every living being." Thanks for a world that answers every creature\'s hunger.',
      'For most everyday snacks and drinks, this is the blessing that closes the circle when you finish eating.',
    ],
    source: `${CH} "Borei Nefashot: After-Blessing on Other Foods."`,
    sourceUrl: 'https://www.chabad.org/library/article_cdo/aid/279850/jewish/Borei-Nefashot-After-Blessing-on-Other-Foods.htm',
  },
];

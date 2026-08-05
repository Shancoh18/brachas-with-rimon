/**
 * The Learn library — short, adult-toned lessons on why we say brachos.
 * Educational summaries written for this app; the underlying teachings are
 * drawn from the three approved sources (chabad.org, brachos.org,
 * oukosher.org) — each card names where to read more. This is STUDY MATERIAL,
 * not psak; the app-wide disclaimer applies.
 */

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  emoji: string;
  hook: string;
  body: string[];
  source: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'why-bless',
    title: 'Why say a bracha at all?',
    minutes: 2,
    emoji: '🌍',
    hook: 'The Talmud calls eating without a blessing "stealing" — from Whom?',
    body: [
      'The Gemara (Berachot 35a-b) teaches that the world belongs to its Creator — "the earth and all it holds is G-d\'s." A bracha is how we ask permission, so to speak, before taking anything from it. One line of gratitude converts consumption into connection.',
      'That is why the blessing comes BEFORE the first bite: it reframes the meal before it starts. You pause, name what you\'re holding and where it came from, and only then eat. It is mindfulness with a pedigree of three thousand years.',
      'The sages add a striking image: one who eats without a blessing is like someone who benefits from the sacred without redeeming it first. The bracha "redeems" the food — after those few words, it is fully yours to enjoy.',
    ],
    source: 'Read more: the Blessings section on chabad.org and the introduction at brachos.org.',
  },
  {
    id: 'six-keys',
    title: 'Six blessings, one map of the world',
    minutes: 3,
    emoji: '🗺️',
    hook: 'Bread, cake, wine, fruit, vegetables, everything else — why six?',
    body: [
      'The six brachos rishonos sort the entire edible world by how it reaches you. Bread — the staff of life, transformed by human hands — gets its own blessing, Hamotzi. Other grain foods get Mezonos. Wine, uniquely elevating, gets Hagafen.',
      'Then the tree fruits (Ha\'etz), then everything that grows from the ground (Ha\'adama), and finally Shehakol — "by Whose word all things came to be" — for meat, fish, water, and everything that fits no other category.',
      'The order is a hierarchy of specificity: the more precisely a blessing names its food, the more honored the food. This is why the app sorts your meal — saying the more specific blessing first is itself a halachic value, called kedima.',
    ],
    source: 'Read more: "Blessings on Food" on chabad.org; the OU Guide to Blessings on oukosher.org.',
  },
  {
    id: 'seven-species',
    title: 'The Seven Species of the Land',
    minutes: 2,
    emoji: '🍇',
    hook: 'Five fruits jump the queue in every fruit bowl. Here\'s why.',
    body: [
      'Devarim 8:8 praises the Land of Israel as "a land of wheat and barley, of vines, figs and pomegranates, a land of olive oil and honey [dates]." These Seven Species carry the landscape of Israel inside them.',
      'When several tree fruits are on the table, the Species come first — and among them, the order follows their closeness to the word "land" in the verse itself: olive and date first, then grape, fig, pomegranate. A verse becomes a seating chart.',
      'They also get an upgraded after-blessing: Me\'ein Shalosh ("Al Ha\'etz"), which thanks not just for fruit but for the Land itself — the only foods whose after-blessing mentions eretz chemda, the precious land.',
    ],
    source: 'Read more: "Blessings on Combination" and the Grace After Meals pages on chabad.org.',
  },
  {
    id: 'kedima',
    title: 'Kedima — why order matters',
    minutes: 2,
    emoji: '🥇',
    hook: 'Given cake and an apple, halacha has an opinion about which comes first.',
    body: [
      'When foods requiring different blessings sit before you, the blessings themselves have precedence: Mezonos, then Hagafen, then Ha\'etz, then Ha\'adama, then Shehakol. Bread outranks them all and covers the whole meal.',
      'Within a single blessing, other factors break the tie: a Seven-Species fruit beats an ordinary one; a whole item beats a cut piece (shaleim); and your favorite — the chaviv — has standing too.',
      'None of this is bureaucracy. Ordering the blessings is a way of giving the most important thanks first — the same instinct as thanking the host before the caterer.',
    ],
    source: 'Read more: "Blessings on Combination" on chabad.org (the source of the app\'s ordering).',
  },
  {
    id: 'after-brachos',
    title: 'The after-blessing: gratitude on a full stomach',
    minutes: 3,
    emoji: '🙏',
    hook: '"You will eat, be satisfied — and bless." The Torah\'s only explicit food commandment is AFTER the meal.',
    body: [
      'Thanking before you eat is rabbinic wisdom; thanking after you\'ve eaten is written in the Torah itself (Devarim 8:10). It is easy to be grateful when hungry and forgetful when full — so the Torah legislates gratitude precisely for the moment satisfaction sets in.',
      'Bread gets the full Birkat Hamazon. Grain foods, wine, and the Seven-Species fruits get Me\'ein Shalosh — one blessing whose inserts combine. Everything else gets the short, complete Borei Nefashos.',
      'The shiur matters: an after-blessing is only said if you ate a kezayis (an olive\'s volume) within about four minutes, or drank a revi\'is. Less than that — the gratitude stays in your heart, not in a formula.',
    ],
    source: 'Read more: "Laws of Blessings After Eating" on chabad.org; the shiurim notes on brachos.org.',
  },
  {
    id: 'ikar-tafel',
    title: 'Mixtures: the main thing and the passenger',
    minutes: 2,
    emoji: '🥣',
    hook: 'One bowl, five ingredients — usually just one blessing.',
    body: [
      'Halacha resolves mixtures with a principle called ikar v\'tafel: the blessing follows the main component (ikar), and the secondary one (tafel) rides along, exempt.',
      'The five grains hold a special status — if grain is there for taste or substance, it becomes the ikar automatically, even as a minority. Rice does not get that privilege.',
      'But two clearly independent components each want their own blessing: spaghetti AND meatballs, the wafer AND the ice cream. When each is desired for itself, each is thanked for itself.',
    ],
    source: 'Read more: the mixtures (ikar/tafel) pages on brachos.org and the OU Guide to Blessings.',
  },
  {
    id: 'hundred',
    title: 'A hundred blessings a day',
    minutes: 2,
    emoji: '💯',
    hook: 'King David instituted a daily count. The target: one hundred.',
    body: [
      'The Gemara (Menachot 43b) records a practice of saying one hundred brachos every day — attributed to King David in response to a plague. The daily liturgy carries most of them; food brachos help close the gap, especially on Shabbat.',
      'A hundred sounds enormous until you realize what it does: it means noticing — a hundred times a day — that something reached you that you did not create. Coffee. Rain. Bread. Waking up.',
      'This is the spirit of your streak in this app: not a score, but a practice of paying attention. The number is a byproduct.',
    ],
    source: 'Read more: the daily blessings articles on chabad.org.',
  },
  {
    id: 'amen',
    title: 'What your friends have to do with it',
    minutes: 2,
    emoji: '👥',
    hook: 'A bracha said alone is complete. A bracha answered is multiplied.',
    body: [
      'Answering "Amen" to someone else\'s blessing is itself a mitzvah — the listener joins the blessing and, the sages say, receives reward comparable to the one who said it.',
      'That is why eating together matters in halacha: three who eat bread together form a zimmun and invite each other to bless; larger groups elevate the formula further. Gratitude, it turns out, is designed to be social.',
      'Sharing your bracha practice with friends — gently, without competition for its own sake — echoes something old: blessings were always meant to be heard.',
    ],
    source: 'Read more: the Birkat Hamazon and zimmun pages on chabad.org.',
  },
];

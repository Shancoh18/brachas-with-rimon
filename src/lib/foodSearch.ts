/**
 * Food search — aliasing, Hebrew, and typo tolerance for the manual-add box.
 *
 * SCOPE: this file affects FINDING a food, never its halacha. Every alias here
 * points at an existing key in the vetted database; the bracha, order, and
 * after-blessing still come only from src/data/foods.ts (see CLAUDE.md's
 * absolute rule). Adding an alias can never change a ruling — at worst it
 * surfaces the wrong entry, so aliases must be exact synonyms of their target.
 *
 * Three layers on top of the raw alias list:
 *  1. NORMALIZE — case, accents (crème → creme), and Hebrew nikud are folded,
 *     so "MATZAH", "matzá" and "מַצָּה" all reduce to a comparable form.
 *  2. ALIASES — Hebrew names + regional/spelling variants (aubergine→eggplant,
 *     biscuit→cookie, יין→wine). Searching in Hebrew is a first-class path.
 *  3. FUZZY — a one- or two-character typo still finds the food ("bannana",
 *     "avacado", "pomegranite"), but only after exact matches are exhausted so
 *     precise queries never get polluted.
 */
import type { FoodEntry } from '../data/foods';

/** Fold case, accents, and Hebrew vowel points; collapse punctuation to space. */
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    // \u escapes (not literal combining chars) so the file survives any
    // re-encoding — a mojibaked class here would silently stop folding nikud
    .replace(/[̀-ͯ]/g, '') // latin combining accents
    .replace(/[֑-ׇ]/g, '') // Hebrew nikud + cantillation
    .replace(/['’`]/g, '') // don't let apostrophes split words
    .replace(/[^a-z0-9א-ת]+/g, ' ') // keep latin + Hebrew letters
    .trim();

/**
 * Extra search names per food key. Hebrew first, then regional/spelling
 * variants that the vetted `names` list doesn't already carry.
 * Every key below exists in FOODS — a stale key would silently do nothing,
 * so `verifyAliasKeys` (used by the test) asserts they all resolve.
 */
export const SEARCH_ALIASES: Record<string, string[]> = {
  // ---------------------------------------------------------------- breads
  bread: ['לחם', 'pas', 'wholemeal bread'],
  challah: ['חלה', 'hallah', 'khala', 'chala', 'kitke'],
  pita: ['פיתה', 'pitta', 'pocket bread'],
  matzah: ['מצה', 'matzoh', 'matzos', 'matzot', 'unleavened bread'],
  bagel: ['בייגל', 'beigel'],
  roll: ['לחמניה', 'lachmania', 'baguette', 'sub roll'],
  pizza: ['פיצה'],
  'corn-bread': ['cornbread'],
  croissant: ['קרואסון', 'rugelach croissant'],

  // ---------------------------------------------------------------- grains
  cake: ['עוגה', 'ugah', 'gateau', 'torte'],
  cookies: ['עוגיות', 'עוגייה', 'ugiyot', 'biscuits', 'shortbread'],
  crackers: ['קרקר', 'crispbread', 'water biscuit'],
  pretzels: ['בייגלה', 'beigaleh'],
  pasta: ['פסטה', 'אטריות', 'itriyot', 'fusilli', 'rigatoni', 'fettuccine', 'linguine', 'orzo'],
  couscous: ['קוסקוס'],
  oatmeal: ['קוואקר', 'שיבולת שועל', 'quaker', 'porridge oats', 'overnight oats'],
  rice: ['אורז', 'orez', 'basmati', 'jasmine rice', 'risotto'],
  kneidlach: ['קניידלך', 'knaidel', 'kneidel'],
  sushi: ['סושי'],
  ptitim: ['פתיתים', 'israeli couscous', 'ben gurion rice'],
  bourekas: ['בורקס', 'boureka', 'borekas', 'burekas'],
  babka: ['בבקה', 'kranz cake'],
  hamantaschen: ['אוזני המן', 'oznei haman', 'hamantash', 'hamentashen'],
  kreplach: ['קרעפלאך', 'kreplech'],
  'lokshen-kugel': ['לוקשן קוגל', 'noodle pudding'],
  'noodle-kugel': ['קוגל', 'kugel'],
  pancakes: ['פנקייק', 'pancake', 'flapjacks', 'blintzes'],
  crepes: ['קרפ', 'crepe', 'blintz'],
  waffles: ['וופל', 'waffle'],
  doughnut: ['סופגניה', 'sufganiyah', 'sufganiyot', 'donut', 'jelly donut'],
  quinoa: ['קינואה'],
  popcorn: ['פופקורן'],
  farfel: ['פארפל'],
  kasha: ['קאשה', 'buckwheat'],

  // ------------------------------------------------------------ wine/grape
  wine: ['יין', 'yayin', 'merlot', 'cabernet', 'chardonnay'],
  grape_juice: ['מיץ ענבים', 'mitz anavim'],
  champagne: ['שמפניה'],

  // -------------------------------------------------------- seven species
  grapes: ['ענבים', 'ענב', 'anavim', 'sultanas'],
  fig: ['תאנה', 'תאנים', 'teena'],
  pomegranate: ['רימון', 'רימונים', 'rimon', 'pomegranite', 'pomegranet'],
  olive: ['זית', 'זיתים', 'zayit', 'zeitim'],
  date: ['תמר', 'תמרים', 'tamar', 'medjoul', 'silan dates'],

  // ------------------------------------------------------------ tree fruit
  apple: ['תפוח', 'תפוחים', 'tapuach', 'granny smith', 'gala apple', 'honeycrisp'],
  pear: ['אגס', 'agas'],
  apricot: ['משמש', 'mishmish'],
  cherry: ['דובדבן', 'duvdevan', 'cherries'],
  peach: ['אפרסק', 'afarsek', 'nectarine'],
  plum: ['שזיף', 'shezif', 'prune', 'prunes'],
  orange: ['תפוז', 'tapuz', 'mandarin', 'tangerine'],
  clementine: ['קלמנטינה'],
  grapefruit: ['אשכולית', 'eshkolit'],
  lemon_fruit: ['לימון', 'limon', 'lime'],
  mango: ['מנגו'],
  avocado: ['אבוקדו', 'avacado', 'avocados'],
  banana: ['בננה', 'bananas', 'bannana'],
  melon: ['מלון', 'cantaloupe', 'honeydew'],
  watermelon: ['אבטיח', 'avatiach'],
  strawberry: ['תות', 'תותים', 'tut', 'strawberries'],
  blueberry: ['אוכמניות', 'blueberries'],
  blackberry: ['פטל', 'blackberries'],
  pineapple: ['אננס', 'ananas'],
  kiwi: ['קיווי'],
  persimmon: ['אפרסמון', 'sharon fruit'],
  papaya: ['פפאיה'],
  coconut: ['קוקוס'],
  'dried-fruit': ['פירות יבשים', 'dried fruits'],

  // ----------------------------------------------------------------- nuts
  almond: ['שקד', 'שקדים', 'shaked', 'almonds'],
  walnut: ['אגוז מלך', 'walnuts', 'egoz'],
  cashew: ['קשיו', 'cashews'],
  peanut: ['בוטן', 'בוטנים', 'botnim', 'peanuts', 'groundnut'],
  pistachio: ['פיסטוק', 'pistachios'],
  hazelnut: ['אגוז לוז', 'hazelnuts', 'filbert'],
  chestnut: ['ערמונים', 'chestnuts'],
  'pumpkin-seeds': ['גרעינים', 'garinim', 'pepitas', 'sunflower seeds'],

  // ------------------------------------------------------------- vegetables
  potato: ['תפוח אדמה', 'תפוד', 'tapuach adama', 'spud', 'baked potato'],
  'potato-chips': ['ציפס', 'crisps'],
  mashed_potato: ['פירה', 'puree', 'mash'],
  carrot: ['גזר', 'gezer', 'carrots'],
  tomato: ['עגבניה', 'עגבנייה', 'עגבניות', 'agvania'],
  cucumber: ['מלפפון', 'melafefon', 'pickle', 'pickles', 'gherkin'],
  onion: ['בצל', 'batzal', 'onions'],
  garlic: ['שום', 'shum'],
  pepper_veg: ['פלפל', 'gamba', 'bell pepper', 'capsicum'],
  lettuce: ['חסה', 'chasa', 'romaine'],
  cabbage: ['כרוב', 'kruv', 'coleslaw'],
  corn: ['תירס', 'tiras', 'sweetcorn', 'maize'],
  peas: ['אפונה', 'afuna'],
  beans: ['שעועית', 'sheuit'],
  eggplant: ['חציל', 'chatzil', 'aubergine'],
  squash: ['קישוא', 'דלעת', 'courgette', 'zucchini', 'marrow'],
  mushroom: ['פטריה', 'פטריות', 'pitriyot', 'mushrooms'],
  broccoli: ['ברוקולי'],
  cauliflower: ['כרובית', 'kruvit'],
  spinach: ['תרד', 'tered'],
  celery: ['סלרי'],
  beet: ['סלק', 'selek', 'beetroot'],
  beets: ['סלק', 'beetroot'],
  radish: ['צנון', 'צנונית'],
  scallion: ['בצל ירוק', 'spring onion', 'green onion'],
  sweet_potato: ['בטטה', 'batata', 'yam'],
  artichoke: ['ארטישוק'],
  asparagus: ['אספרגוס'],
  'green-beans': ['שעועית ירוקה'],
  ginger: ['ג׳ינג׳ר', 'זנגביל'],
  'hearts-of-palm': ['לב דקל'],

  // ------------------------------------------------------- protein & dairy
  meat: ['בשר', 'basar', 'steak', 'beef', 'lamb', 'brisket'],
  chicken: ['עוף', 'ohf', 'turkey', 'schnitzel', 'שניצל'],
  fish: ['דג', 'דגים', 'dag', 'dagim', 'salmon', 'סלמון', 'tilapia'],
  egg: ['ביצה', 'ביצים', 'beitza', 'beitzim', 'omelette', 'omelet', 'scrambled eggs'],
  cheese: ['גבינה', 'gvina', 'cheddar', 'mozzarella', 'cottage cheese'],
  milk: ['חלב', 'chalav'],
  yogurt: ['יוגורט', 'yoghurt', 'greek yogurt'],
  butter: ['חמאה', 'chemah'],
  'sour-cream': ['שמנת חמוצה', 'smetana'],
  'feta-cheese': ['פטה', 'bulgarian cheese'],
  tofu: ['טופו'],
  sardines: ['סרדינים'],
  'hot-dog': ['נקניקיה', 'naknikiya', 'frankfurter', 'wiener'],
  shawarma: ['שווארמה', 'shwarma', 'shwarema'],

  // ------------------------------------------------------------- beverages
  water: ['מים', 'mayim', 'still water', 'mineral water'],
  seltzer: ['סודה', 'soda water', 'club soda', 'sparkling water', 'fizzy water'],
  soda: ['משקה מוגז', 'cola', 'coke', 'pepsi', 'sprite', 'fanta', 'pop', 'fizzy drink', 'soft drink'],
  coffee: ['קפה', 'cafe', 'espresso', 'cappuccino', 'latte', 'americano', 'nes'],
  tea: ['תה', 'chai', 'herbal tea', 'green tea'],
  orange_juice: ['מיץ תפוזים', 'oj'],
  apple_juice: ['מיץ תפוחים'],
  lemonade: ['לימונדה'],
  smoothie: ['שייק', 'shake', 'milkshake'],
  beer: ['בירה'],
  'almond-milk': ['חלב שקדים'],
  'soy-milk': ['חלב סויה'],
  'oat-milk': ['חלב שיבולת שועל'],
  'energy-drink': ['משקה אנרגיה', 'red bull'],
  'ginger-ale': ['ג׳ינג׳ר אייל'],
  'coconut-water': ['מי קוקוס'],

  // ---------------------------------------------------------------- sweets
  chocolate: ['שוקולד', 'shokolad', 'chocolate bar'],
  candy: ['ממתק', 'סוכריה', 'sukariya', 'sweets', 'lollies', 'gummies', 'lollipop'],
  ice_cream: ['גלידה', 'glida', 'gelato'],
  honey: ['דבש', 'dvash'],
  sugar: ['סוכר', 'sukar'],
  halva: ['חלבה'],
  halvah: ['חלבה'],
  jam: ['ריבה', 'riba', 'preserve'],
  jello: ['ג׳לי', 'jelly dessert'],
  pudding: ['פודינג', 'מעדן'],
  'cotton-candy': ['צמר גפן מתוק', 'candy floss'],
  licorice: ['ליקריץ', 'liquorice'],
  marzipan: ['מרציפן'],
  'peanut-butter': ['חמאת בוטנים'],
  cheesecake: ['עוגת גבינה'],
  'apple-pie': ['עוגת תפוחים'],

  // ----------------------------------------------------------------- soups
  chicken_soup: ['מרק עוף', 'marak of', 'jewish penicillin'],
  veg_soup: ['מרק ירקות', 'marak yerakot', 'vegetable soup'],
  borscht: ['בורשט', 'borsht'],
  'lentil-soup': ['מרק עדשים'],
  'onion-soup': ['מרק בצל'],
  'mushroom-soup': ['מרק פטריות'],
  'tomato-soup': ['מרק עגבניות'],
  'barley-soup': ['מרק שעורה'],

  // ----------------------------------------------------------------- other
  'potato-salad': ['סלט תפוחי אדמה'],
  applesauce: ['רסק תפוחים'],
  tzimmes: ['צימעס', 'tsimmes'],
  kishka: ['קישקע', 'stuffed derma'],
  kishke: ['קישקע'],
};

/** Damerau-light Levenshtein, capped — we only ever ask "is it ≤ max?". */
const editDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1; // whole row already too far — bail early
    prev = cur;
  }
  return prev[b.length];
};

/** Typo budget: none for very short words (too many false hits), 1 for
 *  ordinary words, 2 for long ones where a double slip is common. */
const typoBudget = (token: string) => (token.length < 4 ? 0 : token.length < 8 ? 1 : 2);

/** Every searchable name for an entry: its vetted aliases + our search extras. */
export const searchNames = (f: FoodEntry): string[] => [
  ...f.names,
  ...(SEARCH_ALIASES[f.key] ?? []),
];

/** Exposed for the test: catch aliases whose key no longer exists. */
export const verifyAliasKeys = (foods: FoodEntry[]): string[] => {
  const keys = new Set(foods.map((f) => f.key));
  return Object.keys(SEARCH_ALIASES).filter((k) => !keys.has(k));
};

/**
 * Rank matches for `query`. Lower score = better:
 *   0 exact name · 1 name starts with query · 2 a word in a name starts with a
 *   token · 3 every token appears somewhere · 4 fuzzy (typo) match.
 * Fuzzy candidates are only consulted when nothing matched exactly, so a
 * precise query is never diluted.
 */
export function searchFoods(query: string, foods: FoodEntry[], limit = 9): FoodEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);

  const scored: { f: FoodEntry; score: number; len: number }[] = [];
  // fuzzy hits also carry HOW close they were and WHICH name matched, so
  // "choclate" prefers chocolate (typo of its primary name) over cake (whose
  // secondary alias happens to be "chocolate cake")
  const fuzzy: { f: FoodEntry; dist: number; nameIdx: number; len: number }[] = [];

  for (const f of foods) {
    const names = searchNames(f).map(normalize);
    const key = normalize(f.key);
    const hit = tokens.every((t) => names.some((n) => n.includes(t)) || key.includes(t));
    if (hit) {
      let score = 3;
      if (names.some((n) => n === q)) score = 0;
      else if (names.some((n) => n.startsWith(q))) score = 1;
      else if (names.some((n) => n.split(' ').some((w) => tokens.some((t) => w.startsWith(t))))) score = 2;
      scored.push({ f, score, len: f.names[0].length });
      continue;
    }
    // typo path — every query token must land within its budget of some word
    let worst = 0; // the hardest-won token decides the entry's distance
    let bestIdx = Number.MAX_SAFE_INTEGER;
    const near = tokens.every((t) => {
      const budget = typoBudget(t);
      if (!budget) return false;
      let tokenBest = budget + 1;
      let tokenIdx = Number.MAX_SAFE_INTEGER;
      names.forEach((n, i) => {
        for (const w of n.split(' ')) {
          const d = editDistance(t, w, budget);
          if (d < tokenBest || (d === tokenBest && i < tokenIdx)) {
            if (d <= budget) { tokenBest = d; tokenIdx = i; }
          }
        }
      });
      if (tokenBest > budget) return false;
      worst = Math.max(worst, tokenBest);
      bestIdx = Math.min(bestIdx, tokenIdx);
      return true;
    });
    if (near) fuzzy.push({ f, dist: worst, nameIdx: bestIdx, len: f.names[0].length });
  }

  if (scored.length) {
    return scored
      .sort((a, b) => a.score - b.score || a.len - b.len)
      .map((x) => x.f)
      .slice(0, limit);
  }
  return fuzzy
    .sort((a, b) => a.dist - b.dist || a.nameIdx - b.nameIdx || a.len - b.len)
    .map((x) => x.f)
    .slice(0, limit);
}

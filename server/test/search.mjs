/**
 * Food-search assertions — runs the REAL src/lib/foodSearch.ts against the REAL
 * src/data/foods.ts (both stripped of TS types on the fly by node's type
 * stripping, so there is no second copy of the logic to drift).
 *
 * Guards three things:
 *   1. every SEARCH_ALIASES key still exists in FOODS (a renamed key would
 *      silently disable that food's aliases),
 *   2. no alias points at the WRONG food (each expectation below names the key
 *      the query must return first),
 *   3. Hebrew, nikud, accents, and typos all resolve.
 *
 * Run: node server/test/search.mjs   (wired into scripts/preflight.mjs)
 */
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { FOODS } = await import(pathToFileURL(join(ROOT, 'src', 'data', 'foods.ts')).href);
const { searchFoods, verifyAliasKeys, normalize } = await import(
  pathToFileURL(join(ROOT, 'src', 'lib', 'foodSearch.ts')).href
);

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// ------------------------------------------------------------ alias integrity
const stale = verifyAliasKeys(FOODS);
check('every SEARCH_ALIASES key exists in FOODS', stale.length === 0, stale.join(', '));

// ------------------------------------------------------------- normalization
check('nikud is folded', normalize('מַצָּה') === normalize('מצה'), `${normalize('מַצָּה')} vs ${normalize('מצה')}`);
check('latin accents are folded', normalize('crème') === 'creme');
check('apostrophes do not split words', normalize("ma'amoul") === 'maamoul');

// --------------------------------------------------------------- expectations
// [query, expected top key, label]
const CASES = [
  // Hebrew — the headline feature
  ['לחם', 'bread', 'Hebrew: bread'],
  ['חלה', 'challah', 'Hebrew: challah'],
  ['מצה', 'matzah', 'Hebrew: matzah'],
  ['יין', 'wine', 'Hebrew: wine'],
  ['תפוח', 'apple', 'Hebrew: apple'],
  ['בננה', 'banana', 'Hebrew: banana'],
  ['עוגה', 'cake', 'Hebrew: cake'],
  ['ביצה', 'egg', 'Hebrew: egg'],
  ['גבינה', 'cheese', 'Hebrew: cheese'],
  ['מים', 'water', 'Hebrew: water'],
  ['קפה', 'coffee', 'Hebrew: coffee'],
  ['שוקולד', 'chocolate', 'Hebrew: chocolate'],
  ['גלידה', 'ice_cream', 'Hebrew: ice cream'],
  ['אורז', 'rice', 'Hebrew: rice'],
  ['עוף', 'chicken', 'Hebrew: chicken'],
  ['מַצָּה', 'matzah', 'Hebrew WITH nikud: matzah'],
  ['סופגניה', 'doughnut', 'Hebrew: sufganiyah'],
  ['בורקס', 'bourekas', 'Hebrew: bourekas'],
  // regional / spelling variants
  ['aubergine', 'eggplant', 'British: aubergine'],
  ['courgette', 'squash', 'British: courgette'],
  ['biscuit', 'cookies', 'British: biscuit'],
  ['crisps', 'potato-chips', 'British: crisps'],
  ['yoghurt', 'yogurt', 'spelling: yoghurt'],
  ['matzo', 'matzah', 'spelling: matzo'],
  ['hallah', 'challah', 'spelling: hallah'],
  ['donut', 'doughnut', 'spelling: donut'],
  ['coke', 'soda', 'brand-ish: coke'],
  ['sparkling water', 'seltzer', 'phrase: sparkling water'],
  ['oznei haman', 'hamantaschen', 'transliteration: oznei haman'],
  ['sufganiyot', 'doughnut', 'transliteration: sufganiyot'],
  ['spring onion', 'scallion', 'British: spring onion'],
  // typo tolerance
  ['bannana', 'banana', 'typo: bannana'],
  ['avacado', 'avocado', 'typo: avacado'],
  ['pomegranite', 'pomegranate', 'typo: pomegranite'],
  ['choclate', 'chocolate', 'typo: choclate'],
  ['cucumbr', 'cucumber', 'typo: cucumbr'],
  // precision — exact queries must NOT be diluted by fuzzy matches
  ['apple', 'apple', 'exact still wins: apple'],
  ['wine', 'wine', 'exact still wins: wine'],
  ['rice', 'rice', 'exact still wins: rice'],
];

for (const [q, expected, label] of CASES) {
  const top = searchFoods(q, FOODS, 5)[0];
  check(label, top?.key === expected, `got ${top?.key ?? 'nothing'}${top?.key === expected ? '' : ` (want ${expected})`}`);
}

// a nonsense query must return nothing rather than a random fuzzy hit
check('gibberish returns no matches', searchFoods('zzzqqxvw', FOODS, 5).length === 0);
// single letters must not spray the whole DB through the typo path
check('single letter does not fuzzy-explode', searchFoods('q', FOODS, 50).length < 20, `${searchFoods('q', FOODS, 50).length} results`);

console.log(failures === 0 ? '\nSEARCH: ALL PASS' : `\nSEARCH: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

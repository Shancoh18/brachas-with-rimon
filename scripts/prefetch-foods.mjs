/**
 * Batch pre-research common foods so users rarely meet "unknown food".
 *
 * Feeds a curated list to the server's /api/admin/research, which uses the SAME
 * researchFood path as the live flow: web_search hard-limited to chabad.org,
 * brachos.org, and oukosher.org, validated against the bracha enums, and stored
 * with the citing URL. No ruling ever comes from the model's own knowledge.
 *
 *   node scripts/prefetch-foods.mjs --dry        # research + print, persist NOTHING
 *   node scripts/prefetch-foods.mjs              # persist what it learns
 *   node scripts/prefetch-foods.mjs --limit 24   # only the first N candidates
 *
 * Candidates already covered by the local DB (including via the new Hebrew /
 * synonym aliases) are filtered out here, so we never spend a call on a food
 * the app can already find.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://brachas-rimon-api-production-46ae.up.railway.app';

/** Common groceries, brands, and dishes worth knowing before a user asks. */
export const CANDIDATES = [
  // breakfast + cereal aisle
  'frosted flakes cereal', 'lucky charms cereal', 'raisin bran crunch', 'cream of wheat',
  'grits', 'english muffin', 'french bread', 'brioche', 'focaccia',
  // NOTE: bare "tortilla" and "bagel chips" were removed after a dry run —
  // "tortilla" is ambiguous (corn = shehakol vs flour = mezonos) and bagel
  // chips came back citing an unrelated page. Ambiguous names must stay OUT:
  // the live flow can research the specific thing a user actually photographs.
  'corn tortilla', 'flour tortilla', 'taco shell', 'naan bread', 'pretzel roll',
  // grains + sides
  'bulgur', 'farro', 'polenta', 'grits casserole', 'rice noodles', 'soba noodles',
  'udon noodles', 'gnocchi', 'ravioli', 'tortellini', 'pierogi', 'stuffing',
  'falafel', 'shakshuka', 'malawach', 'jachnun', 'sabich', 'laffa wrap',
  // dairy + protein
  'cream cheese', 'ricotta', 'halloumi', 'labneh', 'kefir', 'skyr',
  'turkey breast', 'pastrami', 'corned beef', 'salami', 'brisket', 'meatballs',
  'gefilte fish', 'lox', 'smoked salmon', 'herring', 'whitefish salad', 'tuna steak',
  'veggie burger', 'seitan', 'tempeh', 'edamame', 'falafel ball',
  // produce not yet covered
  'nectarine', 'apricot dried', 'lychee', 'passion fruit', 'guava', 'starfruit',
  'cherimoya', 'plantain', 'jackfruit', 'pomelo', 'kumquat', 'blood orange',
  'butternut squash', 'acorn squash', 'okra', 'leek', 'fennel', 'kohlrabi',
  'bok choy', 'kale', 'swiss chard', 'arugula', 'watercress', 'endive',
  'jicama', 'daikon', 'rutabaga', 'shallot', 'chives', 'bean sprouts',
  'snap peas', 'snow peas', 'lima beans', 'black beans', 'chickpeas', 'lentils',
  // snacks + sweets
  'granola cluster', 'trail mix', 'protein bar', 'rice crispy treat', 'nutella',
  'tahini', 'hummus', 'baba ganoush', 'guacamole', 'salsa', 'pesto',
  'marshmallow', 'nougat', 'toffee', 'praline', 'truffle chocolate', 'macaron',
  'biscotti', 'wafer', 'shortbread cookie', 'gingerbread', 'churro', 'funnel cake',
  'sorbet', 'frozen yogurt', 'popsicle', 'italian ice', 'milkshake',
  'apple chips', 'banana chips', 'veggie straws', 'pita chips', 'crouton',
  // drinks
  'iced coffee', 'iced tea', 'hot chocolate', 'chai latte', 'matcha latte',
  'kombucha', 'sparkling juice', 'coconut milk drink', 'rice milk', 'cashew milk',
  'vitamin water', 'flavored seltzer', 'root beer', 'cream soda', 'tonic water',
  'arak', 'vodka', 'rum', 'tequila', 'hard cider', 'mead',
  // condiments + misc
  'ketchup', 'mustard', 'mayonnaise', 'soy sauce', 'vinegar', 'olive oil',
  'maple syrup', 'silan date syrup', 'apple butter', 'cream of mushroom soup',
  'matzah meal', 'breadcrumbs', 'gravy', 'cholent', 'kubbeh', 'majadra',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

// ---- filter out anything the app can ALREADY find (saves calls + noise)
const { FOODS } = await import(pathToFileURL(join(ROOT, 'src', 'data', 'foods.ts')).href);
const { searchFoods } = await import(pathToFileURL(join(ROOT, 'src', 'lib', 'foodSearch.ts')).href);
const covered = [];
const todo = [];
for (const c of CANDIDATES) {
  const top = searchFoods(c, FOODS, 1)[0];
  // treat as covered only on a confident hit: the food's own names contain a
  // query word (a fuzzy neighbour like "kale"→"cake" must NOT count)
  const words = c.toLowerCase().split(/\s+/);
  const isCovered =
    top && top.names.some((n) => words.some((w) => w.length > 3 && n.toLowerCase().includes(w)));
  (isCovered ? covered : todo).push(c);
}
console.log(`${CANDIDATES.length} candidates → ${covered.length} already covered, ${todo.length} to research`);

const queue = todo.slice(0, Number.isFinite(limit) ? limit : todo.length);
if (!queue.length) {
  console.log('nothing to do');
  process.exit(0);
}

const secret = (readFileSync(join(ROOT, '..', 'group-app-ad', '.env'), 'utf8')
  .match(/^BRACHA_BROADCAST_KEY=(.*)$/m)?.[1] ?? '').trim().replace(/^"|"$/g, '');
if (!secret) {
  console.error('BRACHA_BROADCAST_KEY missing from group-app-ad/.env');
  process.exit(2);
}

// server caps a request at 12 foods; go in batches, sequentially (each food is
// a web-search + model call — parallel batches would just hit rate limits)
const learned = [], skipped = [], failed = [];
for (let i = 0; i < queue.length; i += 12) {
  const batch = queue.slice(i, i + 12);
  process.stdout.write(`batch ${Math.floor(i / 12) + 1}/${Math.ceil(queue.length / 12)} (${batch.length}) … `);
  try {
    const res = await fetch(`${API}/api/admin/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, foods: batch, dryRun }),
    });
    if (!res.ok) { console.log(`HTTP ${res.status}`); continue; }
    const r = await res.json();
    learned.push(...r.learned); skipped.push(...r.skipped); failed.push(...r.failed);
    console.log(`+${r.learned.length} learned, ${r.skipped.length} known, ${r.failed.length} no-ruling`);
  } catch (e) {
    console.log(`error: ${e.message}`);
  }
}

// keep a reviewable record — a ruling shown to users deserves an audit trail
const stamp = new Date().toISOString().slice(0, 10);
const outFile = join(ROOT, `FOOD-PREFETCH-${stamp}${dryRun ? '-DRYRUN' : ''}.json`);
writeFileSync(outFile, JSON.stringify({ ranAt: new Date().toISOString(), dryRun, learned, skipped, failed }, null, 2));

console.log(`\n=== ${dryRun ? 'DRY RUN — nothing persisted' : 'PERSISTED'} ===`);
for (const l of learned) console.log(`  ${l.desc.padEnd(26)} → ${l.key.padEnd(22)} ${l.rishona}/${l.achrona}  ${l.source}`);
if (failed.length) {
  console.log('\nno ruling found on the approved sites (left for the live flow):');
  for (const f of failed) console.log(`  ${f.desc} — ${f.why}`);
}
console.log(`\nlearned ${learned.length} · already known ${skipped.length} · no ruling ${failed.length}`);

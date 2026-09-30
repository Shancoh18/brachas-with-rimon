/**
 * Before-blessing (kedima) assertions — runs the REAL src/lib/kedima.ts
 * against REAL src/data/foods.ts entries (node type-stripping, so there is no
 * second copy of the logic to drift).
 *
 * 1. Recitation order: Hamotzi < Mezonos < Hagafen < Ha'etz < Ha'adama <
 *    Shehakol; within Ha'etz, Shivas Haminim in verse order olive < date <
 *    grape < fig < pomegranate; then whole-over-cut; then chaviv.
 * 2. Hamotzi exemption: bread covers everything except wine (unchanged).
 * 3. Hagafen exemption: wine/grape juice covers the other DRINKS — chabad.org
 *    "Blessings on Combination": "After saying the blessing borai pri hagafen
 *    over wine, additional blessings before and after other liquids or drinks
 *    are not necessary." The guide once said wine "covers your other drinks"
 *    and then asked for a separate Shehakol on the water anyway.
 *
 * Run: node --experimental-strip-types server/test/brachos.mjs
 * (wired into scripts/preflight.mjs)
 */
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (...p) => import(pathToFileURL(join(ROOT, ...p)).href);
const { groupForRecitation, kedimaSort } = await imp('src', 'lib', 'kedima.ts');
const { FOOD_BY_KEY } = await imp('src', 'data', 'foods.ts');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

/** a meal item built the way Guide.tsx builds its grouping input */
const food = (key, extra = {}) => {
  const e = FOOD_BY_KEY[key];
  if (!e) throw new Error(`fixture food "${key}" is not in foods.ts`);
  return { id: extra.id ?? key, label: key, bracha: e.brachaRishona, shivaKey: e.shivaKey, isDrink: e.isDrink, ...extra };
};
/** "Hagafen[wine,water] · Shehakol[chocolate]" — readable failure detail */
const show = (groups) => groups.map((g) => `${g.bracha}[${g.covered.map((c) => c.id).join(',')}]`).join(' · ');
const brachos = (groups) => groups.map((g) => g.bracha).join(',');
const ids = (list) => list.map((c) => c.id).join(',');

// ------------------------------------------------------- fixture DB facts
for (const k of ['water', 'seltzer', 'soda', 'coffee']) {
  check(`fixture: ${k} is a Shehakol drink in foods.ts`, FOOD_BY_KEY[k]?.brachaRishona === 'Shehakol' && FOOD_BY_KEY[k]?.isDrink === true);
}
check('fixture: chocolate is a Shehakol FOOD (not a drink)', FOOD_BY_KEY.chocolate?.brachaRishona === 'Shehakol' && !FOOD_BY_KEY.chocolate?.isDrink);
check('fixture: wine + grape juice are Hagafen', FOOD_BY_KEY.wine?.brachaRishona === 'Hagafen' && FOOD_BY_KEY.grape_juice?.brachaRishona === 'Hagafen');

// ------------------------------------------------------- Hagafen covers drinks
{
  const g = groupForRecitation([food('water'), food('wine')]);
  check('wine + water → ONE Hagafen, over the wine, covering the water',
    brachos(g) === 'Hagafen' && g[0].representative.id === 'wine' && ids(g[0].covered) === 'wine,water', show(g));
}
{
  const g = groupForRecitation([food('wine'), food('seltzer')]);
  check('wine + seltzer → ONE Hagafen covering the seltzer', brachos(g) === 'Hagafen' && ids(g[0].covered) === 'wine,seltzer', show(g));
}
{
  const g = groupForRecitation([food('soda'), food('cookies'), food('grape_juice')]);
  check('grape juice + soda + cookies → Mezonos, then Hagafen covering the soda — no Shehakol',
    brachos(g) === 'Mezonos,Hagafen' && ids(g[1].covered) === 'grape_juice,soda' && g[1].representative.id === 'grape_juice', show(g));
}
{
  const g = groupForRecitation([food('coffee'), food('wine'), food('cake')]);
  check('wine + cake + coffee → Mezonos, then Hagafen covering the coffee',
    brachos(g) === 'Mezonos,Hagafen' && ids(g[0].covered) === 'cake' && ids(g[1].covered) === 'wine,coffee', show(g));
}
{
  const g = groupForRecitation([food('chocolate'), food('wine')]);
  check('wine + chocolate (a Shehakol FOOD) → Hagafen, then its own Shehakol',
    brachos(g) === 'Hagafen,Shehakol' && ids(g[0].covered) === 'wine' && ids(g[1].covered) === 'chocolate', show(g));
}
{
  const g = groupForRecitation([food('chocolate'), food('water'), food('wine')]);
  check('wine + water + chocolate → the water folds into Hagafen, the chocolate keeps Shehakol',
    brachos(g) === 'Hagafen,Shehakol' && ids(g[0].covered) === 'wine,water' && ids(g[1].covered) === 'chocolate', show(g));
}
{
  const g = groupForRecitation([food('water', { chaviv: true, whole: true }), food('wine')]);
  check('a chaviv drink still says Hagafen over the wine (blessing rank comes first)',
    brachos(g) === 'Hagafen' && g[0].representative.id === 'wine', show(g));
}
{
  const g = groupForRecitation([food('water'), food('grape_juice'), food('wine')]);
  check('wine + grape juice + water → ONE Hagafen covering all three', brachos(g) === 'Hagafen' && g[0].covered.length === 3 && g[0].representative.bracha === 'Hagafen', show(g));
}
{
  // only SHEHAKOL drinks fold — an item the DB rules Ha'etz / Ha'adama stays as ruled
  const g = groupForRecitation([food('wine'), { id: 'etz-drink', bracha: 'Haetz', isDrink: true }, { id: 'adama-drink', bracha: 'Haadama', isDrink: true }]);
  check("a drink ruled Ha'etz / Ha'adama is NOT folded into Hagafen", brachos(g) === 'Hagafen,Haetz,Haadama' && ids(g[0].covered) === 'wine', show(g));
}
{
  const g = groupForRecitation([food('wine'), { id: 'no-flag', bracha: 'Shehakol' }]);
  check('a Shehakol item with no isDrink flag keeps its own Shehakol', brachos(g) === 'Hagafen,Shehakol', show(g));
}

// ------------------------------------------------------- no wine: unchanged
{
  const g = groupForRecitation([food('water')]);
  check('water alone → Shehakol', brachos(g) === 'Shehakol' && ids(g[0].covered) === 'water', show(g));
}
{
  const g = groupForRecitation([food('coffee'), food('cake')]);
  check('cake + coffee (no wine) → Mezonos, then Shehakol on the coffee', brachos(g) === 'Mezonos,Shehakol', show(g));
}

// ------------------------------------------------------- Hamotzi (unchanged)
{
  const g = groupForRecitation([food('water'), food('wine'), food('bread')]);
  check('bread + wine + water → Hamotzi covering the water, then Hagafen on the wine alone',
    brachos(g) === 'Hamotzi,Hagafen' && ids(g[0].covered) === 'bread,water' && ids(g[1].covered) === 'wine', show(g));
}
{
  const g = groupForRecitation([food('chocolate'), food('apple'), food('cake'), food('bread'), food('grape_juice'), food('soda')]);
  check('bread meal: everything but the grape juice attaches to Hamotzi',
    brachos(g) === 'Hamotzi,Hagafen' && g[0].representative.id === 'bread' && g[0].covered.length === 5 && ids(g[1].covered) === 'grape_juice', show(g));
}

// ------------------------------------------------------- recitation order
{
  const sorted = kedimaSort([food('chocolate'), food('carrot'), food('apple'), food('wine'), food('cake'), food('bread')]);
  check('kedimaSort: Hamotzi < Mezonos < Hagafen < Ha’etz < Ha’adama < Shehakol',
    sorted.map((i) => i.bracha).join(',') === 'Hamotzi,Mezonos,Hagafen,Haetz,Haadama,Shehakol', ids(sorted));
}
{
  const g = groupForRecitation([food('chocolate'), food('carrot'), food('apple'), food('grape_juice'), food('cake')]);
  check('no bread: one group per blessing in rank order', brachos(g) === 'Mezonos,Hagafen,Haetz,Haadama,Shehakol', show(g));
}
{
  const g = groupForRecitation([food('apple'), food('pomegranate'), food('fig'), food('grapes'), food('date'), food('olive')]);
  check("Ha'etz: Shivas Haminim in verse order (olive, date, grape, fig, pomegranate), then other fruit",
    brachos(g) === 'Haetz' && ids(g[0].covered) === 'olive,date,grapes,fig,pomegranate,apple' && g[0].representative.id === 'olive', show(g));
}
{
  const g = groupForRecitation([food('apple', { whole: false }), food('pear', { whole: true })]);
  check("Ha'etz: whole over cut", g[0].representative.id === 'pear', show(g));
}
{
  const g = groupForRecitation([food('apple', { chaviv: true, whole: false }), food('pear', { whole: true })]);
  check('whole-over-cut outranks chaviv', g[0].representative.id === 'pear', show(g));
}
{
  const g = groupForRecitation([food('carrot'), food('cucumber', { chaviv: true })]);
  check("Ha'adama: chaviv first when nothing else differs", g[0].representative.id === 'cucumber', show(g));
}
{
  const g = groupForRecitation([food('fig', { chaviv: true, whole: true }), food('date')]);
  check('Shivas Haminim verse order outranks whole + chaviv', g[0].representative.id === 'date', show(g));
}

console.log(failures === 0 ? '\nBRACHOS: ALL PASS' : `\nBRACHOS: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

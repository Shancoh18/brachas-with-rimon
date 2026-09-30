/**
 * After-blessing assertions — runs the REAL src/lib/afterBracha.ts and
 * src/data/texts/meein.ts (node type-stripping, no second copy of the logic).
 *
 * 1. Me'ein Shalosh closing: every category eaten is named in BOTH closing
 *    lines, grain → wine → fruit (Shulchan Aruch OC 208:12; Seder Birkat
 *    HaNehenin 1:13). The app once sealed with the FIRST category only.
 * 2. Nusach Ari body = chabad.org ("וְשַׂמְּחֵנוּ בָהּ וּנְבָרֶכְךָ"), not the
 *    Ashkenaz "בְּבִנְיָנָהּ, וְנֹאכַל מִפִּרְיָהּ…".
 * 3. A food's own cited after-bracha places it even when its flags don't
 *    (learned foods carry shivasHaminim:false) — nothing is silently dropped;
 *    a self-contradicting item (Birkat Hamazon without bread) is unresolved.
 * 4. Land-of-Israel notes are keyed to where the produce GREW, not where the
 *    reader is (Shulchan Aruch OC 208:10), and keep their seal words.
 * 5. Day insertions (Shabbat / Rosh Chodesh / Rosh Hashanah / festivals, OC
 *    208:12) sit between "…וּבְטָהֳרָה." and "כִּי אַתָּה", Shabbat first; Ari =
 *    chabad.org, Ashkenaz = Daat, Edot = Shaliehsaboo (with their
 *    "בְּיוֹם (טוֹב) מִקְרָא קֹדֶשׁ" Yom Tov / Chol Hamoed forms). No day = the
 *    weekday text.
 * 6. The seven weekday recordings the After screen requests exist.
 *
 * Run: node --experimental-strip-types server/test/after-blessings.mjs
 * (wired into scripts/preflight.mjs)
 */
import { statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (...p) => import(pathToFileURL(join(ROOT, ...p)).href);
const { resolveAfterBrachos } = await imp('src', 'lib', 'afterBracha.ts');
const { assembleMeein, MEEIN_OCCASIONS, toggleMeeinOccasion } = await imp('src', 'data', 'texts', 'meein.ts');
const { ARI } = await imp('src', 'data', 'texts', 'ari.ts');
const { ASHKENAZ } = await imp('src', 'data', 'texts', 'ashkenaz.ts');
const { EDOT } = await imp('src', 'data', 'texts', 'edot.ts');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};
const endsWith = (text, tail) => text.endsWith(tail);

// ------------------------------------------------------------ Ari closings
const ARI_TAILS = {
  AlHamichya: 'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה.',
  AlHagefen: 'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן.',
  AlHaetz: 'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַפֵּרוֹת.',
  'AlHamichya,AlHagefen':
    'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגָּפֶן. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגָּפֶן.',
  'AlHamichya,AlHaetz':
    'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה וְהַפֵּרוֹת.',
  'AlHagefen,AlHaetz':
    'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן וְהַפֵּרוֹת.',
  // Seder Birkat HaNehenin 1:13 verbatim pattern
  'AlHamichya,AlHagefen,AlHaetz':
    'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגָּפֶן וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגָּפֶן וְהַפֵּרוֹת.',
};
for (const [combo, tail] of Object.entries(ARI_TAILS)) {
  const t = assembleMeein(ARI, combo.split(','));
  check(`ari closing names every category: ${combo}`, endsWith(t.hebrew, tail), t.hebrew.slice(-160));
}
check('ari: inserts given out of order still assemble grain → wine → fruit',
  assembleMeein(ARI, ['AlHaetz', 'AlHamichya']).hebrew === assembleMeein(ARI, ['AlHamichya', 'AlHaetz']).hebrew);
check('ari: combined opening joins all three inserts',
  assembleMeein(ARI, ['AlHamichya', 'AlHagefen', 'AlHaetz']).hebrew.includes(
    'עַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה וְעַל הַגֶּפֶן וְעַל פְּרִי הַגֶּפֶן וְעַל הָעֵץ וְעַל פְּרִי הָעֵץ וְעַל תְּנוּבַת הַשָּׂדֶה'));

// --------------------------------------------------------------- Ari body
const ariBody = ARI.meeinShalosh.body.hebrew;
check('ari body reads "וְשַׂמְּחֵנוּ בָהּ, וּנְבָרֶכְךָ בִּקְדֻשָּׁה" (chabad.org)', ariBody.includes('וְשַׂמְּחֵנוּ בָהּ, וּנְבָרֶכְךָ בִּקְדֻשָּׁה וּבְטָהֳרָה'));
for (const ashk of ['בְּבִנְיָנָהּ', 'וְנֹאכַל מִפִּרְיָהּ', 'וְנִשְׂבַּע מִטּוּבָהּ', 'עָלֶיהָ']) {
  check(`ari body has no Ashkenaz phrase ${ashk}`, !ariBody.includes(ashk));
}
check('ari translit matches the body fix', ARI.meeinShalosh.body.translit.includes("v'sam-chei-nu vah, un-va-rech-cha bik-du-shah") && !ARI.meeinShalosh.body.translit.includes('no-chal'));
check('ari english matches the body fix', ARI.meeinShalosh.body.english.includes('make us rejoice in it, and we will bless You in holiness') && !ARI.meeinShalosh.body.english.includes('eat of its fruit and be satiated with its goodness, and bless'));

// ------------------------------------------------------ Ashkenaz / Edot
const all3 = ['AlHamichya', 'AlHagefen', 'AlHaetz'];
{
  const t = assembleMeein(ASHKENAZ, all3).hebrew;
  check('ashkenaz combined closing (SA 208:12 wording)', endsWith(t,
    'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגָּפֶן וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל פְּרִי הַגָּפֶן וְעַל הַפֵּרוֹת.'), t.slice(-160));
  const body = ASHKENAZ.meeinShalosh.body.hebrew;
  check('ashkenaz body keeps its own "וְנֹאכַל מִפִּרְיָהּ" (Daat Siddur)', body.includes('וְנֹאכַל מִפִּרְיָהּ'));
}
{
  const t = assembleMeein(EDOT, all3).hebrew;
  check('edot combined closing names all categories', endsWith(t,
    'וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה וְעַל פְּרִי הַגֶּפֶן וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה יְהֹוָה, עַל הָאָרֶץ וְעַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה וְעַל פְּרִי הַגֶּפֶן וְעַל הַפֵּרוֹת.'), t.slice(-180));
}
for (const pack of [ARI, ASHKENAZ, EDOT]) {
  for (const combo of [['AlHamichya'], ['AlHagefen'], ['AlHaetz'], all3]) {
    const t = assembleMeein(pack, combo);
    // nikud stripped first — the notes are vocalized, the pattern isn't
    const plain = (t.hebrew + t.translit + t.english).replace(/[\u0591-\u05C7]/g, '');
    check(`${pack.id} ${combo.join('+')}: no Israel note inside the blessing text`,
      !/ארץ ישראל|In Israel|Eretz Yisrael/.test(plain));
    check(`${pack.id} ${combo.join('+')}: one baruch line, text ends with a period`,
      t.hebrew.split(pack.meeinShalosh.closing.baruch.hebrew).length === 2 && t.hebrew.endsWith('.'));
  }
}
check('ashkenaz fruit+wine surfaces both Israel notes beside the text', assembleMeein(ASHKENAZ, ['AlHagefen', 'AlHaetz']).israelNotes.length === 2);

// Land-of-Israel notes: where the produce GREW, not where you are
const ISRAEL_SEALS = {
  AlHamichya: { hebrew: 'וְעַל מִחְיָתָהּ וְעַל כַּלְכָּלָתָהּ', translit: "v'al mich-ya-tah v'al kal-ka-la-tah" },
  AlHagefen: { hebrew: 'וְעַל פְּרִי גַפְנָהּ', translit: "v'al pri gaf-nah" },
  AlHaetz: { hebrew: 'וְעַל פֵּרוֹתֶיהָ', translit: "v'al pei-ro-te-ha" },
};
const ISRAEL_PREFIX = {
  AlHamichya: 'לִמְזוֹנוֹת מִתְּבוּאַת אֶרֶץ יִשְׂרָאֵל:',
  AlHagefen: 'לְיַיִן מֵעַנְבֵי אֶרֶץ יִשְׂרָאֵל:',
  AlHaetz: 'לְפֵרוֹת אֶרֶץ יִשְׂרָאֵל:',
};
let israelNoteCount = 0;
for (const pack of [ARI, ASHKENAZ, EDOT]) {
  for (const [k, n] of Object.entries(pack.meeinShalosh.closing.israelNote ?? {})) {
    israelNoteCount++;
    const where = `${pack.id} ${k} Israel note`;
    check(`${where}: not phrased as "in Israel" (where you are)`,
      !n.hebrew.replace(/[\u0591-\u05C7]/g, '').startsWith('בארץ ישראל') && !n.translit.startsWith('In Israel') && !n.english.startsWith('In Israel'),
      JSON.stringify(n));
    check(`${where}: english says the produce was grown in Eretz Yisrael`, n.english.includes('grown in Eretz Yisrael'), n.english);
    check(`${where}: hebrew names the produce of Eretz Yisrael`, n.hebrew.startsWith(ISRAEL_PREFIX[k] + ' '), n.hebrew);
    check(`${where}: translit prefix`, n.translit.startsWith('For produce of Eretz Yisrael: '), n.translit);
    check(`${where}: seal words unchanged`, n.hebrew.endsWith(ISRAEL_SEALS[k].hebrew) && n.translit.endsWith(ISRAEL_SEALS[k].translit), JSON.stringify(n));
  }
}
check('Israel notes: ashkenaz 2 (wine, fruit) + edot 3, none on ari', israelNoteCount === 5 && !ARI.meeinShalosh.closing.israelNote, String(israelNoteCount));
check('ari english combined closing', assembleMeein(ARI, all3).english.endsWith(
  'we thank You for the land and for the sustenance and for the fruit of the vine and for the fruits. Blessed are You, L-rd, for the land and for the sustenance and for the fruit of the vine and the fruits.'),
  assembleMeein(ARI, all3).english.slice(-200));

// --------------------------------------------------------------- resolver
const item = (label, achrona, flags = {}) => ({ id: label, label, achrona, shiurMet: true, ...flags });
const cake = item('cake', 'AlHamichya', { isFiveGrain: true });
const grape = item('grape', 'AlHaetz', { isShivaFruit: true, isTreeFruit: true });
const wine = item('wine', 'AlHagefen', { isWineGrape: true, isDrink: true });
const apple = item('apple', 'BoreiNefashos', { isTreeFruit: true });
const rice = item('rice', 'BoreiNefashos');
const bread = item('bread', 'BirkatHamazon', { isBread: true, isFiveGrain: true });

const ins = (r) => r.meeinInserts.join('+');
{
  const r = resolveAfterBrachos([cake, grape, wine]);
  check('cake + grape + wine → one Me\'ein Shalosh, all three', ins(r) === 'AlHamichya+AlHagefen+AlHaetz' && !r.boreiNefashos && r.unresolved.length === 0);
}
check('grape + apple → Al Ha\'etz covers both', (() => { const r = resolveAfterBrachos([grape, apple]); return ins(r) === 'AlHaetz' && !r.boreiNefashos; })());
check('rice + grape → Al Ha\'etz + Borei Nefashos', (() => { const r = resolveAfterBrachos([rice, grape]); return ins(r) === 'AlHaetz' && r.boreiNefashos; })());
check('bread + wine + grape → Birkat Hamazon only', (() => { const r = resolveAfterBrachos([bread, wine, grape]); return r.birkatHamazon && !r.meeinInserts.length; })());
check('nothing reached a shiur → none', resolveAfterBrachos([{ ...cake, shiurMet: false }]).none === true);

// learned-food shapes: cited after-bracha, flags false (shivasHaminim:false by design)
{
  const learnedFig = item('medjool dates', 'AlHaetz', { isTreeFruit: true, isShivaFruit: false });
  const r = resolveAfterBrachos([learnedFig]);
  check('learned Al Ha\'etz food (shivasHaminim:false) is NOT dropped', ins(r) === 'AlHaetz' && !r.none && r.unresolved.length === 0, JSON.stringify(r));
}
{
  const learnedWine = item('port wine', 'AlHagefen', { isDrink: true });
  const r = resolveAfterBrachos([learnedWine, item('soda', 'BoreiNefashos', { isDrink: true })]);
  check('learned Al Hagefen drink is placed and covers other drinks', ins(r) === 'AlHagefen' && !r.boreiNefashos, JSON.stringify(r));
}
{
  const learnedMichya = item('learned pastry', 'AlHamichya');
  check('learned Al Hamichya food without isFiveGrain is placed', ins(resolveAfterBrachos([learnedMichya])) === 'AlHamichya');
}
{
  // achrona Birkat Hamazon but the rishona isn't Hamotzi — contradictory
  // (bad learned data; no vetted entry does this): never Birkat Hamazon on
  // its own, reported for a rabbi instead, the rest of the meal still placed
  const learnedBread = item('learned roll', 'BirkatHamazon', { isFiveGrain: true });
  const r = resolveAfterBrachos([learnedBread, apple]);
  check('learned Birkat Hamazon food without isBread → unresolved, no Birkat Hamazon',
    r.birkatHamazon === false && r.unresolved.length > 0 && r.unresolved.includes('learned roll') && r.boreiNefashos && !r.none, JSON.stringify(r));
  const alone = resolveAfterBrachos([learnedBread]);
  check('a contradictory item alone triggers nothing but is still reported',
    !alone.birkatHamazon && !alone.meeinInserts.length && !alone.boreiNefashos && alone.unresolved.length === 1 && !alone.none, JSON.stringify(alone));
  check('real bread still covers a contradictory item', resolveAfterBrachos([learnedBread, bread]).birkatHamazon === true);
}
{
  const r = resolveAfterBrachos([item('mystery', 'SomethingElse'), apple]);
  check('an unplaceable item is reported as unresolved, never silently dropped', r.unresolved.includes('mystery') && r.boreiNefashos && !r.none, JSON.stringify(r));
}

// -------------------------------------------- day insertions (OC 208:12)
// Sukkot 5787 begins Friday night 2026-09-25: Shabbat + Yom Tov together,
// then Chol Hamoed, then Shemini Atzeret on Shabbat. Each line sits between
// "…וּבְטָהֳרָה." and "כִּי אַתָּה" as its own sentence, Shabbat first.
const DAY_KEYS = ['shabbat', 'roshChodesh', 'roshHashanah', 'pesach', 'shavuot', 'sukkot', 'shminiAtzeret'];
// chabad.org's Al Hamichyah page (Chabad: "רֹאשׁ חֹדֶשׁ" without the article,
// "שְׁמִינִי עֲצֶרֶת הַחַג", no מִקְרָא קֹדֶשׁ clause)
const ARI_DAY = {
  shabbat: 'וּרְצֵה וְהַחֲלִיצֵנוּ בְּיוֹם הַשַּׁבָּת הַזֶּה',
  roshChodesh: 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ חֹדֶשׁ הַזֶּה',
  roshHashanah: 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם הַזִּכָּרוֹן הַזֶּה',
  pesach: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַמַּצּוֹת הַזֶּה',
  shavuot: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַשָּׁבוּעוֹת הַזֶּה',
  sukkot: 'וְשַׂמְּחֵנוּ בְּיוֹם חַג הַסֻּכּוֹת הַזֶּה',
  shminiAtzeret: 'וְשַׂמְּחֵנוּ בְּיוֹם שְׁמִינִי עֲצֶרֶת הַחַג הַזֶּה',
};
const FIELDS = ['hebrew', 'translit', 'english'];
const SEAM_A = { hebrew: 'וּבְטָהֳרָה. ', translit: 'uv-ta-ho-rah. ', english: 'purity. ' };
const SEAM_B = { hebrew: '. כִּי אַתָּה', translit: '. Ki a-tah', english: '. For You' };

check('MEEIN_OCCASIONS lists the seven day lines, Shabbat first', JSON.stringify(MEEIN_OCCASIONS) === JSON.stringify(DAY_KEYS), JSON.stringify(MEEIN_OCCASIONS));
{
  const weekday = assembleMeein(ARI, all3);
  check('weekday text carries no day line and reads "וּבְטָהֳרָה. כִּי אַתָּה" at the seam',
    !/הַזֶּה|וּרְצֵה|זָכְרֵנוּ|שַׂמְּחֵנוּ בְּיוֹם/.test(weekday.hebrew) && weekday.hebrew.includes('וּבְטָהֳרָה. כִּי אַתָּה יְיָ טוֹב') && weekday.occasions.length === 0);
  check('an empty day = the weekday text the recordings speak',
    assembleMeein(ARI, all3, { occasions: [] }).hebrew === weekday.hebrew && assembleMeein(ARI, all3, { occasions: [], yomTov: true }).hebrew === weekday.hebrew);
}
for (const pack of [ARI, ASHKENAZ, EDOT]) {
  const ms = pack.meeinShalosh;
  check(`${pack.id}: body ends at the seam "וּבְטָהֳרָה." and kiAtah opens "כִּי אַתָּה" (all fields)`,
    ms.body.hebrew.endsWith('וּבְטָהֳרָה.') && ms.kiAtah.hebrew.startsWith('כִּי אַתָּה') &&
    ms.body.translit.endsWith('uv-ta-ho-rah.') && ms.kiAtah.translit.startsWith('Ki a-tah') &&
    ms.body.english.endsWith('holiness and purity.') && ms.kiAtah.english.startsWith('For You') &&
    ms.kiAtah.hebrew.endsWith('וְנוֹדֶה לְּךָ עַל הָאָרֶץ'));
  const weekdayTail = assembleMeein(pack, all3).hebrew.slice(-120);
  for (const k of DAY_KEYS) {
    const line = ms.occasions[k];
    check(`${pack.id} ${k}: line in all three fields, no trailing punctuation`,
      !!line && FIELDS.every((f) => typeof line[f] === 'string' && line[f].length > 8 && !/[.:,]$/.test(line[f])), JSON.stringify(line));
    const t = assembleMeein(pack, all3, { occasions: [k] });
    for (const f of FIELDS) {
      check(`${pack.id} ${k} ${f}: the line sits between the seams, exactly once`,
        t[f].includes(`${SEAM_A[f]}${line[f]}${SEAM_B[f]}`) && t[f].split(line[f]).length === 2, t[f].slice(0, 420));
    }
    check(`${pack.id} ${k}: opening and closing untouched by the day line`,
      t.hebrew.endsWith(weekdayTail) && t.hebrew.startsWith(assembleMeein(pack, all3).hebrew.slice(0, 80)) && t.occasions.join() === k);
  }
}
{
  // Friday night / Shabbat 2026-09-25/26 = Shabbat + the first day of Sukkot
  const a = assembleMeein(ARI, all3, { occasions: ['sukkot', 'shabbat'] });
  const b = assembleMeein(ARI, all3, { occasions: ['shabbat', 'sukkot'] });
  check('ari Shabbat + Sukkot: Shabbat line first, both before "כִּי אַתָּה"',
    a.hebrew.includes('וּבְטָהֳרָה. וּרְצֵה וְהַחֲלִיצֵנוּ בְּיוֹם הַשַּׁבָּת הַזֶּה. וְשַׂמְּחֵנוּ בְּיוֹם חַג הַסֻּכּוֹת הַזֶּה. כִּי אַתָּה יְיָ טוֹב'), a.hebrew);
  check('ari Shabbat + Sukkot: the order of the occasions argument is irrelevant',
    a.hebrew === b.hebrew && a.translit === b.translit && a.english === b.english && a.occasions.join() === 'shabbat,sukkot');
  check('ari Shabbat + Sukkot: translit and english carry both lines in order',
    a.translit.includes("uv-ta-ho-rah. Ur-tzei v'ha-cha-li-tzei-nu b'yom ha-Sha-bos ha-zeh. V'sam-chei-nu b'yom Chag ha-Su-kos ha-zeh. Ki a-tah") &&
    a.english.includes('purity. May it please You to strengthen us on this Shabbat day. Grant us joy on this day of the Festival of Sukkot. For You'), a.english);
  check('ari Shabbat + Sukkot: the closing still names every category', endsWith(a.hebrew, ARI_TAILS['AlHamichya,AlHagefen,AlHaetz']), a.hebrew.slice(-160));
  check('Shabbat + Rosh Chodesh (ashkenaz): Shabbat first',
    assembleMeein(ASHKENAZ, ['AlHamichya'], { occasions: ['roshChodesh', 'shabbat'] }).hebrew.includes(
      'וּבְטָהֳרָה. וּרְצֵה וְהַחֲלִיצֵנוּ בְּיוֹם הַשַּׁבָּת הַזֶּה. וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ הַחֹדֶשׁ הַזֶּה. כִּי אַתָּה'));
}
for (const [k, he] of Object.entries(ARI_DAY)) check(`ari ${k} wording = chabad.org`, ARI.meeinShalosh.occasions[k].hebrew === he, ARI.meeinShalosh.occasions[k].hebrew);
check('ari: no Yom Tov variant (no מִקְרָא קֹדֶשׁ clause in Chabad) — yomTov changes nothing',
  !ARI.meeinShalosh.occasionsYomTov && assembleMeein(ARI, all3, { occasions: ['sukkot'], yomTov: true }).hebrew === assembleMeein(ARI, all3, { occasions: ['sukkot'] }).hebrew);
// Ashkenaz (Daat) and Edot (Shaliehsaboo) end every festival line with
// "בְּיוֹם (טוֹב) מִקְרָא קֹדֶשׁ הַזֶּה" — טוֹב on the festival days, not on Chol Hamoed
for (const pack of [ASHKENAZ, EDOT]) {
  const ms = pack.meeinShalosh;
  for (const k of ['pesach', 'sukkot']) {
    const ch = assembleMeein(pack, all3, { occasions: [k] }).hebrew;
    const yt = assembleMeein(pack, all3, { occasions: [k], yomTov: true });
    check(`${pack.id} ${k}: Chol Hamoed line ends "בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה"`,
      ms.occasions[k].hebrew.endsWith('הַזֶּה, בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה') && ch.includes(`${ms.occasions[k].hebrew}. כִּי אַתָּה`), ms.occasions[k].hebrew);
    check(`${pack.id} ${k}: the festival day says "בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה" instead`,
      ms.occasionsYomTov?.[k]?.hebrew === ms.occasions[k].hebrew.replace('בְּיוֹם מִקְרָא', 'בְּיוֹם טוֹב מִקְרָא') &&
      yt.hebrew.includes(`${ms.occasionsYomTov[k].hebrew}. כִּי אַתָּה`) && !yt.hebrew.includes(`${ms.occasions[k].hebrew}.`) && yt.occasions.join() === k, yt.hebrew.slice(0, 600));
    check(`${pack.id} ${k}: Yom Tov variant carried in translit + english too`,
      ms.occasionsYomTov[k].translit.endsWith("b'yom tov mik-ra ko-desh ha-zeh") && ms.occasionsYomTov[k].english.endsWith('on this festival day of holy convocation') &&
      ms.occasions[k].translit.endsWith("b'yom mik-ra ko-desh ha-zeh") && ms.occasions[k].english.endsWith('on this day of holy convocation'));
  }
  for (const k of ['shavuot', 'shminiAtzeret']) {
    check(`${pack.id} ${k}: always a festival day → "בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה" in the line itself, no variant`,
      ms.occasions[k].hebrew.endsWith('הַזֶּה, בְּיוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה') && !ms.occasionsYomTov?.[k]);
  }
  check(`${pack.id}: Shabbat / Rosh Hashanah lines`,
    ms.occasions.shabbat.hebrew === 'וּרְצֵה וְהַחֲלִיצֵנוּ בְּיוֹם הַשַּׁבָּת הַזֶּה' && ms.occasions.roshHashanah.hebrew === 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם הַזִּכָּרוֹן הַזֶּה');
  check(`${pack.id}: yomTov only touches Pesach / Sukkot`, DAY_KEYS.filter((k) => k !== 'pesach' && k !== 'sukkot').every((k) =>
    assembleMeein(pack, all3, { occasions: [k], yomTov: true }).hebrew === assembleMeein(pack, all3, { occasions: [k] }).hebrew));
}
check('Rosh Chodesh: Daat Ashkenaz keeps the article "רֹאשׁ הַחֹדֶשׁ"; Ari and Edot say "רֹאשׁ חֹדֶשׁ"',
  ASHKENAZ.meeinShalosh.occasions.roshChodesh.hebrew === 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ הַחֹדֶשׁ הַזֶּה' &&
  EDOT.meeinShalosh.occasions.roshChodesh.hebrew === 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ חֹדֶשׁ הַזֶּה' &&
  ARI.meeinShalosh.occasions.roshChodesh.hebrew === 'וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ חֹדֶשׁ הַזֶּה');
check('Shemini Atzeret wording per nusach',
  ARI.meeinShalosh.occasions.shminiAtzeret.hebrew === 'וְשַׂמְּחֵנוּ בְּיוֹם שְׁמִינִי עֲצֶרֶת הַחַג הַזֶּה' &&
  ASHKENAZ.meeinShalosh.occasions.shminiAtzeret.hebrew.startsWith('וְשַׂמְּחֵנוּ בְּיוֹם שְׁמִינִי, חַג עֲצֶרֶת הַזֶּה') &&
  EDOT.meeinShalosh.occasions.shminiAtzeret.hebrew.startsWith('וְשַׂמְּחֵנוּ בְּיוֹם שְׁמִינִי חַג עֲצֶרֶת הַזֶּה'));
check('every nusach names חַג הַסֻּכּוֹת (the edition slip "בְּיוֹם הַסֻּכּוֹת" is not shipped)',
  [ARI, ASHKENAZ, EDOT].every((p) => p.meeinShalosh.occasions.sukkot.hebrew.startsWith('וְשַׂמְּחֵנוּ בְּיוֹם חַג הַסֻּכּוֹת הַזֶּה')));
check('day lines never pull an Israel note into the text',
  !/ארץ ישראל/.test(assembleMeein(EDOT, all3, { occasions: ['shabbat', 'sukkot'] }).hebrew.replace(/[֑-ׇ]/g, '')));
check('an unknown occasion throws instead of silently building a text', (() => {
  try { assembleMeein(ARI, all3, { occasions: ['purim'] }); return false; } catch { return true; }
})());

// the "Today is…" chips: Shabbat on its own, the rest one-of
{
  let d = toggleMeeinOccasion([], 'sukkot');
  check('chips: Sukkot on', d.join() === 'sukkot');
  d = toggleMeeinOccasion(d, 'shabbat');
  check('chips: + Shabbat keeps Sukkot', d.join() === 'sukkot,shabbat' && assembleMeein(ARI, all3, { occasions: d }).occasions.join() === 'shabbat,sukkot');
  d = toggleMeeinOccasion(d, 'shminiAtzeret');
  check('chips: a second day line replaces the first, Shabbat stays', d.join() === 'shabbat,shminiAtzeret');
  d = toggleMeeinOccasion(d, 'shabbat');
  check('chips: Shabbat off leaves the day line', d.join() === 'shminiAtzeret');
  d = toggleMeeinOccasion(d, 'shminiAtzeret');
  check('chips: tapping the active day line clears it (weekday)', d.length === 0 && assembleMeein(ARI, all3, { occasions: d }).hebrew === assembleMeein(ARI, all3).hebrew);
  check('chips: never mutates its input', (() => { const src = Object.freeze(['shabbat']); return toggleMeeinOccasion(src, 'pesach').join() === 'shabbat,pesach' && src.length === 1; })());
}

// ------------------------------------------- recordings (weekday Ari text)
// The After screen requests meein-<inserts>.mp3 under Nusach Ari (weekday text
// only — it hides "hear it" whenever a day line is active). Every combination
// must ship; regenerate with scripts/generate-meein-audio.mjs.
for (const combo of Object.keys(ARI_TAILS)) {
  const file = `meein-${combo.split(',').map((k) => k.toLowerCase()).join('-')}.mp3`;
  let size = 0;
  try { size = statSync(join(ROOT, 'public', 'audio', file)).size; } catch { /* missing */ }
  check(`recording present: public/audio/${file}`, size > 100_000, `${size} bytes`);
}

console.log(failures === 0 ? '\nAFTER-BLESSINGS: ALL PASS' : `\nAFTER-BLESSINGS: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

/**
 * "This week's takeaway" — one short, plain-English lesson per parsha,
 * shown at the bottom of the daily-parsha reader (owner request 2026-08-07).
 *
 * Each entry deep-links that parsha's study hub on chabad.org (the same
 * single-source rule as the Learn library — chabad.org ONLY). The takeaway
 * is a one-breath distillation of the parsha's classic lesson as taught in
 * the hub's articles; it is STUDY MATERIAL, not psak, and every render
 * carries the "AI makes mistakes" line + the source link.
 *
 * Keys are normalized (lowercase, letters only) so both Hebcal spellings
 * ("Sh'lach", "Ha'Azinu") and chabad.org spellings ("Shelach", "Haazinu")
 * resolve. Combined parshas ("Matot-Masei") carry their own hub link.
 */

export interface ParshaTakeaway {
  /** display name, e.g. "Re'eh" */
  name: string;
  /** the one-lesson takeaway, 1–2 plain sentences */
  takeaway: string;
  /** that parsha's study hub on chabad.org */
  sourceUrl: string;
}

const hub = (aid: number) => `https://www.chabad.org/parshah/default_cdo/aid/${aid}`;

/** entry + the spellings that should find it */
const T: [string[], ParshaTakeaway][] = [
  // ------------------------------------------------------------- Bereishit
  [['bereshit', 'bereishit', 'bereishis'], { name: 'Bereishit', takeaway: 'The Torah opens with G-d creating light before anything else was in order. Start where you are — bring a little light first, and build from there.', sourceUrl: hub(7781) }],
  [['noach'], { name: 'Noach', takeaway: 'Noach built the ark plank by plank for decades while the world scoffed. Steady, unglamorous consistency is what carries a person — and a family — through a flood.', sourceUrl: hub(9168) }],
  [['lechlecha'], { name: 'Lech Lecha', takeaway: '"Go from your land" — Avraham became Avraham only by leaving the familiar. Growth begins the moment you step past what is comfortable.', sourceUrl: hub(9169) }],
  [['vayera'], { name: 'Vayera', takeaway: 'Avraham interrupted a visit from G-d Himself to run and welcome three dusty strangers. Caring for a person in front of you is itself a way of receiving G-d.', sourceUrl: hub(9170) }],
  [['chayeisara', 'chayeisarah'], { name: 'Chayei Sarah', takeaway: 'Sarah\'s years are counted as "all equally good" — not because they were easy, but because she met each one the same way. A life is measured by how its days are used, not how they arrive.', sourceUrl: hub(9171) }],
  [['toldot', 'toldos'], { name: 'Toldot', takeaway: 'Yitzchak re-dug the very wells his father had dug and others had stopped up. Some work is not new — it is faithfully reopening good things that were closed.', sourceUrl: hub(9172) }],
  [['vayetze', 'vayetzei', 'vayeitzei'], { name: 'Vayetzei', takeaway: 'Yaakov slept on a stone in a place he feared — and woke to say "G-d is in this place, and I did not know it." Holiness is often already where you are; the work is noticing.', sourceUrl: hub(9173) }],
  [['vayishlach'], { name: 'Vayishlach', takeaway: 'Yaakov prepared for Esav with prayer, a gift, and a plan — all three. Trust in G-d and doing your own footwork are partners, not rivals.', sourceUrl: hub(15554) }],
  [['vayeshev', 'vayeishev'], { name: 'Vayeshev', takeaway: 'Sold, slandered, and jailed, Yosef kept doing his best work in every pit he landed in. You can\'t always choose the chapter — you can choose how you show up in it.', sourceUrl: hub(15555) }],
  [['miketz', 'mikeitz'], { name: 'Miketz', takeaway: 'Yosef went from dungeon to palace in a single morning — and credited G-d before Pharaoh, not himself. Stay ready, and stay humble about where the help comes from.', sourceUrl: hub(15556) }],
  [['vayigash'], { name: 'Vayigash', takeaway: '"I am Yosef your brother" — he comforted the brothers who sold him, seeing G-d\'s plan inside their wrong. Letting go of a grudge is strength wearing gentle clothes.', sourceUrl: hub(15557) }],
  [['vayechi'], { name: 'Vayechi', takeaway: 'Yaakov\'s best years, the Torah says, were his last seventeen — in Egypt, of all places. A person can truly live anywhere, when what they carry inside is alive.', sourceUrl: hub(15558) }],
  // ---------------------------------------------------------------- Shemot
  [['shemot', 'shemos'], { name: 'Shemot', takeaway: 'Moshe turned aside to look at a burning bush others walked past — and only then did G-d call his name. Paying real attention is where a calling begins.', sourceUrl: hub(15559) }],
  [['vaera', 'vaeira'], { name: 'Va\'eira', takeaway: 'Pharaoh was warned plague after plague and hardened his heart each time. The takeaway is the mirror: when life repeats a message, soften — don\'t dig in.', sourceUrl: hub(15560) }],
  [['bo'], { name: 'Bo', takeaway: 'On the eve of freedom the Jews were commanded to mark time — the first mitzvah was a calendar. A free person is someone whose time has purpose.', sourceUrl: hub(15561) }],
  [['beshalach'], { name: 'Beshalach', takeaway: 'The sea split only after Nachshon walked in up to his neck. Sometimes the miracle is waiting for a person willing to take the first wet step.', sourceUrl: hub(15562) }],
  [['yitro', 'yisro'], { name: 'Yitro', takeaway: 'The Ten Commandments were given in a wilderness that belonged to no one — Torah waits for anyone, anywhere, who makes themselves open ground for it.', sourceUrl: hub(15563) }],
  [['mishpatim'], { name: 'Mishpatim', takeaway: 'Straight from Sinai\'s thunder, the Torah turns to lost oxen, loans, and fair wages. Holiness is proven in the fine print of how we treat each other.', sourceUrl: hub(15564) }],
  [['terumah'], { name: 'Terumah', takeaway: '"Make Me a sanctuary and I will dwell within them" — within the people, not within the building. Every giving heart is a place G-d can live.', sourceUrl: hub(15565) }],
  [['tetzaveh'], { name: 'Tetzaveh', takeaway: 'The menorah burned on oil crushed from olives — pure light out of pressure. What presses you can also be what fuels your brightest hours.', sourceUrl: hub(15566) }],
  [['kitisa', 'kisisa'], { name: 'Ki Tisa', takeaway: 'After the golden calf — the worst fall in the wilderness — came forgiveness and a second set of tablets. No mistake gets the last word if you are willing to begin again.', sourceUrl: hub(15567) }],
  [['vayakhel'], { name: 'Vayakhel', takeaway: 'The Mishkan rose from everyone\'s small gifts — thread, skins, a mirror, an earring. Big holy things are assembled from ordinary contributions, willingly given.', sourceUrl: hub(15568) }],
  [['pekudei'], { name: 'Pekudei', takeaway: 'Moshe gave a public accounting of every ounce of donated gold. Integrity means welcoming the audit, especially when no one demands it.', sourceUrl: hub(15570) }],
  // ---------------------------------------------------------------- Vayikra
  [['vayikra'], { name: 'Vayikra', takeaway: 'The book of offerings opens with a small alef — Moshe\'s humility written into the scroll itself. What you bring matters less than the smallness of ego you bring it with.', sourceUrl: hub(15574) }],
  [['tzav'], { name: 'Tzav', takeaway: 'The altar\'s fire was kept burning every single morning, even though fire also came from heaven. Heaven answers people who keep their own flame lit.', sourceUrl: hub(15575) }],
  [['shmini', 'shemini'], { name: 'Shemini', takeaway: 'On the eighth day — one past the complete week of seven — the Divine presence appeared. The extra effort past "done enough" is where the extraordinary lives.', sourceUrl: hub(15576) }],
  [['tazria'], { name: 'Tazria', takeaway: 'Tzara\'at made harm done by words visible on the skin. Speech leaves marks — the parsha asks us to treat what we say as seriously as what we do.', sourceUrl: hub(15577) }],
  [['metzora'], { name: 'Metzora', takeaway: 'The Torah spends a whole parsha on how the metzora returns and is purified. No one is written off — there is always a road back in.', sourceUrl: hub(15579) }],
  [['achreimot', 'achareimot', 'acharei'], { name: 'Acharei Mot', takeaway: 'The holiest man entered the holiest room on the holiest day — carrying simple incense and plain white garments. Approach the biggest moments with the fewest ornaments.', sourceUrl: hub(15580) }],
  [['kedoshim'], { name: 'Kedoshim', takeaway: '"Be holy" is commanded to the entire people — then spelled out as honest scales, paid workers, and love for your neighbor. Holiness is for everyone, and it looks like decency.', sourceUrl: hub(15582) }],
  [['emor'], { name: 'Emor', takeaway: 'The festivals are set out as "appointed times" — meetings G-d schedules with us. Put what matters on the calendar, or it never happens.', sourceUrl: hub(15583) }],
  [['behar'], { name: 'Behar', takeaway: 'Every seventh year the land rests and debts release — the economy itself pauses to remember Who owns it all. Letting go on schedule keeps a person free.', sourceUrl: hub(15584) }],
  [['bechukotai', 'bechukosai'], { name: 'Bechukotai', takeaway: '"If you walk in My statutes" — the sages read "walk" as toil, movement, never standing still. Blessing follows people who keep walking.', sourceUrl: hub(15586) }],
  // --------------------------------------------------------------- Bamidbar
  [['bamidbar'], { name: 'Bamidbar', takeaway: 'The census counted every person one by one — no one was a rounding error. In G-d\'s ledger every individual is a whole number.', sourceUrl: hub(36466) }],
  [['naso', 'nasso'], { name: 'Nasso', takeaway: 'Each tribal leader brought the identical offering, yet the Torah writes all twelve out in full. The same good deed is brand-new when a different heart does it.', sourceUrl: hub(39589) }],
  [['behaalotecha', 'behaalotcha'], { name: 'Beha\'alotecha', takeaway: 'Aharon\'s job was to kindle the lamps "until the flame rises on its own." Real teaching, real parenting, real leading — lighting others until they burn without you.', sourceUrl: hub(36744) }],
  [['shelach', 'shlach'], { name: 'Sh\'lach', takeaway: 'Ten scouts saw giants and felt like grasshoppers; two saw the same land and said "we can surely do it." The facts were identical — the difference was what they believed about themselves.', sourceUrl: hub(45586) }],
  [['korach'], { name: 'Korach', takeaway: 'Korach demanded greatness as a prize instead of a responsibility — and the ground gave way beneath that kind of wanting. Ambition is holy only when it comes to serve.', sourceUrl: hub(45591) }],
  [['chukat', 'chukas'], { name: 'Chukat', takeaway: 'The red heifer has no explanation — and the Torah gives it anyway. Some right things are done out of trust before they are understood.', sourceUrl: hub(45612) }],
  [['balak'], { name: 'Balak', takeaway: 'Bilam was hired to curse and blessed instead: "How goodly are your tents, Yaakov." What your home quietly is speaks louder than what any outsider says about it.', sourceUrl: hub(45614) }],
  [['pinchas'], { name: 'Pinchas', takeaway: 'The daughters of Tzelafchad respectfully asked for their share in the land — and G-d said they were right. It is not only permitted to ask for your portion; sometimes it changes the law for everyone.', sourceUrl: hub(45615) }],
  [['matot', 'matos'], { name: 'Matot', takeaway: 'The parsha opens with vows: a person\'s word creates real obligations. Say less, promise carefully, and let your word be a thing that holds.', sourceUrl: hub(52598) }],
  [['masei', 'massei'], { name: 'Masei', takeaway: 'Forty-two encampments are listed one by one — even the backtracks and the bitter stops. Every stage of your journey counted, including the ones that felt like detours.', sourceUrl: hub(52600) }],
  // ---------------------------------------------------------------- Devarim
  [['devarim'], { name: 'Devarim', takeaway: 'Moshe retells the people\'s own story to them before they cross over. Looking honestly at where you\'ve been is how you get ready for where you\'re going.', sourceUrl: hub(36232) }],
  [['vaetchanan', 'vaeschanan'], { name: 'Va\'etchanan', takeaway: 'Moshe prayed 515 times to enter the land — and accepted "no" without letting go of G-d. Pray with your whole heart, and keep your whole heart even when the answer is no.', sourceUrl: hub(36233) }],
  [['eikev', 'ekev'], { name: 'Eikev', takeaway: '"You will eat and be satisfied, and bless" — gratitude is commanded for after the meal, when it is easiest to forget. Thank fullest when you are fullest.', sourceUrl: hub(36234) }],
  [['reeh'], { name: 'Re\'eh', takeaway: '"See, I set before you today a blessing and a curse" — today, singular, you. Choosing well isn\'t a once-in-a-lifetime event; it is set before you fresh every morning.', sourceUrl: hub(36235) }],
  [['shoftim'], { name: 'Shoftim', takeaway: '"Judges and officers at all your gates" — the sages read it inward: guard what enters through your own eyes, ears, and mouth. Character is border control.', sourceUrl: hub(36236) }],
  [['kiteitzei', 'kiseitzei', 'kiteitze'], { name: 'Ki Teitzei', takeaway: 'Send the mother bird away, return a lost wallet, help load a fallen donkey — this parsha packs 74 mitzvot into daily details. A good life is built out of small kept rules.', sourceUrl: hub(36237) }],
  [['kitavo', 'kisavo'], { name: 'Ki Tavo', takeaway: 'The farmer brings the first fruits and retells the whole story of where he came from. Gratitude with memory attached — that is what turns produce into an offering.', sourceUrl: hub(36238) }],
  [['nitzavim'], { name: 'Nitzavim', takeaway: '"It is not in heaven… it is very near to you, in your mouth and in your heart, to do it." The change you\'re waiting for isn\'t far away — it is within reach today.', sourceUrl: hub(36239) }],
  [['vayelech', 'vayeilech'], { name: 'Vayeilech', takeaway: 'At 120, on his last day, Moshe "went" — still walking, still encouraging, still handing the work forward. Finish strong, and hand the Torah to the next hands warm.', sourceUrl: hub(36240) }],
  [['haazinu'], { name: 'Ha\'azinu', takeaway: 'Moshe leaves the people a song, not a lecture — words set to music are the ones a heart keeps. Teach what matters in a form that will be remembered.', sourceUrl: hub(36241) }],
  [['vezothaberakhah', 'vzothaberachah', 'vezothaberachah', 'vzothaberacha'], { name: 'V\'Zot HaBerachah', takeaway: 'The Torah ends with Moshe blessing every tribe by name — and the moment it ends, we roll back to Bereishit. The last lesson is that learning never finishes; it circles.', sourceUrl: hub(36242) }],
  // ------------------------------------------------- combined double-parshas
  [['vayakhelpekudei'], { name: 'Vayakhel-Pekudei', takeaway: 'Everyone\'s small gifts built the Mishkan — and then every ounce was accounted for. Generosity and integrity are the two hands of holy work.', sourceUrl: hub(15569) }],
  [['tazriametzora'], { name: 'Tazria-Metzora', takeaway: 'Words can wound enough to show on the skin — and yet the Torah devotes itself to the road back. Guard your speech, and never write anyone off.', sourceUrl: hub(15578) }],
  [['achreimotkedoshim', 'achareimotkedoshim', 'achareikedoshim'], { name: 'Acharei-Kedoshim', takeaway: '"Be holy" is commanded to every single person — and spelled out as honest scales and love for your neighbor. Holiness is for everyone, and it looks like decency.', sourceUrl: hub(15581) }],
  [['beharbechukotai', 'beharbechukosai'], { name: 'Behar-Bechukotai', takeaway: 'The land rests, debts release, and blessing follows those who keep walking. Letting go on schedule and moving forward anyway — that is trust in practice.', sourceUrl: hub(15585) }],
  [['chukatbalak', 'chukasbalak'], { name: 'Chukat-Balak', takeaway: 'A law with no reason, and a blessing from an enemy\'s mouth — this double parsha teaches that trust outruns understanding, and what your home is speaks for itself.', sourceUrl: hub(45613) }],
  [['matotmasei', 'matosmassei', 'matosmasei'], { name: 'Matot-Masei', takeaway: 'Let your word hold, and honor every stop on the route — even the detours. A journey of forty-two encampments still arrives.', sourceUrl: hub(52599) }],
  [['nitzavimvayelech', 'nitzavimvayeilech'], { name: 'Nitzavim-Vayeilech', takeaway: '"It is not in heaven — it is very near to you." And Moshe, at 120, was still walking. The work is within reach, and it is never too late in the day to do it.', sourceUrl: hub(53151) }],
];

const INDEX = new Map<string, ParshaTakeaway>();
for (const [keys, entry] of T) for (const k of keys) INDEX.set(k, entry);

/** "Parashat Sh'lach" / "Shelach" / "Matot-Masei" → normalized lookup key */
const norm = (s: string) => s.toLowerCase().replace(/^parashat\s+/, '').replace(/[^a-z]/g, '');

/** Find the takeaway for a Hebcal/chabad parsha name; combined names fall back
 *  to their first half if the double entry is somehow missing. */
export function takeawayFor(parshaName: string): ParshaTakeaway | null {
  const whole = INDEX.get(norm(parshaName));
  if (whole) return whole;
  const bare = parshaName.replace(/^Parashat\s+/i, '');
  const first = bare.split(/[-–]/)[0];
  return INDEX.get(norm(first)) ?? null;
}

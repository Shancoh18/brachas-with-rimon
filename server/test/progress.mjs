/**
 * Streak + progress rule assertions — runs the REAL src/lib/progress.ts
 * (node type-stripping, so there is no second copy of the logic to drift).
 *
 * The rule under test is the SHABBAT GRACE: the app isn't used on Shabbat, so
 * a Friday → Sunday gap keeps the streak; every other skipped day resets it.
 * Both record paths (recordMeal at guide-finish, recordAfterBrachos for the
 * save-for-later flow) and the home-screen streakAlive check must agree.
 *
 * Run: node --experimental-strip-types server/test/progress.mjs
 * (wired into scripts/preflight.mjs)
 */
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { EMPTY_PROGRESS, isConsecutive, recordAfterBrachos, recordMeal, streakAlive } = await import(
  pathToFileURL(join(ROOT, 'src', 'lib', 'progress.ts')).href
);

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// ------------------------------------------------------------- fixture days
// A known week (September 2026): Thu 3 · Fri 4 · Sat 5 · Sun 6 · Mon 7.
const THU = '2026-09-03';
const FRI = '2026-09-04';
const SAT = '2026-09-05';
const SUN = '2026-09-06';
const MON = '2026-09-07';
const weekday = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};
check('fixture weekdays are what the cases assume', weekday(THU) === 4 && weekday(FRI) === 5 && weekday(SAT) === 6 && weekday(SUN) === 0 && weekday(MON) === 1);

/** a progress state whose last log was `lastDay` with streak `n` */
const withLast = (lastDay, n = 3) => ({ ...EMPTY_PROGRESS, streakCurrent: n, streakBest: n, lastActiveDay: lastDay, history: [{ day: lastDay, brachos: 1 }] });

// ------------------------------------------------------------ isConsecutive
check('isConsecutive: Thu → Fri', isConsecutive(THU, FRI) === true);
check('isConsecutive: Fri → Sun (Shabbat grace)', isConsecutive(FRI, SUN) === true);
check('isConsecutive: Thu → Sat is NOT (2-day gap not over Shabbat)', isConsecutive(THU, SAT) === false);
check('isConsecutive: Thu → Sun is NOT (3-day gap)', isConsecutive(THU, SUN) === false);
check('isConsecutive: Sat → Mon is NOT (skipped Sunday)', isConsecutive(SAT, MON) === false);
check('isConsecutive: same day is NOT consecutive', isConsecutive(FRI, FRI) === false);

// ----------------------------------------------------------------- recordMeal
{
  const r = recordMeal(withLast(THU), ['Hamotzi'], 0, FRI);
  check('recordMeal Thu → Fri keeps the streak (3 → 4)', r.streakCurrent === 4 && r.lastActiveDay === FRI, `streak=${r.streakCurrent}`);
}
{
  const r = recordMeal(withLast(FRI), ['Hamotzi'], 0, SUN);
  check('recordMeal Fri → Sun keeps the streak (Shabbat grace, 3 → 4)', r.streakCurrent === 4 && r.streakBest === 4, `streak=${r.streakCurrent}`);
}
{
  const r = recordMeal(withLast(THU), ['Hamotzi'], 0, SUN);
  check('recordMeal Thu → Sun resets the streak (→ 1)', r.streakCurrent === 1, `streak=${r.streakCurrent}`);
}
{
  const r = recordMeal(withLast(SAT), ['Hamotzi'], 0, MON);
  check('recordMeal Sat → Mon resets the streak (→ 1)', r.streakCurrent === 1, `streak=${r.streakCurrent}`);
}
{
  const before = withLast(FRI);
  const r = recordMeal(before, ['Haetz', 'Shehakol'], 0, FRI);
  check('recordMeal same day: streak unchanged, brachos still counted', r.streakCurrent === 3 && r.totalBrachos === 2 && r.history.length === 1 && r.history[0].brachos === 3, `streak=${r.streakCurrent} total=${r.totalBrachos}`);
}
{
  const r = recordMeal(EMPTY_PROGRESS, ['Hamotzi'], 0, SUN);
  check('recordMeal first ever log starts a streak of 1', r.streakCurrent === 1 && r.streakBest === 1 && r.lastActiveDay === SUN);
}

// --------------------------------------------------------- recordAfterBrachos
{
  const r = recordAfterBrachos(withLast(FRI), ['BoreiNefashos'], SUN);
  check('recordAfterBrachos Fri → Sun keeps the streak (Shabbat grace)', r.streakCurrent === 4, `streak=${r.streakCurrent}`);
}
{
  const r = recordAfterBrachos(withLast(THU), ['BoreiNefashos'], SUN);
  check('recordAfterBrachos Thu → Sun resets the streak', r.streakCurrent === 1, `streak=${r.streakCurrent}`);
}
{
  const r = recordAfterBrachos(withLast(SUN), ['BoreiNefashos'], SUN);
  check('recordAfterBrachos same day: streak unchanged', r.streakCurrent === 3 && r.totalBrachos === 1);
}
check('recordAfterBrachos with nothing said is a no-op', recordAfterBrachos(withLast(THU), [], SUN).streakCurrent === 3);

// ---------------------------------------------------------------- streakAlive
check('streakAlive on Sunday after a Friday log is TRUE (Shabbat grace)', streakAlive(withLast(FRI), SUN) === true);
check('streakAlive on Friday after a Thursday log is TRUE', streakAlive(withLast(THU), FRI) === true);
check('streakAlive same day is TRUE', streakAlive(withLast(SUN), SUN) === true);
check('streakAlive on Sunday after a Thursday log is FALSE', streakAlive(withLast(THU), SUN) === false);
check('streakAlive on Monday after a Saturday log is FALSE', streakAlive(withLast(SAT), MON) === false);
check('streakAlive with no log ever is FALSE', streakAlive(EMPTY_PROGRESS, SUN) === false);

console.log(failures === 0 ? '\nPROGRESS: ALL PASS' : `\nPROGRESS: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

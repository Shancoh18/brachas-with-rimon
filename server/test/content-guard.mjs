/**
 * Unit tests for server/content-guard.mjs — run: node server/test/content-guard.mjs
 * (also wired into scripts/preflight.mjs). PASS/FAIL lines like e2e.mjs.
 */
import { cleanProse, proseProblems, guardProse, guardLine } from '../content-guard.mjs';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// --- the 2026-09-05 production digest (cite tags copied from web_search)
const LIVE = `Today's lesson is built on the seventh reading of the parshah, Moses' declaration to the Jewish people: <cite index="43-7,43-8">“Behold, I have set before you today life and good and death and evil. Choose life!” Deuteronomy 30:15 · It is not always clear that good behavior leads to blessings and life and that bad behavior leads to curses and death.</cite>

The lesson takes that ambiguity as the very heart of free choice. <cite index="43-9,43-10">This allows us the free will to choose to be good, since if it were always obvious that good behavior leads to blessing and bad leads to the opposite, there would be no real choice but to be good.</cite>

The deeper teaching: <cite index="43-11">the very fact that being good does not always lead to goodness both forces us and enables us to base our relationship with G‑d on a more profound basis.</cite> In other words, the lack of guaranteed, visible reward isn't a flaw — it's what makes our service genuine rather than transactional.

The takeaway is that <cite index="43-12">on a deeper level, G‑d — through Moses — is asking us to be good for its own sake, rather than for expectation of material reward, even in the moments we do see clearly that being good leads to good results.</cite> True devotion means choosing life and goodness because it's right, not merely because it pays off.`;
const cleaned = cleanProse(LIVE);
check('cite tags stripped', !/<\/?cite/i.test(cleaned) && !/index=/.test(cleaned));
check('quoted words kept', cleaned.includes('Choose life!') && cleaned.includes('profound basis'));
check('paragraph breaks kept', cleaned.split('\n\n').length === 4, `${cleaned.split('\n\n').length} paragraphs`);
check('cleaned live digest passes', guardProse(LIVE, { minChars: 400, minSentences: 3 }).ok, guardProse(LIVE, { minChars: 400, minSentences: 3 }).problems.join(','));

// --- refusal / cannot-reach text must FAIL even when long enough
const REFUSALS = [
  "I was unable to access the chabad.org Daily Wisdom page for today. The site appears to be blocked by Cloudflare and I could not retrieve the lesson content. Based on my knowledge of the parsha, this week's reading discusses Moses' final address, and a lesson might cover choosing life. Since I cannot verify the exact lesson, I am writing a general reflection instead. This is not the actual page content and I do not know what to write for today's specific teaching without the source.",
  "I couldn't find today's lesson in the search results. The search did not return the Daily Wisdom page for this parsha. Here is a general Torah thought instead: the parsha teaches us about return and renewal, and about the choice between life and good. Every day offers a fresh opportunity to choose well and to grow closer to what matters. This reflection is not from the page.",
  "Just a moment... Checking your browser before accessing www.chabad.org. This process is automatic. Your browser will redirect to your requested content shortly. Please allow up to 5 seconds. DDoS protection by Cloudflare. Ray ID: 8f2a9c1b3d4e5f60. Please enable cookies and JavaScript to continue to the site and read the lesson content.",
  "Sorry, I am not able to retrieve the article today. As an AI I don't have access to the page contents. The lesson is probably about teshuvah, which is the theme of this season, and how each person can return to G-d with a whole heart. I will write a short reflection in that spirit for the app to display until the real lesson can be loaded from the website tomorrow.",
];
for (const [i, r] of REFUSALS.entries()) {
  const g = guardProse(r, { minChars: 200, minSentences: 3 });
  check(`refusal #${i + 1} rejected`, !g.ok && g.problems.includes('refusal'), g.problems.join(','));
}

// --- legitimate prose that mentions inability in a TEACHING sense must pass
const TEACHING =
  'The Rebbe explains that a person cannot see the whole picture from within the moment. We are not able to measure the effect of one kind act, and that is precisely the point: the mitzvah is done for its own sake. When Moses set life and good before the people, he asked them to choose life without a guarantee of visible reward. That choice, made freely, is what makes a relationship with G-d real rather than transactional. The lesson closes with a practical thought: begin the day with one small act of goodness, and let its reach remain unknown to you.';
check('teaching prose passes', guardProse(TEACHING, { minChars: 400, minSentences: 3 }).ok, guardProse(TEACHING, { minChars: 400, minSentences: 3 }).problems.join(','));

// --- markup variants
check('html tags flagged', proseProblems('<p>Hello world, this is a paragraph of prose that is long enough to be checked.</p>').includes('markup'));
check('markdown heading flagged', proseProblems('# Today\'s lesson\nThe lesson says something meaningful about life and choice and goodness.').includes('markup'));
check('url flagged by default', proseProblems('Read more at https://www.chabad.org/dailystudy — the lesson covers choosing life every day.').includes('markup'));
check('url allowed when opted in', !proseProblems('Read more at https://www.chabad.org/dailystudy — the lesson covers choosing life every day.', { allowUrls: true }).includes('markup'));
check('bracket citation removed', cleanProse('Choose life [1] every day [2, 3].') === 'Choose life every day.');
check('entities decoded', cleanProse('G&#8209;d &amp; life &ndash; good') === 'G‑d & life – good');
check('too short flagged', proseProblems('Short.', { minChars: 50 }).includes('too_short'));
check('json-ish rejected', proseProblems('{"found": true, "title": "x", "digest": "0123456789 0123456789 0123456789 0123456789"}').includes('low_letter_ratio'));

// --- guardLine
check('title cleaned', guardLine('<b>Free Choice</b> and Reward').text === 'Free Choice and Reward');
check('refusal title rejected', !guardLine('Unable to access today\'s lesson').ok);

console.log(failures ? `\nCONTENT-GUARD: ${failures} FAIL` : '\nCONTENT-GUARD: ALL PASS');
process.exit(failures ? 1 : 0);

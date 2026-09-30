/**
 * Daily Wisdom lookup for the Learn tab's daily thought — the request the
 * server sends and the checks it runs on the answer. Pure functions (no I/O),
 * so server/test/daily-thought.mjs can exercise every rule without spending.
 *
 * Why v4 (2026-09-29): v3 asked the model to FIND today's lesson with
 * web_search. The search index simply lacks many of the day-lessons (Ha'azinu's
 * Monday, V'zot Haberacha's Wednesday–Friday, …), so 8 of the 24 days from
 * 2026-09-06 went stale after up to 8 paid attempts each (~110–145k input
 * tokens per attempt), and on 2026-09-19 it served V'zot Haberacha's Shabbat
 * lesson labelled as Ha'azinu's — the only cross-check was a parsha field the
 * prompt told the model to echo.
 *
 * v4 asks chabad.org itself: dailywisdom.asp?tdate=M/D/YYYY serves the exact
 * lesson of any date (its own mapping — holiday weeks and combined parshiyot
 * included). A plain server fetch gets Cloudflare's challenge page, but the
 * web_fetch server tool reads it. The model only fetches that one address and
 * writes the digest; the SERVER then checks the page web_fetch actually
 * returned — a Daily Wisdom lesson (canonical URL), carrying today's date line,
 * and the one the report points at. Title, URL and parsha label come from that
 * page, never from the model.
 */
import { guardLine, guardProse } from './content-guard.mjs';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Spelling-tolerant parsha key — Vayelech/Vayeilech, Bereshit/Bereishit,
 *  Ha'azinu/Haazinu, Vezot Haberakhah/Vezot Hab'rachah collapse to one
 *  consonant skeleton. */
export const canonParsha = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/^\s*(?:parashat|parshat|parshas|parsha)\s+/, '')
    .replace(/[^a-z]/g, '')
    .replace(/kh/g, 'ch')
    .replace(/[aeiou]/g, '')
    .replace(/(.)\1+/g, '$1');

/** Same parsha, allowing either half of a combined week ('Nitzavim-Vayeilech'). */
export const sameParsha = (a, b) => {
  const forms = (s) => [String(s || ''), ...String(s || '').split('-')].map(canonParsha).filter(Boolean);
  const fa = new Set(forms(a));
  return forms(b).some((f) => fa.has(f));
};

const ymd = (dateKey) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) throw new Error(`bad date key ${dateKey}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** chabad.org's page for one date's lesson — the address its own "Today's
 *  Lesson" navigation steps through. */
export const dailyWisdomUrl = (dateKey) => {
  const [y, m, d] = ymd(dateKey);
  return `https://www.chabad.org/dailystudy/dailywisdom.asp?tdate=${m}/${d}/${y}`;
};

/** The civil date as the lesson page prints it ("… 5787 / September 23, 2026"). */
export const englishDate = (dateKey) => {
  const [y, m, d] = ymd(dateKey);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

/** The Daily Wisdom lesson id in a chabad.org URL, or null for anything else. */
export const lessonAid = (href) => {
  try {
    const u = new URL(String(href));
    if (u.hostname.replace(/^www\./, '').toLowerCase() !== 'chabad.org') return null;
    return (/^\/dailystudy\/dailywisdom_cdo\/aid\/(\d+)(?:\/|$)/i.exec(u.pathname) || [])[1] || null;
  } catch {
    return null;
  }
};

export const THOUGHT_TOOL = {
  name: 'report_daily_thought',
  description: "Report today's Daily Wisdom lesson as a faithful digest.",
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'true only when web_fetch returned the Daily Wisdom lesson page' },
      digest: {
        type: 'string',
        description:
          'a faithful 150-220 word digest of the lesson IN YOUR OWN WORDS as plain prose paragraphs — cover its full arc (verse, question, teaching, takeaway); only what the lesson itself says (not reader comments or site text); no tags, citation markers, markdown or URLs',
      },
      url: { type: 'string', description: "the lesson page's canonical chabad.org address (the dailywisdom_cdo/aid/… URL the page names), or the address you fetched" },
    },
    required: ['found'],
  },
};

// web_fetch only opens addresses that already appear in the conversation — the
// user turn below carries exactly one. max_uses 2 leaves room for one retry of
// a transient fetch failure; max_content_tokens bounds a page that is mostly
// navigation and reader comments (the lesson itself is a few hundred words).
// The BASIC variant on purpose: measured 2026-09-29 on 10 known days (claude-
// sonnet-5), web_fetch_20250910 got 10/10 right in one fetch each (~20k input
// tokens, ~10 s); the dynamic-filtering web_fetch_20260209 got 9/10 (~47k,
// ~27 s) — it fetches from inside a code sandbox, and on 2026-10-06 the model
// fumbled parsing the result there and spent both fetches without reading the
// page. One known page needs no filtering.
export const WEB_FETCH_TOOL = { type: 'web_fetch_20250910', name: 'web_fetch', allowed_domains: ['chabad.org'], max_uses: 2, max_content_tokens: 12000 };

const SYSTEM = `You digest ONE page for a Jewish learning app: today's lesson in chabad.org's
"Daily Wisdom" series, a short Torah thought adapted from the Rebbe's teachings.
The user gives you the exact chabad.org address that serves today's lesson. Open
that address with web_fetch — no other page — then report via report_daily_thought.
Digest ONLY the lesson on that page, in your own words: its verse, its question,
its teaching and its takeaway. Never pad it with your own Torah, never mix in
another lesson, and ignore the site's navigation, other articles and reader
comments. Write plain prose paragraphs separated by blank lines, with no HTML/XML
tags, citation markers like <cite> or [1], markdown or URLs inside the digest.
If the fetch fails or the page is not a Daily Wisdom lesson, report found:false —
never write about being unable to access it.`;

/** The Messages API request for one New York day. */
export const thoughtRequest = ({ dateKey, weekday, model }) => ({
  model,
  max_tokens: 3000,
  system: SYSTEM,
  tools: [WEB_FETCH_TOOL, THOUGHT_TOOL],
  messages: [
    {
      role: 'user',
      content: `Today is ${weekday}, ${englishDate(dateKey)} (New York). chabad.org serves today's Daily Wisdom lesson at ${dailyWisdomUrl(dateKey)} — fetch it and digest it.`,
    },
  ],
});

/** One field of the front-matter block web_fetch puts at the top of a page
 *  ("---\ncanonical: …\ntitle: …\n---"). Read line by line, so an empty
 *  field can never swallow the next one. */
const frontField = (text, name) => {
  const lines = String(text).split('\n', 80);
  if (lines[0]?.trim() !== '---') return '';
  for (let i = 1; i < lines.length && lines[i].trim() !== '---'; i++)
    if (lines[i].startsWith(`${name}:`)) return lines[i].slice(name.length + 1).trim();
  return '';
};

/** Every page web_fetch returned in these content blocks, plus the fetch
 *  errors (for the reject reason). Only a web_fetch_result is evidence — a
 *  URL the model merely typed proves nothing. */
export const fetchedPages = (content) => {
  const pages = [];
  const errors = [];
  for (const c of content ?? []) {
    if (c?.type !== 'web_fetch_tool_result') continue;
    const r = c.content;
    if (r?.type !== 'web_fetch_result') {
      errors.push(String(r?.error_code || r?.type || 'unknown'));
      continue;
    }
    const doc = r.content;
    const text = doc?.source?.type === 'text' && typeof doc.source.data === 'string' ? doc.source.data : '';
    const canonical = frontField(text, 'canonical');
    const keywords = frontField(text, 'meta-keywords');
    pages.push({
      url: String(r.url || ''),
      canonical,
      aid: lessonAid(canonical),
      title: String(doc?.title || frontField(text, 'meta-og:title') || frontField(text, 'title') || ''),
      // "… Parshah (Weekly Torah Reading) Vezot Hab'rachah The Lubavitcher Rebbe, …"
      parsha: (/Parshah \(Weekly Torah Reading\)\s+(.+?)(?:\s+The Lubavitcher\b|,|$)/.exec(keywords) || [])[1]?.trim() || '',
      text,
    });
  }
  return { pages, errors };
};

/** Was this page fetched from the day's OWN address? Only that page is
 *  evidence of which lesson belongs to the day: a lesson page fetched by its
 *  own aid URL prints TODAY'S date in its header whatever lesson it is
 *  (review 2026-09-29, reproduced on real pages). Compared by host, path and
 *  the tdate value, so http/https or www/bare-host variants still match. */
export const isDayAddress = (href, dateKey) => {
  try {
    const u = new URL(String(href));
    const want = new URL(dailyWisdomUrl(dateKey));
    return u.hostname.replace(/^www\./, '').toLowerCase() === 'chabad.org' &&
      u.pathname.toLowerCase() === want.pathname.toLowerCase() &&
      u.searchParams.get('tdate') === want.searchParams.get('tdate');
  } catch {
    return false;
  }
};

/** Does the page's lesson header carry this date? The header is the FIRST
 *  line shaped "Wednesday, 12 Tishrei 5787 / September 23, 2026" (the site
 *  header writes its own date "Tishrei 18, 5787", and a later line — a reader
 *  comment, another article — never counts). */
const DATE_LINE = new RegExp(`^(?:${WEEKDAYS.join('|')}|Saturday), [^\\n/]{3,40} / ([A-Z][a-z]+ \\d{1,2}, \\d{4})[ \\t]*$`, 'm');
export const pageIsDated = (text, dateKey) => (DATE_LINE.exec(String(text || '')) || [])[1] === englishDate(dateKey);

/** "Wednesday: Battling Intimidation - Fourth Reading: Deuteronomy 33:18–21 - Chabad.org" → "Battling Intimidation". */
export const lessonTitle = (raw) =>
  String(raw || '')
    .replace(/\s+-\s+Chabad\.org\s*$/i, '')
    .replace(/\s+-\s+(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh)\s+Reading\b.*$/i, '')
    .replace(new RegExp(`^\\s*(?:${WEEKDAYS.join('|')}|Saturday)\\s*:\\s*`, 'i'), '')
    .trim();

/** Check a response against the page web_fetch really returned. Resolves
 *  { ok: true, record } or { ok: false, reason }; `pinName` (Hebcal's parsha,
 *  may be null) only chooses the label's spelling when it names the same
 *  parsha as the page — it never supplies a parsha the page doesn't show. */
export function verifyThought(content, { dateKey, weekday, pinName = null }) {
  const no = (reason) => ({ ok: false, reason });
  const { pages, errors } = fetchedPages(content);
  // what web_fetch actually saw — so a blocked fetcher (Cloudflare challenge,
  // url_not_accessible) is told apart from a refusal in /api/status
  const seen = errors.length
    ? `fetch errors: ${errors.join(',')}`
    : pages.length
      ? `fetched: ${pages.map((p) => (p.aid ? `aid ${p.aid}` : JSON.stringify(p.title.slice(0, 40)))).join(',')}`
      : 'no fetch made';
  // the LAST report counts — a continued (pause_turn) turn may carry more than one
  const t = (content ?? []).findLast((c) => c?.type === 'tool_use' && c.name === 'report_daily_thought')?.input;
  if (!t) return no(`no report_daily_thought tool call (${seen})`);
  if (t.found !== true) return no(`found:false (${seen})`);
  const lessons = pages.filter((p) => p.aid);
  if (!lessons.length) return no(`no Daily Wisdom page fetched${errors.length ? ` (${errors.join(',')})` : pages.length ? ' (not a lesson page)' : ''}`);
  const dayPage = lessons.find((p) => isDayAddress(p.url, dateKey)) || null;
  if (!dayPage) return no(`the day's address was not fetched (${seen})`);
  if (!pageIsDated(dayPage.text, dateKey)) return no(`the day's page is not dated ${englishDate(dateKey)} (aid ${dayPage.aid})`);
  // The report must point at that lesson — its canonical id or the day's
  // address. With no URL it is accepted only when no OTHER lesson was fetched
  // (otherwise the digest may be of that one); a report naming a different
  // lesson is rejected rather than guessed.
  const want = String(t.url || '');
  const wantAid = lessonAid(want);
  const others = lessons.filter((p) => p.aid !== dayPage.aid);
  const pointsAtDay = (wantAid && wantAid === dayPage.aid) || (!!want && isDayAddress(want, dateKey));
  if (!pointsAtDay && (want || others.length))
    return no(`report url is not the day's lesson (${(wantAid ? `aid ${wantAid}` : want || 'none').slice(0, 80)} vs aid ${dayPage.aid}${others.length ? `; also fetched aid ${others.map((p) => p.aid).join(',')}` : ''})`);
  const digest = guardProse(t.digest, { minChars: 400, minSentences: 3 });
  if (!digest.ok) return no(`digest ${digest.problems.join(',')}`);
  const title = guardLine(lessonTitle(dayPage.title), 120);
  if (!title.ok) return no(`title ${title.problems.join(',') || 'empty'}`);
  const parsha = dayPage.parsha ? (pinName && sameParsha(pinName, dayPage.parsha) ? pinName : dayPage.parsha) : null;
  return {
    ok: true,
    record: {
      dateKey,
      title: title.text,
      parsha,
      dayLabel: parsha ? `${weekday} · Parshat ${parsha}` : weekday, // server-built — never the model's
      digest: digest.text.slice(0, 2400),
      // the page's lesson path on https://www.chabad.org — never an http:// or
      // query-carrying variant of the canonical link
      url: `https://www.chabad.org${new URL(dayPage.canonical).pathname}`,
      aid: dayPage.aid,
      fetched: Date.now(),
    },
  };
}

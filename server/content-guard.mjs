/**
 * Content guard for MODEL-WRITTEN text that reaches a reader (the Daily
 * Thought digest, learned-food notes, product summaries).
 *
 * Why this exists (incident 2026-09): the Daily Wisdom digest shipped with
 * literal `<cite index="43-7,43-8">…</cite>` markup copied from the web_search
 * tool result, and on other days the model — unable to load chabad.org — wrote
 * a "digest" that was really a note about not being able to reach the site.
 * Both passed the old checks (URL host + parsha + length ≥ 400). A reader
 * must NEVER see markup, tool artefacts, or the model talking about itself.
 *
 *   cleanProse(text)      → text with citation/HTML/markdown artefacts removed
 *   proseProblems(text)   → [] when the text is real prose, else reason codes
 *   guardProse(text, opt) → { ok, text, problems }   (clean + validate)
 *
 * Dependency-free; unit-tested by server/test/content-guard.mjs.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

/** Strip tags/markdown/tool artefacts but keep the words and paragraph breaks. */
export function cleanProse(input) {
  let s = String(input ?? '');
  // tool citation wrappers — keep the quoted words, drop the wrapper
  s = s.replace(/<\/?cite\b[^>]*>/gi, '');
  s = s.replace(/<\/?(?:antml:)?(?:citation|source|quote|document|search_result|result)s?\b[^>]*>/gi, '');
  // bracketed citation markers: [1], [12], 【3】, ^1
  s = s.replace(/\s?[\[【]\s?\d{1,3}(?:[-–,]\s?\d{1,3})*\s?[\]】]/g, '');
  // any other HTML/XML tag
  s = s.replace(/<[^>\n]{1,200}>/g, '');
  // markdown emphasis / headings / code fences
  s = s.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1');
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
  // entities
  s = s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : ' ';
    }
    return ENTITIES[e.toLowerCase()] ?? ' ';
  });
  // whitespace: keep paragraph breaks, collapse the rest
  s = s.replace(/\r/g, '').replace(/[ \t\f\v]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Phrases a model writes ABOUT ITS OWN FAILURE — never legitimate content. */
const REFUSAL_PATTERNS = [
  /\b(?:i|we)\s*(?:was|am|were|are|'m|'re)?\s*(?:unable|not able)\s+to\s+(?:access|reach|retrieve|open|find|locate|load|fetch|verify|view|read|browse|confirm|obtain)\b/i,
  /\b(?:i|we)\s*(?:could|can|did|do)\s*(?:n't|not)\s+(?:access|reach|retrieve|open|find|locate|load|fetch|verify|view|read|browse|confirm|obtain)\b/i,
  /\b(?:couldn't|cannot|can't|could not|unable to)\s+(?:access|reach|retrieve|open|find|locate|load|fetch|verify|view|read|browse|obtain)\s+(?:the|this|that|today|any|a)\b/i,
  /\b(?:as an ai|as a language model|as an assistant|i do not have (?:access|the ability)|i don't have (?:access|the ability)|i lack access)\b/i,
  /\b(?:the )?(?:page|site|website|article|lesson|search)\s+(?:is|was|appears|seems)\s+(?:unavailable|blocked|inaccessible|not accessible|not available|not reachable|down)\b/i,
  /\b(?:no|zero)\s+(?:search\s+)?results?\s+(?:were|was)?\s*(?:found|returned|available)\b/i,
  /\b(?:search|the search|my search|web search)\s+(?:did not|didn't|does not|doesn't|failed to)\s+(?:return|find|locate|surface|yield)\b/i,
  /\b(?:just a moment|cloudflare|captcha|access denied|403 forbidden|error 403|blocked by)\b/i,
  /\b(?:i(?:'m| am) sorry|i apologi[sz]e|unfortunately,? i)\b/i,
  /\b(?:placeholder|lorem ipsum|to be determined|tbd)\b/i,
  /\b(?:i (?:do not|don't|cannot|can't) know what to (?:write|say)|not sure what to write|i will (?:make up|invent|fabricate))\b/i,
  /\b(?:based on my (?:own )?knowledge|from my training|from memory)\b/i,
  /\b(?:report_daily_thought|report_food_entry|report_product|tool_use|function call|json)\b/i,
];

const MARKUP_PATTERNS = [/<[a-z!/][^>]{0,200}>/i, /\bcite index=/i, /\[\d{1,3}\]/, /```/, /^\s{0,3}#{1,6}\s/m, /\*\*[^*]+\*\*/, /https?:\/\//i];

/**
 * Reasons the text is NOT safe to show. Empty array = fine.
 *  - too_short           fewer than opt.minChars letters+punctuation
 *  - markup              still contains tags / citation markers / markdown / URLs
 *  - refusal             model talking about failing to access / its own limits
 *  - too_few_sentences   fewer than opt.minSentences sentence ends
 *  - low_letter_ratio    mostly symbols/numbers (garbage, tables, JSON)
 */
export function proseProblems(text, opt = {}) {
  const { minChars = 0, minSentences = 0, allowUrls = false } = opt;
  const s = String(text ?? '');
  const problems = [];
  if (s.length < minChars) problems.push('too_short');
  for (const re of MARKUP_PATTERNS) {
    if (allowUrls && re.source.includes('https')) continue;
    if (re.test(s)) { problems.push('markup'); break; }
  }
  for (const re of REFUSAL_PATTERNS) {
    if (re.test(s)) { problems.push('refusal'); break; }
  }
  if (minSentences > 0) {
    const ends = (s.match(/[.!?…](?:\s|$|["'”’)])/g) || []).length;
    if (ends < minSentences) problems.push('too_few_sentences');
  }
  if (s.length >= 40) {
    const letters = (s.match(/[\p{L}]/gu) || []).length;
    if (letters / s.length < 0.6) problems.push('low_letter_ratio');
  }
  return problems;
}

/** Clean, then validate. Returns { ok, text, problems }. */
export function guardProse(input, opt = {}) {
  const text = cleanProse(input);
  const problems = proseProblems(text, opt);
  return { ok: problems.length === 0, text, problems };
}

/** Short single-line fields (titles, labels): strip everything, cap length. */
export function guardLine(input, max = 120) {
  const text = cleanProse(input).replace(/\n+/g, ' ').trim().slice(0, max);
  const problems = proseProblems(text, {});
  return { ok: text.length > 0 && problems.length === 0, text, problems };
}

/**
 * Daily thought (Learn tab) — the v4 Daily Wisdom lookup, 2026-09-29.
 *
 * v3 asked the model to FIND today's lesson with web_search; the index lacks
 * many day-lessons, so ~1 day in 3 went stale, and on 2026-09-19 it served
 * V'zot Haberacha's Shabbat lesson labelled as Ha'azinu's. v4 fetches
 * chabad.org's dated lesson page and the SERVER verifies the page web_fetch
 * returned. This suite locks in:
 *  - the request: web_fetch only (no web_search), locked to chabad.org, on the
 *    dated address for the New York day;
 *  - every reject rule: no report / found:false / nothing fetched / fetch
 *    error / not a lesson page / a page dated another day (the 09-19 case) /
 *    a report naming another lesson / a digest the content guard refuses;
 *  - title, URL and parsha label come from the page, never the model;
 *  - end to end against the REAL server + a mock Anthropic, including a
 *    pause_turn continuation.
 * Pages here are synthetic (no chabad.org text). Never spends.
 *
 * Run:  node server/test/daily-thought.mjs   (wired into scripts/preflight.mjs)
 */
import { spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  WEEKDAYS, canonParsha, dailyWisdomUrl, englishDate, lessonAid, lessonTitle, pageIsDated, sameParsha, thoughtRequest, verifyThought,
} from '../daily-thought.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, '..', 'server.mjs');
const PORT = 5199;

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ fixtures
const DIGEST =
  'The lesson opens with a verse about a tribe that guarded the border of the land and asks why that role is singled out for praise.\n\n' +
  'It answers that guarding a boundary means standing firm when others hesitate, and that courage of this kind is itself a form of service.\n\n' +
  'The takeaway is practical: when doubt or intimidation holds us back from doing good, we should act anyway, trusting that the strength will come as we go.';
const lessonPage = ({ aid = '5000001', dateKey = '2026-09-23', weekday = 'Wednesday', title = 'Battling Doubt', parsha = "Vezot Hab'rachah", canonicalHost = 'www.chabad.org', path = 'dailystudy/dailywisdom_cdo' } = {}) => {
  const canonical = `https://${canonicalHost}/${path}/aid/${aid}/jewish/${title.replace(/\W+/g, '-')}.htm`;
  return {
    canonical,
    text:
      `---\ncanonical: ${canonical}\nmeta-keywords: ${weekday}:,${title.split(' ').join(',')}, Parshah (Weekly Torah Reading) ${parsha} The Lubavitcher Rebbe, R. Menachem Mendel Schneerson\n` +
      `meta-og:title: ${weekday}: ${title} - Fourth Reading: Deuteronomy 33:18–21\ntitle: ${weekday}: ${title} - Fourth Reading: Deuteronomy 33:18–21 - Chabad.org\n---\n\n` +
      `[Join the appeal](https://www.chabad.org/tools/donate)\n\nTishrei 18, 5787\n\n# ${weekday}: ${title}\n\n${weekday}, 12 Tishrei 5787 / ${englishDate(dateKey)}\n\n` +
      'A synthetic lesson paragraph for tests.\n\n## Comments\nReader, October 3, 2023: thank you.\n',
    docTitle: `${weekday}: ${title} - Fourth Reading: Deuteronomy 33:18–21`,
  };
};
let seq = 0;
const fetchBlocks = (fetchUrl, page) => {
  const id = `srvtoolu_${++seq}`;
  return [
    { type: 'server_tool_use', id, name: 'web_fetch', input: { url: fetchUrl } },
    { type: 'web_fetch_tool_result', tool_use_id: id, content: { type: 'web_fetch_result', url: fetchUrl, retrieved_at: '2026-09-23T12:00:00', content: { type: 'document', title: page.docTitle, source: { type: 'text', media_type: 'text/plain', data: page.text } } } },
  ];
};
const fetchError = (fetchUrl, code = 'url_not_accessible') => {
  const id = `srvtoolu_${++seq}`;
  return [
    { type: 'server_tool_use', id, name: 'web_fetch', input: { url: fetchUrl } },
    { type: 'web_fetch_tool_result', tool_use_id: id, content: { type: 'web_fetch_tool_result_error', error_code: code } },
  ];
};
const report = (input) => ({ type: 'tool_use', id: `toolu_${++seq}`, name: 'report_daily_thought', input });

// ------------------------------------------------------------ pure helpers
check('dated address = chabad.org dailywisdom.asp?tdate=M/D/YYYY (no zero padding)', dailyWisdomUrl('2026-09-03') === 'https://www.chabad.org/dailystudy/dailywisdom.asp?tdate=9/3/2026', dailyWisdomUrl('2026-09-03'));
check('englishDate prints the page\'s format', englishDate('2026-10-06') === 'October 6, 2026', englishDate('2026-10-06'));
check('lessonAid reads a Daily Wisdom lesson id (www or bare host)', lessonAid('https://www.chabad.org/dailystudy/dailywisdom_cdo/aid/2955576/jewish/X.htm') === '2955576' && lessonAid('https://chabad.org/dailystudy/dailywisdom_cdo/aid/42/') === '42');
check('lessonAid refuses other sections, other hosts and junk', lessonAid('https://www.chabad.org/library/article_cdo/aid/2955576/jewish/X.htm') === null && lessonAid('https://chabad.org.evil.com/dailystudy/dailywisdom_cdo/aid/1/') === null && lessonAid('not a url') === null && lessonAid('https://www.chabad.org/dailystudy/dailywisdom.asp?tdate=9/23/2026') === null);
check('lessonTitle strips weekday, reading and site suffix', lessonTitle('Wednesday: Battling Intimidation and Hesitation - Fourth Reading: Deuteronomy 33:18–21 - Chabad.org') === 'Battling Intimidation and Hesitation' && lessonTitle('Shabbat: G-d’s Guide to Life - Seventh Reading: Deuteronomy 32:44–52') === 'G-d’s Guide to Life');
check('canonParsha / sameParsha: chabad and Hebcal spellings meet', canonParsha("Vezot Hab'rachah") === canonParsha('Vezot Haberakhah') && sameParsha("Ha'azinu", 'Haazinu') && sameParsha('Nitzavim-Vayeilech', 'Vayelech') && !sameParsha('Bereshit', "Vezot Hab'rachah"));
check('pageIsDated: the lesson\'s own date line counts', pageIsDated(lessonPage().text, '2026-09-23'));
check('pageIsDated: the site header ("Tishrei 18, 5787") and a reader comment date do not', !pageIsDated(lessonPage().text, '2026-09-29') && !pageIsDated('Reader, September 23, 2026: thanks\n', '2026-09-23'));
const noFront = lessonPage();
noFront.text = noFront.text.replace(/^---\n/, '');
check('front matter is read only from the leading --- block (a body line "canonical: …" is not evidence)', verifyThought([...fetchBlocks(dailyWisdomUrl('2026-09-23'), noFront), report({ found: true, url: noFront.canonical, digest: 'x' })], { dateKey: '2026-09-23', weekday: 'Wednesday' }).reason?.includes('not a lesson page'));

const req = thoughtRequest({ dateKey: '2026-09-23', weekday: 'Wednesday', model: 'claude-sonnet-5' });
const toolTypes = req.tools.map((t) => t.type || t.name);
check('request: basic web_fetch (measured best for one known page) + the report tool, and NO web_search', req.tools[0].type === 'web_fetch_20250910' && req.tools[1].name === 'report_daily_thought' && !toolTypes.some((t) => /web_search/.test(t)), toolTypes.join(','));
check('request: web_fetch locked to chabad.org, bounded uses and page size', JSON.stringify(req.tools[0].allowed_domains) === '["chabad.org"]' && req.tools[0].max_uses <= 3 && req.tools[0].max_content_tokens > 0);
check('request: the user turn carries exactly the dated address for that day', req.messages.length === 1 && req.messages[0].content.includes(dailyWisdomUrl('2026-09-23')) && (req.messages[0].content.match(/https?:\/\//g) || []).length === 1, req.messages[0].content);
check('request: model passes through; no forced tool_choice (400s on newer models)', req.model === 'claude-sonnet-5' && req.tool_choice === undefined);

// ------------------------------------------------------------ verifyThought
const D = '2026-09-23', W = 'Wednesday', URL0 = dailyWisdomUrl(D);
const good = lessonPage();
const ok1 = verifyThought([...fetchBlocks(URL0, good), report({ found: true, url: good.canonical, digest: DIGEST })], { dateKey: D, weekday: W, pinName: 'Vezot Haberakhah' });
check('accept: dated lesson page + report pointing at it', ok1.ok, ok1.reason);
check('…url = the page\'s canonical lesson URL; aid recorded', ok1.record?.url === good.canonical && ok1.record?.aid === '5000001', JSON.stringify(ok1.record));
check('…title from the page (weekday + reading stripped), not the model', ok1.record?.title === 'Battling Doubt', ok1.record?.title);
const httpPage = lessonPage();
httpPage.text = httpPage.text.replace(/^canonical: https:\/\/www\.chabad\.org(\S+)$/m, 'canonical: http://chabad.org$1?utm=x');
const okHttp = verifyThought([...fetchBlocks(URL0, httpPage), report({ found: true, digest: DIGEST })], { dateKey: D, weekday: W });
check('…an http:// or query-carrying canonical is stored as the https://www.chabad.org lesson path', okHttp.ok && okHttp.record?.url === good.canonical, okHttp.reason || okHttp.record?.url);
check('…label uses Hebcal\'s spelling when it names the page\'s parsha', ok1.record?.dayLabel === 'Wednesday · Parshat Vezot Haberakhah' && ok1.record?.parsha === 'Vezot Haberakhah', ok1.record?.dayLabel);
const ok2 = verifyThought([...fetchBlocks(URL0, good), report({ found: true, url: URL0, digest: DIGEST })], { dateKey: D, weekday: W, pinName: 'Bereshit' });
check('accept: report may name the fetched (dated) address instead of the canonical one', ok2.ok, ok2.reason);
check('…a Hebcal pin that disagrees with the page loses — chabad.org decides its own lesson', ok2.record?.dayLabel === "Wednesday · Parshat Vezot Hab'rachah", ok2.record?.dayLabel);
const ok3 = verifyThought([...fetchBlocks(URL0, good), report({ found: true, digest: DIGEST })], { dateKey: D, weekday: W, pinName: null });
check('accept: no url in the report but exactly one dated page; Hebcal down → page\'s parsha', ok3.ok && ok3.record?.parsha === "Vezot Hab'rachah", ok3.reason || ok3.record?.dayLabel);
const noParsha = lessonPage({ parsha: '' });
noParsha.text = noParsha.text.replace(/, Parshah \(Weekly Torah Reading\) +The Lubavitcher/, ', The Lubavitcher');
const ok4 = verifyThought([...fetchBlocks(URL0, noParsha), report({ found: true, url: noParsha.canonical, digest: DIGEST })], { dateKey: D, weekday: W, pinName: null });
check('accept: no parsha anywhere → label is just the weekday', ok4.ok && ok4.record?.dayLabel === 'Wednesday' && ok4.record?.parsha === null, ok4.reason || ok4.record?.dayLabel);
const pausedContent = [...fetchBlocks(URL0, good), { type: 'text', text: '' }, report({ found: true, url: good.canonical, digest: DIGEST })];
check('accept: evidence and report split across a pause_turn continuation', verifyThought(pausedContent, { dateKey: D, weekday: W }).ok);
check('the LAST report counts (an early found:false, then the real report)', verifyThought([...fetchBlocks(URL0, good), report({ found: false }), report({ found: true, url: good.canonical, digest: DIGEST })], { dateKey: D, weekday: W }).ok);

const rej = (name, content, want, ctx = { dateKey: D, weekday: W, pinName: 'Vezot Haberakhah' }) => {
  const v = verifyThought(content, ctx);
  check(`reject: ${name}`, !v.ok && want.test(v.reason || ''), v.ok ? 'was accepted' : v.reason);
};
rej('no report tool call', [...fetchBlocks(URL0, good), { type: 'text', text: 'Here is the lesson…' }], /no report_daily_thought/);
rej('found:false', [...fetchBlocks(URL0, good), report({ found: false })], /found:false/);
rej('the model typed a URL but web_fetch never returned a page', [report({ found: true, url: good.canonical, digest: DIGEST })], /no Daily Wisdom page fetched/);
rej('a fetch error (reason names the error code)', [...fetchError(URL0), report({ found: true, url: good.canonical, digest: DIGEST })], /no Daily Wisdom page fetched \(url_not_accessible\)/);
const notLesson = lessonPage({ path: 'library/article_cdo' });
rej('a fetched page that is not a Daily Wisdom lesson', [...fetchBlocks(URL0, notLesson), report({ found: true, url: notLesson.canonical, digest: DIGEST })], /not a lesson page/);
const offHost = lessonPage({ canonicalHost: 'chabad.org.example.com' });
rej('a canonical URL on another host', [...fetchBlocks(URL0, offHost), report({ found: true, url: offHost.canonical, digest: DIGEST })], /no Daily Wisdom page fetched/);
// the 2026-09-19 incident: Shabbat Ha'azinu, but the lesson served was the NEXT week's Shabbat lesson
const nextWeek = lessonPage({ aid: '2955579', dateKey: '2026-09-26', weekday: 'Shabbat', title: 'Sparks of Moses' });
rej("a lesson dated another day (2026-09-19: next week's Shabbat lesson)", [...fetchBlocks(dailyWisdomUrl('2026-09-19'), nextWeek), report({ found: true, url: nextWeek.canonical, digest: DIGEST })], /not dated September 19, 2026/, { dateKey: '2026-09-19', weekday: 'Shabbat', pinName: "Ha'azinu" });
const other = lessonPage({ aid: '5000002', title: 'Another Lesson' });
rej('a report naming a different lesson than the dated page', [...fetchBlocks(URL0, good), report({ found: true, url: other.canonical, digest: DIGEST })], /report url is not the day's lesson/);
rej('a report naming some other address', [...fetchBlocks(URL0, good), report({ found: true, url: 'https://www.chabad.org/dailystudy/dailywisdom.asp?tdate=9/24/2026', digest: DIGEST })], /report url is not the day's lesson/);
rej('no url and two dated pages (ambiguous)', [...fetchBlocks(URL0, good), ...fetchBlocks(other.canonical, lessonPage({ aid: '5000002', title: 'Another Lesson' })), report({ found: true, digest: DIGEST })], /report url is not the day's lesson/);
rej('a digest that talks about not reaching the page', [...fetchBlocks(URL0, good), report({ found: true, url: good.canonical, digest: 'I could not access the page today, so I cannot summarize it. Please try again later. This is a placeholder. '.repeat(3) })], /digest/);
rej('a digest that is too short', [...fetchBlocks(URL0, good), report({ found: true, url: good.canonical, digest: 'Short.' })], /digest/);
// ---- review 2026-09-29: only the page fetched from the DAY'S ADDRESS is evidence
// (a lesson page fetched by its own aid URL prints TODAY's date whatever lesson it is)
const todayOnOther = lessonPage({ aid: '5000009', title: 'Some Other Lesson' });
rej('a lesson fetched by its aid URL alone, even though it prints today\'s date', [...fetchBlocks(todayOnOther.canonical, todayOnOther), report({ found: true, url: todayOnOther.canonical, digest: DIGEST })], /the day's address was not fetched/);
rej('the day\'s page + another lesson, report pointing at the other one', [...fetchBlocks(URL0, good), ...fetchBlocks(todayOnOther.canonical, todayOnOther), report({ found: true, url: todayOnOther.canonical, digest: DIGEST })], /report url is not the day's lesson .*also fetched aid 5000009/);
rej('the day\'s page + another lesson, report with no url', [...fetchBlocks(URL0, good), ...fetchBlocks(todayOnOther.canonical, todayOnOther), report({ found: true, digest: DIGEST })], /report url is not the day's lesson/);
const bothOk = verifyThought([...fetchBlocks(URL0, good), ...fetchBlocks(todayOnOther.canonical, todayOnOther), report({ found: true, url: good.canonical, digest: DIGEST })], { dateKey: D, weekday: W });
check('accept: the day\'s page + another lesson, report naming the day\'s lesson', bothOk.ok && bothOk.record?.aid === '5000001', bothOk.reason);
check('the day\'s address matches across http/https and www/bare host', verifyThought([...fetchBlocks('http://chabad.org/dailystudy/dailywisdom.asp?tdate=9/23/2026', good), report({ found: true, url: good.canonical, digest: DIGEST })], { dateKey: D, weekday: W }).ok);
const lateComment = lessonPage({ dateKey: '2026-09-24', weekday: 'Thursday' });
lateComment.text += 'Wednesday, 12 Tishrei 5787 / September 23, 2026\n';
check('only the FIRST date line counts (a later line with today\'s date does not)', !pageIsDated(lateComment.text, '2026-09-23') && pageIsDated(lateComment.text, '2026-09-24'));
rej('found:false after a fetch error names the error in the reason', [...fetchError(URL0, 'url_not_accessible'), report({ found: false })], /found:false \(fetch errors: url_not_accessible\)/);
const challenge = { text: '---\ntitle: Just a moment...\n---\n\nChecking your browser', docTitle: 'Just a moment...' };
rej('found:false on a Cloudflare challenge page says what was fetched', [...fetchBlocks(URL0, challenge), report({ found: false })], /found:false \(fetched: "Just a moment\.\.\."\)/);
rej('no fetch and no report says so', [{ type: 'text', text: 'hm' }], /no report_daily_thought tool call \(no fetch made\)/);
const noKw = lessonPage();
noKw.text = noKw.text.replace(/, Parshah \(Weekly Torah Reading\) [^\n]*? The Lubavitcher/, ', The Lubavitcher');
const labelNoKw = verifyThought([...fetchBlocks(URL0, noKw), report({ found: true, url: noKw.canonical, digest: DIGEST })], { dateKey: D, weekday: W, pinName: 'Bereshit' });
check('page without a parsha → weekday-only label, never Hebcal\'s unverified guess', labelNoKw.ok && labelNoKw.record?.dayLabel === 'Wednesday' && labelNoKw.record?.parsha === null, labelNoKw.reason || labelNoKw.record?.dayLabel);

const badTitle = lessonPage();
badTitle.docTitle = '';
badTitle.text = badTitle.text.replace(/^meta-og:title:.*$/m, 'meta-og:title: ').replace(/^title:.*$/m, 'title:');
rej('a page with no usable title', [...fetchBlocks(URL0, badTitle), report({ found: true, url: badTitle.canonical, digest: DIGEST })], /title/);

// ------------------------------------------------ end to end (real server)
const nyKey = () => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value ?? '';
  return { dateKey: `${g('year')}-${g('month')}-${g('day')}`, weekday: WEEKDAYS[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'))] };
};
const seen = [];
let thoughtCalls = 0;
const mock = createServer((rq, rs) => {
  let body = '';
  rq.on('data', (c) => (body += c));
  rq.on('end', () => {
    let j = {};
    try { j = JSON.parse(body); } catch {}
    const isThought = (j.tools || []).some((t) => t.name === 'report_daily_thought');
    const send = (o) => { rs.writeHead(200, { 'content-type': 'application/json' }); rs.end(JSON.stringify({ id: 'msg_mock', type: 'message', role: 'assistant', model: 'mock', ...o })); };
    if (!isThought) return send({ content: [{ type: 'text', text: 'mock: nothing here' }], stop_reason: 'end_turn' });
    seen.push(j);
    thoughtCalls++;
    const { dateKey, weekday } = nyKey();
    const page = lessonPage({ aid: '5000100', dateKey, weekday: weekday === 'Shabbat' ? 'Shabbat' : weekday, title: 'Mock Lesson Title' });
    // first call pauses right after the fetch; the continuation carries the report
    if (thoughtCalls === 1) return send({ content: fetchBlocks(dailyWisdomUrl(dateKey), page), stop_reason: 'pause_turn' });
    return send({ content: [report({ found: true, url: page.canonical, digest: DIGEST })], stop_reason: 'tool_use' });
  });
});
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const dataDir = mkdtempSync(join(tmpdir(), 'rimon-thought-'));
const child = spawn(process.execPath, ['--experimental-sqlite', SERVER], {
  env: {
    ...process.env, DATA_DIR: dataDir, PORT: String(PORT),
    ANTHROPIC_API_KEY: 'mock-key-never-real', ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}`,
    STATUS_KEY: '', BROADCAST_KEY: '', APNS_KEY: '', APNS_KEY_ID: '', APNS_TEAM_ID: '',
    APPLE_SIWA_KEY: '', APPLE_SIWA_KEY_ID: '', APPLE_TEAM_ID: '', BACKUP_KEY: '', BACKUP_REPO: '', BACKUP_TOKEN: '', ROUND_SWEEP_MS: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (c) => (serverLog += c));
child.stderr.on('data', (c) => (serverLog += c));
try {
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { try { await fetch(`http://127.0.0.1:${PORT}/api/lessons`); up = true; } catch { await sleep(250); } }
  if (!up) throw new Error('server never accepted connections');
  let got = null;
  // the first hit starts a refresh (Hebcal may take up to its 8s timeout offline)
  for (let i = 0; i < 60 && !got?.fresh; i++) {
    got = await (await fetch(`http://127.0.0.1:${PORT}/api/daily-thought`)).json();
    if (!got?.fresh) await sleep(500);
  }
  const { dateKey, weekday } = nyKey();
  check('e2e: the server caches today\'s thought from the verified page', got?.fresh === true && got?.thought?.dateKey === dateKey && got?.thought?.url?.includes('/aid/5000100/'), JSON.stringify(got).slice(0, 300));
  check('e2e: title from the page, label server-built, record version 4', got?.thought?.title === 'Mock Lesson Title' && got?.thought?.dayLabel?.startsWith(weekday) && got?.thought?.v === 4, `${got?.thought?.title} | ${got?.thought?.dayLabel} | v${got?.thought?.v}`);
  const first = seen[0];
  check('e2e: the request fetched the dated address for the New York day', first?.messages?.[0]?.content?.includes(dailyWisdomUrl(dateKey)), first?.messages?.[0]?.content);
  check('e2e: pause_turn → one continuation that replays the partial turn', thoughtCalls === 2 && seen[1]?.messages?.length === 2 && seen[1].messages[1].role === 'assistant' && seen[1].messages[1].content?.some?.((c) => c.type === 'web_fetch_tool_result'), `calls=${thoughtCalls}`);
  const again = await (await fetch(`http://127.0.0.1:${PORT}/api/daily-thought`)).json();
  await sleep(300);
  check('e2e: a fresh thought is served from cache (no further Anthropic call)', again?.fresh === true && thoughtCalls === 2, `calls=${thoughtCalls}`);
  check('e2e: no rejection or refresh failure was logged', !/daily-thought: rejected|daily-thought refresh failed/.test(serverLog), (serverLog.match(/daily-thought[^\n]*/g) || []).join(' | '));
} catch (e) {
  check('daily-thought e2e ran to completion', false, String(e.stack ?? e));
  console.log('--- server log tail ---\n' + serverLog.slice(-2000));
}
child.kill();
await new Promise((r) => mock.close(r));
try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
console.log(failures === 0 ? '\nDAILY-THOUGHT: ALL PASS' : `\nDAILY-THOUGHT: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

# Brachas with Rimon — Project Guide for Claude Code

## What this is
A mobile-first PWA that photographs a meal, uses the Anthropic Claude vision
API to identify foods, maps them to an internal halachic database, and guides
the user through the correct brachos (blessings): before-blessings in the
correct order (kedima), and the correct after-blessing(s).

## Absolute rules
- ALL halachic data (food→bracha, order, after-bracha, texts) comes ONLY from
  the vetted database in `src/data/`, sourced from chabad.org, brachos.org, and
  oukosher.org. Do NOT hardcode halachic decisions from the model. Claude
  vision ONLY identifies foods and maps them to db keys (`api/analyze.ts`
  constrains it with an enum tool schema).
- ONE sanctioned extension (owner-approved 2026-08-04): the server may LEARN
  new foods at runtime (`server.mjs` researchFood) — but only via web_search
  hard-restricted to those same three domains (`allowed_domains`), only with a
  citing URL from one of them, and validated against the bracha enums before
  persisting to the SQLite `learned_foods` table (`store.addLearned`; the
  legacy DATA_DIR/learned-foods.json is imported and renamed `.migrated` on
  first boot). The model still never rules from
  its own knowledge; a food the sites don't determine stays `unmatched`.
- The app is a LEARNING AID. Every screen must surface the disclaimer:
  "This app is a study aid. For any practical halachic question, consult a
  qualified rabbi." All three source sites carry this same advice.
  (`<Disclaimer />` in `src/components/ui.tsx` is baked into `ScreenShell` —
  never build a screen outside `ScreenShell` without adding it back.)
- Never put the ANTHROPIC_API_KEY in client code. In production it lives ONLY
  as a Railway variable read by `server/server.mjs` (service brachas-rimon-api);
  `api/analyze.ts` is the serverless-host variant of the same proxy. Local dev
  without a key falls back to a clearly-labeled demo meal.

## Stack
Vite + React 18 + TypeScript + Tailwind v4 (`@tailwindcss/vite`, theme in
`src/index.css` `@theme`) + zustand (persists preferences AND progress,
dayStats, serverToken, remoteLessons, parsha — see the partialize in
src/store.ts). Production API: Node on Railway (`server/server.mjs`, service
brachas-rimon-api), storage in SQLite via node:sqlite (`node
--experimental-sqlite`, Node 22.5+; schema/migration in `server/db.mjs`, data
access in `server/store.mjs`). Session tokens are stored ONLY as SHA-256
digests at rest. Serverless proxy in `/api` (Vercel edge signature) is the
non-Railway variant. PWA manifest in `/public`.

## Data model
`src/data/foods.ts` — `FoodEntry` (100+ entries; bracha rishona/achrona,
Shivas Haminim flags, five-grain/tree-fruit/wine flags, state overrides,
per-entry source citation). Liturgy in `src/data/texts/{ari,index}.ts`.

## Core algorithms — DO NOT change constants without a cited source
- `src/lib/kedima.ts` — recitation order. Blessing rank Hamotzi < Mezonos <
  Hagafen < Ha'etz < Ha'adama < Shehakol; within Ha'etz, Shivas Haminim first
  in verse order olive < date < grape < fig < pomegranate; then whole-over-cut;
  then chaviv. `groupForRecitation` also applies the Hamotzi exemption
  (bread covers the meal except wine).
- `src/lib/afterBracha.ts` — Birkat Hamazon if bread; else ONE combined
  Me'ein Shalosh from {Al Hamichya, Al Hagefen, Al Ha'etz}; else/also Borei
  Nefashos for uncovered foods. Al Ha'etz exempts other tree fruit; Hagafen
  covers other drinks; rice is Mezonos→Borei Nefashos (never Al Hamichya).
- `src/lib/classify.ts` — state overrides (cooked cucumber → Shehakol, raw
  onion → Shehakol, etc.).
Both algorithms carry a node test harness — run:
`node --experimental-strip-types` (see the T1–T10 cases in the build log).

## Nusach — all three COMPLETE
- ari: verbatim from chabad.org.
- ashkenaz: Hebrew from the public-domain Daat Siddur Ashkenaz (Sefaria API, license field verified).
- edot: Me'ein Shalosh from the CC0 Shaliehsaboo Edition (Sefaria API).
Sefaria is used SOLELY for public-domain liturgical text; halachic RULES still come only from the three approved sites. Transliterations for ashkenaz/edot are auto-generated and flagged.

## Rimon (the mascot)
`src/components/Rimon.tsx`. Gen-AI character (Higgsfield): stills in
`public/mascot/rimon-{hello,thinking,pointing}.png`, video loops in
`public/mascot/rimon-{idle,celebrate}.mp4` — rendered on the exact app-cream
background (#FDFBF7 family) so they blend without alpha; a radial CSS mask
softens the edge. The component falls back video → still → hello.png, so
missing assets never break a screen.

## Design system (Editorial Luxury)
Warm cream #FDFBF7 canvas + espresso ink + gold/rimon-crimson accents; Frank
Ruhl Libre (display + Hebrew w/ nikud), Plus Jakarta Sans (UI). Double-bezel
cards (`<Bezel>`), island pill CTAs with nested trailing icons
(`<PillButton>`), eyebrow tags, film-grain overlay, custom
cubic-bezier(0.32,0.72,0,1) motion only — no linear/ease-in-out, no harsh
shadows, no Inter/Roboto. Hebrew blocks: `dir="rtl" lang="he"` + `.hebrew`
(line-height 1.9 for nikud).

## Gamification (adult Duolingo tone — friendly, never childish)
- src/lib/progress.ts — streaks (day-rollover logic), per-bracha counts, CHALLENGES registry, badges. Persisted in the zustand store (key brachas-with-rimon).
- Points economy (src/lib/dailyChallenges.ts, owner-tuned 2026-08-05): +2 per bracha, +3 per AFTER-blessing (the 'BirkatHamazon'/'MeeinShalosh'/'BoreiNefashos' keys completeMeal receives — closing the circle earns extra), +10 regular daily, +20 food of the day.
- Celebrations are full-screen Rimon TAKEOVERS (src/components/RimonTakeovers.tsx; Celebration.tsx dispatches badge > streak > challenge): challenge fly-in/thumbs-up, streak "kindling" flame, badge "lowered on its ribbon" medal. Choreography CSS = the tk-* block in src/index.css (one-shot + breath holds, reduced-motion lands on the final still); assets public/mascot/rimon-{flying,thumbsup,medal,flame}.webp; provenance in mascot-concepts/README.md. Keyframes were blind-QA'd — keep hard-edged strokes off the character art and match any full-bleed render's bake cream (#f9f7e8).
- Birkat Hamazon screen (src/screens/Benching.tsx, screen id 'benching', Welcome pill): four blessings + Harachaman from the active nusach pack's birkatHamazon + holiday-addition cards (Shabbat R'tsei / Yaaleh Veyavo / Al Hanissim). Quick guide (Reference.tsx) now also carries the three after-blessings with a door into Benching.
- Manual entry (no photo): Welcome "Forgot to take a photo? Add it manually!" → Confirm in manualEntry mode (search auto-opened) → the same guide/after flow.
- GLUTEN-FREE FLOUR PICKER (owner feature 2026-08-11): every Bread-category item on Confirm carries a "gluten-free?" chip → themed dropdown of 5 flours + Not sure. The flour swaps the item's DB entry (`setItemEntry` in classify.ts, `origKey` remembers the revert) so the whole guide/after flow re-resolves. Rulings are DB entries `bread-gf-*` in foods.ts, cited to the OU Guide to Blessings "Gluten-Free Baked Goods" table: oat → Hamotzi/Birkat Hamazon (oats ARE a five-grain), rice flour → Mezonos/Borei Nefashos (never Al Hamichya), almond/coconut/tapioca-starch → Shehakol/Borei Nefashos. "Not sure" deliberately rules NOTHING — it shows check-the-ingredient-panel guidance (`[data-gluten-free-unsure]`). Never add a flour option without a citable ruling from the three sites.
- server/foods-keys.json is generated from src/data/foods.ts (`f({ key: '...'` entries) but had gone STALE at 112 of 244 keys — regenerated 2026-08-11. Regenerate it whenever foods.ts gains entries, or vision can't map them directly.
- MEAL LOGGING IS CRASH-SAFE (2026-08-07): the meal records at GUIDE-FINISH, not on the After screen. Guide's last "I said it" calls completeMeal (before-brachos, +2 each) AND mergePendingAfter (a persisted snapshot of the resolver inputs — src/store.ts PendingAfter). The After screen renders ONLY from pendingAfter; after-blessings record separately via completeAfter (+3 each, mealsWithAfter, clears pendingAfter, merges into any still-unshown meal celebration). Never reintroduce a single record-at-After call — closing the app mid-"Savor it" must lose nothing.
- SAVE-FOR-LATER (owner request 2026-08-07): the After 'ask' phase has THREE choices — do it now / "Save after-blessings for later" (middle) / skip. Save = show the held celebration (Kol hakavod fly-in unless a streak/badge outranks it) then home, where a reminder-style widget (`[data-after-widget]`, Welcome.tsx) shows the saved items + "saved 2h ago" (NO expiry — owner ruling). Tapping it re-enters After in resumed mode (items empty → phase starts at shiur, "Welcome back"); completing plays the closing celebration and the widget disappears. A second meal while one is pending MERGES into the same pendingAfter (union by item id, earliest savedAt).
- DAILY THOUGHT (owner feature 2026-08-11): the Learn tab card `[data-daily-thought]` ABOVE the daily-parsha card shows a faithful digest of today's chabad.org "Daily Wisdom" lesson (Tzvi Freeman's series, one lesson per weekday per parsha). chabad.org is Cloudflare-blocked to plain server fetch, so the server rides the SAME sanctioned pipeline as researchFood: Anthropic web_search `allowed_domains:['chabad.org']` (GET /api/daily-thought, cache DATA_DIR/daily-thought.json, one per US-East day, THOUGHT_VERSION invalidates on logic change). The current parsha is pinned from Hebcal's leyning API (calendar fact, not psak — same source the parsha card uses) and a report whose parsha mismatches is REJECTED: v1 without the pin cached the ADJACENT week's lesson. Card carries the AI-mistakes line + deep link, like every reading surface.
- DAILY THOUGHT v3 (2026-09-06, `THOUGHT_VERSION 3`): the Hebcal pin reads ONLY `type:'shabbat'` items (holiday items carry no parsha and pinned the wrong week); a holiday Shabbat with no regular leyning advances ONE step in `PARSHA_ORDER` from the last regular parsha; parsha names compare through `canon()` (vowel/apostrophe-insensitive — "Ki Teitzei" = "Ki Seitzei"); `dayLabel` is built by the SERVER (weekday · Parshat X), never trusted from the model; a failed fetch is negative-cached 30 min, max 8 attempts per NY day (the old loop re-spent web_search on every request of a blocked day); the client HIDES a thought ≥3 days old rather than present it as today's. Every accepted digest/title also passes the CONTENT GUARD below.
- PARSHA TAKEAWAY (owner request 2026-08-07): the daily-parsha reader (Learn) ends with "This week's takeaway" (`[data-parsha-takeaway]`) — one per-parsha lesson from src/data/parshaTakeaways.ts (54 + 7 combined, keyed to Hebcal AND chabad spellings), each deep-linking its chabad.org parsha hub with the AI-mistakes line. Per-parsha, not per-aliyah — the same takeaway all week is deliberate.
- Reading surfaces that digest an article (Learn lessons, Why dropdowns) MUST carry "AI makes mistakes, to learn more information please read the article" immediately before the article link (owner directive 2026-08-05) — add it to any new reading surface.
- Tabs (src/components/TabBar.tsx): Bless / Learn / Journey / Friends / Donate (shown when donateAvailable() — HIDDEN on native for the 1.0 review, see "iOS 1.0 review posture") / Account. The bar hides mid-flow.
- src/data/learn.ts — the Learn library: each lesson is a faithful digest of ONE chabad.org article and deep-links it via `sourceUrl` (owner directive 2026-08-05: Learn content comes ONLY from chabad.org — the three-site rule still applies to the halachic food DB). The scholar challenge target/metric in progress.ts derive from LESSONS automatically.
- Reminders: the PRIMARY entry point is the home-page nudge under Rimon's tip of the day (`src/components/ReminderNudge.tsx`) — tapping it opens a sheet that collects breakfast/lunch/dinner times (`MEAL_SLOTS` in src/store.ts; `reminders.times` index 0/1/2 map to those three) and enables auto-reminders in one step. The Journey card is the secondary/edit surface. Both share ONE implementation: `src/lib/useReminders.ts` — add delivery logic there, never in a screen. Three delivery paths in preference order: native iOS local notifications → Web Push (needs an account) → the in-app ticker in App.tsx (fires only while open). Background push needs accounts — do not fake it.
- Friends runs on the REAL Railway backend: accounts (email+password, Apple/Google OAuth), shared leagues, and shareable boards (6-char codes, `src/components/Boards.tsx`, max 20/user). The local Rimon pacer row (+3 until 25 brachos, then 80%) remains as flavor on top.
- LEAGUE IS ALL-TIME (owner ruling 2026-08-10): the friends league ranks on lifetime points (tiebreak lifetime brachos) and every row carries `wins` (leaderboard rounds won, `users.wins`). week/today fields still ride along for the home nudge.
- BOARDS ARE TIMED ROUNDS (owner spec 2026-08-10): create picks 1 week / 1 month / 1 year (`boards.duration/starts_at/ends_at/round`); every member races from 0 — score = lifetime points MINUS `board_members.points_baseline` (snapshotted at round start / join; NEVER computed from daily history, which only keeps ~60 days). A 60s server sweep (`sweepRounds`, env-tunable for tests via ROUND_SWEEP_MS / ROUND_DURATIONS_OVERRIDE / EVENING_HOUR / MORNING_HOUR) finalizes ended rounds into `board_results` (winner needs >0 points; +1 `users.wins`), sends the ended push WITHOUT naming the winner (the reveal is the payoff), a last-day push inside the final 24h, and evening daily-leader pushes (boards + the friends-league home card as a push). Overtake pushes are round-scoped for boards, lifetime-scoped for the league. Client: countdown chip on the card (`[data-board-countdown]`), finished card + owner "Run it back" (`/api/boards/restart`, round+1, re-baseline), and the PodiumReveal takeover (`src/components/PodiumReveal.tsx`, pr-* CSS) that plays ONCE per member/round at app open (3rd → 2nd → champion; `/api/boards/seen` marks it watched; no-winner rounds retire silently). Legacy untimed boards were auto-converted to 1-week rounds at first boot (`convertLegacyBoards`).
- Board GROUP CHAT (2026-08-05): one room per board, membership = board membership (server-enforced; rows cascade on join/leave). Server: board_messages/board_reads tables, GET /api/boards/messages + POST /api/boards/message, 20 msg/5min per user, 500-message cap per board, push nudge to members ≤1/45min/board. Client: `src/components/BoardChat.tsx` sheet, 💬 button LEFT of Share with unread badge (unread count rides /api/boards).
- NATIVE PUSH / APNs (2026-08-06, build 19): the iOS WKWebView has NO Web Push, so server-initiated pushes (chat, overtakes, broadcasts) ride APNs. Client: `registerNativePush()` in src/lib/native.ts (plugin @capacitor/push-notifications; AppDelegate.swift forwards the token; aps-environment entitlement) → App.tsx posts the device token to POST /api/push/native once the OS permission is granted (requested on reminders-enable or the first Friends open — NEVER at sign-in, see PUSH PERMISSION timing below); sign-out clears it. Server: users.apns column (device-unique — registering moves the token off any other account), `sendPush` fans out to Web Push AND APNs, `server/apns.mjs` is a dependency-free HTTP/2+ES256 sender. DELIVERY IS OFF until APNS_KEY (p8 contents), APNS_KEY_ID, APNS_TEAM_ID exist as Railway variables (topic defaults to the bundle id); tokens still register meanwhile (`delivery: "awaiting_server_key"`). Mealtime reminders deliberately stay OFF APNs — native uses local notifications. Push capability must be enabled on the App ID in the Apple portal or Codemagic signing fails on the aps-environment entitlement.
- COMPETITIVE PUSHES: /api/sync detects overtakes (week-points crossing) across the friends league + all shared boards and web-pushes the passed user, ≤1/2h per rival pair (`notifyOvertaken` in server.mjs).
- OWNER BROADCAST: POST /api/admin/broadcast {secret, title, body} pushes to every web-push subscriber — secret = BROADCAST_KEY Railway variable (mirrored as BRACHA_BROADCAST_KEY in group-app-ad/.env); the route 404s without/with a wrong key. Owner-approved announcements only.
- DARK MODE is EXPLICIT, never inferred (owner ruling 2026-08-10 — a device that merely *reported* dark forced the app dark): the app defaults LIGHT; Account carries a Light/Dark/Auto picker (`appearance` in the store, `src/lib/theme.ts` stamps `<html data-theme>` from main.tsx). Every dark style keys off `html[data-theme='dark']` in src/index.css — NEVER reintroduce a bare prefers-color-scheme block; the media query matters only when the user chose Auto. Palette behavior unchanged: variables flip (dark warm chrome, inverted pills), white-literal cards force SOLID cream paper + dark ink via re-scoped vars, .bg-rimon keeps light text, mascot blend masks widen to a soft spotlight. Takeovers deliberately stay bright. Never add a text-cream on a colored bg without checking the dark block.
- TAB BAR + KEYBOARD (owner screenshot 2026-08-10): WKWebView strands position:fixed elements mid-page after the keyboard/picker closes. TabBar watches visualViewport and UNMOUNTS while the keyboard is up; the remount on close re-pins it (plus safe-area-inset-bottom clearance). Keep that pattern for any future fixed chrome.
- Home widgets (`[data-home-widgets]` in Welcome.tsx): streak tracker (7-day strip from progress.history) + "Have you said your bracha today?" card that flips once dayStats shows brachos today.
- Screen/tab changes scroll to top (App.tsx effect on [tab, screen]; Learn.tsx on [openId, showParsha]) — keep that behavior when adding screens.

## Testing (2026-09-06 — the certainty stack)
Three layers; the first two run automatically, never skip them silently:
1. **Preflight gate** (`npm run preflight` = scripts/preflight.mjs): `tsc -b --force` + `server/test/scenarios.mjs` + `server/test/search.mjs` (food search/aliases) + `server/test/content-guard.mjs` (model-text guard) + `server/test/progress.mjs` (streak rules incl. the Shabbat grace). Runs AUTOMATICALLY at the top of deploy-pages.mjs AND sync-master.mjs — a red suite blocks the upload. `SKIP_PREFLIGHT=1` is the emergency hatch, for incidents only. Add every new server unit test HERE, not just to package.json.
2. **Server scenario suite** (`npm test` = server/test/scenarios.mjs): boots the REAL server on a temp SQLite + mock APNs (server/test/mock-apns.mjs, h2c http2; magic token prefixes: `dead*`→410, `bad0*`→400) and asserts the push/chat/moderation scenarios (the count grows — see the suite, never quote a number here): registration, chat fan-out + content + topic + JWT, 45-min throttle, device-token uniqueness/move, 410 dead-token cleanup, overtake nudge, owner broadcast (+wrong-secret 404), non-member 404s, flood 429, endpoint-allowlist 400, sign-out clear, block/report/filter. Also runs on Codemagic before every TestFlight build ("Server scenario tests" step in codemagic.yaml), followed by the dependency-free content-guard step.
3. **Deployed e2e** (`npm run e2e` = scripts/e2e.mjs; the assert count lives in the script header): runs against the LIVE site AFTER a Pages deploy — post-deploy proof, not a pre-upload gate. It creates its own accounts and DELETES them at the end (self-cleaning; `/api/status` still reports any leftovers as `users.test_accounts`); on a Linux runner set `CHROME_PATH` to the browser binary. In a sandbox whose only egress is a proxy (the Anthropic cloud routine bracha-daily-check-cloud), set `CHROME_PROXY` (or leave the standard `HTTPS_PROXY` env) — the script passes it to Chrome as `--proxy-server` and, when `undici` is installed (`npm i --no-save undici`), routes its own Node `fetch` calls through it; `CHROME_EXTRA_ARGS` adds space-separated Chrome flags (e.g. `--disable-quic`). Unset = direct, unchanged behaviour on the Windows box. GH Pages CDN propagation lags the branch by up to ~10 min (Cache-Control max-age=600): after deploying, poll index.html for the new bundle hash before running e2e, or a mid-propagation site fails with "Promise was collected" page-context crashes.
Signing gotcha learned 2026-08-06: toggling ANY capability on the App ID INVALIDATES the provisioning profile, and Codemagic reuses the invalid profile (fast archive fail, exit 65, no error detail). Fix: developer portal → Profiles → edit → Save (re-issues as Active), then rebuild.

## Security + data-safety invariants (audit 2026-08-06 — do not regress)
- **Friend code = a sign-in credential.** email+code signs in a LEGACY (no password, no OAuth) account only. NEVER return another user's `code` from any endpoint — `leagueFor` masks non-you codes as `f0,f1…`, `standings` as `m0,m1…`. `/api/signin` code path 403s on `u.pass || u.apple || u.google`. `/api/friends/add` is CODE-ONLY (email → 400 use_code).
- **/api/sync MERGES, never replaces** (`mergeProgress`): totals take max, history unions by day (per-day max), a fresh/empty device can't lower a stored value. Response returns stored `progress` so a new device adopts it (`store.adoptServerProgress`, client-side, only when local is at defaults). This is what stops new-device/reinstall wipes — keep it.
- **DATA_DIR volume guard** (top of server.mjs): on Railway, refuses to boot unless DATA_DIR is on `RAILWAY_VOLUME_MOUNT_PATH`. Prod is DATA_DIR=/data, volume=/data. A crash-loop here is intentional (beats a silent empty DB).
- **Secrets never leave the box.** Repo is PUBLIC. `sync-master.mjs` skips `server/data`,`server/data-test`, and any `*.{bak,p8,pem,key,db,db-*,sqlite,mobileprovision,p12,cer}` + `.env*` (except .env.example). deploy-pages only ships dist/. Don't add secret-class files to the tree expecting git-ignore to save you — sync-master ignores .gitignore.
- **Backups** (`server/backup.mjs`): daily VACUUM INTO → AES-256-GCM → private repo, INERT until BACKUP_KEY/BACKUP_REPO/BACKUP_TOKEN Railway vars set. Also enable Railway native volume snapshots (dashboard).
- **Throttles are XFF-spoof-proof** (`clientIp` trusts Envoy's `x-envoy-external-address`/last hop, not the caller's first XFF element) + per-email sign-in cap (`emailThrottled`, 10/10min). scrypt is ASYNC (`hashPassword`/`checkPassword` return Promises — await them). readBody caps at 64KB except /api/analyze (4MB — the client downsizes to ≤1.15 MP JPEG q0.85 in src/lib/analyze.ts, so a real photo is well under 1MB of base64).
- **dayTotal** compares against the USER's local day via `u.push?.tzOffsetMinutes`, not server UTC.
- Test net: `server/test/scenarios.mjs` (see the suite — incl. takeover-chain, merge-wipe, per-email-cap, active-reader push-skip, moderation) + `scripts/preflight.mjs` gate runs before every upload.
- Chat push timing (owner-tuned 2026-08-06): 5-min cooldown per member/board AND skip anyone who read the board in the last 60s (actively viewing). `CHAT_PUSH_GAP_MS`/`CHAT_ACTIVE_MS` + `store.boardLastRead`.

## Reader safety, monitoring + moderation (2026-09-06)
- CONTENT GUARD (`server/content-guard.mjs`): every MODEL-WRITTEN text that reaches a reader — the Daily Thought digest + title, learned-food notes + names — passes `guardProse` (paragraphs) / `guardLine` (single lines) BEFORE it is cached or persisted. The guard strips `<cite>`/HTML/markdown/citation markers, then REJECTS anything still carrying markup, refusal text ("I could not access…", "as an AI…", Cloudflare/403 chatter), or too-short / sentence-less prose. Why: the digest once shipped literal `<cite index=…>` tags, and on blocked days a note about not reaching chabad.org — both passed the old host+parsha+length checks. A rejected text is NOT a fallback: the surface keeps the last good one (or hides). Unit test `server/test/content-guard.mjs` runs in preflight AND on Codemagic — extend it whenever a new reading surface appears.
- /api/status?key=… — the machine-readable health/capacity contract (`server/status.mjs` `buildStatus`). Key = `STATUS_KEY` env, else sha256('status:'+BROADCAST_KEY).slice(0,24) — a derived read-only key, no new secret to manage; without either the route 404s like /api/admin/broadcast. Reports users/growth, storage (db + volume %), process (RSS, event-loop p99), vision quota + Anthropic errors (401/402/403 = credit or key → CRITICAL), daily_thought age, backups, push + dependency marks (`mark()`/`fail()` recorded by other modules), `moderation.open_reports`, and an `alerts[]` list at WARN/CRITICAL with env-tunable `STATUS_*` thresholds. It is READ by two Anthropic cloud routines — `bracha-daily-check-cloud` and `bracha-capacity-watch-cloud` — which page the operator via PushNotification and write receipts to the Group App cloud ledger under task names `bracha-daily-check` / `bracha-capacity-watch`. RULE: monitoring lives in those cloud routines. Any scheduled task on this box is a MANUAL FALLBACK only (it runs only while the desktop app is open) and must never be the sole watcher of anything.
- CHAT MODERATION (App Review guideline 1.2 — server AND client implement exactly this contract): GET /api/boards/messages rows carry `user_id`, and messages from users the caller has blocked are omitted SERVER-side. `POST /api/boards/block {user_id}` → `{ok:true}` (idempotent, global per caller — not per board — cannot block yourself), `POST /api/boards/unblock {user_id}`, `GET /api/boards/blocked` → `{blocked:[{user_id,name}]}`. `POST /api/boards/report {code, message_id, reason}` (reason ∈ spam|harassment|inappropriate|other, ≤200 chars) → `{ok:true}`, 404 unknown board/message, 429 over 10 reports/10 min per user; stored server-side. `POST /api/boards/message` runs a minimal hard-coded whole-word, case-insensitive English profanity/slur filter → 400 `{error:'moderated'}` (client copy: "That message was blocked by the chat filter."). Reports reach the operator as `moderation.open_reports` in /api/status (WARN alert code `open_reports`) and via `POST /api/admin/reports {secret}` (list) / `POST /api/admin/reports/resolve {secret,id}` — BROADCAST_KEY secret, 404 otherwise. Never widen the word list into a general censor; it exists to make "filter" true for review, the report/block pair is the real tool.
- ACCOUNT DELETION transfers board ownership to another member instead of orphaning or deleting the group: the deleted owner's rows (progress, messages, reports, blocks, tokens) go, the board and its history stay for everyone else. Deletion must remain in-app (Account → delete) — Apple requires it and privacy.html promises it.
- SHABBAT STREAK GRACE: a streak with brachos Friday and Sunday but nothing Saturday is UNBROKEN — no photo on Shabbat is expected, not a lapse. The rule and its rollover cases live in `server/test/progress.mjs` (`node --experimental-strip-types server/test/progress.mjs`, in preflight). Don't "fix" a Fri→Sun streak that looks like a skipped day.
- PUSH PERMISSION timing: the iOS notification prompt is requested when the user ENABLES REMINDERS or first OPENS FRIENDS — never at sign-in. Why: a contextless prompt is declined and iOS never asks again; the reviewer also flags prompts with no visible reason. `registerNativePush()` therefore runs from those two moments, not from the sign-in effect.

## iOS 1.0 review posture (2026-09-06, version 1.0 build 33)
- iPhone-ONLY (`TARGETED_DEVICE_FAMILY = 1` in BOTH pbxproj configurations) and PORTRAIT-only (Info.plist `UISupportedInterfaceOrientations` = Portrait, the `~ipad` array removed): the layout is phone-first and the onboarding slideshow + Rimon takeovers are fixed 9:16, and family 2 would make iPad screenshots mandatory in ASC. iPads still run it in compatibility mode. Don't re-add family 2 without a real iPad layout AND iPad store assets.
- Sign-in is REQUIRED on both platforms: identification runs server-side on a paid API, so every account carries a 30/day photo cap and there is no anonymous mode. The reviewer account + review notes + the App Privacy label live in APPSTORE.md — update them together when a data flow changes.
- Donate is HIDDEN on native for the 1.0 review (`donateAvailable()` in src/lib/donate.ts gates on `isNative()` unless NATIVE_ENABLED): an external donation link inside the binary is an IAP-rule conversation we don't want in the first review. The web tab stays.
- Store assets are REAL UI from the deployed PWA, never mockups: scripts/store-capture.mjs (6.9-inch 1320×2868 PNGs; `--video` for the screencast; creates and deletes its own demo account) → scripts/store-artboards.mjs (framed boards, alpha stripped) → scripts/store-preview-cards.mjs + scripts/store-preview-compose.mjs (886×1920 App Preview, burned captions). Full recipe in APPSTORE.md.
- Build number = CURRENT_PROJECT_VERSION (33 for this submission; 32 was superseded the same day by the cloud-e2e proxy patch); see the TESTFLIGHT TRIGGER WARNING below before syncing.

## Deploy
GitHub Pages: repo Shancoh18/brachas-with-rimon, LIVE at https://shancoh18.github.io/brachas-with-rimon/ — deployed by pushing dist to gh-pages via the git-data API (scripts/deploy-pages.mjs — and scripts/sync-master.mjs for source; git push HANGS on this machine and the token lacks workflow scope, so neither plain push nor Actions works). Build with: npm run build -- --base=/brachas-with-rimon/ (run from PowerShell/cmd, NOT Git Bash — MSYS mangles --base into a Windows path; deploy-pages.mjs handles this itself). The static site talks to the LIVE Railway API (`src/lib/api.ts` API_BASE → brachas-rimon-api-production-46ae.up.railway.app): vision, accounts, and leagues are real in production. Server deploy: server/deploy-railway.sh, or `railway up --service brachas-rimon-api --detach` from server/ if the script hangs.

TESTFLIGHT TRIGGER WARNING: every scripts/sync-master.mjs push to GitHub master fires the Codemagic webhook and starts an ios-app-store TestFlight build. The build number comes ONLY from CURRENT_PROJECT_VERSION in ios/App/App.xcodeproj/project.pbxproj (nothing auto-increments it) — bump it BEFORE syncing, check no other session has an in-flight build with the same number, and never run two syncs concurrently. App Store Connect rejects duplicate build numbers; on 2026-08-05 two concurrent sessions both fired build 13 and were saved only by byte-identical trees + cancel_previous_builds.

## Audio (hear-it)
scripts/generate-bracha-audio.mjs — ElevenLabs Hebrew (eleven_v3, voice Daniel) for the six brachos + Borei Nefashos, loudnormed, STT round-trip verified (scribe_v1). Labeled "AI voice" in the UI (src/components/HearIt.tsx — not "beta": App Review reads a beta label as unfinished); a native recording pass replaces public/audio/*.mp3 one-to-one.

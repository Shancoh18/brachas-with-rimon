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
- Reading surfaces that digest an article (Learn lessons, Why dropdowns) MUST carry "AI makes mistakes, to learn more information please read the article" immediately before the article link (owner directive 2026-08-05) — add it to any new reading surface.
- Tabs (src/components/TabBar.tsx): Bless / Learn / Journey / Friends / Donate (shown when donateAvailable()) / Account. The bar hides mid-flow.
- src/data/learn.ts — the Learn library: each lesson is a faithful digest of ONE chabad.org article and deep-links it via `sourceUrl` (owner directive 2026-08-05: Learn content comes ONLY from chabad.org — the three-site rule still applies to the halachic food DB). The scholar challenge target/metric in progress.ts derive from LESSONS automatically.
- Reminders: the PRIMARY entry point is the home-page nudge under Rimon's tip of the day (`src/components/ReminderNudge.tsx`) — tapping it opens a sheet that collects breakfast/lunch/dinner times (`MEAL_SLOTS` in src/store.ts; `reminders.times` index 0/1/2 map to those three) and enables auto-reminders in one step. The Journey card is the secondary/edit surface. Both share ONE implementation: `src/lib/useReminders.ts` — add delivery logic there, never in a screen. Three delivery paths in preference order: native iOS local notifications → Web Push (needs an account) → the in-app ticker in App.tsx (fires only while open). Background push needs accounts — do not fake it.
- Friends runs on the REAL Railway backend: accounts (email+password, Apple/Google OAuth), shared leagues, and shareable boards (6-char codes, `src/components/Boards.tsx`, max 20/user). The local Rimon pacer row (+3 until 25 brachos, then 80%) remains as flavor on top.

## Deploy
GitHub Pages: repo Shancoh18/brachas-with-rimon, LIVE at https://shancoh18.github.io/brachas-with-rimon/ — deployed by pushing dist to gh-pages via the git-data API (scripts/deploy-pages.mjs — and scripts/sync-master.mjs for source; git push HANGS on this machine and the token lacks workflow scope, so neither plain push nor Actions works). Build with: npm run build -- --base=/brachas-with-rimon/ (run from PowerShell/cmd, NOT Git Bash — MSYS mangles --base into a Windows path; deploy-pages.mjs handles this itself). The static site talks to the LIVE Railway API (`src/lib/api.ts` API_BASE → brachas-rimon-api-production-46ae.up.railway.app): vision, accounts, and leagues are real in production. Server deploy: server/deploy-railway.sh, or `railway up --service brachas-rimon-api --detach` from server/ if the script hangs.

TESTFLIGHT TRIGGER WARNING: every scripts/sync-master.mjs push to GitHub master fires the Codemagic webhook and starts an ios-app-store TestFlight build. The build number comes ONLY from CURRENT_PROJECT_VERSION in ios/App/App.xcodeproj/project.pbxproj (nothing auto-increments it) — bump it BEFORE syncing, check no other session has an in-flight build with the same number, and never run two syncs concurrently. App Store Connect rejects duplicate build numbers; on 2026-08-05 two concurrent sessions both fired build 13 and were saved only by byte-identical trees + cancel_previous_builds.

## Audio (hear-it)
scripts/generate-bracha-audio.mjs — ElevenLabs Hebrew (eleven_v3, voice Daniel) for the six brachos + Borei Nefashos, loudnormed, STT round-trip verified (scribe_v1). Labeled beta in the UI (src/components/HearIt.tsx); a native recording pass replaces public/audio/*.mp3 one-to-one.

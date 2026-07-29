# Bracha App — Project Guide for Claude Code

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
- The app is a LEARNING AID. Every screen must surface the disclaimer:
  "This app is a study aid. For any practical halachic question, consult a
  qualified rabbi." All three source sites carry this same advice.
  (`<Disclaimer />` in `src/components/ui.tsx` is baked into `ScreenShell` —
  never build a screen outside `ScreenShell` without adding it back.)
- Never put the ANTHROPIC_API_KEY in client code. It lives only in
  `api/analyze.ts` (serverless). Local dev without a key falls back to a
  clearly-labeled demo meal.

## Stack
Vite + React 18 + TypeScript + Tailwind v4 (`@tailwindcss/vite`, theme in
`src/index.css` `@theme`) + zustand (persisted preferences only). Serverless
proxy in `/api` (Vercel edge signature). PWA manifest in `/public`.

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

## Nusach
Ship Nusach Ari (Chabad) complete (from chabad.org — the only nusach the
approved sites publish in full). Ashkenaz and Edot Hamizrach selectors exist
but reuse the shared Hebrew with a "verify against a licensed siddur" flag
(`src/data/texts/index.ts`). Do not scrape nusach variants from elsewhere;
license a proper siddur when the time comes.

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

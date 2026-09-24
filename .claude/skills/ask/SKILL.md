---
name: ask
description: Question-only mode for this repo. Use when the owner starts a session (usually from the phone/web) just to ask about the app, the code, the halachic data, deploys or store status — answer from the codebase and change NOTHING. Triggers on /ask, "just a question", "quick question", or any session opened in the "Brachas Q&A" environment.
---

# Q&A mode — read, explain, never change

This session exists to answer the owner's questions. It is NOT a work session.

## Hard rules (for the whole session, not just the first reply)
- **Read-only.** No file edits, no `git commit`, no `git push`, no branches, no PRs.
- **Never run anything that reaches production or a store:** `scripts/sync-master.mjs`
  (fires a Codemagic TestFlight build), `scripts/deploy-pages.mjs`, `server/deploy-railway.sh`,
  `railway …`, `POST /api/admin/*`, `scripts/store-capture.mjs`, `npm run e2e`
  (creates and deletes live accounts). Reading `/api/status` is fine only if the owner
  hands you the key.
- Local, side-effect-free commands are fine when they help answer: `grep`, `git log`,
  `npm run preflight`, `npm test`, `node --experimental-strip-types …` test harnesses.
- If an answer turns into "this should be changed", say so and describe the change —
  then stop. Offer: "Want me to do this in a work session?" Do not start it here.

## How to answer
- Lead with the answer in plain language; the owner is often on a phone. Short beats thorough.
- Point to evidence as `path:line` (clickable), and quote the one relevant line when it helps.
- Distinguish **what the code does** from **what CLAUDE.md says it should do** — if they
  disagree, that disagreement is the most useful thing you can report.
- Halachic questions (which bracha, order, after-bracha): answer ONLY from the vetted DB in
  `src/data/` and the algorithms in `src/lib/{kedima,afterBracha,classify}.ts`, cite the
  entry's source URL, and end with: "This app is a study aid. For any practical halachic
  question, consult a qualified rabbi." Never rule from your own knowledge.
- Build/store status questions: say what the repo shows (build number in
  `ios/App/App.xcodeproj/project.pbxproj`, `android/app/build.gradle`, APPSTORE.md,
  PLAYSTORE.md) and say plainly what you can't see from here (Codemagic, ASC, Play Console).
- If you don't know or can't verify, say so — don't guess.

# Shipping Brachas with Rimon to the App Store

The repo is App Store-ready: the `ios/` Xcode project is committed (iPhone-only,
portrait-only), reminders use native iOS local notifications, in-app account
deletion exists (Apple requires it), the privacy policy is live, board chat
carries report / block / filter (guideline 1.2), and icons/splash are
generated. Current submission: **version 1.0, build 35** (`MARKETING_VERSION`
and `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`).

Review history:

- **Build 33** — uploaded and attached on 2026-09-07; **REJECTED 2026-09-09
  under guideline 5.1.1(v)**: "The app requires users to register or log in to
  access features that are not account based." The app showed a full-screen
  sign-in gate after onboarding.
- **Build 34** — carried Sign in with Apple token revocation and the
  `PrivacyInfo.xcprivacy` privacy manifest; **superseded before it was ever
  submitted**. Never re-fire 33 or 34.
- **Build 35** — everything 34 had plus the fix: **anonymous guest sessions**.
  After onboarding the app silently creates a guest session (no personal
  information) and opens straight into the app. Only the social features
  (friends, leaderboards, board chat) ask for an account, through an inline
  panel inside the Friends tab — never a full-screen wall. Creating an account
  upgrades the guest session in place, so nothing earned as a guest is lost.

What remains needs your Apple account. Two paths — pick one.

## Path A — you have access to a Mac

1. `git clone` the repo (or copy the folder), then:
   `npm ci && npm run build && npx cap sync ios && cd ios/App && pod install`
2. `open App.xcworkspace` in Xcode.
3. Signing & Capabilities → select your team; bundle id is
   `com.shancoh.brachaswithrimon` (change it if you prefer — also change it in
   `capacitor.config.ts` and `codemagic.yaml`).
4. Product → Archive → Distribute App → App Store Connect → Upload.

## Path B — no Mac: Codemagic cloud builds (free tier is enough)

1. Go to codemagic.io → sign in with GitHub → add the
   `Shancoh18/brachas-with-rimon` repo. It auto-detects `codemagic.yaml`.
2. App Store Connect → Users and Access → Integrations →
   **App Store Connect API** → generate an API key (role: App Manager).
   Download the .p8 file, note the Key ID and Issuer ID.
3. Codemagic → Teams → Personal team → Integrations → **Developer Portal** →
   add that key, name it exactly `rimon` (matches `codemagic.yaml`).
4. Start the `ios-app-store` workflow. It builds, signs, and uploads to
   TestFlight automatically (~15-20 min).

## App Store Connect — both paths

1. appstoreconnect.apple.com → Apps → **+ New App**:
   - Platform iOS, Name **Brachas with Rimon**, primary language English,
     Bundle ID `com.shancoh.brachaswithrimon` (register it at
     developer.apple.com → Identifiers → + → App ID if it's not offered),
     SKU anything (e.g. `brachas-rimon-1`).
2. Once a build has uploaded (Path A or B), select it under the version.
3. Fill the listing:
   - **Privacy Policy URL**: https://shancoh18.github.io/brachas-with-rimon/privacy.html
   - **Category**: Education (secondary: Lifestyle)
   - **Age rating**: answer the questionnaire honestly — no mature content,
     no gambling, no unrestricted web access → 4+. Board chat is messaging
     between people who share a board code (not a public forum) and it has
     report / block / filter, so answer any user-generated-content question
     accordingly.
   - **App Privacy** (nutrition label) — everything below is *linked to the
     user*, purpose **App Functionality**, and **not** used for tracking:
     - *Contact Info → Name, Email Address* — collected only when the user
       chooses to create an account; a guest session provides neither.
     - *Identifiers → User ID* (account id / friend code — a guest session
       gets an anonymous id, nothing personal) and *Device ID* (the APNs push
       token).
     - *User Content → Other User Content* (board chat messages).
     - *Usage Data → Product Interaction* (practice progress, points, streaks).
     - *User Content → Photos or Videos* (meal photos): **not linked**, App
       Functionality, processed transiently and **not stored**.
     - Everything else: not collected. "Used for tracking": **No** for all.
   - **Export compliance**: already answered in the app
     (`ITSAppUsesNonExemptEncryption=false`) — standard HTTPS only.
4. **Sign-in required** → leave it **UNTICKED**. Build 35 exists to remove
   the sign-in requirement (the 5.1.1(v) rejection); ticking this box tells
   App Review the opposite of what the notes and the app say. The reviewer
   credentials for the account-based features (friends, leaderboards, board
   chat) go in App Review Information → **Notes** — they are already in the
   block below, so nothing else is needed here.
   - Reviewer account: `review@brachaswithrimon.app` / the password kept OUT
     of this public repo (mirrored as BRACHA_REVIEW_PASSWORD in
     `D:/Claude GROUP APP/group-app-ad/.env`) — fill it into the Notes block
     where marked, never into the sign-in fields.

   The account must exist on the live API before you submit — sign it up in
   the app (Friends tab → account panel) with exactly that email/password (or
   via `POST /api/register`), or the reviewer hits a dead login and rejects
   for guideline 2.1.
5. **App Review notes** — paste the block under "App Review notes (build 35)"
   below, verbatim, into App Review Information → Notes.
6. Submit for Review. With the resubmission, also post the block under "Reply
   to App Review (build 35)" in the App Review message thread (Resolution
   Center) so the reviewer sees what changed. Typical turnaround: 1–2 days.

### App Review notes (build 35) — App Store Connect → App Review Information → Notes

> Version 1.0 (35) removes the sign-in requirement: the app now works without
> an account. After the short intro the app opens straight into the blessing
> guide as an anonymous guest session — no name, email, or any other personal
> information is asked for; progress is kept on the device and under an
> anonymous id on our server. Available without an account: the blessing
> guide (before- and after-blessings, Birkat Hamazon, the quick reference),
> identifying a meal by photo (identification runs server-side on the
> Anthropic Claude API, which costs us per call, so each session carries a
> daily allowance), the Learn lessons, the daily thought and weekly parsha,
> Journey (progress, points, streaks), mealtime reminders (local
> notifications), and the settings under Account.
>
> Only the social features need an account, because other people must be able
> to find you by a friend code and see your name on a shared board: Friends
> (friend codes, adding friends), leaderboards / boards, and board chat with
> its report / block tools. Opening the Friends tab as a guest shows a small
> "create an account" panel inside that tab — never a full-screen wall — and
> the rest of the app stays fully usable. Creating an account is optional and
> upgrades the same guest session in place (name + email + password, or Sign
> in with Apple), so nothing earned as a guest is lost; signing in to an
> existing account from a guest session switches to that account.
>
> Reviewer account (for the account-based features): review@brachaswithrimon.app /
> <password: kept OUT of this public repo — paste it here in the App Store Connect Notes; mirrored as BRACHA_REVIEW_PASSWORD in D:/Claude GROUP APP/group-app-ad/.env>
> (the "Sign-in required" box is left unticked because no feature outside
> the Friends tab needs an account). Creating a fresh account from
> that panel also works — any name + email + password; no verification email
> is sent. Account deletion is under Account → "delete my account permanently"
> and removes everything, including chat messages.
>
> Friends / leaderboards / chat need two accounts: sign in as the reviewer
> (Friends tab → account panel → Sign in), Friends tab → Create a leaderboard,
> then on a second account (feel free to create one) → Join with the
> 6-character board code. Board chat is private to the members of that board.
> Per guideline 1.2 every message has a Report action (spam / harassment /
> inappropriate / other), there is a Block-user control that hides that
> person's messages everywhere for you, and a server-side language filter
> rejects an offending message before it posts ("That message was blocked by
> the chat filter."). Reports are delivered to the developer for review.
>
> The Donate tab is hidden in this iOS version; there are no in-app
> purchases, subscriptions, or external payment links in the app.
>
> Halachic rulings come only from the app's built-in database (sourced from
> chabad.org, brachos.org, oukosher.org); the AI only identifies foods. The
> app is explicitly labeled a study aid on every screen.

### Reply to App Review (build 35) — App Review message thread

Plain text, under 900 characters, no bullets — paste as one message with the
resubmission:

> Thank you for the review. Build 33 was rejected under 5.1.1(v) because the app required registration before any feature could be used. Version 1.0 (35) fixes this: sign-in is no longer required. After the short intro the app opens as an anonymous guest (no personal information is requested), and the blessing guide, photo identification, lessons, daily thought, progress and streaks, reminders, and settings work without an account. Only the social features (friends by code, leaderboards, board chat) need one, since other people must be able to find you; the Friends tab shows an optional "create an account" panel inside the tab, never a full-screen wall, and creating one upgrades the guest session in place. To verify: launch, tap through the intro, and the app opens with no sign-in; then open the Friends tab to see the optional account panel. Reviewer credentials are unchanged.

## Screenshots and App Preview

Store assets are REAL UI captured from the deployed PWA — never mockups (Apple
rejects screenshots that don't match the running app). The pipeline lives in
`scripts/` and needs Chrome + ffmpeg (on a Linux runner point `CHROME_PATH` at
the browser binary):

1. `node scripts/store-capture.mjs --out=store-assets/raw69` — creates a
   throwaway demo account on the live API, seeds a lived-in progress state,
   walks every screen and saves pixel-exact PNGs at 440×956 @3x =
   **1320×2868** (6.9-inch iPhone — the only size ASC requires for an
   iPhone-only app; it scales down to the smaller slots). Add
   `--video --w=443 --h=960 --dpr=2` to record the screencast for the
   preview. The demo account is deleted at the end.
2. `node scripts/store-artboards.mjs --raw=store-assets/raw69 --out=store-assets/boards`
   — headline + the captured screen in a phone frame on the cream/espresso/gold
   system; alpha stripped (Apple rejects transparency).
3. `node scripts/store-preview-cards.mjs --out=store-assets/preview-cards` —
   intro / end cards and caption plates at 886×1920.
4. `node scripts/store-preview-compose.mjs --raw=raw.mp4 --cards=store-assets/preview-cards --vo=vo.mp3 --music=music.mp3 --out=preview.mp4`
   — the ≤30 s App Preview: H.264, 30 fps, **886×1920**, burned captions
   (previews autoplay muted), stereo AAC 48 kHz.

iPad screenshots are **not** needed: `TARGETED_DEVICE_FAMILY = 1` (iPhone-only)
and the app is portrait-only. iPads still run it in compatibility mode, but ASC
does not ask for iPad assets.

## Before submitting — two must-dos

- **Set the vision key** so the camera feature is live for the reviewer
  (a demo-only camera risks a "broken feature" rejection):
  create a key at console.anthropic.com, then
  `npx @railway/cli variables --set "ANTHROPIC_API_KEY=sk-..." --service brachas-rimon-api`
  (run with `MSYS_NO_PATHCONV=1` on the Windows box; verify `/health` shows
  `vision:true`).
- **TestFlight it on your own phone first**: App Store Connect → TestFlight →
  add yourself as internal tester. Check: slideshow → the app opens as a guest
  with NO sign-in screen, camera flow as a guest, reminders (enabling them is
  what triggers the iOS notification permission prompt — it is deliberately
  not asked at sign-in), Friends tab shows the inline account panel → create
  an account there and confirm the streak/points earned as a guest survive,
  a leaderboard + chat with a second account (report, block, a filtered
  word), account delete.

## Sign in with Apple token revocation (guideline 5.1.1(v))

Apple requires that deleting an account created with Sign in with Apple also
revokes the user's Sign in with Apple tokens. The server does this
(`server/apple-siwa.mjs`): at sign-in it exchanges Apple's authorization code
for a refresh token (stored as `users.apple_refresh`, never exposed), and
`/api/account/delete` POSTs that token to Apple's `/auth/revoke` before the
account row is removed. It only works once a **Sign in with Apple key** is
configured on Railway — until then sign-in and deletion behave as before and
the server logs that revocation was not possible. Set it up before review:

1. developer.apple.com → **Certificates, Identifiers & Profiles** → **Keys**
   → **+** → name it (e.g. `Rimon Sign in with Apple`) → tick
   **Sign in with Apple** → **Configure** → Primary App ID
   `com.shancoh.brachaswithrimon` → Save → Continue → Register →
   **Download** the `.p8` (only offered once — keep it out of the repo) and
   note the **Key ID**. Team ID is `6WT5WK8MLZ`.
2. Railway → `brachas-rimon-api` → Variables (names only; never commit values):
   - `APPLE_SIWA_KEY` = the `.p8` contents with line breaks as literal `\n`
     (same convention as `APNS_KEY`)
   - `APPLE_SIWA_KEY_ID` = the Key ID
   - `APPLE_TEAM_ID` = `6WT5WK8MLZ`

   Optional: `APPLE_SIWA_CLIENT_ID` (defaults to the bundle id / first
   `APPLE_CLIENT_IDS` entry). If you would rather reuse the APNs key, enable
   the Sign in with Apple service on *that* key in the portal and leave
   `APPLE_SIWA_KEY` unset — the server then falls back to `APNS_KEY` /
   `APNS_KEY_ID` / `APNS_TEAM_ID`; a key without the service enabled makes
   Apple answer `invalid_client`.
3. **Redeploy the Railway service** — variables are read at boot. The boot log
   shows `siwa: … ON`, and `/api/status` reports exchange/revoke outcomes
   under `dependencies.siwa`.

## Version bumps later

Each store update: bump `MARKETING_VERSION` (and the build number) in
`ios/App/App.xcodeproj/project.pbxproj` or in Xcode → General, rebuild,
upload, submit. The web app keeps deploying independently — the iOS bundle
ships its own copy of the web build at `npx cap sync` time. Keep the app
iPhone-only unless a real iPad layout AND iPad store assets exist.

# Shipping Brachas with Rimon to Google Play

Companion to `APPSTORE.md`. The Android app is the SAME web bundle inside a
Capacitor shell (`android/`), talking to the same Railway API, so an Android
user and an iPhone user share one account system, one friends league, the
same boards and the same chat. Nothing about friends is per-platform.

State on 2026-09-22: the code side is DONE (Android project, FCM push channel
server + client, back button, portrait, icons/splash, Codemagic workflows,
Play assets, privacy + deletion pages). What is left needs YOUR Google account
and is listed under **Operator checklist** — in order.

State on 2026-10-11: version 1.0.1 build 37 is on **Internal testing** (uploaded
2026-10-01, step 4); Play App Signing is enrolled and the registered upload key
is the Windows-box key (step 3). Build 38 replaces the Android launcher icon,
which still showed the old engraved line-art, with the iOS App Store icon
(see "Icons" under "How the Android build is wired"); the Play hi-res icon and
feature graphic were re-rendered the same day (see "Assets").

## What is cross-platform and what is not

| Feature | iPhone | Android | Notes |
|---|---|---|---|
| Guest session, blessing guide, photo ID, Learn, Journey, reminders | ✓ | ✓ | identical bundle |
| Friends / leaderboards / boards / chat | ✓ | ✓ | one server; codes are platform-agnostic |
| Email + password account | ✓ | ✓ | **the bridge**: an account created on either phone signs in on the other |
| Sign in with Apple | ✓ | ✗ | iOS-only (needs a redirect backend on Android). An Apple-linked user who buys an Android sets a password in Account → signs in with email there. Copy in Account says so. |
| Continue with Google | needs `VITE_GOOGLE_IOS_CLIENT_ID` | needs `VITE_GOOGLE_WEB_CLIENT_ID` + an Android OAuth client (SHA-1) | button hidden until the ids exist (step 5) |
| Chat / league / broadcast pushes | APNs (`users.apns`) | FCM (`users.fcm`, `server/fcm.mjs`) | `sendPush` fans out per channel; a mixed board buzzes both phones (scenario-tested) |
| Mealtime reminders | local notifications | local notifications (Android may deliver a few minutes late — no exact-alarm permission, Play reserves it) | never server pushes |
| Donate tab | hidden | hidden | Play's payments policy treats developer tips like IAP; keep `NATIVE_ENABLED=false` |
| Home-screen widget | iOS-only staging | none | — |

## Operator checklist (in order)

### 1. Play Console developer account (one-time, $25)
play.google.com/console — the browser is already signed in as
shancoh18@gmail.com and sits on "Creating a developer account".

- **Choose ORGANISATION, not personal, if Group App LLC has (or can get) a
  D-U-N-S number.** Reason: personal accounts created after 13 Nov 2023 must run
  a **closed test with 12 testers opted-in for 14 continuous days** before they
  may publish to production; organisation accounts publish directly. A D-U-N-S
  number is free from Dun & Bradstreet (dnb.com/duns) but takes up to 30 days —
  request it today if you don't have one. Organisation accounts also need a
  verified website (group.llc or a page on the GitHub Pages site works) and a
  business email.
- If you go personal anyway: the closed-testing path is fine — invite the
  first 12+ friends/family Android users as testers (step 8) and the 14 days
  double as the real-world shakedown.
- Identity verification (ID + phone) happens in the console; only you can do it.

### 2. Firebase project → FCM (Android pushes)
console.firebase.google.com → Add project "brachas-with-rimon" (Analytics
OFF). Project settings → General → Add app → Android → package
`com.shancoh.brachaswithrimon` → download **google-services.json** → put it at
`bracha-app/android/app/google-services.json` (it is not a secret; Google
documents it as safe to ship inside the APK, and `sync-master` publishes it).

Then Project settings → **Service accounts** → "Generate new private key" →
save the JSON OUTSIDE the repo (`group-app-ad/android-signing/`) and set ONE
Railway variable on service `brachas-rimon-api`:

```
FCM_SERVICE_ACCOUNT=<the whole JSON on one line; keep the \n inside private_key literal>
```

Redeploy (variables are read at boot). `/api/status` then shows
`users.fcm_devices` and a `fcm_*` alert if the key is wrong. Until this exists
the Android app still works; only server pushes stay off (`delivery:
"awaiting_server_key"`), exactly like iOS before the APNs key.

### 3. Upload key (Play App Signing) + Codemagic keystore
**As of 2026-10-11 Play App Signing is enrolled** (Google holds the real
app-signing key) and the UPLOAD key Play has registered is the **Windows-box
key of 2026-09-22** — the key build 37 was signed with. Every AAB uploaded to
Play must be signed with it:

```
SHA-1   2A:AB:DE:1F:A9:40:2B:D1:8C:60:74:C3:98:87:6E:F1:17:0F:79:76   (Windows key = registered upload key)
```

That keystore lives ONLY on the Windows box:
`D:\Claude GROUP APP\group-app-ad\android-signing\brachas-upload.p12`, alias
`upload`, both passwords = `BRACHA_ANDROID_UPLOAD_KEYSTORE_PASSWORD` in that
box's `group-app-ad\.env` (same file and variable names as the Mac key — the
SHA-1 tells them apart). Until the reset below is approved, a Play-acceptable
AAB needs that file (in Codemagic as `brachas_upload`, or jarsigner on the
Windows box); otherwise Android waits for the approval.

The full upload certificate (SHA-256 included) is in Play Console → Protected
with Play → App signing.

**Upload-key reset to the Mac key (owner decision 2026-10-11):** the owner
submits it in Play Console (Protected with Play → App signing → Request upload
key reset → Other) with `Claude Mind/bracha/2026-10-11-release38/upload-key-reset/upload_certificate.pem`
(the Mac key's public certificate). Google approves it within a few days and
the console then shows the date the Mac key becomes valid; from then on ONLY
the Mac key works and the Windows key is dead. Until that date, keep using the
Windows key.

The Mac key generated 2026-09-30 is **NOT accepted by Play** unless an
upload-key reset to it is requested in Play Console and approved by Google:
`group-app-ad/android-signing/brachas-upload.p12` beside the Mac working copy's
workspace (`~/Desktop/:my-project:/group-app-ad/`) — PKCS12, alias `upload`,
RSA 2048 / SHA-256, valid to 2056; password in `group-app-ad/.env` as
`BRACHA_ANDROID_UPLOAD_KEYSTORE_PASSWORD`; key password = store password.

```
SHA-1   2B:FF:F6:54:0E:1B:39:23:8E:3C:1A:43:1A:C5:2F:35:E3:99:76:6E   (Mac key, NOT registered)
SHA-256 B6:57:28:F1:FC:D4:B1:6D:55:0A:26:72:0E:F1:07:B1:4A:07:9F:C5:02:32:FB:F2:95:EE:EE:90:4C:E7:87:49
```

Codemagic: codemagic.io → Teams → Personal → **Code signing identities →
Android keystores**, reference name exactly `brachas_upload`, alias `upload`,
both passwords — the `android-play` workflow in `codemagic.yaml` signs with
whatever keystore sits under that name. Its AAB is accepted by Play only if
that keystore is the registered upload key (the Windows key today, or the Mac
key once a reset is approved). Back both keystores up somewhere private
(with Play App Signing on, Google can reset a lost upload key).

### 4. First build
Needs release 37 (or later) on master: release 36's `codemagic.yaml` was
invalid, so no workflow could start and no Android build has ever run.
codemagic.io → brachas-with-rimon → Start new build → branch `master` →
workflow **Android Play build (signed AAB)** → download
`app-release.aab` from the artifacts. (Before the keystore exists, the
**Android debug APK** workflow builds a sideloadable APK with no secrets —
good for trying the app on your own phone today: enable "install unknown
apps", open the .apk.)

What actually happened for build 37: it reached **Internal testing on
2026-10-01** as an UNSIGNED Codemagic AAB (built from a temporary branch
`android-unsigned-37`, since deleted) that was then signed with `jarsigner`
on the Windows box with the Windows upload key (step 3). Build 38 and later
need the same: an AAB signed with the registered upload key.

**Every Android build from now on (the Mac is the release machine):**
1. Codemagic → Code signing identities → Android keystores: `brachas_upload`
   must hold the registered upload key (after the reset: the Mac key — the
   owner uploads `brachas-upload.p12` there once; Claude never types keystore
   passwords).
2. Start **Android Play build (signed AAB)** on `master`.
3. In the build log, the `keytool -printcert -jarfile` step prints the signer:
   upload the AAB only if its SHA-1 is the registered one (step 3).
4. Play Console → Test and release → the track → Create new release → upload
   `app-release.aab` → release notes → Save → roll out.

### 5. Google Sign-In (optional but recommended — Android users expect it)
console.cloud.google.com → same project as Firebase → APIs & Services →
Credentials → Create OAuth client ID:
- **Web application** → copy its client id → build-time
  `VITE_GOOGLE_WEB_CLIENT_ID=<id>` (Codemagic env group `google_oauth`, and
  in `bracha-app/.env` for local builds) AND Railway `GOOGLE_CLIENT_IDS=<id>`
  (the id-token audience the server verifies).
  **Codemagic only injects a group into workflows that LIST it**: every
  workflow in `codemagic.yaml` carries a commented `groups: - google_oauth`
  block under `environment:`. Order matters — first create the env group
  `google_oauth` in Codemagic (Teams → Environment variables; it may stay
  empty until the ids exist), THEN uncomment those lines, because a workflow
  that names a missing group fails to start (and `ios-app-store` auto-runs on
  every master push). The "Build web app" step prints whether
  `VITE_GOOGLE_WEB_CLIENT_ID` / `VITE_GOOGLE_IOS_CLIENT_ID` were set; without
  them "Continue with Google" is silently compiled out.
- **Android** → package `com.shancoh.brachaswithrimon`, SHA-1 = the
  registered upload key (step 3). Also add a SECOND Android client with the
  **app signing key's SHA-1** from Play Console → Protected with Play → App signing
  (Play re-signs the bundle with that key; Credential Manager checks the
  installed APK's signer).
- iOS later: an **iOS** client → `VITE_GOOGLE_IOS_CLIENT_ID` (+ add it to
  `GOOGLE_CLIENT_IDS`, comma-separated). **NOT YET** (review 2026-09-29):
  `ios/App/App/Info.plist` has no reversed-client-id URL scheme, so once the iOS
  id is injected the Google button appears on iOS and tapping it crashes the
  app. Add the URL type in the SAME build that first sets the iOS id, and test
  it on TestFlight; until then put only the WEB id in `google_oauth`.
Also fill the OAuth consent screen (app name, support email, privacy URL).
No code changes: `src/lib/socialAuth.ts` shows the Google button wherever the
matching id exists.

### 6. Play Console — app record
Create app → name **Brachas with Rimon**, default language English (US), App,
Free. Then Dashboard → "Set up your app":
- **Privacy policy**: https://shancoh18.github.io/brachas-with-rimon/privacy.html
- **App access**: "All or some functionality is restricted" → add the reviewer
  account `review@brachaswithrimon.app` / password from
  `group-app-ad/.env` (`BRACHA_REVIEW_PASSWORD`) with the note that the app
  works without sign-in and the credentials are only for Friends/boards/chat.
- **Advertising ID declaration** (App content → Advertising ID): **No** — the
  bundle carries no `com.google.android.gms.permission.AD_ID`: the unused
  Facebook Login SDK is compiled out (`capacitor.config.ts`
  `SocialLogin.providers.facebook: false`) and the manifest removes the
  permission with `tools:node="remove"`. Verify in the Codemagic build log's
  merged manifest; a bundle that still declared AD_ID would make this "No"
  a release-page error.
- **Ads**: No. **Content rating**: questionnaire — Education/Reference;
  user-to-user communication: YES, but restricted to people who share a board
  code, with report + block + filter; no user location sharing; no purchases.
  Expect "Everyone".
- **Target audience**: 13+ (not designed for children; keeps us out of the
  Families policy). **News app**: No. **COVID**: No. **Data safety**: table below.
- **Government apps / Financial features**: No. **Health**: No.
- **Account deletion** (User data policy): "provides a way to request
  deletion" → URL https://shancoh18.github.io/brachas-with-rimon/delete-account.html;
  also confirm in-app deletion exists (Account → delete my account).
- **App category**: Education. Tags: religion, Judaism, learning.
- **Store listing**: copy under "Listing text" below; assets under "Assets".

### 7. Data safety form (answers)
Everything is "collected", encrypted in transit, deletable by the user, NOT
shared with third parties, NOT used for advertising:

| Data type | Collected | Required? | Purpose |
|---|---|---|---|
| Personal info → Name, Email address | Yes | Optional (only with an account) | App functionality, account management |
| Personal info → User IDs (account id / friend code, Apple/Google subject) | Yes | Required (guest id is anonymous) | App functionality |
| Photos → Photos | Yes, processed ephemerally (not stored) | Optional | App functionality |
| Messages → Other in-app messages (board chat) | Yes | Optional | App functionality |
| App activity → App interactions (last-use timestamp, timezone offset, per-day practice history, chat read position; plus points and streaks) | Yes | Required | App functionality |
| App activity → Other user-generated content (board titles, display names) | Yes | Optional (only with an account) | App functionality |
| Device or other IDs (FCM token) | Yes | Optional | App functionality (notifications) |
| Location, Financial, Health, Contacts, Calendar, Files, Audio, Web browsing, Installed apps, Crash logs, Diagnostics | Not collected | — | — |

Independent security review: No. Data handling: the app uses the developer's
own server; no third-party SDKs except Firebase Messaging (token only) — the
social-login plugin's Facebook provider is compiled out
(`SocialLogin.providers.facebook: false`), so the bundle ships no Facebook
code and no advertising-ID permission.

### 8. Testing tracks → production
1. **Internal testing** (up to 100 emails, instant): upload the AAB from
   step 4, add your own Gmail + a few friends → they get a Play link the same
   hour. Use this for the first device pass (checklist below).
2. **Closed testing** (required for 14 days on a personal account; optional on
   an organisation account, still recommended): create a Google Group
   (e.g. brachas-rimon-testers@googlegroups.com) or paste emails; share the
   opt-in link. Every Android user you already have on the web app is a
   candidate — the in-app invite link and the site can carry the Play link
   once it exists. 12 testers must STAY opted in for 14 consecutive days
   (uninstalling is fine, opting out is not).
3. Apply for **production** (Dashboard → "Apply for production access" on
   personal accounts), answer the questions about what the testers found,
   then promote the same release to Production. Review takes hours to a few
   days.

Every upload needs a NEW `versionCode` in `android/app/build.gradle` — keep
it equal to the iOS `CURRENT_PROJECT_VERSION` (both are 38 now, still version
1.0.1: 37 = the 2026-09-22 merge of the Sep-15 fixes onto release 36, on
Internal testing since 2026-10-01; 38 = 37 + the icons regenerated from the
iOS icon, 2026-10-11; `versionName` tracks `MARKETING_VERSION`) and bump all
THREE places before
`scripts/sync-master.mjs`: `versionCode`, `CURRENT_PROJECT_VERSION` (both
pbxproj configs) and `appendUserAgent: 'BrachasRimon/<build>'` in
`capacitor.config.ts` — the server's `legacyNativeClient()` keys its
legacy-client rule on that marker (CLAUDE.md build-number rule).

### 9. First-device checklist (internal testing)
- Onboarding → home without any sign-in; `/api/me` says guest.
- Photo: "Photograph my meal" opens the phone's CAMERA APP — not the file
  picker (on Android 11+ that needs the manifest's <queries> IMAGE_CAPTURE
  entry) — after the CAMERA permission prompt the first time; "or choose a
  photo from your gallery" opens the gallery; both give a result, the
  demo-fallback banner is NOT shown. Deny the permission once: the next tap
  asks again. Deny it twice (Android 11+ then stops asking): the button does
  nothing, the gallery link still works, and Settings → Apps → Brachas with
  Rimon → Permissions → Camera restores it. Known limitation: if Android kills
  the app while the camera is open (Developer options → "Don't keep
  activities"), that photo is discarded without a crash — take it again.
- Status bar: header not under the clock; tab bar above the gesture bar;
  keyboard: tab bar hides, input stays visible.
- BACK: from guide → confirm; from any tab → Bless; from home → app minimises
  (does NOT quit).
- Dark mode from Account: status-bar icons turn light.
- Reminders: enable → Android 13 notification prompt → a test at the next
  slot (may be a few minutes late).
- Friends: create an account → same friend code; sign in on an iPhone with
  the same email → same points; board chat between the two phones → the
  Android phone gets a push (needs step 2 done).
- Sign out → `/api/status` shows `fcm_devices` drop by one.

## Listing text

**App name** (30): Brachas with Rimon
**Short description** (80): Photograph your meal and learn the right blessings, in the right order.
**Full description** (4000):

> Every bite, a blessing.
>
> Brachas with Rimon photographs your meal, identifies the foods, and walks you through the correct brachos — before-blessings in the correct order (kedima) and the correct after-blessing (Birkat Hamazon, Me'ein Shalosh or Borei Nefashos) for exactly what you ate. Every ruling comes from a vetted database sourced to chabad.org, brachos.org and OU Kosher, with a citation you can read.
>
> • Snap it or add it by hand — every food on the plate gets its blessing, gluten-free flours included.
> • Say it right: Hebrew with nikud, transliteration, English, and audio. Nusach Ari, Ashkenaz and Edot Hamizrach.
> • Never miss the after-blessing — save it for later and Rimon reminds you.
> • Learn: the daily parsha one aliyah at a time, a daily thought from chabad.org, and a library on why we bless.
> • Journey: streaks (Shabbat never breaks one), points, three daily challenges, badges, mealtime reminders.
> • Friends: trade RIMON codes, race on timed leaderboards, and chat with your board — across iPhone and Android.
>
> No account needed. Create one only when you want friends and leaderboards, or your progress on another phone.
>
> This app is a study aid. For any practical halachic question, consult a qualified rabbi.

**Contact email**: shancoh18@gmail.com · **Website**: https://shancoh18.github.io/brachas-with-rimon/

## Assets (already rendered — real UI, no generative redraw)
Icon + feature graphic, re-rendered 2026-10-11 from the iOS App Store icon,
in `~/Desktop/:my-project:/Claude Mind/bracha/2026-10-11-release38/graphics/`
(the `google-play-v1.0` copies of these two show the OLD line-art — do not
upload them). Upload in Play Console → Store listing; they are separate from
the AAB, while the launcher icon on devices changes only with a new build:
- `icon-512x512.png` — 512×512, 32-bit RGBA, fully opaque (Play hi-res icon):
  `node scripts/android-launcher-icons.mjs --play=<dir>`
- `feature-graphic-1024x500.png` — 1024×500 RGB, no alpha:
  `CHROME_PATH="<chrome binary>" node scripts/play-feature-graphic.mjs --out=<dir>`
  (embeds `art/icon-1024.png`; needs network for Google Fonts; also writes
  `feature-graphic.html` beside the PNG; the CHROME_PATH default is the
  Windows path)

Screenshots, unchanged (= the App Store set), in
`C:\Users\VR\OneDrive\Desktop\Brachas brand kit\google-play-v1.0\`:
- `screenshots-phone-1080x1920/01-home … 09-friends.png` — 9:16 boards from
  the same real captures as the App Store set (`scripts/store-artboards.mjs
  --w=1080 --h=1920`); Play wants 2–8 phone screenshots, 16:9 or 9:16, each
  side 320–3840 px — upload the first 8.
- App preview video: optional on Play (YouTube link); the App Store preview
  mp4 can be uploaded to YouTube unlisted and linked.

## How the Android build is wired (for the next developer)
- `android/` was created with `npx cap add android` (Capacitor 8.5, minSdk 24,
  target/compile SDK 36 = Google's Aug-2026 requirement). Generated dirs are
  git-ignored and skipped by `sync-master`; Codemagic regenerates them with
  `npx cap sync android`.
- `android/app/src/main/AndroidManifest.xml`: portrait-only, `adjustResize`,
  CAMERA (optional feature) for the file-input camera, FCM default icon
  (`ic_stat_rimon`, built by `scripts/android-stat-icon.mjs`) / colour /
  channel `rimon`. Since the 2026-09-22 review: `android:allowBackup="false"`
  (the persisted store holds the bearer token — never to Google Drive),
  `AD_ID` removed with `tools:node="remove"`, and the
  `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` activity property that
  keeps the portrait lock on Android 16 tablets/foldables (expires at
  targetSdk 37 — a landscape rule for `.tk-cover` is the real fix).
- `capacitor.config.ts`: `SocialLogin.providers` = google + apple only
  (Facebook compiled out — see step 6) and `appendUserAgent:
  'BrachasRimon/<build>'`, the marker the server's `legacyNativeClient()`
  uses to tell iOS build 35 (no community-rules panel, keeps the pre-gate chat
  behaviour) from every later native build — bump it with the build number.
- `codemagic.yaml`: both Android workflows run on **Java 21** (Capacitor 8
  compiles at VERSION_21; Java 17 stops at "invalid source release: 21") and
  print `java -version` before Gradle; the shared `web_tests` steps mirror
  `scripts/preflight.mjs` suite for suite — each step has its own anchor and
  every workflow lists each alias on its own line. Never alias the whole list
  (`- *web_tests`): Codemagic rejects the entire file and ignores every push
  (why release 36 never built — see CLAUDE.md, Android build hardening).
- Icons (2026-10-11, build 38): ONE master = the live iOS icon
  `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  ("Frost Blush" frosted-glass pomegranate, 1024×1024 RGB, md5 8fec8357…).
  Every Android, Play and PWA icon comes from ONE command:
  `node scripts/android-launcher-icons.mjs [--play=<dir>] [--preview=<dir>] [--dry]`.
  It byte-copies the master to `art/icon-1024.png` + `assets/icon-only.png`
  and writes the adaptive foreground (`mipmap-*/ic_launcher_foreground.png`,
  true 108dp: 81–432 px), the legacy `ic_launcher` / `ic_launcher_round`
  (API 24–25, 36–192 px), plain `<adaptive-icon>` XML (no `<inset>`, no
  `<monochrome>`), `@color/ic_launcher_background` #FAF8EF,
  `assets/icon-foreground.png` + `icon-background.png`, and
  `public/icon-192.png` / `icon-512.png` (any) + `icon-maskable-512.png`
  (maskable). Idempotent; it warns if the master's md5 changes (its geometry
  was measured on this art). `scripts/preflight.mjs` blocks every upload when
  `art/icon-1024.png` or `assets/icon-only.png` differ from the iOS icon by a
  byte. NEVER regenerate icons from the old line-art, and never with
  `npx @capacitor/assets generate --android` (not used for icons): it
  recreates soft 192 px layers wrapped in `<inset 16.7%>` — the bug Android
  shipped through build 37. Splash (`splash.png`, Rimon on cream) already
  matches iOS; if `@capacitor/assets` is ever run for splash images, re-run
  the icon script afterwards.
- Notification glyph `ic_stat_rimon`: NOT made by the launcher script —
  `scripts/android-stat-icon.mjs` traces it from `art/legacy-lineart-1024.png`
  (the old engraved line-art, md5 cb59c65f…, kept ONLY for this);
  `--out=<res dir>` (default `android/app/src/main/res`), `--preview=<png>`.
  Re-running it reproduces the shipped glyph byte-identically.
- `capacitor.config.ts`: SystemBars `style: LIGHT` (dark icons on cream),
  CSS insets; `src/index.css` pads the top on Android
  (`html[data-platform='android']`, stamped in `src/main.tsx`);
  `src/lib/theme.ts` flips the bar style with dark mode.
- `src/lib/backButton.ts`: hardware BACK semantics (see file header).
- `src/lib/native.ts`: `platform()/isAndroid()/isIOS()`, the shared
  notification channel, FCM registration; `/api/push/native` takes
  `{token, platform}`; `server/fcm.mjs` delivers; `server/test/mock-fcm.mjs`
  + the "Android (FCM) + mixed boards" block in `server/test/scenarios.mjs`
  prove the fan-out.
- Build number: `versionCode` in `android/app/build.gradle` mirrors the iOS
  build number; bump both — plus the `appendUserAgent: 'BrachasRimon/<build>'`
  marker above (THREE places, CLAUDE.md build-number rule).

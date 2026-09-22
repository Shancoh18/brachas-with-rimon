# Shipping Brachas with Rimon to Google Play

Companion to `APPSTORE.md`. The Android app is the SAME web bundle inside a
Capacitor shell (`android/`), talking to the same Railway API, so an Android
user and an iPhone user share one account system, one friends league, the
same boards and the same chat. Nothing about friends is per-platform.

State on 2026-09-22: the code side is DONE (Android project, FCM push channel
server + client, back button, portrait, icons/splash, Codemagic workflows,
Play assets, privacy + deletion pages). What is left needs YOUR Google account
and is listed under **Operator checklist** — in order.

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

### 3. Upload keystore into Codemagic (2 minutes)
Already generated: `D:/Claude GROUP APP/group-app-ad/android-signing/brachas-upload.p12`
(PKCS12, alias `upload`, password in `group-app-ad/.env` as
`BRACHA_ANDROID_UPLOAD_KEYSTORE_PASSWORD`; key password = store password).
Certificate fingerprints (you will paste these into Google Cloud + Play):

```
SHA-1   2A:AB:DE:1F:A9:40:2B:D1:8C:60:74:C3:98:87:6E:F1:17:0F:79:76
SHA-256 30:D2:2E:01:0C:32:D1:A6:5A:0F:41:A3:8A:15:65:C6:0E:07:BB:63:BB:35:82:F9:1D:12:3E:E2:71:96:E4:5A
```

codemagic.io → Teams → Personal → **Code signing identities → Android
keystores → Add keystore**: upload the .p12, reference name exactly
`brachas_upload`, alias `upload`, both passwords. The `android-play` workflow
in `codemagic.yaml` refers to that name. Back the .p12 up somewhere private
(it is the UPLOAD key; with Play App Signing on — the default — Google holds
the real app-signing key and can reset an upload key if this one is lost).

### 4. First build
codemagic.io → brachas-with-rimon → Start new build → branch `master` →
workflow **Android Play build (signed AAB)** → download
`app-release.aab` from the artifacts. (Before the keystore exists, the
**Android debug APK** workflow builds a sideloadable APK with no secrets —
good for trying the app on your own phone today: enable "install unknown
apps", open the .apk.)

### 5. Google Sign-In (optional but recommended — Android users expect it)
console.cloud.google.com → same project as Firebase → APIs & Services →
Credentials → Create OAuth client ID:
- **Web application** → copy its client id → build-time
  `VITE_GOOGLE_WEB_CLIENT_ID=<id>` (Codemagic env group `google_oauth`, and
  in `bracha-app/.env` for local builds) AND Railway `GOOGLE_CLIENT_IDS=<id>`
  (the id-token audience the server verifies).
- **Android** → package `com.shancoh.brachaswithrimon`, SHA-1 = the upload
  key above. After the first Play upload, add a SECOND Android client with the
  **app signing key's SHA-1** from Play Console → Setup → App signing
  (Play re-signs the bundle with that key; Credential Manager checks the
  installed APK's signer).
- iOS later: an **iOS** client → `VITE_GOOGLE_IOS_CLIENT_ID` (+ add it to
  `GOOGLE_CLIENT_IDS`, comma-separated).
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
| App activity → Other user-generated content (progress, points, streaks) | Yes | Required | App functionality |
| Device or other IDs (FCM token) | Yes | Optional | App functionality (notifications) |
| Location, Financial, Health, Contacts, Calendar, Files, Audio, Web browsing, Installed apps, Crash logs, Diagnostics | Not collected | — | — |

Independent security review: No. Data handling: the app uses the developer's
own server; no third-party SDKs except Firebase Messaging (token only).

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
it equal to the iOS `CURRENT_PROJECT_VERSION` (both are 36 now) and bump both
before `scripts/sync-master.mjs`.

### 9. First-device checklist (internal testing)
- Onboarding → home without any sign-in; `/api/me` says guest.
- Photo: camera opens from "Photograph my meal" (CAMERA permission prompt),
  gallery works, a result appears, demo-fallback banner is NOT shown.
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
`C:\Users\VR\OneDrive\Desktop\Brachas brand kit\google-play-v1.0\`
- `icon-512x512.png` — 512×512, 32-bit PNG (Play hi-res icon)
- `feature-graphic-1024x500.png` — `scripts/play-feature-graphic.mjs`
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
  channel `rimon`.
- Icons + splash: `npx @capacitor/assets generate --android` from
  `assets/icon-only.png` + `assets/icon-foreground.png` +
  `assets/icon-background.png` + `assets/splash.png`.
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
  build number; bump both.

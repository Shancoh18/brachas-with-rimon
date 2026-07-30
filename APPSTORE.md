# Shipping Brachas with Rimon to the App Store

The repo is App Store-ready: the `ios/` Xcode project is committed, reminders
use native iOS local notifications, in-app account deletion exists (Apple
requires it), the privacy policy is live, and icons/splash are generated.
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
   - **Age rating**: answer everything "No" → 4+
   - **App Privacy** (nutrition label): Data collected — *Contact Info → Email
     Address* (linked to user, app functionality only, no tracking) and
     *User Content → Photos* (not linked — processed transiently, not stored)
     and *Identifiers → User ID* (the friend code, linked, app functionality).
     Everything else: not collected. "Used for tracking": **No** for all.
   - **Export compliance**: already answered in the app
     (`ITSAppUsesNonExemptEncryption=false`) — standard HTTPS only.
4. **App Review notes** — paste this so the reviewer can test accounts:
   > The app works fully without an account. To test the friends league:
   > create an account with any name + email (no verification email is sent;
   > email + the issued RIMON code is the sign-in pair). Account deletion is
   > under Account → "delete my account permanently". Meal photos are
   > identified via the Anthropic Claude API; halachic rulings come only from
   > the app's built-in database. The app is explicitly labeled a study aid.
5. Submit for Review. Typical turnaround: 1–2 days.

## Before submitting — two must-dos

- **Set the vision key** so the camera feature is live for the reviewer
  (a demo-only camera risks a "broken feature" rejection):
  create a key at console.anthropic.com, then
  `npx @railway/cli variables --set "ANTHROPIC_API_KEY=sk-..." --service brachas-rimon-api`
  (run with `MSYS_NO_PATHCONV=1` on the Windows box; verify `/health` shows
  `vision:true`).
- **TestFlight it on your own phone first**: App Store Connect → TestFlight →
  add yourself as internal tester. Check: slideshow, camera flow, reminders
  (Journey tab — expect the iOS notification permission prompt), account
  create/sign-in/delete.

## Version bumps later

Each store update: bump `MARKETING_VERSION` (and build number) in
`ios/App/App.xcodeproj/project.pbxproj` or in Xcode → General, rebuild,
upload, submit. The web app keeps deploying independently — the iOS bundle
ships its own copy of the web build at `npx cap sync` time.

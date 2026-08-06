# iPhone Home Screen widgets — one-time setup

Everything is coded and staged in this folder; the WEB side already calls the
bridge on every progress change (`src/lib/widgetBridge.ts` — a safe no-op until
the native plugin exists). What remains is one Xcode session (~15 min), because
adding an extension target + App Group can't be done safely by editing
project.pbxproj blind from CI.

## Steps (on a Mac, in Xcode, with ios/App/App.xcodeproj open)

1. **App Group** (portal + Xcode):
   - Target `App` → Signing & Capabilities → + Capability → App Groups →
     add `group.com.shancoh.brachaswithrimon` (Xcode registers it on the
     developer portal with automatic signing).

2. **Bridge plugin into the app target**:
   - Drag `WidgetBridgePlugin.swift` and `WidgetBridgePlugin.m` from this
     folder into the `App` group in Xcode (check "Copy items if needed",
     target = App). Capacitor auto-registers the plugin via the CAP_PLUGIN
     macro — no other wiring.

3. **Widget extension target**:
   - File → New → Target → Widget Extension. Name: `RimonWidgets`.
     UNCHECK "Include Configuration App Intent". Activate the scheme.
   - Delete the template Swift file; drag in `RimonWidgets.swift` from this
     folder (target = RimonWidgets).
   - Target `RimonWidgets` → Signing & Capabilities → + App Groups →
     the same `group.com.shancoh.brachaswithrimon`.
   - Set the extension's iOS deployment target to match the app's.

4. **Codemagic**: automatic signing via the existing App Store Connect
   integration picks up the new extension bundle id
   (`com.shancoh.brachaswithrimon.RimonWidgets`) — if the build complains
   about a missing profile, run one build with
   `xcode-project use-profiles` after fetching profiles for BOTH bundle ids.

5. Commit the project changes and let the next `scripts/sync-master.mjs`
   push ship it (bump CURRENT_PROJECT_VERSION first, per CLAUDE.md).

## What the user gets

- **Bracha streak** (small): 🔥 streak number + 7-day strip + lifetime count.
- **Bracha reminder** (small + medium): "Have you said your bracha today?" —
  flips to "Bracha said ✓ · N today" once the day's first bracha is recorded;
  resets itself at midnight even if the app never opens.

Both are light/dark aware and use the app's Editorial Luxury palette.

## Data contract (written by the web app via WidgetBridge.sync)

UserDefaults(suiteName: group.com.shancoh.brachaswithrimon):
`streak` Int · `streakBest` Int · `totalBrachos` Int · `brachosToday` Int ·
`blessedToday` Bool · `week` [Bool]×7 oldest→today · `updatedDay` "YYYY-MM-DD"
(local). The widget expires "today" state itself when `updatedDay` ≠ today.

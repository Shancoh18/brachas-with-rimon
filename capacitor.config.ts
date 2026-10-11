import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shancoh.brachaswithrimon',
  appName: 'Brachas with Rimon',
  webDir: 'dist',
  // Marks every WebView request from the native shells: "… BrachasRimon/<build>".
  // server/server.mjs legacyNativeClient() relies on it: an iPhone/iPad UA with
  // neither a "Safari/" token nor this marker is iOS build 35 (no community-
  // rules panel), which keeps the pre-gate chat behaviour — the iOS home-screen
  // PWA sends the same marker-less UA and rides along, deliberately (the web
  // client gates in the UI; see legacyNativeClient); anything carrying the
  // marker is gated like Safari and Android. BUMP THE NUMBER WITH THE BUILD
  // NUMBER (CLAUDE.md build-number rule) — it is the only way the server can
  // tell one native build from another.
  appendUserAgent: 'BrachasRimon/38',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#faf7e9',
  },
  android: {
    // first frame before the WebView paints — the app cream, never white/black
    backgroundColor: '#faf7e9',
  },
  plugins: {
    // Android 15+ (targetSdk 35+) is edge-to-edge. Capacitor 8's SystemBars
    // keeps the default `insetsHandling: css`: with viewport-fit=cover
    // (index.html) the WebView receives real env(safe-area-inset-*) values,
    // which the tab bar, sheets and takeovers already use for the bottom, and
    // src/index.css pads the top on Android only (iOS insets natively via
    // contentInset). `style: LIGHT` = light bars, DARK icons — right for the
    // cream canvas; src/lib/theme.ts flips it when the user picks dark mode.
    SystemBars: {
      style: 'LIGHT',
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    // iOS: show a push that arrives while the app is in the foreground too
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Android: mealtime reminders use the same status-bar glyph as FCM pushes
    // (alpha-only silhouette, scripts/android-stat-icon.mjs), tinted brand gold
    LocalNotifications: {
      smallIcon: 'ic_stat_rimon',
      iconColor: '#B8892B',
    },
    // Only the providers src/lib/socialAuth.ts initialises. The plugin's sync
    // hook (node_modules/@capgo/capacitor-social-login/scripts/
    // configure-dependencies.js, getProviderConfig) reads
    // `plugins.SocialLogin.providers` — `true` → `implementation`, `false` →
    // `compileOnly` — and, when the key is absent, defaults EVERY provider to
    // included. That pulled facebook-login (+ ~1.8 MB, an exported custom-tab
    // activity and its AD_ID / ACCESS_ADSERVICES_* permissions) into the
    // Android bundle: a Play "Advertising ID declaration" mismatch for an SDK
    // the app never initialises (review 2026-09-22). Facebook login is not
    // offered anywhere in the app.
    // Android (Gradle) and CocoaPods ONLY: the hook rewrites the plugin's
    // android/gradle.properties and its podspec, but this app builds iOS via
    // SPM (ios/App/CapApp-SPM/Package.swift → CapgoCapacitorSocialLogin), whose
    // own Package.swift depends on facebook-ios-sdk unconditionally — so
    // FBSDKCoreKit / FBSDKLoginKit stay in the iOS binary (as in builds 35/36;
    // dormant, never initialised) and the App Store privacy answers must keep
    // accounting for them. Dropping it on iOS needs a fork of the plugin's
    // Package.swift or a switch to Pods. (second review 2026-09-23)
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false },
    },
  },
};

export default config;

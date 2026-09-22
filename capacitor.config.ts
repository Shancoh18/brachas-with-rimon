import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shancoh.brachaswithrimon',
  appName: 'Brachas with Rimon',
  webDir: 'dist',
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
  },
};

export default config;

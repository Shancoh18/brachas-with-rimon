/**
 * Build-time constants injected by vite.config.ts `define`.
 *
 * __ANDROID_FCM__ — true when android/app/google-services.json existed when
 * the bundle was built, i.e. Firebase Cloud Messaging is compiled into the
 * Android app. src/lib/native.ts refuses to register for push on Android
 * otherwise (the plugin would crash the process without Firebase).
 */
declare const __ANDROID_FCM__: boolean;

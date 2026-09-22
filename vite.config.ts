import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
// Android push (FCM) is compiled in ONLY when the Firebase config file is
// present at build time: without it the native push plugin crashes the
// process on registration (see src/lib/native.ts), so the bundle must know.
const ANDROID_FCM = existsSync(fileURLToPath(new URL('./android/app/google-services.json', import.meta.url)));

export default defineConfig({
  define: {
    __ANDROID_FCM__: JSON.stringify(ANDROID_FCM),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // manifest.webmanifest is authored by hand in public/
      manifest: false,
      workbox: {
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,webp,png,svg,mp3,mp4,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5199,
  },
});

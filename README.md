# Brachas with Rimon

Mobile-first PWA + iOS app (Capacitor) that photographs a meal, identifies the
foods, and teaches the correct brachos. Project rules, architecture and
invariants live in `CLAUDE.md`; App Store shipping in `APPSTORE.md`.

## Monitoring & automations

The API measures itself: `GET /api/status?key=…` on the Railway service
(`server/status.mjs`; key = `STATUS_KEY` env, else derived from
`BROADCAST_KEY`; 404 without it) returns users and growth, storage, memory and
event-loop lag, vision quota and Anthropic errors, daily-thought freshness,
backups, push, open chat reports, and an `alerts[]` list at WARN / CRITICAL.
Two Anthropic cloud routines read it — `bracha-daily-check-cloud` (the daily
brief) and `bracha-capacity-watch-cloud` (capacity and health) — and page the
operator via PushNotification, writing receipts to the Group App cloud ledger
as `bracha-daily-check` / `bracha-capacity-watch`. Monitoring lives in those
cloud routines; any scheduled task on the local dev box is a manual fallback
only (it runs only while that machine is awake).

---

## Vite template notes (scaffold)

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

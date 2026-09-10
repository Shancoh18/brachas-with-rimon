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

## Guest sessions — no sign-in required (guideline 5.1.1(v))

App Review rejected version 1.0 build 33 on 2026-09-09 because the app
required registration before any feature could be used. Since **version 1.0,
build 35** (build 34 was superseded before submission) the app opens without
an account: after onboarding the client silently calls `POST /api/guest`,
which mints an anonymous user (`users.guest = 1`, no name, email or any other
personal information) and returns `{ token, code, guest: true }`. If that call
fails the app still renders with local-only progress and retries on the next
boot/foreground. Everything that is not account based works as a guest — the
blessing guide, photo identification (with its daily allowance), lessons, the
daily thought and parsha, Journey/progress/streaks, reminders and settings.
The account-based features (Friends: friend codes, leaderboards/boards, board
chat, report/block) show an inline "create an account" panel inside the
Friends tab instead — never a full-screen wall. Creating an account from a
guest session (name + email + password, Sign in with Apple, or Google, while
holding the guest token) upgrades the same user row in place and clears the
guest flag, so progress and the friend code are kept; signing in to an
existing account from a guest session switches to that account and the orphan
guest row is pruned later. `/api/me` reports `guest` so clients and the e2e
suite can tell the two apart.

## Sign in with Apple token revocation (guideline 5.1.1(v))

When a user who signed in with Apple deletes their account, the API revokes
their Sign in with Apple tokens (`server/apple-siwa.mjs`). `/api/oauth`
exchanges the sign-in authorization code (the client forwards it as
`authorizationCode`) for a refresh token, stored as `users.apple_refresh` and
never returned by any route; `/api/account/delete` POSTs it to
`https://appleid.apple.com/auth/revoke` before the row is deleted. Both calls
are signed with an ES256 `client_secret` from a "Sign in with Apple" private
key. Railway variables (names only — values live in Railway, never in the repo):

- `APPLE_SIWA_KEY` — the .p8 contents, line breaks written as literal `\n`
- `APPLE_SIWA_KEY_ID` — that key's 10-character Key ID
- `APPLE_TEAM_ID` — `6WT5WK8MLZ`
- optional: `APPLE_SIWA_CLIENT_ID` (defaults to the first `APPLE_CLIENT_IDS`
  entry / `com.shancoh.brachaswithrimon`); `APPLE_SIWA_TOKEN_URL` and
  `APPLE_SIWA_REVOKE_URL` exist for the scenario suite's mock only

Fallback: with `APPLE_SIWA_KEY` unset the module signs with `APNS_KEY` /
`APNS_KEY_ID` / `APNS_TEAM_ID` — valid only if that key has the Sign in with
Apple service enabled in the portal (otherwise Apple answers `invalid_client`).
With no key at all the feature is OFF: sign-in and deletion work exactly as
before, the boot log says so once, and each Apple-account deletion logs that
revocation was not possible. Tokens and codes are never logged.

Create the key: developer.apple.com → Certificates, Identifiers & Profiles →
Keys → **+** → name it, tick **Sign in with Apple** → Configure → primary App
ID `com.shancoh.brachaswithrimon` → Save → Continue → Register → **Download**
the .p8 (Apple offers it once). Paste its contents into `APPLE_SIWA_KEY` with
the line breaks as literal `\n`, the Key ID into `APPLE_SIWA_KEY_ID`, set
`APPLE_TEAM_ID=6WT5WK8MLZ`, then **redeploy the Railway service** — variables
are read at boot. `/api/status` reports the last exchange/revoke outcome under
`dependencies.siwa`; the scenario suite (`npm test`) covers both the configured
and the unconfigured path against a mock Apple server.

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

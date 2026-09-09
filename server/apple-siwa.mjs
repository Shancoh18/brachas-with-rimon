/**
 * Sign in with Apple — authorization-code exchange + token revocation.
 *
 * Why: App Store guideline 5.1.1(v). When a user who signed in with Apple
 * deletes their account, the app must revoke their Sign in with Apple tokens
 * (POST https://appleid.apple.com/auth/revoke). Revocation needs a REFRESH
 * token, and Apple hands one out exactly once: by exchanging the sign-in
 * AUTHORIZATION CODE at /auth/token within ~5 minutes of the sign-in. So
 * /api/oauth exchanges the code the moment the id token verifies and stores
 * the refresh token on the user row (users.apple_refresh); /api/account/delete
 * revokes it right before the row goes.
 *
 * Both Apple calls authenticate with a client_secret: an ES256 JWT signed with
 * a "Sign in with Apple" private key (.p8) — the same key format apns.mjs
 * signs APNs provider tokens with, so the signing code mirrors it.
 *
 * Configuration (Railway variables). Everything here is OFF until set: sign-in
 * and deletion then behave exactly as before, and one boot log line says so.
 *   APPLE_SIWA_KEY        — contents of the .p8 key (literal \n accepted)
 *   APPLE_SIWA_KEY_ID     — that key's 10-char Key ID
 *   APPLE_TEAM_ID         — Apple team id (6WT5WK8MLZ)
 *   Fallbacks: APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID. ONE Apple key can carry
 *   both the APNs and the Sign in with Apple services — but only if "Sign in
 *   with Apple" was enabled on it in the developer portal (Keys → the key →
 *   Sign in with Apple → Configure → primary App ID). A plain APNs key signs
 *   a valid-looking JWT that Apple rejects with invalid_client.
 *   APPLE_SIWA_CLIENT_ID  — the client_id the code was issued to (= the app's
 *                           bundle id); defaults to the first APPLE_CLIENT_IDS
 *                           entry, else com.shancoh.brachaswithrimon
 *   APPLE_SIWA_TOKEN_URL / APPLE_SIWA_REVOKE_URL — Apple's endpoints, over-
 *                           ridable so the scenario suite can aim them at a
 *                           local mock
 *
 * Tokens and authorization codes are NEVER logged — only HTTP statuses and
 * Apple's short error codes (invalid_grant, invalid_client, …).
 */
import { createPrivateKey, sign } from 'crypto';
import { mark, fail } from './status.mjs';

const env = (k) => (process.env[k] || '').trim();
// The key id must belong to the key it signs with: a dedicated SIWA key takes
// APPLE_SIWA_KEY_ID; the APNs fallback takes APNS_KEY_ID. Never mixed.
const usingSiwaKey = !!env('APPLE_SIWA_KEY');
const KEY_PEM = (usingSiwaKey ? process.env.APPLE_SIWA_KEY : process.env.APNS_KEY || '').replace(/\\n/g, '\n').trim();
const KEY_ID = usingSiwaKey ? env('APPLE_SIWA_KEY_ID') : env('APNS_KEY_ID');
const TEAM_ID = env('APPLE_TEAM_ID') || env('APNS_TEAM_ID');
const CLIENT_ID =
  env('APPLE_SIWA_CLIENT_ID') ||
  env('APPLE_CLIENT_IDS').split(',').map((s) => s.trim()).filter(Boolean)[0] ||
  'com.shancoh.brachaswithrimon';
const TOKEN_URL = env('APPLE_SIWA_TOKEN_URL') || 'https://appleid.apple.com/auth/token';
const REVOKE_URL = env('APPLE_SIWA_REVOKE_URL') || 'https://appleid.apple.com/auth/revoke';
const AUDIENCE = 'https://appleid.apple.com';
const TIMEOUT_MS = 6000;
const SECRET_TTL_S = 3600; // Apple allows up to 15777000 s (6 months); 1 h is plenty
const SECRET_REUSE_MS = 50 * 60_000; // re-mint at 50 min — 10 min inside the 1 h exp

let key = null;
if (KEY_PEM && KEY_ID && TEAM_ID) {
  try {
    key = createPrivateKey(KEY_PEM);
  } catch (e) {
    console.error(`siwa: ${usingSiwaKey ? 'APPLE_SIWA_KEY' : 'APNS_KEY'} present but unreadable — Sign in with Apple token exchange + revocation OFF: ${e.message}`);
  }
}
if (key)
  console.log(`siwa: Sign in with Apple token exchange + revocation ON (${usingSiwaKey ? 'APPLE_SIWA_KEY' : 'APNS_KEY fallback'}, kid ${KEY_ID}, client_id ${CLIENT_ID})`);
else {
  const missing = [
    !KEY_PEM && (usingSiwaKey ? 'APPLE_SIWA_KEY' : 'APPLE_SIWA_KEY (or APNS_KEY)'),
    !KEY_ID && (usingSiwaKey ? 'APPLE_SIWA_KEY_ID' : 'APNS_KEY_ID'),
    !TEAM_ID && 'APPLE_TEAM_ID (or APNS_TEAM_ID)',
  ].filter(Boolean);
  const partial = KEY_PEM || KEY_ID ? ' PARTIAL configuration —' : ' —';
  console.log(`siwa: no Sign in with Apple key configured${partial} missing ${missing.join(', ')}; token exchange + revocation OFF; sign-in and account deletion unchanged`);
}

export const siwaReady = () => !!key;

// ------------------------------------------------------------ client_secret
// ES256 JWT: header { alg, kid }, claims { iss: team, iat, exp, aud: Apple,
// sub: client_id }. Cached and re-minted every ~50 min.
let secret = { token: '', minted: 0 };
const b64url = (buf) => Buffer.from(buf).toString('base64url');
export function clientSecret() {
  if (!key) return null;
  const now = Date.now();
  if (secret.token && now - secret.minted < SECRET_REUSE_MS) return secret.token;
  const iat = Math.floor(now / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID }));
  const body = b64url(JSON.stringify({ iss: TEAM_ID, iat, exp: iat + SECRET_TTL_S, aud: AUDIENCE, sub: CLIENT_ID }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  secret = { token: `${head}.${body}.${b64url(sig)}`, minted: now };
  return secret.token;
}

// ------------------------------------------------------------- transport
// One form-encoded POST with a hard 6 s cap. Resolves { status, data } or
// { status: 0, error } — never rejects, never carries the request body back.
async function postForm(url, params) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    return { status: r.status, data };
  } catch (e) {
    return { status: 0, error: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 120) };
  }
}
// Apple's error body is { error: "invalid_grant", error_description? } — keep
// only the short code; the description could echo request material.
/**
 * Unverified peek at one JWT payload claim. The /auth/token response is already
 * authenticated by our client_secret; this only guards against filing a refresh
 * token under a different Apple user than the one whose id token we verified.
 */
export function jwtClaim(jwt, name) {
  try {
    return JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString('utf8'))[name] ?? null;
  } catch {
    return null;
  }
}
const shortError = (r) => String(r.error || r.data?.error || '').slice(0, 40);

/**
 * Exchange a sign-in authorization code for Apple's token set. Returns
 * { refresh_token, access_token, id_token } or null on ANY failure (not
 * configured, bad input, Apple error, timeout). One log line per failure.
 */
export async function exchangeCode(code) {
  if (!key) return null;
  if (typeof code !== 'string' || !code || code.length > 2048) return null;
  let secretJwt;
  try {
    secretJwt = clientSecret();
  } catch (e) {
    fail('siwa', 0, 'exchange', 'secret');
    console.error(`siwa: could not mint the client_secret (${String(e?.message ?? e).slice(0, 80)}) — exchange skipped`);
    return null;
  }
  const r = await postForm(TOKEN_URL, {
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    client_secret: secretJwt,
  });
  if (r.status === 200 && typeof r.data?.refresh_token === 'string' && r.data.refresh_token) {
    mark('siwa', { ok: true, status: 200, where: 'exchange' });
    return {
      refresh_token: r.data.refresh_token,
      access_token: r.data.access_token ?? null,
      id_token: r.data.id_token ?? null,
    };
  }
  const why = shortError(r) || (r.status === 200 ? 'no_refresh_token' : '');
  fail('siwa', r.status, 'exchange', why);
  console.error(`siwa: authorization-code exchange failed (HTTP ${r.status}${why ? ' ' + why : ''}) — no refresh token stored; revocation will not be possible for this sign-in`);
  return null;
}

/**
 * Revoke a stored refresh token (POST /auth/revoke, token_type_hint =
 * refresh_token). true when Apple answered 200; false otherwise, with one
 * log line. Best effort — callers proceed with the deletion either way.
 */
export async function revokeRefreshToken(token) {
  if (!key) return false;
  if (typeof token !== 'string' || !token) return false;
  let secretJwt;
  try {
    secretJwt = clientSecret();
  } catch (e) {
    fail('siwa', 0, 'revoke', 'secret');
    console.error(`siwa: could not mint the client_secret (${String(e?.message ?? e).slice(0, 80)}) — revocation skipped`);
    return false;
  }
  const r = await postForm(REVOKE_URL, {
    client_id: CLIENT_ID,
    client_secret: secretJwt,
    token,
    token_type_hint: 'refresh_token',
  });
  if (r.status === 200) {
    mark('siwa', { ok: true, status: 200, where: 'revoke' });
    return true;
  }
  const why = shortError(r);
  fail('siwa', r.status, 'revoke', why);
  console.error(`siwa: token revocation failed (HTTP ${r.status}${why ? ' ' + why : ''}) — the app may stay listed under the user's Apple ID`);
  return false;
}

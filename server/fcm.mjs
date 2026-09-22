/**
 * Minimal FCM (Firebase Cloud Messaging, HTTP v1) sender — no dependencies,
 * node:crypto for the RS256 service-account JWT + global fetch for delivery.
 * The Android twin of apns.mjs.
 *
 * Why this exists: the Android app runs in a Chromium WebView inside
 * Capacitor, which has no Web Push API either — so chat / competition nudges
 * need a native channel exactly like iOS. The app registers its FCM device
 * token via POST /api/push/native {token, platform:'android'}, and sendPush()
 * delivers over this channel alongside Web Push and APNs. iPhone and Android
 * members of the same board each get their own channel — that is what makes
 * a mixed league feel identical on both platforms.
 *
 * Configuration (Railway variables; the channel is silently OFF until set):
 *   FCM_SERVICE_ACCOUNT — the Firebase service-account JSON (Project settings
 *                         → Service accounts → Generate new private key), as
 *                         ONE string; line breaks inside private_key may be
 *                         literal "\n" (Railway keeps them that way).
 *   -- or the three fields split out --
 *   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
 *   FCM_HOST      — override for the scenario suite's mock (default
 *                   https://fcm.googleapis.com)
 *   FCM_TOKEN_URL — override for the mock (default
 *                   https://oauth2.googleapis.com/token)
 */
import { createPrivateKey, sign } from 'crypto';
import { mark, fail } from './status.mjs';

const HOST = (process.env.FCM_HOST || 'https://fcm.googleapis.com').trim().replace(/\/$/, '');
const TOKEN_URL = (process.env.FCM_TOKEN_URL || 'https://oauth2.googleapis.com/token').trim();
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
/** Android notification channel the app creates at registration (see
 *  src/lib/native.ts) — pushes name it so the OS files them under "Rimon". */
export const FCM_CHANNEL_ID = 'rimon';

let creds = null; // { projectId, clientEmail, key }
const raw = (process.env.FCM_SERVICE_ACCOUNT || '').trim();
try {
  let projectId = (process.env.FCM_PROJECT_ID || '').trim();
  let clientEmail = (process.env.FCM_CLIENT_EMAIL || '').trim();
  let pem = (process.env.FCM_PRIVATE_KEY || '').trim();
  if (raw) {
    const sa = JSON.parse(raw);
    projectId = projectId || String(sa.project_id || '').trim();
    clientEmail = clientEmail || String(sa.client_email || '').trim();
    pem = pem || String(sa.private_key || '').trim();
  }
  pem = pem.replace(/\\n/g, '\n');
  if (projectId && clientEmail && pem) creds = { projectId, clientEmail, key: createPrivateKey(pem) };
} catch (e) {
  console.error(`FCM_SERVICE_ACCOUNT present but unreadable — Android pushes stay OFF: ${e.message}`);
  creds = null;
}

export const fcmReady = () => !!creds;
export const fcmProjectId = () => creds?.projectId ?? null;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// Google access tokens live 60 min; refresh at 50 to stay well inside. One
// in-flight exchange at a time — a burst of pushes must not fan out into a
// burst of token requests.
let access = { token: '', expires: 0 };
let inflight = null;
const accessToken = async () => {
  const now = Date.now();
  if (access.token && now < access.expires) return access.token;
  if (inflight) return inflight;
  inflight = (async () => {
    const iat = Math.floor(now / 1000);
    const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify({ iss: creds.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }));
    const sig = sign('sha256', Buffer.from(`${head}.${body}`), creds.key);
    const assertion = `${head}.${body}.${b64url(sig)}`;
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`,
      signal: AbortSignal.timeout(6000),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.access_token) {
      const reason = j.error_description || j.error || `http ${res.status}`;
      throw Object.assign(new Error(`fcm token exchange failed: ${reason}`), { status: res.status });
    }
    // expires_in is seconds; keep a 10-minute safety margin
    access = { token: j.access_token, expires: Date.now() + Math.max(60, (j.expires_in ?? 3600) - 600) * 1000 };
    return access.token;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
};

/**
 * Deliver one alert push. Resolves { ok, status, reason, gone }; never
 * rejects. Callers clear the stored token when `gone` is true (the device
 * uninstalled the app / the token was invalidated) — mirrors APNs 410 and
 * Web Push 404/410 handling.
 */
export const sendFcm = async (deviceToken, title, body) => {
  if (!creds) return { ok: false, status: 0, reason: 'not_configured', gone: false };
  let bearer;
  try {
    bearer = await accessToken();
  } catch (e) {
    fail('fcm', e.status ?? 0, 'token', String(e.message).slice(0, 160));
    return { ok: false, status: e.status ?? 0, reason: 'token_exchange', gone: false };
  }
  const message = {
    message: {
      token: deviceToken,
      notification: { title, body },
      android: {
        priority: 'HIGH',
        ttl: '21600s', // 6h, same as the APNs expiration
        notification: { channel_id: FCM_CHANNEL_ID, sound: 'default' },
      },
    },
  };
  let res;
  let data = {};
  try {
    res = await fetch(`${HOST}/v1/projects/${encodeURIComponent(creds.projectId)}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(6000),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    const timeout = /timeout|abort/i.test(String(e.name || e.message));
    fail('fcm', 0, 'send', timeout ? 'timeout' : String(e.message).slice(0, 120));
    return { ok: false, status: 0, reason: timeout ? 'timeout' : 'network', gone: false };
  }
  const status = res.status;
  const err = data?.error || {};
  const fcmCode = (err.details || []).find((d) => d?.errorCode)?.errorCode || '';
  const reason = fcmCode || err.status || '';
  // 404 UNREGISTERED = the DEVICE is gone (uninstall / token rotation), not
  // Google refusing us. A 400 INVALID_ARGUMENT can only be the token here:
  // the payload shape is fixed. Both count as healthy for /api/status.
  const gone = status === 404 || fcmCode === 'UNREGISTERED' || (status === 400 && reason === 'INVALID_ARGUMENT');
  if (status < 400 || gone) mark('fcm', { ok: true, status });
  else if (status === 401 || status === 403) {
    // our credentials — the alert people need to see
    fail('fcm', status, 'auth', reason || 'unauthenticated');
    access = { token: '', expires: 0 }; // force a fresh exchange next time
  } else fail('fcm', status, 'send', reason);
  return { ok: status === 200, status, reason, gone };
};

/**
 * Minimal APNs (Apple Push Notification service) sender — no dependencies,
 * node:crypto for the ES256 provider JWT + node:http2 for the delivery.
 *
 * Why this exists: the native iOS app runs in a WKWebView, which has no Web
 * Push API — so chat / competition nudges could never reach the phone. The
 * app now registers its APNs device token via POST /api/push/native, and
 * sendPush() delivers over this channel alongside Web Push.
 *
 * Configuration (Railway variables; the channel is silently OFF until set):
 *   APNS_KEY      — contents of the .p8 APNs auth key (literal \n accepted)
 *   APNS_KEY_ID   — the key's 10-char id (from developer.apple.com → Keys)
 *   APNS_TEAM_ID  — Apple team id (6WT5WK8MLZ)
 *   APNS_TOPIC    — bundle id; defaults to com.shancoh.brachaswithrimon
 *   APNS_HOST     — override for sandbox (api.sandbox.push.apple.com); the
 *                   default is production, which is what TestFlight uses.
 */
import { createPrivateKey, sign } from 'crypto';
import { connect } from 'http2';

const KEY_PEM = (process.env.APNS_KEY || '').replace(/\\n/g, '\n').trim();
const KEY_ID = (process.env.APNS_KEY_ID || '').trim();
const TEAM_ID = (process.env.APNS_TEAM_ID || '').trim();
const TOPIC = (process.env.APNS_TOPIC || 'com.shancoh.brachaswithrimon').trim();
const HOST = (process.env.APNS_HOST || 'https://api.push.apple.com').trim();

let key = null;
if (KEY_PEM && KEY_ID && TEAM_ID) {
  try {
    key = createPrivateKey(KEY_PEM);
  } catch (e) {
    console.error(`APNS_KEY present but unreadable — native pushes stay OFF: ${e.message}`);
  }
}

export const apnsReady = () => !!key;

// Provider JWTs are valid 20–60 min; refresh at 45 to stay well inside.
let jwt = { token: '', minted: 0 };
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const providerToken = () => {
  const now = Date.now();
  if (jwt.token && now - jwt.minted < 45 * 60_000) return jwt.token;
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID }));
  const body = b64url(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(now / 1000) }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  jwt = { token: `${head}.${body}.${b64url(sig)}`, minted: now };
  return jwt.token;
};

/**
 * Deliver one alert push. Resolves { ok, status, reason }; never rejects.
 * Callers should clear the stored token when `gone` is true (device
 * unregistered / token invalid) — mirrors Web Push 404/410 handling.
 */
export const sendApns = (deviceToken, title, body) =>
  new Promise((resolve) => {
    if (!key) return resolve({ ok: false, status: 0, reason: 'not_configured' });
    let settled = false;
    const done = (r) => {
      if (!settled) {
        settled = true;
        try { session.close(); } catch {}
        resolve(r);
      }
    };
    const session = connect(HOST);
    session.on('error', (e) => done({ ok: false, status: 0, reason: String(e.message).slice(0, 120) }));
    const timer = setTimeout(() => done({ ok: false, status: 0, reason: 'timeout' }), 6000);
    timer.unref?.();
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      'apns-topic': TOPIC,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 6 * 3600),
    });
    let status = 0;
    let data = '';
    req.on('response', (h) => { status = h[':status'] ?? 0; });
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      clearTimeout(timer);
      let reason = '';
      try { reason = JSON.parse(data).reason ?? ''; } catch {}
      done({
        ok: status === 200,
        status,
        reason,
        gone: status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' || reason === 'DeviceTokenNotForTopic',
      });
    });
    req.on('error', (e) => { clearTimeout(timer); done({ ok: false, status: 0, reason: String(e.message).slice(0, 120) }); });
    req.end(JSON.stringify({ aps: { alert: { title, body }, sound: 'default' } }));
  });

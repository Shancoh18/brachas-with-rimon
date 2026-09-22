/**
 * Mock FCM (HTTP v1) + Google OAuth token endpoint — an in-process stand-in
 * for fcm.googleapis.com and oauth2.googleapis.com used by the scenario
 * suite (test/scenarios.mjs). Plain HTTP/1.1: server/fcm.mjs talks to it
 * when FCM_HOST / FCM_TOKEN_URL point here.
 *
 * Behavior is driven by the DEVICE TOKEN so scenarios can provoke every
 * response class Google can return:
 *   token starting "dead"  → 404 NOT_FOUND / UNREGISTERED   (device gone)
 *   token starting "bad0"  → 400 INVALID_ARGUMENT           (bad token)
 *   token starting "f500"  → 500 INTERNAL                   (transient)
 *   anything else          → 200 { name: projects/.../messages/<n> }
 *
 * POST /token answers every well-formed JWT-bearer grant with the access
 * token "mock-fcm-access"; the assertion's claims are recorded so the suite
 * can prove the exchange was signed for the right account and scope.
 *
 * Every send is recorded: { token, project, auth, title, body, channel, at }.
 */
import { createServer } from 'http';

export function startMockFcm(port = 0) {
  const requests = [];
  const tokenCalls = [];
  const server = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/token') {
        const params = new URLSearchParams(data);
        let claims = null;
        try {
          claims = JSON.parse(Buffer.from(params.get('assertion').split('.')[1], 'base64url').toString());
        } catch {}
        tokenCalls.push({ grant: params.get('grant_type'), claims, at: Date.now() });
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ access_token: 'mock-fcm-access', expires_in: 3600, token_type: 'Bearer' }));
      }
      const m = req.url.match(/^\/v1\/projects\/([^/]+)\/messages:send$/);
      if (!m || req.method !== 'POST') {
        res.writeHead(404, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', message: 'no route' } }));
      }
      let payload = {};
      try { payload = JSON.parse(data); } catch {}
      const msg = payload?.message ?? {};
      const token = String(msg.token ?? '');
      requests.push({
        token,
        project: decodeURIComponent(m[1]),
        auth: req.headers.authorization ?? '',
        title: msg.notification?.title ?? '',
        body: msg.notification?.body ?? '',
        channel: msg.android?.notification?.channel_id ?? '',
        priority: msg.android?.priority ?? '',
        at: Date.now(),
      });
      const fcmErr = (code, status, errorCode, message) => {
        res.writeHead(code, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code, status, message, details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode }] } }));
      };
      if (token.startsWith('dead')) fcmErr(404, 'NOT_FOUND', 'UNREGISTERED', 'Requested entity was not found.');
      else if (token.startsWith('bad0')) fcmErr(400, 'INVALID_ARGUMENT', 'INVALID_ARGUMENT', 'The registration token is not a valid FCM registration token');
      else if (token.startsWith('f500')) fcmErr(500, 'INTERNAL', 'INTERNAL', 'Internal error encountered.');
      else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ name: `projects/${m[1]}/messages/${requests.length}` }));
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        requests,
        tokenCalls,
        /** sends for one device token */
        forToken: (t) => requests.filter((r) => r.token === t),
        /** wait until predicate(requests) is true (or timeout) — pushes are fire-and-forget server-side */
        waitFor: (predicate, ms = 4000) =>
          new Promise((res2) => {
            const t0 = Date.now();
            const tick = () => {
              if (predicate(requests)) return res2(true);
              if (Date.now() - t0 > ms) return res2(false);
              setTimeout(tick, 50);
            };
            tick();
          }),
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

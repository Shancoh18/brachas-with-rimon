/**
 * Mock APNs server — an in-process stand-in for api.push.apple.com used by the
 * scenario suite (test/scenarios.mjs). Speaks plaintext HTTP/2 (h2c), which
 * server/apns.mjs happily connects to when APNS_HOST=http://127.0.0.1:<port>.
 *
 * Behavior is driven by the DEVICE TOKEN so scenarios can provoke every
 * response class Apple can return:
 *   token starting "dead"  → 410 { reason: "Unregistered" }   (device gone)
 *   token starting "bad0"  → 400 { reason: "BadDeviceToken" }
 *   token starting "f500"  → 500 { reason: "InternalServerError" } (transient)
 *   anything else          → 200
 *
 * Every request is recorded: { token, topic, pushType, title, body, at }.
 */
import { createServer } from 'http2';

export function startMockApns(port = 0) {
  const requests = [];
  const server = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      const token = (req.url.match(/^\/3\/device\/(.+)$/) || [])[1] ?? '';
      let payload = {};
      try { payload = JSON.parse(data); } catch {}
      requests.push({
        token,
        topic: req.headers['apns-topic'] ?? '',
        pushType: req.headers['apns-push-type'] ?? '',
        auth: req.headers.authorization ?? '',
        title: payload?.aps?.alert?.title ?? '',
        body: payload?.aps?.alert?.body ?? '',
        at: Date.now(),
      });
      if (token.startsWith('dead')) {
        res.writeHead(410, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ reason: 'Unregistered' }));
      } else if (token.startsWith('f500')) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ reason: 'InternalServerError' }));
      } else if (token.startsWith('bad0')) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ reason: 'BadDeviceToken' }));
      } else {
        res.writeHead(200);
        res.end();
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        requests,
        /** requests for one token */
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

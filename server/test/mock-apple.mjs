/**
 * Mock Apple ID server — an in-process stand-in for appleid.apple.com used by
 * the scenario suite (test/scenarios.mjs). Plain HTTP/1.1; the server reaches
 * it through APPLE_JWKS_URL / APPLE_SIWA_TOKEN_URL / APPLE_SIWA_REVOKE_URL.
 *
 *   GET  /auth/keys   → the JWKS given at start-up (the suite's throwaway RSA
 *                       public key), so server.mjs verifies the RS256 id
 *                       tokens the suite mints through its REAL code path
 *   POST /auth/token  → form-encoded code exchange. Validates client_id and
 *                       client_secret — an ES256 JWT whose kid must name one
 *                       of `secretKeys`, whose signature must verify against
 *                       it, and whose iss/sub/aud/exp must be what Apple
 *                       demands — then answers a fresh refresh token
 *                       (recorded as `issued`). A code starting "bad" gets
 *                       400 { error: "invalid_grant" }, like an expired or
 *                       reused code.
 *   POST /auth/revoke → same validation; records token + token_type_hint;
 *                       200 with an empty body, as Apple does.
 *
 * Every call is recorded in `requests`:
 *   { path, method, contentType, form, secret: { ok, kid, claims, problems[] }, issued, at }
 */
import { createServer } from 'http';
import { randomBytes, verify } from 'crypto';

const APPLE_AUD = 'https://appleid.apple.com';
const b64u = (s) => Buffer.from(s).toString('base64url');
/** Unsigned JWT shaped like Apple's id_token; sub omitted when null. Never verified by the server. */
function fakeIdToken(sub) {
  const claims = { iss: APPLE_AUD, aud: 'com.shancoh.brachaswithrimon', ...(sub ? { sub } : {}) };
  return `${b64u(JSON.stringify({ alg: 'none' }))}.${b64u(JSON.stringify(claims))}.`;
}
const SIX_MONTHS_S = 15_777_000;

/** Dissect a client_secret the way Apple would. */
function inspectSecret(jwt, secretKeys, expect) {
  const out = { ok: false, kid: null, claims: {}, problems: [] };
  const parts = String(jwt || '').split('.');
  if (parts.length !== 3) {
    out.problems.push('not a 3-part JWT');
    return out;
  }
  let header;
  let claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    out.problems.push('header/claims are not base64url JSON');
    return out;
  }
  out.kid = header.kid ?? null;
  out.claims = claims;
  if (header.alg !== 'ES256') out.problems.push(`alg ${header.alg} (want ES256)`);
  const pub = header.kid ? secretKeys[header.kid] : null;
  if (!pub) out.problems.push(`unknown kid ${header.kid}`);
  else if (!verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url')))
    out.problems.push('signature does not verify against that key');
  if (claims.iss !== expect.teamId) out.problems.push(`iss ${claims.iss} (want team ${expect.teamId})`);
  if (claims.sub !== expect.clientId) out.problems.push(`sub ${claims.sub} (want client_id ${expect.clientId})`);
  if (claims.aud !== APPLE_AUD) out.problems.push(`aud ${claims.aud} (want ${APPLE_AUD})`);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp)) out.problems.push('iat/exp missing');
  else {
    if (claims.exp <= now) out.problems.push('expired');
    if (claims.exp - claims.iat > SIX_MONTHS_S) out.problems.push('exp more than 6 months after iat');
  }
  out.ok = out.problems.length === 0;
  return out;
}

/**
 * @param jwks        JSON served at /auth/keys
 * @param secretKeys  { [kid]: KeyObject (public, P-256) } accepted for client_secret
 * @param expect      { clientId, teamId }
 */
export function startMockApple({ jwks, secretKeys = {}, expect }, port = 0) {
  const requests = [];
  const server = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      const path = (req.url || '/').split('?')[0];
      const json = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(body == null ? '' : JSON.stringify(body));
      };
      if (req.method === 'GET' && path === '/auth/keys') {
        requests.push({ path, method: 'GET', at: Date.now() });
        return json(200, jwks);
      }
      if (req.method === 'POST' && (path === '/auth/token' || path === '/auth/revoke')) {
        const contentType = String(req.headers['content-type'] ?? '');
        const form = Object.fromEntries(new URLSearchParams(data));
        const rec = { path, method: 'POST', contentType, form, secret: inspectSecret(form.client_secret, secretKeys, expect), issued: null, at: Date.now() };
        requests.push(rec);
        if (!contentType.startsWith('application/x-www-form-urlencoded')) return json(400, { error: 'invalid_request' });
        if (form.client_id !== expect.clientId || !rec.secret.ok) return json(400, { error: 'invalid_client' });
        if (path === '/auth/token') {
          if (form.grant_type !== 'authorization_code' || !form.code || form.code.startsWith('bad')) return json(400, { error: 'invalid_grant' });
          rec.issued = 'refresh-' + randomBytes(16).toString('hex');
          return json(200, {
            access_token: 'access-' + randomBytes(8).toString('hex'),
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: rec.issued,
            // real-shaped (unsigned) id_token: the server only peeks at its sub to guard
            // cross-user mixups; a "wrongsub_" code returns tokens for another Apple user
            id_token: fakeIdToken(form.code.startsWith('wrongsub_') ? 'someone-else' : null),
          });
        }
        if (!form.token) return json(400, { error: 'invalid_request' });
        res.writeHead(200);
        return res.end();
      }
      res.writeHead(404);
      res.end();
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        requests,
        close: () =>
          new Promise((r) => {
            server.closeAllConnections?.();
            server.close(r);
          }),
      });
    });
  });
}

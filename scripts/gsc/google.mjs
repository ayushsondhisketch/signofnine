// Minimal Google API client for a service account: a signed JWT becomes an access token, and every call retries on 429 and 5xx.
// Node built-ins only. Endpoint bases can be overridden by environment variables so scripts/gsc/test-mock.mjs can run offline.
import { createSign } from 'node:crypto';

export const ENDPOINTS = {
  gsc: process.env.GSC_API || 'https://www.googleapis.com/webmasters/v3',
  inspect: process.env.INSPECT_API || 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
  sheets: process.env.SHEETS_API || 'https://sheets.googleapis.com/v4/spreadsheets',
};
export const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/spreadsheets'];
const b64u = (b) => Buffer.from(b).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Exchange a service-account key (the parsed JSON file) for an access token. */
export async function accessToken(sa, scopes = SCOPES) {
  const uri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: scopes.join(' '), aud: uri, iat: now, exp: now + 3600 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key);
  const res = await fetch(uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64u(sig)}` }),
  });
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

/** One JSON call with retries; throws an Error with .status on a final failure. */
export async function api(token, method, url, body, { tries = 4 } = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.ok) { const t = await res.text(); return t ? JSON.parse(t) : {}; }
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && i < tries - 1) { await sleep(Number(process.env.GSC_RETRY_MS || 2000) * 2 ** i); continue; }
    const err = new Error(`${method} ${url.replace(/\?.*/, '')} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
}

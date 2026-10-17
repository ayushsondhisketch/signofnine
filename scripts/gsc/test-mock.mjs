#!/usr/bin/env node
// Offline test of scripts/gsc/export.mjs against a mock of Google's token, Search Console, URL Inspection and Sheets endpoints.
// It checks that the JWT is signed correctly, the calls have the right shape, and the tabs come out with the right content.
//   node scripts/watch/live.mjs is not needed; this needs a sitemap to read: serve dist/ (npx astro preview --port 4321) first, or pass --sitemap-base.
//   node scripts/gsc/test-mock.mjs [--sitemap-base http://127.0.0.1:4321]
import http from 'node:http';
import { spawn } from 'node:child_process';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { val } from '../watch/lib.mjs';

const base = val('--sitemap-base', 'http://127.0.0.1:4321');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const tabs = new Map([['Sheet1', []]]);
let pageCalls = 0;
const log = { token: 0, sites: 0, query: [], inspect: 0, clear: [], put: [], batch: 0 };
let failures = 0;
const must = (ok, msg) => { if (!ok) { failures++; console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  const url = new URL(req.url, 'http://x');
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (url.pathname === '/token') {
    const a = new URLSearchParams(raw).get('assertion') || '';
    const [h, c, s] = a.split('.');
    const ok = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url'));
    const claim = JSON.parse(Buffer.from(c, 'base64url').toString());
    log.token++;
    if (!ok || !claim.scope.includes('webmasters.readonly') || !claim.scope.includes('spreadsheets') || claim.iss !== 'svc@test.iam.gserviceaccount.com') return send(401, { error: 'bad jwt' });
    return send(200, { access_token: 'tok123', expires_in: 3600 });
  }
  if (req.headers.authorization !== 'Bearer tok123') return send(401, { error: 'no token' });
  const body = raw ? JSON.parse(raw) : {};
  if (url.pathname === '/gsc/sites') { log.sites++; return send(200, { siteEntry: [{ siteUrl: 'sc-domain:signofnine.com', permissionLevel: 'siteRestrictedUser' }] }); }
  if (url.pathname.includes('/searchAnalytics/query')) {
    log.query.push(body.dimensions.join(','));
    const d = body.dimensions.join(',');
    if (d === 'date') return send(200, { rows: [0, 1, 2].map((i) => ({ keys: [`2026-10-${10 + i}`], clicks: i, impressions: 10 * i, ctr: i ? 0.1 : 0, position: 12.5 })) });
    if (d === 'page') return send(200, { rows: ++pageCalls % 2 === 0 ? [{ keys: ['https://signofnine.com/angel-numbers/444/'], clicks: 1, impressions: 100, ctr: 0.01, position: 20 }] : [{ keys: ['https://signofnine.com/angel-numbers/444/'], clicks: 5, impressions: 200, ctr: 0.025, position: 14 }, { keys: ['https://signofnine.com/life-path/7/'], clicks: 0, impressions: 40, ctr: 0, position: 33 }] });
    return send(200, { rows: [{ keys: ['why do i keep seeing 444', 'https://signofnine.com/angel-numbers/444/'], clicks: 3, impressions: 90, ctr: 0.033, position: 9.1 }, { keys: ['life path 7 meaning', 'https://signofnine.com/life-path/7/'], clicks: 0, impressions: 40, ctr: 0, position: 33 }] });
  }
  if (url.pathname === '/inspect') {
    log.inspect++;
    const p = new URL(body.inspectionUrl).pathname;
    const indexed = p === '/' || p.includes('/444/');
    return send(200, { inspectionResult: { indexStatusResult: { verdict: indexed ? 'PASS' : 'NEUTRAL', coverageState: indexed ? 'Submitted and indexed' : 'Crawled - currently not indexed', lastCrawlTime: '2026-10-16T10:00:00Z', googleCanonical: body.inspectionUrl, userCanonical: body.inspectionUrl, robotsTxtState: 'ALLOWED', indexingState: 'INDEXING_ALLOWED', pageFetchState: 'SUCCESSFUL' } } });
  }
  if (url.pathname.startsWith('/sheets/SHEETID')) {
    const rest = decodeURIComponent(url.pathname.slice('/sheets/SHEETID'.length));
    if (rest === ':batchUpdate') { log.batch++; for (const r of body.requests) tabs.set(r.addSheet.properties.title, []); return send(200, {}); }
    if (rest === '') return send(200, { sheets: [...tabs.keys()].map((title) => ({ properties: { title } })) });
    const m = rest.match(/^\/values\/(.+)$/);
    if (m && m[1].endsWith(':clear')) { const t = m[1].slice(0, -6); log.clear.push(t); tabs.set(t, []); return send(200, {}); }
    if (m && req.method === 'PUT') { const t = m[1].split('!')[0]; log.put.push(t); tabs.set(t, [...(tabs.get(t) || []), ...body.values]); return send(200, {}); }
    if (m && req.method === 'GET') { const t = m[1].split('!')[0]; return send(200, tabs.has(t) && tabs.get(t).length ? { values: tabs.get(t) } : {}); }
  }
  send(404, { error: `unhandled ${req.method} ${url.pathname}` });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const sa = { client_email: 'svc@test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: `http://127.0.0.1:${port}/token` };
const env = { ...process.env, GSC_API: `http://127.0.0.1:${port}/gsc`, INSPECT_API: `http://127.0.0.1:${port}/inspect`, SHEETS_API: `http://127.0.0.1:${port}/sheets`, GSC_SERVICE_ACCOUNT_JSON: JSON.stringify(sa), GSC_SHEET_ID: 'SHEETID', GH_TOKEN: '', GSC_RETRY_MS: '10' };
const run = () => new Promise((resolve) => { const c = spawn('node', ['scripts/gsc/export.mjs', '--sitemap-base', base], { env, stdio: ['ignore', 'pipe', 'pipe'] }); let out = ''; c.stdout.on('data', (d) => (out += d)); c.stderr.on('data', (d) => (out += d)); c.on('exit', (code) => resolve({ code, out })); });

const first = await run();
must(first.code === 0, `first run exits 0 (${first.code})`);
if (first.code !== 0) console.error(first.out.slice(-1500));
must(log.token === 1, 'one token request with a valid RS256 JWT');
must(['Summary', 'Performance', 'Queries', 'Daily', 'Index'].every((t) => tabs.has(t)), 'all five tabs exist');
must(log.batch === 1, 'missing tabs added in one batchUpdate');
must(tabs.get('Performance').length > 100, `Performance has a row per sitemap URL (${tabs.get('Performance').length - 1})`);
must(tabs.get('Performance').find((r) => r[0] === '/angel-numbers/444/')?.[2] === 200, 'Performance: 444 shows 200 impressions');
must(tabs.get('Performance').find((r) => r[0] === '/angel-numbers/444/')?.[8] === 100, 'Performance: 444 impressions change is +100 percent');
must(tabs.get('Queries').length === 3, 'Queries has the two mock rows plus a header');
must(tabs.get('Daily').length === 4, 'Daily has three days plus a header');
must(tabs.get('Index').length > 100 && log.inspect === tabs.get('Index').length - 1, `Index has one row per URL and one inspection call each (${log.inspect})`);
const sum = tabs.get('Summary');
const row = (name) => sum.find((r) => String(r[0]).startsWith(name));
must(row('2. Pages with an impression')?.[1] > 0, 'Summary: share of pages with impressions is above zero');
must(row('3. Sitewide position drift')?.[1] !== 'no data', 'Summary: position drift is computed');
must(sum.some((r) => r[0] === 'angel-numbers') && sum.some((r) => r[0] === 'TOTAL'), 'Summary: folder rows and a total');
must(['Summary', 'Performance', 'Queries', 'Daily', 'Index'].every((t) => log.clear.includes(t)), 'every tab is cleared before it is written');
must(!/queries?\b.*why do i keep/i.test(first.out), 'no query text in the log output');

const before = log.inspect;
const second = await run();
must(second.code === 0, 'second run exits 0');
must(log.batch === 1, 'second run adds no tabs');
must(log.inspect === before + (tabs.get('Index').length - 1), 'second run refreshes every URL again (all are under the 400 a run limit)');

if (process.argv.includes('--show')) console.log('\n' + tabs.get('Summary').map((r) => r.join(' | ')).join('\n'));
server.close();
console.log(failures ? `\n${failures} failure(s)` : '\nall mock checks passed');
process.exit(failures ? 1 : 0);

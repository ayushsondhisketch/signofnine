#!/usr/bin/env node
// Daily Search Console export into a private Google Sheet, for the scheduled tasks to read.
//
// Needs two repository secrets: GSC_SERVICE_ACCOUNT_JSON (the whole key file of a service account) and GSC_SHEET_ID (the Sheet's id).
// The service account must be a user of the Search Console property and an editor of the Sheet (see seo/SETUP.md).
// Without them the script says so and exits 0. The tokens are read-only for Search Console; only the Sheet is written.
//
// Tabs it writes (cleared and rewritten every run, so the Sheet always holds the latest picture):
//   Summary      the three warning numbers and one row per folder (indexed, with impressions, impressions, clicks, position, change)
//   Performance  one row per sitemap URL: last 28 days and the 28 days before
//   Queries      the top 5,000 query and page pairs of the last 28 days
//   Daily        clicks, impressions, CTR and position per day for 180 days
//   Index        URL Inspection result per sitemap URL (the oldest checks are refreshed first, up to 400 a run)
// Query data stays in the Sheet: the public GitHub issue only gets counts of rows and of indexed pages.
import { SITE } from '../../src/site.mjs';
import { config, get, pool, setStatus, raise, clear, stamp, today, val } from '../watch/lib.mjs';
import { accessToken, api, ENDPOINTS } from './google.mjs';

const S = config.search;
const T = S.tabs;
const TITLE = 'Monitor: Search Console export';
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const pathOf = (u) => new URL(u).pathname;
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

if (!process.env.GSC_SERVICE_ACCOUNT_JSON || !process.env.GSC_SHEET_ID) {
  const msg = 'Not set up yet. The workflow needs two repository secrets, GSC_SERVICE_ACCOUNT_JSON and GSC_SHEET_ID. The steps are in seo/SETUP.md, section "Search Console".';
  console.log(msg);
  setStatus(TITLE, `${msg}\n\nLast run: ${stamp()}.`);
  process.exit(0);
}

try { await main(); } catch (e) {
  console.error(e);
  setStatus(TITLE, `FAILED at ${stamp()}.\n\n${e.message}\n`);
  raise('search:export', 'Search Console export failed', e.message);
  process.exit(1);
}

async function main() {
  const SHEET = process.env.GSC_SHEET_ID;
  const sa = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
  const token = await accessToken(sa);
  const call = (m, u, b) => api(token, m, u, b);

  // the property the service account can see
  const sites = ((await call('GET', `${ENDPOINTS.gsc}/sites`)).siteEntry || []).map((s) => s.siteUrl);
  const host = new URL(SITE.url).host;
  const site = sites.find((s) => s === `sc-domain:${host}`) || sites.find((s) => s.replace(/\/$/, '') === SITE.url) || sites.find((s) => s.includes(host));
  if (!site) throw new Error(`The service account ${sa.client_email} cannot see ${host} in Search Console. Add its e-mail address under Settings, Users and permissions. It can see: ${sites.join(', ') || 'nothing'}.`);

  // dates: Search Console data runs about two days behind
  const end = addDays(today(), -2);
  const win = S.windowDays;
  const cur = [addDays(end, -(win - 1)), end];
  const prev = [addDays(end, -(2 * win - 1)), addDays(end, -win)];
  const dailyStart = addDays(end, -(S.dailyDays - 1));

  // the URLs the site publishes
  const base = (val('--sitemap-base', SITE.url) || SITE.url).replace(/\/$/, '');
  const idx = await get(`${base}/sitemap-index.xml`);
  if (!idx.ok || idx.status !== 200) throw new Error(`sitemap-index.xml could not be read (${idx.ok ? idx.status : idx.error})`);
  const paths = [];
  for (const sm of [...idx.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
    const r = await get(`${base}${pathOf(sm)}`);
    for (const m of r.body.matchAll(/<loc>([^<]+)<\/loc>/g)) paths.push(pathOf(m[1]));
  }
  const urls = [...new Set(paths)].sort();
  if (!urls.length) throw new Error('the sitemaps list no URLs');

  // Search Analytics
  const query = async (dimensions, [startDate, endDate]) => {
    const rows = [];
    for (let startRow = 0; ; startRow += 25000) {
      const r = await call('POST', `${ENDPOINTS.gsc}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { startDate, endDate, dimensions, rowLimit: 25000, startRow, type: 'web' });
      rows.push(...(r.rows || []));
      if ((r.rows || []).length < 25000) break;
    }
    return rows;
  };
  const [dailyRows, curRows, prevRows, queryRows] = [await query(['date'], [dailyStart, end]), await query(['page'], cur), await query(['page'], prev), await query(['query', 'page'], cur)];
  const byPath = (rows) => { const m = new Map(); for (const r of rows) m.set(pathOf(r.keys[0]), r); return m; };
  const C = byPath(curRows), P = byPath(prevRows);

  // URL Inspection: the oldest checks first, merged with what the Index tab already holds
  const existing = (await readTab('Index')).slice(1);
  const known = new Map(existing.map((r) => [r[0], r]));
  const order = urls.map((p) => ({ p, t: known.get(p)?.[9] || '' })).sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.p.localeCompare(b.p)));
  const errors = [];
  let inspected = 0;
  await pool(order.slice(0, S.inspectPerRun), 4, async ({ p }) => {
    try {
      const r = await call('POST', ENDPOINTS.inspect, { inspectionUrl: `${SITE.url}${p}`, siteUrl: site, languageCode: 'en-US' });
      const x = r.inspectionResult?.indexStatusResult || {};
      known.set(p, [p, x.verdict || '', x.coverageState || '', x.lastCrawlTime || '', x.googleCanonical || '', x.userCanonical || '', x.robotsTxtState || '', x.indexingState || '', x.pageFetchState || '', new Date().toISOString()]);
      inspected++;
    } catch (e) { errors.push(`${p}: ${e.message.slice(0, 160)}`); }
  });
  if (inspected === 0 && errors.length) throw new Error(`URL Inspection failed for every URL, for example: ${errors[0]}. If this is a permission error, give the service account the Full role in Search Console.`);
  const indexRows = urls.map((p) => known.get(p)).filter(Boolean);

  // folder summary
  const computedFolders = new Set(['times', 'four-digit', 'birthday']);
  const folderOf = (p) => {
    if (p === '/') return 'home';
    if (/^\/angel-numbers\/times\/\d/.test(p)) return 'times';
    if (/^\/angel-numbers\/\d{4}\/$/.test(p)) return 'four-digit';
    if (/^\/birthday-number\/\d+\/$/.test(p)) return 'birthday';
    const seg = p.split('/')[1];
    if (['angel-numbers', 'life-path', 'numbers', 'compatibility', 'personal-year', 'articles'].includes(seg)) return seg;
    if (['expression-number', 'soul-urge-number', 'personality-number', 'birthday-number'].includes(seg)) return 'guides';
    return 'other';
  };
  const idxOf = new Map(indexRows.map((r) => [r[0], r]));
  const folders = new Map();
  for (const p of urls) {
    const f = folderOf(p);
    const o = folders.get(f) || { pages: 0, indexed: 0, crawled: 0, discovered: 0, inspected: 0, withImpr: 0, impr: 0, clicks: 0, posW: 0, pImpr: 0, pClicks: 0, pPosW: 0 };
    o.pages++;
    const ix = idxOf.get(p);
    if (ix && ix[1]) { o.inspected++; if (ix[1] === 'PASS') o.indexed++; if (/^Crawled - currently not indexed/i.test(ix[2])) o.crawled++; if (/^Discovered - currently not indexed/i.test(ix[2])) o.discovered++; }
    const c = C.get(p), q = P.get(p);
    if (c) { o.impr += c.impressions; o.clicks += c.clicks; o.posW += c.position * c.impressions; if (c.impressions > 0) o.withImpr++; }
    if (q) { o.pImpr += q.impressions; o.pClicks += q.clicks; o.pPosW += q.position * q.impressions; }
    folders.set(f, o);
  }
  const total = [...folders.values()].reduce((a, o) => { for (const k of Object.keys(o)) a[k] = (a[k] || 0) + o[k]; return a; }, {});
  const pos = (w, i) => (i ? r2(w / i) : '');
  const comp = [...folders].filter(([f]) => computedFolders.has(f)).reduce((a, [, o]) => { a.pages += o.pages; a.indexed += o.indexed; a.inspected += o.inspected; return a; }, { pages: 0, indexed: 0, inspected: 0 });
  const drift = total.impr && total.pImpr ? r2(total.posW / total.impr - total.pPosW / total.pImpr) : '';
  const summary = [
    ['Sign of Nine: Search Console summary'],
    ['Generated', new Date().toISOString()],
    ['Property', site],
    ['Window', `${cur[0]} to ${cur[1]}, compared with ${prev[0]} to ${prev[1]}`],
    ['Index checks this run', `${inspected} of ${urls.length} URLs (${errors.length} errors)`],
    [],
    ['The three numbers', 'Value', 'Detail'],
    ['1. Computed-folder index share (%)', comp.inspected ? r2((100 * comp.indexed) / comp.inspected) : 'no data', `${comp.indexed} indexed of ${comp.inspected} inspected, ${comp.pages} computed pages (times, four-digit, birthday)`],
    ['2. Pages with an impression in the window (%)', r2((100 * total.withImpr) / total.pages), `${total.withImpr} of ${total.pages} sitemap pages`],
    ['3. Sitewide position drift (places, negative is better)', drift === '' ? 'no data' : drift, `average position ${pos(total.posW, total.impr)} now, ${pos(total.pPosW, total.pImpr)} before`],
    [],
    ['Folder', 'Pages', 'Inspected', 'Indexed', 'Index share (%)', 'Crawled, not indexed', 'Discovered, not indexed', 'Pages with impressions', 'Impressions', 'Clicks', 'Avg position', 'Impressions before', 'Clicks before', 'Avg position before'],
    ...[...folders].sort((a, b) => b[1].pages - a[1].pages).map(([f, o]) => [f, o.pages, o.inspected, o.indexed, o.inspected ? r2((100 * o.indexed) / o.inspected) : '', o.crawled, o.discovered, o.withImpr, o.impr, o.clicks, pos(o.posW, o.impr), o.pImpr, o.pClicks, pos(o.pPosW, o.pImpr)]),
    ['TOTAL', total.pages, total.inspected, total.indexed, total.inspected ? r2((100 * total.indexed) / total.inspected) : '', total.crawled, total.discovered, total.withImpr, total.impr, total.clicks, pos(total.posW, total.impr), total.pImpr, total.pClicks, pos(total.pPosW, total.pImpr)],
  ];
  const perf = [['Page', 'Clicks', 'Impressions', 'CTR', 'Avg position', 'Clicks before', 'Impressions before', 'Avg position before', 'Impressions change (%)'],
    ...urls.map((p) => { const c = C.get(p), q = P.get(p); return [p, c?.clicks || 0, c?.impressions || 0, c ? r4(c.ctr) : 0, c ? r2(c.position) : '', q?.clicks || 0, q?.impressions || 0, q ? r2(q.position) : '', q?.impressions ? r2((100 * ((c?.impressions || 0) - q.impressions)) / q.impressions) : ''];
    })];
  const queries = [['Query', 'Page', 'Clicks', 'Impressions', 'CTR', 'Position'],
    ...queryRows.sort((a, b) => b.impressions - a.impressions).slice(0, S.queryRows).map((r) => [r.keys[0], pathOf(r.keys[1]), r.clicks, r.impressions, r4(r.ctr), r2(r.position)])];
  const daily = [['Date', 'Clicks', 'Impressions', 'CTR', 'Avg position'], ...dailyRows.sort((a, b) => (a.keys[0] < b.keys[0] ? -1 : 1)).map((r) => [r.keys[0], r.clicks, r.impressions, r4(r.ctr), r2(r.position)])];
  const index = [['Page', 'Verdict', 'Coverage', 'Last crawl', 'Google canonical', 'User canonical', 'robots.txt', 'Indexing', 'Page fetch', 'Inspected'], ...indexRows];

  // the Sheet
  const have = ((await call('GET', `${ENDPOINTS.sheets}/${SHEET}?fields=sheets.properties.title`)).sheets || []).map((s) => s.properties.title);
  const need = [T.summary, T.pages, T.queries, T.daily, T.index].filter((t) => !have.includes(t));
  if (need.length) await call('POST', `${ENDPOINTS.sheets}/${SHEET}:batchUpdate`, { requests: need.map((title) => ({ addSheet: { properties: { title } } })) });
  for (const [title, rows] of [[T.summary, summary], [T.pages, perf], [T.queries, queries], [T.daily, daily], [T.index, index]]) await writeTab(title, rows);

  const stats = { site, dataThrough: end, urls: urls.length, performanceRows: perf.length - 1, queryRows: queries.length - 1, dailyRows: daily.length - 1, inspected, indexed: total.indexed, inspectedTotal: total.inspected, errors: errors.length };
  console.log(JSON.stringify(stats));
  setStatus(TITLE, `Export OK. Last run: ${stamp()}.\n\n- Property: ${site}, data through ${end}\n- Sheet tabs written: ${[T.summary, T.pages, T.queries, T.daily, T.index].join(', ')}\n- ${urls.length} sitemap URLs; ${perf.length - 1} Performance rows; ${queries.length - 1} Queries rows; ${daily.length - 1} days\n- Index checks this run: ${inspected} (${errors.length} errors); indexed ${total.indexed} of ${total.inspected} inspected pages\n${errors.length ? `\nErrors:\n${errors.slice(0, 5).map((e) => `- ${e}`).join('\n')}\n` : ''}\nQuery and click data stays in the private Sheet, not in this issue.\n`);
  clear('search:');

  async function readTab(tab) {
    try { return (await call('GET', `${ENDPOINTS.sheets}/${SHEET}/values/${encodeURIComponent(`${tab}!A:J`)}`)).values || []; } catch (e) { if (e.status === 400 || e.status === 404) return []; throw e; }
  }
  async function writeTab(title, rows) {
    await call('POST', `${ENDPOINTS.sheets}/${SHEET}/values/${encodeURIComponent(title)}:clear`, {});
    for (let i = 0; i < rows.length; i += 5000) await call('PUT', `${ENDPOINTS.sheets}/${SHEET}/values/${encodeURIComponent(`${title}!A${i + 1}`)}?valueInputOption=RAW`, { majorDimension: 'ROWS', values: rows.slice(i, i + 5000) });
  }
}

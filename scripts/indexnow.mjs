// Tells IndexNow (Bing, Yandex, Seznam, Naver share the index) about pages that changed.
// A page counts as changed when its lastmod in the live sitemap is within the last --since days (default 2);
// lastmod only moves when a page's text moves, so a template or notes-only push submits nothing.
//   node scripts/indexnow.mjs               pages changed in the last 2 days
//   node scripts/indexnow.mjs --since 7     pages changed in the last 7 days
//   node scripts/indexnow.mjs --all         every URL in the sitemap (use after the very first launch, or a big migration)
//   node scripts/indexnow.mjs --dry-run     print what would be sent
//   --base http://127.0.0.1:4321            read the sitemap from a local preview instead of the live site (for tests)
import { SITE } from '../src/site.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const key = SITE.indexNowKey;
if (!key) { console.error('No IndexNow key set in src/site.mjs'); process.exit(1); }
const host = new URL(SITE.url).host;
const base = (val('--base', SITE.url) || SITE.url).replace(/\/$/, '');
const since = new Date(Date.now() - Number(val('--since', 2)) * 86400000).toISOString().slice(0, 10);

/** Every {loc, lastmod} in a sitemap or sitemap index, following the index. */
async function sitemapEntries(url) {
  const res = await fetch(url.replace(SITE.url, base));
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const xml = await res.text();
  if (xml.includes('<sitemapindex')) {
    const all = [];
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) all.push(...(await sitemapEntries(m[1])));
    return all;
  }
  return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ loc: m[1], lastmod: (m[2] || '').slice(0, 10) }));
}

const entries = (await sitemapEntries(`${SITE.url}/sitemap-index.xml`)).filter((e) => e.loc.startsWith(SITE.url));
const urls = has('--all') ? entries.map((e) => e.loc) : entries.filter((e) => e.lastmod >= since).map((e) => e.loc);
if (!urls.length) { console.log(`IndexNow: no page has a lastmod on or after ${since}; nothing to submit (${entries.length} URLs in the sitemap).`); process.exit(0); }
if (has('--dry-run')) { console.log(`IndexNow would submit ${urls.length} URLs:\n${urls.join('\n')}`); process.exit(0); }

const body = { host, key, keyLocation: `${SITE.url}/${key}.txt`, urlList: urls.slice(0, 10000) };
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log(`IndexNow: ${urls.length} URLs submitted (${has('--all') ? 'all' : `lastmod since ${since}`}), HTTP ${res.status}`);
if (res.status >= 400) { console.error(await res.text()); process.exit(1); }

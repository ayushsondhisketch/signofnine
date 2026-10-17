// Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver share the index).
// Run after a deploy: node scripts/indexnow.mjs
import { SITE } from '../src/site.mjs';

const key = SITE.indexNowKey;
if (!key) { console.error('No IndexNow key set in src/site.mjs'); process.exit(1); }
const host = new URL(SITE.url).host;

async function sitemapUrls(url) {
  const xml = await (await fetch(url)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (xml.includes('<sitemapindex')) {
    const all = [];
    for (const l of locs) all.push(...(await sitemapUrls(l)));
    return all;
  }
  return locs;
}

const urls = (await sitemapUrls(`${SITE.url}/sitemap-index.xml`)).filter((u) => u.startsWith(SITE.url));
const body = { host, key, keyLocation: `${SITE.url}/${key}.txt`, urlList: urls.slice(0, 10000) };
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log(`IndexNow: ${urls.length} URLs submitted, HTTP ${res.status}`);
if (res.status >= 400) { console.error(await res.text()); process.exit(1); }

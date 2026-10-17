// Writes one sitemap per folder plus a sitemap index, from the built site. lastmod comes from each page's
// article:modified_time meta tag, else the build date. noindex pages are left out.
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../src/site.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const today = new Date().toISOString().slice(0, 10);
const pages = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n === 'index.html') pages.push(p); } };
walk(dist);

const groups = { home: [], 'angel-numbers': [], times: [], numbers: [], 'life-path': [], compatibility: [], 'personal-year': [], 'birthday-number': [], guides: [], articles: [], pages: [] };
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  if (/<meta name="robots" content="noindex/.test(html)) continue;
  const path = p.slice(dist.length).replace(/index\.html$/, '');
  if (path === '/404/') continue;
  const mod = (html.match(/article:modified_time" content="([^"]+)"/) || [])[1] || today;
  const seg = path.split('/')[1] || '';
  let g = 'pages';
  if (path === '/') g = 'home';
  else if (path.startsWith('/angel-numbers/times/')) g = 'times';
  else if (groups[seg]) g = seg;
  else if (['expression-number', 'soul-urge-number', 'personality-number'].includes(seg)) g = 'guides';
  groups[g].push({ loc: `${SITE.url}${path}`, lastmod: mod, priority: path === '/' ? '1.0' : path.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6' });
}
mkdirSync(join(dist, 'sitemaps'), { recursive: true });
const index = [];
for (const [name, urls] of Object.entries(groups)) {
  if (!urls.length) continue;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(join(dist, 'sitemaps', `${name}.xml`), xml);
  index.push({ loc: `${SITE.url}/sitemaps/${name}.xml`, lastmod: urls.map((u) => u.lastmod).sort().pop() });
}
writeFileSync(join(dist, 'sitemap-index.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${index.map((s) => `  <sitemap><loc>${s.loc}</loc><lastmod>${s.lastmod}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
const total = Object.values(groups).reduce((s, g) => s + g.length, 0);
console.log(`Sitemaps: ${index.length} files, ${total} URLs.`);

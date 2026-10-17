// Writes one sitemap per folder plus a sitemap index, from the built site. lastmod comes from each page's
// article:modified_time meta tag. A page without one is a fixed page: it gets the launch date, and the home page and
// the articles index get the newest date in the site and in the articles folder. A build never makes up a date, so
// lastmod only moves when a page's text moves (Google ignores lastmod once it has seen it lie).
// noindex pages are left out.
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../src/site.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const pages = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n === 'index.html') pages.push(p); } };
walk(dist);

const entries = [];
const groups = { home: [], 'angel-numbers': [], times: [], numbers: [], 'life-path': [], compatibility: [], 'personal-year': [], 'birthday-number': [], guides: [], articles: [], pages: [] };
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  if (/<meta name="robots" content="noindex/.test(html)) continue;
  const path = p.slice(dist.length).replace(/index\.html$/, '');
  if (path === '/404/') continue;
  const mod = (html.match(/article:modified_time" content="([^"]+)"/) || [])[1] || '';
  const seg = path.split('/')[1] || '';
  let g = 'pages';
  if (path === '/') g = 'home';
  else if (path.startsWith('/angel-numbers/times/')) g = 'times';
  else if (groups[seg]) g = seg;
  else if (['expression-number', 'soul-urge-number', 'personality-number'].includes(seg)) g = 'guides';
  const u = { loc: `${SITE.url}${path}`, path, lastmod: mod.slice(0, 10), priority: path === '/' ? '1.0' : path.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6' };
  groups[g].push(u);
  entries.push(u);
}
const newest = (list) => list.map((u) => u.lastmod).filter(Boolean).sort().pop() || SITE.launched;
const siteNewest = newest(entries);
const articlesNewest = newest(entries.filter((u) => u.path.startsWith('/articles/') && u.path !== '/articles/'));
for (const u of entries) if (!u.lastmod) u.lastmod = u.path === '/' ? siteNewest : u.path === '/articles/' ? articlesNewest : SITE.launched;
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

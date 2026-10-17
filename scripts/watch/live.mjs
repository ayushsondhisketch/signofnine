#!/usr/bin/env node
// Daily check of the live site: every URL in the sitemap answers 200 with one H1, a title, a canonical and no noindex; robots.txt and the
// sitemap are intact; the AI and search crawlers are not blocked (each is compared with a browser request, so a blocked runner is not mistaken
// for a blocked bot); the Pinterest feeds and their pictures load; the IndexNow key file answers; unknown URLs return 404.
//
//   node scripts/watch/live.mjs                       check https://signofnine.com and write the monitor issue (needs GH_TOKEN, else prints it)
//   node scripts/watch/live.mjs --base http://localhost:4321 --dry-run     check a local preview of dist/ (the tests that need real hosts are skipped)
import { readFileSync } from 'node:fs';
import { SITE } from '../../src/site.mjs';
import { config, get, pool, val, has, sleep, setStatus, raise, clear, stamp } from './lib.mjs';

const BASE = (val('--base', config.site) || config.site).replace(/\/$/, '');
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
const L = config.live;
const SAMPLE = ['/', '/angel-numbers/444/', '/angel-numbers/1111/', '/life-path/7/', '/personal-year/7/', '/articles/is-numerology-real/', '/angel-numbers/times/11-11/', '/robots.txt'].slice(0, L.sampleForBots);
const toBase = (u) => BASE + new URL(u).pathname;
const bad = (r) => !r.ok || [401, 403, 429, 503].includes(r.status) || r.headers.get('cf-mitigated') || /Just a moment|Attention Required/i.test(r.body || '');

async function runChecks() {
  const out = {}; // key -> { level, detail }
  const rec = (key, level, detail) => { const rank = { pass: 0, warn: 1, fail: 2 }; if (!out[key] || rank[level] > rank[out[key].level]) out[key] = { level, detail }; else if (rank[level] === rank[out[key].level] && level !== 'pass') out[key].detail += `; ${detail}`; };
  const pass = (key, detail) => { if (!out[key]) out[key] = { level: 'pass', detail }; };
  const info = {};

  // robots.txt
  const robots = await get(`${BASE}/robots.txt`);
  if (!robots.ok || robots.status !== 200) rec('robots', 'fail', `robots.txt ${robots.ok ? robots.status : robots.error}`);
  else {
    const groups = robots.body.split(/\r?\n\s*\r?\n/).map((g) => ({ uas: [...g.matchAll(/^user-agent:\s*(.+)$/gim)].map((m) => m[1].trim().toLowerCase()), rules: [...g.matchAll(/^(allow|disallow):\s*(.*)$/gim)].map((m) => [m[1].toLowerCase(), m[2].trim()]) }));
    // rules of every group that names the crawler (or of the * group when none does); with Allow: / and Disallow: / together, the allow wins, as in Google's parser
    const blocked = (ua) => {
      let mine = groups.filter((x) => x.uas.includes(ua.toLowerCase()));
      if (!mine.length) mine = groups.filter((x) => x.uas.includes('*'));
      const rules = mine.flatMap((g) => g.rules);
      return rules.some(([k, v]) => k === 'disallow' && v === '/') && !rules.some(([k, v]) => k === 'allow' && v === '/');
    };
    for (const ua of ['*', 'googlebot', 'bingbot', 'GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot']) if (blocked(ua)) rec('robots', 'fail', `robots.txt blocks ${ua} (Disallow: /). If Cloudflare added it, turn off "Block AI bots", "Bot Preference Sync" and the managed robots.txt`);
    // Cloudflare can write into robots.txt without a commit (Bot Preference Sync, the older managed robots.txt). The repo file is the policy.
    // A group that names a crawler we want in and says Disallow: / fails even when a later Allow: / ties with it: parsers differ on which group they read.
    for (const ua of ['*', 'googlebot', 'bingbot', 'GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot']) if (groups.some((g) => g.uas.includes(ua.toLowerCase()) && g.rules.some(([k, v]) => k === 'disallow' && v === '/'))) rec('robots', 'fail', `a robots.txt group for ${ua} says Disallow: / (not in public/robots.txt). Turn off "Bot Preference Sync" and "Block AI bots" in Cloudflare (seo/SETUP.md, section 3)`);
    const norm = (s) => s.replace(/\r\n/g, '\n').trim();
    if (norm(robots.body) !== norm(readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8'))) rec('robots', 'warn', 'the live robots.txt differs from public/robots.txt (is Cloudflare Bot Preference Sync writing into it?)');
    if (!robots.body.includes(`Sitemap: ${SITE.url}/sitemap-index.xml`)) rec('robots', 'fail', 'robots.txt has no Sitemap line for sitemap-index.xml');
    if (/content-signal/i.test(robots.body)) rec('robots', 'warn', 'robots.txt carries a Content-Signal line (Cloudflare managed robots.txt?)');
    pass('robots', 'robots.txt open to all crawlers, Sitemap line present');
  }

  // sitemap index and every URL in it
  const idx = await get(`${BASE}/sitemap-index.xml`);
  let urls = [];
  if (!idx.ok || idx.status !== 200) rec('sitemap', 'fail', `sitemap-index.xml ${idx.ok ? idx.status : idx.error}`);
  else {
    const subs = [...idx.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const s of subs) {
      const r = await get(toBase(s));
      if (!r.ok || r.status !== 200) { rec('sitemap', 'fail', `${s} ${r.ok ? r.status : r.error}`); continue; }
      urls.push(...[...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    }
    urls = [...new Set(urls)];
    info.urls = urls.length;
    if (urls.length < L.expectedMinUrls) rec('sitemap', 'fail', `${urls.length} URLs in the sitemaps, expected at least ${L.expectedMinUrls}`);
    pass('sitemap', `${urls.length} URLs in ${subs.length} sitemaps`);
  }

  // every page
  const probs = [];
  let slow = 0, ok = 0;
  await pool(urls, 6, async (u) => {
    const path = new URL(u).pathname;
    let r = await get(toBase(u));
    if (!r.ok || r.status >= 500) { await sleep(1500); r = await get(toBase(u)); }
    const P = (m) => probs.push(`${path} ${m}`);
    if (!r.ok) return P(`no response (${r.error})`);
    if (r.status !== 200) return P(`HTTP ${r.status}`);
    const h = r.body;
    const h1 = (h.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) P(`${h1} h1 elements`);
    if (!/<title>[^<]{5,}<\/title>/.test(h)) P('no title');
    if (!/<meta name="description" content="[^"]{20,}"/.test(h)) P('no meta description');
    const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canon !== `${SITE.url}${path}`) P(`canonical is ${canon || 'missing'}`);
    if (/<meta name="robots" content="[^"]*noindex/i.test(h)) P('meta robots noindex');
    if (/noindex/i.test(r.headers.get('x-robots-tag') || '')) P('X-Robots-Tag noindex');
    if (!LOCAL && r.ttfb > L.maxTtfbMs && path === '/') slow++;
    if (!probs.some((p) => p.startsWith(path + ' '))) ok++;
  });
  if (urls.length) {
    if (probs.length) rec('pages', 'fail', `${probs.length} of ${urls.length} pages have a problem, first: ${probs.slice(0, 5).join(' | ')}`);
    pass('pages', `${ok} of ${urls.length} pages answer 200 with one H1, a title, a description and a matching canonical, no noindex`);
  }
  if (slow) rec('speed', 'warn', `home page first byte over ${L.maxTtfbMs} ms`);
  pass('speed', 'home page first byte under the limit');

  // crawlers: each bot against a browser request for the same URL
  const botFails = [];
  for (const path of SAMPLE) {
    const control = await get(`${BASE}${path}`);
    if (bad(control)) continue; // the runner itself is blocked or the page is down: reported by the page check, not a bot problem
    for (const [name, ua] of Object.entries(L.botAgents)) {
      const r = await get(`${BASE}${path}`, { ua });
      if (bad(r) || r.status !== 200) botFails.push(`${name} got ${r.ok ? r.status : r.error} on ${path}`);
    }
  }
  if (botFails.length) rec('bots', 'fail', `crawlers are being blocked while a browser is not: ${[...new Set(botFails)].slice(0, 6).join('; ')}. Check Cloudflare Security: Bots (Block AI bots, Bot Fight Mode) and WAF rules`);
  pass('bots', `${Object.keys(L.botAgents).join(', ')} all get 200 where a browser does`);

  // unknown URLs are real 404s
  const nf = await get(`${BASE}/this-page-does-not-exist-9x7q/`);
  if (nf.ok && nf.status !== 404) rec('404', 'fail', `an unknown URL returns ${nf.status}, not 404 (soft 404)`);
  pass('404', 'unknown URLs return 404');

  // IndexNow key and llms.txt
  const key = await get(`${BASE}/${SITE.indexNowKey}.txt`);
  if (!key.ok || key.status !== 200 || key.body.trim() !== SITE.indexNowKey) rec('indexnow-key', 'fail', `IndexNow key file ${key.ok ? key.status : key.error}`);
  pass('indexnow-key', 'IndexNow key file answers');
  const llms = await get(`${BASE}/llms.txt`);
  if (!llms.ok || llms.status !== 200) rec('llms', 'warn', `llms.txt ${llms.ok ? llms.status : llms.error}`);
  pass('llms', 'llms.txt answers');

  // Pinterest feeds and pictures
  let items = 0;
  for (const b of L.feedBoards) {
    const f = await get(`${BASE}/pins/${b}.xml`);
    if (!f.ok || f.status !== 200) { rec('feeds', 'fail', `/pins/${b}.xml ${f.ok ? f.status : f.error}`); continue; }
    if (!f.body.startsWith('<?xml') || !f.body.includes('</rss>')) rec('feeds', 'fail', `/pins/${b}.xml is not complete RSS`);
    const cc = f.headers.get('cache-control') || '';
    if (/max-age=(\d{5,})/.test(cc)) rec('feeds', 'warn', `/pins/${b}.xml is cached for ${cc.match(/max-age=(\d+)/)[1]} s (feeds should refresh within hours)`);
    for (const m of f.body.matchAll(/<enclosure url="([^"]+)"/g)) {
      items++;
      const img = await get(toBase(m[1]), { method: 'HEAD' });
      const size = Number(img.headers.get('content-length') || 0);
      if (!img.ok || img.status !== 200 || !/image\/png/.test(img.headers.get('content-type') || '') || (size && size < 10000)) rec('feeds', 'fail', `${m[1]} ${img.ok ? img.status : img.error}`);
    }
  }
  pass('feeds', `${L.feedBoards.length} feeds load as RSS; ${items} pictures answer`);

  if (!LOCAL) {
    // host rules
    const http = await get(`http://${new URL(SITE.url).host}/`);
    if (http.ok && !([301, 308].includes(http.status) && /^https:\/\//.test(http.headers.get('location') || ''))) rec('https-redirect', 'fail', `http:// returns ${http.status}, not a redirect to https`);
    pass('https-redirect', 'http redirects to https');
    // a deep URL with a query string: the redirect must keep both, so a link to www lands on the same page of the main address
    const www = await get(`https://www.${new URL(SITE.url).host}/angel-numbers/444/?check=1`);
    const wwwTo = www.ok ? (www.headers.get('location') || '') : '';
    if (!www.ok) pass('www', `www host not set up (${www.error}); see seo/SETUP.md, section 3`);
    else if ([301, 308].includes(www.status) && wwwTo === `${SITE.url}/angel-numbers/444/?check=1`) pass('www', 'www redirects to the same path on the main address and keeps the query string');
    else if ([301, 308].includes(www.status) && wwwTo.startsWith(SITE.url)) rec('www', 'warn', `www redirects to ${wwwTo}, not to the same path and query string on ${SITE.url}`);
    else rec('www', 'warn', `www returns ${www.status} instead of redirecting to ${SITE.url}`);
    const tr = await get(`${SITE.url}/angel-numbers/444`);
    if (tr.ok && tr.status === 200) rec('trailing-slash', 'warn', '/angel-numbers/444 answers 200 without redirecting to the trailing-slash URL');
    pass('trailing-slash', 'no-slash URLs redirect');
    const home = await get(`${SITE.url}/`);
    const miss = ['strict-transport-security', 'x-content-type-options', 'referrer-policy'].filter((h) => !home.headers.get(h));
    if (home.ok && miss.length) rec('headers', 'warn', `home page lacks ${miss.join(', ')}`);
    pass('headers', 'security headers present');
  }
  return { out, info };
}

let res = await runChecks();
let fails = Object.entries(res.out).filter(([, v]) => v.level === 'fail');
if (fails.length && !has('--no-retry') && !LOCAL) { console.log(`First pass found ${fails.length} problem(s); checking again in 45 s before reporting.`); await sleep(45000); res = await runChecks(); fails = Object.entries(res.out).filter(([, v]) => v.level === 'fail'); }

const rows = Object.entries(res.out).map(([k, v]) => `| ${k} | ${v.level.toUpperCase()} | ${v.detail.replace(/\|/g, '/')} |`);
const worst = fails.length ? 'FAIL' : Object.values(res.out).some((v) => v.level === 'warn') ? 'WARN' : 'PASS';
const body = `Daily check of ${BASE}. Last run: ${stamp()}. Overall: **${worst}**.\n\n| Check | Result | Detail |\n|---|---|---|\n${rows.join('\n')}\n\nWritten by \`scripts/watch/live.mjs\` (workflow \`watch-live.yml\`). Failures open an \`alert\` issue; this issue is overwritten every run.\n`;
console.log(body);
if (!LOCAL || has('--write')) {
  setStatus('Monitor: live site', body);
  for (const [k, v] of fails) raise(`live:${k}`, `live site: ${k}`, `${v.detail}\n\nSee the pinned "Monitor: live site" issue for the full table.`);
  clear('live:', new Set(fails.map(([k]) => `live:${k}`)));
}
if (fails.length) process.exitCode = 1;

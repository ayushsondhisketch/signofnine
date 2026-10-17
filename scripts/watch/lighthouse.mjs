#!/usr/bin/env node
// Weekly lab performance check: Lighthouse (mobile emulation, simulated slow 4G, the default) on the key page types, the median of three runs each.
// Scores and Core Web Vitals proxies go to the monitor issue "Monitor: performance"; a page under the alert thresholds opens an alert.
// Lab numbers lead the real-user ones (Search Console's Core Web Vitals report needs traffic), so they are the early warning.
//
//   npm i --no-save lighthouse@13.5.0 chrome-launcher@1.2.2        (the workflow does this; not a dependency of the site)
//   node scripts/watch/lighthouse.mjs                              check https://signofnine.com
//   node scripts/watch/lighthouse.mjs --base http://127.0.0.1:4321 --pages /,/angel-numbers/444/ --runs 1 --dry-run
//   CHROME_PATH=/path/to/chrome overrides the browser.
import { config, val, setStatus, raise, clear, readStatus, stamp } from './lib.mjs';

const BASE = (val('--base', config.site) || config.site).replace(/\/$/, '');
const P = config.performance;
const pages = (val('--pages', '') ? val('--pages').split(',') : P.pages);
const runs = Number(val('--runs', P.runs));
let lighthouse, chromeLauncher;
try { lighthouse = (await import('lighthouse')).default; chromeLauncher = await import('chrome-launcher'); }
catch { console.error('lighthouse and chrome-launcher are not installed: npm i --no-save lighthouse@13.5.0 chrome-launcher@1.2.2'); process.exit(2); }

const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH || undefined, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

function extract(lhr) {
  const a = lhr.audits;
  const failing = [];
  for (const c of CATS.slice(1)) for (const ref of lhr.categories[c].auditRefs) { const au = a[ref.id]; if (ref.weight > 0 && au.score !== null && au.score < 1) failing.push(`${c}: ${au.title}`); }
  return {
    scores: Object.fromEntries(CATS.map((c) => [c, Math.round((lhr.categories[c].score || 0) * 100)])),
    lcp: Math.round(a['largest-contentful-paint'].numericValue), cls: Number((a['cumulative-layout-shift'].numericValue || 0).toFixed(3)),
    tbt: Math.round(a['total-blocking-time'].numericValue), fcp: Math.round(a['first-contentful-paint'].numericValue),
    kb: Math.round((a['total-byte-weight'].numericValue || 0) / 1024), failing,
  };
}

const results = {};
for (const path of pages) {
  const url = `${BASE}${path}`;
  const got = [];
  for (let i = 0; i < runs; i++) {
    try { const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATS }); got.push(extract(r.lhr)); }
    catch (e) { console.error(`${path} run ${i + 1}: ${e.message}`); }
  }
  if (!got.length) { results[path] = { error: true }; continue; }
  const mid = median(got.map((g) => g.scores.performance));
  results[path] = got.find((g) => g.scores.performance === mid) || got[0];
  console.log(`${path} performance ${results[path].scores.performance}, LCP ${results[path].lcp} ms, CLS ${results[path].cls}`);
}
await chrome.kill();

const prevBody = readStatus('Monitor: performance');
let prev = {};
try { prev = JSON.parse((prevBody.match(/<!-- data:(.*?) -->/s) || [])[1] || '{}').pages || {}; } catch {}

const fails = [], rows = [];
for (const path of pages) {
  const r = results[path];
  if (!r || r.error) { rows.push(`| ${path} | no result | | | | | | | | |`); fails.push([path, 'Lighthouse could not measure this page']); continue; }
  const s = r.scores;
  const level = [];
  for (const c of CATS) { if (s[c] < P.alertBelow[c]) level.push(['fail', `${c} ${s[c]} (alert below ${P.alertBelow[c]})`]); else if (s[c] < P.warnBelow[c]) level.push(['warn', `${c} ${s[c]}`]); }
  if (r.lcp > P.alertAbove.lcpMs) level.push(['fail', `LCP ${r.lcp} ms (alert above ${P.alertAbove.lcpMs})`]); else if (r.lcp > P.warnAbove.lcpMs) level.push(['warn', `LCP ${r.lcp} ms`]);
  if (r.cls > P.alertAbove.cls) level.push(['fail', `CLS ${r.cls} (alert above ${P.alertAbove.cls})`]); else if (r.cls > P.warnAbove.cls) level.push(['warn', `CLS ${r.cls}`]);
  if (r.tbt > P.alertAbove.tbtMs) level.push(['fail', `TBT ${r.tbt} ms (alert above ${P.alertAbove.tbtMs})`]); else if (r.tbt > P.warnAbove.tbtMs) level.push(['warn', `TBT ${r.tbt} ms`]);
  const before = prev[path]?.scores?.performance;
  const delta = before === undefined ? '' : `${s.performance - before >= 0 ? '+' : ''}${s.performance - before}`;
  if (before !== undefined && s.performance - before <= -5) level.push(['warn', `performance fell ${before} to ${s.performance} since the last run`]);
  const flag = level.some(([l]) => l === 'fail') ? 'FAIL' : level.length ? 'WARN' : 'PASS';
  rows.push(`| ${path} | ${s.performance} | ${s.accessibility} | ${s['best-practices']} | ${s.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} | ${r.kb} | ${delta} | ${flag} |`);
  for (const [l, m] of level) if (l === 'fail') fails.push([path, m]);
}
const notes = pages.filter((p) => results[p]?.failing?.length).map((p) => `- ${p}: ${[...new Set(results[p].failing)].slice(0, 4).join('; ')}`);
const body = `Lighthouse on ${BASE}, mobile emulation with simulated slow 4G, median of ${runs} run${runs > 1 ? 's' : ''}. Last run: ${stamp()}. Overall: **${fails.length ? 'FAIL' : rows.some((r) => r.endsWith('WARN |')) ? 'WARN' : 'PASS'}**.\n\n| Page | Perf | A11y | Best practice | SEO | LCP ms | CLS | TBT ms | KB | Change | Result |\n|---|---|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\nTargets: performance 90 or more, LCP under ${P.warnAbove.lcpMs} ms, CLS under ${P.warnAbove.cls}, TBT under ${P.warnAbove.tbtMs} ms. Alerts open below performance ${P.alertBelow.performance}, LCP above ${P.alertAbove.lcpMs} ms, CLS above ${P.alertAbove.cls}.\n${notes.length ? `\nAudits not passing:\n${notes.join('\n')}\n` : ''}\nLab numbers, not real-user numbers: the Core Web Vitals report in Search Console takes over once the site has traffic.\n<!-- data:${JSON.stringify({ date: new Date().toISOString().slice(0, 10), pages: Object.fromEntries(pages.map((p) => [p, results[p]?.error ? undefined : { scores: results[p]?.scores, lcp: results[p]?.lcp }])) })} -->\n`;
console.log(body);
setStatus('Monitor: performance', body);
for (const [path, m] of fails) raise(`perf:${path}`, `performance: ${path}`, `${path}: ${m}`);
clear('perf:', new Set(fails.map(([p]) => `perf:${p}`)));
if (fails.length) process.exitCode = 1;

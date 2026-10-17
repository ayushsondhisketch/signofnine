#!/usr/bin/env node
// Weekly audit. Builds the site from the checked-out main the way Cloudflare does, runs the checks that need the finished
// dist/ folder, and writes the result to the pinned issue "Monitor: weekly audit". Problems open an issue labeled "alert".
//
//   1. npm run build                    images, pins, astro build, sitemaps, Pagefind, QA, pin check. A failure means main would not deploy.
//   2. node scripts/qa.mjs --strict     the mechanical rules as hard failures; the warning count is tracked week to week
//   3. node scripts/pins.mjs --check / --status / --audit    the pin queue: well formed, how many days it still runs, how many possible pins do not fit
//   4. outside links                    every outside href in dist; 404, 410 and dead hosts alert; 403, 429 and 5xx are listed but never alert
//   5. npm audit --omit=dev             counts only (readers get no JavaScript from npm packages, so this is information)
//   6. page count against last week     a drop of more than 3 indexable pages alerts
//
//   node scripts/watch/audit.mjs                run everything, write the issue
//   node scripts/watch/audit.mjs --skip-build  reuse dist/ (for a local run)
//   node scripts/watch/audit.mjs --dry-run     print the issue text, change nothing (also the default without GH_TOKEN)
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config, root, has, get, pool, setStatus, raise, clear, readStatus, stamp, today } from './lib.mjs';

const TITLE = 'Monitor: weekly audit';
const dist = join(root, 'dist');
const sh = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}` }; };
const tail = (s, n = 30) => s.trim().split('\n').slice(-n).join('\n');
const fence = (s) => '```\n' + s.replace(/```/g, "'''") + '\n```';
const active = new Set();
const problems = [];
const flag = (key, title, body) => { active.add(key); problems.push([key, title, body]); };

// ------------------------------------------------------------------ 1 build
let build = { code: 0, out: '(skipped)', secs: 0 };
if (!has('--skip-build')) {
  const t0 = Date.now();
  build = { ...sh('npm', ['run', 'build']), secs: Math.round((Date.now() - t0) / 1000) };
}
const built = existsSync(join(dist, 'sitemap-index.xml'));
if (build.code !== 0 || !built) flag('audit:build', 'weekly audit: the build fails', `\`npm run build\` on main exited with ${build.code}${built ? '' : ' and produced no sitemap'}. Cloudflare would fail the same way, so the next push would not deploy.\n\n${fence(tail(build.out, 40))}`);

// ------------------------------------------------------------------ 2 strict QA
let qa = { code: 0, out: '' };
let pagesLine = 'not run';
let warnN = 0, indexable = 0, totalPages = 0;
if (built) {
  qa = sh('node', ['scripts/qa.mjs', '--strict']);
  pagesLine = (qa.out.match(/^QA: .*$/m) || [''])[0] || 'no QA summary';
  warnN = Number((qa.out.match(/^(\d+) warnings/m) || [])[1] || 0);
  const m = pagesLine.match(/QA: (\d+) pages \((\d+) indexable/);
  if (m) { totalPages = Number(m[1]); indexable = Number(m[2]); }
  if (qa.code !== 0) {
    const failing = qa.out.split('\n').filter((l) => /^\s+FAIL /.test(l)).slice(0, 40).map((l) => l.trim()).join('\n');
    flag('audit:qa', 'weekly audit: strict QA fails', `\`node scripts/qa.mjs --strict\` found hard failures on main:\n\n${fence(failing || tail(qa.out, 30))}\n\nFix the page or the template; never edit scripts/qa.mjs to get through.`);
  }
}

// ------------------------------------------------------------------ 3 pins
let pinsNote = 'not run';
if (built) {
  const check = sh('node', ['scripts/pins.mjs', '--check']);
  const status = sh('node', ['scripts/pins.mjs', '--status']);
  const audit = sh('node', ['scripts/pins.mjs', '--audit']);
  const checkLine = (check.out.match(/^Pins check: .*$/m) || [tail(check.out, 1)])[0];
  const statusLine = (status.out.match(/^Pins: .*$/m) || [''])[0];
  const auditLine = (audit.out.match(/^Audit: .*$/m) || [''])[0];
  pinsNote = [checkLine, statusLine, auditLine].filter(Boolean).join('\n');
  if (check.code !== 0) flag('audit:pins', 'weekly audit: the Pinterest queue has problems', `\`node scripts/pins.mjs --check\` fails:\n\n${fence(tail(check.out, 30))}`);
  const runsTo = (statusLine.match(/queue runs to (\d{4}-\d{2}-\d{2})/) || [])[1];
  if (!runsTo || runsTo < new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)) flag('audit:pins-runway', 'weekly audit: the Pinterest queue is about to run out', `${statusLine || 'no queue status'}\n\nFewer than two days of pins are queued. The Pins task fills the queue twice a week (\`node scripts/pins.mjs --days-ahead 7\`); check that it ran.`);
}

// ------------------------------------------------------------------ 4 outside links
function outsideLinks() {
  const found = new Map();
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) { if (n !== '_pagefind' && n !== '_astro') walk(p); continue; }
      if (!n.endsWith('.html')) continue;
      const page = p.slice(dist.length).replace(/index\.html$/, '');
      for (const m of readFileSync(p, 'utf8').matchAll(/<a\b[^>]*?\bhref="(https?:\/\/[^"#]+)/g)) {
        const url = m[1].replace(/&amp;/g, '&');
        if (/^https?:\/\/(www\.)?signofnine\.com(\/|$)/.test(url)) continue;
        if (!found.has(url)) found.set(url, new Set());
        found.get(url).add(page);
      }
    }
  };
  if (built) walk(dist);
  return found;
}
// A dead host only counts as broken when two sites that always answer are reachable from here (a runner with no outside network would otherwise flag every link).
const online = (await Promise.all(['https://api.github.com/zen', 'https://www.cloudflare.com/cdn-cgi/trace'].map((u) => get(u, { redirect: 'follow', timeout: 10000 })))).every((r) => r.ok && r.status < 400);
async function checkOne(url) {
  const T = config.audit.externalLinkTimeoutMs;
  let r = await get(url, { method: 'HEAD', redirect: 'follow', timeout: T });
  if (!r.ok || r.status >= 400) r = await get(url, { redirect: 'follow', timeout: T });
  if (!r.ok && r.error !== 'ENOTFOUND') { await new Promise((s) => setTimeout(s, 3000)); r = await get(url, { redirect: 'follow', timeout: T }); }
  if (r.ok && r.status < 400) return { kind: 'ok', note: `HTTP ${r.status}` };
  if (r.ok && (r.status === 404 || r.status === 410)) return { kind: 'broken', note: `HTTP ${r.status}` };
  if (!r.ok && r.error === 'ENOTFOUND' && online) return { kind: 'broken', note: 'host not found' };
  return { kind: 'unsure', note: r.ok ? `HTTP ${r.status}` : r.error };
}
const links = outsideLinks();
const results = await pool([...links.keys()], 6, async (url) => [url, await checkOne(url)]);
const broken = results.filter(([, r]) => r.kind === 'broken');
const unsure = results.filter(([, r]) => r.kind === 'unsure');
const where = (url) => [...links.get(url)].slice(0, 3).join(', ') + (links.get(url).size > 3 ? ` and ${links.get(url).size - 3} more` : '');
if (broken.length) flag('audit:links', 'weekly audit: broken outside links', `${broken.length} outside link${broken.length > 1 ? 's' : ''} no longer work:\n\n${broken.map(([u, r]) => `- ${u} (${r.note}) on ${where(u)}`).join('\n')}\n\nReplace each with a working source or remove the sentence that relies on it. A replacement is a text change: update the page's modified date.`);

// ------------------------------------------------------------------ 5 dependencies
let depNote = 'not run';
{
  const a = sh('npm', ['audit', '--omit=dev', '--json']);
  try {
    const j = JSON.parse(a.out);
    const v = j.metadata.vulnerabilities;
    const names = Object.values(j.vulnerabilities || {}).map((x) => `${x.name} (${x.severity})`).join(', ');
    depNote = v.total ? `npm audit, production packages: advisories on ${names}. They concern servers, user input and runtime features this static site does not use, so nothing here reaches readers. The monthly review tests the upgrade.` : 'npm audit, production packages: no known advisories.';
  } catch { depNote = 'npm audit could not be read.'; }
}

// ------------------------------------------------------------------ 6 page count against last week
let prev = {};
try { prev = JSON.parse((readStatus(TITLE).match(/<!-- data:(.*?) -->/s) || [])[1] || '{}'); } catch { /* first run */ }
if (indexable && prev.indexable && indexable < prev.indexable - 3) flag('audit:pages', 'weekly audit: the site has fewer pages than last week', `${indexable} indexable pages now, ${prev.indexable} on ${prev.date}. If a page was folded into another on purpose, it needs a 301 in public/_redirects; if not, find which commit removed it (\`git log --stat --since=${prev.date}\`).`);

// ------------------------------------------------------------------ the issue
const state = problems.length ? 'FAIL' : (warnN > (prev.warnings ?? Infinity) + 25 ? 'WARN' : 'PASS');
const delta = prev.warnings === undefined ? '' : ` (${warnN - prev.warnings >= 0 ? '+' : ''}${warnN - prev.warnings} since ${prev.date})`;
const body = `Audit of main, built from scratch the way Cloudflare builds it. Last run: ${stamp()}. Overall: **${state}**.

| Check | Result |
|---|---|
| Build | ${build.code === 0 && built ? `passes${build.secs ? ` in ${build.secs} s` : ''}` : '**fails**'} |
| Strict QA | ${qa.code === 0 && built ? 'no hard failures' : '**hard failures**'}; ${warnN} warnings${delta}. ${pagesLine.replace(/^QA: /, '')} |
| Pinterest queue | ${pinsNote.split('\n').join('<br>') || 'not run'} |
| Outside links | ${links.size} checked${online ? '' : ' (this runner has no outside network, so dead hosts are not counted)'}; ${broken.length} broken; ${unsure.length} blocked or unreachable${unsure.length ? ' (listed below, not an alert)' : ''} |
| Packages | ${depNote} |

${problems.length ? `Open problems:\n${problems.map(([k, t]) => `- ${t} (alert key ${k})`).join('\n')}\n` : 'No open problems.\n'}${unsure.length ? `\nOutside links that answered with an error other than 404 (sites often refuse automated checks):\n${unsure.map(([u, r]) => `- ${u}: ${r.note} (on ${where(u)})`).join('\n')}\n` : ''}
The warnings are not failures: they are the refresh and upgrade list for the Refresh task (long sentences, thin answers under a heading, fewer than 8 outbound links). The Refresh task works them down.
<!-- data:${JSON.stringify({ date: today(), warnings: warnN, indexable, totalPages, buildSecs: build.secs || prev.buildSecs || 0 })} -->
`;
console.log(body);
setStatus(TITLE, body);
for (const [k, t, b] of problems) raise(k, t, b);
clear('audit:', active);
if (problems.length) process.exitCode = 1;

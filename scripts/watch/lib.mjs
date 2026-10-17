// Shared helpers for the monitors (scripts/watch/*.mjs and scripts/gsc/export.mjs). Node built-ins only, so a workflow needs no npm install.
//
// Results go to GitHub issues in this repo, never to commits (a commit to main starts a Cloudflare build):
//   - one open issue labeled "monitor" per check, edited in place on every run (the latest result, no notification);
//   - an issue labeled "alert" for each real problem, one per key, opened when it starts and closed when it clears (this one e-mails the owner).
// With no GH_TOKEN, or with --dry-run, nothing is written and the issue text is printed instead.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export const root = new URL('../..', import.meta.url).pathname;
export const config = JSON.parse(readFileSync(join(root, 'seo/watch.config.json'), 'utf8'));
export const args = process.argv.slice(2);
export const has = (f) => args.includes(f);
export const val = (f, d) => { const i = args.indexOf(f); return i > -1 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
export const DRY = has('--dry-run') || !process.env.GH_TOKEN;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const today = () => new Date().toISOString().slice(0, 10);

/** fetch with a timeout and a plain result object; never throws. */
export async function get(url, { ua, method = 'GET', redirect = 'manual', timeout = 20000, headers = {}, body } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  const start = performance.now();
  try {
    const res = await fetch(url, { method, redirect, signal: ctl.signal, body, headers: { 'user-agent': ua || config.live.browserAgent, accept: '*/*', ...headers } });
    const ttfb = Math.round(performance.now() - start);
    const text = method === 'HEAD' ? '' : await res.text();
    return { ok: true, status: res.status, headers: res.headers, body: text, ttfb, ms: Math.round(performance.now() - start), url };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message), url, headers: new Headers(), body: '' };
  } finally { clearTimeout(t); }
}

/** Run fn over items with at most n in flight. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

// ------------------------------------------------------------------ GitHub issues
function gh(a, input) {
  return execFileSync('gh', [...a, '--repo', config.repo], { encoding: 'utf8', input, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
}
const ghJson = (a) => JSON.parse(gh(a) || '[]');
let labelsDone = false;
function ensureLabels() {
  if (labelsDone) return;
  for (const [name, color, desc] of [['monitor', '5319e7', 'Latest result of an automated check, edited in place'], ['alert', 'd73a4a', 'An automated check found a problem']]) {
    try { gh(['label', 'create', name, '--color', color, '--description', desc, '--force']); } catch (e) { console.error(`label ${name}: ${String(e.stderr || e.message).trim()}`); }
  }
  labelsDone = true;
}

/** Write the latest result of a check to its monitor issue (created and pinned the first time). */
export function setStatus(title, body) {
  if (DRY) { console.log(`\n--- monitor issue: ${title} ---\n${body}\n`); return; }
  ensureLabels();
  const found = ghJson(['issue', 'list', '--label', 'monitor', '--state', 'all', '--json', 'number,title,state', '--limit', '100']).find((i) => i.title === title);
  if (found) {
    gh(['issue', 'edit', String(found.number), '--body-file', '-'], body);
    if (found.state === 'CLOSED') gh(['issue', 'reopen', String(found.number)]);
  } else {
    const url = gh(['issue', 'create', '--title', title, '--label', 'monitor', '--body-file', '-'], body).trim();
    try { gh(['issue', 'pin', url.split('/').pop()]); } catch { /* pinning is a convenience */ }
  }
}

/** The current body of a monitor issue (for deltas against the last run), or '' when there is none or no token. */
export function readStatus(title) {
  if (DRY) return '';
  try { return ghJson(['issue', 'list', '--label', 'monitor', '--state', 'all', '--json', 'title,body', '--limit', '100']).find((i) => i.title === title)?.body || ''; } catch { return ''; }
}

const marker = (key) => `<!-- key:${key} -->`;
const openAlerts = () => ghJson(['issue', 'list', '--label', 'alert', '--state', 'open', '--json', 'number,title,body', '--limit', '100']);

/** Open an alert for a problem, or refresh the one already open for the same key. */
export function raise(key, title, body) {
  const text = `${marker(key)}\n${body}\n\nFirst seen ${today()}. This issue closes itself when the check passes again.`;
  if (DRY) { console.log(`\n--- ALERT ${key}: ${title}\n${body}\n`); return; }
  ensureLabels();
  const found = openAlerts().find((i) => (i.body || '').includes(marker(key)));
  if (found) {
    const first = (found.body.match(/First seen (\d{4}-\d{2}-\d{2})/) || [])[1] || today();
    gh(['issue', 'edit', String(found.number), '--body-file', '-'], `${marker(key)}\n${body}\n\nFirst seen ${first}, last seen ${today()}. This issue closes itself when the check passes again.`);
  } else gh(['issue', 'create', '--title', `Alert: ${title}`.slice(0, 120), '--label', 'alert', '--body-file', '-'], text);
}

/** Close the open alerts whose key starts with `prefix` and is not in `stillFailing`. */
export function clear(prefix, stillFailing = new Set()) {
  if (DRY) return;
  for (const i of openAlerts()) {
    const key = (i.body || '').match(/<!-- key:([^ ]+) -->/)?.[1];
    if (key && key.startsWith(prefix) && !stillFailing.has(key)) {
      gh(['issue', 'comment', String(i.number), '--body', `Recovered: the check passed on ${today()}.`]);
      gh(['issue', 'close', String(i.number)]);
    }
  }
}

export const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
export const stamp = () => `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC${process.env.GITHUB_SHA ? `, commit ${process.env.GITHUB_SHA.slice(0, 7)}` : ''}`;

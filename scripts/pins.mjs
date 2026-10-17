#!/usr/bin/env node
// Pinterest pins for Sign of Nine, made from the site's own pages.
//
//   npm run build                                 # candidates are read from the built pages in dist/
//   node scripts/pins.mjs --status                # what is queued, released and pending
//   node scripts/pins.mjs --days-ahead 7          # keep the queue filled to 7 days from today (--per-day 2, --start YYYY-MM-DD, --backfill N)
//   node scripts/pins.mjs --page /angel-numbers/444/            # queue a new or changed page's pins soon (meaning pin, then its first question pin)
//   node scripts/pins.mjs --add --page P --headline H --line L [--style ring|question] [--date D] [--anchor A] [--board B] [--title T] [--description X]
//   node scripts/pins.mjs --render                # draw pictures for pins due now (the build runs this before astro build)
//   node scripts/pins.mjs --check                 # validate the queue, pictures and feeds (the build runs this last)
//   node scripts/pins.mjs --audit                 # draw every possible pin in memory and list those whose text does not fit
//   node scripts/pins.mjs --shift N               # pause: move every pending pin N days later
//
// src/data/pins.json is the queue (one pin per line, sorted by date). A pin is a 1000 x 1500 picture in public/pins/<id>.png
// (generated at build, not committed) with a board, title, description, link and release date. The feeds at /pins/<board>.xml
// list the pins whose date has come (src/pages/pins/[board].xml.js); Pinterest turns each new feed item into a pin.
// Two styles: "ring" (the number in a gold ring, the page's headline and first sentence) and "question" (a question the page
// answers, with the first sentence of the answer). Every pin is made from text that is already on the page.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'node-html-parser';
import sharp from 'sharp';
import { SITE } from '../src/site.mjs';
import { BOARDS, dueItems, pinLink, pinImage, addDays, isoDay } from '../src/lib/pinboards.mjs';
import { root, C, text, fit, measure, wrapLines, starField, star, LOGO_W, LOGO_H, brand } from './lib/render.mjs';

const DIST = join(root, 'dist');
const DATA = join(root, 'src/data/pins.json');
const IMG = join(root, 'public/pins');
const SKIP = join(root, 'scripts/pins-skip.txt');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i > -1 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const TODAY = process.env.PINS_TODAY || isoDay(Date.now());
const NOW = Date.parse(`${TODAY}T12:00:00Z`);

// ---------------------------------------------------------------- the queue file
function loadPins() { return existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : []; }
function savePins(pins) {
  const sorted = [...pins].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? -1 : 1));
  writeFileSync(DATA, sorted.length ? `[\n${sorted.map((p) => '  ' + JSON.stringify(p)).join(',\n')}\n]\n` : '[]\n');
}
const skipIds = () => (existsSync(SKIP) ? new Set(readFileSync(SKIP, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)) : new Set());

// ---------------------------------------------------------------- text helpers
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const hash6 = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 6);
const slugOf = (url) => url.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';
function firstSentence(s) {
  const t = clean(s);
  const m = t.match(/^(.+?[.?!])(\s|$)/);
  return m ? m[1] : t;
}
/** The line under a question: the answer's first sentence, joined with the next when it is only "No." or "Yes." */
function answerLine(a) {
  const sents = clean(a).split(/(?<=[.?!])\s+/);
  let out = sents[0] || '';
  for (let i = 1; out.length < 40 && i < sents.length; i++) out += ` ${sents[i]}`;
  return out;
}
/** Up to `max` characters, ending on a sentence boundary (a pin description is capped at 500 by Pinterest). */
function upTo(s, max) {
  const t = clean(s);
  if (t.length <= max) return t;
  let out = '';
  for (const sent of t.split(/(?<=[.?!])\s+/)) { if ((out + ' ' + sent).trim().length > max) break; out = (out + ' ' + sent).trim(); }
  return out || t.slice(0, max).replace(/\s+\S*$/, '');
}
const LOVE = /\b(love|relationships?|crush|soulmates?|twin|exes?|breakups?|break up|marriage|dating|single|partner|reunion|separation|boyfriend|girlfriend)\b/i;

// ---------------------------------------------------------------- which pages become pins, and where they go
// weight: how early a page is pinned and how many angles it gets (higher goes first). 222 and 444 lead on search volume.
const ANGEL_ORDER = ['222', '444', '333', '555', '111', '1111', '777', '888', '666', '999', '1212'];
function classify(url) {
  let m;
  const mk = (group, board, emblem, eyebrow, label, weight) => ({ group, board, emblem, eyebrow, label, weight });
  if ((m = url.match(/^\/angel-numbers\/(\d+)\/$/))) {
    const rank = ANGEL_ORDER.indexOf(m[1]);
    return rank > -1 ? mk('angel', 'angel-numbers', m[1], 'Angel number', `Angel number ${m[1]}`, 100 - rank * 3) : mk('fourdigit', 'angel-numbers', m[1], 'Angel number', `Angel number ${m[1]}`, 50);
  }
  if ((m = url.match(/^\/angel-numbers\/(\d+)\/([a-z-]+)\/$/))) return mk('modifier', 'love-twin-flame', m[1], 'Angel number', `Angel number ${m[1]}`, 92);
  if ((m = url.match(/^\/angel-numbers\/times\/(\d+)-(\d\d)\/$/))) return mk('time', 'angel-numbers', `${m[1]}:${m[2]}`, 'Clock time', `Clock time ${m[1]}:${m[2]}`, 55);
  if (url === '/angel-numbers/') return mk('hub', 'angel-numbers', null, 'Angel numbers', 'Angel numbers', 85);
  if (url === '/angel-numbers/times/') return mk('hub', 'angel-numbers', null, 'Clock times', 'Clock times', 60);
  if ((m = url.match(/^\/angel-numbers\/(love|twin-flame)\/$/))) return mk('hub', 'love-twin-flame', null, 'Angel numbers', 'Angel numbers', 90);
  if ((m = url.match(/^\/angel-numbers\/([a-z-]+)\/$/))) return mk('hub', 'angel-numbers', null, 'Angel numbers', 'Angel numbers', 80);
  if ((m = url.match(/^\/life-path\/(\d+)\/$/))) return mk('lifepath', 'life-path', m[1], 'Life path', `Life path ${m[1]}`, 75);
  if (url === '/life-path/') return mk('hub', 'life-path', null, 'Life path', 'Life path numbers', 78);
  if (url === '/life-path/calculator/') return mk('tool', 'life-path', null, 'Calculator', 'Life path calculator', 70);
  if ((m = url.match(/^\/compatibility\/(\d+)\/$/))) return mk('compat', 'life-path', m[1], 'Compatibility', `Life path ${m[1]} compatibility`, 60);
  if (url === '/compatibility/') return mk('hub', 'life-path', null, 'Compatibility', 'Life path compatibility', 62);
  if (url === '/compatibility/calculator/') return mk('tool', 'life-path', null, 'Calculator', 'Compatibility calculator', 65);
  if ((m = url.match(/^\/numbers\/(\d+)\/$/))) return mk('number', 'numerology', m[1], 'Number meaning', `Number ${m[1]}`, 60);
  if (url === '/numbers/') return mk('hub', 'numerology', null, 'Number meanings', 'Number meanings', 58);
  const season = TODAY <= '2027-01-31';
  if ((m = url.match(/^\/personal-year\/(\d+)\/$/))) return mk('year', 'numerology-2027', m[1], 'Personal year 2027', `Personal year ${m[1]} in 2027`, season ? 95 : 40);
  if (url === '/personal-year/') return mk('tool', 'numerology-2027', null, 'Personal year', 'Personal year calculator', season ? 90 : 45);
  if ((m = url.match(/^\/birthday-number\/(\d+)\/$/))) return mk('birthday', 'numerology', m[1], 'Birthday number', `Birthday number ${m[1]}`, 40);
  if (url === '/articles/2027-numerology-universal-year-11/') return mk('article', 'numerology-2027', null, 'Numerology 2027', '2027 numerology', season ? 98 : 50);
  if ((m = url.match(/^\/articles\/([a-z0-9-]+)\/$/))) return mk('article', 'numerology', null, 'Numerology guide', 'Numerology guide', 70);
  if (/^\/(expression-number|soul-urge-number|personality-number|birthday-number)\/$/.test(url)) return mk('guide', 'numerology', null, 'Core numbers', 'Core numbers', 65);
  return null;
}

// ---------------------------------------------------------------- read the built pages
function loadPages() {
  if (!existsSync(DIST)) { console.error('No dist/ folder. Run npm run build first.'); process.exit(2); }
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== '_pagefind' && n !== '_astro') walk(p); } else if (n === 'index.html') files.push(p); } };
  walk(DIST);
  const pages = [];
  for (const file of files) {
    const url = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
    const info = classify(url);
    if (!info) continue;
    const html = readFileSync(file, 'utf8');
    const doc = parse(html);
    if (/noindex/i.test(doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '')) continue;
    const title = clean(doc.querySelector('title')?.text).replace(new RegExp(`\\s*\\|\\s*${SITE.name}$`), '');
    const faq = [];
    for (const raw of doc.querySelectorAll('script[type="application/ld+json"]').map((s) => s.text)) {
      try { for (const o of [].concat(JSON.parse(raw))) if (o['@type'] === 'FAQPage') for (const q of o.mainEntity || []) faq.push({ q: clean(q.name), a: clean(q.acceptedAnswer?.text) }); } catch {}
    }
    pages.push({
      url, ...info, html, title,
      h1: clean(doc.querySelector('h1')?.text),
      desc: clean(doc.querySelector('meta[name="description"]')?.getAttribute('content')),
      lead: clean(doc.querySelector('.band__text > p.lead')?.text),
      faq, hasFaqAnchor: /id="faq"/.test(html),
    });
  }
  return pages;
}

// ---------------------------------------------------------------- candidates: the pins a page can give, in order
function boardFor(page, question) {
  if (['angel', 'fourdigit', 'time'].includes(page.group) && LOVE.test(question)) return 'love-twin-flame';
  return page.board;
}
function candidatesFor(page) {
  const slug = slugOf(page.url);
  const out = [];
  const line = [firstSentence(page.lead), firstSentence(page.desc)].find((s) => s && s.length <= 150) || '';
  out.push({
    id: `${slug}-meaning`, board: page.board, page: page.url, anchor: '', style: 'ring', emblem: page.emblem || '', eyebrow: page.eyebrow,
    headline: page.h1, line, title: page.title, description: upTo(page.desc, 500),
    alt: clean(`${page.h1}. ${line}`),
  });
  if (page.hasFaqAnchor) for (const f of page.faq) {
    const ans = answerLine(f.a);
    if (ans.length < 25 || ans.length > 230 || f.q.length > 100) continue;
    out.push({
      id: `${slug}-q-${hash6(f.q)}`, board: boardFor(page, f.q), page: page.url, anchor: 'faq', style: 'question', emblem: '', eyebrow: page.label,
      headline: f.q, line: ans, title: f.q, description: upTo(f.a, 500),
      alt: clean(`${page.label}. ${f.q} ${ans}`),
    });
  }
  return out;
}

// ---------------------------------------------------------------- pictures
/** Wrap to the fewest lines, then narrow the measure until one more line would be needed, so lines are even and no word is left alone. */
function balanced(str, font, size, maxW) {
  const first = wrapLines(str, font, size, maxW);
  if (first.length < 2) return first;
  let best = first;
  for (let w = maxW - 12; w >= maxW * 0.6; w -= 12) {
    const l = wrapLines(str, font, size, w);
    if (l.length > first.length || l.some((x) => measure(font, x, size) > w + 0.5)) break;
    best = l;
  }
  return best;
}
function renderRing({ emblem, eyebrow, headline, line }) {
  const problems = [];
  const ringR = 230, cx = 500, cy = 420;
  const num = emblem ? text(String(emblem), 'display', fit(String(emblem), 'display', ringR * 1.6, 220, 70), cx, cy + 78, { fill: C.gold, anchor: 'middle' }) : '';
  let size = fit(headline, 'display', 1800, 84, 52), lines;
  for (;; size -= 2) { lines = wrapLines(headline, 'display', size, 860); if (lines.length <= 3) break; if (size <= 44) { problems.push(`headline needs ${lines.length} lines`); break; } }
  lines = balanced(headline, 'display', size, 860);
  if (lines.some((l) => measure('display', l, size) > 860)) problems.push('a headline word is wider than the picture');
  const sub = line ? balanced(line, 'sans', 36, 860) : [];
  if (sub.length > 3) problems.push(`line needs ${sub.length} lines`);
  const blockBottom = (ty) => ty + (lines.length - 1) * size * 1.08 + (sub.length ? 92 + (sub.length - 1) * 48 : 0);
  let titleY = 820;
  if (!emblem) {
    // no ring: centre eyebrow, headline and line in the space above the brand line
    const top = (ty) => ty - size - 10 - 20, bottom = (ty) => blockBottom(ty) + 12;
    titleY = 725 - ((top(0) + bottom(0)) / 2) + 0;
  }
  const subStart = titleY + (lines.length - 1) * size * 1.08 + 92;
  const titleSvg = lines.map((l, i) => text(l, 'display', size, 500, titleY + i * size * 1.08, { fill: C.paper, anchor: 'middle' })).join('');
  const subSvg = sub.map((l, i) => text(l, 'sans', 36, 500, subStart + i * 48, { fill: C.muted, anchor: 'middle' })).join('');
  const bottom = subStart + Math.max(0, sub.length - 1) * 48;
  if (bottom > 1300) problems.push('text runs into the brand line');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500"><rect width="1000" height="1500" fill="${C.night}"/>${starField(1000, 1500)}
  ${emblem ? `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${C.gold}" stroke-width="5"/>${num}` : ''}
  ${eyebrow ? text(String(eyebrow).toUpperCase(), 'sansBold', 26, 500, titleY - size - 10, { fill: C.gold, anchor: 'middle' }) : ''}
  ${titleSvg}${subSvg}
  ${footer()}
  </svg>`;
  return { svg, problems };
}
function footer() {
  return `<rect x="440" y="1340" width="120" height="3" fill="${C.gold}"/>
  ${brand(500 - (LOGO_W * 60 / LOGO_H) / 2, 1360, 60)}
  ${text(SITE.url.replace('https://', ''), 'sans', 24, 500, 1450, { fill: C.muted, anchor: 'middle' })}`;
}
function renderQuestion({ eyebrow, headline, line }) {
  const problems = [];
  const maxW = 800;
  let hs = fit(headline, 'display', 2600, 82, 50), hl;
  for (;; hs -= 2) { hl = wrapLines(headline, 'display', hs, maxW); if (hl.length <= 5) break; if (hs <= 50) { problems.push(`question needs ${hl.length} lines`); break; } }
  hl = balanced(headline, 'display', hs, maxW);
  let ls = 46, ll;
  for (;; ls -= 2) { ll = wrapLines(line, 'sans', ls, maxW); if (ll.length <= 8) break; if (ls <= 32) { problems.push(`answer needs ${ll.length} lines`); break; } }
  ll = balanced(line, 'sans', ls, maxW);
  if ([...hl.map((l) => measure('display', l, hs)), ...ll.map((l) => measure('sans', l, ls))].some((w) => w > maxW)) problems.push('a word is wider than the picture');
  const hLH = Math.round(hs * 1.1), lLH = Math.round(ls * 1.42);
  // vertical layout from the top of the block (y = 0): star, eyebrow, question, rule, answer
  const eyeBase = 28 + 64;
  const hBase = eyeBase + 50 + Math.round(hs * 0.75);
  const hLast = hBase + (hl.length - 1) * hLH;
  const ruleY = hLast + 46;
  const lBase = ruleY + 3 + 42 + Math.round(ls * 0.8);
  const lLast = lBase + (ll.length - 1) * lLH;
  const blockH = lLast + Math.round(ls * 0.3);
  if (blockH > 1100) problems.push('block taller than the picture');
  const y0 = 190 + Math.max(0, (1100 - blockH) / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500"><rect width="1000" height="1500" fill="${C.night}"/>${starField(1000, 1500)}
  <rect x="28" y="28" width="944" height="1444" rx="10" fill="none" stroke="${C.gold}" stroke-opacity="0.55" stroke-width="2"/>
  ${star(486, y0, 28)}
  ${text(String(eyebrow).toUpperCase(), 'sansBold', 28, 500, y0 + eyeBase, { fill: C.gold, anchor: 'middle' })}
  ${hl.map((l, i) => text(l, 'display', hs, 500, y0 + hBase + i * hLH, { fill: C.paper, anchor: 'middle' })).join('')}
  <rect x="440" y="${y0 + ruleY}" width="120" height="3" fill="${C.gold}"/>
  ${ll.map((l, i) => text(l, 'sans', ls, 500, y0 + lBase + i * lLH, { fill: C.muted, anchor: 'middle' })).join('')}
  ${footer()}
  </svg>`;
  return { svg, problems };
}
const drawPin = (p) => (p.style === 'question' ? renderQuestion(p) : renderRing(p));

// ---------------------------------------------------------------- pin text lint
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{2664}\u{2666}-\u{27BF}]/u;
function lint(p) {
  const out = [];
  const all = [p.title, p.description, p.headline, p.line, p.alt].join(' ');
  if (/[—–]/.test(all)) out.push('em or en dash');
  if (/!/.test(all)) out.push('exclamation mark');
  if (/\.\.\.|…/.test(all)) out.push('ellipsis');
  if (EMOJI.test(all)) out.push('emoji');
  if (/#\w/.test(all)) out.push('hashtag');
  if (/\s{2,}/.test([p.title, p.description, p.headline, p.line].join('|'))) out.push('double space');
  if (!p.title || p.title.length > 100) out.push(`title ${p.title ? p.title.length : 0} chars (1 to 100)`);
  if (!p.description || p.description.length > 500) out.push(`description ${p.description ? p.description.length : 0} chars (1 to 500)`);
  if (!p.alt || p.alt.length > 500) out.push('alt text missing or over 500');
  if (!p.headline) out.push('no headline');
  if (!BOARDS[p.board]) out.push(`unknown board ${p.board}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) out.push('bad date');
  return out;
}

// ---------------------------------------------------------------- scheduling
const pageOf = (id) => id.replace(/-(meaning|q-[0-9a-f]{6}|x-[0-9a-f]{6})$/, '');
function pickNext(cands, ctx, date, taken) {
  let best = null, bestScore = -Infinity;
  for (const [pageUrl, list] of cands) {
    const c = list[0]; // each page offers only its next pin, so a page's meaning pin always comes first
    if (!c) continue;
    const used = ctx.count.get(pageUrl) || 0;
    let score = c.weight - 30 * used;
    const last = ctx.lastDate.get(pageUrl);
    if (last && Date.parse(date) - Date.parse(last) < 6 * 86400000) score -= 1000; // the same page is not pinned twice within 6 days
    if (taken.some((t) => t.board === c.board)) score -= 25; // spread boards within a day
    if (!ctx.boardRecent(c.board, date)) score += 40; // a board with nothing in the last 7 days goes next
    if (score > bestScore) { bestScore = score; best = [pageUrl, c]; }
  }
  return best && bestScore > -500 ? best : null;
}
function fillQueue({ pins, daysAhead, perDay, startDate, backfill }) {
  const pages = loadPages();
  const skip = skipIds();
  const have = new Set(pins.map((p) => p.id));
  const cands = new Map();
  const dropped = [];
  for (const page of pages) {
    const list = [];
    for (const c of candidatesFor(page)) {
      if (have.has(c.id) || skip.has(c.id)) continue;
      const r = drawPin(c);
      const bad = [...r.problems, ...lint({ ...c, date: TODAY })];
      if (bad.length) { dropped.push(`${c.id}: ${bad.join('; ')}`); continue; }
      list.push({ ...c, weight: page.weight });
    }
    if (list.length) cands.set(page.url, list);
  }
  const count = new Map(), lastDate = new Map();
  for (const p of pins) { count.set(p.page, (count.get(p.page) || 0) + 1); if (!lastDate.get(p.page) || p.date > lastDate.get(p.page)) lastDate.set(p.page, p.date); }
  const added = [];
  const boardRecent = (board, date) => [...pins, ...added].some((p) => p.board === board && p.date <= date && p.date >= addDays(date, -7));
  const horizon = addDays(TODAY, daysAhead);
  const lastQueued = pins.reduce((m, p) => (p.date > m ? p.date : m), '');
  let d = lastQueued ? addDays(lastQueued, 1) : startDate || addDays(TODAY, -backfill);
  if (d > horizon && !has('--force')) { return { added, dropped, note: `queue already runs to ${lastQueued}` }; }
  const ctx = { count, lastDate, boardRecent };
  for (; d <= horizon; d = addDays(d, 1)) {
    const taken = [];
    for (let k = 0; k < perDay; k++) {
      const pick = pickNext(cands, ctx, d, taken);
      if (!pick) break;
      const [pageUrl, c] = pick;
      cands.get(pageUrl).shift();
      const { weight, ...pin } = c;
      pin.date = d;
      added.push(pin); taken.push(pin);
      count.set(pageUrl, (count.get(pageUrl) || 0) + 1); lastDate.set(pageUrl, d);
    }
  }
  return { added, dropped };
}
/** Queue one page's pins soon: its meaning pin on the first open day from tomorrow, its first question pin three days later. */
function queuePage(pins, url, perDay) {
  const pages = loadPages().filter((p) => p.url === url);
  if (!pages.length) { console.error(`No built, indexable page ${url} that becomes pins.`); process.exit(2); }
  const have = new Set(pins.map((p) => p.id));
  const skip = skipIds();
  const list = candidatesFor(pages[0]).filter((c) => !have.has(c.id) && !skip.has(c.id)).filter((c) => { const r = drawPin(c); const bad = [...r.problems, ...lint({ ...c, date: TODAY })]; if (bad.length) console.log(`  dropped ${c.id}: ${bad.join('; ')}`); return !bad.length; });
  const added = [];
  const perDayCount = (d) => [...pins, ...added].filter((p) => p.date === d).length;
  let d = addDays(TODAY, 1);
  for (const c of list.slice(0, 2)) {
    while (perDayCount(d) >= perDay + 1) d = addDays(d, 1);
    added.push({ ...c, date: d });
    d = addDays(d, 3);
  }
  return added;
}

// ---------------------------------------------------------------- commands
async function png(svg, file) { await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(file); }

function renderSet(pins) {
  const ids = new Set();
  for (const p of pins) if (p.date >= addDays(TODAY, -8) && p.date <= addDays(TODAY, 8)) ids.add(p.id);
  for (const b of Object.keys(BOARDS)) for (const p of dueItems(pins, b, NOW)) ids.add(p.id);
  return pins.filter((p) => ids.has(p.id));
}

async function cmdRender() {
  const pins = loadPins();
  mkdirSync(IMG, { recursive: true });
  for (const f of readdirSync(IMG)) if (f.endsWith('.png')) rmSync(join(IMG, f));
  const set = renderSet(pins);
  let bad = 0;
  for (const p of set) {
    const r = drawPin(p);
    if (r.problems.length) { console.error(`pin ${p.id}: ${r.problems.join('; ')}`); bad++; continue; }
    await png(r.svg, join(IMG, `${p.id}.png`));
  }
  console.log(`Pins: drew ${set.length - bad} pictures (${pins.length} queued).`);
  if (bad) process.exit(1);
}

async function cmdCheck() {
  const pins = loadPins();
  const fails = [], warns = [];
  const ids = new Set();
  const pageCache = new Map();
  const htmlOf = (url) => { if (!pageCache.has(url)) { const f = join(DIST, url, 'index.html'); pageCache.set(url, existsSync(f) ? readFileSync(f, 'utf8') : null); } return pageCache.get(url); };
  const perDay = new Map();
  for (const p of pins) {
    const F = (m) => fails.push(`${p.id} ${m}`);
    if (ids.has(p.id)) F('duplicate id'); ids.add(p.id);
    for (const l of lint(p)) F(l);
    if (!['ring', 'question'].includes(p.style)) F(`unknown style ${p.style}`);
    const html = htmlOf(p.page);
    if (!html) F(`page ${p.page} is not built`);
    else {
      if (/name="robots" content="noindex/.test(html)) F(`page ${p.page} is noindex`);
      if (p.anchor && !new RegExp(`id="${p.anchor}"`).test(html)) F(`anchor #${p.anchor} not found on ${p.page}`);
    }
    perDay.set(p.date, (perDay.get(p.date) || 0) + 1);
  }
  for (const [d, n] of perDay) if (n > 3) fails.push(`${d}: ${n} pins on one day (limit 3)`);
  const seen = new Map();
  for (const p of pins) { const k = `${p.page}|${p.headline}`; if (seen.has(k)) fails.push(`${p.id} repeats the pin ${seen.get(k)}`); else seen.set(k, p.id); }
  // pictures for what is due, and the feeds in dist
  for (const p of renderSet(pins)) {
    const f = join(IMG, `${p.id}.png`);
    if (!existsSync(f)) { fails.push(`${p.id} picture missing in public/pins`); continue; }
    const m = await sharp(f).metadata();
    if (m.width !== 1000 || m.height !== 1500) fails.push(`${p.id} picture is ${m.width}x${m.height}, want 1000x1500`);
  }
  for (const b of Object.keys(BOARDS)) {
    const feed = join(DIST, 'pins', `${b}.xml`);
    if (!existsSync(feed)) { fails.push(`feed /pins/${b}.xml missing from dist`); continue; }
    const xml = readFileSync(feed, 'utf8');
    if (!xml.startsWith('<?xml') || !xml.includes('</rss>')) fails.push(`feed ${b} is not complete RSS`);
    const guids = [...xml.matchAll(/<guid[^>]*>signofnine-pin-([^<]+)<\/guid>/g)].map((m) => m[1]);
    const want = dueItems(pins, b, NOW).map((p) => p.id);
    const wantYesterday = dueItems(pins, b, NOW - 86400000).map((p) => p.id); // a build that straddles midnight UTC wrote the feed for the day before
    if (guids.join() !== want.join() && guids.join() !== wantYesterday.join()) fails.push(`feed ${b} lists [${guids.join(', ')}], expected [${want.join(', ')}]`);
    for (const m of xml.matchAll(/<enclosure url="https:\/\/[^/]+(\/pins\/[^"]+)"/g)) if (!existsSync(join(DIST, m[1]))) fails.push(`feed ${b} points at ${m[1]} which is not in dist`);
  }
  const due = pins.filter((p) => p.date <= TODAY).length;
  console.log(`Pins check: ${pins.length} queued, ${due} released, ${pins.length - due} pending, ${fails.length} problems.`);
  for (const w of warns) console.log('  warn', w);
  for (const f of fails) console.log('  FAIL', f);
  if (fails.length) process.exit(1);
}

function cmdStatus(pins) {
  const due = pins.filter((p) => p.date <= TODAY), pending = pins.filter((p) => p.date > TODAY);
  const last = pins.reduce((m, p) => (p.date > m ? p.date : m), '');
  console.log(`Pins: ${pins.length} queued; ${due.length} released; ${pending.length} pending; queue runs to ${last || 'nothing'} (today ${TODAY}).`);
  for (const b of Object.keys(BOARDS)) {
    const mine = pins.filter((p) => p.board === b);
    const lastDue = mine.filter((p) => p.date <= TODAY).map((p) => p.date).sort().pop();
    console.log(`  ${b.padEnd(16)} ${String(mine.length).padStart(3)} queued, ${String(mine.filter((p) => p.date <= TODAY).length).padStart(3)} released, latest released ${lastDue || 'none'}`);
  }
  const next = pending.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 8);
  if (next.length) console.log('Next:\n' + next.map((p) => `  ${p.date} ${p.board.padEnd(16)} ${p.headline}`).join('\n'));
  const pageCounts = new Map();
  for (const p of pins) pageCounts.set(p.page, (pageCounts.get(p.page) || 0) + 1);
  console.log(`Pages pinned: ${pageCounts.size}.`);
}

async function cmdAudit() {
  const pages = loadPages();
  const skip = skipIds();
  let total = 0, bad = 0;
  for (const page of pages) for (const c of candidatesFor(page)) {
    total++;
    const r = drawPin(c);
    const issues = [...r.problems, ...lint({ ...c, date: TODAY })];
    if (issues.length) { bad++; console.log(`  ${skip.has(c.id) ? '(skipped) ' : ''}${c.id}: ${issues.join('; ')}`); }
  }
  // candidates that were never made because the answer line was too long or too short
  let notMade = 0;
  for (const page of pages) if (page.hasFaqAnchor) for (const f of page.faq) { const a = answerLine(f.a); if (a.length < 25 || a.length > 230 || f.q.length > 100) { notMade++; console.log(`  no pin for "${f.q}" on ${page.url}: first answer sentence is ${a.length} characters`); } }
  console.log(`Audit: ${pages.length} pages, ${total} possible pins, ${bad} do not fit or fail the lint, ${notMade} questions without a usable first sentence.`);
}

function cmdAdd(pins) {
  const page = val('--page'), headline = val('--headline'), line = val('--line');
  if (!page || !headline) { console.error('--add needs --page and --headline (and usually --line)'); process.exit(2); }
  const info = classify(page) || { board: 'numerology', emblem: null, eyebrow: 'Numerology', label: 'Numerology' };
  const style = val('--style', 'question');
  const board = val('--board', info.board);
  const p = {
    id: `${slugOf(page)}-x-${hash6(headline)}`, board, date: val('--date', addDays(TODAY, 1)), page, anchor: val('--anchor', ''), style,
    emblem: style === 'ring' ? (val('--emblem', info.emblem || '')) : '', eyebrow: style === 'ring' ? val('--eyebrow', info.eyebrow) : val('--eyebrow', info.label),
    headline, line: line || '', title: val('--title', headline), description: val('--description', line || headline), alt: clean(`${headline}. ${line || ''}`),
  };
  const r = drawPin(p);
  const bad = [...r.problems, ...lint(p)];
  if (bad.length) { console.error(`Not added: ${bad.join('; ')}`); process.exit(1); }
  if (pins.some((x) => x.id === p.id)) { console.error('Already queued.'); process.exit(1); }
  pins.push(p);
  return p;
}

async function cmdPreview(dir) {
  mkdirSync(dir, { recursive: true });
  const want = (val('--urls', '') || '/angel-numbers/222/,/angel-numbers/1111/,/life-path/7/,/personal-year/7/,/articles/is-numerology-real/,/angel-numbers/love/').split(',');
  let n = 0;
  for (const page of loadPages().filter((p) => want.includes(p.url))) for (const c of candidatesFor(page).slice(0, 3)) {
    const r = drawPin(c);
    await png(r.svg, join(dir, `${c.id}.png`));
    console.log(`${c.id}${r.problems.length ? '  PROBLEMS: ' + r.problems.join('; ') : ''}`);
    n++;
  }
  console.log(`Previewed ${n} pins in ${dir}`);
}

// ---------------------------------------------------------------- main
const pins = loadPins();
if (has('--preview')) await cmdPreview(val('--preview'));
else if (has('--render')) await cmdRender();
else if (has('--check')) await cmdCheck();
else if (has('--audit')) await cmdAudit();
else if (has('--status')) cmdStatus(pins);
else if (has('--shift')) {
  const n = Number(val('--shift', 0));
  let moved = 0;
  for (const p of pins) if (p.date > TODAY) { p.date = addDays(p.date, n); moved++; }
  savePins(pins);
  console.log(`Moved ${moved} pending pins ${n} days later.`);
} else if (has('--add')) {
  const p = cmdAdd(pins);
  savePins(pins);
  console.log(`Added ${p.id} for ${p.date} on ${p.board}.`);
} else if (has('--page')) {
  const perDay = Number(val('--per-day', 2));
  const added = queuePage(pins, val('--page'), perDay);
  savePins([...pins, ...added]);
  for (const a of added) console.log(`  ${a.date} ${a.board.padEnd(16)} ${a.headline}`);
  console.log(`Queued ${added.length} pins for ${val('--page')}.`);
} else if (has('--days-ahead')) {
  const perDay = Number(val('--per-day', 2));
  const { added, dropped, note } = fillQueue({ pins, daysAhead: Number(val('--days-ahead', 7)), perDay, startDate: val('--start'), backfill: Number(val('--backfill', 0)) });
  savePins([...pins, ...added]);
  for (const a of added) console.log(`  ${a.date} ${a.board.padEnd(16)} ${a.headline}`);
  if (dropped.length) console.log(`Dropped ${dropped.length} candidates that do not fit:\n${dropped.map((d) => '  ' + d).join('\n')}`);
  console.log(note ? `Nothing added: ${note}.` : `Queued ${added.length} pins.`);
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 20).map((l) => l.slice(3)).join('\n'));
}

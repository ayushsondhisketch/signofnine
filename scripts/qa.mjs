// Build-time QA for Sign of Nine. Runs over dist/ after the Astro build and before the site ships.
// Hard failures exit non-zero so a bad page never deploys. Everything else is reported with counts.
//   node scripts/qa.mjs            hard rules fail the build, mechanical rules are reported
//   node scripts/qa.mjs --strict   mechanical rules fail the build too
//   node scripts/qa.mjs --page /angel-numbers/555/   print the full report for one page
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';

const DIST = 'dist';
const STRICT = process.argv.includes('--strict');
const ONE = (() => { const i = process.argv.indexOf('--page'); return i > -1 ? process.argv[i + 1] : null; })();

// ---------- the blocklist (checklist section 6). Whole words, case-insensitive. ----------
const G1_WORDS = ['delve', 'delves', 'delving', 'tapestry', 'testament', 'unlock', 'unlocks', 'unlocking', 'unleash', 'unleashes', 'unleashing', 'embark', 'embarks', 'embarking', 'realm', 'realms',
  'elevate', 'elevates', 'elevating', 'empower', 'empowers', 'empowering', 'harness', 'harnessing', 'leverage', 'leveraging', 'foster', 'fosters', 'fostering', 'resonate', 'resonates', 'resonating',
  'vibrant', 'profound', 'profoundly', 'pivotal', 'robust', 'seamless', 'seamlessly', 'holistic', 'transformative', 'multifaceted', 'nuanced', 'intricate', 'symphony', 'beacon',
  'genuinely', 'honestly', 'truly', 'incredibly', 'amazing', 'journey', 'journeys'];
// metaphor words that are fine in a literal sense: flagged for review rather than failed
const G1_REVIEW = ['landscape', 'navigate', 'navigating', 'whisper', 'whispers', 'dance', 'dances', 'embrace', 'embraces', 'embracing', 'beautiful', 'powerful'];
const G2_PHRASES = ["it's important to note", 'it is important to note', "it's worth noting", 'it is worth noting', 'keep in mind', 'remember that', 'needless to say', 'simply put', "in today's world", 'in the realm of',
  'ever-evolving', 'at the end of the day', 'in conclusion', 'in summary', 'overall,', 'ultimately', "let's dive in", "let's explore", "here's the thing", 'the truth is', 'in essence', 'the key is',
  'this means that', 'serves as a reminder', 'gentle reminder', 'a powerful sign', 'a powerful message', 'the universe has your back', 'trust the process', 'everything happens for a reason',
  'you are exactly where you need to be', 'stay positive', 'high vibrational', 'spiritual journey', 'your angels want you to', 'the angelic realm'];
// niche clichés: allowed only inside an attributed reading
const G3_PHRASES = ['the universe is telling you', 'the angels are sending', 'a message from your guardian angels', 'divine guidance', 'cosmic sign', 'sacred number', 'vibration', 'vibrations', 'vibrational',
  'align with your higher self', 'manifest your desires', 'spiritual awakening', 'energy of the number', "number's energy", 'frequency of'];
const ATTRIBUTION = /\b(tradition|numerolog\w*|practitioners?|writers?|reads?|read as|called|books?|virtue|sources?|readers?)\b/i;
const SHAPES = [
  { name: 'not just X but Y', rx: /\bnot just\b[^.]{0,80}\bbut\b/i },
  { name: "isn't just", rx: /\b(isn't|is not|aren't|are not) just\b/i },
  { name: "whether you're", rx: /\bwhether you('re| are)\b/i },
  { name: 'stacked hedge', rx: /\b(may|might|could) (potentially|possibly|perhaps)\b/i },
  { name: 'some believe / it is said', rx: /\b(some believe|it is said|it's said|many believe)\b/i },
  { name: 'exclamation', rx: /!(?!\])/ },
  { name: 'ellipsis', rx: /\.\.\.|…/ },
  { name: 'dear reader', rx: /\b(dear reader|dear seekers|fellow seekers|dear friends)\b/i },
];
const PLACEHOLDERS = /\[(TODO|TK|INSERT|PLACEHOLDER)[^\]]*\]|\bTODO\b|\bTK\b|lorem ipsum|\{\{|\}\}|XXX/;

// ---------- helpers ----------
const walk = (dir, out = []) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else if (f === 'index.html' || f === '404.html') out.push(p); } return out; };
const urlOf = (file) => '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
const text = (node) => (node ? node.structuredText || node.text || '' : '').replace(/\s+/g, ' ').trim();
const words = (s) => s.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
function sentences(s) {
  // split on . ! ? followed by space + capital/quote/digit; keep abbreviations like "e.g." roughly intact
  const parts = s.replace(/([.!?])\s+(?=[A-Z0-9"'(])/g, '$1\u0000').split('\u0000').map((x) => x.trim()).filter(Boolean);
  return parts.filter((p) => words(p).length > 0);
}
function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
function flesch(sents) {
  const ws = sents.flatMap((s) => words(s));
  if (!ws.length) return 100;
  const syl = ws.reduce((a, w) => a + syllables(w), 0);
  return 206.835 - 1.015 * (ws.length / sents.length) - 84.6 * (syl / ws.length);
}
const IRREG = new Set(['been', 'done', 'gone', 'seen', 'taken', 'given', 'made', 'known', 'shown', 'told', 'said', 'built', 'kept', 'left', 'held', 'found', 'put', 'set', 'meant', 'thought', 'brought', 'caught', 'taught', 'bought', 'sought', 'written', 'spoken', 'broken', 'chosen', 'driven', 'eaten', 'fallen', 'forgotten', 'hidden', 'lost', 'paid', 'sold', 'sent', 'spent', 'struck', 'worn', 'won', 'drawn', 'begun', 'cut', 'hit', 'let', 'run', 'born', 'understood', 'felt', 'heard', 'led', 'met', 'laid', 'lit', 'hung', 'sung', 'swung', 'fed', 'bred', 'shot', 'sat', 'stood', 'had']);
function isPassive(sent) {
  const toks = sent.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length - 1; i++) {
    if (['is', 'are', 'was', 'were', 'be', 'been', 'being', 'am'].includes(toks[i])) {
      for (let j = i + 1; j <= Math.min(i + 2, toks.length - 1); j++) {
        const t = toks[j];
        if (['not', 'often', 'also', 'usually', 'always', 'never', 'still', 'then', 'sometimes', 'rarely', 'already'].includes(t)) continue;
        if (['called', 'described', 'listed', 'named', 'associated', 'attached', 'credited', 'reported', 'told', 'advised', 'born', 'read', 'kept', 'reduced'].includes(t)) return false; // attribution and arithmetic devices, not passives worth counting
        if ((t.endsWith('ed') && t.length > 4) || IRREG.has(t)) return true;
        break;
      }
    }
  }
  return false;
}
function shingles(s, n = 8) {
  const w = s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

// ---------- load the site ----------
const files = walk(DIST).filter((f) => !f.endsWith('404.html'));
const pages = [];
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const root = parse(html);
  const url = urlOf(file);
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
  const noindex = /noindex/i.test(robots);
  const main = root.querySelector('main') || root;
  const article = main.querySelector('article.panel') || main;
  const proses = article.querySelectorAll('.prose');
  const body = proses[0] || null;
  const lead = main.querySelector('.band__text > p, .hero p, .band p');
  const paras = body ? body.querySelectorAll('p, li').map((p) => text(p)).filter((t) => words(t).length > 2) : [];
  const bodyText = paras.join(' ');
  const h1s = root.querySelectorAll('h1');
  const h2s = main.querySelectorAll('h2').map((h) => text(h));
  const title = text(root.querySelector('title'));
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const links = main.querySelectorAll('a[href]').map((a) => a.getAttribute('href'));
  const bodyLinks = article.querySelectorAll('a[href]').map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/'));
  const imgs = root.querySelectorAll('img');
  const ld = root.querySelectorAll('script[type="application/ld+json"]').map((s) => s.text);
  const inSitemap = null; // filled later
  pages.push({ url, file, html, root, main, article, body, paras, bodyText, lead: text(lead), h1s, h2s, title, desc, links, bodyLinks, imgs, ld, noindex, size: Buffer.byteLength(html) });
}
const byUrl = new Map(pages.map((p) => [p.url, p]));
const indexable = pages.filter((p) => !p.noindex);

// sitemaps
const sitemapUrls = new Set();
const smDir = join(DIST, 'sitemaps');
if (existsSync(smDir)) for (const f of readdirSync(smDir)) for (const m of readFileSync(join(smDir, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) { try { sitemapUrls.add(new URL(m[1]).pathname); } catch {} }

// inbound counts (from main content links only, not nav/footer)
const inbound = new Map(pages.map((p) => [p.url, 0]));      // from article content only
const inboundAll = new Map(pages.map((p) => [p.url, 0]));   // from anywhere on the page
for (const p of pages) {
  const seen = new Set(), seenAll = new Set();
  for (const h of p.article.querySelectorAll('a[href]').map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/'))) {
    const u = h.split('#')[0].split('?')[0];
    if (u !== p.url && byUrl.has(u) && !seen.has(u)) { seen.add(u); inbound.set(u, (inbound.get(u) || 0) + 1); }
  }
  for (const h of p.root.querySelectorAll('a[href]').map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/'))) {
    const u = h.split('#')[0].split('?')[0];
    if (u !== p.url && byUrl.has(u) && !seenAll.has(u)) { seenAll.add(u); inboundAll.set(u, (inboundAll.get(u) || 0) + 1); }
  }
}

// ---------- per-page checks ----------
const hard = [];   // build-breaking
const soft = [];   // reported
const counts = {};
const bump = (k) => (counts[k] = (counts[k] || 0) + 1);
const kinds = (url) => url.startsWith('/angel-numbers/times/') ? 'time' : /^\/angel-numbers\/\d{4}\/$/.test(url) ? 'fourdigit' : url.startsWith('/birthday-number/') && url !== '/birthday-number/' ? 'birthday' : 'editorial';

const fileExists = (href) => {
  const u = href.split('#')[0].split('?')[0];
  if (byUrl.has(u)) return true;
  const p = join(DIST, u);
  return existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
};

for (const p of pages) {
  const H = (msg) => hard.push(`${p.url} ${msg}`);
  const S = (msg) => soft.push(`${p.url} ${msg}`);
  const whole = text(p.main);
  const lower = whole.toLowerCase();

  // head
  if (!p.title) H('missing <title>');
  if (p.title.length > 60) H(`title ${p.title.length} chars`);
  if (!p.desc) H('missing meta description'); else if (p.desc.length > 140) H(`description ${p.desc.length} chars`);
  if (p.h1s.length !== 1) H(`${p.h1s.length} h1 elements`);
  if (/[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+ [A-Z]/.test(text(p.h1s[0]) || '') && !/^[0-9]/.test(text(p.h1s[0]))) S('h1 looks title-cased');
  for (const h of p.h2s) if (/^(Conclusion|Final thoughts|Key takeaways|Summary)/i.test(h)) H(`forbidden section "${h}"`);

  // typography
  if (whole.includes('—') || whole.includes('–')) H('em or en dash in content');
  const semis = (p.bodyText.match(/;/g) || []).length;
  if (semis > 1) S(`${semis} semicolons in body`), bump('semicolons>1');
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{2664}\u{2666}-\u{27BF}]/u.test(whole)) H('emoji in content');
  if (PLACEHOLDERS.test(whole)) H('placeholder text');

  // blocklist on body + lead + in short + faq (everything in main except nav/breadcrumb)
  const scan = (text(p.article) + ' ' + p.lead).toLowerCase();
  for (const w of G1_WORDS) { const rx = new RegExp(`\\b${w}\\b`, 'i'); if (rx.test(scan)) H(`blocklist word "${w}"`); }
  for (const w of G1_REVIEW) { const rx = new RegExp(`\\b${w}\\b`, 'gi'); const m = scan.match(rx); if (m) S(`review metaphor word "${w}" x${m.length}`), bump('metaphor-review'); }
  for (const ph of G2_PHRASES) if (scan.includes(ph)) H(`blocklist phrase "${ph}"`);
  for (const ph of G3_PHRASES) {
    const rx = new RegExp(`\\b${ph.replace(/'/g, "'")}\\b`, 'gi');
    for (const s of sentences(text(p.article) + ' ' + p.lead)) {
      if (rx.test(s.toLowerCase()) && !/frequency illusion/i.test(s)) { if (!ATTRIBUTION.test(s)) H(`cliché outside attributed reading "${ph}": ${s.slice(0, 90)}`); else S(`attributed cliché "${ph}"`); }
    }
  }
  let shapeHits = 0;
  const bodySents = p.paras.flatMap((t) => sentences(t));
  for (const sh of SHAPES) { if (sh.rx.test(p.bodyText)) { shapeHits++; S(`shape: ${sh.name}`); bump('shape:' + sh.name); } }
  const questions = bodySents.filter((s) => s.trim().endsWith('?'));
  if (questions.length) { shapeHits += questions.length; S(`${questions.length} question sentence(s) in body: ${questions[0].slice(0, 80)}`); bump('body-question'); }
  const thisNumber = bodySents.filter((s) => /^This (angel )?number\b/.test(s)).length;
  if (thisNumber > 1) { shapeHits++; S(`"This number" opens ${thisNumber} sentences`); }
  if (semis > 1) shapeHits++;
  if (/\b(we|We|we're|We're|we've|our|Our|us)\b/.test(p.bodyText.replace(/"[^"]*"/g, '')) && !/^\/(about|editorial-approach|contact|privacy-policy|terms-of-use|disclaimer|advertising-disclosure)\//.test(p.url)) { shapeHits++; S('first person plural in body'); bump('we'); }
  if (shapeHits >= 2) (STRICT ? H : S)(`${shapeHits} hits from the sentence-shape, punctuation and voice groups`), bump('shape>=2');

  // mechanical
  if (bodySents.length) {
    const avg = bodySents.reduce((a, s) => a + words(s).length, 0) / bodySents.length;
    const long = bodySents.filter((s) => words(s).length > 30);
    const passive = bodySents.filter(isPassive).length / bodySents.length;
    const fl = flesch(bodySents);
    const longParas = p.paras.filter((t) => sentences(t).length > 3).length;
    let sameOpen = 0;
    if (p.body) for (const sec of [p.body, ...p.body.querySelectorAll('section')]) {
      const ps = sec.querySelectorAll(':scope > p').map((x) => text(x)).filter((t) => words(t).length > 2);
      for (let i = 1; i < ps.length; i++) { const a = words(ps[i - 1])[0]?.toLowerCase(), b = words(ps[i])[0]?.toLowerCase(); if (a && a === b && a.length > 2) sameOpen++; }
    }
    // Calibrated limits (checklist section 6): the hard limit fails the build, the target is reported.
    const over40 = bodySents.filter((s) => words(s).length > 40);
    const veryLongParas = p.paras.filter((t) => { const ss = sentences(t); return ss.length > 5 && ss.reduce((a, x) => a + words(x).length, 0) / ss.length >= 9; }).length;
    if (avg >= 22) H(`avg sentence ${avg.toFixed(1)} words (limit 22)`); else if (avg >= 18) S(`avg sentence ${avg.toFixed(1)} words (target under 18)`), bump('avg>=18');
    if (over40.length) H(`${over40.length} sentence(s) over 40 words: ${over40[0].slice(0, 100)}`), bump('over40'), (counts.over40Total = (counts.over40Total || 0) + over40.length);
    else if (long.length) S(`${long.length} sentence(s) over 30 words`), bump('long-sentences'), (counts.longTotal = (counts.longTotal || 0) + long.length);
    const fixedPage = /^\/(about|editorial-approach|contact|privacy-policy|terms-of-use|disclaimer|advertising-disclosure)\/$/.test(p.url);
    if (!fixedPage && bodySents.length >= 15) { if (passive >= 0.30) H(`passive ${(passive * 100).toFixed(0)}% (limit 30%)`); else if (passive >= 0.15) S(`passive ${(passive * 100).toFixed(0)}% (target under 15%)`), bump('passive>=15'); }
    if (fl < 55 && !/^\/(privacy-policy|terms-of-use|disclaimer|advertising-disclosure)\/$/.test(p.url)) H(`Flesch ${fl.toFixed(0)} (limit 55)`); else if (fl < 60) S(`Flesch ${fl.toFixed(0)} (target 60)`), bump('flesch<60');
    if (veryLongParas) H(`${veryLongParas} paragraph(s) over 5 sentences`), bump('paras>5');
    else if (longParas) S(`${longParas} paragraph(s) over 3 sentences`), bump('long-paras'), (counts.longParaTotal = (counts.longParaTotal || 0) + longParas);
    if (sameOpen) S(`${sameOpen} consecutive paragraph(s) open with the same word`), bump('same-opener');
    const M = S;
    p.stats = { avg, long: long.length, longest: Math.max(...bodySents.map((s) => words(s).length)), over40: bodySents.filter((s) => words(s).length > 40).length, passive, fl, longParas, sameOpen, sents: bodySents.length, words: words(p.bodyText).length, longSents: long.map((s) => s.slice(0, 160)) };
    // primary term density: the number or first title noun phrase
    const tm = p.title.match(/^(\d+(?::\d+)? Angel Number|Life Path \d+|Personal Year \d+|Born on the \d+(?:st|nd|rd|th)|\d+(?::\d+)? Meaning|Number \d+)/i);
    if (tm) {
      const term = tm[1].replace(/ Meaning$/i, '');
      const n = (p.bodyText.toLowerCase().match(new RegExp(term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const d = (n * words(term).length) / Math.max(1, words(p.bodyText).length);
      const limit = kinds(p.url) === 'editorial' ? 0.025 : 0.03;
      if (d > limit) S(`primary term "${term}" density ${(d * 100).toFixed(1)}% (limit ${limit * 100}%)`), bump('density');
    }
  }

  // headings answered
  if (p.body) {
    for (const sec of p.body.querySelectorAll('section')) {
      const h = sec.querySelector('h2'); if (!h) continue;
      const first = sec.querySelector('p, li');
      if (!first || words(text(first)).length < 6) (STRICT ? H : S)(`h2 "${text(h)}" not followed by an answering sentence`);
    }
  }

  // links
  for (const h of p.links) { if (h.startsWith('/') && !fileExists(h)) H(`broken internal link ${h}`); if (/^https?:\/\/(www\.)?signofnine\.com/.test(h)) S(`absolute self link ${h}`); }
  const outUnique = new Set(p.bodyLinks.map((h) => h.split('#')[0]).filter((u) => u !== p.url)).size;
  if (!p.noindex && p.body && outUnique < 8) (STRICT ? H : S)(`${outUnique} outbound internal links in body (need 8)`), bump('out<8');
  if (!p.noindex && (inboundAll.get(p.url) || 0) < 3) H(`${inboundAll.get(p.url) || 0} inbound links site-wide (need 3)`);
  else if (!p.noindex && (inbound.get(p.url) || 0) < 3 && !/^\/(about|editorial-approach|contact|privacy-policy|terms-of-use|disclaimer|advertising-disclosure)\/$/.test(p.url)) S(`${inbound.get(p.url) || 0} inbound content links (want 3)`), bump('in<3');

  // In short box: under 100 words (target), hard at 140
  const inshort = p.article.querySelector('.inshort');
  if (inshort) { const n = words(text(inshort).replace(/^In short/, '')).length; if (n > 140) H(`In short box ${n} words (limit 140)`); else if (n > 100) S(`In short box ${n} words (target under 100)`), bump('inshort>100'); }
  // H2 answers: first paragraph 40 to 60 words is the target
  if (p.body) for (const sec of p.body.querySelectorAll('section')) { const h = sec.querySelector('h2'); const first = sec.querySelector(':scope > p'); if (h && first) { const n = words(text(first)).length; if (n < 25 || n > 90) S(`h2 "${text(h)}" answered in ${n} words (target 40 to 60)`), bump('h2-answer-length'); } }
  // every angel-number number page carries the honest paragraph and the arithmetic
  if (/^\/angel-numbers\/(\d+|times\/[0-9-]+)\/$/.test(p.url)) {
    if (!/frequency illusion/i.test(p.bodyText)) H('angel number page without the frequency-illusion paragraph');
    if (!/→|= \d/.test(text(p.article))) H('angel number page without the arithmetic line');
  }
  // JSON-LD types
  if (!p.noindex && p.ld.length) {
    const types = new Set(); let article = null;
    for (const raw of p.ld) { try { const j = JSON.parse(raw); for (const o of [].concat(j['@graph'] || j)) { types.add(o['@type']); if (o['@type'] === 'Article') article = o; } } catch {} }
    if (p.url === '/') { if (!types.has('Organization') || !types.has('WebSite')) H('home page missing Organization or WebSite schema'); }
    else {
      if (!types.has('BreadcrumbList')) H('missing BreadcrumbList schema');
      if (p.article.querySelector('.faq') && !types.has('FAQPage')) H('FAQ present but no FAQPage schema');
      if (article) { for (const k of ['author', 'datePublished', 'dateModified', 'image', 'headline']) if (!article[k]) H(`Article schema missing ${k}`); }
      else if (p.body && words(p.bodyText).length > 300 && !/^\/(about|contact|privacy-policy|terms-of-use|disclaimer|advertising-disclosure|editorial-approach)\/$/.test(p.url) && !/calculator|\/lookup\/|\/search\//.test(p.url)) S('long page without Article schema');
    }
  }
  // scripts: reading pages carry only the shared lookup script
  const scripts = p.root.querySelectorAll('script[src]').map((x) => x.getAttribute('src'));
  const isCalc = /calculator|\/lookup\/|\/search\/|expression-number|soul-urge-number|personality-number|birthday-number\/$|personal-year\/$|\/life-path\/$/.test(p.url);
  if (!isCalc && scripts.length > 1) S(`${scripts.length} external scripts on a reading page: ${scripts.join(', ')}`), bump('scripts');
  // images, schema, size, sitemap
  for (const img of p.imgs) if (!img.hasAttribute('alt')) H(`img without alt: ${img.getAttribute('src')}`);
  for (const s of p.ld) { try { JSON.parse(s); } catch { H('invalid JSON-LD'); } }
  if (!p.noindex && !p.ld.length) S('no JSON-LD');
  if (p.size > 160 * 1024) S(`HTML ${(p.size / 1024).toFixed(0)} KB`);
  if (!p.noindex && sitemapUrls.size && !sitemapUrls.has(p.url)) H('indexable page missing from sitemaps');
  if (p.noindex && sitemapUrls.has(p.url)) H('noindex page listed in sitemap');
  const canonical = p.root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!canonical) H('missing canonical'); else if (!canonical.endsWith(p.url)) H(`canonical ${canonical} does not match ${p.url}`);
  const og = p.root.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (!p.noindex && og) { const path = og.replace(/^https?:\/\/[^/]+/, ''); if (!existsSync(join(DIST, path))) H(`og:image missing ${path}`); }
}
for (const u of sitemapUrls) if (!byUrl.has(u)) hard.push(`sitemap lists ${u} which was not built`);

// ---------- site-wide: editorial floor, shingle overlap ----------
const ed = indexable.filter((p) => kinds(p.url) === 'editorial').length;
const share = ed / indexable.length;
if (share < 0.4) hard.push(`editorial pages are ${(share * 100).toFixed(0)}% of indexable pages (floor 40%)`);

const sh = pages.filter((p) => p.body && words(p.bodyText).length > 150).map((p) => {
  const keep = p.paras.filter((t) => !/frequency illusion/i.test(t) && !/→/.test(t));
  return { url: p.url, set: shingles(keep.join(' ')) };
});
let worst = [];
for (let i = 0; i < sh.length; i++) for (let j = i + 1; j < sh.length; j++) {
  const a = sh[i], b = sh[j];
  if (a.set.size < 40 || b.set.size < 40) continue;
  let inter = 0; const [small, big] = a.set.size < b.set.size ? [a.set, b.set] : [b.set, a.set];
  for (const s of small) if (big.has(s)) inter++;
  const ratio = inter / small.size;
  if (ratio >= 0.2) { worst.push([ratio, a.url, b.url]); }
  else if (ratio >= 0.1) soft.push(`${a.url} ~ ${b.url} shingle overlap ${(ratio * 100).toFixed(0)}%`);
}
for (const [r, a, b] of worst.sort((x, y) => y[0] - x[0])) (STRICT ? hard : soft).push(`${a} ~ ${b} shingle overlap ${(r * 100).toFixed(0)}% (limit 20%)`);

// ---------- report ----------
const DUMP = (() => { const i = process.argv.indexOf('--dump'); return i > -1 ? process.argv[i + 1] : null; })();
if (DUMP) { const { writeFileSync } = await import('node:fs'); writeFileSync(DUMP, JSON.stringify(pages.map((p) => ({ url: p.url, ...p.stats })), null, 1)); }
if (ONE) {
  const p = byUrl.get(ONE);
  if (!p) { console.error('no such page'); process.exit(2); }
  console.log(JSON.stringify({ url: p.url, title: p.title, titleLen: p.title.length, descLen: p.desc.length, h2s: p.h2s, stats: p.stats, outbound: p.bodyLinks.length, inbound: inbound.get(p.url), size: p.size }, null, 1));
  for (const l of [...hard, ...soft].filter((l) => l.startsWith(p.url + ' '))) console.log(l);
  process.exit(0);
}
console.log(`QA: ${pages.length} pages (${indexable.length} indexable, ${ed} editorial = ${(share * 100).toFixed(0)}%), ${sitemapUrls.size} sitemap URLs`);
console.log('counts:', JSON.stringify(counts));
const VERBOSE = process.argv.includes('--verbose');
const show = VERBOSE ? soft.length : 40;
if (soft.length) { console.log(`\n${soft.length} warnings${VERBOSE ? '' : ' (first 40; run with --verbose for all)'}`); for (const l of soft.slice(0, show)) console.log('  warn', l); if (soft.length > show) console.log(`  ... ${soft.length - show} more`); }
if (hard.length) { console.log(`\n${hard.length} FAILURES`); for (const l of hard) console.log('  FAIL', l); process.exit(1); }
console.log('\nno hard failures');

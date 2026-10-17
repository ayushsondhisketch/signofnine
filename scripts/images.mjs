// Renders one Open Graph image (1200x630) and one Pinterest pin (1000x1500) per page, plus the default image and icons.
// Pure SVG, text as font outlines (Cormorant Garamond, Source Sans 3) so the images need no system fonts, rasterised with sharp.
import { readdirSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import opentype from 'opentype.js';
import { SITE } from '../src/site.mjs';

const root = new URL('..', import.meta.url).pathname;
const fonts = {
  display: opentype.loadSync(join(root, 'scripts/fonts/cormorant-garamond-latin-600-normal.woff')),
  sans: opentype.loadSync(join(root, 'scripts/fonts/source-sans-3-latin-400-normal.woff')),
  sansBold: opentype.loadSync(join(root, 'scripts/fonts/source-sans-3-latin-600-normal.woff')),
};
const C = { night: '#2a2458', gold: '#cda54d', paper: '#ffffff', muted: '#e9e6f5', tint: '#eeebf7', ink: '#1f1b3d' };

// Cormorant's default figures are old-style; swap each digit for its lining form (the .lf glyphs) so 1111 does not read as iiii.
const liningCache = new Map();
function liningMap(f) {
  if (liningCache.has(f)) return liningCache.get(f);
  const map = new Map();
  for (let i = 0; i < f.glyphs.length; i++) { const g = f.glyphs.get(i); if (g && g.name && g.name.endsWith('.lf')) map.set(g.name.slice(0, -3), g); }
  liningCache.set(f, map);
  return map;
}
function glyphsFor(f, str) {
  const map = liningMap(f);
  return f.stringToGlyphs(str).map((g) => (g.name && map.has(g.name) ? map.get(g.name) : g));
}
function layout(f, gs, size) {
  const scale = size / f.unitsPerEm; let x = 0; const pos = [];
  for (let i = 0; i < gs.length; i++) { pos.push(x); x += (gs[i].advanceWidth || 0) * scale; if (i + 1 < gs.length) x += f.getKerningValue(gs[i], gs[i + 1]) * scale; }
  return { pos, width: x };
}
function measure(font, str, size) { const f = fonts[font]; return layout(f, glyphsFor(f, str), size).width; }
function text(str, font, size, x, y, { fill = C.paper, anchor = 'start' } = {}) {
  const f = fonts[font];
  const gs = glyphsFor(f, str);
  const { pos, width } = layout(f, gs, size);
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const d = gs.map((g, i) => g.getPath(x0 + pos[i], y, size).toPathData(2)).join(' ');
  return `<path d="${d}" fill="${fill}"/>`;
}
function fit(str, font, maxWidth, size, min = 28) {
  while (size > min && measure(font, str, size) > maxWidth) size -= 2;
  return size;
}
function wrap(str, font, size, maxWidth, maxLines = 3) {
  const f = fonts[font];
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (measure(font, t, size) > maxWidth && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\W*\w+$/, '') + '…'; }
  return lines;
}
const STARS = [[8, 22, .55], [19, 72, .35], [31, 16, .75, true], [44, 60, .3], [57, 24, .5], [66, 84, .35], [74, 12, .45], [83, 46, .65, true], [92, 78, .4], [50, 92, .3], [12, 90, .3], [38, 40, .25]];
const starField = (w, h) => STARS.map(([x, y, o, g]) => `<circle cx="${(x / 100) * w}" cy="${(y / 100) * h}" r="${g ? 2.2 : 1.8}" fill="${g ? C.gold : C.paper}" opacity="${o}"/>`).join('');
const star = (x, y, s, fill = C.gold) => `<path transform="translate(${x},${y}) scale(${s / 24})" d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z" fill="${fill}"/>`;
// The brand lockup is the real logo file (white + gold), placed by its top-left corner at a given height.
const LOGO = readFileSync(join(root, 'public/brand/logo-dark.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const LOGO_W = 591.75, LOGO_H = 148;
const brand = (x, y, h = 48) => `<g transform="translate(${x},${y}) scale(${h / LOGO_H})">${LOGO}</g>`;

/** OG: night ground, star field, ring with the emblem on the left, title and line on the right. */
function og({ emblem, title, line, eyebrow }) {
  const ringR = 150, cx = 230, cy = 315;
  const num = emblem ? text(String(emblem), 'display', fit(String(emblem), 'display', ringR * 1.6, 150, 56), cx, cy + 52, { fill: C.gold, anchor: 'middle' }) : '';
  const tx = emblem ? 440 : 80;
  const maxW = 1200 - tx - 70;
  const size = fit(title, 'display', maxW * 1.9, 72, 48);
  const lines = wrap(title, 'display', size, maxW, 3);
  const titleY = 300 - ((lines.length - 1) * size * 1.08) / 2;
  const titleSvg = lines.map((l, i) => text(l, 'display', size, tx, titleY + i * size * 1.08, { fill: C.paper })).join('');
  const sub = line ? wrap(line, 'sans', 30, maxW, 2).map((l, i) => text(l, 'sans', 30, tx, titleY + (lines.length - 1) * size * 1.08 + 60 + i * 40, { fill: C.muted })).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${C.night}"/>${starField(1200, 630)}
  ${emblem ? `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${C.gold}" stroke-width="4"/>${num}` : ''}
  ${eyebrow ? text(eyebrow.toUpperCase(), 'sansBold', 20, tx, titleY - size - 10, { fill: C.gold }) : ''}
  ${titleSvg}${sub}
  ${brand(80, 548, 48)}
  ${text(SITE.url.replace('https://', ''), 'sans', 22, 1120, 580, { fill: C.muted, anchor: 'end' })}
  </svg>`;
}

/** Pin: tall, emblem on top, title, line, brand at the bottom. */
function pin({ emblem, title, line, eyebrow }) {
  const ringR = 230, cx = 500, cy = 420;
  const num = emblem ? text(String(emblem), 'display', fit(String(emblem), 'display', ringR * 1.6, 220, 70), cx, cy + 78, { fill: C.gold, anchor: 'middle' }) : '';
  const size = fit(title, 'display', 1800, 84, 52);
  const lines = wrap(title, 'display', size, 860, 3);
  const titleY = emblem ? 820 : 500;
  const titleSvg = lines.map((l, i) => text(l, 'display', size, 500, titleY + i * size * 1.08, { fill: C.paper, anchor: 'middle' })).join('');
  const sub = line ? wrap(line, 'sans', 36, 860, 3).map((l, i) => text(l, 'sans', 36, 500, titleY + lines.length * size * 1.08 + 30 + i * 48, { fill: C.muted, anchor: 'middle' })).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500"><rect width="1000" height="1500" fill="${C.night}"/>${starField(1000, 1500)}
  ${emblem ? `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${C.gold}" stroke-width="5"/>${num}` : ''}
  ${eyebrow ? text(eyebrow.toUpperCase(), 'sansBold', 26, 500, titleY - size - 10, { fill: C.gold, anchor: 'middle' }) : ''}
  ${titleSvg}${sub}
  <rect x="440" y="1340" width="120" height="3" fill="${C.gold}"/>
  ${brand(500 - (LOGO_W * 60 / LOGO_H) / 2, 1360, 60)}
  ${text(SITE.url.replace('https://', ''), 'sans', 24, 500, 1450, { fill: C.muted, anchor: 'middle' })}
  </svg>`;
}

// ---- collect pages ----
function fm(file) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) out[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const jobs = [];
const content = (dir) => existsSync(join(root, 'src/content', dir)) ? readdirSync(join(root, 'src/content', dir)).filter((f) => f.endsWith('.md')).map((f) => fm(join(root, 'src/content', dir, f))) : [];
for (const a of content('angel')) jobs.push({ name: `angel-${a.number}`, emblem: a.number, title: a.h1 || a.title, line: a.tile, eyebrow: 'Angel number' });
for (const h of content('hubs')) jobs.push({ name: `hub-${h.slug}`, emblem: null, title: h.h1 || h.title, line: h.lead, eyebrow: 'Angel numbers' });
for (const n of content('numbers')) jobs.push({ name: `number-${n.number}`, emblem: n.number, title: n.h1 || n.title, line: n.tile, eyebrow: 'Number meaning' });
for (const l of content('lifepath')) jobs.push({ name: `lifepath-${l.number}`, emblem: l.number, title: l.h1 || l.title, line: l.tile, eyebrow: 'Life path' });
for (const g of content('guides')) jobs.push({ name: `guide-${g.slug}`, emblem: null, title: g.h1 || g.title, line: g.lead, eyebrow: 'Core numbers' });
for (const c of content('compat')) jobs.push({ name: `compat-${c.number}`, emblem: c.number, title: c.h1 || c.title, line: c.best ? `Best with ${c.best}` : '', eyebrow: 'Compatibility' });
for (const y of content('years')) jobs.push({ name: `year-${y.number}`, emblem: y.number, title: y.h1 || y.title, line: y.tile, eyebrow: 'Personal year 2027' });
for (const ar of content('articles')) jobs.push({ name: `article-${ar.slug}`, emblem: ar.badge, title: ar.h1 || ar.title, line: ar.excerpt, eyebrow: ar.category });
const json = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
for (const f of json('fourdigit.json')) jobs.push({ name: `angel-${f.number}`, emblem: f.number, title: f.h1, line: f.tile, eyebrow: 'Angel number' });
for (const t of json('times.json')) jobs.push({ name: `time-${t.slug}`, emblem: t.label, title: t.h1, line: t.tile, eyebrow: 'Clock time' });
for (const b of json('birthdays.json')) jobs.push({ name: `birthday-${b.day}`, emblem: b.day, title: b.h1, line: b.tile, eyebrow: 'Birthday number' });
jobs.push(
  { name: 'hub-numbers', emblem: null, title: 'Number meanings: what each number stands for', line: 'The nine digits and three master numbers behind every reading', eyebrow: 'Number meanings' },
  { name: 'hub-lifepath', emblem: null, title: 'Life path numbers: the meaning of each, and how to find yours', line: 'Your date of birth reduced to one digit, explained', eyebrow: 'Life path' },
  { name: 'hub-compat', emblem: null, title: 'Numerology compatibility: every life path pair', line: 'The full table, with the reasoning', eyebrow: 'Compatibility' },
  { name: 'hub-year', emblem: null, title: 'Personal year calculator: what 2027 holds for your number', line: '2027 is an 11/2 universal year', eyebrow: 'Personal year' },
  { name: 'hub-articles', emblem: null, title: 'Articles: how numerology works, explained once', line: 'Master numbers, the letter chart, the systems compared', eyebrow: 'Articles' },
  { name: 'calc-lifepath', emblem: null, title: 'Life path number calculator', line: 'Shows the working, both methods, your birthday number and 2027 personal year', eyebrow: 'Calculator' },
  { name: 'calc-compat', emblem: null, title: 'Compatibility calculator', line: 'Two dates of birth, both numbers, one reading', eyebrow: 'Calculator' },
);

const ogDir = join(root, 'public/og'), pinDir = join(root, 'public/pins');
mkdirSync(ogDir, { recursive: true }); mkdirSync(pinDir, { recursive: true });
let n = 0;
for (const j of jobs) {
  await sharp(Buffer.from(og(j))).png({ compressionLevel: 9, palette: true }).toFile(join(ogDir, `${j.name}.png`));
  await sharp(Buffer.from(pin(j))).png({ compressionLevel: 9, palette: true }).toFile(join(pinDir, `${j.name}.png`));
  n++;
}
await sharp(Buffer.from(og({ emblem: null, title: 'Numerology, explained simply', line: SITE.description, eyebrow: SITE.name }))).png({ compressionLevel: 9, palette: true }).toFile(join(ogDir, 'default.png'));
const fav = readFileSync(join(root, 'public/favicon.svg'));
await sharp(fav).resize(180, 180).png().toFile(join(root, 'public/apple-touch-icon.png'));
await sharp(fav).resize(512, 512).png().toFile(join(root, 'public/icon-512.png'));
await sharp(fav).resize(192, 192).png().toFile(join(root, 'public/android-chrome-192x192.png'));
await sharp(fav).resize(512, 512).png().toFile(join(root, 'public/android-chrome-512x512.png'));
console.log(`Rendered ${n} page images (OG and pin) plus the default and icons.`);

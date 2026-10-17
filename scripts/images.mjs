// Renders one Open Graph image (1200x630) per page, plus the default image and icons. Pinterest pins are made by scripts/pins.mjs.
// Pure SVG, text as font outlines (Cormorant Garamond, Source Sans 3) so the images need no system fonts, rasterised with sharp.
import { readdirSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { SITE } from '../src/site.mjs';
import { root, fonts, C, measure, text, fit, wrap, starField, star, LOGO_W, LOGO_H, brand } from './lib/render.mjs';

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
for (const m of content('modifiers')) jobs.push({ name: `angel-${m.parent}-${m.modifier}`, emblem: m.parent, title: m.h1 || m.title, line: m.tile, eyebrow: 'Angel number' });
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

const ogDir = join(root, 'public/og');
mkdirSync(ogDir, { recursive: true });
let n = 0;
for (const j of jobs) {
  await sharp(Buffer.from(og(j))).png({ compressionLevel: 9, palette: true }).toFile(join(ogDir, `${j.name}.png`));
  n++;
}
await sharp(Buffer.from(og({ emblem: null, title: 'Numerology, explained simply', line: SITE.description, eyebrow: SITE.name }))).png({ compressionLevel: 9, palette: true }).toFile(join(ogDir, 'default.png'));
const fav = readFileSync(join(root, 'public/favicon.svg'));
await sharp(fav).resize(180, 180).png().toFile(join(root, 'public/apple-touch-icon.png'));
await sharp(fav).resize(512, 512).png().toFile(join(root, 'public/icon-512.png'));
await sharp(fav).resize(192, 192).png().toFile(join(root, 'public/android-chrome-192x192.png'));
await sharp(fav).resize(512, 512).png().toFile(join(root, 'public/android-chrome-512x512.png'));
console.log(`Rendered ${n} share images plus the default and icons.`);

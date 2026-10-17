// Shared drawing helpers for the share images and the Pinterest pins: fonts as outlines (so no system fonts are
// needed), lining figures, text layout, the star field and the brand lockup. Used by scripts/images.mjs and scripts/pins.mjs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import opentype from 'opentype.js';

export const root = new URL('../..', import.meta.url).pathname;
export const fonts = {
  display: opentype.loadSync(join(root, 'scripts/fonts/cormorant-garamond-latin-600-normal.woff')),
  sans: opentype.loadSync(join(root, 'scripts/fonts/source-sans-3-latin-400-normal.woff')),
  sansBold: opentype.loadSync(join(root, 'scripts/fonts/source-sans-3-latin-600-normal.woff')),
};
export const C = { night: '#2a2458', gold: '#cda54d', paper: '#ffffff', muted: '#e9e6f5', tint: '#eeebf7', ink: '#1f1b3d' };

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
export function measure(font, str, size) { const f = fonts[font]; return layout(f, glyphsFor(f, str), size).width; }
export function text(str, font, size, x, y, { fill = C.paper, anchor = 'start' } = {}) {
  const f = fonts[font];
  const gs = glyphsFor(f, str);
  const { pos, width } = layout(f, gs, size);
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const d = gs.map((g, i) => g.getPath(x0 + pos[i], y, size).toPathData(2)).join(' ');
  return `<path d="${d}" fill="${fill}"/>`;
}
export function fit(str, font, maxWidth, size, min = 28) {
  while (size > min && measure(font, str, size) > maxWidth) size -= 2;
  return size;
}
export function wrap(str, font, size, maxWidth, maxLines = 3) {
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
export const starField = (w, h) => STARS.map(([x, y, o, g]) => `<circle cx="${(x / 100) * w}" cy="${(y / 100) * h}" r="${g ? 2.2 : 1.8}" fill="${g ? C.gold : C.paper}" opacity="${o}"/>`).join('');
export const star = (x, y, s, fill = C.gold) => `<path transform="translate(${x},${y}) scale(${s / 24})" d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z" fill="${fill}"/>`;
// The brand lockup is the real logo file (white + gold), placed by its top-left corner at a given height.
const LOGO = readFileSync(join(root, 'public/brand/logo-dark.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
export const LOGO_W = 591.75, LOGO_H = 148;
export const brand = (x, y, h = 48) => `<g transform="translate(${x},${y}) scale(${h / LOGO_H})">${LOGO}</g>`;

/** Greedy word wrap that never truncates: returns every line, so the caller can tell when the text does not fit. */
export function wrapLines(str, font, size, maxWidth) {
  const lines = [];
  let cur = '';
  for (const w of String(str).split(/\s+/).filter(Boolean)) {
    const t = cur ? `${cur} ${w}` : w;
    if (measure(font, t, size) > maxWidth && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

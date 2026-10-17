// Helpers shared by pages: data loading, schema builders, dates, word counts.
import { getCollection } from 'astro:content';
import { SITE } from '../site.mjs';
import fourDigit from '../data/fourdigit.json';
import times from '../data/times.json';
import digits from '../data/digits.json';

export { fourDigit, times, digits };

export async function publishedNumberSlugs() {
  const angel = await getCollection('angel');
  const slugs = angel.map((a) => a.data.number);
  for (const f of fourDigit) slugs.push(f.number);
  for (const t of times) slugs.push(`times/${t.slug}`);
  return slugs;
}

/** Every angel-number page the site has, editorial and computed, with its one-line meaning. */
export async function allAngelNumbers() {
  const angel = await getCollection('angel');
  const list = angel.map((a) => ({ n: a.data.number, href: `/angel-numbers/${a.data.number}/`, line: a.data.tile, kind: 'editorial' }));
  for (const f of fourDigit) list.push({ n: f.number, href: `/angel-numbers/${f.number}/`, line: f.tile, kind: 'computed' });
  return list.sort((a, b) => Number(a.n) - Number(b.n) || a.n.length - b.n.length);
}

export function allTimes() {
  return times.map((t) => ({ n: t.label, href: `/angel-numbers/times/${t.slug}/`, line: t.tile }));
}

// Breadcrumb label from an H1: the part before the colon or question mark, or before the first comma when there is neither.
export function crumbLabel(h1) {
  const m = h1.match(/^(.*?)(\?|:)(\s|$)/);
  if (m) return m[1] + (m[2] === '?' ? '?' : '');
  const c = h1.indexOf(', ');
  return c > 0 ? h1.slice(0, c) : h1;
}

export function fmtDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-').map(Number);
  return `${dd} ${['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1]} ${y}`;
}

export function wordCount(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/[#*_>`|-]/g, ' ').split(/\s+/).filter(Boolean).length;
}

export function readMinutes(words) {
  return Math.max(2, Math.round(words / 230));
}

const person = { '@type': 'Person', name: SITE.author, url: `${SITE.url}/about/` };
const org = { '@type': 'Organization', name: SITE.name, url: SITE.url, logo: { '@type': 'ImageObject', url: `${SITE.url}/icon-512.png` } };

export function articleSchema({ url, headline, description, published, modified, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE.url}${url}` },
    headline,
    description,
    image: [`${SITE.url}${image}`],
    author: person,
    publisher: org,
    datePublished: published,
    dateModified: modified,
    inLanguage: 'en',
  };
}

export function breadcrumbSchema(crumbs) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` }];
  crumbs.forEach((c, i) => items.push({ '@type': 'ListItem', position: i + 2, name: c.label, item: `${SITE.url}${c.href}` }));
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

export function faqSchema(faq) {
  if (!faq || !faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })),
  };
}

export function siteSchema() {
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon-512.png`, founder: person, email: SITE.email },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'en', publisher: { '@type': 'Organization', name: SITE.name } },
  ];
}

export function personSchema() {
  return { '@context': 'https://schema.org', '@type': 'Person', name: SITE.author, url: `${SITE.url}/about/`, jobTitle: 'Writer and editor', worksFor: { '@type': 'Organization', name: SITE.name }, knowsAbout: ['Numerology', 'Angel numbers', 'Pythagorean numerology'] };
}

/** Digit meaning rows for the "numbers inside it" table. */
export function insideRows(numStr) {
  const s = String(numStr).replace(/\D/g, '');
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  const rows = Object.entries(counts).map(([d, c]) => ({ n: d, where: c === 1 ? 'Once' : c === 2 ? 'Twice' : c === 3 ? 'Three times' : `${c} times`, adds: digits[d].line }));
  return rows;
}

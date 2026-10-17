import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const faq = z.array(z.object({ q: z.string().max(110), a: z.string() })).max(6).default([]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const base = {
  title: z.string().max(60),
  h1: z.string(),
  description: z.string().max(140),
  lead: z.string(),
  published: date,
  updated: date,
  faq,
};

const angel = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/angel' }),
  schema: z.object({
    ...base,
    number: z.string(),
    inShort: z.object({ meaning: z.string(), core: z.string().optional(), contains: z.string().optional(), response: z.string() }),
    pairs: z.array(z.object({ n: z.string(), line: z.string() })).default([]),
    tile: z.string(),
  }),
});

// The six readings big enough to need their own address (queue rows M-*; CLAUDE.md rule 3). Everything else is a section on the number's page.
// Adding to this list is a decision for Ayush, not something a scheduled task does to get a page through.
const MODIFIER_PAGES = ['333/twin-flame', '555/twin-flame', '222/twin-flame', '444/love', '777/love', '1111/love'];
const modifiers = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/modifiers' }),
  schema: z.object({
    ...base,
    parent: z.string(),
    modifier: z.string().regex(/^[a-z]+(-[a-z]+)*$/),
    inShort: z.object({ meaning: z.string(), core: z.string().optional(), contains: z.string().optional(), response: z.string() }),
    pairs: z.array(z.object({ n: z.string(), line: z.string() })).default([]),
    tile: z.string(),
  }).refine((d) => MODIFIER_PAGES.includes(`${d.parent}/${d.modifier}`), { message: `a modifier page must be one of ${MODIFIER_PAGES.join(', ')}` }),
});

const hubs = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/hubs' }),
  schema: z.object({
    ...base,
    slug: z.string(),
    members: z.array(z.object({ n: z.string(), line: z.string() })).default([]),
  }),
});

const numbers = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/numbers' }),
  schema: z.object({ ...base, number: z.number(), inShort: z.object({ meaning: z.string(), keywords: z.string(), tarot: z.string(), response: z.string() }), tile: z.string() }),
});

const lifepath = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/lifepath' }),
  schema: z.object({ ...base, number: z.number(), name: z.string(), inShort: z.object({ meaning: z.string(), strengths: z.string(), watch: z.string(), response: z.string() }), tile: z.string() }),
});

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({ ...base, slug: z.string(), calculator: z.string().optional(), inShort: z.object({ meaning: z.string(), from: z.string(), response: z.string() }) }),
});

const compat = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/compat' }),
  schema: z.object({ ...base, number: z.number(), name: z.string(), best: z.string(), hardest: z.string(), partners: z.record(z.string(), z.string()) }),
});

const years = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/years' }),
  schema: z.object({ ...base, number: z.number(), name: z.string(), inShort: z.object({ meaning: z.string(), theme: z.string(), response: z.string() }), tile: z.string() }),
});

const articles = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/articles' }),
  schema: z.object({ ...base, slug: z.string(), category: z.string(), badge: z.string(), excerpt: z.string(), inShort: z.array(z.string()).min(2).max(5) }),
});

export const collections = { angel, modifiers, hubs, numbers, lifepath, guides, compat, years, articles };

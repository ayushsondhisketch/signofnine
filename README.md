# Sign of Nine

Numerology, angel numbers and life path meanings, explained in plain English with the arithmetic shown and the tradition named. Static site built with Astro, deployed on Cloudflare Pages from this repository.

## Commands

- `npm install` once.
- `npm run build` renders the Open Graph and pin images, builds the site into `dist/`, writes the per-folder sitemaps, builds the Pagefind search index and runs the QA script. A QA failure stops the build.
- `npm run dev` for local editing, `npm run preview` to serve `dist/`.
- `node scripts/qa.mjs --verbose` prints every warning; `node scripts/qa.mjs --page /angel-numbers/555/` prints one page's report; `--strict` turns the soft targets into failures.
- `node scripts/lengths.mjs all` lists title and description lengths across the content.
- `node scripts/indexnow.mjs` submits every sitemap URL to IndexNow (also available as a manual GitHub Action).

## Where things live

- `src/content/` is the editorial content, one Markdown file per page, validated by `src/content.config.ts` (titles 60 characters or under, descriptions 140 or under).
- `src/data/fourdigit.json`, `times.json` and `birthdays.json` hold the computed pages, assembled by `src/lib/compose.mjs`. `digits.json` holds the nine digit meanings every page draws on.
- `src/lib/numerology.mjs` is the one arithmetic engine, shared by the build and the browser calculators.
- `src/site.mjs` holds the site constants. `ads: false` keeps the reserved ad slots collapsed; set it to `true` after the ad network approves the site.
- `public/_headers` and `public/_redirects` are read by Cloudflare Pages. Redirects for folded pages go in `_redirects`.
- `scripts/qa.mjs` enforces the content and SEO rules from the build checklist: blocklist, sentence and paragraph limits, internal links, schema, sitemaps, images.

## Cloudflare Pages settings

Build command `npm run build`, output directory `dist`, Node 22 (from `.nvmrc`). The `www` host redirects to the apex through `_redirects`; the `pages.dev` preview is noindexed through `_headers`.

## Rules every page follows

US spelling. Sentence case headings. No em dashes. Readings are attributed to the tradition, never stated as fact. Every angel-number page explains the frequency illusion before the reading and shows the arithmetic. Health, money and legal sections end with a referral to a professional.

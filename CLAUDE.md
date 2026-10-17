# Sign of Nine: working rules for every session

signofnine.com is an ad-funded numerology and angel-number site for US and UK readers. The author on every page is Ayush Sondhi. Claude runs the site on automation: new pages, refreshes, health checks, Pinterest pins and the monthly review all start from this file and the `seo/` folder.

Governing documents (they win over this file; if they disagree, fix this file):
- Claude Doc "Sign of Nine: build, audit and launch checklist": https://claude.ai/code/artifact/a1dea251-12a7-4dce-bcf7-754f251cca71
- Claude Doc "Numerology query map, US/UK" (SERPs read on 17 October 2026, Ahrefs exports for 111 to 1212): https://claude.ai/code/artifact/35bd968b-49d1-49a5-87ae-7c7d302fefbe

## The site in five lines

- Astro 5 static site, Node 22, GitHub repo `ayushsondhisketch/signofnine` (public, branch `main`). A push to `main` deploys to Cloudflare Pages in about two minutes.
- Live at https://signofnine.com since 2026-10-17. Shell tools cannot reach the live site; use WebFetch for live checks.
- Editorial content is Markdown in `src/content/` (angel, hubs, numbers, lifepath, compat, years, guides, articles). Computed pages come from `src/data/*.json` through `src/lib/compose.mjs`. One arithmetic engine: `src/lib/numerology.mjs`.
- `npm run build` renders the OG and pin images, builds the site, writes the sitemaps, builds the Pagefind index and runs `scripts/qa.mjs`. A QA hard failure stops the build.
- The goal is Google page one (and Bing, and assistant citations) for the long tail first, then the head terms. The site wins by adding something no competitor has on the page, never by volume.

## Hard rules

1. QA is the approval. Never edit `scripts/qa.mjs`, `src/content.config.ts` limits or the blocklists to get a page through. Fix the page, or leave it unpublished.
2. `npm run build` and `node scripts/qa.mjs --strict` must both pass before any push that changes content or templates.
3. One cluster, one URL. A modifier (love, money, warning, biblical) is a section on the number's page, except the six pages in `seo/queue.md` (M-* rows). Those six are files in `src/content/modifiers/`, started from `seo/templates/modifier-page.md`; the `MODIFIER_PAGES` list in `src/content.config.ts` is the allow-list and changes only when Ayush says so. Never publish a page that differs from another by a number or a word.
4. Demand gate. A new indexable URL needs measured demand written in its queue row: 1,000 searches a month (US and UK together) for an editorial page, 100 for a computed page. Search Console impressions help to prioritize; they do not replace the volume figure.
5. Editorial pages stay at 40 percent or more of all indexable pages. Computed pages ship only in gated bands (see `seo/PLAYBOOK.md`, "Bands").
6. Pace: editorial at three a week at most, one page per run, never catch up after a missed run. No bursts.
7. Never change a URL. If a page must go, fold it into its parent with a 301 in `public/_redirects`.
8. Nothing fake: no invented dates, quotes, studies, authors, counts or experience. Every reading is attributed to the tradition. "Updated" and `dateModified` change only when the text changes.
9. Health, pregnancy, money and legal sections state the tradition's reading, give no advice, and end by sending the reader to the person who can help.
10. No bought, swapped or begged links. No comments or forum posts that point here. Promotion is Pinterest, the sitemap, IndexNow, links between our own pages and links earned by the pages.

## Voice

Written the way one careful person would answer a friend who texted "I keep seeing 555, what does it mean": the answer first, the reason second, the tradition named, nothing padded.

- US spelling. Sentence case in every heading. No em dashes anywhere (use a comma, a colon or a full stop). The arrow `→` marks reduction: 5 + 5 + 5 = 15 → 6.
- The first sentence under every heading answers the heading. Average sentence under 18 words, none over 30, three sentences a paragraph at most.
- Active voice. "Numerologists read 555 as change", not "555 is believed to be associated with change".
- Readings are attributed ("the tradition reads", "Doreen Virtue's 2005 book gives"). Never "the angels want you to" or "the universe is telling you" in the site's own voice.
- Specific over general: name the verse, the book and its year, the figure. No "many people" or "experts" without a name or a count.
- No exclamation marks, emoji, rhetorical questions or italic emphasis. Bold only for lead-in words. Lists only for parallel items.
- None of the words or patterns in the blocklist in `scripts/qa.mjs` (and none the QA does not know about: if a sentence sounds like a brochure, rewrite it).
- The honest paragraph (the frequency illusion, 5:55 happening twice a day) stays on every angel-number page.
- Competitor sites, AI sites and content farms are never cited and never paraphrased. Read them to see the gap, then write from the arithmetic, the named sources and the tradition.

## Where things live

- `seo/queue.md`: the publishing queue, with the Status line (running or PAUSED) on top. `seo/PLAYBOOK.md`: how a page earns a ranking, the refresh method, the bands, the update guard, the checkpoints. `seo/keywords.md`: query families, tracked queries, the page that owns each. `seo/competitors.md`: who ranks and what to beat. `seo/notes.md`: dated log of what changed and what was measured. `seo/pinterest.md`: boards, feeds, rules. `seo/SETUP.md`: what only Ayush can do, with status. `seo/watch.config.json`: thresholds the monitors read.
- `.github/workflows/`: `indexnow.yml` (on push), `watch-live.yml` (daily), `watch-performance.yml` (weekly Lighthouse), `watch-search.yml` (daily Search Console export, needs secrets), `audit.yml` (weekly clean build, strict QA, outside links, pin queue), `rebuild-daily.yml` (asks Cloudflare for one build a day when the `CF_DEPLOY_HOOK` secret exists, so due pins are released). Their results are written to pinned GitHub issues labeled `monitor`; failures open an issue labeled `alert`. Read them as described under "Read the monitors" below.
- `src/data/pins.json`: the Pinterest queue. `scripts/pins.mjs` fills it (header of the file lists every command); `src/pages/pins/[board].xml.js` publishes one feed per board; `seo/pinterest.md` holds the rules.
- Search Console data lives in a private Google Sheet titled "Sign of Nine Search Console" (tabs Summary, Performance, Queries, Daily, Index), rewritten daily by `watch-search.yml`. Find it with the Google Drive search tool and read it with the Google Sheets tools. If it does not exist yet, or those tools are not in your session, Search Console numbers are unavailable: say so and do not guess. The counts in the pinned issue "Monitor: search" are the fallback.
- Read the monitors without a login ("Read the monitors"): `gh api "repos/ayushsondhisketch/signofnine/issues?labels=monitor&state=all"` for the latest result of each check, `...?labels=alert&state=open` for problems. `seo/PLAYBOOK.md` section 15 says what each alert means and what to do.
- `seo/templates/modifier-page.md`: the starting file for the six modifier pages. `scripts/pins-skip.txt`: pin ids never to make.

## Working as a scheduled task

- Clone the repo if it is not in the working directory (`git clone https://github.com/ayushsondhisketch/signofnine`). If cloning or pushing is refused, add the repo to the session with push access (the add_repo tool, owner ayushsondhisketch, repo signofnine, access push) and retry. Other tasks push to this repo, so always `git pull --rebase` before you push.
- `npm ci` once. The site's own tests are `npm run build` and `node scripts/qa.mjs --strict`. Look at new or changed pages in Playwright at 390 and 1366 px (Chromium is at `/opt/pw-browsers/chromium`; pass it as `executablePath`).
- After a push, wait three minutes, then WebFetch the changed page on https://signofnine.com to confirm it is live. `.github/workflows/indexnow.yml` tells Bing and other IndexNow engines by itself.
- Google update guard. WebFetch https://status.search.google.com/en/feed.atom (an entry whose title does not start with "RESOLVED" is rolling out now) and https://status.search.google.com/summary. While a core or spam update is rolling out, and for 14 days after it ends, do not edit existing pages except to fix what is broken. New pages keep their normal pace.
- Repair mode. If the Status line in `seo/queue.md` says PAUSED, publish nothing and say so.
- WebSearch results do not match Google's. They are good for seeing who ranks and what format wins; they never justify deleting, merging, noindexing or rewriting a page. Only Search Console data does that.
- Log what you did in `seo/notes.md` (one dated line per action) and commit it with the work. A commit that changes only files under `seo/` or this file gets `[CF-Pages-Skip]` in its message, so Cloudflare does not rebuild the site for a note.
- Report to Ayush only what needs him. If everything passed and nothing needed a decision, the whole final message is one line. Two reports are longer by design: the Sunday health digest (two lines when all is well: the three numbers, and what shipped) and the monthly review (five lines at most).

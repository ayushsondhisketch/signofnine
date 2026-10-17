# Playbook: how a page earns a ranking

This is the working method behind every task. The checklist Claude Doc is the law; this file is how it is carried out. Dates run from launch day, 2026-10-17.

## 1. Where the site wins, and where it does not (yet)

From the query map (SERPs read 17 October 2026, Ahrefs exports for 111 to 1212):

- The head angel-number terms are 94 percent of the volume and belong to Vogue, Cosmopolitan, Gaia, Numerologist.com and Reddit. An AI Overview sits on about nine in ten of them and the whole cluster shrinks about 15 percent a year. They are a two-year bet, not the plan.
- Year one earns first in these places: People Also Ask boxes, positions 4 to 10 on the question phrasings ("why do I keep seeing 444"), the modifier pages with a separate parent topic, clock times and four-digit tail, personal year 2027, birthday numbers, karmic debt, house numbers and wedding dates, Bing, Pinterest and Discover.
- Single-purpose calculator domains reach page one within months (numerologycalc.org is first for "numerology calculator"). The site has the same shape plus what they lack: a named author, a method page, the working shown, both methods when they disagree, the tradition attributed, and a result that has its own URL.
- The Overview offers to do the sum in chat. A page beats that only by carrying what chat cannot: the working, the ambiguity, the pair, the year, the date, a permanent address for the result.

## 2. The page workflow (new page, upgrade or refresh)

Run the steps in order. Write the result of steps 1 to 5 into the queue row or the commit message so the next session can see it.

1. Cluster. Name the target query and three to eight supporting phrasings (queue row, Ahrefs exports in the query map, People Also Ask, autocomplete, Search Console queries).
2. Intent. Classify the cluster into the 15 intent types: meaning, why seeing, what to do, love, twin flame, money, spiritual, warning, time, health, pairs, numerology, comparison, calculation, definition. Write the searcher's moment in one sentence ("someone saw 222 on two receipts today and wants to know if it means anything"). The page answers only the types the cluster holds, in the order the volume runs.
3. SERP read. WebSearch (US, standard mode; extended when the result is thin or looks wrong) for the target query. WebFetch the top three to five organic pages. Record: format (list, essay, tool, forum, video), length, headings, freshness, author, schema, what every result repeats, what none of them answers, and which SERP features are present (AI Overview, People Also Ask, video, forum threads, shopping). Reddit and video results tell you the searcher wants a person's answer; a tool page tells you they want a result.
4. The gap. Write one line: what this page will carry that no top result has. Valid gaps: the computed working; both methods side by side where they disagree; a pair, year, date or address nobody covers; a calculator with a shareable result URL; the skeptical paragraph beside the attributed reading; a named verse or book with its year; a table across all numbers; a clearer answer-first structure for a People Also Ask question; a fresher year. No gap, no page. Move the row to Parked with the reason.
5. The brief. Title (50 to 60 characters, primary term first, modifiers after a colon), H1 (sentence case, differs from the title), description (under 140 characters, names two modifiers), the In short box (under 100 words, four sentences in fixed order: the answer with the primary term; the arithmetic; the three main modifiers; the honest line), H2s in People Also Ask wording and in volume order, three to five FAQ entries (question under 110 characters, answer 40 to 60 words), the internal links.
6. Draft from the brief only, in the voice in `CLAUDE.md`. Do not open a competitor page while drafting.
7. Gates: `npm run build`, then `node scripts/qa.mjs --strict`. Then ask the publication questions (below). Then look at the page at 390 and 1366 px.
8. Publish: commit, `git pull --rebase`, push. Add the new page to at least three existing pages with one short link inside a relevant section (anchor text is the query, never "click here"). Queue two pins: `node scripts/pins.mjs --page /path/`. Log it in `seo/notes.md`. Move the row to Done.
9. Verify live after three minutes (WebFetch). Check title, one H1, canonical, that the page is in the sitemap.

Publication questions (from the TheCarLane gate; any "no" means improve or do not publish): Does it satisfy the intent? Does it answer the question in the first 100 words? Is it better than the SERP at something specific? Is every number computed and every reading attributed? Is every claim backed or qualified? Is anything repetitive or only there for SEO? Would a reader know what to do next? Would we publish it if word count did not exist?

## 3. Upgrades and the seasonal calendar

- Each angel-number page gets a dated section for its calendar day, written three to four weeks ahead and refreshed yearly: 1111 on 11/11, 1212 on 12/12, 111 on 1/11, 222 on 2/22, 333 on 3/3, 444 on 4/4, 555 on 5/5, 666 on 6/6, 777 on 7/7, 888 on 8/8 (done), 999 on 9/9. The section is a heading, a 40 to 60 word answer and a short reading, not a new page. Add a pin for the date.
- Template gaps: every angel-number page should carry the sections the Ahrefs and People Also Ask data call for. Currently missing on most: the origin and zodiac link ("Doreen Virtue, 2005"), the named verse in the biblical section (Psalm 55:5 and Isaiah 55:5 for 555, Mark 3:33 for 333, Proverbs 11:11 and Matthew 11:11 for 1111, Proverbs 12:12 for 1212 and so on; check each verse text in a Bible source before quoting), and a plain first paragraph for readers new to angel numbers. Add one section per run at most; keep each page under 2,500 words.
- Year pages: personal year pages say 2027 in the text and carry no year in the URL. In December, check the 2028 plan before changing any text.

## 4. Refresh method

Data: the private Google Sheet "Sign of Nine Search Console", rewritten every day by `watch-search.yml`. Tabs: Summary (the three numbers, then one row per folder), Performance (one row per sitemap URL: clicks, impressions, CTR and average position over the last 28 days, the same for the 28 days before, and the impressions change), Queries (the 5,000 top query and page pairs of the last 28 days), Daily (180 days of clicks, impressions and position), Index (Google's verdict and coverage state for every URL, refreshed 400 URLs a run). Find it with the Google Drive search tool by name. If the Sheet does not exist yet, the pinned issue "Monitor: search" says "Not set up yet" and the data method below does not apply: run the hygiene method instead and say in the report that Search Console is not connected.

### 4a. Data method (the Sheet exists and has 28 days of rows)

Pick at most two pages per run, in this order:
1. Pages with at least 30 impressions in 28 days at an average position of 8 to 20 and rising impressions. Rewrite the In short box and the opening answer under the H2 that matches the losing query so the answer is in the first sentence. Add a missing People Also Ask question as an FAQ entry (six at most). Add one inbound link from a page with more impressions.
2. Pages with at least 100 impressions in 28 days, average position 10 or better and click-through rate under 1 percent. Sharpen the title and description to the exact words searchers use. Change a title only when it clearly targets the wrong wording; Google rewrites titles that mismatch the query anyway.
3. Two of our URLs showing for the same query. Pick the owner, point the other page's link and wording at it, and do not merge without the kill rule.

### 4b. Hygiene method (no Search Console data, or nothing qualifies in 4a)

Not before 2026-11-03: the first two weeks after launch are left alone while the first crawl finishes. After that, fix what the build already knows is weak, two pages a run:
1. `node scripts/qa.mjs --verbose` lists the soft warnings. Take the editorial page with the most of them (not a page edited in the last 14 days).
2. Fix only these kinds: an average sentence over 18 words (split or cut, keeping every fact), an H2 not followed by an answering sentence (move the answer to the first sentence), fewer than 8 outbound internal links (add short links in relevant sentences, anchor text is the query).
3. Same meaning, same facts, same sources. No new section, at most 60 words added. The strict QA and the build must pass, and the page must read as before: open the before and after side by side.

### Limits that hold for both

Never lengthen a page by more than 60 words in a refresh and never add a section. `updated` and `dateModified` change only when text changed. No refresh while a Google update is rolling out or ended less than 14 days ago. Log each page in `seo/notes.md` with the date so the effect can be read 28 days later.

## 5. Bands (computed pages)

Computed page types (clock times, four-digit numbers, birthday numbers, personal year, and any later set) live in their own folder with their own sitemap, so one rule can remove a whole type.

- No new computed pages before AdSense is approved (`ads: true` in `src/site.mjs`, or Ayush says so in the report thread).
- A band is up to 25 pages a day. The next band opens only when the previous band is at least 50 percent indexed (Index tab) and at least 30 percent of it has impressions in the last 28 days. Indexed but invisible does not count.
- Each computed page needs 100 searches a month (US and UK together) written in its queue row, its own composed reading (the QA shingle check stays under 20 percent overlap), and links to its parent and siblings.
- Doorway test: a clock time or number with no demand and no meaning of its own is served by the lookup in the browser, with no URL.

## 6. Warning signals and checkpoints

The weekly health run (section 14) reads the Summary tab and the monitors and writes three numbers at the top of `seo/notes.md`.

Warning signals:
1. Indexing of computed pages: the share of each computed folder in "Crawled, currently not indexed" or "Discovered, currently not indexed". Over 50 percent for two weeks: that folder's bands stop and nothing of that type ships until it recovers.
2. Spread of impressions: the share of indexable pages with at least one impression in 28 days. Under 40 percent at day 60, or falling three weeks running: the tail pauses and the budget moves to editorial pages and hubs.
3. Sitewide position drift: average position moving by more than two places across every folder in the same week. That is a classifier, not a competitor: all bands stop, the editorial floor rises to 50 percent, and the month's review reads every computed type for what to fold in.

Checkpoints (evaluate in the first weekly run on or after the date; write the result in `seo/notes.md`):

| Date | Day | Pass condition | If it fails |
| 2026-10-24 | 7 | Home page and the 11 angel pages indexed on Google; Bing indexing the sitemap | Ask Ayush to request indexing for the 11 by hand; check robots, canonicals and the sitemap submission first |
| 2026-11-16 | 30 | 60 percent of the pages indexed; first Bing clicks; brand searches for "sign of nine" above zero | Under 40 percent indexed: stop editorial additions for two weeks, audit the unindexed pages against the content rules and the shingle rule, fold or rewrite the worst ten |
| 2026-12-01 | 45 | AdSense application submitted with every ads line in the checklist ticked | A rejection names a reason: fix only that, re-apply after 14 days |
| 2026-12-16 | 60 | AdSense approved; a third of computed pages with impressions; 1,000 to 3,000 sessions a month; first band gate met | Under a third with impressions: the tail does not open; the next 60 days are editorial and hubs only |
| 2027-01-15 | 90 | 300 to 400 indexable pages, editorial at 40 percent or more; 5,000 to 10,000 sessions; kill rule applied for the first time | Sessions under 2,000: hold the page count, run refresh on the 20 highest-impression pages, review titles against the queries showing |
| 2027-02-14 | 120 | Journey application at 1,000 premium sessions and four months of age | Under 1,000: nothing changes; AdSense carries the site |
| 2027-04-15 | 180 | 450 to 600 indexable pages, each demand-backed; 20,000 to 40,000 sessions; brand searches rising | Sessions under 8,000 with healthy indexing: turn to calculators, Pinterest and Discover, not more pages |
| 2027-10-17 | 365 | Head numbers in Bing's top ten and Google's top twenty; 50,000 to 100,000 sessions | Stuck beyond page two with a healthy tail: an authority problem; earn mentions with the method and origin pages |

What never changes at a checkpoint: the demand gate, the editorial floor, the kill rule, the blocklist, the honest paragraph, the attribution of readings, the ad placement rules. A bad month changes pace and mix, never the rules.

Kill rule: a page with no impressions at day 90 (2027-01-15), or under 10 impressions a month at day 180 (2027-04-15), is folded into its parent with a 301 in `public/_redirects`, its unique lines merged there, every link to it updated. At most two pages a month, never a hub, a calculator or a fixed page, never during an update window. The first time a page is on the list it gets one honest improvement and a dated line in `seo/notes.md`; it is folded only when it is still silent 90 days later.

## 7. Google updates and repair mode

- Check https://status.search.google.com/en/feed.atom (title not starting with "RESOLVED" means rolling out) and https://status.search.google.com/summary before editing any existing page.
- For each core or spam update that ended 28 or more days ago and is not marked checked in `seo/notes.md`: compare Search Console clicks for the 28 days after with the 28 days before. If the 28 days before had under 100 clicks, write "too few clicks to read". If clicks fell 30 percent or more, set the first line of `seo/queue.md` to `Status: PAUSED (repair mode since <date>): <why>`, publish nothing, and use the refresh slots on the five pages that lost the most clicks (look at what the pages now ahead give the reader that ours do not; add it). Set the Status back to running when the latest 28 days are within 15 percent of the 28 days before the update, or after 60 days. Tell Ayush.

## 8. Internal links

- Every page links out to at least eight pages: its parent, its siblings, the hubs, the calculator and the method page. Anchor text is the query ("5:55 meaning", "5555 angel number").
- Every new page gets at least three inbound links from existing pages, added by hand in a relevant sentence.
- Hubs list only pages that exist; every number page links up to the hub from its section on that theme.
- Check with `node scripts/qa.mjs --page /path/`. The build already fails an orphan.

## 9. Titles and descriptions (click-through)

- Primary term first, both phrasings where the template says so ("555 Angel Number Meaning" and "555 meaning"), modifiers after a colon, Title Case in the title tag, sentence case in the H1.
- The description answers the query and names two modifiers, under 140 characters.
- Change a title or description only with Search Console evidence (impressions and a CTR gap), one page at a time, and note the date in `seo/notes.md` so the effect can be read 28 days later.

## 10. Pinterest

- Every editorial page gets pins. The queue lives in `src/data/pins.json`; the Pins task keeps it filled ten days ahead (`node scripts/pins.mjs --days-ahead 10`); the feeds under `/pins/` publish what is due. The rules, boards and pace are in `seo/pinterest.md`.
- Pin text is written for Pinterest search: the number and the question in the title, the plain answer in the description, no hashtag stuffing, no clickbait.

## 11. Assistants and AI answers

- Keep `public/llms.txt` current when sections are added. Keep the In short box, the 40 to 60 word answer under each H2 and the FAQ accurate. Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot and PerplexityBot stay allowed in robots.txt; the live monitor fails if Cloudflare starts blocking them and warns when the live file differs from `public/robots.txt`.
- Monthly: for the tracked queries in `seo/keywords.md`, note whether signofnine.com shows in WebSearch results. This is a rough signal only.

## 12. Links and authority

The page-two ceiling is an authority problem, and pages do not fix it. Tasks never contact anyone and never buy or trade links. The monthly review may list up to five real opportunities for Ayush to approve: a calculator or method page worth citing, a journalist request on numerology, a podcast, a data point the site can publish. Drafts are prepared; nothing is sent without Ayush saying yes in the conversation.

## 13. What the monthly review does

1. Google updates since last month and the 28-day comparison.
2. Tracked-query table: our visibility (rough), top three domains, SERP features, new entrants. Compare with last month. Update `seo/competitors.md` and `seo/keywords.md`.
3. Search Console: clicks, impressions, position per folder; the three warning signals; the checkpoint table; the kill-rule list.
4. Gaps: queries with impressions and no matching page; People Also Ask questions new this month; competitor pages that appeared with a format we lack. Put at most eight rows in Proposed, each with the gap line.
5. Queue: keep at least 12 rows under Next; apply the demand gate; list the rows that need Ayush to run a KWFinder check (the question for him is: volume US and UK for these exact queries).
6. Pinterest: pins released, board counts, top pins if Pinterest analytics is available (Ayush may paste a screenshot).
7. Dependencies. `npm audit --omit=dev` and the "Packages" row of the pinned issue "Monitor: weekly audit". A patch or minor release in the same major that fixes an advisory: `npm update`, run `npm run build`, compare the HTML of 20 sampled pages in `dist/` with the build from before the update (they must match except for hashed asset names), push. A new major (Astro 5 to the current release) is tried once in a scratch copy of the repo: build, strict QA, the same 20-page comparison, a look at the pin pictures and the OG images. Adopt it only when the HTML differences are explained and harmless; otherwise write the reason in `seo/notes.md` and try again in three months. The advisories on file concern servers, user input and runtime features that a static site does not use, so this is hygiene, not an emergency. Never during the 14 days after a Google update.
8. Monitors. Which workflow runs failed this month (`gh api repos/ayushsondhisketch/signofnine/actions/runs?per_page=50`), which alerts opened and how long each stayed open, and the lighthouse trend per page type.
9. Open items from `seo/SETUP.md`: list the steps still undone, one line each.
10. Report: the decisions only he can make, in five lines or fewer.

## 14. The weekly health run (Sunday)

Purpose: the one place where the monitors, the Sheet, the checkpoints and the Google update guard are read together, and the one report Ayush gets every week. Do it in this order.

1. `git pull --rebase`. Read `seo/queue.md` (Status line), the top of `seo/notes.md` (the three numbers, the log) and `seo/SETUP.md` (the boxes still open).
2. Monitors. List the pinned issues: `gh api "repos/ayushsondhisketch/signofnine/issues?labels=monitor&state=all&per_page=20" --jq '.[] | [.title, .updated_at] | @tsv'` (works without a login on this public repo). For each of "Monitor: live site", "Monitor: search", "Monitor: performance" and "Monitor: weekly audit" read the body: the overall result and the "Last run" stamp. Stale means older than 2 days (live, search) or 9 days (performance, audit); a stale monitor means its workflow stopped (check `gh api "repos/ayushsondhisketch/signofnine/actions/workflows"` for state `disabled_inactivity`, and the latest runs). Start it yourself: `gh api -X POST repos/ayushsondhisketch/signofnine/actions/workflows/<file>.yml/dispatches -f ref=main` (for `disabled_inactivity`, first `gh api -X PUT repos/ayushsondhisketch/signofnine/actions/workflows/<file>.yml/enable`). `gh workflow run` does not work from a task session because it needs GraphQL. If GitHub refuses the call, tell Ayush to open Actions and run the workflow.
2b. The scheduled tasks. Load `list_triggers` with ToolSearch. The five tasks "Sign of Nine new pages", "Sign of Nine refresh", "Sign of Nine Pinterest pins", "Sign of Nine weekly health" and "Sign of Nine monthly review" must be enabled, with a next run in the future and a last run that did not fail. Report one that is disabled or failed. Never fire a task to catch up (`CLAUDE.md`, rule 6). Without the tool, write "scheduled tasks not checked" and go on.
3. Alerts. `gh api "repos/ayushsondhisketch/signofnine/issues?labels=alert&state=open&per_page=50" --jq '.[] | [.number, .title, .created_at] | @tsv'`. For each open alert, use section 15 to decide: fix it now if it is a page, template or link problem inside the repo (build, strict QA, push), or report it if it needs Ayush or Cloudflare. An alert that has been open more than 7 days is always reported.
4. Search numbers. Open the Sheet (Drive search for "Sign of Nine Search Console") and read the Summary tab. Without the Sheet, use the counts in the "Monitor: search" issue; with neither, the three numbers are "not available yet", and a checkpoint that needs Google's index status is written down as "not judged: Search Console is not connected" (a WebSearch for `site:signofnine.com` is a rough signal only and is never the reason to fail a checkpoint).
5. The three numbers, written at the top of `seo/notes.md` (replace the previous block, keep the log below): the computed-folder index share, the share of sitemap pages with an impression in 28 days, the sitewide position drift. Add the date and the data-through date.
6. Checkpoints (section 6). If a date in the table has passed and has no result in `seo/notes.md`, judge it from the numbers, write "pass" or "fail" with the figures, and apply the "if it fails" action. Then the three warning signals and, from 2027-01-15, the kill rule list.
7. Google updates. Run the guard from `CLAUDE.md`; apply section 7 to any update that ended 28 or more days ago and is not yet marked checked.
8. Shipped this week: `git log --since="7 days ago" --oneline`. Count the pages published and upgraded.
9. Commit only `seo/notes.md` (and `seo/queue.md` if the Status changed or a row moved), with `[CF-Pages-Skip]` in the message so Cloudflare does not rebuild the site for a notes change. `git pull --rebase`, push.
10. Report, which is the digest Ayush reads. At most 12 lines: the three numbers (or "not available yet, Search Console is not connected" with the SETUP step), pages published and upgraded this week, anything paused or in repair mode, alerts open (title and age), checkpoint results, scheduled-task problems, and the decisions or steps that need him. On the first Sunday of a month add the steps in `seo/SETUP.md` still open (three at most, most valuable first). From 2026-11-08 until he says the AdSense application is filed, add whether the site is ready for it (`seo/SETUP.md` section 5). If everything passed and nothing needs him, it is two lines: the three numbers, and what shipped.

## 15. Monitors and alerts: what each one means

| Alert (key) | What it means | What to do |
|---|---|---|
| `live:pages` | A sitemap URL does not return 200, has no or two H1s, no title or canonical, or has noindex | Open the URL with WebFetch. A 404 or 5xx right after a push is a failed deploy: check the Cloudflare build (a QA failure stops it), fix and push. Never remove a URL from the sitemap to silence the alert |
| `live:robots` | robots.txt blocks Googlebot, Bingbot or an assistant crawler (a group that says `Disallow: /` counts even when a later `Allow: /` ties with it), or lost its Sitemap line. A WARN, not an alert, means the live file differs from the repo file | `public/robots.txt` is the source. If the live file differs from the repo, Cloudflare's Bot Preference Sync (the successor of the managed robots.txt) or AI-bot blocking is on: report to Ayush (SETUP section 3). Never copy Cloudflare's lines into the repo file |
| `live:bots` | A named crawler gets a different answer from a browser (403, 429, a challenge page) | Cloudflare bot settings. Report to Ayush with the crawler name; this is the usual way the site would silently disappear from assistants |
| `live:sitemap` | The index or a child sitemap is missing, empty, below 150 URLs or lists a noindex page | Fix `scripts/sitemaps.mjs` or the page that went noindex; rebuild |
| `live:feeds` | A Pinterest feed or one of its pictures does not load, or does not load for Pinterestbot | `node scripts/pins.mjs --check` locally; a picture that fails to render is added to `scripts/pins-skip.txt`. If only Pinterestbot fails, a Cloudflare bot or WAF rule blocks it (Security, Bots): report it to Ayush |
| `live:https-redirect`, `live:www`, `live:trailing-slash` | http does not redirect to https, www answers without redirecting to the apex, or a no-slash URL answers 200 | Redirect rules: `public/_redirects` or Cloudflare (SETUP section 3). A site that answers on two addresses splits its links |
| `live:headers`, `live:speed`, `live:llms`, `live:indexnow-key` | Security headers, response time over 1.5 s, llms.txt or the IndexNow key file missing | `public/_headers`, a heavy page, `public/llms.txt`, the key file under `public/`. Fix in the repo |
| `perf:<path>` | Lighthouse on that page type fell below the alert line (performance 80, LCP 4 s, CLS 0.25) | Find the cause in the pinned issue's failing audits (an image without size, a font, a new script). Fix in the template, not on one page |
| `search:export` | The Search Console export failed (token, permission, API quota) | Read the issue text. A permission error means the service account lost its Full role; report to Ayush |
| `audit:build` | `npm run build` on main fails | Highest priority: nothing can deploy. Read the log tail in the alert, fix, push |
| `audit:qa` | Strict QA has hard failures on main | Fix the page or the template. Never edit `scripts/qa.mjs` |
| `audit:links` | An outside link returns 404, 410 or a dead host | Replace it with a working primary source or remove the sentence that relied on it |
| `audit:pins`, `audit:pins-runway` | The pin queue has problems, or fewer than two days of pins are queued | Run the Pins task steps now |
| `audit:pages` | Fewer indexable pages than last week | Find the commit that removed a page; a deliberate fold needs a 301 |

A warning in a pinned issue is not an alert: read it, fix it when it is cheap, leave it when it is a one-off. An alert closes itself the day after the check passes.


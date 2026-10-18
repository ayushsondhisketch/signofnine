# Notes: what changed and what was measured

One dated line per action, newest at the top of each section. The weekly health task keeps the "Three numbers" block current. Tasks add lines as they work and commit them with the change.

## Three numbers (weekly, from the Search Console Sheet)

First export 2026-10-18 (data through 2026-10-16; the site launched 2026-10-17, so there is no search traffic yet). The weekly task rewrites these three lines every Sunday.

1. Computed-folder index share: 0% (0 of 67 computed pages indexed)
2. Pages with an impression in 28 days: 0% (0 of 159 pages)
3. Sitewide position drift: no data yet

## Checkpoints

(The weekly task writes "YYYY-MM-DD Day N: pass or fail, one line" when it evaluates one. Dates are in `seo/PLAYBOOK.md` section 6.)

## Google updates seen

(Name, start, end, 28-day check done or not.)

- September 2026 spam update: ended 2026-10-08, before the site launched on 2026-10-17. There is no "before" period, so the 28-day comparison does not apply; mark it checked as "not applicable" on 2026-11-05. The 14-day guard on edits to existing pages ran to 2026-10-22.

## Log

- 2026-10-18 Search Console to Sheet is connected. Ayush saved `GSC_SERVICE_ACCOUNT_JSON` and `GSC_SHEET_ID`; the first export (run by hand, 01:02 UTC) passed: property `sc-domain:signofnine.com`, data through 2026-10-16, 159 pages inspected with 0 errors, 3 indexed (the home page, one angel-number page, one life-path page), 86 "discovered, currently not indexed", the rest unknown to Google, no impressions yet. The Sheet's title starts with a space, so a lookup must use `title contains`; `CLAUDE.md` now says so. `seo/SETUP.md` section 1 ticked.
- 2026-10-18 Ayush says `hello@signofnine.com` now exists in Namecheap Private Email; not tested by the agent (it cannot send mail). `seo/SETUP.md` section 3 ticked. The Search Console to Sheet steps (section 1) were walked through in chat; waiting for the two secrets, then the agent runs the first export and checks the Sheet.
- 2026-10-18 The daily rebuild is live: the repository secret `CF_DEPLOY_HOOK` is set. Tested by running the "Daily rebuild" workflow by hand at 00:39 UTC; the feeds' `lastBuildDate` moved from 00:06 to 00:40 UTC, so Cloudflare built the site from the hook. From now one build a day (00:12 UTC) releases the pins that are due. `seo/SETUP.md` section 3 ticked.
- 2026-10-18 The first five pins (one per board) appeared within minutes of saving the feeds. Checked one: Pinterest built it from the feed item with our picture, the feed title, a clean description and the page link plus `?utm_source=Pinterest&utm_medium=organic`.
- 2026-10-18 Pinterest is connected. After Ayush signed in to the built-in browser and said yes to the exact list, the agent created the five public boards with their descriptions and saved the five feeds in Settings, Bulk create Pins, Auto-publish, each to the board of the same name; the settings page lists all five after a reload. The profile shows signofnine.com as a verified domain. Pinterest says new items become pins within 24 hours, so each board should show its first pin by 2026-10-19. Open: the daily rebuild (`CF_DEPLOY_HOOK`) is still not set, so pins reach Pinterest only when something is pushed.
- 2026-10-18 Feed items are now dated 00:00 UTC on their release day (was 06:00), so no item is ever dated after the build that lists it. Build and strict QA pass.
- 2026-10-18 Pins: queued 8 more (queue runs to 2026-10-28; 25 queued, 5 released, one on every board). Pictures looked at, build and pin check pass. Pushed after 00:00 UTC so the life-path and numerology feeds list their first pin before Ayush connects them.
- 2026-10-18 To check at the first refresh (from 2026-11-03): the lead of /articles/how-to-calculate-your-life-path-number/ calls the life path number "the most searched figure in numerology" with no source, and its pin (2026-10-26) repeats that line. Source it or soften it, then queue the pin again with `node scripts/pins.mjs --page`.
- 2026-10-18 The daily live check now requests every feed and one picture per feed as Pinterestbot too (`seo/watch.config.json`, `scripts/watch/live.mjs`), so a Cloudflare bot rule that blocks Pinterest raises an alert within a day.
- 2026-10-18 Ayush created the Pinterest business account (Publisher or media) and claimed the website. The built-in browser was signed out of Pinterest, so creating the five boards and connecting the five feeds waits for his sign-in and a yes to the exact list.
- 2026-10-18 Mail correction: Ayush's DNS records show mail on Namecheap Private Email, so the earlier advice to use Cloudflare Email Routing for `hello@` (and for a Pinterest alias) was wrong, because it replaces the MX records. `seo/SETUP.md` sections 2 and 3 now say to create the mailbox in Private Email.
- 2026-10-18 www redirect is live: Ayush added the proxied `A` record and the "Redirect from WWW to root" rule. The live check, run from GitHub, confirms `www` answers 301 to the same path on the main address and keeps the query string (the check now tests a deep URL with a query string). `seo/SETUP.md` section 3 ticked.
- 2026-10-18 www redirect steps checked against Cloudflare's Pages and Rules docs: a proxied placeholder `A` record for `www` plus the "Redirect from WWW to root" rule; the Pages project needs no change. `seo/SETUP.md` section 3 now says so. Not done yet: www still does not resolve.
- 2026-10-18 Pinterest account rule read on Pinterest's help pages: one email address per account, linked business accounts discontinued. `seo/SETUP.md` section 2 now says Sign of Nine needs its own login address.
- 2026-10-18 Cloudflare "Bot Preference Sync" was switched on (Ayush's screenshot). The live robots.txt was still identical to `public/robots.txt`, checked from outside. Advised off: it writes Cloudflare's own allow and block choices above our file. The daily live check now fails when any robots.txt group says `Disallow: /` for `*`, Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot or PerplexityBot, and warns when the live file differs from the repo file.
- 2026-10-18 Scheduled tasks created (India time): new pages Mon, Wed, Fri 08:47; refresh Tue, Thu 09:38 (does nothing before 2026-11-03); Pinterest pins Mon, Thu 11:12; weekly health Sun 12:27; monthly review on the 2nd, 12:41. Edits to existing pages wait until 2026-10-23 (the September 2026 spam update ended 2026-10-08, plus the 14-day guard), so the first queue row that can run is S-1111 on 2026-10-23, and the first modifier page (M-333-twin-flame) is eligible on 2026-10-26.
- 2026-10-18 Automation set up: CLAUDE.md, `seo/` folder, monitors (live, performance, search, audit), Pinterest feeds and the scheduled tasks. Launch was 2026-10-17 with 161 pages.
- 2026-10-18 Sitemap lastmod no longer falls back to the build date (fixed pages get the launch date; home and the articles index get the newest date in their group). IndexNow now submits only pages whose lastmod is within 2 days.
- 2026-10-18 Pinterest: 5 board feeds at /pins/<board>.xml, 17 pins queued from 2026-10-17 to 2026-10-24; feeds not connected yet (seo/SETUP.md section 2).
- 2026-10-18 Audit finding: `npm audit` lists advisories on astro 5.18 (critical), sharp (high), esbuild (low). None apply to a static site that builds only its own content. Upgrade test is part of the monthly review (PLAYBOOK section 13, item 7).

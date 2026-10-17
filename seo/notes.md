# Notes: what changed and what was measured

One dated line per action, newest at the top of each section. The weekly health task keeps the "Three numbers" block current. Tasks add lines as they work and commit them with the change.

## Three numbers (weekly, from the Search Console Sheet)

Not available yet: the Sheet "Sign of Nine Search Console" does not exist. Until it does, the weekly task writes "no Search Console data" here and the data-driven refresh and band gates stay closed.

1. Computed-folder index share: n/a
2. Pages with an impression in 28 days: n/a
3. Sitewide position drift: n/a

## Checkpoints

(The weekly task writes "YYYY-MM-DD Day N: pass or fail, one line" when it evaluates one. Dates are in `seo/PLAYBOOK.md` section 6.)

## Google updates seen

(Name, start, end, 28-day check done or not.)

- September 2026 spam update: ended 2026-10-08, before the site launched on 2026-10-17. There is no "before" period, so the 28-day comparison does not apply; mark it checked as "not applicable" on 2026-11-05. The 14-day guard on edits to existing pages ran to 2026-10-22.

## Log

- 2026-10-18 www redirect steps checked against Cloudflare's Pages and Rules docs: a proxied placeholder `A` record for `www` plus the "Redirect from WWW to root" rule; the Pages project needs no change. `seo/SETUP.md` section 3 now says so. Not done yet: www still does not resolve.
- 2026-10-18 Pinterest account rule read on Pinterest's help pages: one email address per account, linked business accounts discontinued. `seo/SETUP.md` section 2 now says Sign of Nine needs its own login address.
- 2026-10-18 Cloudflare "Bot Preference Sync" was switched on (Ayush's screenshot). The live robots.txt was still identical to `public/robots.txt`, checked from outside. Advised off: it writes Cloudflare's own allow and block choices above our file. The daily live check now fails when any robots.txt group says `Disallow: /` for `*`, Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot or PerplexityBot, and warns when the live file differs from the repo file.
- 2026-10-18 Scheduled tasks created (India time): new pages Mon, Wed, Fri 08:47; refresh Tue, Thu 09:38 (does nothing before 2026-11-03); Pinterest pins Mon, Thu 11:12; weekly health Sun 12:27; monthly review on the 2nd, 12:41. Edits to existing pages wait until 2026-10-23 (the September 2026 spam update ended 2026-10-08, plus the 14-day guard), so the first queue row that can run is S-1111 on 2026-10-23, and the first modifier page (M-333-twin-flame) is eligible on 2026-10-26.
- 2026-10-18 Automation set up: CLAUDE.md, `seo/` folder, monitors (live, performance, search, audit), Pinterest feeds and the scheduled tasks. Launch was 2026-10-17 with 161 pages.
- 2026-10-18 Sitemap lastmod no longer falls back to the build date (fixed pages get the launch date; home and the articles index get the newest date in their group). IndexNow now submits only pages whose lastmod is within 2 days.
- 2026-10-18 Pinterest: 5 board feeds at /pins/<board>.xml, 17 pins queued from 2026-10-17 to 2026-10-24; feeds not connected yet (seo/SETUP.md section 2).
- 2026-10-18 Audit finding: `npm audit` lists advisories on astro 5.18 (critical), sharp (high), esbuild (low). None apply to a static site that builds only its own content. Upgrade test is part of the monthly review (PLAYBOOK section 13, item 7).

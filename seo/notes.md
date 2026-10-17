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

## Log

- 2026-10-18 Automation set up: CLAUDE.md, `seo/` folder, monitors (live, performance, search, audit), Pinterest feeds and the scheduled tasks. Launch was 2026-10-17 with 161 pages.
- 2026-10-18 Sitemap lastmod no longer falls back to the build date (fixed pages get the launch date; home and the articles index get the newest date in their group). IndexNow now submits only pages whose lastmod is within 2 days.
- 2026-10-18 Pinterest: 5 board feeds at /pins/<board>.xml, 17 pins queued from 2026-10-17 to 2026-10-24; feeds not connected yet (seo/SETUP.md section 2).
- 2026-10-18 Audit finding: `npm audit` lists advisories on astro 5.18 (critical), sharp (high), esbuild (low). None apply to a static site that builds only its own content. Upgrade test is part of the monthly review (PLAYBOOK section 13, item 7).

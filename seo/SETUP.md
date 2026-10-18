# Setup: what only Ayush can do

Everything else runs without him. These steps need his logins, his payment details or his identity, which no task ever enters. Each one says what it unlocks and how long it takes. Tick a box in this file when the step is done (tell the agent in chat, or edit the line); the Health task reads the boxes and mentions an open one once a month.

Order of value: 1 (Search Console data), 2 (Pinterest), 3 (Cloudflare), 4 (Bing), then the dated items in 5.

## 1. Search Console data in a private Sheet (about 15 minutes)

Unlocks: clicks, impressions, positions, queries and the index status of every URL, every day. Without it the Refresh task, the page-two work, the kill rule, the checkpoints and the Pinterest/Google read-out are blind. This is the one step that matters most.

- [ ] Google Cloud: open https://console.cloud.google.com, create a project named `signofnine-seo` (any name works).
- [ ] In that project, APIs and services, Library: enable "Google Search Console API" and "Google Sheets API".
- [ ] IAM and Admin, Service accounts, Create service account: name `signofnine-monitor`, skip the optional role and user steps. Open it, Keys, Add key, Create new key, JSON. A file downloads. Treat it like a password.
- [ ] Search Console (https://search.google.com/search-console), pick the signofnine.com property, Settings, Users and permissions, Add user: paste the service account's email (it ends in `.iam.gserviceaccount.com`), permission Full.
- [ ] Google Sheets: create a blank sheet named `Sign of Nine Search Console`. Share it with the same service account email as Editor. Copy the sheet ID from its address (the long text between `/d/` and `/edit`).
- [ ] GitHub, repository ayushsondhisketch/signofnine, Settings, Secrets and variables, Actions, New repository secret. Two secrets:
  - `GSC_SERVICE_ACCOUNT_JSON`: paste the whole content of the downloaded JSON file.
  - `GSC_SHEET_ID`: the sheet ID.
- [ ] Delete the downloaded JSON file from the computer. Never paste it in a chat.
- [ ] Optional check: Actions, Watch search, Run workflow. A minute later the Sheet fills (tabs Summary, Performance, Queries, Daily, Index) and the pinned issue "Monitor: search" says "Export OK".

The workflow runs every day by itself after that. Search data stays in the private Sheet; the public GitHub issue only gets counts.

## 2. Pinterest (about 20 minutes)

Unlocks: the pin feeds. Angel-number and 2027 searches are strong on Pinterest, and a pin keeps sending visitors for months. `seo/pinterest.md` has the board names, descriptions and feed addresses to paste.

- [x] Create a Pinterest business account (free). Done 2026-10-18, type Publisher or media. Pinterest allows one account per email address and no longer supports linked business accounts.
- [x] Claim the website. Done 2026-10-18 (Settings, Claimed accounts, Website, `signofnine.com`). If it ever has to be redone: the DNS way adds a TXT record in Cloudflare (no code change); the HTML tag way needs the `content` value of `<meta name="p:domain_verify" content="...">` sent to the agent, which sets `pinterestVerify` in `src/site.mjs`.
- [x] Create the five public boards, with the exact names and descriptions in `seo/pinterest.md`. Done 2026-10-18 by the agent in the built-in browser, after Ayush signed in to Pinterest there himself and said yes to the list.
- [x] Connect the five feeds. Done 2026-10-18: Settings, Bulk create Pins, Auto-publish (Pinterest sometimes renames the menu; look for RSS feeds; feeds connect from a desktop browser only), each feed saved to the board of the same name. The feeds are `https://signofnine.com/pins/<board>.xml`; the list is in `seo/pinterest.md`. Pinterest adds new feed items as pins within 24 hours of the feed changing, up to 200 a day.
- [ ] Optional: validate one page in Pinterest's Rich Pins validator so titles and descriptions show on pins.

Still open and optional: the Pinterest account still has a generated username in its address (Settings, Edit profile, Username: `signofnine` gives https://www.pinterest.com/signofnine/), and one page can be checked in the Rich Pins validator. The queue is filled for ten days and tops itself up twice a week.

## 3. Cloudflare (about 15 minutes)

- [x] Make www reach the site, the way Cloudflare documents it for Pages. Done 2026-10-18; the live check confirmed that www redirects to the same path on the main address and keeps the query string. Domain, DNS, Records, Add record: type `A`, name `www`, IPv4 address `192.0.2.1`, proxy status Proxied (orange cloud). Then Rules, Redirect Rules, Create rule, template "Redirect from WWW to root" (by hand: request URL `https://www.*`, target URL `https://${1}`, status 301, preserve query string). The address 192.0.2.1 is a placeholder that nobody reaches, because the redirect answers first at Cloudflare. No change is needed in the Pages project. Unlocks: anyone typing www reaches the site, and links to www pass to the main address. The daily live check tests it.
- [ ] Keep robots.txt in the repository. In Cloudflare's "Manage AI bot access" section turn "Enable Bot Preference Sync" off (it writes Cloudflare's own allow and block choices above our file and cannot express per-crawler rules), make sure "Block AI bots" is off, and turn off "Managed robots.txt" if it still shows. The site's own robots.txt already allows Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot and PerplexityBot. The daily live check compares the live file with the repository file: it fails when a group blocks one of them and warns on any other difference, so a wrong setting shows up within a day.
- [x] Email for `hello@signofnine.com`. Done 2026-10-18: Ayush created the mailbox in Namecheap Private Email (the `mx1` and `mx2.privateemail.com` records, SPF and DKIM sit in Cloudflare DNS). The agent cannot send mail, so no test message has been seen arriving; one from another account is the proof. Do not turn on Cloudflare Email Routing: it replaces the MX records and mail to the domain stops arriving. The contact page and the policy pages publish this address; mail to it must arrive.
- [ ] Web Analytics (free, no cookies, no consent banner): the Pages project, Metrics, Web Analytics, Enable. Unlocks visits by country, by page and by referrer (Pinterest, Bing, ChatGPT, Perplexity), and real-user speed. The agent cannot read it without a token (see 5).
- [x] The daily rebuild: the Pages project, Settings, Builds, Deploy hooks, Add deploy hook (name `daily`, branch `main`), its URL stored as the GitHub repository secret `CF_DEPLOY_HOOK`. Done 2026-10-18 and tested the same day: running the "Daily rebuild" workflow by hand made Cloudflare build the site about a minute later. Unlocks: Pinterest pins go out on their date even on days with no push (the workflow calls the hook at 00:12 UTC, 05:42 India time). Without it the feeds would change only when something is pushed, so pins would reach Pinterest in batches of a few days instead of two a day.

## 4. Bing Webmaster Tools (about 5 minutes)

Unlocks: Bing indexing (which also feeds Copilot, DuckDuckGo and the sources ChatGPT search leans on) and Bing's own clicks and queries.

- [ ] https://www.bing.com/webmasters, sign in, Add a site, "Import from Google Search Console", pick signofnine.com. The sitemap comes with it. IndexNow is already running on every content push.

## 5. Dated and on request

- [ ] AdSense, week five or six (21 to 28 November 2026). The agent says in the Sunday digest when it is due and has the pages ready. Ayush fills in the application himself because it holds his identity and payment details; after approval the agent publishes `ads.txt`, switches the placements on and opens the first computed band.
- [ ] Keyword volumes, monthly. The monthly review lists the exact queries in `seo/queue.md` under Proposed. Run them through KWFinder (United States and United Kingdom) and reply with the volumes; a row needs 1,000 a month to become a page.
- [ ] Optional: a read-only Cloudflare API token ("Account Analytics: Read") as the repository secret `CF_API_TOKEN` plus `CF_ACCOUNT_ID`. With it the agent can read Web Analytics and report Pinterest and AI-assistant referrals in the monthly review.
- [ ] Optional, any time: forward Pinterest analytics (a screenshot or CSV of the last 30 days) to the monthly review chat. The agent has no access to Pinterest's numbers otherwise.

## What runs without him

| What | When (India time) | Where it shows |
|---|---|---|
| New pages (one page, or one upgrade from the queue) | Monday, Wednesday, Friday 08:47 | live on the site; one line in the Sunday digest |
| Refresh (two pages) | Tuesday, Thursday 09:38 | one line in the digest |
| Pins (fills the Pinterest queue) | Monday, Thursday 11:12 | nothing unless the queue stalls |
| Health check and weekly digest | Sunday 12:27 | the digest, three numbers on top |
| Monthly review | 2nd of each month 12:41 | at most five lines of decisions |
| Live-site check (as Googlebot, Bingbot, GPTBot and others) | daily 09:47 | pinned issue "Monitor: live site"; an alert issue emails you on failure |
| Search Console export | daily 11:11 | pinned issue "Monitor: search" and the private Sheet |
| Speed test (Lighthouse, ten page types) | Sunday 03:53 | pinned issue "Monitor: performance" |
| Weekly audit (clean build, strict QA, links, pin queue) | Sunday 02:37 | pinned issue "Monitor: weekly audit" |
| Daily rebuild (asks Cloudflare for one build, so the pins that are due are released) | daily 05:42 | nothing |
| IndexNow (Bing, Yandex and others) | after each push that changes a page | nothing |

GitHub emails you when an `alert` issue opens (Watch the repository, Custom, Issues). Alerts close themselves when the check passes again.

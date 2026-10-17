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

- [ ] Create a Pinterest business account (free) or convert the existing one. Pinterest allows one account per email address and no longer supports linked business accounts, so Sign of Nine needs its own address if the usual one already has an account. An alias such as `pins@signofnine.com` works well: create it in Email Routing the same way as `hello@`, so it forwards to the inbox. If Pinterest refuses the alias, use a new Gmail address.
- [ ] Claim the website: Settings, Claimed accounts, Website, enter `signofnine.com`. Pick either way:
  - the DNS way: Pinterest shows a TXT record; add it in Cloudflare, DNS, Records (no code change needed), then click Verify;
  - the HTML tag way: Pinterest shows `<meta name="p:domain_verify" content="...">`. Send the content value to the agent in chat; it goes into `src/site.mjs` (`pinterestVerify`) and is live two minutes after the push.
- [ ] Create the five public boards, with the exact names and descriptions in `seo/pinterest.md`.
- [ ] Settings, Auto-publish (Pinterest sometimes renames the menu; look for RSS feeds): add the five feeds, each to the board of the same name. The feeds are `https://signofnine.com/pins/<board>.xml`; the list is in `seo/pinterest.md`.
- [ ] Optional: validate one page in Pinterest's Rich Pins validator so titles and descriptions show on pins.

When this is done, tell the agent. It changes the `Feeds:` line in `seo/pinterest.md`. Nothing else changes: the queue is already filled for 10 days and tops itself up twice a week.

## 3. Cloudflare (about 15 minutes)

- [ ] Add `www.signofnine.com` to the Pages project (Workers and Pages, the project, Custom domains, Set up a custom domain), then add the redirect rule "Redirect from WWW to root" (domain, Rules, Redirect Rules, Create rule, pick the template). Unlocks: anyone typing www reaches the site, and links to www pass to the main address.
- [ ] Keep robots.txt in the repository. In Cloudflare's "Manage AI bot access" section turn "Enable Bot Preference Sync" off (it writes Cloudflare's own allow and block choices above our file and cannot express per-crawler rules), make sure "Block AI bots" is off, and turn off "Managed robots.txt" if it still shows. The site's own robots.txt already allows Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot and PerplexityBot. The daily live check compares the live file with the repository file: it fails when a group blocks one of them and warns on any other difference, so a wrong setting shows up within a day.
- [ ] Email for `hello@signofnine.com`: domain, Email, Email Routing, create the address `hello`, send it to your own inbox, confirm the verification mail. The contact page and the policy pages publish this address; mail to it must arrive.
- [ ] Web Analytics (free, no cookies, no consent banner): the Pages project, Metrics, Web Analytics, Enable. Unlocks visits by country, by page and by referrer (Pinterest, Bing, ChatGPT, Perplexity), and real-user speed. The agent cannot read it without a token (see 5).
- [ ] Optional, for the daily rebuild: the Pages project, Settings, Builds, Deploy hooks, Add deploy hook (name `daily`, branch `main`). Copy the URL into a GitHub repository secret named `CF_DEPLOY_HOOK`. Unlocks: Pinterest pins go out on their date even on days with no push. Without it, pins go out on the next push, which is usually within a day or two.

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
| IndexNow (Bing, Yandex and others) | after each push that changes a page | nothing |

GitHub emails you when an `alert` issue opens (Watch the repository, Custom, Issues). Alerts close themselves when the check passes again.

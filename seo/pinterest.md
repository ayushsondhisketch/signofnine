# Pinterest: boards, feeds and the rules for the Pins task

Pinterest is a search engine for people who save things, and angel numbers and 2027 numerology are searched there all year. Pins also keep working for months, so a pin made today can still send readers in spring. The site feeds Pinterest by RSS: each board has one feed, and Pinterest turns every new feed item into a pin.

## Status

Edit these lines when Ayush says a step is done. The Health task reports the open ones once in the Sunday digest, not every week.

- Business account: not confirmed
- Website claimed: no
- Boards created: no
- Feeds: not connected

While Feeds says "not connected", the Pins task still keeps the queue filled (pins are cheap to make and a connected feed shows the latest seven days, never fewer than three pins). Nothing else changes.

## Boards and feeds

Create each board as public, with this exact name and description, then connect the feed at the same row. Names carry the search terms; do not shorten them.

| Board | Feed URL | Description |
|---|---|---|
| Angel Number Meanings | https://signofnine.com/pins/angel-numbers.xml | What 111, 222, 333, 444, 555, 777, 1111 and every other angel number means in numerology, with the arithmetic shown and the tradition named. |
| Angel Numbers for Love and Twin Flames | https://signofnine.com/pins/love-twin-flame.xml | What angel numbers mean in love, relationships, breakups and twin flame journeys, read as the numerology tradition reads them. |
| Life Path Numbers and Compatibility | https://signofnine.com/pins/life-path.xml | The meaning of each life path number, how to work yours out from your date of birth, and how the numbers pair. |
| 2027 Numerology and Personal Year Numbers | https://signofnine.com/pins/numerology-2027.xml | What 2027 holds for each personal year number, and why 2027 is an 11/2 universal year. |
| Numerology Basics and Number Meanings | https://signofnine.com/pins/numerology.xml | Numerology explained in plain English: number meanings 0 to 9 and the master numbers, birthday numbers, the letter chart and the two main systems. |

The names and descriptions live in `src/lib/pinboards.mjs`. Change them there first if a board ever needs a new name, then tell Ayush to match the board.

## How a pin is made

- Two styles. Ring: the number in a gold ring with the page's headline and first sentence. Question: a question the page answers, with the first sentence of the answer.
- Every word on a pin is already on the page it links to. A pin never promises more than the page gives. The pin link is the page URL, or an anchor to the question it answers.
- The picture is 1000 x 1500, drawn at build time into `public/pins/<id>.png` (not committed). A pin lints for length, no em dashes, no exclamation marks and no words from the QA blocklist.
- Release date. A pin shows in its board feed from its date in `src/data/pins.json` (UTC) for seven days. Feeds only change when the site is built: any push does it, and the daily rebuild does it when Ayush has set the `CF_DEPLOY_HOOK` secret (SETUP.md).

## Pace

Two pins a day across all boards for the first 30 days, then up to three only if the Pinterest numbers Ayush shares (or referral traffic in Search Console and analytics) show pins being saved. Never more than three on one day: `--check` fails the build above that. Pinterest rewards steady posting, and a burst looks like spam.

From 1 November to 31 January, at least one pin in three comes from the 2027 material (personal year pages, the universal year 11 article) on the 2027 board. In the other months those pins drop to one in six.

## Rules for the Pins task (Monday and Thursday)

1. `git pull --rebase`, `npm ci`, `npm run build`. Candidates are read from the built pages, so the build comes first.
2. `node scripts/pins.mjs --status`. Note the date the queue runs to.
3. Pages published or changed since the last run get their own pins first: `node scripts/pins.mjs --page /angel-numbers/xxx/ --per-day 2` (the meaning pin, then its first question pin). `git log --since="4 days ago" --name-only -- src/content` lists them.
4. Top up: `node scripts/pins.mjs --days-ahead 10 --per-day 2`. Never leave fewer than five days queued; never queue more than fourteen (older pins cannot be adjusted for a Google update or a page change).
5. A seasonal or manual pin goes in with `--add` (see the header of `scripts/pins.mjs`); it must pass the same lint.
6. `node scripts/pins.mjs --render`, then open three of the new pictures in `public/pins/` and look at them. Text must not touch an edge, a number ring must not overlap text, nothing may be cut off. If one fails, add its id to `scripts/pins-skip.txt` and top up again.
7. `npm run build` must pass (it runs `pins.mjs --check`). Commit `src/data/pins.json` and `scripts/pins-skip.txt` only, with the queue notes in `seo/notes.md`. Push after `git pull --rebase`.
8. If the Status line in `seo/queue.md` says PAUSED, or a Google update is rolling out and a page is being reworked, run `node scripts/pins.mjs --shift N` for the days lost, so no pin goes out for a page in repair.
9. Never pin a page that is noindex, being rewritten, or not yet live. `--check` fails if one is queued.

## What this cannot see

The agent has no access to Pinterest analytics. Saves and outbound clicks are visible only inside Ayush's account. What the agent can read is referral traffic from pinterest.com (Search Console does not show it; the analytics tool does once Ayush installs one) and whether pins from the domain appear at https://www.pinterest.com/source/signofnine.com/. If the pins do not show there two weeks after the feeds are connected, ask Ayush to open Settings, Auto-publish, and tell us what the feed status says.

Status: running

# Publishing queue

How to use it: the New pages task (Monday, Wednesday, Friday) takes the first row under Next whose gate is met, builds it to `seo/PLAYBOOK.md` section 2, moves it to Done, and stops. One row per run. If no row is eligible, publish nothing and say why. Never take two rows to catch up.

Types: `new` is a new indexable URL (needs a volume figure in the row). `upgrade` changes an existing page. `seasonal` is an upgrade with a live-by date: if the date has passed, move the row to the end with the year changed and skip it this year.

Gates: `date` = not before that day. `parent` = the parent page shows as indexed in the Index tab of the Search Console Sheet (if there is no Sheet yet, the date gate alone applies). `volume` = a US plus UK figure from Ahrefs or KWFinder written in the row. `impressions` = the Summary tab shows the page with impressions for the phrasing.

## Next

- [M-333-twin-flame] new | /angel-numbers/333/twin-flame/ | gate: date 2026-10-26 | volume: cluster "333 angel number meaning twin flame" 5,530 a month, 14 keywords, current top page 2,000 visits, KD 0 (Ahrefs, 17 Oct 2026) | The number page keeps a short summary section that links to the new page; the new page carries the full reading (1,500 words or more). Title carries "333 Angel Number Twin Flame Meaning". Intent model: twin flame (meeting, reunion, separation, union), time, what to do. Check URL form against the folder rules in the checklist before building.
- [M-555-twin-flame] new | /angel-numbers/555/twin-flame/ | gate: date 2026-10-28 | volume: 5,150 a month, 15 keywords, top page 1,700 visits, KD 0 | Same intent model as 333, written for this number alone: its own tradition readings, its own named verse or book, its own pairs. Start from the template, never from another modifier page; QA fails a pair above 20 percent overlap.
- [T-444] upgrade | /angel-numbers/444/ | gate: none | Same template gaps as T-222.
- [M-222-twin-flame] new | /angel-numbers/222/twin-flame/ | gate: date 2026-11-02 | volume: 7,370 a month, 16 keywords, top page 3,100 visits, KD 28 | Same intent model as 333, written for this number alone: its own tradition readings, its own named verse or book, its own pairs. Start from the template, never from another modifier page; QA fails a pair above 20 percent overlap.
- [T-333] upgrade | /angel-numbers/333/ | gate: none | Same template gaps; shorten the twin flame section to a summary once M-333-twin-flame is live.
- [M-444-love] new | /angel-numbers/444/love/ | gate: date 2026-11-06 | volume: 9,580 a month, 15 keywords, top page 5,100 visits, KD 34 | Same shape; intent: love, single, crush, ex, soulmate, relationship.
- [T-555] upgrade | /angel-numbers/555/ | gate: none | Same template gaps (Psalm 55:5 and Isaiah 55:5 are the verses Google pairs with 555); shorten the twin flame section once M-555-twin-flame is live.
- [S-1212] seasonal upgrade | /angel-numbers/1212/ | gate: none | live by 2026-11-28 | Dated section "1212 and 12/12". The People Also Ask data shows "Can I make a wish at 12:12?"; answer it.
- [M-777-love] new | /angel-numbers/777/love/ | gate: date 2026-11-13 | volume: 3,600 a month, 9 keywords, top page 900 visits, KD 32 | Marginal: the top page draws 900 visits against the 800 floor for a separate URL. Build only if the number page 777 shows impressions in the Summary tab by then; otherwise move to Parked.
- [T-111] upgrade | /angel-numbers/111/ | gate: none | Same template gaps.
- [S-111] seasonal upgrade | /angel-numbers/111/ | gate: none | live by 2026-12-21 | Dated section "111 and 1/11".
- [T-1111] upgrade | /angel-numbers/1111/ | gate: after S-1111 | Same template gaps (Proverbs 11:11 and Matthew 11:11 are the paired verses); this is also the 11:11 page, so check the wording against /angel-numbers/times/11-11/ for overlap.
- [T-777] [T-888] [T-999] [T-666] [T-1212] upgrade | the five remaining angel pages, one per run | gate: none | Same template gaps.
- [S-222] seasonal upgrade | /angel-numbers/222/ | gate: none | live by 2027-01-28 | Dated section "222 and 2/22".

## Proposed (need a volume figure before they can be built)

Ayush is asked each month to run a KWFinder check (US and UK, the exact queries) for the rows here. Move a row to Next once its figure is written in and clears 1,000 a month (editorial) or 100 (computed).

- [N-karmic] new | Karmic debt numbers 13/4, 14/5, 16/7, 19/1 with a detector that says which of your numbers carry a debt | Gap: the SERP is thin outside Bustle and a few Indian astrology sites; no page tells the reader which of their own numbers carry a debt. Needs the detector in `src/lib/numerology.mjs` (the engine already has the reduction steps), so the page and the calculator ship together.
- [N-house] new | House and apartment number numerology with a calculator that handles unit letters (2E, 4B) | Gap: no calculator on page one; the unit-letter rules are what readers ask Reddit. Needs a calculator and a page set for 1 to 9, 11, 22, 33 and 13.
- [N-wedding] new | Wedding date numerology with a 2027 and 2028 calendar and a two-date calculator | Gap: two small calculators rank, nobody ships the computed calendar; sits next to wedding affiliate money (home and wedding products, not psychics).
- [N-ex-returning] new | Angel numbers for an ex coming back (hub) | Evidence: 14 People Also Ask questions on breakups and exes; 49 "which number means" questions across the clusters.
- [N-1111-love] new | /angel-numbers/1111/love/ | Evidence: 69,290 searches a month in the cluster, 15 keywords, KD 12, but the page that ranks draws 900 visits because the Overview answers it. Build last, and only when the 1111 page shows impressions for the love phrasings (Summary tab).
- [N-origin] new | Where angel numbers come from (Doreen Virtue, 2005, and what came before) | A link and mention candidate, not a volume play. Needs Ayush's approval as an exception to the volume floor.
- [N-pairs] computed | Angel number pair pages (222 and 333, 111 and 1111, 333 and 444 ...) | Evidence: 448 unique keywords name two numbers, 8,380 searches a month; the top twelve pairs run from 820 down to 190. A band, so it waits for AdSense approval and for the first band to be half indexed. Needs a `composePair` in `src/lib/compose.mjs` and a route.
- [N-times] computed | The rest of the clock times | Needs the "11:11 meaning", "3:33 meaning" and five random time exports first (the Ahrefs files match "angel number" only).

## Parked

(nothing yet)

## Done

- 2026-10-26 [T-222] /angel-numbers/222/ | added "The numerology, origin and zodiac link of 222" (Virtue 2005, digit 2 to Moon to Cancer, attributed); Isaiah 22:22 already named in the biblical section. Gap: the SERP names no book or zodiac link.
- 2026-10-23 [S-1111] /angel-numbers/1111/ | added "What is the 11/11 portal?" (date arithmetic, Armistice and Singles' Day context, link to /angel-numbers/times/11-11/) and FAQ "Is 11/11 a lucky day?"; two pins queued for 2026-11-09 and 2026-11-11.
- 2026-10-17 launch: 161 pages (11 angel-number pages, 8 hubs, 8 articles, 13 number meanings, 12 life path pages, 12 compatibility pages, 11 personal year pages, 4 core number guides, 31 birthday numbers, 20 four-digit numbers, 14 clock times, calculators and fixed pages).

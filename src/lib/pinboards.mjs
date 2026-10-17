// The Pinterest boards, and the rule for which queued pins a board's feed lists right now.
// Shared by the feed pages (src/pages/pins/[board].xml.js) and scripts/pins.mjs, so the build and the checks agree.
import { SITE } from '../site.mjs';

// One RSS feed per board at /pins/<key>.xml. The owner creates each board on Pinterest with this name and description
// and connects the feed to it (see seo/pinterest.md).
export const BOARDS = {
  'angel-numbers': {
    name: 'Angel Number Meanings',
    about: 'What 111, 222, 333, 444, 555, 777, 1111 and every other angel number means in numerology, with the arithmetic shown and the tradition named.',
  },
  'love-twin-flame': {
    name: 'Angel Numbers for Love and Twin Flames',
    about: 'What angel numbers mean in love, relationships, breakups and twin flame journeys, read as the numerology tradition reads them.',
  },
  'life-path': {
    name: 'Life Path Numbers and Compatibility',
    about: 'The meaning of each life path number, how to work yours out from your date of birth, and how the numbers pair.',
  },
  'numerology-2027': {
    name: '2027 Numerology and Personal Year Numbers',
    about: 'What 2027 holds for each personal year number, and why 2027 is an 11/2 universal year.',
  },
  numerology: {
    name: 'Numerology Basics and Number Meanings',
    about: 'Numerology explained in plain English: number meanings 0 to 9 and the master numbers, birthday numbers, the letter chart and the two main systems.',
  },
};

export const FEED_DAYS = 7; // a feed lists pins released in the last 7 days
export const FEED_FLOOR = 3; // and never fewer than the 3 latest released pins, so a connected feed is not empty

export const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => isoDay(Date.parse(`${iso}T00:00:00Z`) + n * 86400000);

/** The pins a board's feed lists at time `now`: released in the last 7 days, newest first, at least the latest 3. */
export function dueItems(pins, board, now = Date.now()) {
  const today = isoDay(now);
  const from = addDays(today, -FEED_DAYS);
  const due = pins
    .filter((p) => p.board === board && p.date <= today)
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1));
  const recent = due.filter((p) => p.date >= from);
  return recent.length >= FEED_FLOOR ? recent : due.slice(0, FEED_FLOOR);
}

export const pinLink = (p) => `${SITE.url}${p.page}${p.anchor ? `#${p.anchor}` : ''}`;
export const pinImage = (p) => `/pins/${p.id}.png`;

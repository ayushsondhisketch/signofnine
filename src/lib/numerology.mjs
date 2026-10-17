// The one numerology engine. It runs at build (Node) and in the browser (lookup, calculators),
// so every number on the site is reduced the same way. Pythagorean system throughout.

export const MASTERS = [11, 22, 33];

/** Digits of a string, ignoring anything that is not 0-9. */
export function digitsOf(input) {
  return String(input).replace(/\D/g, '').split('').map(Number);
}

export function sumDigits(n) {
  return digitsOf(n).reduce((a, b) => a + b, 0);
}

/** Reduce to a single digit; master numbers stay unless keepMasters is false. */
export function reduce(n, keepMasters = true) {
  let x = Number(n);
  while (x > 9 && !(keepMasters && MASTERS.includes(x))) x = sumDigits(x);
  return x;
}

/** The full reduction chain: 1234 -> [10, 1]; 555 -> [15, 6]; 7 -> []. */
export function chain(n, keepMasters = true) {
  const steps = [];
  let x = Number(n);
  while (x > 9 && !(keepMasters && MASTERS.includes(x))) {
    x = sumDigits(x);
    steps.push(x);
  }
  return steps;
}

/** "5 + 5 + 5 = 15 → 6" for any digit string. Single digits return "". */
export function working(input, keepMasters = true) {
  const d = digitsOf(input);
  if (d.length < 2) return '';
  const total = d.reduce((a, b) => a + b, 0);
  const steps = chain(total, keepMasters);
  let s = `${d.join(' + ')} = ${total}`;
  for (const st of steps) s += ` → ${st}`;
  return s;
}

/** The single-digit root, never a master (for positions, tarot, planet). */
export function root(input) {
  return reduce(sumDigits(input), false);
}

/** The reduced value keeping masters (what the tradition calls the core number). */
export function core(input) {
  const total = sumDigits(input);
  return reduce(total, true);
}

export function isMaster(n) {
  return MASTERS.includes(Number(n));
}

/** Master numbers that appear inside a string, e.g. 1111 contains 11; 2222 contains 22. */
export function mastersInside(input) {
  const s = String(input).replace(/\D/g, '');
  const found = new Set();
  for (const m of MASTERS) if (s.includes(String(m))) found.add(m);
  return [...found];
}

/** Repeated-digit numbers: 555 -> 5555 sibling, 5:55 clock form, 5/5 date form. */
export function forms(input) {
  const s = String(input).replace(/\D/g, '');
  const out = { clock: null, sibling: null, date: null, triple: null };
  if (/^(\d)\1\1$/.test(s)) {
    out.sibling = s + s[0];
    out.clock = `${s[0]}:${s[0]}${s[0]}`;
    out.date = `${s[0]} ${MONTHS[Number(s[0]) - 1] || ''}`.trim();
  } else if (/^(\d)\1\1\1$/.test(s)) {
    out.triple = s.slice(0, 3);
    const hh = Number(s.slice(0, 2));
    const mm = Number(s.slice(2));
    if (hh <= 23 && mm <= 59) out.clock = `${hh}:${s.slice(2)}`;
  } else if (s.length === 4) {
    const hh = Number(s.slice(0, 2));
    const mm = Number(s.slice(2));
    if (hh <= 23 && mm <= 59) out.clock = `${hh}:${s.slice(2)}`;
  }
  return out;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Parse "11:11", "1111", "23:23" as a clock time. Returns null when it is not a valid time. */
export function parseTime(input) {
  const s = String(input).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  const digits = (m[1] + m[2]).split('').map(Number);
  return { h, m: mm, label: `${h}:${m[2]}`, slug: `${h}-${m[2]}`, digits, sum: digits.reduce((a, b) => a + b, 0), twelveHour: h === 0 ? `12:${m[2]} am` : h < 12 ? `${h}:${m[2]} am` : h === 12 ? `12:${m[2]} pm` : `${h - 12}:${m[2]} pm` };
}

export function timeFromSlug(slug) {
  const m = String(slug).match(/^(\d{1,2})-(\d{2})$/);
  return m ? parseTime(`${m[1]}:${m[2]}`) : null;
}

/** Working for a day or month: master numbers are kept, two-digit values are added and reduced. */
function partWork(n) {
  if (MASTERS.includes(n)) return `${n} (kept as a master number)`;
  if (n > 9) return `${String(n).split('').join(' + ')} = ${sumDigits(n)}${chain(sumDigits(n)).map((s) => ` → ${s}`).join('')}`;
  return String(n);
}

/** Life path from a date. Method 1 reduces day, month and year separately (the site's method); method 2 adds every digit. */
export function lifePath(day, month, year) {
  const d = Number(day), m = Number(month), y = Number(year);
  if (!valid(d, m, y)) return null;
  const rd = reduce(d), rm = reduce(m);
  const ySum = sumDigits(y);
  const ry = reduce(ySum);
  const total1 = rd + rm + ry;
  const m1 = reduce(total1);
  const allDigits = sumDigits(`${d}${m}${y}`);
  const m2 = reduce(allDigits);
  return {
    day: d, month: m, year: y,
    rd, rm, ry, ySum,
    method1: { total: total1, result: m1, steps: chain(total1) },
    method2: { total: allDigits, result: m2, steps: chain(allDigits) },
    result: m1,
    disagree: m1 !== m2,
    dayWork: partWork(d),
    monthWork: partWork(m),
    yearWork: `${String(y).split('').join(' + ')} = ${ySum}${chain(ySum).map((s) => ` → ${s}`).join('')}`,
    sumWork: `${rd} + ${rm} + ${ry} = ${total1}${chain(total1).map((s) => ` → ${s}`).join('')}`,
  };
}

export function valid(d, m, y) {
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return false;
  if (y < 1 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= dim;
}

/** Birthday number: the day of the month reduced, masters kept (11, 22). */
export function birthdayNumber(day) {
  return reduce(Number(day));
}

/** The working for a birthday number: '' for 1 to 9, the kept master for 11 and 22, otherwise the digit sum and reduction. */
export function birthdayWork(day) {
  const d = Number(day);
  if (d <= 9) return '';
  if (MASTERS.includes(d)) return `${d} is kept as a master number rather than reduced to ${sumDigits(d)}`;
  return working(String(d));
}

/** Universal year: the calendar year reduced, master kept (2027 = 11). */
export function universalYear(year) {
  return reduce(sumDigits(year));
}

/** Personal year: reduced day + reduced month + reduced universal year, then reduced. */
export function personalYear(day, month, year = 2027) {
  const rd = reduce(Number(day), false), rm = reduce(Number(month), false);
  const uy = reduce(sumDigits(year), false);
  const total = rd + rm + uy;
  return { result: reduce(total), total, rd, rm, uy, work: `${rd} + ${rm} + ${uy} = ${total}${chain(total).map((s) => ` → ${s}`).join('')}` };
}

// Pythagorean letter values. Chaldean values are kept for the article that compares the systems.
export const PYTHAGOREAN = { a: 1, j: 1, s: 1, b: 2, k: 2, t: 2, c: 3, l: 3, u: 3, d: 4, m: 4, v: 4, e: 5, n: 5, w: 5, f: 6, o: 6, x: 6, g: 7, p: 7, y: 7, h: 8, q: 8, z: 8, i: 9, r: 9 };
export const CHALDEAN = { a: 1, i: 1, j: 1, q: 1, y: 1, b: 2, k: 2, r: 2, c: 3, g: 3, l: 3, s: 3, d: 4, m: 4, t: 4, e: 5, h: 5, n: 5, x: 5, u: 6, v: 6, w: 6, o: 7, z: 7, f: 8, p: 8 };

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Letters of a name with a vowel/consonant flag. Y is a vowel when it has no other vowel beside it. */
export function letters(name) {
  const clean = String(name).toLowerCase().replace(/[^a-z]/g, '');
  const arr = clean.split('');
  return arr.map((ch, i) => {
    let vowel = VOWELS.has(ch);
    if (ch === 'y') {
      const prev = arr[i - 1], next = arr[i + 1];
      vowel = !(VOWELS.has(prev) || VOWELS.has(next));
    }
    return { ch, value: PYTHAGOREAN[ch] || 0, vowel };
  });
}

function nameNumber(name, filter) {
  const ls = letters(name).filter(filter);
  const total = ls.reduce((a, l) => a + l.value, 0);
  return { letters: ls, total, result: reduce(total), steps: chain(total), work: ls.length ? `${ls.map((l) => l.value).join(' + ')} = ${total}${chain(total).map((s) => ` → ${s}`).join('')}` : '' };
}

export const expressionNumber = (name) => nameNumber(name, () => true);
export const soulUrgeNumber = (name) => nameNumber(name, (l) => l.vowel);
export const personalityNumber = (name) => nameNumber(name, (l) => !l.vowel);

/** The twelve numbers the site treats as life paths. */
export const LIFE_PATHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

/** Compatibility rating between two life paths, as the tradition usually gives it. 3 = natural, 2 = workable, 1 = demanding. */
const PAIRS = {
  '1-1': 2, '1-2': 2, '1-3': 3, '1-4': 1, '1-5': 3, '1-6': 2, '1-7': 3, '1-8': 1, '1-9': 2,
  '2-2': 3, '2-3': 2, '2-4': 3, '2-5': 1, '2-6': 3, '2-7': 2, '2-8': 3, '2-9': 2,
  '3-3': 2, '3-4': 1, '3-5': 3, '3-6': 3, '3-7': 2, '3-8': 1, '3-9': 3,
  '4-4': 2, '4-5': 1, '4-6': 3, '4-7': 3, '4-8': 3, '4-9': 1,
  '5-5': 2, '5-6': 1, '5-7': 3, '5-8': 2, '5-9': 3,
  '6-6': 2, '6-7': 1, '6-8': 3, '6-9': 3,
  '7-7': 3, '7-8': 1, '7-9': 2,
  '8-8': 2, '8-9': 1,
  '9-9': 2,
};

/** Masters are read on their base (11 as 2, 22 as 4, 33 as 6) with a note. */
export function baseOf(n) {
  const x = Number(n);
  return x === 11 ? 2 : x === 22 ? 4 : x === 33 ? 6 : x;
}

export function compatibility(a, b) {
  const x = baseOf(a), y = baseOf(b);
  const key = x <= y ? `${x}-${y}` : `${y}-${x}`;
  const rating = PAIRS[key] || 2;
  return { a: Number(a), b: Number(b), baseA: x, baseB: y, rating, label: rating === 3 ? 'Natural match' : rating === 2 ? 'Workable' : 'Demanding' };
}

/** Pairs people ask about for an angel number: its neighbours and the big four. */
export function askedPairs(numStr) {
  const s = String(numStr);
  const big = ['111', '222', '333', '444', '555', '666', '777', '888', '999', '1111', '1212'];
  return big.filter((n) => n !== s);
}

export function slugForNumber(input) {
  const s = String(input).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) return `times/${s.replace(':', '-')}`;
  return s.replace(/\D/g, '');
}

/** Read time in minutes from a word count. */
export function readTime(words) {
  return Math.max(2, Math.round(words / 230));
}

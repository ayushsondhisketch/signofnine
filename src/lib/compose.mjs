// Composes the computed pages (four-digit numbers, clock times, birthday numbers) from their data files.
// Everything specific to a number is written by hand in the data file; this module adds the arithmetic,
// the digit composition and the honest paragraph, and it varies the shared wording so no two pages read alike.
import digits from '../data/digits.json';
import { working, core, root, digitsOf, mastersInside, forms, parseTime, reduce, sumDigits, chain, birthdayWork } from './numerology.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16; return h >>> 0; }
const pick = (arr, seed, salt = 0) => arr[(hash(seed) + salt) % arr.length];
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// The honest paragraph: the same fact, five ways. Shared skeleton is allowed here and nowhere else.
const HONEST = [
  (n, extra) => `Start with the ordinary explanation. Once ${n} has your attention, your brain flags every later sighting and skips the thousands of other numbers you passed without noticing. Psychologists call this the frequency illusion, and it is the reason a number seems to appear everywhere in the same week.${extra}`,
  (n, extra) => `The plain reason comes first. You noticed ${n} once, and from that moment your attention started collecting it: the receipt, the plate, the clock. The thousands of numbers that were not ${n} slipped past unrecorded. That selection effect has a name, the frequency illusion, and it is not a sign of anything except how attention works.${extra}`,
  (n, extra) => `Before the reading, the mechanism. Nobody counts the numbers they see in a day, so nobody notices that ${n} came up no more often than 3,817. What changes is that ${n} now has a hook in your memory, and every sighting sets it. The frequency illusion is the term for that, and it explains most of the feeling that a number is following you.${extra}`,
  (n, extra) => `First, what is not happening: ${n} is not appearing more often. What is happening is that you have started to look. Attention works like a filter, and a number you care about passes through it while the rest are discarded; the pattern is in the noticing, not in the world. Psychologists call this the frequency illusion.${extra}`,
  (n, extra) => `Take the dull explanation seriously, because it is usually the right one. A number becomes meaningful, attention locks on to it, and from then on every sighting is kept and every non-sighting is thrown away. That is the frequency illusion, and it is strong enough that people are often surprised when they count.${extra}`,
];

const TRADITION_OPEN = [
  (n) => `If you want to read ${n} as a message anyway, this is what the tradition says.`,
  (n) => `With that said, the angel-number tradition has a reading for ${n}, and here it is.`,
  (n) => `What the tradition reads into ${n} follows, stated as a reading and not as a fact.`,
  (n) => `For readers who take the sighting as a sign, the tradition reads ${n} like this.`,
  (n) => `None of that stops ${n} from being a useful prompt, which is how the tradition treats it.`,
];

const COMPOSE_OPEN = [
  (n) => `Built from the digits, the reading goes like this.`,
  (n) => `Taken apart, ${n} is simple arithmetic.`,
  (n) => `Each digit brings its own meaning in the Pythagorean system.`,
  (n) => `Its parts explain the whole.`,
  (n) => `Here is where the meaning comes from.`,
];

const DO_BANK = [
  (n) => `Write down the moment. Note what you were thinking when you saw ${n}. After ten sightings the notes tell you more than any single one.`,
  (n) => `Name the question. Most people who see ${n} already have a decision pending. Say what it is in one sentence.`,
  (n) => `Give it a week. If the sightings stop once you have noticed them, that was attention. If they keep coming after you stop looking, treat the prompt as worth answering.`,
  (n) => `Act small. The tradition reads ${n} as a cue to begin, not to overhaul. One call, one application, one honest conversation.`,
  (n) => `Check the clock habit. If you see ${n} mostly as a time, note whether it is the same time each day. A routine explains more than a message does.`,
  (n) => `Read the core number. ${n} reduces to a single digit, and that digit's page says what the tradition expects of you in plainer terms.`,
];

// `asTime` phrases the parts differently, so a clock time and its number do not share the paragraph word for word.
function composeDigits(n, asTime = false) {
  const ds = digitsOf(n);
  const counts = {};
  for (const d of ds) counts[d] = (counts[d] || 0) + 1;
  // The phrasing of each part varies with the digits and their order, so mirror numbers (1221 and 1122) and a number and its clock form never share the sentence.
  const variant = ds.reduce((a, d, i) => a + Number(d) * (i + 1), 0) % 3;
  const phrase = asTime
    ? [(d, t, l) => `The ${d}, appearing ${t}, stands for ${l}`, (d, t, l) => `A ${d}, seen ${t}, is read as ${l}`, (d, t, l) => `${d} is there ${t}, and the tradition reads it as ${l}`][variant]
    : [(d, t, l) => `${d} appears ${t} and brings ${l}`, (d, t, l) => `The ${d}, seen ${t}, carries ${l}`, (d, t, l) => `A ${d} occurs ${t}, and the tradition reads it as ${l}`][variant];
  const parts = Object.entries(counts).map(([d, c]) => {
    const info = digits[d];
    const times = c === 1 ? 'once' : c === 2 ? 'twice' : c === 3 ? 'three times' : c === 4 ? 'four times' : `${c} times`;
    return phrase(d, times, lower(info.line));
  });
  const c = core(n);
  const w = working(n);
  const masters = mastersInside(n).filter((m) => String(n).length > 2);
  let s = asTime
    ? `On the clock the digits read the same way as the number. ${parts.join('. ')}.`
    : `${pick(COMPOSE_OPEN, n)(n)} ${parts.join('. ')}.`;
  if (parts.length > 3) s += '</p><p>';
  else s += ' ';
  s += asTime
    ? `The digits add up, ${w}, which makes ${c} the core of the time: ${lower(digits[String(c)].line)}.`
    : `Added together, ${w}, so the core of ${n} is ${c}: ${lower(digits[String(c)].line)}.`;
  if (masters.length) s += ` The sequence also holds ${masters.join(' and ')}, ${masters.length > 1 ? 'master numbers' : 'a master number'} the tradition reads as ${lower(digits[String(masters[0])].keywords.slice(0, 2).join(' and '))}.`;
  return s;
}

function section(id, heading, html) {
  return { id, heading, html: `<section aria-labelledby="${id}"><h2 id="${id}">${esc(heading)}</h2>${html}</section>` };
}
const p = (s) => `<p>${s}</p>`;

function assemble(sections) {
  const out = [];
  sections.forEach((s, i) => {
    if (i === 2) out.push('<div class="ad ad--strip" data-ad="strip" aria-hidden="true"></div>');
    out.push(s.html);
  });
  return { html: out.join('\n'), headings: sections.map((s) => ({ depth: 2, slug: s.id, text: s.heading })) };
}

/** A four-digit (or other computed) angel number from src/data/fourdigit.json. */
export function composeFourDigit(item, { lineFor }) {
  const n = item.number;
  const sp = item.specifics;
  const f = forms(n);
  const sections = [];
  sections.push(section('meaning', `What ${n} means`, sp.meaning + p(composeDigits(n))));
  const extra = f.clock ? ` Clock times make it worse: ${f.clock} comes round every day.` : '';
  sections.push(section('seeing', `Why you keep seeing ${n}`, p(pick(HONEST, n)(n, extra)) + p(pick(TRADITION_OPEN, n, 1)(n) + ' ' + sp.seeing)));
  const doItems = [pick(DO_BANK, n, 0), pick(DO_BANK, n, 2), pick(DO_BANK, n, 4)].filter((v, i, a) => a.indexOf(v) === i).map((fn) => `<li>${fn(n)}</li>`).join('');
  sections.push(section('do', `What to do when you see ${n}`, (sp.do ? (sp.do.startsWith('<') ? sp.do : p(sp.do)) : '') + `<ul>${doItems}</ul>`));
  if (sp.love) sections.push(section('love', `${n} in love and relationships`, sp.love));
  if (sp.twin) sections.push(section('twin-flame', `${n} and twin flames`, sp.twin));
  if (sp.work) sections.push(section('money', `${n} for money and career`, sp.work));
  if (sp.spiritual) sections.push(section('spiritual', `${n} spiritual meaning`, sp.spiritual));
  if (sp.warning) sections.push(section('warning', `Is ${n} a warning?`, sp.warning));
  if (sp.time) sections.push(section('clock', `${n} on the clock`, sp.time));
  const { html, headings } = assemble(sections);
  return { data: { ...item, pairs: item.pairs || [], faq: item.faq || [] }, html, headings };
}

/** A clock time from src/data/times.json. */
export function composeTime(item) {
  const t = parseTime(item.label);
  const n = item.label;
  const digitsStr = t.digits.join('');
  const sp = item.specifics;
  const sections = [];
  sections.push(section('meaning', `What ${n} means`, sp.meaning + p(composeDigits(digitsStr, true))));
  const twice = t.h === 0
    ? ` ${n} is a 24-hour display, so it comes round once a day, at midnight; on a 12-hour clock the same moment reads 12:00, which also comes round at noon.`
    : t.h <= 12
      ? ` ${n} happens twice a day on a 12-hour clock, once in the morning and once at night, so a routine explains more sightings than people expect.`
      : ` ${n} is a 24-hour time, so it comes round once a day, usually in the evening when people check their phones most.`;
  sections.push(section('seeing', `Why you keep seeing ${n}`, p(pick(HONEST, 'time ' + n)(n, twice)) + p(pick(TRADITION_OPEN, 'time ' + n, 1)(n) + ' ' + sp.seeing)));
  if (sp.clock) sections.push(section('waking', item.wakingHeading || `Waking up at ${n}`, sp.clock));
  const doItems = [pick(DO_BANK, 'time ' + n, 1), pick(DO_BANK, 'time ' + n, 3), pick(DO_BANK, 'time ' + n, 5)].filter((v, i, a) => a.indexOf(v) === i).map((fn) => `<li>${fn(n)}</li>`).join('');
  sections.push(section('do', `What to do when you see ${n}`, (sp.do ? (sp.do.startsWith('<') ? sp.do : p(sp.do)) : '') + `<ul>${doItems}</ul>`));
  if (sp.love) sections.push(section('love', `${n} in love`, sp.love));
  if (sp.work) sections.push(section('money', `${n} for work and money`, sp.work));
  if (sp.manifest) sections.push(section('manifestation', `${n} and making a wish`, sp.manifest));
  const { html, headings } = assemble(sections);
  return { data: { ...item, number: digitsStr, pairs: item.pairs || [], faq: item.faq || [] }, html, headings, time: t };
}

/** A birthday number from src/data/birthdays.json. */
export function composeBirthday(item) {
  const d = item.day;
  const b = reduce(d);
  const sp = item.specifics;
  const w = birthdayWork(d);
  const sections = [];
  const arith = d > 9 ? `Born on the ${ord(d)}, your birthday number is ${b}: ${w}. ` : `Born on the ${ord(d)}, your birthday number is simply ${d}. `;
  const line = lower(digits[String(b)].line);
  const gift = [
    `The tradition reads the birthday number as a specific talent you were born with, narrower than the life path and easier to spot in daily life. For ${d} that talent is ${line}.`,
    `Numerologists treat the birthday number as a single gift rather than a whole character: narrower than the life path, and usually the first thing other people notice. On the ${ord(d)} it is ${line}.`,
    `Where the life path describes a whole life, the birthday number names one talent the tradition says you arrived with. For the ${ord(d)} that is ${line}.`,
    `The birthday number is the narrowest of the core numbers: one knack, read from the day alone, that tends to show early. The ${ord(d)}'s is ${line}.`,
  ][d % 4];
  sections.push(section('meaning', `What birthday number ${d} means`, p(arith + gift) + sp.meaning));
  sections.push(section('strengths', `Strengths of a ${d} birthday`, sp.strengths));
  sections.push(section('watch', `What a ${d} birthday has to watch`, sp.watch));
  if (sp.love) sections.push(section('love', `Born on the ${ord(d)} in love`, sp.love));
  if (sp.work) sections.push(section('work', `Born on the ${ord(d)} at work`, sp.work));
  const lpHref = `/life-path/${b === 11 || b === 22 ? b : root(d)}/`;
  const beside = [
    `The birthday number is one of five core numbers and the only one that uses the day alone. Your life path uses the whole date, and the two can pull in different directions: a 1 birthday on a 2 life path is someone who wants to lead and is built to partner. <a href="/life-path/calculator/">Work out your life path</a> and read both together, and see the <a href="/birthday-number/">birthday number guide</a> for the method. The <a href="${lpHref}">life path ${b} page</a> describes the same number as a whole life rather than a single gift.`,
    `Of the five core numbers, only the birthday number comes from the day alone. The life path takes the whole date, and the two often disagree in a useful way: a ${b} birthday on a different life path is a ${b} gift inside another temperament. The <a href="/life-path/calculator/">life path calculator</a> gives the second number, the <a href="/birthday-number/">birthday number guide</a> gives the method, and the <a href="${lpHref}">life path ${b} page</a> shows what the same number means across a whole life.`,
    `Read the birthday number beside the life path, never instead of it. The day gives one talent. The full date gives the pattern the talent sits in, and a ${b} gift can belong to any pattern. <a href="/life-path/calculator/">Work out the life path</a>, check the <a href="/birthday-number/">method on the guide page</a>, and compare this reading with the <a href="${lpHref}">life path ${b} page</a>, which treats the same number as a whole life.`,
    `The life path and the birthday number are worked out differently and read differently: the whole date against the day, a lifetime against a knack. They agree on some people and disagree on many, which is the point of reading both. The <a href="/life-path/calculator/">calculator</a> gives the life path, the <a href="/birthday-number/">guide</a> explains the birthday method, and the <a href="${lpHref}">life path ${b} page</a> describes the number ${b} at full scale.`,
  ][Math.floor(d / 4) % 4];
  sections.push(section('lifepath', `Your birthday number and your life path`, p(beside)));
  const { html, headings } = assemble(sections);
  return { data: { ...item, number: String(d), faq: item.faq || [] }, html, headings, birthday: b };
}

export function ord(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

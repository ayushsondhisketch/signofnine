// One RSS feed per Pinterest board, made from src/data/pins.json (scripts/pins.mjs fills it).
// Pinterest reads each feed and turns every new item into a pin on the board the feed is connected to.
// A feed lists the pins released in the last 7 days, newest first, and never fewer than the latest 3; pins dated
// later appear on a later build, so new pins reach Pinterest a few at a time and connecting a feed never floods a board.
import fs from 'node:fs';
import path from 'node:path';
import pins from '../../data/pins.json';
import { SITE } from '../../site.mjs';
import { BOARDS, dueItems, pinLink, pinImage } from '../../lib/pinboards.mjs';

export function getStaticPaths() {
  return Object.keys(BOARDS).map((board) => ({ params: { board } }));
}

const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET({ params }) {
  const board = BOARDS[params.board];
  const now = Date.now();
  const items = dueItems(pins, params.board, now)
    .map((p) => ({ ...p, file: path.join(process.cwd(), 'public', pinImage(p)) }))
    .filter((p) => fs.existsSync(p.file));

  const self = `${SITE.url}/pins/${params.board}.xml`;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${x(`${SITE.name}: ${board.name}`)}</title>
<link>${SITE.url}/</link>
<atom:link href="${self}" rel="self" type="application/rss+xml"/>
<description>${x(board.about)}</description>
<language>en-us</language>
<lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate>
${items.map((p) => {
  const img = `${SITE.url}${pinImage(p)}`;
  return `<item>
<title>${x(p.title)}</title>
<link>${x(pinLink(p))}</link>
<guid isPermaLink="false">signofnine-pin-${p.id}</guid>
<pubDate>${new Date(`${p.date}T06:00:00Z`).toUTCString()}</pubDate>
<description><![CDATA[<p><img src="${img}" alt="${x(p.alt)}" width="1000" height="1500"></p><p>${x(p.description)}</p>]]></description>
<enclosure url="${img}" length="${fs.statSync(p.file).size}" type="image/png"/>
<media:content url="${img}" medium="image" type="image/png" width="1000" height="1500"/>
</item>`;
}).join('\n')}
</channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

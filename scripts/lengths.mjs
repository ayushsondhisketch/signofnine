// Reports title and description lengths for every content file, so the 60/140 limits are visible before a build.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
for (const dir of readdirSync(join(root, 'src/content'))) {
  for (const f of readdirSync(join(root, 'src/content', dir)).filter((x) => x.endsWith('.md'))) {
    const src = readFileSync(join(root, 'src/content', dir, f), 'utf8');
    const t = (src.match(/^title:\s*"(.*)"/m) || [])[1] || '';
    const d = (src.match(/^description:\s*"(.*)"/m) || [])[1] || '';
    const flag = (t.length > 60 ? ' TITLE>60' : '') + (d.length > 140 ? ' DESC>140' : '');
    if (flag || process.argv[2] === 'all') console.log(`${dir}/${f}: title ${t.length}, description ${d.length}${flag}`);
  }
}

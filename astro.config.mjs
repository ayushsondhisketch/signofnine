import { defineConfig } from 'astro/config';
import { SITE } from './src/site.mjs';

// Wraps each H2 and what follows it in a <section>, and reserves the in-article ad space after the second section.
function rehypeSections() {
  return (tree) => {
    const out = [];
    let section = null;
    let count = 0;
    const flush = () => { if (section) { out.push(section); section = null; } };
    for (const node of tree.children) {
      if (node.type === 'element' && node.tagName === 'h2') {
        flush();
        count++;
        if (count === 3) out.push({ type: 'element', tagName: 'div', properties: { className: ['ad', 'ad--strip'], 'data-ad': 'strip', 'aria-hidden': 'true' }, children: [] });
        section = { type: 'element', tagName: 'section', properties: { 'aria-labelledby': node.properties.id }, children: [node] };
      } else if (section) {
        section.children.push(node);
      } else {
        out.push(node);
      }
    }
    flush();
    tree.children = out;
  };
}

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  markdown: { rehypePlugins: [rehypeSections], shikiConfig: { theme: 'github-light' } },
  compressHTML: true,
});

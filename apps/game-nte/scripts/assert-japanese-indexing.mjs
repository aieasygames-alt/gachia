import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const [sitemap, data, metadata, seo, rootLayout, localeLayout] = await Promise.all([
  readFile(resolve(root, 'app/sitemap.ts'), 'utf8'),
  readFile(resolve(root, 'lib/data.ts'), 'utf8'),
  readFile(resolve(root, 'lib/metadata.ts'), 'utf8'),
  readFile(resolve(root, 'lib/seo.ts'), 'utf8'),
  readFile(resolve(root, 'app/layout.tsx'), 'utf8'),
  readFile(resolve(root, 'app/[lang]/layout.tsx'), 'utf8'),
]);

const required = [
  [data, 'hasJapaneseNteGuideContent'],
  [data, 'isNteJapanesePathIndexable'],
  [data, 'isNteLocaleIndexable'],
  [metadata, "robots: isPreview ? { index: false, follow: false } : indexable ? undefined : { index: false, follow: true }"],
  [seo, 'robots: indexable ? undefined : { index: false, follow: true }'],
  [sitemap, "if (locale === 'ja') continue;"],
  [sitemap, 'hasJapaneseNteGuideContent(guide)'],
  [rootLayout, 'return children;'],
  [localeLayout, "<html lang={htmlLanguages[lang] ?? 'zh-Hans'}>"],
];

for (const [source, expected] of required) {
  if (!source.includes(expected)) throw new Error(`Missing Japanese indexing contract: ${expected}`);
}

console.log('NTE Japanese indexing contract passed');

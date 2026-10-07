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

const guideData = JSON.parse(await readFile(resolve(root, '../../packages/data/games/nte/raw-guides.json'), 'utf8'));
const indexableGuides = guideData.filter((guide) =>
  typeof guide.titleJa === 'string' && /[\u3040-\u30ff]/.test(guide.titleJa) && guide.titleJa.trim().length >= 8
  && typeof guide.summaryJa === 'string' && /[\u3040-\u30ff]/.test(guide.summaryJa) && guide.summaryJa.trim().length >= 40
  && typeof guide.contentJa === 'string' && /[\u3040-\u30ff]/.test(guide.contentJa) && guide.contentJa.trim().length >= 200,
);

if (indexableGuides.length === 0) throw new Error('No Japanese guides meet the indexing quality threshold.');
if (indexableGuides.some((guide) => !Array.isArray(guide.faq) || guide.faq.some((item) => !item.questionJa || !item.answerJa))) {
  throw new Error('An indexable Japanese guide is missing localized FAQ content.');
}

console.log(`NTE Japanese indexing contract passed (${indexableGuides.length} indexable guides)`);

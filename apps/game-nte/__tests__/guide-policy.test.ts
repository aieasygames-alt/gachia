import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from '../../web/test-support/guide-test-runtime';
import { guides, materials, isNteLocaleIndexable } from '../lib/data';
import { isNteGuideLocaleIndexable, nteGuideAlternates, nteGuideFaq, nteGuideReading, type NteGuide } from '../lib/guide-policy';
import { productionMetadata } from '../lib/seo';
import sitemap from '../app/sitemap';
import Detail, { generateMetadata } from '../app/[lang]/nte/guides/[slug]/page';
import List from '../app/[lang]/nte/guides/page';

afterEach(() => vi.unstubAllEnvs());
const chinese: NteGuide = { id: 'cms-zh-fixture', title: '中文指南', summary: '中文摘要', content: '中文正文与资源核验。'.repeat(30) };
const english = { titleEn: 'English guide', summaryEn: 'English summary', contentEn: 'English body. '.repeat(30) };
const japanese = { titleJa: '日本語のガイドです', summaryJa: '日本語の詳しい概要です。'.repeat(5), contentJa: '日本語の詳しい本文です。'.repeat(30) };

describe('NTE guide locale contract', () => {
  for (const missing of [undefined, null, '', '   ']) it(`treats missing/null/empty/blank translation as absent: ${String(missing)}`, () => {
    const guide = { ...chinese, titleEn: missing, summaryEn: missing, contentEn: missing, titleJa: missing, summaryJa: missing, contentJa: missing };
    for (const locale of ['en', 'ja'] as const) {
      expect(nteGuideReading(guide, locale)).toMatchObject({ locale: 'zh', lang: 'zh-Hans', fallback: true, content: chinese.content });
      expect(isNteGuideLocaleIndexable(guide, locale)).toBe(false);
      expect(nteGuideAlternates(guide, locale).languages).toEqual({ 'zh-Hans': `https://gachia.com/zh/nte/guides/${guide.id}`, 'x-default': `https://gachia.com/zh/nte/guides/${guide.id}` });
    }
  });

  it('prefers complete requested text, otherwise English, otherwise a qualified source; never mixes FAQ languages', () => {
    expect(nteGuideReading({ ...chinese, ...english }, 'ja').locale).toBe('en');
    expect(nteGuideReading({ ...chinese, ...english, ...japanese }, 'ja').locale).toBe('ja');
    expect(nteGuideReading({ ...chinese, ...english, ...japanese, contentJa: '短い概要' }, 'ja').locale).toBe('en');
    expect(nteGuideReading({ id: 'english-only', ...english }, 'zh').locale).toBe('en');
    expect(nteGuideFaq({ ...chinese, faq: [{ question: 'English', answer: 'Answer' }] }, 'zh')).toEqual([]);
    expect(nteGuideFaq({ ...chinese, faq: [{ questionZh: '问题', answerZh: '回答' }] }, 'zh')).toEqual([{ question: '问题', answer: '回答' }]);
  });

  it('retains all 53 legacy identities and their previous Japanese eligibility, with no zh/en index regression', () => {
    expect(guides).toHaveLength(53);
    const urls = new Set(sitemap().map(entry => entry.url));
    const japaneseText = (value: unknown, minimum: number) => typeof value === 'string' && Array.from(value.trim()).length >= minimum && /[\u3040-\u30ff]/.test(value);
    for (const guide of guides) {
      expect(isNteGuideLocaleIndexable(guide, 'ja')).toBe(japaneseText(guide.titleJa, 8) && japaneseText(guide.summaryJa, 40) && japaneseText(guide.contentJa, 200));
      for (const locale of ['zh', 'en', 'ja'] as const) {
        if (locale !== 'ja') expect(isNteGuideLocaleIndexable(guide, locale)).toBe(true);
        expect(urls.has(`https://gachia.com/${locale}/nte/guides/${guide.id}`)).toBe(isNteGuideLocaleIndexable(guide, locale));
      }
    }
    const materialUrls = [...urls].filter(url => /\/nte\/items\//.test(url));
    expect(materialUrls).toHaveLength(materials.length * 3);
    for (const material of materials) for (const locale of ['zh', 'en', 'ja']) expect(urls.has(`https://gachia.com/${locale}/nte/items/${material.id}`)).toBe(true);
  });

  it('uses one policy in actual detail/list/metadata/JSON-LD/sitemap and keeps unqualified locale URLs readable', async () => {
    guides.push(chinese);
    vi.stubEnv('NTE_DEPLOYMENT_MODE', 'live');
    try {
      for (const locale of ['zh', 'en', 'ja'] as const) {
        const params = { params: Promise.resolve({ lang: locale, slug: chinese.id }) };
        const html = renderToStaticMarkup(createElement('div', null, await Detail(params)));
        expect(html).toContain('lang="zh-Hans"'); expect(html).toContain(chinese.title);
        expect(html.includes('data-guide-fallback')).toBe(locale !== 'zh');
        expect(html).toContain('"inLanguage":"zh-Hans"');
        const metadata = await generateMetadata(params);
        expect(metadata.robots).toEqual(locale === 'zh' ? undefined : { index: false, follow: true });
        expect(metadata.alternates).toEqual(nteGuideAlternates(chinese, locale));
        expect(isNteLocaleIndexable(locale, `/guides/${chinese.id}`)).toBe(locale === 'zh');
        expect(sitemap().some(entry => entry.url === `https://gachia.com/${locale}/nte/guides/${chinese.id}`)).toBe(locale === 'zh');
        const list = renderToStaticMarkup(createElement('div', null, await List(params)));
        expect(list).toContain(`/${locale}/nte/guides/${chinese.id}`); expect(list).toContain(chinese.title);
      }
      vi.stubEnv('NTE_DEPLOYMENT_MODE', 'preview');
      expect(productionMetadata('Title', 'Summary', 'zh', `/guides/${chinese.id}`).robots).toEqual({ index: false, follow: false });
    } finally { guides.pop(); }
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import batch from '../../../reports/starrail-p0-guides-2026-11-25/batch.json';
import { STARRAIL_CMS_GUIDES } from '@gachia/data/cms/starrail-guides';
import { parseStarRailPublication } from '@gachia/data/cms/starrail-publication';

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: load }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement('a', { href }, children) }));
import GuidePage, { generateMetadata } from '@/app/[lang]/[game]/guides/[slug]/page';

const params = (slug: string, lang = 'zh') => ({ params: Promise.resolve({ lang, game: 'starrail', slug }) });
describe('independent Star Rail CMS guide ownership', () => {
  beforeEach(() => load.mockImplementation(async (locale: string) => ({ source: 'cms', updates: batch.creates.filter(d => d.locale === locale) })));
  it('accepts the reviewed guide batch and renders full facts, boundaries and third-party sources on stable URLs', async () => {
    expect(parseStarRailPublication({ revision: 1, docs: batch.creates })?.docs).toHaveLength(5);
    for (const doc of batch.creates) {
      const html = renderToStaticMarkup(await GuidePage(params(doc.slug)));
      expect(html).toContain(`<h1 class="text-2xl font-bold text-game-primary">${doc.title}</h1>`);
      for (const fact of doc.facts) for (const paragraph of fact.text.split('\n')) expect(html).toContain(paragraph);
      expect(html).toContain(doc.boundary);
      for (const source of doc.sources) expect(html).toContain(source.url);
      expect(html).toContain('第三方资料');
      expect(html).not.toContain('FAQPage');
      const meta = await generateMetadata(params(doc.slug));
      expect(meta).toMatchObject({ title: doc.title, description: doc.summary, robots: { index: true } });
    }
  });
  it('replaces body and metadata on the next request, without retaining the old FAQ', async () => {
    const doc = batch.creates[0]!;
    load.mockResolvedValue({ source: 'cms', updates: [{ ...doc, title: '修订后的攻略', summary: '新的摘要', facts: [{ text: '新章节\n新的核验事实' }] }] });
    const html = renderToStaticMarkup(await GuidePage(params(doc.slug)));
    expect(html).toContain('新的核验事实');
    expect(html).not.toContain(doc.facts[0]!.text.split('\n')[1]);
    expect(await generateMetadata(params(doc.slug))).toMatchObject({ title: '修订后的攻略', description: '新的摘要' });
  });
  it('keeps withdrawal, missing translations and failed CMS reads from restoring obsolete raw bodies', async () => {
    for (const source of ['cms', 'snapshot']) {
      load.mockResolvedValue({ source, updates: [] });
      for (const slug of Object.keys(STARRAIL_CMS_GUIDES)) for (const locale of ['zh', 'en', 'ja']) {
        const html = renderToStaticMarkup(await GuidePage(params(slug, locale)));
        expect(html).toContain('<h1');
        expect(html).not.toContain('FAQPage');
        expect(html).not.toContain('600');
        expect(await generateMetadata(params(slug, locale))).toMatchObject({ robots: { index: false } });
        expect(load).toHaveBeenCalledWith(locale);
      }
    }
    // Even a mixed-language upstream result cannot leak Chinese facts into English.
    load.mockResolvedValue({ source: 'cms', updates: batch.creates });
    expect(renderToStaticMarkup(await GuidePage(params(batch.creates[0]!.slug, 'en')))).not.toContain(batch.creates[0]!.summary);
  });
});

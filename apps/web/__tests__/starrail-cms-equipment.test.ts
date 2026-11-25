import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import batch from '../../../reports/starrail-equipment-2026-11-25/batch.json';
import reruns from '../../../reports/starrail-warp-cones-2026-11-25/batch.json';
import { isStarRailCmsEquipment } from '@gachia/data/cms/starrail-equipment';
import { parseStarRailUpdate, isCommunityStarRailSource } from '@gachia/data/cms/starrail-updates';
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: load }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement('a', { href }, children) }));
import { StarRailCmsEquipment, StarRailCmsEquipmentCards, starRailEquipmentMetadata } from '@/components/wiki/starrail-cms-equipment';
const docs = [...batch.creates, ...reruns.creates].map(d => parseStarRailUpdate(d)!);
describe('independent CMS equipment publication', () => {
  beforeEach(() => load.mockImplementation(async (locale: string) => ({ source: 'cms', updates: locale === 'zh' ? docs : [] })));
  it('validates route ownership and specific reviewed sources', () => {
    expect(docs.every(Boolean)).toBe(true);
    expect(parseStarRailUpdate({ ...batch.creates[0], slug: 'unknown-equipment' })).toBeNull();
    expect(parseStarRailUpdate({ ...batch.creates[0], sources: [{ url: 'https://starrailstation.com/cn/relics/331' }] })).toBeNull();
    expect(isCommunityStarRailSource(batch.creates[0]!.sources[0]!.url)).toBe(true);
  });
  it('renders complete effects, scope, sources, metadata and the corresponding index', async () => {
    for (const doc of docs) {
      const category = isStarRailCmsEquipment('weapons', doc.slug) ? 'weapons' : 'artifacts';
      const html = renderToStaticMarkup(await StarRailCmsEquipment({ locale: 'zh', category, id: doc.slug }));
      for (const f of doc.facts) for (const paragraph of f.text.split('\n')) expect(html).toContain(paragraph);
      expect(html).toContain(doc.boundary);
      expect(html).toContain('第三方资料');
      expect(await starRailEquipmentMetadata('zh', category, doc.slug)).toMatchObject({ title: doc.title, robots: { index: true } });
      expect(renderToStaticMarkup(await StarRailCmsEquipmentCards({ locale: 'zh', category }))).toContain(`/starrail/${category}/${doc.slug}`);
    }
  });
  it('updates facts and metadata immediately and keeps categories separate', async () => {
    const revised = structuredClone(docs); revised[0]!.title = '装备修订'; revised[0]!.facts = [{ text: '叠影1\n基础速度13点' }];
    load.mockResolvedValue({ source: 'cms', updates: revised });
    const html = renderToStaticMarkup(await StarRailCmsEquipment({ locale: 'zh', category: 'weapons', id: docs[0]!.slug }));
    expect(html).toContain('基础速度13点'); expect(html).not.toContain('基础速度12点');
    expect(await starRailEquipmentMetadata('zh', 'weapons', docs[0]!.slug)).toMatchObject({ title: '装备修订' });
    expect(renderToStaticMarkup(await StarRailCmsEquipmentCards({ locale: 'zh', category: 'artifacts' }))).not.toContain('装备修订');
  });
  it('withdraws body and index, noindexes pending locales, and never falls back to old gear', async () => {
    for (const source of ['cms', 'snapshot']) {
      load.mockResolvedValue({ source, updates: [] });
      for (const doc of docs) for (const locale of ['zh', 'en', 'ja'] as const) {
        const category = isStarRailCmsEquipment('weapons', doc.slug) ? 'weapons' : 'artifacts';
        expect(renderToStaticMarkup(await StarRailCmsEquipment({ locale, category, id: doc.slug }))).not.toContain(doc.summary);
        expect(await starRailEquipmentMetadata(locale, category, doc.slug)).toMatchObject({ robots: { index: false } });
        expect(await StarRailCmsEquipmentCards({ locale, category })).toBeNull();
      }
    }
    load.mockResolvedValue({ source: 'cms', updates: docs });
    expect(await StarRailCmsEquipmentCards({ locale: 'en', category: 'weapons' })).toBeNull();
  });
});

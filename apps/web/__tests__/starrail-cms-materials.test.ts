import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import batch from '../../../reports/starrail-materials-2026-11-25/batch.json';
import previous from '../../../reports/starrail-remaining-cones-2026-11-25/cloud-after.json';
import enemyBatch from '../../../reports/starrail-materials-enemies-2026-11-25/batch.json';
import traceBatch from '../../../reports/starrail-materials-traces-2026-11-26/batch.json';
import { STARRAIL_CMS_MATERIALS } from '@gachia/data/cms/starrail-materials';
import { isCommunityStarRailSource, parseStarRailUpdate } from '@gachia/data/cms/starrail-updates';
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: load }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement('a', { href }, children) }));
import { StarRailCmsMaterial, StarRailCmsMaterialCards, StarRailEquipmentMaterialLinks, starRailMaterialMetadata } from '@/components/wiki/starrail-cms-materials';
import { StarRailCmsEquipment } from '@/components/wiki/starrail-cms-equipment';
const docs = [...batch.creates, ...enemyBatch.creates, ...traceBatch.creates].map(d => parseStarRailUpdate(d)!);
const old = previous.docs.map(d => parseStarRailUpdate(d)!);
describe('independent material publication and related light-cone links', () => {
  beforeEach(() => load.mockImplementation(async (locale: string) => ({ source: 'cms', updates: locale === 'zh' ? [...old, ...docs] : [] })));
  it('accepts only registered material identities and exact reviewed sources', () => {
    expect(docs.every(Boolean)).toBe(true);
    expect(parseStarRailUpdate({ ...batch.creates[0], slug: 'unknown-material' })).toBeNull();
    expect(parseStarRailUpdate({ ...batch.creates[0], slug: 'before-dawn' })).toBeNull();
    const url = batch.creates[0]!.sources[0]!.url;
    expect(isCommunityStarRailSource(url)).toBe(true);
    expect(parseStarRailUpdate({ ...batch.creates[0], sources: [{ url: url + '?redirect=example.com' }] })).toBeNull();
  });
  it('renders every acquisition condition, source, boundary and single index entry', async () => {
    const cards = renderToStaticMarkup(await StarRailCmsMaterialCards({ locale: 'zh' }));
    for (const d of docs) {
      const body = renderToStaticMarkup(await StarRailCmsMaterial({ locale: 'zh', id: d.slug }));
      for (const f of d.facts) for (const paragraph of f.text.split('\n')) expect(body).toContain(paragraph);
      expect(body).toContain(d.boundary); expect(body).toContain('第三方资料');
      expect(body).not.toContain('FAQPage'); expect(body).not.toContain('目前暂无角色需要');
      expect(cards.split(`href="/starrail/items/${d.slug}"`)).toHaveLength(2);
      expect(await starRailMaterialMetadata('zh', d.slug)).toMatchObject({ title: d.title, robots: { index: true } });
    }
  });
  it('shows verified relationships both ways and updates material body and metadata', async () => {
    for (const d of docs) {
      const registry = STARRAIL_CMS_MATERIALS[d.slug as keyof typeof STARRAIL_CMS_MATERIALS];
      const body = renderToStaticMarkup(await StarRailCmsMaterial({ locale: 'zh', id: d.slug }));
      for (const id of registry.equipment) {
        expect(body).toContain(`/starrail/weapons/${id}`);
        expect(renderToStaticMarkup(await StarRailEquipmentMaterialLinks({ locale: 'zh', equipmentId: id }))).toContain(`/starrail/items/${d.slug}`);
      }
    }
    load.mockResolvedValue({ source: 'cms', updates: [...old, { ...docs[0], title: '已修订材料', facts: [{ text: '获取条件\n均衡条件已修订' }] }] });
    expect(renderToStaticMarkup(await StarRailCmsMaterial({ locale: 'zh', id: docs[0]!.slug }))).toContain('均衡条件已修订');
    expect(await starRailMaterialMetadata('zh', docs[0]!.slug)).toMatchObject({ title: '已修订材料' });
  });
  it('withdraws material body, metadata, cards and cone links without legacy or cross-locale fallback', async () => {
    for (const source of ['cms', 'snapshot']) {
      load.mockResolvedValue({ source, updates: old });
      expect(await StarRailCmsMaterialCards({ locale: 'zh' })).toBeNull();
      expect(await StarRailEquipmentMaterialLinks({ locale: 'zh', equipmentId: 'before-dawn' })).toBeNull();
      for (const d of docs) {
        expect(renderToStaticMarkup(await StarRailCmsMaterial({ locale: 'zh', id: d.slug }))).not.toContain(d.summary);
        expect(await starRailMaterialMetadata('zh', d.slug)).toMatchObject({ robots: { index: false } });
      }
    }
    load.mockResolvedValue({ source: 'cms', updates: [...old, ...docs] });
    for (const locale of ['en', 'ja'] as const) {
      expect(await StarRailCmsMaterialCards({ locale })).toBeNull();
      expect(await StarRailEquipmentMaterialLinks({ locale, equipmentId: 'before-dawn' })).toBeNull();
      expect(await starRailMaterialMetadata(locale, docs[0]!.slug)).toMatchObject({ robots: { index: false } });
    }
    load.mockResolvedValue({ source: 'cms', updates: docs });
    expect(renderToStaticMarkup(await StarRailCmsMaterial({ locale: 'zh', id: docs[0]!.slug }))).not.toContain('data-starrail-material-equipment');
    expect(renderToStaticMarkup(await StarRailCmsEquipment({ locale: 'zh', category: 'weapons', id: 'before-dawn' }))).not.toContain('data-starrail-equipment-materials');
  });
});

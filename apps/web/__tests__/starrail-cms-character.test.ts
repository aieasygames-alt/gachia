import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import batch from '../../../reports/starrail-structured-character-2026-11-25/batch.json';
import { parseStarRailUpdate } from '@gachia/data/cms/starrail-updates';
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: load }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement('a', { href }, children) }));
import { StarRailCmsCharacter, StarRailCmsCharacterCard, starRailCharacterMetadata } from '@/components/wiki/starrail-cms-character';
const doc = parseStarRailUpdate(batch.creates[0])!;
describe('CMS character page, index entry and material calculator', () => {
  beforeEach(() => load.mockImplementation(async (locale: string) => ({ source: 'cms', updates: locale === 'zh' ? [doc] : [] })));
  it('renders all multiplier levels, distinct Elation costs and the verified total', async () => {
    const html = renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'zh', id: 'aha' }));
    for (const s of doc.characterData!.skills) for (const row of s.levels) for (const value of row.values) expect(html).toContain(value);
    for (const node of doc.characterData!.nodes) expect(html).toContain(node.name);
    expect(html).toContain('3,308,000');
    expect(html).toContain('星魂加级');
    expect(html).toContain('第三方资料');
    expect(html).not.toContain('/images/starrail/characters/aha');
    expect(await starRailCharacterMetadata('zh', 'aha')).toMatchObject({ title: doc.title, robots: { index: true } });
    expect(renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }))).toContain('/starrail/characters/aha');
  });
  it('replaces both numeric data and metadata without rebuilding', async () => {
    const updated = structuredClone(doc);
    updated.title = '修订后的阿哈';
    updated.characterData!.ascensions[0]!.materials[0]!.quantity += 1;
    updated.characterData!.skills[0]!.levels[0]!.values[0] = '26%';
    load.mockResolvedValue({ source: 'cms', updates: [updated] });
    const html = renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'zh', id: 'aha' }));
    expect(html).toContain('3,308,001');expect(html).toContain('26%');
    expect(await starRailCharacterMetadata('zh', 'aha')).toMatchObject({ title: updated.title });
  });
  it('honors withdrawal, outage and locale isolation without restoring old data', async () => {
    for (const source of ['cms', 'snapshot']) {
      load.mockResolvedValue({ source, updates: [] });
      for (const locale of ['zh', 'en', 'ja'] as const) {
        const html = renderToStaticMarkup(await StarRailCmsCharacter({ locale, id: 'aha' }));
        expect(html).not.toContain('3,308,000');
        expect(await starRailCharacterMetadata(locale, 'aha')).toMatchObject({ robots: { index: false } });
        expect(await StarRailCmsCharacterCard({ locale })).toBeNull();
      }
    }
    load.mockResolvedValue({ source: 'cms', updates: [doc] });
    expect(renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'en', id: 'aha' }))).not.toContain(doc.summary);
  });
});

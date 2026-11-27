import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import achBatch from '../../../reports/starrail-acheron-2026-11-27/batch.json';
import spBatch from '../../../reports/starrail-sparxie-2026-11-26/batch.json';
import swBatch from '../../../reports/starrail-silverwolf-999-2026-11-26/batch.json';
import yaoBatch from '../../../reports/starrail-yaoguang-2026-11-26/batch.json';
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
  it('lists multiple published characters and withdraws only the removed character', async () => {
    const yao = parseStarRailUpdate(yaoBatch.creates[0])!;
    load.mockResolvedValue({ source: 'cms', updates: [doc, yao] });
    let html = renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }));
    expect(html).toContain('/starrail/characters/aha');
    expect(html).toContain('/starrail/characters/yaoguang');
    const detail = renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'zh', id: 'yaoguang' }));
    expect(detail).toContain('81.25%');expect(detail).toContain('侵略凝块');
    load.mockResolvedValue({ source: 'cms', updates: [doc] });
    html = renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }));
    expect(html).toContain('/starrail/characters/aha');expect(html).not.toContain('/starrail/characters/yaoguang');
    expect(await starRailCharacterMetadata('zh', 'yaoguang')).toMatchObject({ title: '爻光资料待发布', robots: { index: false } });
    for (const locale of ['en', 'ja'] as const) {
      load.mockResolvedValue({ source: 'cms', updates: [yao] });
      const pending = renderToStaticMarkup(await StarRailCmsCharacter({ locale, id: 'yaoguang' }));
      expect(pending).not.toContain('81.25%');expect(pending).not.toContain('阿哈');
      expect(pending).toContain('/starrail/characters/yaoguang');
      expect(await starRailCharacterMetadata(locale, 'yaoguang')).toMatchObject({ robots: { index: false } });
    }
  });

  it('renders enhanced Silver Wolf values and withdraws its canonical reader independently', async () => {
    const sw = parseStarRailUpdate(swBatch.creates[0])!;
    load.mockResolvedValue({ source: 'cms', updates: [doc, sw] });
    const detail = renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'zh', id: 'silver-wolf-lv999' }));
    for (const value of ['240%', '73.125%', '32.5%', '纷争先兆', '3,308,000']) expect(detail).toContain(value);
    const cards = renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }));
    expect(cards).toContain('/starrail/characters/silver-wolf-lv999');
    load.mockResolvedValue({ source: 'cms', updates: [doc] });
    expect(renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }))).not.toContain('/starrail/characters/silver-wolf-lv999');
    expect(await starRailCharacterMetadata('zh', 'silver-wolf-lv999')).toMatchObject({ robots: { index: false } });
  });

  it('renders Sparxie enhanced forms and isolates its withdrawn or untranslated data', async () => {
    const sp = parseStarRailUpdate(spBatch.creates[0])!;
    load.mockResolvedValue({ source: 'cms', updates: [doc, sp] });
    const detail = renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'zh', id: 'sparxie' }));
    for (const value of ['40.625%', '20.3125%', '8.13%', '明辉日珥', '互动陷阱', '3,308,000']) expect(detail).toContain(value);
    expect(renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }))).toContain('/starrail/characters/sparxie');
    for (const locale of ['en', 'ja'] as const) {
      expect(renderToStaticMarkup(await StarRailCmsCharacter({ locale, id: 'sparxie' }))).not.toContain(sp.summary);
      expect(await starRailCharacterMetadata(locale, 'sparxie')).toMatchObject({ robots: { index: false } });
    }
    load.mockResolvedValue({ source: 'cms', updates: [doc] });
    expect(renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }))).not.toContain('/starrail/characters/sparxie');
    expect(await starRailCharacterMetadata('zh', 'sparxie')).toMatchObject({ robots: { index: false } });
  });

  it('renders four Acheron skills and hides withdrawn or untranslated legacy data', async () => {
    const ach = parseStarRailUpdate(achBatch.creates[0])!;
    load.mockResolvedValue({ source: 'cms', updates: [doc, ach] });
    const detail = renderToStaticMarkup(await StarRailCmsCharacter({ locale: 'zh', id: 'acheron' }));
    for (const skill of ach.characterData!.skills) for (const row of skill.levels) for (const value of row.values) expect(detail).toContain(value);
    for (const value of ['炼形者雷枝', '集真赤', '3,308,000', '每斩群体最高总倍率']) expect(detail).toContain(value);
    expect(detail).not.toContain('欢愉技');
    expect(renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }))).toContain('/starrail/characters/acheron');
    for (const locale of ['en', 'ja'] as const) {
      expect(renderToStaticMarkup(await StarRailCmsCharacter({ locale, id: 'acheron' }))).not.toContain(ach.summary);
      expect(await starRailCharacterMetadata(locale, 'acheron')).toMatchObject({ robots: { index: false } });
    }
    load.mockResolvedValue({ source: 'cms', updates: [doc] });
    expect(renderToStaticMarkup(await StarRailCmsCharacterCard({ locale: 'zh' }))).not.toContain('/starrail/characters/acheron');
    expect(await starRailCharacterMetadata('zh', 'acheron')).toMatchObject({ robots: { index: false } });
  });

});

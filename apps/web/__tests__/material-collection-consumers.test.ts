import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ComponentProps } from 'react';
import Items, { generateMetadata } from '@/app/[lang]/[game]/items/page';
import { getItemListData } from '@/lib/game-data/items';
import { buildSearchItems, searchItems } from '@/lib/search-results';
import { readFileSync } from 'node:fs';
import { isStarRailCmsMaterial } from '@gachia/data/cms/starrail-materials';
import materialBatch from '../../../reports/starrail-materials-2026-11-25/batch.json';

// Locale prefixing is exercised over HTTP with the real navigation component.
// This render check runs the actual async page and actual material data loaders.
vi.mock('@/lib/i18n/navigation', () => ({ Link: (props: ComponentProps<'a'>) => createElement('a', props) }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: async (locale: string) => ({ source: 'cms', updates: locale === 'zh' ? materialBatch.creates : [] }) }));

for (const locale of ['zh', 'en', 'ja'] as const) {
  it.each(['endfield', 'starrail', 'roco-cn'] as const)(`renders every %s material as a detail link in ${locale}`, async game => {
    const params = Promise.resolve({ lang: locale, game });
    const html = renderToStaticMarkup(await Items({ params }));
    const materials = await getItemListData(game, locale);
    expect(materials.length).toBeGreaterThan(0);
    for (const material of materials) {
      if (game === 'starrail' && isStarRailCmsMaterial(material.id)) {
        expect(html.includes(`href="/${game}/items/${material.id}"`)).toBe(locale === 'zh');
        continue;
      }
      expect(html).toContain(`href="/${game}/items/${material.id}"`);
      expect(html).toContain(renderToStaticMarkup(createElement('h3', null, material.name)).slice(4, -5));
    }
    expect((await generateMetadata({ params })).alternates?.canonical).toBe(`https://gachia.com/${locale}/${game}/items`);
    if (game === 'starrail') {
      for (const material of materialBatch.creates) expect(html.includes(`href="/starrail/items/${material.slug}"`)).toBe(locale === 'zh');
      const special = materials.filter(row => row.type === 'special');
      expect(special.length).toBeGreaterThan(0);
      for (const material of special) expect(html).toContain(`href="/starrail/items/${material.id}"`);
    }
  });

  it(`finds every CN material at its existing detail URL in ${locale} search`, () => {
    const dataset = JSON.parse(readFileSync(new URL(`../public/data-manifest/search-${locale}.json`, import.meta.url), 'utf8'));
    expect(Object.keys(dataset['roco-cn'])).toEqual(['items']);
    const items = buildSearchItems(dataset);
    for (const material of dataset['roco-cn'].items) {
      expect(searchItems(items, material.name).some(row => row.url === `/roco-cn/items/${material.id}`)).toBe(true);
      expect(searchItems(items, material.nameAlt).some(row => row.url === `/roco-cn/items/${material.id}`)).toBe(true);
    }
    expect(dataset).not.toHaveProperty('roco');
  });
}

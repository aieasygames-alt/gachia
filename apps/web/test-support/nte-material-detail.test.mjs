import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Detail, { generateMetadata, generateStaticParams } from '../../game-nte/app/[lang]/nte/items/[id]/page';
import Items from '../../game-nte/app/[lang]/nte/items/page';
import sitemap from '../../game-nte/app/sitemap';
import { materials, characterMaterials, nteCharacters } from '../../game-nte/lib/data';
import { nteMaterialDetail } from '../../game-nte/lib/material-detail';
import { getItemData, getItemsForStaticParams, getCharactersNeedingMaterial } from '../lib/game-data/items';
import { getRouteOwner, isMainSitemapPath } from '../../../packages/core/route-ownership';

describe('NTE material ownership and real page consumers', () => {
  it('keeps every existing URL on the dedicated sitemap and removes Main reads', async () => {
    expect(generateStaticParams()).toHaveLength(materials.length * 3);
    const urls = new Set(sitemap().map(row => row.url));
    for (const locale of ['zh', 'en', 'ja']) for (const row of materials) {
      const path = `/${locale}/nte/items/${row.id}`;
      expect(getRouteOwner(path)).toBe('nte'); expect(isMainSitemapPath(path)).toBe(false);
      expect(urls.has(`https://gachia.com${path}`)).toBe(true);
    }
    expect(await getItemsForStaticParams('nte')).toEqual([]);
    expect(await getItemData('nte', materials[0].id, 'en')).toBe(null);
    expect(await getCharactersNeedingMaterial('nte', materials[0].id)).toEqual([]);
    expect(nteMaterialDetail('missing-material', 'zh')).toBe(null);
  });
  for (const locale of ['zh', 'en', 'ja']) {
    it(`links every list entry to the ${locale} detail`, async () => {
      const html = renderToStaticMarkup(await Items({ params: Promise.resolve({ lang: locale }) }));
      for (const row of materials) expect(html).toContain(`href="/${locale}/nte/items/${row.id}"`);
    });
    for (const row of materials) it(`renders source, relationships and metadata: ${locale}/${row.id}`, async () => {
      const params = Promise.resolve({ lang: locale, id: row.id });
      const data = nteMaterialDetail(row.id, locale);
      expect(data.name).toBe(locale === 'zh' ? row.name : locale === 'ja' ? row.nameJa ?? row.nameEn : row.nameEn);
      expect(data.source).toBe(locale === 'zh' ? row.source ?? '' : locale === 'ja' ? row.sourceJa ?? row.sourceEn ?? row.source ?? '' : row.sourceEn ?? row.source ?? '');
      const ids = new Set(characterMaterials.filter(cm => cm.levelingMaterials.some(level => level.materials.some(m => m.id === row.id))
        || cm.skillMaterials.some(m => m.id === row.id)).map(cm => cm.characterId));
      const pageIds = [...ids].flatMap(id => id === 'zero' ? ['zero-male', 'zero-female'] : [id]);
      expect(data.characters.map(c => c.id)).toEqual(pageIds.filter(id => nteCharacters.some(c => c.id === id)));
      const html = renderToStaticMarkup(await Detail({ params }));
      const plain = renderToStaticMarkup(createElement('div', null, data.source)).slice(5, -6);
      expect(html).toContain(plain);
      for (const char of data.characters) expect(html).toContain(`href="/${locale}/nte/characters/${char.id}"`);
      if (ids.has('zero')) {
        for (const variant of ['zero-male', 'zero-female']) expect(html).toContain(`href="/${locale}/nte/characters/${variant}"`);
        expect(html).not.toContain(`href="/${locale}/nte/characters/zero"`);
      }
      const metadata = await generateMetadata({ params });
      expect(metadata.alternates.canonical).toBe(`https://gachia.com/${locale}/nte/items/${row.id}`);
      expect(metadata.alternates.languages.ja).toBe(`https://gachia.com/ja/nte/items/${row.id}`);
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      expect(scripts.find(s => s['@type'] === 'FAQPage').mainEntity).toHaveLength(3);
    });
  }
});

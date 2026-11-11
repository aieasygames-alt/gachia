import { existsSync, readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import MapPage, { generateMetadata } from '../app/[lang]/[game]/map/page';
import { getMapPageData } from '../lib/game-data/maps';
import middleware from '../middleware';

it('removes Main map UI/data dependencies without retiring public or player APIs', () => {
  for (const name of ['InteractiveMap', 'MapLoader', 'MapSidebar', 'SubMapSelector']) expect(existsSync(new URL(`../app/[lang]/[game]/map/_components/${name}.tsx`, import.meta.url))).toBe(false);
  const source = readFileSync(new URL('../lib/game-data/maps.ts', import.meta.url), 'utf8'); expect(source).not.toContain('@gachia/data/games/genshin/');
  for (const file of ['route.ts', 'points/route.ts', 'tile/route.ts', 'progress/route.ts']) expect(existsSync(new URL(`../app/api/map/${file}`, import.meta.url))).toBe(true);
});
it('rejects Main Genshin map and descendants in every locale without caching or indexing', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    expect(await getMapPageData('genshin', lang as 'zh' | 'en' | 'ja')).toBe(null);
    await expect(MapPage({ params: Promise.resolve({ lang, game: 'genshin' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect((await generateMetadata({ params: Promise.resolve({ lang, game: 'genshin' }) })).robots).toEqual({ index: false, follow: false });
    for (const suffix of ['', '/example']) {
      const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/map${suffix}`));
      expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
    expect(middleware(new NextRequest(`https://gachia.com/api/map/progress?map_id=teyvat`)).status).not.toBe(404);
  }
});
it('preserves other game map pages, adapters and metadata', async () => {
  for (const lang of ['zh', 'en', 'ja']) for (const game of ['starrail', 'wuwa', 'nte', 'endfield', 'aniimo', 'skjh', 'roco', 'roco-cn']) {
    expect(await MapPage({ params: Promise.resolve({ lang, game }) })).toBeTruthy();
    expect(await generateMetadata({ params: Promise.resolve({ lang, game }) })).toBeTruthy();
  }
});

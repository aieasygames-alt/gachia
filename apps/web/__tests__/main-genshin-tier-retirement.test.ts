import { existsSync, readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import TierListPage, { generateMetadata } from '../app/[lang]/[game]/tier-list/page';
import middleware from '../middleware';

it('removes the Main Genshin tier client and redundant copy while preserving other tier consumers', () => {
  const directory = new URL('../app/[lang]/[game]/tier-list/', import.meta.url);
  expect(existsSync(new URL('genshin-tier-client.tsx', directory))).toBe(false);
  const source = readFileSync(new URL('page.tsx', directory), 'utf8');
  expect(source).not.toContain('genshin-tier-client'); expect(source).not.toContain('Genshin ratings combine');
  expect(source).toContain("if (gameId === 'genshin') notFound();");
  for (const name of ['StarRailTierListClient', 'WuWaTierListClient', 'GenericTierListPage', 'EndfieldTierDataNotice', 'SeaQuickLinks', 'RocoPublicReviewPage']) expect(source).toContain(name);
});

it('rejects direct Main tier list and descendants in all locales without caching or indexing', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    await expect(TierListPage({ params: Promise.resolve({ lang, game: 'genshin' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    for (const suffix of ['', '/unknown']) {
      const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/tier-list${suffix}`));
      expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
    expect(middleware(new NextRequest(`https://gachia.com/${lang}/genshin/map`)).status).toBe(404);
  }
});

it('keeps other games tier pages, metadata, legacy date and existing routing policy', async () => {
  for (const lang of ['zh', 'en', 'ja']) for (const game of ['starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'roco-cn', 'roco']) {
    expect(await TierListPage({ params: Promise.resolve({ lang, game }) })).toBeTruthy();
    const metadata = await generateMetadata({ params: Promise.resolve({ lang, game }) });
    expect(metadata).toBeTruthy();
    const response = middleware(new NextRequest(`https://gachia.com/${lang}/${game}/tier-list`));
    expect(response.status, `${lang}:${game}`).toBe(200);
  }
});

import { existsSync, readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import ComparePage from '../app/[lang]/[game]/compare/page';
import middleware from '../middleware';

it('removes Main Genshin comparison implementation and its dynamic entry', () => {
  const directory = new URL('../app/[lang]/[game]/compare/', import.meta.url);
  expect(existsSync(new URL('genshin-compare-client.tsx', directory))).toBe(false);
  expect(readFileSync(new URL('compare-client.tsx', directory), 'utf8')).not.toContain('genshin-compare-client');
});

it('refuses direct Main comparison rendering with no-store/noindex 404 including descendants', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    await expect(ComparePage({ params: Promise.resolve({ lang, game: 'genshin' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    for (const suffix of ['', '/unknown']) {
      const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/compare${suffix}`));
      expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
});

it('keeps other comparisons and remaining Genshin tools including existing redirect policy', async () => {
  for (const game of ['starrail', 'wuwa', 'zzz', 'sea', 'endfield']) {
    expect(await ComparePage({ params: Promise.resolve({ lang: 'en', game }) })).toBeTruthy();
    const response = middleware(new NextRequest(`https://gachia.com/en/${game}/compare`));
    expect(response.status, game).toBe(game === 'sea' ? 301 : 200);
    if (game === 'sea') expect(response.headers.get('location')).toBe('https://gachia.com/en/sea');
  }
  for (const route of ['map']) expect(middleware(new NextRequest(`https://gachia.com/en/genshin/${route}`)).status).toBe(404);
});

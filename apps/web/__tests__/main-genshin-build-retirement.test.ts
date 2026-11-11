import { existsSync, readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import BuildPage from '../app/[lang]/[game]/build/page';
import middleware from '../middleware';

it('removes the Main Genshin build implementation and dynamic entry', () => {
  const directory = new URL('../app/[lang]/[game]/build/', import.meta.url);
  expect(existsSync(new URL('genshin-build-client.tsx', directory))).toBe(false);
  expect(readFileSync(new URL('build-client.tsx', directory), 'utf8')).not.toContain('genshin-build-client');
});

it('rejects direct Main build rendering in every supported locale', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    await expect(BuildPage({ params: Promise.resolve({ lang, game: 'genshin' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    for (const suffix of ['', '/unknown']) {
      const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/build${suffix}`));
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
});

it('preserves other game build entry points and the remaining tool routes', async () => {
  for (const game of ['starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'endfield']) {
    expect(await BuildPage({ params: Promise.resolve({ lang: 'en', game }) })).toBeTruthy();
    const response = middleware(new NextRequest(`https://gachia.com/en/${game}/build`));
    expect(response.status, game).toBe(game === 'nte' ? 301 : 200);
    if (game === 'nte') expect(response.headers.get('location')).toBe('https://gachia.com/en/nte');
  }
  for (const route of ['map']) {
    expect(middleware(new NextRequest(`https://gachia.com/en/genshin/${route}`)).status).toBe(404);
  }
});

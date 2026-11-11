import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';
import Home, { generateMetadata as homeMetadata } from '../app/[lang]/[game]/page';
import Version, { generateMetadata as versionMetadata } from '../app/[lang]/[game]/version/page';
import Download, { generateMetadata as downloadMetadata, generateStaticParams } from '../app/[lang]/[game]/download/page';
import Gacha, { generateMetadata as gachaMetadata } from '../app/[lang]/[game]/gacha/page';
import { getVersionSnapshot } from '../lib/version-snapshots';

const pages = [['', Home, homeMetadata], ['/version', Version, versionMetadata],
  ['/download', Download, downloadMetadata], ['/gacha', Gacha, gachaMetadata]] as const;

it.each(['zh', 'en', 'ja'])('retires direct Main hubs and metadata without touching %s player records', async lang => {
  for (const [route, page, metadata] of pages) {
    const params = Promise.resolve({ lang, game: 'genshin' });
    await expect(page({ params })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(await metadata({ params })).toEqual({ robots: { index: false, follow: false } });
    for (const suffix of ['', '/', '?source=legacy', ...(route ? ['/example'] : [])]) {
      let response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin${route}${suffix}`));
      if (suffix === '/') {
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(`https://gachia.com/${lang}/genshin${route}`);
        response = middleware(new NextRequest(response.headers.get('location')!));
      }
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
  expect(middleware(new NextRequest(`https://gachia.com/${lang}/genshin/shared/existing`)).status).toBe(200);
});

it('removes the duplicate version snapshot and Genshin download prerender entries', () => {
  expect(getVersionSnapshot('genshin')).toBeUndefined();
  expect(generateStaticParams().some(row => row.game === 'genshin')).toBe(false);
  expect(generateStaticParams().some(row => row.game === 'starrail')).toBe(true);
  for (const file of ['../app/[lang]/[game]/page.tsx', '../app/[lang]/[game]/version/page.tsx',
    '../app/[lang]/[game]/download/page.tsx', '../lib/version-snapshots.ts']) {
    expect(readFileSync(new URL(file, import.meta.url), 'utf8')).not.toMatch(/^\s*genshin: /m);
  }
});

it('preserves other hubs and unlocalized redirects without widening the retirement prefix', async () => {
  for (const route of ['', '/version', '/download', '/gacha']) {
    expect(middleware(new NextRequest(`https://gachia.com/en/starrail${route}`)).status).toBe(200);
    const redirect = middleware(new NextRequest(`https://gachia.com/genshin${route}`));
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get('location')).toBe(`https://gachia.com/zh/genshin${route}`);
  }
  expect((await homeMetadata({ params: Promise.resolve({ lang: 'en', game: 'starrail' }) })).title).toContain('Star Rail');
  expect((await versionMetadata({ params: Promise.resolve({ lang: 'en', game: 'starrail' }) })).title).toContain('v4.6');
  expect((await downloadMetadata({ params: Promise.resolve({ lang: 'en', game: 'starrail' }) })).title).toContain('Download');
});

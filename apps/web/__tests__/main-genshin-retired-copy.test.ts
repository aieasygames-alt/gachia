import { expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import * as calculator from '../app/[lang]/[game]/calculator/page';
import * as characters from '../app/[lang]/[game]/characters/page';
import * as guides from '../app/[lang]/[game]/guides/page';
import * as items from '../app/[lang]/[game]/items/page';
import * as redeemCodes from '../app/[lang]/[game]/redeem-codes/page';
import * as weapons from '../app/[lang]/[game]/weapons/page';
import { GET } from '../app/llms.txt/route';
import middleware from '../middleware';

const pages = { calculator, characters, guides, items, 'redeem-codes': redeemCodes, weapons };

it.each(Object.entries(pages))('retires the Main Genshin %s entry in every locale', async (section, page) => {
  for (const lang of ['zh', 'en', 'ja']) {
    const params = Promise.resolve({ lang, game: 'genshin' });
    await expect(page.default({ params })).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    expect(await page.generateMetadata({ params })).toEqual({ robots: { index: false, follow: false } });
    const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/${section}`));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(middleware(new NextRequest(`https://gachia.com/${lang}/starrail/${section}`)).status).toBe(200);
  }
});

it('links to the dedicated version hub without pinning an obsolete version in llms.txt', async () => {
  const text = await GET().text();
  expect(text).toContain('Genshin Impact version hub: https://gachia.com/en/genshin/version');
  expect(text).not.toContain('Genshin Luna VIII version hub');
  expect(text).toContain('Genshin banner schedule: https://gachia.com/en/genshin/guides/banner-schedule-guide');
});

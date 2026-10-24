import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as core from '@gachia/core';
import { CATEGORY_LABELS, GAMES } from '@gachia/core';
import { getGameRoutes, getGameRouteLabel } from '@/lib/games/registry';
import { getItemData, getItemListData, getItemsForStaticParams } from '@/lib/game-data/items';
import { getVersionSnapshot } from '@/lib/version-snapshots';
import { ROCO_PUBLIC_REVIEW, ROCO_REVIEW_NAVIGATION, rocoPublicReviewMetadata } from '@/lib/roco-public-review';
import sitemap from '@/app/sitemaps/main/sitemap';
import * as seo from '@/lib/seo-metadata';

const loadCodes = vi.fn();
// Compile just the server page so Next's preserved JSX config need not change for Vitest.
function loadPage(route: 'items' | 'redeem-codes') {
  const source = readFileSync(new URL(`../app/[lang]/[game]/${route}/page.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: { default: (props: { params: Promise<{ lang: string; game: string }> }) => Promise<{ props: unknown }>; generateMetadata: (props: { params: Promise<{ lang: string; game: string }> }) => Promise<{ alternates?: { canonical?: string } }> } = {} as never;
  const dependencies: Record<string, unknown> = {
    '@gachia/core': core,
    'react/jsx-runtime': { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) },
    'next/navigation': { notFound: () => { throw new Error('NEXT_NOT_FOUND'); } },
    '@/lib/game-data/redeem-codes': { getRedeemCodesForGame: loadCodes, GAMES_WITH_REDEEM_CODES: ['roco', 'roco-cn', 'wuwa'] },
    '@/lib/redeem-codes': {},
    '@/components/wiki/roco-public-review-page': { RocoPublicReviewPage: 'review-page' },
    '@/lib/roco-public-review': { rocoPublicReviewMetadata },
    '@/lib/jsonld-script': {}, '@/lib/game-data/items': {}, '@/lib/i18n/navigation': { Link: 'a' },
    '@/lib/seo-metadata': seo,
  };
  new Function('require', 'exports', compiled)((name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected page dependency: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}

it.each(['zh', 'en', 'ja'] as const)('withdraws the %s international code hub before loading any records', async locale => {
  const { default: Page, generateMetadata } = loadPage('redeem-codes');
  loadCodes.mockClear();
  // A future raw-data edit must not silently bypass the editorial review gate.
  loadCodes.mockResolvedValue([{ code: 'UNREVIEWED', status: 'active' }]);
  const params = Promise.resolve({ lang: locale, game: 'roco' });
  const element = await Page({ params });
  expect(element.props).toMatchObject({ route: 'redeem-codes', locale });
  expect(loadCodes).not.toHaveBeenCalled();
  const metadata = await generateMetadata({ params });
  expect(metadata).toEqual(rocoPublicReviewMetadata('redeem-codes', locale));
  expect(metadata).toMatchObject({ robots: { index: false, follow: true }, alternates: { canonical: `https://gachia.com/${locale}/roco/redeem-codes` } });
  expect(metadata.alternates).not.toHaveProperty('languages');
  expect(getGameRouteLabel('roco', 'redeem-codes', locale)).toBe(`${CATEGORY_LABELS['redeem-codes']![locale]}${ROCO_REVIEW_NAVIGATION[locale].reviewSuffix}`);
  expect(getGameRouteLabel('roco-cn', 'redeem-codes', locale)).toBe(CATEGORY_LABELS['redeem-codes']![locale]);
  expect(ROCO_PUBLIC_REVIEW['redeem-codes'][locale].checks).toHaveLength(3);
});

it.each(['zh', 'en', 'ja'] as const)('rejects the disabled %s international item list and keeps CN items available', async locale => {
  const { default: Page, generateMetadata } = loadPage('items');
  const params = Promise.resolve({ lang: locale, game: 'roco' });
  await expect(Page({ params })).rejects.toThrow('NEXT_NOT_FOUND');
  await expect(generateMetadata({ params })).rejects.toThrow('NEXT_NOT_FOUND');
  expect(GAMES.roco.routes.items).toBe(false);
  expect(getGameRoutes('roco').some(row => row.slug === 'items')).toBe(false);
  expect(await getItemListData('roco', locale)).toEqual([]);
  expect(await getItemsForStaticParams('roco')).toEqual([]);
  expect(await getItemData('roco', 'gulu-ball', locale)).toBeNull();
  expect((await getItemListData('roco-cn', locale)).length).toBeGreaterThan(0);
  const cnMeta = await generateMetadata({ params: Promise.resolve({ lang: locale, game: 'roco-cn' }) });
  expect(cnMeta.alternates?.canonical).toBe(`https://gachia.com/${locale}/roco-cn/items`);
  const urls = new Set((await sitemap()).map(row => row.url));
  for (const route of ['items', 'redeem-codes']) {
    expect(urls.has(`https://gachia.com/${locale}/roco/${route}`)).toBe(false);
    expect(urls.has(`https://gachia.com/${locale}/roco-cn/${route}`)).toBe(true);
  }
});

it('removes dormant reward endorsements and prevents a version CTA pointing to the rejected item list', () => {
  const source = readFileSync(new URL('../app/[lang]/[game]/redeem-codes/page.tsx', import.meta.url), 'utf8');
  expect(source).not.toMatch(/RocoRedeemHub|rocokingdom\.com|2026-10-27|2026-09-07|CBT eligibility email/);
  const links = getVersionSnapshot('roco')!.links;
  expect(links.some(row => row.href === '/roco/items')).toBe(false);
  expect(links.find(row => row.type === 'codes')).toMatchObject({ href: '/roco/redeem-codes', label: { en: 'Code claims withdrawal' } });
  expect(getVersionSnapshot('roco-cn')!.links.some(row => row.href === '/roco-cn/redeem-codes')).toBe(true);
});

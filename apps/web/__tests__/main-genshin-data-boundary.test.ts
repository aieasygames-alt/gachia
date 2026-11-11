import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as characters from '@/lib/game-data/characters';
import * as weapons from '@/lib/game-data/weapons';
import * as items from '@/lib/game-data/items';
import * as artifacts from '@/lib/game-data/artifacts';
import { getGuideListData } from '@/lib/game-data/guides';
import { getRedeemCodesForGame, GAMES_WITH_REDEEM_CODES } from '@/lib/game-data/redeem-codes';
import { GenshinContentUnavailableError } from '@/lib/genshin-platform-content';
import middleware from '../middleware';
import { generateStaticParams as layoutParams } from '../app/[lang]/[game]/layout';
import platform from '../public/data-client/genshin-platform.json';

const context = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: context.get }));
afterEach(() => { vi.unstubAllEnvs(); context.get.mockReset(); });

it.each(['characters', 'weapons', 'items', 'artifacts', 'guides', 'redeem-codes'])('removes actual Genshin data imports from Main %s loaders', name => {
  const file = fileURLToPath(new URL(`../lib/game-data/${name}.ts`, import.meta.url));
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies: string[] = [];
  const walk = (node: ts.Node) => {
    if (ts.isStringLiteral(node) && node.text.includes('@gachia/data/games/genshin/')) dependencies.push(node.text);
    ts.forEachChild(node, walk);
  };
  walk(source);
  expect(dependencies).toEqual([]);
});

it.each(['../app/sitemaps/main/sitemap.ts', '../app/[lang]/[game]/guides/[slug]/page.tsx'])('removes duplicate Genshin source imports from %s', path => {
  expect(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')).not.toContain('@gachia/data/games/genshin/');
});

it.each(['development', 'production'])('does not generate duplicate Main Genshin entities in %s', async mode => {
  vi.stubEnv('NODE_ENV', mode);
  expect(await characters.getCharactersForStaticParams('genshin')).toEqual([]);
  expect(await weapons.getWeaponsForStaticParams('genshin')).toEqual([]);
  expect(await items.getItemsForStaticParams('genshin')).toEqual([]);
  expect(await artifacts.getArtifactsForStaticParams('genshin')).toEqual([]);
  expect(layoutParams().some(row => row.game === 'genshin')).toBe(false);
});

it('does not expose duplicate catalogue lists or details through Main loaders', async () => {
  expect(await characters.getCharacterListData('genshin', 'en')).toEqual([]);
  expect(await characters.getCharacterMetaData('genshin', 'hu-tao', 'en')).toBeNull();
  expect(await weapons.getWeaponListData('genshin', 'en')).toEqual([]);
  expect(await weapons.getWeaponMetaData('genshin', 'staff-of-homa', 'en')).toBeNull();
  expect(await weapons.getWeaponDetailData('genshin', 'staff-of-homa', 'en')).toBeNull();
  expect(await items.getItemListData('genshin', 'en')).toEqual([]);
  expect(await items.getItemData('genshin', 'silk-flower', 'en')).toBeNull();
  expect(await items.getCharactersNeedingMaterial('genshin', 'silk-flower')).toEqual([]);
  expect(await artifacts.getArtifactListData('genshin', 'en')).toBeNull();
  expect(await artifacts.getArtifactDetailData('genshin', 'crimson-witch-of-flames', 'en')).toBeNull();
  expect(await getGuideListData('genshin', 'en')).toEqual({ guides: [], categories: [], categoryLabels: {} });
  expect(await getRedeemCodesForGame('genshin')).toEqual([]);
  expect(GAMES_WITH_REDEEM_CODES).not.toContain('genshin');
});

it('keeps the platform summary request-scoped and follows owner A/B without a Main import or rebuild', async () => {
  let active = structuredClone(platform);
  const fetch = vi.fn(async () => Response.json(active));
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: { fetch } } });
  const ids = ['missing', 'raiden-shogun', 'hu-tao', 'hu-tao'];
  const a = await characters.getCharacterSummariesByIds('genshin', ids, 'en');
  expect(a.map(row => row.id)).toEqual(['raiden-shogun', 'hu-tao', 'hu-tao']);
  expect(a[1]!.name).toBe('Hu Tao');
  active = structuredClone(active);
  active.version = 'b'.repeat(64);
  const owner = active.data.characters.find(row => row.id === 'hu-tao')!;
  owner.name.en = 'Owner B';
  owner.imageUrl = 'https://img.gachia.com/images/genshin/characters/owner-b.webp';
  expect((await characters.getCharacterSummariesByIds('genshin', ids, 'en'))[1]).toEqual({ id: 'hu-tao', name: 'Owner B', image: owner.imageUrl });
  expect(fetch).toHaveBeenCalledTimes(2);
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true' } });
  await expect(characters.getCharacterSummariesByIds('genshin', ids, 'en')).rejects.toThrow(GenshinContentUnavailableError);
});

it.each(['zh', 'en', 'ja'])('makes retired Main data pages explicit 404 while keeping %s shared records and APIs separate', locale => {
  for (const section of ['characters', 'weapons', 'items', 'artifacts', 'guides', 'redeem-codes']) {
    for (const suffix of ['', '/example']) {
      const response = middleware(new NextRequest(`https://gachia.com/${locale}/genshin/${section}${suffix}`));
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
  expect(middleware(new NextRequest(`https://gachia.com/${locale}/genshin/shared/record`)).status).toBe(200);
  expect(middleware(new NextRequest(`https://gachia.com/${locale}/genshin/map`)).status).toBe(404);
  expect(middleware(new NextRequest(`https://gachia.com/${locale}/starrail/characters`)).status).toBe(200);
});

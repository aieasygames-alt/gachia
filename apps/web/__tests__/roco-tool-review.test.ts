import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import { getRocoTypeElements, getRocoTypeMatchups, getTypeMultiplier } from '@/lib/game-data/roco-type-chart';
import { ROCO_EGGS } from '@/lib/game-data/roco-eggs';
import { ROCO_MERCHANTS } from '@/lib/game-data/roco-merchants';
import { getWeaponDetailData, getWeaponListData, getWeaponMetaData, getWeaponsForStaticParams } from '@/lib/game-data/weapons';
import { rocoLegacyWeaponIds } from '@gachia/data/games/roco/weapons';
import { getGameRouteLabel, getGameRoutes } from '@/lib/games/registry';
import { isRocoPublicPageUnderReview, rocoWeaponReviewMetadata, ROCO_PUBLIC_REVIEW, ROCO_REVIEW_NAVIGATION } from '@/lib/roco-public-review';
import sitemap from '@/app/sitemaps/main/sitemap';
import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-10-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));

it.each(['zh', 'en', 'ja'] as const)('does not let the shared %s footer assert every record came from a game client', locale => {
  const messages = { zh: zhMessages, en: enMessages, ja: jaMessages }[locale];
  expect(messages.footer.disclaimer).not.toMatch(/来源于游戏客户端|sourced from the game client|ゲームクライアントから取得/);
  expect(messages.footer.disclaimer).toContain({ zh: '未核实内容不代表官方确认', en: 'unverified content is not official confirmation', ja: '未確認の内容は公式確認を意味しません' }[locale]);
});
function legacyModule<T>(path: string): T {
  const source = proof.originalSources.find((row: { path: string }) => row.path === path).originalSource;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name: string) => {
    if (name === '@gachia/core') return { GAMES };
    throw new Error(`Unexpected legacy dependency: ${name}`);
  }, exports);
  return exports as T;
}

it('requires explicit region and does not turn unknown international rules into 1x', () => {
  expect(getRocoTypeElements('roco')).toEqual([]);
  expect(getRocoTypeMatchups('roco')).toEqual([]);
  for (const attack of [...GAMES.roco.elements.map(row => row.id), 'missing']) {
    for (const defense of [...GAMES.roco.elements.map(row => row.id), 'missing']) {
      expect(getTypeMultiplier('roco', attack, defense)).toBeNull();
    }
  }
  for (const [attack, defense] of [['missing', 'water'], ['grass', 'missing'], ['', '']]) {
    expect(getTypeMultiplier('roco-cn', attack!, defense!)).toBeNull();
  }
});

it('preserves all existing CN chart values and watchlists without calling them newly verified', () => {
  const old = legacyModule<{ getTypeMultiplier: (a: string, b: string) => number }>('apps/web/lib/game-data/roco-type-chart.ts');
  const rows = getRocoTypeMatchups('roco-cn');
  expect(rows).toHaveLength(GAMES['roco-cn'].elements.length ** 2);
  for (const row of rows) expect(row.multiplier).toBe(old.getTypeMultiplier(row.attack, row.defense));
  expect(ROCO_EGGS.roco).toEqual([]);
  expect(ROCO_MERCHANTS.roco).toEqual([]);
  expect(ROCO_EGGS['roco-cn']).toEqual(legacyModule<{ ROCO_EGGS: typeof ROCO_EGGS }>('apps/web/lib/game-data/roco-eggs.ts').ROCO_EGGS['roco-cn']);
  expect(ROCO_MERCHANTS['roco-cn']).toEqual(legacyModule<{ ROCO_MERCHANTS: typeof ROCO_MERCHANTS }>('apps/web/lib/game-data/roco-merchants.ts').ROCO_MERCHANTS['roco-cn']);
});

it.each(['zh', 'en', 'ja'] as const)('keeps legacy URLs, but not unsupported item facts, across %s consumers', async locale => {
  expect(await getWeaponListData('roco', locale)).toEqual([]);
  expect(await getWeaponsForStaticParams('roco')).toEqual(rocoLegacyWeaponIds.map(id => ({ id })));
  expect(rocoLegacyWeaponIds).toEqual(proof.legacyWeaponIds);
  for (const id of rocoLegacyWeaponIds) {
    expect(await getWeaponDetailData('roco', id, locale)).toBeNull();
    expect(await getWeaponMetaData('roco', id, locale)).toBeNull();
    const metadata = rocoWeaponReviewMetadata(id, locale)!;
    expect(metadata).toMatchObject({ robots: { index: false, follow: true }, alternates: { canonical: `https://gachia.com/${locale}/roco/weapons/${id}` } });
    expect(metadata.alternates).not.toHaveProperty('languages');
    expect(metadata.description).toBe(ROCO_PUBLIC_REVIEW.weapons[locale].description);
    expect(isRocoPublicPageUnderReview('roco', `weapons/${id}`)).toBe(true);
    expect(isRocoPublicPageUnderReview('roco-cn', `weapons/${id}`)).toBe(false);
  }
  expect(rocoWeaponReviewMetadata('not-a-record', locale)).toBeNull();
  expect(isRocoPublicPageUnderReview('roco', 'weapons/not-a-record')).toBe(false);
  expect(isRocoPublicPageUnderReview('roco', `weapons/${rocoLegacyWeaponIds[0]}/extra`)).toBe(false);
  expect((await getWeaponListData('roco-cn', locale)).length).toBe(10);
  expect(await getWeaponDetailData('roco-cn', rocoLegacyWeaponIds[0], locale)).not.toBeNull();
  const urls = new Set((await sitemap()).map(row => row.url));
  for (const route of ['type-chart', 'eggs', 'merchant', 'weapons']) {
    expect(urls.has(`https://gachia.com/${locale}/roco/${route}`)).toBe(false);
    expect(urls.has(`https://gachia.com/${locale}/roco-cn/${route}`)).toBe(true);
    expect(getGameRouteLabel('roco', route, locale)).toBe(`${CATEGORY_LABELS[route]![locale]}${ROCO_REVIEW_NAVIGATION[locale].reviewSuffix}`);
    expect(getGameRouteLabel('roco-cn', route, locale)).toBe(CATEGORY_LABELS[route]![locale]);
    expect(getGameRoutes('roco').find(row => row.slug === route)?.label(locale)).toBe(getGameRouteLabel('roco', route, locale));
  }
  for (const id of rocoLegacyWeaponIds) expect(urls.has(`https://gachia.com/${locale}/roco/weapons/${id}`)).toBe(false);
});

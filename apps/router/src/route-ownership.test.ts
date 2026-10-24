import { describe, expect, it } from 'vitest';
import routes from '../../../packages/core/route-ownership.json';
import { getRouteOwner, isMainSitemapPath } from '../../../packages/core/route-ownership';
import router from './index';
import { GENERATED_GAME_DEPLOYMENTS } from './generated-game-deployments';

describe('shared path ownership', () => {
  it('registers each dedicated deployment and keeps approved fallbacks disjoint', () => {
    expect(routes.schemaVersion).toBe(1);
    expect(Object.keys(routes.games).sort()).toEqual(GENERATED_GAME_DEPLOYMENTS.map(deployment => deployment.id).sort());
    for (const rule of Object.values(routes.games)) {
      expect(rule.mainIndexableDetails.some(section => rule.details.includes(section))).toBe(false);
    }
  });
  it('preserves the legacy Router dispatch matrix without changing traffic switches', async () => {
    const paths = new Set<string>();
    for (const [game, rule] of Object.entries(routes.games)) {
      for (const locale of ['zh', 'en', 'ja', 'fr']) {
        paths.add(`/${locale}/${game}`);
        for (const section of [...new Set([...rule.pages, ...rule.details, 'unknown'])]) {
          for (const suffix of ['', '/sample', '/sample/extra']) paths.add(`/${locale}/${game}/${section}${suffix}`);
        }
      }
      for (const prefix of ['_games', 'sitemaps']) {
        for (const suffix of ['', '/index.xml', '/nested/file']) paths.add(`/${prefix}/${game}${suffix}`);
      }
    }
    const matrix = [...paths].sort().map(path => `${path}\t${getRouteOwner(path)}\n`).join('');
    // Frozen from S2.15's actual Router tables, not from the new classifier.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(matrix));
    expect([...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')).toBe('6f4629fabf35c459f9518341c811c8337762fbd4505af0f82291f355259e08f3');
  });

  it('does not turn arbitrary Main fallbacks into indexable pages', () => {
    for (const locale of ['zh', 'en', 'ja']) {
      const item = `/${locale}/nte/items/annulith`;
      expect(getRouteOwner(item)).toBe('main');
      expect(isMainSitemapPath(item)).toBe(true);
      expect(getRouteOwner(`/${locale}/nte/items`)).toBe('nte');
      expect(isMainSitemapPath(`/${locale}/nte/unknown/sample`)).toBe(false);
      expect(isMainSitemapPath(`/${locale}/nte/items/annulith/extra`)).toBe(false);
      expect(isMainSitemapPath(`/${locale}/lvmeng`)).toBe(false);
      expect(isMainSitemapPath(`/${locale}/nte/guides/sample`)).toBe(false);
    }
  });

  it('delivers item details to Main and item lists to NTE with all bindings enabled', async () => {
    const fetcher = (name: string) => ({
      fetch: async () => new Response(name),
      connect: () => { throw new Error('connect is not used'); },
    }) as Fetcher;
    const env = {
      MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'true',
      GENSHIN_SITE: fetcher('genshin'), GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true',
      AZUR_PROMILIA_SITE: fetcher('azur-promilia'), AZUR_PROMILIA_ENABLED: 'true',
      LVMENG_SITE: fetcher('lvmeng'), LVMENG_ENABLED: 'true',
    };
    for (const locale of ['zh', 'en', 'ja']) {
      for (const [path, owner] of [
        [`/${locale}/nte/items/annulith`, 'main'], [`/${locale}/nte/items`, 'nte'],
        [`/${locale}/nte/characters/aurelia`, 'nte'], [`/${locale}/lvmeng`, locale === 'zh' ? 'lvmeng' : 'main'],
      ]) {
        const response = await router.fetch(new Request(`https://gachia.com${path}`), env);
        expect(await response.text()).toBe(owner);
      }
    }
  });
});

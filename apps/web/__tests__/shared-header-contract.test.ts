import { describe, expect, it } from 'vitest';
import { createSharedHeaderModel, headerFeaturedGameIds, headerGameIds, headerMoreGameIds } from '@gachia/ui';

describe('shared header contract', () => {
  it('keeps featured and more games disjoint and complete', () => {
    expect(new Set(headerFeaturedGameIds).size).toBe(headerFeaturedGameIds.length);
    expect(new Set(headerMoreGameIds).size).toBe(headerMoreGameIds.length);
    expect(new Set([...headerFeaturedGameIds, ...headerMoreGameIds])).toEqual(new Set(headerGameIds));
  });

  it('keeps independently deployed games registered', () => {
    expect(headerGameIds).toContain('nte');
    expect(headerGameIds).toContain('azur-promilia');
    expect(headerGameIds).toContain('lvmeng');
  });

  it('creates a complete localized navigation model for every locale', () => {
    for (const locale of ['zh', 'en', 'ja'] as const) {
      const header = createSharedHeaderModel(locale);
      const expectedGameIds = locale === 'zh' ? headerGameIds : headerGameIds.filter((gameId) => gameId !== 'lvmeng');

      expect(new Set([...header.featuredGames, ...header.moreGames].map((game) => game.id))).toEqual(new Set(expectedGameIds));
      expect(header.languages.map((language) => language.locale)).toEqual(['zh', 'en', 'ja']);
      expect(header.moreGamesLabel).not.toBe('');
    }
  });

  it('only exposes the Chinese-only Lvmeng route in Chinese navigation', () => {
    expect(createSharedHeaderModel('zh').featuredGames.map((game) => game.id)).toContain('lvmeng');
    expect(createSharedHeaderModel('en').featuredGames.map((game) => game.id)).not.toContain('lvmeng');
    expect(createSharedHeaderModel('ja').featuredGames.map((game) => game.id)).not.toContain('lvmeng');
  });
});

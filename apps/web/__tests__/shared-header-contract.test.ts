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
  });

  it('creates the same complete navigation model for every locale', () => {
    for (const locale of ['zh', 'en', 'ja'] as const) {
      const header = createSharedHeaderModel(locale);

      expect(header.featuredGames.map((game) => game.id)).toEqual(headerFeaturedGameIds);
      expect(header.moreGames.map((game) => game.id)).toEqual(headerMoreGameIds);
      expect(header.languages.map((language) => language.locale)).toEqual(['zh', 'en', 'ja']);
      expect(header.moreGamesLabel).not.toBe('');
    }
  });
});

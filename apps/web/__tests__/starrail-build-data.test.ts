import { describe, expect, it } from 'vitest';
import { getUsableStarRailBuild } from '@gachia/data/games/starrail/build';
import { starrailCharacters } from '@gachia/data/games/starrail/characters';

describe('Star Rail build availability', () => {
  it('accepts existing detailed builds and rejects the incompatible imported records', () => {
    const complete = starrailCharacters.find(c => c.id === 'seele')!;
    const incomplete = starrailCharacters.find(c => c.id === 'silver-wolf-lv999')!;
    expect(getUsableStarRailBuild(complete.recommendedBuild)).toBe(complete.recommendedBuild);
    expect(getUsableStarRailBuild(incomplete.recommendedBuild)).toBeNull();
  });
  it('protects string comparisons and list rendering against partial data', () => {
    const build = starrailCharacters.find(c => c.id === 'seele')!.recommendedBuild;
    for (const value of [null, {}, { artifacts: [], weapons: [], teams: [] },
      { ...build, bestLightConeEn: undefined }, { ...build, bestRelicSetEn: null },
      { ...build, mainStatsEn: undefined }, { ...build, subStatPriority: 'SPD' }]) {
      expect(getUsableStarRailBuild(value)).toBeNull();
    }
    for (const character of starrailCharacters) {
      const usable = getUsableStarRailBuild(character.recommendedBuild);
      if (!usable) continue;
      expect(() => {
        usable.bestLightConeEn.toLowerCase();
        Object.entries(usable.mainStatsEn);
        usable.subStatPriorityEn.map(String);
      }).not.toThrow();
    }
  });
});

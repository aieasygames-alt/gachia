import { describe, expect, it } from 'vitest';
import { zzzGuides } from '@gachia/data/games/zzz/guides';

describe('ZZZ guide data', () => {
  it('provides tags for related-guide scoring', () => {
    expect(zzzGuides.length).toBeGreaterThan(0);

    for (const guide of zzzGuides) {
      expect(Array.isArray(guide.tags)).toBe(true);
      expect(guide.tags.length).toBeGreaterThan(0);
    }
  });
});

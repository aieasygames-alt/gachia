import { describe, expect, it } from 'vitest';
import { headerFeaturedGameIds, headerGameIds, headerMoreGameIds } from '@gachia/ui';

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
});

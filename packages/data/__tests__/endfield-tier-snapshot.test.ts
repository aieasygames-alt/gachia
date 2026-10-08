import { describe, expect, it } from 'vitest';
import { tierLists } from '../games/endfield/tier-lists';

describe('Endfield tier snapshot', () => {
  it('keeps the Pioneer Test rating snapshot date explicit', () => {
    expect(tierLists).toHaveLength(3);
    expect(new Set(tierLists.map((list) => list.updatedAt))).toEqual(new Set(['2026-06-06']));
    expect(tierLists.every((list) => list.entries.length > 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { THREE_GAME_STATUS_CARDS } from '@/lib/three-game-status';

describe('three-game next-step selector data', () => {
  it('offers a unique actionable destination for each game stage', () => {
    const status = new Set(THREE_GAME_STATUS_CARDS.map((item) => item.status));
    const paths = new Set(THREE_GAME_STATUS_CARDS.map((item) => item.href));

    expect(status).toEqual(new Set(['live', 'post-test']));
    expect(paths.size).toBe(THREE_GAME_STATUS_CARDS.length);
    expect(THREE_GAME_STATUS_CARDS.every((item) => item.action.trim().length > 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { THREE_GAME_STATUS_CARDS, THREE_GAME_STATUS_UPDATED_AT } from '@/lib/three-game-status';

describe('three-game status cards', () => {
  it('keeps one explicit status and action route for each planned game', () => {
    expect(THREE_GAME_STATUS_UPDATED_AT).toBe('2026-10-15');
    expect(THREE_GAME_STATUS_CARDS.map((item) => item.id)).toEqual(['aniimo', 'azur-promilia', 'lvmeng']);
    expect(THREE_GAME_STATUS_CARDS.map((item) => item.status)).toEqual(['live', 'post-test', 'live']);

    for (const item of THREE_GAME_STATUS_CARDS) {
      expect(item.href).toMatch(/^\/zh\//);
      expect(item.action.trim()).not.toBe('');
      expect(item.checkedAt).toBe(item.id === 'aniimo' ? '2026-09-30' : THREE_GAME_STATUS_UPDATED_AT);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

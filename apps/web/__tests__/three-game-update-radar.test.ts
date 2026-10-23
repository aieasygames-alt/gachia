import { describe, expect, it } from 'vitest';
import { THREE_GAME_UPDATE_RADAR } from '@/lib/three-game-update-radar';

describe('three-game update radar', () => {
  it('provides a distinct next verification checklist for every content stage', () => {
    expect(THREE_GAME_UPDATE_RADAR.map((item) => item.status)).toEqual(['live', 'post-test', 'live']);

    for (const item of THREE_GAME_UPDATE_RADAR) {
      expect(item.focus.title).not.toBe('');
      expect(item.focus.description).not.toBe('');
      expect(item.focus.checklist).toHaveLength(3);
      expect(item.href).toMatch(/^\/(aniimo|azur-promilia|lvmeng)\//);
      expect(item.href).not.toMatch(/^\/(zh|en|ja)\//);
    }
  });
});

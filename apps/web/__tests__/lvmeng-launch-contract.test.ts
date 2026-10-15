import { describe, expect, it } from 'vitest';
import { deviceRequirements, game, launchRewards, playableCharacters, releaseStatus, versionHistory } from '../../game-lvmeng/lib/data';
import sitemap from '../../game-lvmeng/app/sitemap';

describe('Lvmeng official launch contract', () => {
  it('separates platform storage and confirmed account scope', () => {
    expect(game.version).toContain('1.0');
    expect(game.launchDate).toContain('公测已开启');
    expect(deviceRequirements.find((entry) => entry.platform === 'PC Windows')?.storage).toBe('25GB以上');
    expect(deviceRequirements.filter((entry) => entry.platform !== 'PC Windows').every((entry) => entry.storage === '15GB以上')).toBe(true);
    expect(releaseStatus.find((entry) => entry.label === '跨平台游戏数据')?.value).toContain('同一 UID');
    expect(versionHistory[0].status).toBe('公测已开启');
    expect(launchRewards[0].note).toContain('不是首周到期福利');
  });

  it('includes every published character in the game sitemap without duplicate URLs', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const character of playableCharacters) {
      expect(urls).toContain(`https://gachia.com/zh/lvmeng/characters/${character.slug}`);
    }
    expect(playableCharacters.some((entry) => entry.slug === 'he-yulian')).toBe(true);
  });
});

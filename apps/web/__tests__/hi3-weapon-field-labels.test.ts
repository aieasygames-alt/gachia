import { describe, expect, it } from 'vitest';
import { hi3WeaponFieldLabels } from '../lib/hi3-weapon-field-labels';
import { getWeaponDetailData, getWeaponListData } from '../lib/game-data/weapons';

describe('HI3 per-field evidence presentation', () => {
  for (const locale of ['zh', 'en', 'ja'] as const) {
    it(`qualifies unsupported labels while retaining filter keys in ${locale}`, async () => {
      const list = await getWeaponListData('hi3', locale);
      const row = list.find(row => row.id === 'vermillion-liuli')!;
      expect(row.rankGroup).toBe('5-star');
      expect(row.rankLabel).not.toBe('5-star');
      expect(row.typeGroup).toBe('Fists');
      expect(row.typeLabel).not.toBe('Fists');
      const detail = await getWeaponDetailData('hi3', row.id, locale);
      expect(detail?.rarity).toBe(0);
      expect(detail?.rank).toBe(row.rankLabel);
      expect(detail?.infoCards[0]?.value).toBe(row.typeLabel);
      const supported = list.find(row => row.id === 'volatile-sparkler')!;
      expect(supported.rankLabel).toBe('4-star');
      expect(supported.typeLabel).toBe('Drive Core');
    });
  }
  it('cannot reuse Sparkler evidence for changed values or an unknown weapon', () => {
    expect(hi3WeaponFieldLabels('volatile-sparkler', '5-star', 'Drive Core', 'en').rarity).toBe(0);
    expect(hi3WeaponFieldLabels('unknown', '4-star', 'Drive Core', 'en').rarity).toBe(0);
  });
});

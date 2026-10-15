import { describe, expect, it } from 'vitest';
import { getWeaponsForStaticParams } from '../lib/game-data/weapons';
import { LOCALES } from '@gachia/core';

describe('HI3 weapon prerender eligibility inputs', () => {
  it('enumerates reviewed weapons rather than silently omitting HI3', async () => {
    const weapons = await getWeaponsForStaticParams('hi3');
    expect(weapons.map(weapon => weapon.id)).toContain('vermillion-liuli');
    expect(weapons.map(weapon => weapon.id)).toContain('vermillion-liuli-full-burn');
    expect(new Set(weapons.map(weapon => weapon.id)).size).toBe(weapons.length);
    expect(LOCALES.flatMap(lang => weapons.map(weapon => ({ lang, game: 'hi3', id: weapon.id })))).toHaveLength(weapons.length * LOCALES.length);
    // Enumeration is not proof Next can prerender the full ancestor/request dependency tree.
  });
});

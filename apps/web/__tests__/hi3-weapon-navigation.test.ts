import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getWeaponListData } from '@/lib/game-data/weapons';

describe('HI3 weapon index navigation contract', () => {
  it('passes game ownership to cards and limits new detail links to HI3', async () => {
    const source = await readFile(join(process.cwd(), 'app/[lang]/[game]/weapons/page.tsx'), 'utf8');
    expect(source).toContain('locale={locale} gameId={gameId}');
    expect(source).toContain("gameId === 'hi3' ? (");
    expect(source).toContain('<Link href={`/hi3/weapons/${weapon.id}`}');
    expect(source).toContain('focus-visible:outline-game-primary');
    expect(source).toContain(') : weapon.name}');
  });
  for (const lang of ['zh', 'en', 'ja'] as const) {
    it(`provides named published IDs for each detail link in ${lang}`, async () => {
      const weapons = await getWeaponListData('hi3', lang);
      expect(weapons.map((weapon) => weapon.id)).toEqual([
        'vermillion-liuli', 'vermillion-liuli-full-burn', 'volatile-sparkler',
      ]);
      expect(weapons.every((weapon) => weapon.name.trim().length > 0)).toBe(true);
    });
  }
});

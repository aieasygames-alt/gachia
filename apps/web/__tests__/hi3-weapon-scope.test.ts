import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hi3WeaponMetadata, hi3WeaponScope, hi3WeaponSearchScope } from '@/lib/hi3-weapon-scope';

describe('HI3 weapon announcement presentation boundaries', () => {
  for (const locale of ['zh', 'en', 'ja'] as const) {
    it(`keeps bounded metadata independent of long names in ${locale}`, () => {
      const metadata = hi3WeaponMetadata(locale, 'Long name '.repeat(100));
      expect(metadata.description).toBe(hi3WeaponMetadata(locale).description);
      expect(metadata.description.length).toBeLessThanOrEqual(160);
      expect(metadata.description).toContain('Global');
      expect(metadata.title.startsWith(hi3WeaponMetadata(locale).title)).toBe(true);
      expect(hi3WeaponScope[locale]).toContain('Global');
      expect(hi3WeaponSearchScope[locale]).not.toBe('');
    });
  }
  it('retains effect and localization caveats inside short metadata', () => {
    expect(hi3WeaponMetadata('en').description).toContain('effects, availability and localized names are unverified');
    expect(hi3WeaponMetadata('zh').description).toContain('当前客户端效果与可用状态未核验');
    expect(hi3WeaponMetadata('ja').description).toContain('現在の効果・入手可否');
    expect(hi3WeaponMetadata('en').title).not.toMatch(/Stats|Builds|Best Characters/);
  });
  it('guards only HI3 pages and weapon search entries, qualifying structured description too', async () => {
    const detail = await readFile(join(process.cwd(), 'app/[lang]/[game]/weapons/[id]/page.tsx'), 'utf8');
    const directory = await readFile(join(process.cwd(), 'app/[lang]/[game]/weapons/page.tsx'), 'utf8');
    const search = await readFile(join(process.cwd(), 'components/search/search-dialog.tsx'), 'utf8');
    expect(detail).toContain("if (gameId === 'hi3') {");
    expect(detail).toContain('`${hi3WeaponScope[locale]} ${bodyDescription}`');
    expect(detail).toContain('data-hi3-weapon-scope');
    expect(directory).toContain("gameId === 'hi3' ? hi3WeaponMetadata(locale).description");
    expect(search).toContain("r.gameId === 'hi3' && r.type === 'weapon'");
    expect(search).toContain('data-hi3-weapon-search-scope');
  });
});

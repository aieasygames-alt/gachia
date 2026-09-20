import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const weaponPagePath = join(process.cwd(), 'app/[lang]/[game]/weapons/[id]/page.tsx');

describe('weapon search intent', () => {
  it('keeps dedicated metadata for high-impression Genshin weapon queries', async () => {
    const source = await readFile(weaponPagePath, 'utf8');

    expect(source).toContain("'genshin/wolf-fang'");
    expect(source).toContain('Wolf-Fang Genshin: Stats, Passive, Battle Pass & Best Users');
    expect(source).toContain("'genshin/lost-prayer-to-the-sacred-winds'");
    expect(source).toContain('Lost Prayer Genshin: Stats, Passive & Best Catalyst Users');
    expect(source).toContain("'genshin/key-of-khaj-nisut'");
    expect(source).toContain('Key of Khaj-Nisut Genshin: HP Sword Stats, Passive & Users');
  });
});

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HI3_GUIDE_NEXT_STEPS, HI3_GUIDE_SCOPE } from '@/lib/hi3-guide-navigation';

describe('HI3 guide reading paths', () => {
  it('covers every published guide without self-links or unavailable tools', async () => {
    const guides = JSON.parse(await readFile(join(process.cwd(), 'public/data/hi3/raw-guides.json'), 'utf8')) as { id: string }[];
    expect(Object.keys(HI3_GUIDE_NEXT_STEPS).sort()).toEqual(guides.map(({ id }) => id).sort());
    const available = new Set(['/hi3/version', '/hi3/download', '/hi3/items', '/hi3/weapons', ...guides.map(({ id }) => `/hi3/guides/${id}`)]);
    for (const guide of guides) {
      const steps = HI3_GUIDE_NEXT_STEPS[guide.id];
      if (!steps) throw new Error(`Missing reading path: ${guide.id}`);
      expect(steps).toHaveLength(3);
      expect(new Set(steps.map(({ href }) => href)).size).toBe(steps.length);
      for (const step of steps) {
        expect(available.has(step.href)).toBe(true);
        expect(step.href).not.toBe(`/hi3/guides/${guide.id}`);
        for (const locale of ['zh', 'en', 'ja'] as const) {
          expect(step.label[locale].trim().length).toBeGreaterThan(0);
          expect(step.description[locale].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('provides server-scope notices in all supported languages', () => {
    expect(HI3_GUIDE_SCOPE.zh.label).toBe('资料参考版本');
    expect(HI3_GUIDE_SCOPE.en.label).toBe('Reference version');
    for (const locale of ['zh', 'en', 'ja'] as const) {
      expect(HI3_GUIDE_SCOPE[locale].notice.length).toBeGreaterThan(40);
    }
  });

  it('keeps public JSON mirrors identical to source data and ships referenced images', async () => {
    const dataRoot = join(process.cwd(), '../../packages/data/games/hi3');
    for (const name of ['characters', 'weapons', 'materials', 'guides', 'astral-ops', 'stigma-sets']) {
      const source = await readFile(join(dataRoot, `raw-${name}.json`), 'utf8');
      const mirror = await readFile(join(process.cwd(), `public/data/hi3/raw-${name}.json`), 'utf8');
      expect(JSON.parse(mirror)).toEqual(JSON.parse(source));
    }
    const characters = JSON.parse(await readFile(join(dataRoot, 'raw-characters.json'), 'utf8')) as { id: string; typeEn: string; releaseVersion: string; descriptionEn: string }[];
    const fenghuang = characters.find(({ id }) => id === 'fenghuang-of-vicissitude');
    expect(fenghuang?.typeEn).toBe('BIO');
    expect(fenghuang?.releaseVersion).toBe('7.2');
    expect(fenghuang?.descriptionEn).toContain('equipping it activates Wheel of Destiny');
    expect(await readFile(join(process.cwd(), 'public/images/hi3/characters/official-v9-0.svg'), 'utf8')).toContain('PLACEHOLDER');
  });
});

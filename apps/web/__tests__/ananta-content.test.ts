import anantaGuides from '../public/data/ananta/raw-guides.json';
import { describe, expect, it } from 'vitest';

describe('Ananta content governance', () => {
  it('keeps the monetization guide aligned with no-gacha positioning', () => {
    const guide = anantaGuides.find((item) => item.id === 'gacha-strategy-guide');

    expect(guide).toBeDefined();
    expect(guide?.titleEn).toContain('No-Gacha');
    expect(guide?.contentEn).toContain('Do not use SSR rates');
    expect(guide?.contentEn).not.toContain('Limited Wish');
    expect(guide?.contentEn).not.toContain('90 pity');
  });
});

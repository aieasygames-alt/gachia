import { describe, expect, it } from 'vitest';
import endfieldGuides from '../public/data/endfield/raw-guides.json';
import genshinGuides from '../public/data/genshin/raw-guides.json';
import starrailGuides from '../public/data/starrail/raw-guides.json';
import zzzGuides from '../public/data/zzz/raw-guides.json';

type SearchGuide = {
  id: string;
  currentVersion?: string;
  serpTitle?: { en?: string };
  serpDescription?: { en?: string };
  quickFacts?: { en?: string[] };
};

function guideById(guides: readonly SearchGuide[], id: string) {
  const guide = guides.find((item) => item.id === id);
  expect(guide).toBeDefined();
  return guide!;
}

describe('high-impression guide freshness', () => {
  it('keeps the HSR relic guide scoped to live set checks', () => {
    const guide = guideById(starrailGuides, 'relic-guide');

    expect(guide.currentVersion).toContain('verify live sets');
    expect(guide.serpTitle?.en).toContain('HSR Relic Guide');
    expect(guide.quickFacts?.en).toContain(
      'Current set effects, drops, and character requirements must be checked in the live client.',
    );
  });

  it('keeps Endfield damage and gear guidance tied to current in-game values', () => {
    for (const id of ['damage-formula-guide', 'gear-guide']) {
      const guide = guideById(endfieldGuides, id);

      expect(guide.currentVersion).toContain('verify live');
      expect(guide.serpDescription?.en).toMatch(/verify|check/i);
      expect(guide.quickFacts?.en).toHaveLength(3);
    }
  });

  it('keeps high-impression banner pages scoped to live banner checks', () => {
    for (const [guides, game] of [
      [genshinGuides, 'Genshin'],
      [starrailGuides, 'HSR'],
      [zzzGuides, 'ZZZ'],
    ] as const) {
      const guide = guideById(guides, 'banner-schedule-guide');

      expect(guide.currentVersion).toContain('verify live');
      expect(guide.serpTitle?.en).toContain(game);
      expect(guide.serpDescription?.en).toMatch(/verify live/i);
      expect(guide.quickFacts?.en?.[0]).toMatch(/confirm the live/i);
    }
  });
});

import { describe, expect, it } from 'vitest';
import endfieldGuides from '../public/data/endfield/raw-guides.json';
import starrailGuides from '../public/data/starrail/raw-guides.json';

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
});

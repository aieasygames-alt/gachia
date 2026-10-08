import { describe, expect, it } from 'vitest';
import { ENDFIELD_EVENTS, ENDFIELD_EVENT_UPDATED_AT } from '@/lib/game-data/endfield-events';

describe('Endfield post-test event board', () => {
  it('keeps future test and release information in the official-confirmation lane', () => {
    const officialWatch = ENDFIELD_EVENTS.find((event) => event.id === 'official-watch');

    expect(ENDFIELD_EVENT_UPDATED_AT).toBe('2026-10-08');
    expect(officialWatch).toMatchObject({
      status: 'watch',
      href: '/endfield/guides/pioneer-test-post-test-route',
    });
    expect(officialWatch?.summary.en).toContain('official site, Steam, or official community notices');
  });

  it('routes actionable test and AIC work to existing, non-speculative content', () => {
    const recap = ENDFIELD_EVENTS.find((event) => event.id === 'test-recap');
    const aic = ENDFIELD_EVENTS.find((event) => event.id === 'aic-plan');

    expect(recap?.href).toBe('/endfield/guides/pioneer-test-post-test-route');
    expect(aic?.href).toBe('/endfield/guides/blueprint-aic-factory-guide');
  });
});

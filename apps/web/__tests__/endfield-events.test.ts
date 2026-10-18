import { describe, expect, it } from 'vitest';
import { ENDFIELD_EVENTS, ENDFIELD_EVENT_UPDATED_AT } from '@/lib/game-data/endfield-events';

describe('Endfield CN version and historical event board', () => {
  it('keeps historical tests separate from the current CN version', () => {
    const officialWatch = ENDFIELD_EVENTS.find((event) => event.id === 'test-recap');

    expect(ENDFIELD_EVENT_UPDATED_AT).toBe('2026-10-18');
    expect(officialWatch).toMatchObject({
      status: 'watch',
      href: '/endfield/guides/pioneer-test-post-test-route',
    });
    expect(officialWatch?.summary.en).toContain('international status needs separate verification');
  });

  it('routes actionable test and AIC work to existing, non-speculative content', () => {
    const recap = ENDFIELD_EVENTS.find((event) => event.id === 'test-recap');
    const aic = ENDFIELD_EVENTS.find((event) => event.id === 'aic-plan');

    expect(recap?.href).toBe('/endfield/guides/pioneer-test-post-test-route');
    expect(aic?.href).toBe('/endfield/guides/danqingdu-cn-update-guide');
    expect(ENDFIELD_EVENTS.find((event) => event.id === 'cn-search-phases')?.summary.zh).toContain('服务器时间');
    expect(ENDFIELD_EVENTS.find((event) => event.id === 'cn-compensation')?.summary.zh).toContain('更新前创建角色');
  });
});

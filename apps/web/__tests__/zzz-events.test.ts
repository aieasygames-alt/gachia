import { describe, expect, it } from 'vitest';
import { ZZZ_EVENTS, ZZZ_EVENT_UPDATED_AT } from '@/lib/game-data/zzz-events';

describe('ZZZ event board', () => {
  it('routes the v3.3 watch item to the official-program checklist', () => {
    const programWatch = ZZZ_EVENTS.find((event) => event.id === 'version-watch');

    expect(ZZZ_EVENT_UPDATED_AT).toBe('2026-10-18');
    expect(programWatch).toMatchObject({
      status: 'watch',
      href: '/zzz/guides/v3-3-special-program-prep-guide',
    });
    expect(programWatch?.title.zh).toContain('菲欧妮机制公开');
    expect(programWatch?.summary.en).toContain('does not establish launch');
  });

  it('does not present unverified v3.3 livestream codes as claimable', () => {
    const codeCheck = ZZZ_EVENTS.find((event) => event.id === 'code-check');

    expect(codeCheck?.summary.zh).toContain('不输入未核验字符串');
    expect(codeCheck?.summary.zh).toContain('10月11日23:59:59');
    expect(codeCheck?.summary.en).toContain('expired');
    expect(codeCheck?.summary.en).toContain('do not enter unverified strings');
  });
});

import { describe, expect, it } from 'vitest';
import { BANNER_INTENT_PANELS } from '@/lib/banner-intent';

const locales = ['zh', 'en', 'ja'] as const;
const targetGames = ['genshin', 'starrail', 'wuwa', 'zzz'] as const;

describe('banner intent panels', () => {
  it('covers the priority banner schedule games', () => {
    for (const gameId of targetGames) {
      expect(BANNER_INTENT_PANELS[gameId]).toBeDefined();
    }
  });

  it('has complete localized copy and internal links', () => {
    for (const gameId of targetGames) {
      const panel = BANNER_INTENT_PANELS[gameId];
      expect(panel).toBeDefined();
      if (!panel) continue;

      expect(panel.links.length).toBeGreaterThanOrEqual(3);

      for (const locale of locales) {
        expect(panel.title[locale].trim()).not.toBe('');
        expect(panel.summary[locale].trim()).not.toBe('');
        expect(panel.checks[locale].length).toBeGreaterThanOrEqual(4);

        for (const check of panel.checks[locale]) {
          expect(check.trim()).not.toBe('');
        }

        for (const link of panel.links) {
          expect(link.href).toMatch(new RegExp(`^/${gameId}/`));
          expect(link.label[locale].trim()).not.toBe('');
          expect(link.description[locale].trim()).not.toBe('');
        }
      }
    }
  });

  it('keeps Star Rail banner intent aligned to the 4.6 watch window', () => {
    const starrail = BANNER_INTENT_PANELS.starrail;

    expect(starrail?.links[0]?.label.zh).toContain('4.6');
    expect(starrail?.links[0]?.description.en).toContain('v4.6');
    expect(starrail?.links[0]?.description.zh).not.toContain('4.4');
  });

  it('keeps ZZZ banner intent aligned to the official v3.3 program window', () => {
    const zzz = BANNER_INTENT_PANELS.zzz;

    expect(zzz?.summary.zh).toContain('10 月 9 日 19:30');
    expect(zzz?.summary.en).toContain('October 9 at 19:30');
    expect(zzz?.checks.zh[1]).toContain('官方公布');
    expect(zzz?.checks.en[2]).toContain('official post-program agent');
  });
});

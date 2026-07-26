import { describe, expect, it } from 'vitest';
import { BANNER_INTENT_PANELS } from '@/lib/banner-intent';

const locales = ['zh', 'en', 'ja'] as const;
const targetGames = ['genshin', 'starrail', 'wuwa'] as const;

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
});

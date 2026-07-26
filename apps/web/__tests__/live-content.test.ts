import { describe, expect, it } from 'vitest';
import {
  HOMEPAGE_PRIORITY_GAMES,
  LIVE_BANNERS,
  LIVE_CODE_SUMMARIES,
  LIVE_GUIDES,
  LIVE_VERSION_UPDATES,
  localizeText,
  sortByPriority,
} from '@/lib/live-content';

const locales = ['zh', 'en', 'ja'] as const;
const allLiveItems = [
  ...LIVE_BANNERS,
  ...LIVE_CODE_SUMMARIES,
  ...LIVE_GUIDES,
  ...LIVE_VERSION_UPDATES,
];

describe('homepage live content', () => {
  it('has complete localized text and valid dates', () => {
    for (const item of allLiveItems) {
      expect(item.href).toMatch(/^\//);
      expect(Date.parse(`${item.updatedAt}T00:00:00Z`)).not.toBeNaN();

      for (const locale of locales) {
        expect(localizeText(item.title, locale).trim()).not.toBe('');
        expect(localizeText(item.summary, locale).trim()).not.toBe('');
      }
    }
  });

  it('keeps homepage priority games unique', () => {
    expect(new Set(HOMEPAGE_PRIORITY_GAMES).size).toBe(HOMEPAGE_PRIORITY_GAMES.length);
  });

  it('sorts live modules by priority', () => {
    expect(sortByPriority([{ priority: 3 }, { priority: 1 }, { priority: 2 }]))
      .toEqual([{ priority: 1 }, { priority: 2 }, { priority: 3 }]);
  });
});

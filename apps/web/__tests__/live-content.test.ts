import { describe, expect, it } from 'vitest';
import {
  HOMEPAGE_PRIORITY_GAMES,
  LIVE_BANNERS,
  LIVE_CALENDAR_EVENTS,
  LIVE_CODE_SUMMARIES,
  LIVE_GUIDES,
  LIVE_VERSION_UPDATES,
  LIVE_UPDATED_AT,
  localizeText,
  sortCalendarEvents,
  sortByPriority,
} from '@/lib/live-content';

const locales = ['zh', 'en', 'ja'] as const;
const allLiveItems = [
  ...LIVE_BANNERS,
  ...LIVE_CALENDAR_EVENTS,
  ...LIVE_CODE_SUMMARIES,
  ...LIVE_GUIDES,
  ...LIVE_VERSION_UPDATES,
];

describe('homepage live content', () => {
  it('uses the 2026-10-08 intelligence batch for live modules', () => {
    expect(LIVE_UPDATED_AT).toBe('2026-10-08');

    expect(LIVE_BANNERS.map((item) => item.gameId)).toEqual(['aniimo', 'genshin', 'roco']);
    expect(LIVE_VERSION_UPDATES.map((item) => item.gameId)).toEqual([
      'aniimo',
      'starrail',
      'zzz',
      'wuwa',
      'roco',
      'skjh',
      'endfield',
      'sea',
      'nte',
      'ananta',
    ]);
    expect(LIVE_CODE_SUMMARIES.map((item) => item.gameId)).toEqual([
      'genshin',
      'starrail',
      'aniimo',
      'nte',
      'zzz',
    ]);
  });

  it('has complete localized text and valid dates', () => {
    for (const item of allLiveItems) {
      expect(item.href).toMatch(/^\//);
      expect(item.href).toMatch(new RegExp(`^/${item.gameId}(/|$)`));
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

  it('does not replace the Aniimo code-status entry with weekly compensation', () => {
    const entry = LIVE_CODE_SUMMARIES.find((item) => item.gameId === 'aniimo');
    expect(entry?.title.en).toContain('Code Status');
    expect(entry?.summary.en).toContain('unconfirmed public codes');
    expect(entry?.summary.zh).not.toContain('100辉石');
  });

  it('marks the ZZZ module as a v3.3 watch route', () => {
    const zzzVersion = LIVE_VERSION_UPDATES.find((item) => item.gameId === 'zzz');

    expect(zzzVersion).toMatchObject({
      status: 'watch',
      updatedAt: '2026-10-15',
    });
    expect(zzzVersion?.title.en).toContain('v3.3');
  });

  it('sorts live modules by priority', () => {
    expect(sortByPriority([{ priority: 3 }, { priority: 1 }, { priority: 2 }]))
      .toEqual([{ priority: 1 }, { priority: 2 }, { priority: 3 }]);
  });

  it('has complete calendar events that sort by date', () => {
    expect(LIVE_CALENDAR_EVENTS.length).toBeGreaterThan(0);

    for (const event of LIVE_CALENDAR_EVENTS) {
      expect(event.id.trim()).not.toBe('');
      expect(event.href).toMatch(/^\//);
      expect(event.timezone.trim()).not.toBe('');
      expect(Date.parse(`${event.startsAt}T00:00:00Z`)).not.toBeNaN();
      if (event.endsAt) {
        expect(Date.parse(`${event.endsAt}T00:00:00Z`)).not.toBeNaN();
      }
    }

    const sorted = sortCalendarEvents([
      { ...LIVE_CALENDAR_EVENTS[0]!, startsAt: '2026-08-01', priority: 2 },
      { ...LIVE_CALENDAR_EVENTS[1]!, startsAt: '2026-07-01', priority: 1 },
    ]);
    expect(sorted.map((event) => event.startsAt)).toEqual(['2026-07-01', '2026-08-01']);
  });
});

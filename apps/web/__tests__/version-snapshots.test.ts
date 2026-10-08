import { describe, expect, it } from 'vitest';
import {
  VERSION_SNAPSHOTS,
  VERSION_SNAPSHOT_UPDATED_AT,
  getVersionSnapshot,
  localizeVersionText,
} from '@/lib/version-snapshots';
import { getZzzGuideById } from '@gachia/data/games/zzz/guides';
import { getEndfieldGuideById, getEndfieldGuideContent } from '@gachia/data/games/endfield/guides';

const locales = ['zh', 'en', 'ja'] as const;
const priorityGames = ['zzz', 'wuwa', 'starrail', 'genshin', 'endfield', 'aniimo', 'sea', 'roco', 'roco-cn', 'ananta', 'skjh'] as const;

describe('version snapshots', () => {
  it('covers priority version hubs', () => {
    for (const gameId of priorityGames) {
      expect(getVersionSnapshot(gameId)).toBeDefined();
    }
  });

  it('marks the current ZZZ snapshot as the v3.3 special-program window with a v3.2 recap', () => {
    expect(getVersionSnapshot('zzz')).toMatchObject({
      currentVersion: '3.3 special program / 3.2 recap',
      status: 'watch',
      lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    });
  });

  it('uses the 2026-10-08 snapshot batch', () => {
    expect(VERSION_SNAPSHOT_UPDATED_AT).toBe('2026-10-08');
    expect(getVersionSnapshot('genshin')?.currentVersion).toBe('7.1 livestream / Luna II watch');
    expect(getVersionSnapshot('starrail')?.currentVersion).toBe('4.6 special program watch');
    expect(getVersionSnapshot('endfield')?.currentVersion).toBe('Pioneer Test recap / AIC blueprint');
    expect(getVersionSnapshot('aniimo')?.currentVersion).toBe('S1 逐风启程');
    expect(getVersionSnapshot('roco')?.currentVersion).toBe('Quack Quack Test official watch');
    expect(getVersionSnapshot('roco')?.sourceTier).toBe('official');
    expect(getVersionSnapshot('roco-cn')?.currentVersion).toBe('post-launch codes / encyclopedia');
    expect(getVersionSnapshot('sea')?.currentVersion).toBe('early 2027 / December beta watch');
  });

  it('keeps the ZZZ preview route aligned across the version hub and high-intent guides', () => {
    const previewGuide = getZzzGuideById('v3-3-special-program-prep-guide');
    const bannerGuide = getZzzGuideById('banner-schedule-guide');
    const steamGuide = getZzzGuideById('steam-3-0-start-guide');

    expect(previewGuide?.currentVersion).toContain('2026-10-09');
    expect(bannerGuide?.updatedAt).toBe('2026-10-08');
    expect(steamGuide?.updatedAt).toBe('2026-10-08');
  });

  it('keeps the Endfield post-test route official-only for future access', () => {
    const postTestGuide = getEndfieldGuideById('pioneer-test-post-test-route');

    expect(postTestGuide?.updatedAt).toBe('2026-10-08');
    expect(postTestGuide?.currentVersion).toContain('official confirmation');
    expect(postTestGuide?.summary).toContain('Pioneer Test 招募结束后');
  });

  it('marks legacy Endfield combat, base, gacha, tier, and event guides as Pioneer Test archives', () => {
    for (const id of ['combat-system-guide', 'base-building-guide', 'gacha-headhunting-guide', 'best-operators-tier-list', 'crisis-contract-guide']) {
      const guide = getEndfieldGuideById(id);

      expect(guide?.updatedAt).toBe('2026-10-08');
      expect(guide?.currentVersion).toContain('Pioneer Test archive');
      expect(getEndfieldGuideContent(guide!, 'zh')).toContain('Pioneer Test 历史资料提示');
      expect(getEndfieldGuideContent(guide!, 'en')).toContain('Pioneer Test archive notice');
    }
  });

  it('keeps the highest-priority launch times explicit', () => {
    expect(getVersionSnapshot('aniimo')?.summary.zh).toContain('S1');
    expect(getVersionSnapshot('aniimo')?.summary.zh).toContain('全平台上线');
    expect(getVersionSnapshot('aniimo')?.platformReleaseDates).toEqual([
      { platform: 'PC / console / cloud', date: '2026-09-16' },
      { platform: 'iOS / Android', date: '2026-09-23' },
    ]);
  });

  it('has localized copy, dates, and actionable links', () => {
    for (const snapshot of Object.values(VERSION_SNAPSHOTS)) {
      expect(snapshot).toBeDefined();
      if (!snapshot) continue;

      expect(Date.parse(`${snapshot.releaseDate}T00:00:00Z`)).not.toBeNaN();
      expect(Date.parse(`${snapshot.lastUpdatedAt}T00:00:00Z`)).not.toBeNaN();
      expect(['official', 'mixed', 'third_party_watch']).toContain(snapshot.sourceTier);
      expect(snapshot.whatChanged.length).toBeGreaterThan(0);
      expect(snapshot.firstSteps.length).toBeGreaterThan(0);
      expect(snapshot.links.length).toBeGreaterThanOrEqual(3);

      if (snapshot.platformReleaseDates) {
        const platforms = new Set<string>();
        let previousDate = '';

        for (const platformRelease of snapshot.platformReleaseDates) {
          expect(platformRelease.platform.trim()).not.toBe('');
          expect(platforms.has(platformRelease.platform)).toBe(false);
          platforms.add(platformRelease.platform);
          expect(Date.parse(`${platformRelease.date}T00:00:00Z`)).not.toBeNaN();
          expect(platformRelease.time ?? '').not.toMatch(/[未待]/);
          expect(platformRelease.date >= previousDate).toBe(true);
          previousDate = platformRelease.date;
        }
      }

      const linkTypes = new Set(snapshot.links.map((link) => link.type));
      expect(linkTypes.has('codes')).toBe(true);
      expect(linkTypes.has('characters')).toBe(true);

      for (const locale of locales) {
        expect(localizeVersionText(snapshot.summary, locale).trim()).not.toBe('');
        for (const text of [...snapshot.whatChanged, ...snapshot.firstSteps]) {
          expect(localizeVersionText(text, locale).trim()).not.toBe('');
        }
        for (const link of snapshot.links) {
          expect(link.href).toMatch(/^\//);
          expect(localizeVersionText(link.label, locale).trim()).not.toBe('');
        }
      }
    }
  });
});

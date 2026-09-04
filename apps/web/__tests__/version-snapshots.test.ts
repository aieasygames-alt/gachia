import { describe, expect, it } from 'vitest';
import {
  VERSION_SNAPSHOTS,
  VERSION_SNAPSHOT_UPDATED_AT,
  getVersionSnapshot,
  localizeVersionText,
} from '@/lib/version-snapshots';

const locales = ['zh', 'en', 'ja'] as const;
const priorityGames = ['zzz', 'wuwa', 'starrail', 'genshin', 'endfield', 'sea', 'ananta', 'skjh'] as const;

describe('version snapshots', () => {
  it('covers priority version hubs', () => {
    for (const gameId of priorityGames) {
      expect(getVersionSnapshot(gameId)).toBeDefined();
    }
  });

  it('marks the current ZZZ snapshot as a v3.2 release hub watch', () => {
    expect(getVersionSnapshot('zzz')).toMatchObject({
      currentVersion: '3.2 release hub',
      status: 'watch',
      lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    });
  });

  it('uses the 2026-09-03 snapshot batch', () => {
    expect(VERSION_SNAPSHOT_UPDATED_AT).toBe('2026-09-03');
    expect(getVersionSnapshot('genshin')?.currentVersion).toBe('Luna I pre-launch');
    expect(getVersionSnapshot('endfield')?.currentVersion).toBe('Steam Pioneer Test last call');
    expect(getVersionSnapshot('sea')?.currentVersion).toBe('early 2027 / December beta watch');
  });

  it('has localized copy, dates, and actionable links', () => {
    for (const snapshot of Object.values(VERSION_SNAPSHOTS)) {
      expect(snapshot).toBeDefined();
      if (!snapshot) continue;

      expect(Date.parse(`${snapshot.releaseDate}T00:00:00Z`)).not.toBeNaN();
      expect(Date.parse(`${snapshot.lastUpdatedAt}T00:00:00Z`)).not.toBeNaN();
      expect(snapshot.whatChanged.length).toBeGreaterThan(0);
      expect(snapshot.firstSteps.length).toBeGreaterThan(0);
      expect(snapshot.links.length).toBeGreaterThanOrEqual(3);

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

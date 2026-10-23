import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { LIVE_BANNERS, LIVE_CALENDAR_EVENTS, LIVE_GUIDES, LIVE_VERSION_UPDATES } from '@/lib/live-content';
import { getVersionSnapshot } from '@/lib/version-snapshots';
import { ROCO_EVENTS } from '@/lib/game-data/roco-events';

it('does not infer confirmed schedules from the wrong game source or date-dependent status', () => {
  expect(LIVE_CALENDAR_EVENTS.filter(row => row.gameId === 'roco')).toEqual([]);
  expect(ROCO_EVENTS.roco).toEqual([]);
  expect(ROCO_EVENTS['roco-cn']).toHaveLength(3);
  for (const entry of [...LIVE_BANNERS, ...LIVE_VERSION_UPDATES].filter(row => row.gameId === 'roco')) {
    expect(entry.status).toBe('watch');
    expect(entry.updatedAt).toBe('2026-10-24');
  }
  const live = [...LIVE_BANNERS, ...LIVE_VERSION_UPDATES, ...LIVE_GUIDES].filter(row => row.gameId === 'roco');
  expect(live).toHaveLength(3);
  for (const entry of live) {
    expect(entry.href).toBe('/roco/version');
    expect(JSON.stringify(entry)).not.toMatch(/10\/27|Oct(ober)? 27|10月27|2026-10-27|10\/20/);
  }
  const snapshot = getVersionSnapshot('roco')!;
  expect(snapshot.releaseDate).toBeUndefined();
  expect(snapshot.platformReleaseDates).toBeUndefined();
  expect(snapshot.sourceTier).toBe('needs_verification');
  expect(snapshot.summary.en).toContain('does not mean the test was cancelled');
  expect(snapshot.links.some(row => row.href.includes('cbt-registration-guide'))).toBe(false);
});

it('retains withdrawn schedule blocks for review instead of erasing history', () => {
  const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-6-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
  expect(proof.rocoWithdrawals).toHaveLength(4);
  for (const entry of proof.rocoWithdrawals) {
    expect(entry.originalBlocks.length).toBeGreaterThan(0);
    expect(JSON.stringify(entry.originalBlocks)).toContain('2026-10-27');
  }
});

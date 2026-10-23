import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { regions, getRegionById, getRegionDescription, getRegionList, getRegionName } from '../games/wuwa/regions';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-6-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const reviewed = getRegionById('simulacrum-nexus')!;

it.each(['zh', 'en', 'ja'] as const)('uses the reviewed official %s region, scene names and scoped UI claims', locale => {
  const notice = proof.notices.find((row: { language: string }) => row.language === locale);
  expect(getRegionName(reviewed, locale)).toBe(notice.regionExcerpt[0].replace(/[「」]/g, ''));
  expect(getRegionDescription(reviewed, locale)).toBe(notice.regionExcerpt[2]);
  const scenes = getRegionList(reviewed, 'subRegions', locale);
  expect(scenes).toHaveLength(7);
  for (const scene of scenes) expect(notice.regionExcerpt[1]).toContain(scene);
  expect(getRegionList(reviewed, 'highlights', locale)).toEqual(notice.uiProgressExcerpts.map((line: string) => line.replace(/^- /, '')));
  expect(getRegionList(reviewed, 'tips', locale)).toHaveLength(1);
  expect(reviewed.sourceReview?.sources).toContainEqual({ language: locale, url: notice.url });
});

it('withdraws unsupported regional assignments without losing the original claims or anchor', () => {
  for (const field of ['bosses', 'domains', 'specialties'] as const) expect(reviewed[field]).toEqual([]);
  expect(proof.originalRegionRecord.bosses).not.toEqual([]);
  expect(proof.originalPendingSnapshot.path).toBe('wuwa/raw-regions.json');
  expect(regions.map(row => row.id)).toEqual(['simulacrum-nexus', ...proof.legacyRegions.ids]);
  expect(createHash('sha256').update(JSON.stringify(regions.slice(1))).digest('hex')).toBe(proof.legacyRegions.recordSerializationSha256);
  const mirror = JSON.parse(readFileSync(new URL('../../../apps/web/public/data/wuwa/raw-regions.json', import.meta.url), 'utf8'));
  expect(mirror).toEqual(regions);
});

it('preserves legacy list fallbacks without declaring them reviewed', () => {
  for (const region of regions.slice(1)) {
    expect(region.sourceReview).toBeUndefined();
    expect(getRegionList(region, 'highlights', 'en')).toEqual(region.highlights);
    expect(getRegionList(region, 'tips', 'ja')).toEqual(region.tips);
  }
});

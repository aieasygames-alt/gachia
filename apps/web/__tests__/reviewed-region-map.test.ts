import { expect, it } from 'vitest';
import { getMapPageData } from '@/lib/game-data/maps';
import { getRegionById, getRegionList } from '@gachia/data/games/wuwa/regions';

it.each(['zh', 'en', 'ja'] as const)('connects the reviewed %s scenes and evidence to the map adapter', async locale => {
  const data = await getMapPageData('wuwa', locale);
  const source = getRegionById('simulacrum-nexus')!;
  const region = data!.regions.find(row => row.id === source.id)!;
  expect(region.subRegions).toEqual(getRegionList(source, 'subRegions', locale));
  expect(region.subRegions).toHaveLength(7);
  expect(region.highlights).toEqual(getRegionList(source, 'highlights', locale));
  expect(region.tips).toEqual(getRegionList(source, 'tips', locale));
  expect(region.sourceReview).toEqual(source.sourceReview);
  expect(region.bosses).toEqual([]);
  expect(region.domains).toEqual([]);
  for (const older of data!.regions.filter(row => row.id !== source.id)) {
    expect(older.subRegions).toEqual([]);
    expect(older.sourceReview).toBeUndefined();
  }
});

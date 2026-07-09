import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import type { StarRailRegion } from './types';
const rawRegions = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/starrail/raw-regions.json'), '/data/starrail/raw-regions.json');

export const regions: StarRailRegion[] = rawRegions as unknown as StarRailRegion[];

export function getRegionName(region: StarRailRegion, locale: SupportedLocale): string {
  if (locale === 'en') return region.nameEn;
  return region.name;
}

export function getRegionDescription(region: StarRailRegion, locale: SupportedLocale): string {
  if (locale === 'en') return region.descriptionEn;
  return region.description;
}

export function getRegionById(id: string): StarRailRegion | undefined {
  return regions.find((r) => r.id === id);
}

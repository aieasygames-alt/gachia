import type { SupportedLocale } from '@gachia/core';
import type { AniimoRegion } from './types';
import rawRegions from './raw-regions.json';

export const aniimoRegions: AniimoRegion[] = rawRegions as AniimoRegion[];

export function getAniimoRegionById(id: string): AniimoRegion | undefined {
  return aniimoRegions.find((region) => region.id === id);
}

export function getAniimoRegionName(region: AniimoRegion, _locale: SupportedLocale): string {
  return region.name;
}

export function getAniimoRegionDescription(region: AniimoRegion, _locale: SupportedLocale): string {
  return region.theme;
}

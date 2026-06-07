import type { SupportedLocale } from '@gachia/core';
import type { EndfieldRegion } from './types';
import rawRegions from './raw-regions.json';

export const regions: EndfieldRegion[] = rawRegions as unknown as EndfieldRegion[];

export function getRegionName(region: EndfieldRegion, locale: SupportedLocale): string {
  if (locale === 'en') return region.nameEn;
  return region.name;
}

export function getRegionDescription(region: EndfieldRegion, locale: SupportedLocale): string {
  if (locale === 'en') return region.descriptionEn;
  return region.description;
}

export function getRegionById(id: string): EndfieldRegion | undefined {
  return regions.find((r) => r.id === id);
}

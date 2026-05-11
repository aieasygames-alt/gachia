import type { SupportedLocale } from '@gachia/core';
import type { NteRegion } from './types';
import rawRegions from './raw-regions.json';

export const regions: NteRegion[] = rawRegions as unknown as NteRegion[];

export function getRegionName(region: NteRegion, locale: SupportedLocale): string {
  if (locale === 'en') return region.nameEn;
  return region.name;
}

export function getRegionDescription(region: NteRegion, locale: SupportedLocale): string {
  if (locale === 'en') return region.descriptionEn;
  return region.description;
}

export function getRegionById(id: string): NteRegion | undefined {
  return regions.find((r) => r.id === id);
}

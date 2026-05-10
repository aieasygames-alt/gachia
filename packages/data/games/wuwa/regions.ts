import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawRegions from './raw-regions.json';

export interface WuWaRegion {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  highlights: string[];
  specialties: string[];
  bosses: string[];
  domains: string[];
  tips: string[];
  subRegions: string[];
}

export const regions: WuWaRegion[] = rawRegions as unknown as WuWaRegion[];

export function getRegionName(region: WuWaRegion, locale: SupportedLocale): string {
  if (locale === 'ja') return region.nameJa || region.nameEn;
  return localeStr(region.name, region.nameEn, locale);
}

export function getRegionDescription(region: WuWaRegion, locale: SupportedLocale): string {
  if (locale === 'ja') return region.descriptionJa || region.descriptionEn;
  return localeStr(region.description, region.descriptionEn, locale);
}

export function getRegionById(id: string): WuWaRegion | undefined {
  return regions.find((r) => r.id === id);
}

import type { SupportedLocale } from '@gachia/core';
import rawRegions from './raw-regions.json';
import { localeStr } from './types';

export interface GenshinRegion {
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
  teleporters: number;
  statues: number;
  oculi: number;
}

export const regions: GenshinRegion[] = rawRegions as unknown as GenshinRegion[];

export function getRegionName(region: GenshinRegion, locale: SupportedLocale): string {
  if (locale === 'ja') return region.nameJa || region.nameEn;
  return localeStr(region.name, region.nameEn, locale);
}

export function getRegionDescription(region: GenshinRegion, locale: SupportedLocale): string {
  if (locale === 'ja') return region.descriptionJa || region.descriptionEn;
  return localeStr(region.description, region.descriptionEn, locale);
}

export function getRegionById(id: string): GenshinRegion | undefined {
  return regions.find((r) => r.id === id);
}

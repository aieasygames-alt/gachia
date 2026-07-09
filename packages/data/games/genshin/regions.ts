import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawRegions = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/genshin/raw-regions.json'), '/data/genshin/raw-regions.json');

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

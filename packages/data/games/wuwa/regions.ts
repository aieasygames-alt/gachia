import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr, type WuWaSourceReview } from './types';
const rawRegions = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/wuwa/raw-regions.json'), '/data/wuwa/raw-regions.json');

export interface WuWaRegion {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  highlights: string[];
  highlightsEn?: string[];
  highlightsJa?: string[];
  specialties: string[];
  bosses: string[];
  domains: string[];
  tips: string[];
  tipsEn?: string[];
  tipsJa?: string[];
  subRegions: string[];
  subRegionsEn?: string[];
  subRegionsJa?: string[];
  sourceReview?: WuWaSourceReview;
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

export function getRegionList(region: WuWaRegion, field: 'highlights' | 'tips' | 'subRegions', locale: SupportedLocale): string[] {
  if (locale === 'ja') return region[`${field}Ja`] ?? region[`${field}En`] ?? region[field];
  return locale === 'en' ? (region[`${field}En`] ?? region[field]) : region[field];
}

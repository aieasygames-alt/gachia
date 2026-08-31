import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import type { NteRegion } from './types';
import { localeStr } from './types';
const rawRegions = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/nte/raw-regions.json'), '/data/nte/raw-regions.json');

export const regions: NteRegion[] = rawRegions as unknown as NteRegion[];

export function getRegionName(region: NteRegion, locale: SupportedLocale): string {
  return localeStr(region.name, region.nameEn, locale, region.nameJa);
}

export function getRegionDescription(region: NteRegion, locale: SupportedLocale): string {
  return localeStr(region.description, region.descriptionEn, locale, region.descriptionJa);
}

export function getRegionById(id: string): NteRegion | undefined {
  return regions.find((r) => r.id === id);
}

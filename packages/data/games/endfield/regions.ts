import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import type { EndfieldRegion } from './types';
import { localeStr } from './types';
const rawRegions = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/endfield/raw-regions.json'), '/data/endfield/raw-regions.json');

export const regions: EndfieldRegion[] = rawRegions as unknown as EndfieldRegion[];

export function getRegionName(region: EndfieldRegion, locale: SupportedLocale): string {
  return localeStr(region.name, region.nameEn, locale, region.nameJa);
}

export function getRegionDescription(region: EndfieldRegion, locale: SupportedLocale): string {
  return localeStr(region.description, region.descriptionEn, locale, region.descriptionJa);
}

export function getRegionById(id: string): EndfieldRegion | undefined {
  return regions.find((r) => r.id === id);
}

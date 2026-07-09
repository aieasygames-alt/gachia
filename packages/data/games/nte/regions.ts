import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import type { NteRegion } from './types';
const rawRegions = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/nte/raw-regions.json'), '/data/nte/raw-regions.json');

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

import type { SupportedLocale } from '@gachia/core';
import type { AniimoRegion } from './types';
import { localeStr } from './types';
import rawRegions from './raw-regions.json';

export const aniimoRegions: AniimoRegion[] = rawRegions as AniimoRegion[];

export function getAniimoRegionById(id: string): AniimoRegion | undefined {
  return aniimoRegions.find((region) => region.id === id);
}

export function getAniimoRegionName(region: AniimoRegion, locale: SupportedLocale): string {
  return localeStr(region.nameZh ?? region.name, region.name, locale, region.nameJa);
}

export function getAniimoRegionDescription(region: AniimoRegion, locale: SupportedLocale): string {
  return localeStr(region.themeZh ?? region.theme, region.theme, locale, region.themeJa);
}

export function getAniimoRegionMechanics(region: AniimoRegion, locale: SupportedLocale): string[] {
  if (locale === 'zh') return region.mechanicsZh ?? region.mechanics;
  if (locale === 'ja') return region.mechanicsJa ?? region.mechanics;
  return region.mechanics;
}

export function getAniimoRegionTips(region: AniimoRegion, locale: SupportedLocale): string[] {
  const checklist = locale === 'zh' ? region.checklistZh : locale === 'ja' ? region.checklistJa : region.checklist;
  const guideNote = localeStr(region.guideNoteZh ?? region.guideNote, region.guideNote, locale, region.guideNoteJa);
  return [...(checklist ?? region.checklist), guideNote];
}

import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale } from '@gachia/core';
import rawCharacterSummaries from './raw-character-summaries.json';
import { localeStr } from './types';

export interface GenshinCharacterSummaryData {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  weaponType: string;
  rarity: number;
  status?: string;
}

const allCharacterSummaries = rawCharacterSummaries as unknown as GenshinCharacterSummaryData[];

export const genshinCharacterSummaries: GenshinCharacterSummaryData[] = allCharacterSummaries.filter(
  (character) => character.status !== 'upcoming'
);

export function getGenshinCharacterSummaryName(character: GenshinCharacterSummaryData, locale: SupportedLocale): string {
  if (locale === 'ja' && character.nameJa) return character.nameJa;
  return localeStr(character.name, character.nameEn, locale);
}

export function getGenshinCharacterSummaryImage(character: GenshinCharacterSummaryData): string {
  return `${IMAGE_BASE}/images/genshin/characters/${character.id}.webp`;
}

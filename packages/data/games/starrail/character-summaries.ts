import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale } from '@gachia/core';
import rawCharacterSummaries from './raw-character-summaries.json';
import { localeStr } from './types';

export interface StarRailCharacterSummaryData {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  path: string;
  rarity: number;
  status?: string;
}

const allCharacterSummaries = rawCharacterSummaries as unknown as StarRailCharacterSummaryData[];

export const starrailCharacterSummaries: StarRailCharacterSummaryData[] = allCharacterSummaries.filter(
  (character) => character.status !== 'upcoming'
);

export function getStarRailCharacterSummaryName(character: StarRailCharacterSummaryData, locale: SupportedLocale): string {
  if (locale === 'ja' && character.nameJa) return character.nameJa;
  return localeStr(character.name, character.nameEn, locale);
}

export function getStarRailCharacterSummaryImage(character: StarRailCharacterSummaryData): string {
  return `${IMAGE_BASE}/images/starrail/characters/${character.id}.webp`;
}

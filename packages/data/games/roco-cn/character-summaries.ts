import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale } from '@gachia/core';
import rawCharacterSummaries from './raw-character-summaries.json';
import { localeStr } from './types';

export interface RocoCnCharacterSummaryData {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  attribute: string;
  attributeEn: string;
  rarity: number;
  status?: string;
}

const allCharacterSummaries = rawCharacterSummaries as unknown as RocoCnCharacterSummaryData[];

export const rocoCnCharacterSummaries: RocoCnCharacterSummaryData[] = allCharacterSummaries.filter(
  (character) => character.status !== 'upcoming'
);

export function getRocoCnCharacterSummaryName(character: RocoCnCharacterSummaryData, locale: SupportedLocale): string {
  return localeStr(character.name, character.nameEn, locale, character.nameJa);
}

export function getRocoCnCharacterSummaryImage(character: RocoCnCharacterSummaryData): string {
  return `${IMAGE_BASE}/images/roco-cn/characters/${character.id}.webp`;
}

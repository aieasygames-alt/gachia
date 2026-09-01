import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale } from '@gachia/core';
import rawCharacterSummaries from './raw-character-summaries.json';
import { localeStr } from './types';

export interface NteCharacterSummaryData {
  id: string;
  name: string;
  nameEn: string;
  attribute: string;
  rank: string;
  roleEn: string;
  weaponEn: string;
  tierRank?: string;
  availableAtLaunch?: boolean;
  status?: string;
}

const allCharacterSummaries = rawCharacterSummaries as unknown as NteCharacterSummaryData[];

export const nteCharacterSummaries: NteCharacterSummaryData[] = allCharacterSummaries.filter(
  (character) => character.availableAtLaunch !== false && character.status !== 'upcoming'
);

export function getNteCharacterSummaryName(character: NteCharacterSummaryData, locale: SupportedLocale): string {
  return localeStr(character.name, character.nameEn, locale);
}

export function getNteCharacterSummaryImage(character: NteCharacterSummaryData): string {
  return `${IMAGE_BASE}/images/characters/${character.id}.webp`;
}

import type { SupportedLocale, Character } from '@gachia/core';
import type { RocoJinie } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';
import { getRocoLegacyCharacterName } from './character-review';

const allCharacters: RocoJinie[] = rawCharacters as unknown as RocoJinie[];

/** Historical source access only; public consumers must use character-review. */
export const rocoCharacters: RocoJinie[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getRocoCharacterName(char: RocoJinie, locale: SupportedLocale): string {
  return getRocoLegacyCharacterName(char.id, locale);
}

export function getRocoCharacterDescription(char: RocoJinie, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale, char.descriptionJa);
}

export function getRocoCharacterImage(_char: RocoJinie): string {
  return '';
}

export function getRocoCharacterById(id: string): RocoJinie | undefined {
  return rocoCharacters.find((c) => c.id === id);
}

// No verified international roster. Legacy URLs use character-review instead.
export const characters: Character[] = [];

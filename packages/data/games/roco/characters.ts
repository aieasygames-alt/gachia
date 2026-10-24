import type { SupportedLocale, Character } from '@gachia/core';
import rawCharacters from './raw-characters.json';
import { getRocoLegacyCharacterName, ROCO_CHARACTER_IDENTITY_REVIEW } from './character-review';

export interface RocoLegacyEntry {
  id: string;
  contentReview: { status: string; reviewedAt: string };
}

// Compatibility access exposes correction records, never an asserted game roster.
export const rocoCharacters: RocoLegacyEntry[] = rawCharacters;

export function getRocoCharacterName(char: RocoLegacyEntry, locale: SupportedLocale): string {
  return getRocoLegacyCharacterName(char.id, locale);
}

export function getRocoCharacterDescription(_char: RocoLegacyEntry, locale: SupportedLocale): string {
  return ROCO_CHARACTER_IDENTITY_REVIEW[locale].description;
}

export function getRocoCharacterImage(_char: RocoLegacyEntry): string {
  return '';
}

export function getRocoCharacterById(id: string): RocoLegacyEntry | undefined {
  return rocoCharacters.find((c) => c.id === id);
}

// No verified international roster. Legacy URLs use character-review instead.
export const characters: Character[] = [];

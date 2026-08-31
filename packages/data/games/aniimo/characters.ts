import type { Character, SupportedLocale } from '@gachia/core';
import type { AniimoCharacter } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

export const aniimoCharacters: AniimoCharacter[] = rawCharacters as unknown as AniimoCharacter[];

export function getAniimoCharacterName(char: AniimoCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getAniimoCharacterDescription(char: AniimoCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getAniimoCharacterImage(char: AniimoCharacter): string {
  return char.image;
}

export function getAniimoCharacterById(id: string): AniimoCharacter | undefined {
  return aniimoCharacters.find((char) => char.id === id || char.aliases.includes(id));
}

export function getAniimoCharacterTierReason(char: AniimoCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = aniimoCharacters.map((char) => ({
  id: char.id,
  gameId: 'aniimo' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.role,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: char.image,
    card: char.image,
    gachaSplash: char.image,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: [
    {
      id: 'ability',
      name: { zh: '能力', en: 'Ability', ja: 'Ability' },
      description: { zh: char.ability, en: char.ability, ja: char.ability },
      type: 'passive',
    },
  ],
  releaseVersion: char.stage,
}));

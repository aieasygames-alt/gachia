import type { Character, SupportedLocale } from '@gachia/core';
import type { Hi3Character } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

export const hi3Characters: Hi3Character[] = rawCharacters as Hi3Character[];

export function getHi3CharacterName(character: Hi3Character, locale: SupportedLocale): string {
  return localeStr(character.name, character.nameEn, locale, character.nameJa);
}

export function getHi3CharacterDescription(character: Hi3Character, locale: SupportedLocale): string {
  return localeStr(character.description, character.descriptionEn, locale, character.descriptionJa);
}

export function getHi3CharacterImage(_character: Hi3Character): string {
  return '/images/hi3/characters/official-v9-0.svg';
}

export function getHi3CharacterById(id: string): Hi3Character | undefined {
  return hi3Characters.find((character) => character.id === id);
}

export const characters: Character[] = hi3Characters.map((character) => ({
  id: character.id,
  gameId: 'hi3',
  name: { zh: character.name, en: character.nameEn, ja: character.nameJa },
  rarity: character.rank === 'S' ? 5 : 4,
  element: character.damageType,
  weaponType: character.weaponTypeEn,
  description: { zh: character.description, en: character.descriptionEn, ja: character.descriptionJa },
  images: {
    icon: getHi3CharacterImage(character),
    card: getHi3CharacterImage(character),
    gachaSplash: getHi3CharacterImage(character),
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: character.skills.map((skill, index) => ({
    id: `official-role-${index + 1}`,
    name: { zh: skill.name, en: skill.nameEn, ja: skill.nameJa },
    description: { zh: skill.description, en: skill.descriptionEn, ja: skill.descriptionJa },
    type: 'passive' as const,
  })),
  releaseVersion: character.releaseVersion,
}));

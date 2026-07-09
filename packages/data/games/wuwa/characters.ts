import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { WuWaCharacter } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

const allCharacters: WuWaCharacter[] = rawCharacters as unknown as WuWaCharacter[];

export const wuwaCharacters: WuWaCharacter[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getWuWaCharacterName(char: WuWaCharacter, locale: SupportedLocale): string {
  if (locale === 'ja' && char.nameJa) return char.nameJa;
  return localeStr(char.name, char.nameEn, locale);
}

export function getWuWaCharacterDescription(char: WuWaCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getWuWaCharacterImage(char: WuWaCharacter): string {
  return `${IMAGE_BASE}/images/wuwa/characters/${char.id}.webp`;
}

export function getWuWaCharacterById(id: string): WuWaCharacter | undefined {
  return wuwaCharacters.find((c) => c.id === id);
}

export function getWuWaCharacterMaterials(char: WuWaCharacter) {
  return {
    ascension: char.ascensionMaterials ?? null,
    skill: char.skillMaterials ?? null,
  };
}

export const characters: Character[] = wuwaCharacters.map((char) => ({
  id: char.id,
  gameId: 'wuwa' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa || char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.weaponType,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/wuwa/characters/${char.id}.webp`,
    card: `/images/wuwa/characters/${char.id}.webp`,
    gachaSplash: `/images/wuwa/characters/${char.id}.webp`,
  },
  stats: {
    baseHp: [char.stats.hp],
    baseAtk: [char.stats.atk],
    baseDef: [char.stats.def],
  },
  materials: [],
  skills: [],
  releaseVersion: char.releaseVersion,
}));

import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { RocoJinie } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

const allCharacters: RocoJinie[] = rawCharacters as unknown as RocoJinie[];

export const rocoCharacters: RocoJinie[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getRocoCharacterName(char: RocoJinie, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getRocoCharacterDescription(char: RocoJinie, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getRocoCharacterImage(char: RocoJinie): string {
  return `${IMAGE_BASE}/images/roco/characters/${char.id}.webp`;
}

export function getRocoCharacterById(id: string): RocoJinie | undefined {
  return rocoCharacters.find((c) => c.id === id);
}

export const characters: Character[] = rocoCharacters.map((char) => ({
  id: char.id,
  gameId: 'roco' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.attribute,
  weaponType: 'jinie',
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/roco/characters/${char.id}.webp`,
    card: `/images/roco/characters/${char.id}.webp`,
    gachaSplash: `/images/roco/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: [],
  releaseVersion: '',
}));

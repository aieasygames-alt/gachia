import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { RocoCnJinie } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

const allCharacters: RocoCnJinie[] = rawCharacters as unknown as RocoCnJinie[];

export const rocoCnCharacters: RocoCnJinie[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getRocoCnCharacterName(char: RocoCnJinie, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getRocoCnCharacterDescription(char: RocoCnJinie, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getRocoCnCharacterImage(char: RocoCnJinie): string {
  return `${IMAGE_BASE}/images/roco-cn/characters/${char.id}.webp`;
}

export function getRocoCnCharacterById(id: string): RocoCnJinie | undefined {
  return rocoCnCharacters.find((c) => c.id === id);
}

export const characters: Character[] = rocoCnCharacters.map((char) => ({
  id: char.id,
  gameId: 'roco-cn' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.attribute,
  weaponType: 'jinie',
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/roco-cn/characters/${char.id}.webp`,
    card: `/images/roco-cn/characters/${char.id}.webp`,
    gachaSplash: `/images/roco-cn/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: [],
  releaseVersion: '',
}));

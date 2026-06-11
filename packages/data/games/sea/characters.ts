import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { SeaCharacter } from './types';
import { localeStr } from './types';
import rawCharacters from './raw-characters.json';

const allCharacters: SeaCharacter[] = rawCharacters as unknown as SeaCharacter[];

export const seaCharacters: SeaCharacter[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getSeaCharacterName(char: SeaCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getSeaCharacterDescription(char: SeaCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getSeaCharacterImage(char: SeaCharacter): string {
  return `${IMAGE_BASE}/images/sea/characters/${char.id}.webp`;
}

export function getSeaCharacterById(id: string): SeaCharacter | undefined {
  return seaCharacters.find((c) => c.id === id);
}

export function getSeaCharacterTierReason(char: SeaCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = seaCharacters.map((char) => ({
  id: char.id,
  gameId: 'sea' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.attribute,
  weaponType: char.fleet,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/sea/characters/${char.id}.webp`,
    card: `/images/sea/characters/${char.id}.webp`,
    gachaSplash: `/images/sea/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: '',
}));

function mapSkills(skills: SeaCharacter['skills']): Character['skills'] {
  const result: Character['skills'] = [];
  if (skills.passive) {
    result.push({
      id: 'passive',
      name: { zh: skills.passive.name, en: skills.passive.nameEn, ja: skills.passive.nameEn },
      description: { zh: skills.passive.description, en: skills.passive.descriptionEn, ja: skills.passive.descriptionEn },
      type: 'passive',
    });
  }
  if (skills.signature) {
    result.push({
      id: 'signature',
      name: { zh: skills.signature.name, en: skills.signature.nameEn, ja: skills.signature.nameEn },
      description: { zh: skills.signature.description, en: skills.signature.descriptionEn, ja: skills.signature.descriptionEn },
      type: 'elemental',
    });
  }
  if (skills.personal) {
    result.push({
      id: 'personal',
      name: { zh: skills.personal.name, en: skills.personal.nameEn, ja: skills.personal.nameEn },
      description: { zh: skills.personal.description, en: skills.personal.descriptionEn, ja: skills.personal.descriptionEn },
      type: 'burst',
    });
  }
  return result;
}

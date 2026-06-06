import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { EndfieldCharacter } from './types';
import { localeStr } from './types';
import rawCharacters from './raw-characters.json';

const allCharacters: EndfieldCharacter[] = rawCharacters as unknown as EndfieldCharacter[];

export const endfieldCharacters: EndfieldCharacter[] = allCharacters.filter(
  (c) => c.availableAtLaunch !== false && c.status !== 'upcoming'
);

export function getEndfieldCharacterName(char: EndfieldCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getEndfieldCharacterDescription(char: EndfieldCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale, char.descriptionJa);
}

export function getEndfieldCharacterImage(char: EndfieldCharacter): string {
  return `${IMAGE_BASE}/images/endfield/characters/${char.id}.webp`;
}

export function getEndfieldCharacterById(id: string): EndfieldCharacter | undefined {
  return endfieldCharacters.find((c) => c.id === id);
}

export function getEndfieldCharacterTierReason(char: EndfieldCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = endfieldCharacters.map((char) => ({
  id: char.id,
  gameId: 'endfield' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.weaponType ?? char.professionEn,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionJa ?? char.descriptionEn },
  images: {
    icon: `/images/endfield/characters/${char.id}.webp`,
    card: `/images/endfield/characters/${char.id}.webp`,
    gachaSplash: `/images/endfield/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: '',
}));

function mapSkills(skills: EndfieldCharacter['skills']): Character['skills'] {
  const result: Character['skills'] = [];
  if (skills.normalAttack) {
    result.push({
      id: 'normal-attack',
      name: { zh: skills.normalAttack.name, en: skills.normalAttack.nameEn, ja: skills.normalAttack.nameJa ?? skills.normalAttack.nameEn },
      description: { zh: skills.normalAttack.description, en: skills.normalAttack.descriptionEn, ja: skills.normalAttack.descriptionJa ?? skills.normalAttack.descriptionEn },
      type: 'normal',
    });
  }
  if (skills.skill) {
    result.push({
      id: 'skill',
      name: { zh: skills.skill.name, en: skills.skill.nameEn, ja: skills.skill.nameJa ?? skills.skill.nameEn },
      description: { zh: skills.skill.description, en: skills.skill.descriptionEn, ja: skills.skill.descriptionJa ?? skills.skill.descriptionEn },
      type: 'elemental',
    });
  }
  if (skills.ultimate) {
    result.push({
      id: 'ultimate',
      name: { zh: skills.ultimate.name, en: skills.ultimate.nameEn, ja: skills.ultimate.nameJa ?? skills.ultimate.nameEn },
      description: { zh: skills.ultimate.description, en: skills.ultimate.descriptionEn, ja: skills.ultimate.descriptionJa ?? skills.ultimate.descriptionEn },
      type: 'burst',
    });
  }
  if (skills.passive) {
    result.push({
      id: 'passive',
      name: { zh: skills.passive.name, en: skills.passive.nameEn, ja: skills.passive.nameJa ?? skills.passive.nameEn },
      description: { zh: skills.passive.description, en: skills.passive.descriptionEn, ja: skills.passive.descriptionJa ?? skills.passive.descriptionEn },
      type: 'passive',
    });
  }
  return result;
}

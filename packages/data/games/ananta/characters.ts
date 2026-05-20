import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { AnantaCharacter } from './types';
import { localeStr } from './types';
import rawCharacters from './raw-characters.json';

const allCharacters: AnantaCharacter[] = rawCharacters as unknown as AnantaCharacter[];

export const anantaCharacters: AnantaCharacter[] = allCharacters.filter(
  (c) => c.availableAtLaunch !== false && c.status !== 'upcoming'
);

export function getAnantaCharacterName(char: AnantaCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getAnantaCharacterDescription(char: AnantaCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getAnantaCharacterImage(char: AnantaCharacter): string {
  return `${IMAGE_BASE}/images/ananta/characters/${char.id}.webp`;
}

export function getAnantaCharacterById(id: string): AnantaCharacter | undefined {
  return anantaCharacters.find((c) => c.id === id);
}

export function getAnantaCharacterTierReason(char: AnantaCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = anantaCharacters.map((char) => ({
  id: char.id,
  gameId: 'ananta' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.weaponType ?? char.roleEn,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/ananta/characters/${char.id}.webp`,
    card: `/images/ananta/characters/${char.id}.webp`,
    gachaSplash: `/images/ananta/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: '',
}));

function mapSkills(skills: AnantaCharacter['skills']): Character['skills'] {
  const result: Character['skills'] = [];
  if (skills.normalAttack) {
    result.push({
      id: 'normal-attack',
      name: { zh: skills.normalAttack.name, en: skills.normalAttack.nameEn, ja: skills.normalAttack.nameEn },
      description: { zh: skills.normalAttack.description, en: skills.normalAttack.descriptionEn, ja: skills.normalAttack.descriptionEn },
      type: 'normal',
    });
  }
  if (skills.skill) {
    result.push({
      id: 'skill',
      name: { zh: skills.skill.name, en: skills.skill.nameEn, ja: skills.skill.nameEn },
      description: { zh: skills.skill.description, en: skills.skill.descriptionEn, ja: skills.skill.descriptionEn },
      type: 'elemental',
    });
  }
  if (skills.ultimate) {
    result.push({
      id: 'ultimate',
      name: { zh: skills.ultimate.name, en: skills.ultimate.nameEn, ja: skills.ultimate.nameEn },
      description: { zh: skills.ultimate.description, en: skills.ultimate.descriptionEn, ja: skills.ultimate.descriptionEn },
      type: 'burst',
    });
  }
  if (skills.passive) {
    result.push({
      id: 'passive',
      name: { zh: skills.passive.name, en: skills.passive.nameEn, ja: skills.passive.nameEn },
      description: { zh: skills.passive.description, en: skills.passive.descriptionEn, ja: skills.passive.descriptionEn },
      type: 'passive',
    });
  }
  return result;
}

import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { ZzzCharacter } from './types';
import { localeStr } from './types';
import rawCharacters from './raw-characters.json';

const allCharacters: ZzzCharacter[] = rawCharacters as unknown as ZzzCharacter[];

// Only export characters that are available (not upcoming)
export const zzzCharacters: ZzzCharacter[] = allCharacters.filter(
  (c) => c.availableAtLaunch !== false && c.status !== 'upcoming'
);

export function getZzzCharacterName(char: ZzzCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getZzzCharacterDescription(char: ZzzCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getZzzCharacterImage(char: ZzzCharacter): string {
  return `${IMAGE_BASE}/images/zzz/characters/${char.id}.webp`;
}

export function getZzzCharacterById(id: string): ZzzCharacter | undefined {
  return zzzCharacters.find((c) => c.id === id);
}

export function getZzzCharacterTierReason(char: ZzzCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = zzzCharacters.map((char) => ({
  id: char.id,
  gameId: 'zzz' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rank === 'S' ? 5 : 4,
  element: char.attribute,
  weaponType: char.specialtyEn,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/zzz/characters/${char.id}.webp`,
    card: `/images/zzz/characters/${char.id}.webp`,
    gachaSplash: `/images/zzz/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: '',
}));

function mapSkills(skills: ZzzCharacter['skills']): Character['skills'] {
  const result: Character['skills'] = [];
  if (skills.normalAttack) {
    result.push({
      id: 'normal-attack',
      name: { zh: skills.normalAttack.name, en: skills.normalAttack.nameEn, ja: skills.normalAttack.nameEn },
      description: { zh: skills.normalAttack.description, en: skills.normalAttack.descriptionEn, ja: skills.normalAttack.descriptionEn },
      type: 'normal',
    });
  }
  if (skills.special) {
    result.push({
      id: 'special',
      name: { zh: skills.special.name, en: skills.special.nameEn, ja: skills.special.nameEn },
      description: { zh: skills.special.description, en: skills.special.descriptionEn, ja: skills.special.descriptionEn },
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
  if (skills.corePassive) {
    result.push({
      id: 'core-passive',
      name: { zh: skills.corePassive.name, en: skills.corePassive.nameEn, ja: skills.corePassive.nameEn },
      description: { zh: skills.corePassive.description, en: skills.corePassive.descriptionEn, ja: skills.corePassive.descriptionEn },
      type: 'passive',
    });
  }
  return result;
}

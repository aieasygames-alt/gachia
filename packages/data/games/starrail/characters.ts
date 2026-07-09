import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { StarRailCharacter } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

const allCharacters: StarRailCharacter[] = rawCharacters as unknown as StarRailCharacter[];

export const starrailCharacters: StarRailCharacter[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getStarRailCharacterName(char: StarRailCharacter, locale: SupportedLocale): string {
  if (locale === 'ja' && char.nameJa) return char.nameJa;
  return localeStr(char.name, char.nameEn, locale);
}

export function getStarRailCharacterDescription(char: StarRailCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getStarRailCharacterImage(char: StarRailCharacter): string {
  return `${IMAGE_BASE}/images/starrail/characters/${char.id}.webp`;
}

export function getStarRailCharacterById(id: string): StarRailCharacter | undefined {
  return starrailCharacters.find((c) => c.id === id);
}

export function getStarRailCharacterTierReason(char: StarRailCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = starrailCharacters.map((char) => ({
  id: char.id,
  gameId: 'starrail' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa || char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.path,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/starrail/characters/${char.id}.webp`,
    card: `/images/starrail/characters/${char.id}.webp`,
    gachaSplash: `/images/starrail/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  constellations: char.eidolons.map((e) => ({
    level: e.level,
    name: { zh: e.name, en: e.nameEn, ja: e.nameEn },
    description: { zh: e.description, en: e.descriptionEn, ja: e.descriptionEn },
  })),
  releaseVersion: char.releaseVersion,
}));

function mapSkills(skills: StarRailCharacter['skills']): Character['skills'] {
  const result: Character['skills'] = [];
  if (skills.basicAtk) {
    result.push({
      id: 'basic-atk',
      name: { zh: skills.basicAtk.name, en: skills.basicAtk.nameEn, ja: skills.basicAtk.nameEn },
      description: { zh: skills.basicAtk.description, en: skills.basicAtk.descriptionEn, ja: skills.basicAtk.descriptionEn },
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
  if (skills.talent) {
    result.push({
      id: 'talent',
      name: { zh: skills.talent.name, en: skills.talent.nameEn, ja: skills.talent.nameEn },
      description: { zh: skills.talent.description, en: skills.talent.descriptionEn, ja: skills.talent.descriptionEn },
      type: 'passive',
    });
  }
  if (skills.technique) {
    result.push({
      id: 'technique',
      name: { zh: skills.technique.name, en: skills.technique.nameEn, ja: skills.technique.nameEn },
      description: { zh: skills.technique.description, en: skills.technique.descriptionEn, ja: skills.technique.descriptionEn },
      type: 'passive',
    });
  }
  return result;
}

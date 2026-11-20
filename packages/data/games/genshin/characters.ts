import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { GenshinCharacter } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

const allCharacters: GenshinCharacter[] = rawCharacters as unknown as GenshinCharacter[];

export const genshinCharacters: GenshinCharacter[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getGenshinCharacterName(char: GenshinCharacter, locale: SupportedLocale): string {
  if (locale === 'ja' && char.nameJa) return char.nameJa;
  return localeStr(char.name, char.nameEn, locale);
}

export function getGenshinCharacterDescription(char: GenshinCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getGenshinCharacterImage(char: GenshinCharacter): string {
  return `${IMAGE_BASE}/images/genshin/characters/${char.id}.webp`;
}

export function getGenshinCharacterById(id: string): GenshinCharacter | undefined {
  return genshinCharacters.find((c) => c.id === id);
}

export function getGenshinCharacterTierReason(char: GenshinCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = genshinCharacters.map((char) => ({
  id: char.id,
  gameId: 'genshin' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa || char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.weaponType,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/genshin/characters/${char.id}.webp`,
    card: `/images/genshin/characters/${char.id}.webp`,
    gachaSplash: `/images/genshin/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  constellations: char.constellations.map((c) => ({
    level: c.level,
    name: { zh: c.name, en: c.nameEn, ja: c.nameEn },
    description: { zh: c.description, en: c.descriptionEn, ja: c.descriptionEn },
  })),
  releaseVersion: char.releaseVersion,
}));

function mapSkills(skills: GenshinCharacter['skills']): Character['skills'] {
  const result: Character['skills'] = [];
  if (skills.normalAttack) {
    result.push({
      id: 'normal-attack',
      name: { zh: skills.normalAttack.name, en: skills.normalAttack.nameEn, ja: skills.normalAttack.nameEn },
      description: { zh: skills.normalAttack.description, en: skills.normalAttack.descriptionEn, ja: skills.normalAttack.descriptionEn },
      type: 'normal',
    });
  }
  if (skills.elementalSkill) {
    result.push({
      id: 'elemental-skill',
      name: { zh: skills.elementalSkill.name, en: skills.elementalSkill.nameEn, ja: skills.elementalSkill.nameEn },
      description: { zh: skills.elementalSkill.description, en: skills.elementalSkill.descriptionEn, ja: skills.elementalSkill.descriptionEn },
      type: 'elemental',
    });
  }
  if (skills.elementalBurst) {
    result.push({
      id: 'elemental-burst',
      name: { zh: skills.elementalBurst.name, en: skills.elementalBurst.nameEn, ja: skills.elementalBurst.nameEn },
      description: { zh: skills.elementalBurst.description, en: skills.elementalBurst.descriptionEn, ja: skills.elementalBurst.descriptionEn },
      type: 'burst',
    });
  }
  if (skills.specialJump) {
    result.push({
      id: 'special-jump',
      name: { zh: skills.specialJump.name, en: skills.specialJump.nameEn, ja: skills.specialJump.nameEn },
      description: { zh: skills.specialJump.description, en: skills.specialJump.descriptionEn, ja: skills.specialJump.descriptionEn },
      type: 'special',
    });
  }
  if (skills.passive1) {
    result.push({
      id: 'passive-1',
      name: { zh: skills.passive1.name, en: skills.passive1.nameEn, ja: skills.passive1.nameEn },
      description: { zh: skills.passive1.description, en: skills.passive1.descriptionEn, ja: skills.passive1.descriptionEn },
      type: 'passive',
    });
  }
  if (skills.passive2) {
    result.push({
      id: 'passive-2',
      name: { zh: skills.passive2.name, en: skills.passive2.nameEn, ja: skills.passive2.nameEn },
      description: { zh: skills.passive2.description, en: skills.passive2.descriptionEn, ja: skills.passive2.descriptionEn },
      type: 'passive',
    });
  }
  if (skills.passive3) {
    result.push({
      id: 'passive-3',
      name: { zh: skills.passive3.name, en: skills.passive3.nameEn, ja: skills.passive3.nameEn },
      description: { zh: skills.passive3.description, en: skills.passive3.descriptionEn, ja: skills.passive3.descriptionEn },
      type: 'passive',
    });
  }
  if (skills.passive4) {
    result.push({
      id: 'passive-4',
      name: { zh: skills.passive4.name, en: skills.passive4.nameEn, ja: skills.passive4.nameEn },
      description: { zh: skills.passive4.description, en: skills.passive4.descriptionEn, ja: skills.passive4.descriptionEn },
      type: 'passive',
    });
  }
  return result;
}

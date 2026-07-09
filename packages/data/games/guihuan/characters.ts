import type { SupportedLocale, Character } from '@gachia/core';
import type { GuihuanCharacter } from './types';
import rawCharacters from './raw-characters.json';
import { localeStr } from './types';

const allCharacters: GuihuanCharacter[] = rawCharacters as unknown as GuihuanCharacter[];

export const guihuanCharacters: GuihuanCharacter[] = allCharacters.filter(
  (c) => c.availableAtLaunch !== false && c.status !== 'upcoming'
);

export function getGuihuanCharacterName(char: GuihuanCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getGuihuanCharacterDescription(char: GuihuanCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getGuihuanCharacterImage(char: GuihuanCharacter): string {
  return `/images/guihuan/characters/${char.id}.webp`;
}

export function getGuihuanCharacterById(id: string): GuihuanCharacter | undefined {
  return guihuanCharacters.find((c) => c.id === id);
}

export function getGuihuanCharacterTierReason(char: GuihuanCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = guihuanCharacters.map((char) => ({
  id: char.id,
  gameId: 'guihuan' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.element,
  weaponType: char.weaponType ?? char.roleEn,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/guihuan/characters/${char.id}.webp`,
    card: `/images/guihuan/characters/${char.id}.webp`,
    gachaSplash: `/images/guihuan/characters/${char.id}.webp`,
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: '',
}));

function mapSkills(skills: GuihuanCharacter['skills']): Character['skills'] {
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

import type { SupportedLocale, Character } from '@gachia/core';
import type { NteCharacter } from './types';
import { localeStr } from './types';
import rawCharacters from './raw-characters.json';
import rawImageSources from './raw-image-sources.json';

const imageMap = ((rawImageSources as Record<string, unknown>).characters ?? {}) as Record<string, string>;

const allCharacters: NteCharacter[] = rawCharacters as unknown as NteCharacter[];

// Only export characters that are available (not upcoming)
export const nteCharacters: NteCharacter[] = allCharacters.filter(
  (c) => c.availableAtLaunch !== false && c.status !== 'upcoming'
);

export function getNteCharacterName(char: NteCharacter, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale);
}

export function getNteCharacterDescription(char: NteCharacter, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getNteCharacterImage(char: NteCharacter): string {
  return imageMap[char.id] || '';
}

export function getNteCharacterById(id: string): NteCharacter | undefined {
  return nteCharacters.find((c) => c.id === id);
}

export function getNteCharacterTierReason(char: NteCharacter, locale: SupportedLocale): string {
  return localeStr(char.tierReasonZh, char.tierReason, locale);
}

export const characters: Character[] = nteCharacters.map((char) => ({
  id: char.id,
  gameId: 'nte' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameEn },
  rarity: char.rank === 'S' ? 5 : 4,
  element: char.attribute,
  weaponType: char.weaponEn,
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: imageMap[char.id] || '',
    card: imageMap[char.id] || '',
    gachaSplash: imageMap[char.id] || '',
  },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: '',
}));

function mapSkills(skills: NteCharacter['skills']): Character['skills'] {
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
  if (skills.passives) {
    skills.passives.forEach((p, i) => {
      result.push({
        id: `passive-${i}`,
        name: { zh: p.name, en: p.nameEn, ja: p.nameEn },
        description: { zh: p.description, en: p.descriptionEn, ja: p.descriptionEn },
        type: 'passive',
      });
    });
  }
  return result;
}

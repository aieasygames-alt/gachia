import type { SupportedLocale } from '@gachia/core';
import type { GenshinCharacter, GenshinWeapon, GenshinArtifactSet } from '@gachia/data/games/genshin/types';

export const compareSkillKeys = ['normalAttack', 'elementalSkill', 'elementalBurst'] as const;
export type CompareCharacter = Pick<GenshinCharacter, 'id' | 'name' | 'nameEn' | 'nameJa' | 'element' | 'weaponType' | 'rarity'
  | 'tierRank' | 'tierReason' | 'tierReasonZh' | 'recommendedBuild' | 'teamComps' | 'region' | 'releaseVersion' | 'acquisitionMethod' | 'status'>
  & { image: string; skills: Partial<Pick<GenshinCharacter['skills'], typeof compareSkillKeys[number]>> };
export type CompareCatalog = {
  characters: CompareCharacter[];
  weapons: Pick<GenshinWeapon, 'id' | 'name' | 'nameEn' | 'rarity' | 'baseAtk'>[];
  artifacts: Pick<GenshinArtifactSet, 'id' | 'name' | 'nameEn'>[];
};

export function projectCompareCatalog(characters: GenshinCharacter[], weapons: GenshinWeapon[], artifacts: GenshinArtifactSet[], image: (character: GenshinCharacter) => string): CompareCatalog {
  return {
    characters: characters.map(character => ({
      id: character.id, name: character.name, nameEn: character.nameEn, nameJa: character.nameJa,
      element: character.element, weaponType: character.weaponType, rarity: character.rarity, image: image(character),
      tierRank: character.tierRank, tierReason: character.tierReason, tierReasonZh: character.tierReasonZh,
      recommendedBuild: character.recommendedBuild, teamComps: character.teamComps,
      region: character.region, releaseVersion: character.releaseVersion, acquisitionMethod: character.acquisitionMethod, status: character.status,
      skills: Object.fromEntries(compareSkillKeys.map(key => [key, character.skills?.[key]])),
    })),
    weapons: weapons.map(({ id, name, nameEn, rarity, baseAtk }) => ({ id, name, nameEn, rarity, baseAtk })),
    artifacts: artifacts.map(({ id, name, nameEn }) => ({ id, name, nameEn })),
  };
}

export function compareName(character: CompareCharacter, locale: SupportedLocale) {
  return locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa || character.nameEn : character.nameEn;
}

export function filterCompareCharacters(characters: CompareCharacter[], query: string, element: string) {
  const search = query.trim().toLowerCase();
  return characters.filter(character => (element === 'all' || character.element === element)
    && (!search || [character.id, character.name, character.nameEn, character.nameJa ?? ''].some(value => value.toLowerCase().includes(search))));
}

export const compareElements: Record<string, Record<SupportedLocale, string>> = {
  pyro: { zh: '火', en: 'Pyro', ja: '炎' }, hydro: { zh: '水', en: 'Hydro', ja: '水' },
  electro: { zh: '雷', en: 'Electro', ja: '雷' }, cryo: { zh: '冰', en: 'Cryo', ja: '氷' },
  dendro: { zh: '草', en: 'Dendro', ja: '草' }, anemo: { zh: '风', en: 'Anemo', ja: '風' }, geo: { zh: '岩', en: 'Geo', ja: '岩' },
};
export const compareWeaponTypes: Record<string, Record<SupportedLocale, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' }, claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' }, bow: { zh: '弓', en: 'Bow', ja: '弓' }, catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

export function compareWeaponLabel(type: string, locale: SupportedLocale) {
  return compareWeaponTypes[type.toLowerCase()]?.[locale] ?? type;
}

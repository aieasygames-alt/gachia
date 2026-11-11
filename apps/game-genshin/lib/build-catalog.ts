import type { SupportedLocale } from '@gachia/core';
import type { GenshinArtifactSet, GenshinCharacter, GenshinWeapon } from '@gachia/data/games/genshin/types';

export type BuildCharacter = Pick<GenshinCharacter, 'id' | 'name' | 'nameEn' | 'nameJa' | 'element' | 'rarity' | 'weaponType' | 'recommendedBuild' | 'teamComps'> & { image: string };
export type BuildCatalog = { characters: BuildCharacter[]; weapons: GenshinWeapon[]; artifacts: GenshinArtifactSet[] };

export function buildCharacterName(character: BuildCharacter, locale: SupportedLocale) {
  return locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa || character.nameEn : character.nameEn;
}

export function filterBuildCharacters(characters: BuildCharacter[], query: string, element: string, rarity: string) {
  const search = query.trim().toLowerCase();
  return characters.filter(character => (element === 'all' || character.element === element)
    && (rarity === 'all' || String(character.rarity) === rarity)
    && (!search || [character.id, character.name, character.nameEn, character.nameJa ?? ''].some(value => value.toLowerCase().includes(search))));
}

export function resolveBuildEquipment<T extends { id: string; name: string; nameEn: string }>(items: T[], name: string): T | undefined {
  const normalized = name.trim().toLowerCase();
  return normalized ? items.find(item => [item.id, item.name, item.nameEn].some(value => value.toLowerCase() === normalized)) : undefined;
}

export function genericBuildWeapons(weapons: GenshinWeapon[], type: string) {
  return weapons.filter(weapon => weapon.weaponType === type && weapon.rarity >= 4)
    .sort((a, b) => b.rarity - a.rarity || b.baseAtk - a.baseAtk).slice(0, 5);
}

export function hasBuildRecommendation(character: BuildCharacter) {
  const build = character.recommendedBuild;
  return Boolean(build && [build.bestWeapon, build.bestWeaponEn, build.bestArtifactSet, build.bestArtifactSetEn,
    build.alternativeArtifactSet, build.alternativeArtifactSetEn, ...(build.alternativeWeapons ?? []),
    ...Object.values(build.mainStats ?? {}), ...Object.values(build.mainStatsEn ?? {}),
    ...(build.subStatPriority ?? []), ...(build.subStatPriorityEn ?? [])].some(value => value?.trim()));
}

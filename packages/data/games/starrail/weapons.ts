import type { SupportedLocale, Weapon } from '@gachia/core';
import type { StarRailLightCone } from './types';
import { localeStr } from './types';
import rawLightCones from './raw-light-cones.json';

export const starrailLightCones: StarRailLightCone[] = rawLightCones as unknown as StarRailLightCone[];

export function getStarRailLightConeName(lc: StarRailLightCone, locale: SupportedLocale): string {
  return localeStr(lc.name, lc.nameEn, locale);
}

export function getStarRailLightConeById(id: string): StarRailLightCone | undefined {
  return starrailLightCones.find((lc) => lc.id === id);
}

export function getStarRailLightConeEffect(lc: StarRailLightCone, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(lc.effectName, lc.effectNameEn, locale),
    description: localeStr(lc.effectDescription, lc.effectDescriptionEn, locale),
  };
}

export function getStarRailLightConeSource(lc: StarRailLightCone, locale: SupportedLocale): string {
  return localeStr(lc.howToObtainZh, lc.howToObtainEn, locale);
}

export const weapons: Weapon[] = starrailLightCones.map((lc) => ({
  id: lc.id,
  gameId: 'starrail' as const,
  name: { zh: lc.name, en: lc.nameEn, ja: lc.nameEn },
  rarity: lc.rarity,
  weaponType: lc.path,
  description: { zh: lc.effectDescription, en: lc.effectDescriptionEn, ja: lc.effectDescriptionEn },
  images: { icon: '' },
  stats: { baseAtk: [lc.baseAtk] },
  passive: {
    name: { zh: lc.effectName, en: lc.effectNameEn, ja: lc.effectNameEn },
    description: { zh: lc.effectDescription, en: lc.effectDescriptionEn, ja: lc.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

import type { SupportedLocale, Weapon } from '@gachia/core';
import type { GenshinWeapon } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawWeapons from './raw-weapons.json';

export const genshinWeapons: GenshinWeapon[] = rawWeapons as unknown as GenshinWeapon[];

export function getGenshinWeaponName(weapon: GenshinWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale);
}

export function getGenshinWeaponById(id: string): GenshinWeapon | undefined {
  return genshinWeapons.find((w) => w.id === id);
}

export function getGenshinWeaponEffect(weapon: GenshinWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getGenshinWeaponSource(weapon: GenshinWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.howToObtainZh, weapon.howToObtainEn, locale);
}

export const weapons: Weapon[] = genshinWeapons.map((w) => ({
  id: w.id,
  gameId: 'genshin' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponType,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/genshin/weapons/${w.id}.webp` },
  stats: { baseAtk: [w.baseAtk] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

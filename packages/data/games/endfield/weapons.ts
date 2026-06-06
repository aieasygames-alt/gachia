import type { SupportedLocale, Weapon } from '@gachia/core';
import type { EndfieldWeapon } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawWeapons from './raw-weapons.json';

export const endfieldWeapons: EndfieldWeapon[] = rawWeapons as unknown as EndfieldWeapon[];

export function getEndfieldWeaponName(weapon: EndfieldWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getEndfieldWeaponById(id: string): EndfieldWeapon | undefined {
  return endfieldWeapons.find((w) => w.id === id);
}

export function getEndfieldWeaponEffect(weapon: EndfieldWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getEndfieldWeaponSource(weapon: EndfieldWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.howToObtain, weapon.howToObtainEn, locale);
}

export const weapons: Weapon[] = endfieldWeapons.map((w) => ({
  id: w.id,
  gameId: 'endfield' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameJa ?? w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponTypeEn,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/endfield/weapons/${w.id}.webp` },
  stats: { baseAtk: [w.baseAtk] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

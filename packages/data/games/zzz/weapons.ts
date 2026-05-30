import type { SupportedLocale, Weapon } from '@gachia/core';
import type { ZzzWeapon } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawWeapons from './raw-weapons.json';

export const zzzWeapons: ZzzWeapon[] = rawWeapons as unknown as ZzzWeapon[];

export function getZzzWeaponName(weapon: ZzzWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getZzzWeaponById(id: string): ZzzWeapon | undefined {
  return zzzWeapons.find((w) => w.id === id);
}

export function getZzzWeaponEffect(weapon: ZzzWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getZzzWeaponSource(weapon: ZzzWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.howToObtainZh, weapon.howToObtainEn, locale);
}

export const weapons: Weapon[] = zzzWeapons.map((w) => ({
  id: w.id,
  gameId: 'zzz' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameJa ?? w.nameEn },
  rarity: w.rank === 'S' ? 5 : w.rank === 'A' ? 4 : 3,
  weaponType: w.specialtyEn,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/zzz/weapons/${w.id}.webp` },
  stats: { baseAtk: [w.baseAtk] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

import type { SupportedLocale, Weapon } from '@gachia/core';
import { IMAGE_BASE } from '../../image-base';
import { localeStr, type SkjhWeapon } from './types';
import rawWeapons from './raw-weapons.json';

export const skjhWeapons: SkjhWeapon[] = rawWeapons as unknown as SkjhWeapon[];

export function getSkjhWeaponName(weapon: SkjhWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getSkjhWeaponById(id: string): SkjhWeapon | undefined {
  return skjhWeapons.find((w) => w.id === id);
}

export function getSkjhWeaponEffect(weapon: SkjhWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale, weapon.effectNameJa),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale, weapon.effectDescriptionJa),
  };
}

export function getSkjhWeaponSource(weapon: SkjhWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.source, weapon.sourceEn, locale, weapon.sourceJa);
}

export const weapons: Weapon[] = skjhWeapons.map((w) => ({
  id: w.id,
  gameId: 'skjh' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameJa ?? w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponType,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionJa ?? w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/skjh/weapons/${w.id}.webp` },
  stats: { baseAtk: [] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameJa ?? w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionJa ?? w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

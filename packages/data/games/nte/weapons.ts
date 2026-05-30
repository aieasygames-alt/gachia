import type { SupportedLocale, Weapon } from '@gachia/core';
import type { NteWeapon } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawWeapons from './raw-weapons.json';

export const nteWeapons: NteWeapon[] = rawWeapons as unknown as NteWeapon[];

export function getNteWeaponName(weapon: NteWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale);
}

export function getNteWeaponById(id: string): NteWeapon | undefined {
  return nteWeapons.find((w) => w.id === id);
}

export function getNteWeaponEffect(weapon: NteWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getNteWeaponSource(weapon: NteWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.howToObtainZh, weapon.howToObtainEn, locale);
}

export const weapons: Weapon[] = nteWeapons.map((w) => ({
  id: w.id,
  gameId: 'nte' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameEn },
  rarity: w.rank === 'S' ? 5 : w.rank === 'A' ? 4 : 3,
  weaponType: w.type,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/nte/weapons/${w.id}.webp` },
  stats: { baseAtk: [w.baseAtk] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

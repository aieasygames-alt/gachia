import type { SupportedLocale, Weapon } from '@gachia/core';
import type { AnantaWeapon } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawWeapons from './raw-weapons.json';

export const anantaWeapons: AnantaWeapon[] = rawWeapons as unknown as AnantaWeapon[];

export function getAnantaWeaponName(weapon: AnantaWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getAnantaWeaponById(id: string): AnantaWeapon | undefined {
  return anantaWeapons.find((w) => w.id === id);
}

export function getAnantaWeaponEffect(weapon: AnantaWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getAnantaWeaponSource(weapon: AnantaWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.howToObtain, weapon.howToObtainEn, locale);
}

export const weapons: Weapon[] = anantaWeapons.map((w) => ({
  id: w.id,
  gameId: 'ananta' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameJa ?? w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponTypeEn,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/ananta/weapons/${w.id}.webp` },
  stats: { baseAtk: [w.baseAtk] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

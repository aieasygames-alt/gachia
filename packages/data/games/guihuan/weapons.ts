import type { SupportedLocale, Weapon } from '@gachia/core';
import type { GuihuanWeapon } from './types';
import rawWeapons from './raw-weapons.json';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';

export const guihuanWeapons: GuihuanWeapon[] = rawWeapons as unknown as GuihuanWeapon[];

export function getGuihuanWeaponName(weapon: GuihuanWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getGuihuanWeaponById(id: string): GuihuanWeapon | undefined {
  return guihuanWeapons.find((w) => w.id === id);
}

export function getGuihuanWeaponEffect(weapon: GuihuanWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getGuihuanWeaponSource(weapon: GuihuanWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.howToObtain, weapon.howToObtainEn, locale);
}

export const weapons: Weapon[] = guihuanWeapons.map((w) => ({
  id: w.id,
  gameId: 'guihuan' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameJa ?? w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponTypeEn,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/guihuan/weapons/${w.id}.webp` },
  stats: { baseAtk: [w.baseAtk] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

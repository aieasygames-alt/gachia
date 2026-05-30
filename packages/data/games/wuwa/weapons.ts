import type { SupportedLocale, Weapon } from '@gachia/core';
import type { WuWaWeapon } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawWeapons from './raw-weapons.json';

export const wuwaWeapons: WuWaWeapon[] = rawWeapons as unknown as WuWaWeapon[];

export function getWuWaWeaponName(weapon: WuWaWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale);
}

export function getWuWaWeaponById(id: string): WuWaWeapon | undefined {
  return wuwaWeapons.find((w) => w.id === id);
}

export function getWuWaWeaponEffect(weapon: WuWaWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.passiveName || '', weapon.passiveName || '', locale),
    description: localeStr(weapon.passiveDescription || '', weapon.passiveDescription || '', locale),
  };
}

export function getWuWaWeaponSource(weapon: WuWaWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.signatureCharacter || '', weapon.signatureCharacter || '', locale);
}

export const weapons: Weapon[] = wuwaWeapons.map((w) => ({
  id: w.id,
  gameId: 'wuwa' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponType,
  description: { zh: '', en: '', ja: '' },
  images: { icon: `${IMAGE_BASE}/images/wuwa/weapons/${w.id}.webp` },
  stats: {
    baseAtk: [w.baseAtk],
    subStat: w.subStat ? { name: w.subStat.name, values: [parseFloat(w.subStat.value)] } : undefined,
  },
  passive: w.passiveName
    ? {
        name: { zh: w.passiveName, en: w.passiveName, ja: w.passiveName },
        description: { zh: w.passiveDescription || '', en: w.passiveDescription || '', ja: w.passiveDescription || '' },
      }
    : undefined,
  ascensionMaterials: [],
}));

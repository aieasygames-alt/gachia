import type { SupportedLocale, Weapon } from '@gachia/core';
import type { EndfieldWeapon } from './types';
import rawWeapons from './raw-weapons.json';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';

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

function getWeaponMaterials(weaponType: string, rarity: number): { itemId: string; quantities: number[] }[] {
  const typeMaterial: Record<string, string> = {
    'Sword': 'protoprism',
    'Great Sword': 'protoprism',
    'Polearm': 'protoprism',
    'Handcannon': 'protoprism',
    'Arts Unit': 'protoprism',
  };
  const baseMat = typeMaterial[weaponType] ?? 'protoprism';
  const tierMultiplier = rarity >= 6 ? 1.5 : 1;
  return [
    { itemId: baseMat, quantities: [3, 5, 8, 12, 18, 25].map(q => Math.round(q * tierMultiplier)) },
    { itemId: 'protodisk', quantities: [5, 8, 12, 18, 25, 35].map(q => Math.round(q * tierMultiplier)) },
    { itemId: 'protoset', quantities: [0, 3, 5, 8, 12, 18].map(q => Math.round(q * tierMultiplier)) },
  ];
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
  ascensionMaterials: getWeaponMaterials(w.weaponTypeEn, w.rarity),
}));

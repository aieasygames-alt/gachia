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

function getWeaponMaterials(weaponType: string, rarity: number): { itemId: string; quantities: number[] }[] {
  const typeMaterial: Record<string, string> = {
    'Sword': 'grindstone',
    'Great Sword': 'manganese-ore',
    'Polearm': 'crystalline-component',
    'Handcannon': 'incandescent-alloy',
    'Arts Unit': 'protocolized-weapon-pattern',
  };
  const baseMat = typeMaterial[weaponType] ?? 'grindstone';
  const tierMultiplier = rarity >= 6 ? 1.5 : 1;
  return [
    { itemId: baseMat, quantities: [3, 5, 8, 12, 18, 25].map(q => Math.round(q * tierMultiplier)) },
    { itemId: 'arms-inspector', quantities: [5, 8, 12, 18, 25, 35].map(q => Math.round(q * tierMultiplier)) },
    { itemId: 'arms-insp-kit', quantities: [0, 3, 5, 8, 12, 18].map(q => Math.round(q * tierMultiplier)) },
    { itemId: 'arms-insp-set', quantities: [0, 0, 2, 4, 6, 10].map(q => Math.round(q * tierMultiplier)) },
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

import type { SupportedLocale, Weapon } from '@gachia/core';
import type { Hi3Weapon } from './types';
import rawWeapons from './raw-weapons.json';
import { localeStr } from './types';

export const hi3Weapons: Hi3Weapon[] = rawWeapons as Hi3Weapon[];

export function getHi3WeaponName(weapon: Hi3Weapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getHi3WeaponById(id: string): Hi3Weapon | undefined {
  return hi3Weapons.find((weapon) => weapon.id === id);
}

export function getHi3WeaponEffect(weapon: Hi3Weapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: getHi3WeaponName(weapon, locale),
    description: localeStr(weapon.description, weapon.descriptionEn, locale, weapon.descriptionJa),
  };
}

export function getHi3WeaponSource(_weapon: Hi3Weapon, locale: SupportedLocale): string {
  return locale === 'zh' ? '以游戏内及官方公告为准' : locale === 'ja' ? 'ゲーム内・公式告知を確認' : 'Confirm in-game and in official notices';
}

export const weapons: Weapon[] = hi3Weapons.map((weapon) => ({
  id: weapon.id,
  gameId: 'hi3',
  name: { zh: weapon.name, en: weapon.nameEn, ja: weapon.nameJa },
  rarity: weapon.rank === '5-star' ? 5 : 4,
  weaponType: weapon.weaponTypeEn,
  description: { zh: weapon.description, en: weapon.descriptionEn, ja: weapon.descriptionJa },
  images: { icon: '/images/hi3/characters/official-v9-0.svg' },
  stats: { baseAtk: [] },
  ascensionMaterials: [],
}));

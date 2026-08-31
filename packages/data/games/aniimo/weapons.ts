import type { Weapon } from '@gachia/core';

export const aniimoWeapons: Weapon[] = [];
export const weapons: Weapon[] = aniimoWeapons;

export function getAniimoWeaponName(weapon: Weapon): string {
  return weapon.name.en;
}

export function getAniimoWeaponById(id: string): Weapon | undefined {
  return aniimoWeapons.find((weapon) => weapon.id === id);
}

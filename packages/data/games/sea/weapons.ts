import type { Weapon } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';

export const seaWeapons: never[] = [];

export function getSeaWeaponName(_w: never, _locale: SupportedLocale): string {
  return '';
}

export function getSeaWeaponById(_id: string): undefined {
  return undefined;
}

export function getSeaWeaponEffect(_w: never, _locale: SupportedLocale): { name: string; description: string } {
  return { name: '', description: '' };
}

export function getSeaWeaponSource(_w: never, _locale: SupportedLocale): string {
  return '';
}

export const weapons: Weapon[] = [];

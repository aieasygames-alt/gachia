import type { Weapon } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';

export const rocoCnWeapons: never[] = [];

export function getRocoCnWeaponName(_w: never, _locale: SupportedLocale): string {
  return '';
}

export function getRocoCnWeaponById(_id: string): undefined {
  return undefined;
}

export function getRocoCnWeaponEffect(_w: never, _locale: SupportedLocale): { name: string; description: string } {
  return { name: '', description: '' };
}

export function getRocoCnWeaponSource(_w: never, _locale: SupportedLocale): string {
  return '';
}

export const weapons: Weapon[] = [];

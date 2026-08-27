import type { Weapon } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';

export const rocoWeapons: never[] = [];

export function getRocoWeaponName(_w: never, _locale: SupportedLocale): string {
  return '';
}

export function getRocoWeaponById(_id: string): undefined {
  return undefined;
}

export function getRocoWeaponEffect(_w: never, _locale: SupportedLocale): { name: string; description: string } {
  return { name: '', description: '' };
}

export function getRocoWeaponSource(_w: never, _locale: SupportedLocale): string {
  return '';
}

export const weapons: Weapon[] = [];

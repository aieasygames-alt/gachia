import type { Weapon, SupportedLocale } from '@gachia/core';
import { localeStr } from './types';

// Legacy URL keys only, not confirmed international items. Originals: S2.10 decision archive.
export const rocoLegacyWeaponIds = [
  "huanxing-xingguang",
  "tonghuashu",
  "lianjinshu",
  "shenhai-kuizeng",
  "bilu-huoban",
  "jufeng-xingji",
  "xingluo-fanhua",
  "mimi-qianru",
  "chuxinzhe",
  "mengjing-liulangzhe"
] as const;

export function isRocoLegacyWeaponId(id: string): boolean {
  return rocoLegacyWeaponIds.some(value => value === id);
}

export interface RocoWeapon {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  weaponType: string;
  rarity: number;
  effectName: string;
  effectNameEn: string;
  effectDescription: string;
  effectDescriptionEn: string;
  source: string;
  sourceEn: string;
}

// Withdraw the unsupported CN-to-global transfer from every data consumer.
export const rocoWeapons: RocoWeapon[] = [];
export const weapons: Weapon[] = [];

export function getRocoWeaponName(weapon: RocoWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getRocoWeaponById(id: string): RocoWeapon | undefined {
  return rocoWeapons.find(weapon => weapon.id === id);
}

export function getRocoWeaponEffect(weapon: RocoWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getRocoWeaponSource(weapon: RocoWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.source, weapon.sourceEn, locale);
}

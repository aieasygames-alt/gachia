import type { SupportedLocale } from '@gachia/core';
import type { StarRailRelicSet } from './types';
import { localeStr } from './types';
import rawRelics from './raw-relics.json';

export const relicSets: StarRailRelicSet[] = rawRelics as unknown as StarRailRelicSet[];

export function getRelicSetName(set: StarRailRelicSet, locale: SupportedLocale): string {
  return localeStr(set.name, set.nameEn, locale);
}

export function getRelicSetDesc2pc(set: StarRailRelicSet, locale: SupportedLocale): string {
  return localeStr(set.bonus2pc, set.bonus2pcEn, locale);
}

export function getRelicSetDesc4pc(set: StarRailRelicSet, locale: SupportedLocale): string {
  if (!set.bonus4pc) return '';
  return localeStr(set.bonus4pc, set.bonus4pcEn || '', locale);
}

export function getRelicSetById(id: string): StarRailRelicSet | undefined {
  return relicSets.find((s) => s.id === id);
}

export function getCavernRelics(): StarRailRelicSet[] {
  return relicSets.filter((s) => s.type === 'cavern');
}

export function getPlanarOrnaments(): StarRailRelicSet[] {
  return relicSets.filter((s) => s.type === 'planar');
}

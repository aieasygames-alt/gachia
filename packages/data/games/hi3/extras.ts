import type { SupportedLocale } from '@gachia/core';
import type { Hi3AstralOp, Hi3StigmaSet } from './types';
import rawAstralOps from './raw-astral-ops.json';
import rawStigmaSets from './raw-stigma-sets.json';
import { localeStr } from './types';

export const hi3AstralOps: Hi3AstralOp[] = rawAstralOps as Hi3AstralOp[];
export const hi3StigmaSets: Hi3StigmaSet[] = rawStigmaSets as Hi3StigmaSet[];

export function getHi3AstralOpById(id: string): Hi3AstralOp | undefined {
  return hi3AstralOps.find((entry) => entry.id === id);
}

export function getHi3AstralOpName(entry: Hi3AstralOp, locale: SupportedLocale): string {
  return localeStr(entry.name, entry.nameEn, locale, entry.nameJa);
}

export function getHi3AstralOpDescription(entry: Hi3AstralOp, locale: SupportedLocale): string {
  return localeStr(entry.description, entry.descriptionEn, locale, entry.descriptionJa);
}

export function getHi3StigmaSetById(id: string): Hi3StigmaSet | undefined {
  return hi3StigmaSets.find((entry) => entry.id === id);
}

export function getHi3StigmaSetName(entry: Hi3StigmaSet, locale: SupportedLocale): string {
  return localeStr(entry.name, entry.nameEn, locale, entry.nameJa);
}

export function getHi3StigmaSetDescription(entry: Hi3StigmaSet, locale: SupportedLocale): string {
  return localeStr(entry.description, entry.descriptionEn, locale, entry.descriptionJa);
}

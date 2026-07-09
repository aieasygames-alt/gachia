import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import type { EndfieldGearSet } from './types';
import { localeStr } from './types';
const rawData = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/endfield/raw-gear-sets.json'), '/data/endfield/raw-gear-sets.json');

export const gearSets: EndfieldGearSet[] = rawData as unknown as EndfieldGearSet[];

export function getGearSetById(id: string): EndfieldGearSet | undefined {
  return gearSets.find((g) => g.id === id);
}

export function getGearSetName(set: EndfieldGearSet, locale: SupportedLocale): string {
  return localeStr(set.name, set.nameEn, locale);
}

export function getGearSetEffect(set: EndfieldGearSet, locale: SupportedLocale): string {
  return localeStr(set.effect, set.effectEn, locale);
}

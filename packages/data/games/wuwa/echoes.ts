import type { SupportedLocale } from '@gachia/core';
import type { WuWaEchoSet } from './types';
import echoData from './raw-echoes.json';

export const echoSets: WuWaEchoSet[] = echoData as WuWaEchoSet[];

export function getEchoSetName(set: WuWaEchoSet, locale: SupportedLocale): string {
  return locale === 'zh' ? set.name : set.nameEn;
}

export function getEchoSetDesc2pc(set: WuWaEchoSet, locale: SupportedLocale): string {
  return locale === 'zh' ? set.bonus2pc : set.bonus2pcEn;
}

export function getEchoSetDesc5pc(set: WuWaEchoSet, locale: SupportedLocale): string {
  if (!set.bonus5pc) return '';
  return locale === 'zh' ? set.bonus5pc : (set.bonus5pcEn ?? '');
}

export function getEchoSetById(id: string): WuWaEchoSet | undefined {
  return echoSets.find((s) => s.id === id);
}

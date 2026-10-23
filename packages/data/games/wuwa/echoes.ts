import type { SupportedLocale } from '@gachia/core';
import type { WuWaEchoSet } from './types';
import echoData from './raw-echoes.json';

export const echoSets: WuWaEchoSet[] = echoData as WuWaEchoSet[];

export function getEchoSetName(set: WuWaEchoSet, locale: SupportedLocale): string {
  return locale === 'zh' ? set.name : locale === 'ja' ? (set.nameJa ?? set.nameEn) : set.nameEn;
}

export function getEchoSetDesc2pc(set: WuWaEchoSet, locale: SupportedLocale): string {
  const value = locale === 'zh' ? set.bonus2pc : locale === 'ja' ? (set.bonus2pcJa ?? set.bonus2pcEn) : set.bonus2pcEn;
  return value || {
    zh: '二件套效果尚未核实，暂不列出数值。',
    en: 'The 2-piece effect is not verified; no values are listed.',
    ja: '2セット効果は未確認のため、数値は掲載していません。',
  }[locale];
}

export function getEchoSetDesc5pc(set: WuWaEchoSet, locale: SupportedLocale): string {
  if (!set.bonus5pc) return '';
  return locale === 'zh' ? set.bonus5pc : locale === 'ja' ? (set.bonus5pcJa ?? set.bonus5pcEn ?? '') : (set.bonus5pcEn ?? '');
}

export function getEchoSetById(id: string): WuWaEchoSet | undefined {
  return echoSets.find((s) => s.id === id);
}

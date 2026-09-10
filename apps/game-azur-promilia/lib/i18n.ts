import type { SupportedLocale } from '@gachia/core';

export const LOCALES: SupportedLocale[] = ['zh', 'en', 'ja'];

export function asLocale(value: string): SupportedLocale {
  return LOCALES.includes(value as SupportedLocale) ? value as SupportedLocale : 'zh';
}

export function localize(locale: SupportedLocale, values: Record<SupportedLocale, string>) {
  return values[locale];
}


import type { SupportedLocale } from '@gachia/core';

export const LOCALES: SupportedLocale[] = ['zh', 'en', 'ja'];

export function text(locale: SupportedLocale, values: Record<SupportedLocale, string>) {
  return values[locale];
}

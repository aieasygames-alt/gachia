import type { SupportedLocale } from '@gachia/core';

const RETIRED_PATHS = new Set([
  '/en/roco-cn/guides/daily-events-merchant-guide',
]);

export function isRetiredPage(path: string): boolean {
  return RETIRED_PATHS.has(path.replace(/\/$/, ''));
}

export function isGuideReadable(game: string, id: string, locale: SupportedLocale): boolean {
  return !isRetiredPage(`/${locale}/${game}/guides/${id}`);
}

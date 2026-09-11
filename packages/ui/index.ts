import { GAMES, GAME_IDS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';

export type HeaderRoute = {
  id: string;
  label: Record<SupportedLocale, string>;
};

export const headerGameIds = GAME_IDS;
export const headerFeaturedGameIds = ['genshin', 'wuwa', 'zzz', 'roco', 'skjh'] as const;
export const headerMoreGameIds = GAME_IDS.filter((id) => !headerFeaturedGameIds.includes(id as typeof headerFeaturedGameIds[number]));

export const headerLanguageLabels: Record<SupportedLocale, string> = {
  zh: '中文',
  en: 'EN',
  ja: 'JA',
};

export function headerGameName(gameId: GameId, locale: SupportedLocale) {
  return GAMES[gameId].name[locale];
}

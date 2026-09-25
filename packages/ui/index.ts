import { GAMES, GAME_IDS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';

export type HeaderRoute = {
  id: string;
  label: Record<SupportedLocale, string>;
};

export const headerGameIds = GAME_IDS;
export const headerFeaturedGameIds = ['lvmeng', 'genshin', 'wuwa', 'zzz', 'roco'] as const;
export const headerMoreGameIds = GAME_IDS.filter((id) => !headerFeaturedGameIds.includes(id as typeof headerFeaturedGameIds[number]));

export const headerLanguageLabels: Record<SupportedLocale, string> = {
  zh: '中文',
  en: 'EN',
  ja: 'JA',
};

export function headerGameName(gameId: GameId, locale: SupportedLocale) {
  return GAMES[gameId].name[locale];
}

export type SharedHeaderGameItem = {
  id: GameId;
  label: string;
};

export type SharedHeaderModel = {
  featuredGames: SharedHeaderGameItem[];
  moreGames: SharedHeaderGameItem[];
  moreGamesLabel: string;
  languages: Array<{ locale: SupportedLocale; label: string }>;
};

export function createSharedHeaderModel(locale: SupportedLocale): SharedHeaderModel {
  const toItem = (id: GameId): SharedHeaderGameItem => ({ id, label: headerGameName(id, locale) });
  const localizedGameIds = locale === 'zh' ? headerGameIds : headerGameIds.filter((id) => id !== 'lvmeng');

  return {
    featuredGames: headerFeaturedGameIds.filter((id) => localizedGameIds.includes(id)).map(toItem),
    moreGames: headerMoreGameIds.filter((id) => localizedGameIds.includes(id)).map(toItem),
    moreGamesLabel: locale === 'zh' ? '更多游戏' : locale === 'ja' ? 'その他のゲーム' : 'More games',
    languages: (['zh', 'en', 'ja'] as const).map((target) => ({ locale: target, label: headerLanguageLabels[target] })),
  };
}

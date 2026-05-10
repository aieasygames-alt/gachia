import type { Metadata } from 'next';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';
import { BuildClient } from './build-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}): Promise<Metadata> {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];
  const gameName = locale === 'zh' ? gameConfig.name.zh : locale === 'ja' ? (gameConfig.name.ja ?? gameConfig.name.en) : gameConfig.name.en;
  const title = locale === 'zh' ? `${gameName} 配装推荐 - Gachia` : locale === 'ja' ? `${gameName} ビルド - Gachia` : `${gameName} Build - Gachia`;
  return {
    title,
    description: locale === 'zh' ? `${gameName} 角色配装推荐、最佳武器、圣遗物搭配` : `${gameName} character build recommendations, best weapons, artifact sets`,
    robots: 'index, follow',
  };
}

export default async function BuildPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  return <BuildClient gameId={gameId} locale={locale} />;
}

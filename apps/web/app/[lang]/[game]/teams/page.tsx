import type { Metadata } from 'next';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';
import { TeamsClient } from './teams-client';

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
  const title = locale === 'zh' ? `${gameName} 配队模拟器 - Gachia` : locale === 'ja' ? `${gameName} パーティ編成 - Gachia` : `${gameName} Team Builder - Gachia`;
  return {
    title,
    description: locale === 'zh' ? `${gameName} 角色配队模拟器，查看元素共鸣效果，推荐最佳阵容` : `${gameName} team builder - element resonance, recommended compositions`,
    robots: 'index, follow',
  };
}

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  return <TeamsClient gameId={gameId} locale={locale} />;
}

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';

const TeamsClient = dynamic(() => import('./teams-client').then((m) => m.TeamsClient));

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
  const title = locale === 'zh' ? `${gameName} 配队模拟器` : locale === 'ja' ? `${gameName} パーティ編成` : `${gameName} Team Builder`;
  if (gameId === 'ananta') {
    return { title, robots: { index: false, follow: false } };
  }
  return {
    title,
    description: locale === 'zh' ? `${gameName} 角色配队模拟器，查看元素共鸣效果，推荐最佳阵容` : locale === 'ja' ? `${gameName} パーティ編成シミュレーター、元素共鳴効果確認、おすすめ編成` : `${gameName} team builder - element resonance, recommended compositions`,
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/teams`,
      languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/teams`, en: `https://gachia.com/en/${gameId}/teams`, ja: `https://gachia.com/ja/${gameId}/teams`, 'x-default': `https://gachia.com/zh/${gameId}/teams` },
    },
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

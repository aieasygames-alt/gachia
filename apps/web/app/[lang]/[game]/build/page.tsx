import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';

const BuildClient = dynamic(() => import('./build-client').then((m) => m.BuildClient));

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
  const title = locale === 'zh' ? `${gameName} 配装推荐` : locale === 'ja' ? `${gameName} ビルド` : `${gameName} Build`;
  return {
    title,
    description: locale === 'zh' ? `${gameName} 角色配装推荐、最佳武器、圣遗物搭配` : locale === 'ja' ? `${gameName} キャラビルドおすすめ、最適武器、聖遺物・遺物・エコー組み合わせ` : `${gameName} character build recommendations, best weapons, artifact sets`,
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/build`,
      languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/build`, en: `https://gachia.com/en/${gameId}/build`, ja: `https://gachia.com/ja/${gameId}/build`, 'x-default': `https://gachia.com/zh/${gameId}/build` },
    },
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

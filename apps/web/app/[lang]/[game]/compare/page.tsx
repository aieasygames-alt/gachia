import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';

const CompareClient = dynamic(() => import('./compare-client').then((m) => m.CompareClient));

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
  const title = locale === 'zh' ? `${gameName} 角色对比 - Gachia` : locale === 'ja' ? `${gameName} キャラ比較 - Gachia` : `${gameName} Character Compare - Gachia`;
  return {
    title,
    description: locale === 'zh' ? `${gameName} 角色属性对比，技能比较，配装差异分析` : `${gameName} character comparison - stats, skills, builds side by side`,
    robots: 'index, follow',
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  return <CompareClient gameId={gameId} locale={locale} />;
}

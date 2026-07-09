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
  const title = locale === 'zh' ? `${gameName} 角色对比` : locale === 'ja' ? `${gameName} キャラ比較` : `${gameName} Character Compare`;
  if (gameId === 'ananta' || gameId === 'sea') {
    return { title, robots: { index: false, follow: false } };
  }
  return {
    title,
    description: locale === 'zh'
      ? `${gameName} 角色属性对比、技能比较、配装差异分析和培养优先级参考，帮助你在抽卡、练角和组队前快速筛选最合适的角色。`
      : locale === 'ja'
        ? `${gameName} キャラステータス比較、スキル対比、ビルド差分析、育成優先度の確認に使える比較ガイドです。`
        : `${gameName} character comparison with stat breakdowns, skill differences, build comparisons, and priority guidance so you can choose the right unit before pulling or investing.`,
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/compare`,
      languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/compare`, en: `https://gachia.com/en/${gameId}/compare`, ja: `https://gachia.com/ja/${gameId}/compare`, 'x-default': `https://gachia.com/zh/${gameId}/compare` },
    },
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

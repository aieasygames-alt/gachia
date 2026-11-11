import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';
import { ensureMetaLength } from '@/lib/seo-metadata';

const CompareClient = dynamic(() => import('./compare-client').then((m) => m.CompareClient));
const BASE_URL = 'https://gachia.com';

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
  const title = locale === 'zh'
    ? `${gameName}角色对比｜X vs Y 强度、定位与培养优先级`
    : locale === 'ja'
      ? `${gameName}キャラ比較｜X vs Y の性能、役割、育成優先度`
      : `${gameName} Character Compare | X vs Y, Roles, Builds & Priority`;
  if (gameId === 'ananta' || gameId === 'sea') {
    return { title, robots: { index: false, follow: false } };
  }
  const description = ensureMetaLength(
    locale === 'zh'
      ? `${gameName} 角色对比工具，适合做 X vs Y 强度比较、定位分析、配装差异判断和培养优先级筛选，帮助你在抽卡和组队前先选对角色。`
      : locale === 'ja'
        ? `${gameName} のキャラ比較ツールです。X vs Y の性能差、役割、ビルド差、育成優先度をまとめて確認できます。`
        : `${gameName} character comparison tool for X vs Y stat checks, role matching, build differences, and upgrade priority so you can choose the right unit before pulling or investing.`,
    locale,
  );

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}/${gameId}/compare`,
      languages: { 'zh-Hans': `${BASE_URL}/zh/${gameId}/compare`, en: `${BASE_URL}/en/${gameId}/compare`, ja: `${BASE_URL}/ja/${gameId}/compare`, 'x-default': `${BASE_URL}/zh/${gameId}/compare` },
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/compare`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
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

  if (gameId === 'genshin') notFound();

  return (
    <>
      {gameId === 'zzz' && (
        <header className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-game-text">
            {locale === 'zh' ? '绝区零代理人对比' : locale === 'ja' ? 'ゼンレスゾーンゼロ エージェント比較' : 'Zenless Zone Zero Agent Comparison'}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-game-text-muted">
            {locale === 'zh' ? '选择两位代理人，对照定位与已有资料，再结合队伍缺口和资源预算决定培养顺序；本工具不代表实时强度排名。' : locale === 'ja' ? '2人のエージェントを選び、役割と収録資料を比較。編成の不足と資源予算から育成順を判断してください。本ツールはリアルタイムの強さランキングではありません。' : 'Select two agents to compare roles and recorded information, then plan upgrades around roster gaps and resources. This tool is not a live power ranking.'}
          </p>
        </header>
      )}
      <CompareClient gameId={gameId} locale={locale} />
    </>
  );
}

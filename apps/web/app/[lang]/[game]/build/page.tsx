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
  if (gameId === 'ananta' || gameId === 'sea') {
    return { title, robots: { index: false, follow: false } };
  }
  const gearTerm = locale === 'zh'
    ? (gameId === 'zzz' ? '驱动盘' : gameId === 'wuwa' ? '声骸' : gameId === 'starrail' ? '遗器' : gameId === 'nte' ? '弧盘' : '圣遗物')
    : locale === 'ja'
      ? (gameId === 'zzz' ? 'ドライブディスク' : gameId === 'wuwa' ? 'エコー' : gameId === 'starrail' ? '遺物' : gameId === 'nte' ? 'ディスク' : '聖遺物')
      : (gameId === 'zzz' ? 'drive discs' : gameId === 'wuwa' ? 'echoes' : gameId === 'starrail' ? 'relics' : gameId === 'nte' ? 'disk sets' : 'artifact sets');
  const weaponTerm = locale === 'zh'
    ? (gameId === 'zzz' ? '音擎' : gameId === 'starrail' ? '光锥' : '武器')
    : locale === 'ja'
      ? (gameId === 'zzz' ? 'Wエンジン' : gameId === 'starrail' ? '光円錐' : '武器')
      : (gameId === 'zzz' ? 'W-Engines' : gameId === 'starrail' ? 'light cones' : 'weapons');
  return {
    title,
    description: locale === 'zh'
      ? `${gameName} 角色配装推荐、最佳${weaponTerm}、${gearTerm}搭配`
      : locale === 'ja'
        ? `${gameName} キャラビルドおすすめ、最適${weaponTerm}、${gearTerm}組み合わせ`
        : `${gameName} character build recommendations, best ${weaponTerm}, ${gearTerm}`,
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

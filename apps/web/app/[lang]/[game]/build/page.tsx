import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';
import { ensureMetaLength } from '@/lib/seo-metadata';

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
  const description = ensureMetaLength(
    locale === 'zh'
      ? `${gameName} 角色配装推荐、最佳${weaponTerm}、${gearTerm}搭配，整理毕业思路、词条优先级、常见阵容与版本答案，帮助你快速完成养成决策。`
      : locale === 'ja'
        ? `${gameName} キャラビルドおすすめ、最適${weaponTerm}、${gearTerm}組み合わせ、育成優先度、主要編成、完成形の考え方をまとめた実用ガイドです。`
        : `${gameName} character build recommendations, best ${weaponTerm}, ${gearTerm}, stat priorities, common team setups, and endgame build paths to help you make the right upgrade decisions.`,
    locale,
  );

  return {
    title,
    description,
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

  return (
    <>
      {gameId === 'zzz' && (
        <header className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-game-text">
            {locale === 'zh' ? '绝区零代理人配装推荐' : locale === 'ja' ? 'ゼンレスゾーンゼロ エージェントビルド' : 'Zenless Zone Zero Agent Builds'}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-game-text-muted">
            {locale === 'zh' ? '选择代理人，查看音擎、驱动盘与词条方向；结合已有装备和养成目标判断投入，具体效果以游戏内说明为准。' : locale === 'ja' ? 'エージェントを選び、Wエンジン、ドライブディスク、ステータス方針を確認。所持装備と育成目標に合わせて判断し、詳細効果はゲーム内で確認してください。' : 'Choose an agent to review W-Engines, Drive Discs, and stat priorities. Plan around your gear and upgrade goals, and confirm exact effects in-game.'}
          </p>
        </header>
      )}
      <BuildClient gameId={gameId} locale={locale} />
    </>
  );
}

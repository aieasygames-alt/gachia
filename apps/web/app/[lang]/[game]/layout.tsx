import { notFound } from 'next/navigation';
import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GameNav } from '@/components/layout/game-nav';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { GameDataSetter } from '@/components/layout/game-data-setter';

const BASE_URL = 'https://gachia.com';

const GAME_DESCRIPTIONS: Record<string, Record<string, string>> = {
  genshin: {
    zh: '原神角色图鉴、武器数据、圣遗物推荐、攻略百科 — Gachia',
    en: 'Genshin Impact character guide, weapon database, artifact builds, wiki — Gachia',
    ja: '原神キャラ図鑑、武器データ、聖遺物おすすめ、攻略百科 — Gachia',
  },
  starrail: {
    zh: '崩坏：星穹铁道角色图鉴、光锥数据、遗器推荐、攻略百科 — Gachia',
    en: 'Honkai: Star Rail character guide, light cone database, relic builds, wiki — Gachia',
    ja: '崩壊：スターレイルキャラ図鑑、光円錐データ、遺物おすすめ、攻略百科 — Gachia',
  },
  wuwa: {
    zh: '鸣潮角色图鉴、武器数据、声骸推荐、攻略百科 — Gachia',
    en: 'Wuthering Waves character guide, weapon database, echo builds, wiki — Gachia',
    ja: '鳴潮キャラ図鑑、武器データ、エコーおすすめ、攻略百科 — Gachia',
  },
  nte: {
    zh: '无限暖暖角色图鉴、弧盘数据、光盘推荐、攻略百科 — Gachia',
    en: 'Infinity Nikki character guide, arc database, disk set builds, wiki — Gachia',
    ja: '無限ニキキャラ図鑑、アルクデータ、ディスクおすすめ、攻略百科 — Gachia',
  },
  zzz: {
    zh: '绝区零代理人图鉴、音擎数据、驱动盘推荐、攻略百科 — Gachia',
    en: 'Zenless Zone Zero agent guide, W-Engine database, drive disc builds, wiki — Gachia',
    ja: 'ゼンレスゾーンゼロエージェント図鑑、Wエンジンデータ、ドライブディスクおすすめ、攻略百科 — Gachia',
  },
};

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    Object.keys(GAMES).map((game) => ({
      lang,
      game,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return {};

  const gameName = gameConfig.name[locale];
  const description = GAME_DESCRIPTIONS[gameId]?.[locale] ?? `${gameName} Wiki — Gachia`;

  // Build hreflang alternates
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}`;

  return {
    title: `${gameName} Wiki`,
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}/${gameId}`,
      languages,
    },
  };
}

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;

  if (!GAMES[gameId]) {
    notFound();
  }

  return (
    <>
      <GameDataSetter gameId={gameId} />
      <GameNav gameId={gameId} locale={lang as SupportedLocale} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs lang={lang} game={gameId} />
        {children}
      </div>
    </>
  );
}

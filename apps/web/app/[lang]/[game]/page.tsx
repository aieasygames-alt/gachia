import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

const GAME_DESCRIPTIONS: Record<string, Record<string, string>> = {
  genshin: {
    zh: '原神角色图鉴、武器数据库、圣遗物推荐、攻略百科。查看角色 builds、配队推荐、材料路线图。',
    en: 'Genshin Impact character builds, weapon database, artifact recommendations, and guides. Find team comps, material farming routes, and tier lists.',
    ja: '原神キャラビルド、武器データベース、聖遺物おすすめ、攻略百科。チーム編成、素材周回ルート、Tierリスト。',
  },
  starrail: {
    zh: '崩坏：星穹铁道角色图鉴、光锥数据库、遗器推荐、攻略百科。',
    en: 'Honkai: Star Rail character builds, light cone database, relic recommendations, and guides.',
    ja: '崩壊：スターレイルキャラビルド、光円錐データベース、遺物おすすめ、攻略百科。',
  },
  wuwa: {
    zh: '鸣潮角色图鉴、武器数据、声骸推荐、攻略百科。',
    en: 'Wuthering Waves character builds, weapon database, echo recommendations, and guides.',
    ja: '鳴潮キャラビルド、武器データベース、エコーおすすめ、攻略百科。',
  },
  nte: {
    zh: '异环角色图鉴、武器数据、光盘推荐、攻略百科。',
    en: 'Neverness to Everness character builds, weapon database, disk set guides, and more.',
    ja: '異環キャラビルド、武器データベース、ディスクおすすめ、攻略百科。',
  },
  zzz: {
    zh: '绝区零代理人图鉴、音擎数据、驱动盘推荐、攻略百科。',
    en: 'Zenless Zone Zero agent builds, W-Engine database, drive disc recommendations, and guides.',
    ja: 'ゼンレスゾーンゼロエージェントビルド、Wエンジンデータ、ドライブディスクおすすめ、攻略百科。',
  },
  guihuan: {
    zh: '归环角色图鉴、武器数据、攻略百科。',
    en: 'Guihuan character builds, weapon database, and guides.',
    ja: '帰環キャラビルド、武器データ、攻略百科。',
  },
  ananta: {
    zh: '无限大角色图鉴、武器数据、攻略百科。',
    en: 'Ananta character builds, weapon database, and guides.',
    ja: '無限大キャラビルド、武器データ、攻略百科。',
  },
};

// Route icons for visual appeal
const ROUTE_ICONS: Record<string, string> = {
  characters: '👤',
  weapons: '⚔️',
  items: '📦',
  'tier-list': '🏆',
  calculator: '🔢',
  map: '🗺️',
  guides: '📖',
  artifacts: '🏺',
  build: '🔧',
  compare: '⚖️',
  teams: '👥',
  echoes: '🔮',
  'drive-discs': '💿',
  'disk-sets': '💿',
  gacha: '🎰',
  'redeem-codes': '🎁',
  anomalies: '🌀',
};

export default async function GameHome({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  const enabledRoutes = Object.entries(gameConfig.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => route);

  const description = GAME_DESCRIPTIONS[gameId]?.[locale] ?? '';

  return (
    <div>
      {/* Game Header */}
      <div className="mb-8">
        <h1
          className="mb-2 text-3xl font-bold"
          style={{ color: gameConfig.theme.primary }}
        >
          {gameConfig.name[locale]}
        </h1>
        {description && (
          <p className="text-sm leading-relaxed text-game-text-muted max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {/* Quick Navigation Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enabledRoutes.map((route) => (
          <Link
            key={route}
            href={`/${gameId}/${route}` as '/'}
            className="group flex items-center gap-3 rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary/50 hover:shadow-lg"
          >
            <span className="text-2xl flex-shrink-0">
              {ROUTE_ICONS[route] ?? '📋'}
            </span>
            <div>
              <h2 className="font-semibold text-game-text group-hover:text-game-primary transition-colors">
                {CATEGORY_LABELS[route]?.[locale] ?? route}
              </h2>
            </div>
          </Link>
        ))}
      </div>

      {/* SEO: Internal Links */}
      <div className="mt-12 rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '快速导航' : locale === 'ja' ? 'クイックナビ' : 'Quick Navigation'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {enabledRoutes.map((route) => (
            <Link
              key={`link-${route}`}
              href={`/${gameId}/${route}` as '/'}
              className="rounded-full bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:text-game-primary hover:bg-game-primary/10"
            >
              {ROUTE_ICONS[route] ?? ''}{' '}
              {CATEGORY_LABELS[route]?.[locale] ?? route}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
import { GAMES, GAME_IDS, CATEGORY_LABELS } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildHomepageJsonLd } from '@/lib/jsonld';

const DESCRIPTIONS: Record<string, string> = {
  zh: '一站式二次元开放世界游戏数据库，覆盖原神、崩铁、鸣潮、异环、绝区零、归环等游戏的角色图鉴、武器数据、攻略百科。',
  en: 'Multi-game open world wiki covering Genshin Impact, Honkai: Star Rail, Wuthering Waves, Neverness to Everness, Zenless Zone Zero, and Guihuan.',
  ja: '原神・スターレイル・鳴潮・NTE・ゼンレスゾーンゼロ・帰環など、マルチゲームのオープンワールドWikiデータベース。',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  const description = DESCRIPTIONS[locale] ?? DESCRIPTIONS.zh;

  return {
    description,
    alternates: {
      canonical: `https://gachia.com/${locale}`,
      languages: {
        'zh-Hans': 'https://gachia.com/zh',
        en: 'https://gachia.com/en',
        ja: 'https://gachia.com/ja',
        'x-default': 'https://gachia.com/zh',
      },
    },
  };
}

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-game-primary md:text-5xl">
          Gachia
        </h1>
        <p className="text-lg text-game-text-muted">
          一站式二次元开放世界游戏数据库
        </p>
      </section>

      {/* Game Cards */}
      <section className="grid gap-6 md:grid-cols-3">
        {GAME_IDS.map((gameId) => {
          const game = GAMES[gameId];
          return (
            <Link
              key={gameId}
              href={`/${gameId}` as '/'}
              className="group rounded-lg border border-game-border bg-game-surface p-6 transition-colors hover:border-game-primary"
              style={{ borderColor: game.theme.primary + '40' }}
            >
              <h2
                className="mb-2 text-2xl font-bold"
                style={{ color: game.theme.primary }}
              >
                {game.name[locale]}
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(game.routes)
                  .filter(([, enabled]) => enabled)
                  .map(([route]) => (
                    <span
                      key={route}
                      className="rounded-full bg-game-surface-alt px-3 py-1 text-xs text-game-text-muted"
                    >
                      {CATEGORY_LABELS[route]?.[locale] ?? route}
                    </span>
                  ))}
              </div>
            </Link>
          );
        })}
      </section>

      {buildHomepageJsonLd(locale).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

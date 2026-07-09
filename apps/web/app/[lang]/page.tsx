import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
import { GAMES, GAME_IDS, CATEGORY_LABELS } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildHomepageJsonLd } from '@/lib/jsonld';
import { IMAGE_BASE } from '@gachia/data/image-base';
import { genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage } from '@gachia/data/games/genshin/characters';
import { starrailCharacters, getStarRailCharacterName, getStarRailCharacterImage } from '@gachia/data/games/starrail/characters';
import { wuwaCharacters, getWuWaCharacterName, getWuWaCharacterImage } from '@gachia/data/games/wuwa/characters';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data/games/nte/characters';
import { zzzCharacters, getZzzCharacterName, getZzzCharacterImage } from '@gachia/data/games/zzz/characters';
import { guihuanCharacters, getGuihuanCharacterName, getGuihuanCharacterImage } from '@gachia/data/games/guihuan/characters';
import { anantaCharacters, getAnantaCharacterName, getAnantaCharacterImage } from '@gachia/data/games/ananta/characters';
import { endfieldCharacters, getEndfieldCharacterName, getEndfieldCharacterImage } from '@gachia/data/games/endfield/characters';
import { seaCharacters, getSeaCharacterName, getSeaCharacterImage } from '@gachia/data/games/sea/characters';
import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';
import Image from 'next/image';

const MESSAGES: Record<string, Record<string, string>> = {
  zh: zhMessages.homepage!,
  en: enMessages.homepage!,
  ja: jaMessages.homepage!,
};

// --- Featured character IDs per game (popular/high-visibility picks) ---
const FEATURED: Record<string, string[]> = {
  genshin: ['hu-tao', 'raiden-shogun', 'furina', 'nahida', 'kazuha'],
  starrail: ['kafka', 'jingliu', 'acheron', 'firefly', 'robin'],
  wuwa: ['jiyan', 'yinlin', 'jiinshi', 'camellya', 'rover-aero'],
  nte: ['chiz', 'aurelia', 'skia', 'haniel', 'sakiri'],
  zzz: ['ellen-joe', 'zhu-yuan', 'miyabi', 'burnice-white', 'caesar-king'],
  guihuan: [], // too few characters, skip
  ananta: [], // too few characters, skip
  endfield: ['laevatain', 'ardelia', 'tangtang', 'endministrator', 'lifeng'],
  sea: ['traveler', 'ais', 'little-axe', 'molly'],
  skjh: [],
};

// --- Image URL helpers per game ---
type CharAccessor = {
  getName: (locale: SupportedLocale) => string;
  getImage: () => string;
  id: string;
};

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE}${path}`;
}

function getFeaturedChars(gameId: string, locale: SupportedLocale): CharAccessor[] {
  const ids = FEATURED[gameId] ?? [];
  if (ids.length === 0) return [];

  const chars: CharAccessor[] = [];

  switch (gameId) {
    case 'genshin':
      for (const id of ids) {
        const c = genshinCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getGenshinCharacterName(c, l), getImage: () => toAbsoluteUrl(getGenshinCharacterImage(c)) });
      }
      break;
    case 'starrail':
      for (const id of ids) {
        const c = starrailCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getStarRailCharacterName(c, l), getImage: () => toAbsoluteUrl(getStarRailCharacterImage(c)) });
      }
      break;
    case 'wuwa':
      for (const id of ids) {
        const c = wuwaCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getWuWaCharacterName(c, l), getImage: () => toAbsoluteUrl(getWuWaCharacterImage(c)) });
      }
      break;
    case 'nte':
      for (const id of ids) {
        const c = nteCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getNteCharacterName(c, l), getImage: () => toAbsoluteUrl(getNteCharacterImage(c)) });
      }
      break;
    case 'zzz':
      for (const id of ids) {
        const c = zzzCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getZzzCharacterName(c, l), getImage: () => toAbsoluteUrl(getZzzCharacterImage(c)) });
      }
      break;
    case 'guihuan':
      for (const id of ids) {
        const c = guihuanCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getGuihuanCharacterName(c, l), getImage: () => toAbsoluteUrl(getGuihuanCharacterImage(c)) });
      }
      break;
    case 'ananta':
      for (const id of ids) {
        const c = anantaCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getAnantaCharacterName(c, l), getImage: () => toAbsoluteUrl(getAnantaCharacterImage(c)) });
      }
      break;
    case 'endfield':
      for (const id of ids) {
        const c = endfieldCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getEndfieldCharacterName(c, l), getImage: () => toAbsoluteUrl(getEndfieldCharacterImage(c)) });
      }
      break;
    case 'sea':
      for (const id of ids) {
        const c = seaCharacters.find((ch) => ch.id === id);
        if (c) chars.push({ id: c.id, getName: (l) => getSeaCharacterName(c, l), getImage: () => toAbsoluteUrl(getSeaCharacterImage(c)) });
      }
      break;
  }

  return chars;
}

const DESCRIPTIONS: Record<string, string> = {
  zh: '一站式二次元开放世界游戏数据库，覆盖原神、崩坏：星穹铁道、鸣潮、异环、绝区零、归环、无限大、明日方舟：终末地、遗忘之海和失控进化，提供角色图鉴、武器数据、配装推荐、版本攻略与热点入口。',
  en: 'The anime open-world game database for Genshin Impact, Honkai: Star Rail, Wuthering Waves, NTE, ZZZ, Guihuan, Ananta, Endfield, Sea of Remnants, and Ashfall Evolution, with character guides, weapon data, build recommendations, tier lists, and version hubs.',
  ja: '原神、崩壊：スターレイル、鳴潮、NTE、ゼンレスゾーンゼロ、帰環、無限大、アークナイツ：エンドフィールド、海の遺跡、失控進化までまとめた、キャラ・武器・素材・ビルド・攻略導線を備えるゲームDBです。',
};

const TITLES: Record<string, string> = {
  zh: 'Gachia — 一站式二次元开放世界游戏数据库',
  en: 'Gachia — Your Ultimate Anime Open-World Game Database',
  ja: 'Gachia — アニメ系オープンワールドゲームDB',
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  const description = DESCRIPTIONS[locale] ?? DESCRIPTIONS.zh;
  const title = TITLES[locale] ?? TITLES.zh;

  return {
    title,
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
  const t = MESSAGES[locale] ?? MESSAGES['zh']!;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-game-primary md:text-5xl">
          Gachia
        </h1>
        <p className="mb-2 text-xl font-semibold text-game-text md:text-2xl">
          {t.heroTitle}
        </p>
        <p className="mx-auto max-w-3xl text-base text-game-text-muted md:text-lg">
          {t.heroSubtitle}
        </p>
      </section>

      {/* Stats Section */}
      <section className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: t.statsCharacters, icon: '👤' },
          { value: t.statsWeapons, icon: '⚔️' },
          { value: t.statsGuides, icon: '📖' },
          { value: t.statsGames, icon: '🎮' },
        ].map((stat) => (
          <div
            key={stat.value}
            className="rounded-lg border border-game-border bg-game-surface p-4 text-center"
          >
            <div className="mb-1 text-2xl">{stat.icon}</div>
            <div className="text-lg font-bold text-game-text">{stat.value}</div>
          </div>
        ))}
      </section>

      {/* Game Cards */}
      <section className="mb-12 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {GAME_IDS.map((gameId) => {
          const game = GAMES[gameId];
          return (
            <Link
              key={gameId}
              href={`/${gameId}` as '/'}
              className="group overflow-hidden rounded-lg border bg-game-surface transition-colors hover:border-game-primary"
              style={{ borderColor: game.theme.primary + '40' }}
            >
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={`/images/og/${gameId}.jpg`}
                  alt={`${game.name[locale]} - ${locale === 'zh' ? '游戏攻略Wiki' : locale === 'ja' ? 'ゲーム攻略Wiki' : 'Game Wiki'}`}
                  width={400}
                  height={210}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h2
                  className="mb-3 text-xl font-bold"
                  style={{ color: game.theme.primary }}
                >
                  {game.name[locale]}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(game.routes)
                    .filter(([, enabled]) => enabled)
                    .map(([route]) => (
                      <span
                        key={route}
                        className="rounded-full bg-game-surface-alt px-2.5 py-0.5 text-xs text-game-text-muted"
                      >
                        {CATEGORY_LABELS[route]?.[locale] ?? route}
                      </span>
                    ))}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Featured Characters per Game */}
      {GAME_IDS.filter((id) => (FEATURED[id]?.length ?? 0) > 0).map((gameId) => {
        const game = GAMES[gameId];
        const chars = getFeaturedChars(gameId, locale);
        if (chars.length === 0) return null;

        return (
          <section key={gameId} className="mb-10">
            <h2
              className="mb-4 text-xl font-bold"
              style={{ color: game.theme.primary }}
            >
              {game.name[locale]} — {t.featuredTitle}
            </h2>
            <div className="flex flex-wrap gap-4">
              {chars.map((char) => (
                <Link
                  key={char.id}
                  href={`/${gameId}/characters/${char.id}` as '/'}
                  className="group flex items-center gap-3 rounded-lg border border-game-border bg-game-surface px-4 py-3 transition-colors hover:border-game-primary"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image
                      src={char.getImage()}
                      alt={char.getName(locale)}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="font-medium text-game-text group-hover:text-game-primary">
                    {char.getName(locale)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* SEO About Section */}
      <section className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-xl font-bold text-game-text">
          {t.aboutTitle}
        </h2>
        <p className="leading-relaxed text-game-text-muted">
          {t.aboutDescription}
        </p>
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

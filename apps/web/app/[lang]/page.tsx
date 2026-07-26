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
import { Calculator, CalendarDays, Gift, Radio, Sparkles, TrendingUp } from 'lucide-react';
import {
  HOMEPAGE_PRIORITY_GAMES,
  LIVE_BANNERS,
  LIVE_CODE_SUMMARIES,
  LIVE_GUIDES,
  LIVE_UPDATED_AT,
  LIVE_VERSION_UPDATES,
  localizeText,
  sortByPriority,
} from '@/lib/live-content';

const MESSAGES: Record<string, Record<string, string>> = {
  zh: zhMessages.homepage!,
  en: enMessages.homepage!,
  ja: jaMessages.homepage!,
};

// --- Featured character IDs per game (popular/high-visibility picks) ---
const FEATURED: Record<string, string[]> = {
  genshin: ['hu-tao', 'raiden-shogun', 'furina', 'nahida', 'kazuha'],
  starrail: ['kafka', 'jingliu', 'acheron', 'firefly', 'robin'],
  wuwa: ['jiyan', 'yinlin', 'jinhsi', 'changli', 'zhezhi'],
  nte: ['chiz', 'aurelia', 'skia', 'haniel', 'sakiri'],
  zzz: ['ellen', 'zhu-yuan', 'miyabi', 'burnice', 'caesar'],
  guihuan: [], // too few characters, skip
  ananta: [], // too few characters, skip
  endfield: ['laevatain', 'ardelia', 'tangtang', 'endministrator', 'lifeng'],
  sea: ['traveler', 'ais', 'little-axe'],
  skjh: [],
};

const HOME_COPY = {
  liveEyebrow: {
    zh: '今日情报中枢',
    en: 'Live Intel Hub',
    ja: '今日の注目情報',
  },
  liveTitle: {
    zh: '先看卡池、兑换码和版本重点',
    en: 'Banners, codes, and version priorities first',
    ja: 'バナー、コード、版本要点を先に確認',
  },
  liveSubtitle: {
    zh: 'Gachia 正在从多游戏 Wiki 升级为实时攻略入口，优先把高曝光搜索页和实用工具放到首页。',
    en: 'Gachia is turning the game wiki into a live planning desk for high-intent guides and tools.',
    ja: 'Gachia は多ゲーム Wiki から、実用的な攻略とツールの入口へ進化しています。',
  },
  updated: {
    zh: '更新',
    en: 'Updated',
    ja: '更新',
  },
  currentBanners: {
    zh: '当前卡池',
    en: 'Current Banners',
    ja: '現在のバナー',
  },
  versionWatch: {
    zh: '版本重点',
    en: 'Version Watch',
    ja: '版本情報',
  },
  redeemCodes: {
    zh: '兑换码',
    en: 'Redeem Codes',
    ja: '交換コード',
  },
  popularGuides: {
    zh: '热门攻略',
    en: 'Popular Guides',
    ja: '人気攻略',
  },
  open: {
    zh: '查看',
    en: 'Open',
    ja: '開く',
  },
  priorityGames: {
    zh: '优先更新游戏',
    en: 'Priority Games',
    ja: '優先更新ゲーム',
  },
  exploreGame: {
    zh: '进入游戏',
    en: 'Explore',
    ja: '見る',
  },
  pullPlanner: {
    zh: '打开抽卡规划器',
    en: 'Open Pull Planner',
    ja: 'ガチャ計画ツール',
  },
  pullPlannerHint: {
    zh: '估算保底缺口、剩余天数和风险',
    en: 'Estimate pity gaps, days left, and risk',
    ja: '天井不足、残り日数、リスクを見積もる',
  },
  calendar: {
    zh: '查看跨游戏日历',
    en: 'Open Calendar',
    ja: 'カレンダーを見る',
  },
  calendarHint: {
    zh: '版本、卡池、兑换码期限集中查看',
    en: 'Versions, banners, and code deadlines',
    ja: '版本、バナー、コード期限を確認',
  },
  aboutTitle: {
    zh: '多游戏数据库，正在变成实时规划工具',
    en: 'A multi-game database becoming a live planning tool',
    ja: '多ゲームDBからリアルタイム計画ツールへ',
  },
} satisfies Record<string, Record<SupportedLocale, string>>;

const STATUS_LABELS = {
  live: { zh: '进行中', en: 'Live', ja: '進行中' },
  upcoming: { zh: '即将上线', en: 'Upcoming', ja: '近日公開' },
  fresh: { zh: '已更新', en: 'Fresh', ja: '更新済み' },
  watch: { zh: '关注中', en: 'Watch', ja: '注目' },
} satisfies Record<string, Record<SupportedLocale, string>>;

const GAME_CTA_PRIORITY = [
  'version',
  'redeem-codes',
  'guides',
  'characters',
  'weapons',
] as const;

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

function formatDate(date: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

function getGameCtas(gameId: keyof typeof GAMES, locale: SupportedLocale) {
  const routes = GAMES[gameId].routes;
  return GAME_CTA_PRIORITY
    .filter((route) => routes[route])
    .map((route) => ({
      href: `/${gameId}/${route}`,
      label: CATEGORY_LABELS[route]?.[locale] ?? route,
    }))
    .slice(0, 4);
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
  const liveBanners = sortByPriority(LIVE_BANNERS).slice(0, 3);
  const liveVersions = sortByPriority(LIVE_VERSION_UPDATES).slice(0, 3);
  const liveCodes = sortByPriority(LIVE_CODE_SUMMARIES).slice(0, 3);
  const liveGuides = sortByPriority(LIVE_GUIDES).slice(0, 3);
  const priorityGames = HOMEPAGE_PRIORITY_GAMES.filter((gameId) => GAMES[gameId]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Live Hub */}
      <section className="mb-10 overflow-hidden rounded-lg border border-game-border bg-game-surface">
        <div className="grid gap-0 lg:grid-cols-[1.08fr_1fr]">
          <div className="border-b border-game-border p-6 md:p-8 lg:border-b-0 lg:border-r">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-game-primary/40 bg-game-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-game-primary">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              {HOME_COPY.liveEyebrow[locale]}
            </div>
            <h1 className="mb-4 max-w-3xl text-3xl font-bold leading-tight text-game-text md:text-5xl">
              Gachia
            </h1>
            <p className="mb-3 max-w-3xl text-xl font-semibold text-game-text md:text-2xl">
              {HOME_COPY.liveTitle[locale]}
            </p>
            <p className="max-w-3xl text-base leading-relaxed text-game-text-muted md:text-lg">
              {HOME_COPY.liveSubtitle[locale]}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {priorityGames.map((gameId) => {
                const game = GAMES[gameId];
                return (
                  <Link
                    key={gameId}
                    href={`/${gameId}` as '/'}
                    className="rounded-full border px-3 py-1.5 text-sm font-medium text-game-text transition-colors hover:bg-game-surface-alt"
                    style={{ borderColor: game.theme.primary + '66' }}
                  >
                    {game.name[locale]}
                  </Link>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/tools/pull-planner"
                className="inline-flex items-center gap-3 rounded-lg border border-game-primary/40 bg-game-primary/10 px-4 py-3 text-sm font-semibold text-game-primary transition-colors hover:bg-game-primary/15"
              >
                <Calculator className="h-4 w-4" aria-hidden="true" />
                <span>{HOME_COPY.pullPlanner[locale]}</span>
                <span className="hidden text-xs font-normal text-game-text-muted sm:inline">
                  {HOME_COPY.pullPlannerHint[locale]}
                </span>
              </Link>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-3 rounded-lg border border-game-border px-4 py-3 text-sm font-semibold text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                <span>{HOME_COPY.calendar[locale]}</span>
                <span className="hidden text-xs font-normal text-game-text-muted sm:inline">
                  {HOME_COPY.calendarHint[locale]}
                </span>
              </Link>
            </div>
          </div>

          <div className="grid gap-px bg-game-border md:grid-cols-2">
            <LivePanel
              title={HOME_COPY.currentBanners[locale]}
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              items={liveBanners}
              locale={locale}
            />
            <LivePanel
              title={HOME_COPY.versionWatch[locale]}
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              items={liveVersions}
              locale={locale}
            />
            <LivePanel
              title={HOME_COPY.redeemCodes[locale]}
              icon={<Gift className="h-4 w-4" aria-hidden="true" />}
              items={liveCodes}
              locale={locale}
            />
            <LivePanel
              title={HOME_COPY.popularGuides[locale]}
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              items={liveGuides}
              locale={locale}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: t.statsCharacters },
          { value: t.statsWeapons },
          { value: t.statsGuides },
          { value: `${GAME_IDS.length} ${t.statsGamesLabel ?? 'Games'}` },
        ].map((stat) => (
          <div
            key={stat.value}
            className="rounded-lg border border-game-border bg-game-surface p-4 text-center"
          >
            <div className="text-lg font-bold text-game-text">{stat.value}</div>
          </div>
        ))}
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-game-text">
          {HOME_COPY.priorityGames[locale]}
        </h2>
        <span className="text-sm text-game-text-muted">
          {HOME_COPY.updated[locale]} {formatDate(LIVE_UPDATED_AT, locale)}
        </span>
      </div>

      {/* Game Cards */}
      <section className="mb-12 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {[...priorityGames, ...GAME_IDS.filter((gameId) => !priorityGames.includes(gameId))].map((gameId) => {
          const game = GAMES[gameId];
          const ctas = getGameCtas(gameId, locale);
          return (
            <article
              key={gameId}
              className="group overflow-hidden rounded-lg border bg-game-surface transition-colors hover:border-game-primary"
              style={{ borderColor: game.theme.primary + '40' }}
            >
              <Link href={`/${gameId}` as '/'} className="block">
                <div className="relative h-32 w-full overflow-hidden">
                  <Image
                    src={`/images/og/${gameId}.webp`}
                    alt={`${game.name[locale]} - ${locale === 'zh' ? '游戏攻略Wiki' : locale === 'ja' ? 'ゲーム攻略Wiki' : 'Game Wiki'}`}
                    width={400}
                    height={210}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </Link>
              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: game.theme.primary }}
                  >
                    {game.name[locale]}
                  </h2>
                  <Link
                    href={`/${gameId}` as '/'}
                    className="shrink-0 rounded-md border border-game-border px-2.5 py-1 text-xs font-medium text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                  >
                    {HOME_COPY.exploreGame[locale]}
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ctas.map((cta) => (
                    <Link
                      key={cta.href}
                      href={cta.href as '/'}
                      className="rounded-md bg-game-surface-alt px-2.5 py-2 text-center text-xs font-medium text-game-text-muted transition-colors hover:text-game-primary"
                    >
                      {cta.label}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Featured Characters per Game */}
      {GAME_IDS.filter((id) => (FEATURED[id]?.length ?? 0) > 0).map((gameId) => {
        const game = GAMES[gameId];
        const chars = getFeaturedChars(gameId, locale);
        if (chars.length < 3) return null;

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
          {HOME_COPY.aboutTitle[locale]}
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

function LivePanel({
  title,
  icon,
  items,
  locale,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    gameId: keyof typeof GAMES;
    title: Parameters<typeof localizeText>[0];
    summary: Parameters<typeof localizeText>[0];
    href: string;
    status?: keyof typeof STATUS_LABELS;
    updatedAt: string;
  }>;
  locale: SupportedLocale;
}) {
  return (
    <section className="bg-game-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-game-text">
        <span className="text-game-primary">{icon}</span>
        {title}
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const game = GAMES[item.gameId];
          return (
            <Link
              key={`${item.gameId}-${item.href}`}
              href={item.href as '/'}
              className="block rounded-md border border-game-border bg-game-surface-alt/70 p-3 transition-colors hover:border-game-primary"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span
                  className="text-xs font-semibold"
                  style={{ color: game.theme.primary }}
                >
                  {game.name[locale]}
                </span>
                {item.status ? (
                  <span className="rounded-full bg-game-bg px-2 py-0.5 text-[11px] font-medium text-game-text-muted">
                    {STATUS_LABELS[item.status][locale]}
                  </span>
                ) : null}
              </div>
              <h3 className="mb-1 text-sm font-semibold leading-snug text-game-text">
                {localizeText(item.title, locale)}
              </h3>
              <p className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">
                {localizeText(item.summary, locale)}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

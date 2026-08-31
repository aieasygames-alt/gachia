import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
import { GAMES, GAME_IDS, CATEGORY_LABELS } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildHomepageJsonLd } from '@/lib/jsonld';
import Image from 'next/image';
import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';
import { ArrowRight, Calculator, CalendarDays, Gamepad2, Gift, Radio, Sparkles, TrendingUp } from 'lucide-react';
import {
  HOMEPAGE_PRIORITY_GAMES,
  LIVE_BANNERS,
  LIVE_CODE_SUMMARIES,
  LIVE_GUIDES,
  LIVE_UPDATED_AT,
  LIVE_VERSION_UPDATES,
  type LiveStatus,
  type LocalizedText,
  localizeText,
  sortByPriority,
} from '@/lib/live-content';

const MESSAGES: Record<string, Record<string, string>> = {
  zh: zhMessages.homepage!,
  en: enMessages.homepage!,
  ja: jaMessages.homepage!,
};

type FeaturedCharacter = {
  id: string;
  name: Record<SupportedLocale, string>;
};

const FEATURED: Partial<Record<keyof typeof GAMES, FeaturedCharacter[]>> = {
  genshin: [
    { id: 'hu-tao', name: { zh: '胡桃', en: 'Hu Tao', ja: '胡桃' } },
    { id: 'raiden-shogun', name: { zh: '雷电将军', en: 'Raiden Shogun', ja: '雷電将軍' } },
    { id: 'furina', name: { zh: '芙宁娜', en: 'Furina', ja: 'フリーナ' } },
    { id: 'nahida', name: { zh: '纳西妲', en: 'Nahida', ja: 'ナヒーダ' } },
    { id: 'kazuha', name: { zh: '枫原万叶', en: 'Kaedehara Kazuha', ja: '楓原万葉' } },
  ],
  starrail: [
    { id: 'kafka', name: { zh: '卡芙卡', en: 'Kafka', ja: 'カフカ' } },
    { id: 'jingliu', name: { zh: '镜流', en: 'Jingliu', ja: '鏡流' } },
    { id: 'acheron', name: { zh: '黄泉', en: 'Acheron', ja: '黄泉' } },
    { id: 'firefly', name: { zh: '流萤', en: 'Firefly', ja: 'ホタル' } },
    { id: 'robin', name: { zh: '知更鸟', en: 'Robin', ja: 'ロビン' } },
  ],
  wuwa: [
    { id: 'jiyan', name: { zh: '忌炎', en: 'Jiyan', ja: '忌炎' } },
    { id: 'yinlin', name: { zh: '吟霖', en: 'Yinlin', ja: '吟霖' } },
    { id: 'jinhsi', name: { zh: '今汐', en: 'Jinhsi', ja: '今汐' } },
    { id: 'changli', name: { zh: '长离', en: 'Changli', ja: '長離' } },
    { id: 'zhezhi', name: { zh: '折枝', en: 'Zhezhi', ja: '折枝' } },
  ],
  zzz: [
    { id: 'ellen', name: { zh: '艾莲', en: 'Ellen', ja: 'エレン' } },
    { id: 'zhu-yuan', name: { zh: '朱鸢', en: 'Zhu Yuan', ja: '朱鳶' } },
    { id: 'miyabi', name: { zh: '星见雅', en: 'Hoshimi Miyabi', ja: '星見雅' } },
    { id: 'burnice', name: { zh: '柏妮思', en: 'Burnice', ja: 'バーニス' } },
    { id: 'caesar', name: { zh: '凯撒', en: 'Caesar', ja: 'シーザー' } },
  ],
  endfield: [
    { id: 'laevatain', name: { zh: '莱瓦汀', en: 'Laevatain', ja: 'レーヴァテイン' } },
    { id: 'ardelia', name: { zh: '阿黛莉亚', en: 'Ardelia', ja: 'アルデリア' } },
    { id: 'tangtang', name: { zh: '棠棠', en: 'Tangtang', ja: 'タンタン' } },
    { id: 'endministrator', name: { zh: '管理员', en: 'Endministrator', ja: 'エンドミニストレーター' } },
    { id: 'lifeng', name: { zh: '立风', en: 'Lifeng', ja: 'リーフェン' } },
  ],
  sea: [
    { id: 'traveler', name: { zh: '旅人', en: 'Traveler', ja: '旅人' } },
    { id: 'ais', name: { zh: '艾丝', en: 'Ais', ja: 'アイス' } },
    { id: 'little-axe', name: { zh: '小斧', en: 'Little Axe', ja: 'リトルアックス' } },
  ],
  roco: [
    { id: 'meewee', name: { zh: '米维', en: 'Meewee', ja: 'ミーウィー' } },
    { id: 'sparka', name: { zh: '斯帕卡', en: 'Sparka', ja: 'スパーカ' } },
    { id: 'cerulla', name: { zh: '瑟露拉', en: 'Cerulla', ja: 'セルラ' } },
  ],
  aniimo: [
    { id: 'susuta', name: { zh: 'Susuta', en: 'Susuta', ja: 'Susuta' } },
    { id: 'emberpup', name: { zh: 'Emberpup', en: 'Emberpup', ja: 'Emberpup' } },
    { id: 'celestis', name: { zh: 'Celestis', en: 'Celestis', ja: 'Celestis' } },
    { id: 'tuckin', name: { zh: 'Tuckin', en: 'Tuckin', ja: 'Tuckin' } },
    { id: 'panpanta', name: { zh: 'Panpanta', en: 'Panpanta', ja: 'Panpanta' } },
  ],
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
    zh: '新增游戏越来越多，首页改成情报台：先看正在更新的游戏、今日版本重点，再进入角色、下载、兑换码和攻略。',
    en: 'As the library grows, the homepage now works like an intel board: active games first, then version priorities, characters, downloads, codes, and guides.',
    ja: '対応ゲームが増えたため、ホームを情報ボード化。更新中ゲーム、版本要点、キャラ、DL、コード、攻略へ素早く進めます。',
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
    zh: '游戏轨道',
    en: 'Game Tracks',
    ja: 'ゲームトラック',
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
  allGames: {
    zh: '全部游戏入口',
    en: 'All Game Entries',
    ja: '全ゲーム入口',
  },
  liveFeed: {
    zh: '更新流',
    en: 'Update Feed',
    ja: '更新フィード',
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

const TRACK_LABELS = {
  routes: { zh: '可用模块', en: 'Modules', ja: 'モジュール' },
  chars: { zh: '热门角色', en: 'Featured', ja: '注目' },
  updated: { zh: '最近更新', en: 'Recent', ja: '最近更新' },
} satisfies Record<string, Record<SupportedLocale, string>>;

type HomeFeedItem = {
  gameId: keyof typeof GAMES;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status?: LiveStatus;
  updatedAt: string;
  priority: number;
};

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

function getRouteCount(gameId: keyof typeof GAMES) {
  return Object.values(GAMES[gameId].routes).filter(Boolean).length;
}

function getStatusForGame(gameId: keyof typeof GAMES) {
  const liveItem: HomeFeedItem | undefined = [...LIVE_BANNERS, ...LIVE_VERSION_UPDATES, ...LIVE_CODE_SUMMARIES, ...LIVE_GUIDES]
    .filter((item) => item.gameId === gameId)
    .sort((a, b) => a.priority - b.priority)[0];
  return liveItem?.status;
}

const DESCRIPTIONS: Record<string, string> = {
  zh: 'Gachia 是多游戏攻略 Wiki 与实时规划入口，覆盖原神、崩铁、鸣潮、绝区零、异环等游戏的当前卡池、下期卡池、版本专题、兑换码、角色图鉴、武器数据、配装和热门攻略。',
  en: 'Gachia is a multi-game wiki and live planning hub for current banners, next banners, version updates, redeem codes, characters, weapons, builds, and guides across Genshin, HSR, WuWa, ZZZ, NTE, and more.',
  ja: 'Gachia は多ゲーム攻略 Wiki とリアルタイム計画ハブです。原神、HSR、鳴潮、ZZZ、NTE などの現在バナー、次回バナー、版本更新、コード、キャラ、武器、ビルド、攻略を整理します。',
};

const TITLES: Record<string, string> = {
  zh: 'Gachia 游戏攻略 Wiki：卡池、版本、兑换码与角色图鉴',
  en: 'Gachia Game Wiki: Banners, Version Hubs, Codes & Character Guides',
  ja: 'Gachia ゲーム攻略 Wiki：バナー、版本、コード、キャラ',
};

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
  const t = (MESSAGES[locale] ?? MESSAGES.zh) as Record<string, string>;
  const liveBanners = sortByPriority(LIVE_BANNERS).slice(0, 3);
  const liveVersions = sortByPriority(LIVE_VERSION_UPDATES).slice(0, 3);
  const liveCodes = sortByPriority(LIVE_CODE_SUMMARIES).slice(0, 3);
  const liveGuides = sortByPriority(LIVE_GUIDES).slice(0, 3);
  const priorityGames = HOMEPAGE_PRIORITY_GAMES.filter((gameId) => GAMES[gameId]);

  const orderedGames = [...priorityGames, ...GAME_IDS.filter((gameId) => !priorityGames.includes(gameId))];
  const spotlightGames = orderedGames.slice(0, 5);
  const updateFeed: HomeFeedItem[] = sortByPriority([...LIVE_BANNERS, ...LIVE_VERSION_UPDATES, ...LIVE_CODE_SUMMARIES, ...LIVE_GUIDES]).slice(0, 8);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Live Hub */}
      <section className="mb-8 overflow-hidden rounded-lg border border-game-border bg-game-surface">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div className="relative border-b border-game-border p-5 md:p-8 xl:border-b-0 xl:border-r">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(135deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />
            <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-game-primary/40 bg-game-primary/10 px-3 py-1 text-xs font-semibold uppercase text-game-primary">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              {HOME_COPY.liveEyebrow[locale]}
            </div>
            <h1 className="mb-4 max-w-3xl text-4xl font-black leading-tight text-game-text md:text-6xl">
              Gachia <span className="text-game-primary">Atlas</span>
            </h1>
            <p className="mb-3 max-w-3xl text-xl font-semibold text-game-text md:text-2xl">
              {HOME_COPY.liveTitle[locale]}
            </p>
            <p className="max-w-3xl text-base leading-relaxed text-game-text-muted md:text-lg">
              {HOME_COPY.liveSubtitle[locale]}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
              {spotlightGames.map((gameId) => {
                const game = GAMES[gameId];
                const status = getStatusForGame(gameId);
                return (
                  <Link
                    key={gameId}
                    href={`/${gameId}` as '/'}
                    className="group overflow-hidden rounded-lg border bg-game-bg/50 transition-colors hover:bg-game-surface-alt"
                    style={{ borderColor: game.theme.primary + '66' }}
                  >
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={`/images/og/${gameId}.webp`}
                        alt={game.name[locale]}
                        fill
                        sizes="(min-width: 1280px) 170px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform group-hover:scale-105"
                        priority={gameId === spotlightGames[0]}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <span className="min-w-0 truncate text-sm font-bold text-game-text" title={game.name[locale]}>
                        {game.name[locale]}
                      </span>
                      {status ? (
                        <span className="shrink-0 rounded-full bg-game-surface px-2 py-0.5 text-[10px] font-semibold text-game-text-muted">
                          {STATUS_LABELS[status][locale]}
                        </span>
                      ) : null}
                    </div>
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
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { value: t.statsCharacters },
          { value: t.statsWeapons },
          { value: t.statsGuides },
          { value: `${GAME_IDS.length} ${t.statsGamesLabel ?? 'Games'}` },
        ].map((stat) => (
          <div
            key={stat.value}
            className="rounded-lg border border-game-border bg-game-surface-alt/70 p-4 text-center"
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
      <section className="mb-10 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orderedGames.map((gameId, index) => {
          const game = GAMES[gameId];
          const ctas = getGameCtas(gameId, locale);
          const status = getStatusForGame(gameId);
          return (
            <article
              key={gameId}
              className="group grid overflow-hidden rounded-lg border bg-game-surface transition-colors hover:border-game-primary sm:grid-cols-[150px_minmax(0,1fr)]"
              style={{ borderColor: game.theme.primary + '40' }}
            >
              <Link href={`/${gameId}` as '/'} className="block">
                <div className="relative h-36 w-full overflow-hidden sm:h-full">
                  <Image
                    src={`/images/og/${gameId}.webp`}
                    alt={`${game.name[locale]} - ${locale === 'zh' ? '游戏攻略Wiki' : locale === 'ja' ? 'ゲーム攻略Wiki' : 'Game Wiki'}`}
                    fill
                    sizes="(min-width: 1280px) 150px, (min-width: 768px) 150px, 100vw"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                    #{index + 1}
                  </div>
                </div>
              </Link>
              <div className="min-w-0 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className="truncate text-lg font-black"
                      style={{ color: game.theme.primary }}
                    >
                      {game.name[locale]}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-game-text-muted">
                      <span>{getRouteCount(gameId)} {TRACK_LABELS.routes[locale]}</span>
                      {FEATURED[gameId]?.length ? (
                        <span>{FEATURED[gameId]?.length ?? 0} {TRACK_LABELS.chars[locale]}</span>
                      ) : null}
                      {status ? <span>{STATUS_LABELS[status][locale]}</span> : null}
                    </div>
                  </div>
                  <Link
                    href={`/${gameId}` as '/'}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-game-border px-2.5 py-1 text-xs font-medium text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                  >
                    {HOME_COPY.exploreGame[locale]}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ctas.map((cta) => (
                    <Link
                      key={cta.href}
                      href={cta.href as '/'}
                      className="rounded-md bg-game-surface-alt px-2.5 py-2 text-center text-xs font-semibold text-game-text-muted transition-colors hover:text-game-primary"
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

      <section className="mb-10 rounded-lg border border-game-border bg-game-surface p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2 text-xl font-bold text-game-text">
          <Gamepad2 className="h-5 w-5 text-game-primary" aria-hidden="true" />
          {HOME_COPY.liveFeed[locale]}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {updateFeed.map((item) => {
            const game = GAMES[item.gameId];
            return (
              <Link
                key={`${item.gameId}-${item.href}-${localizeText(item.title, locale)}`}
                href={item.href as '/'}
                className="flex items-center gap-3 rounded-md border border-game-border bg-game-surface-alt/60 p-3 transition-colors hover:border-game-primary"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: game.theme.primary }} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-game-text">
                  {localizeText(item.title, locale)}
                </span>
                <span className="shrink-0 text-xs text-game-text-muted">{game.name[locale]}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Characters per Game */}
      {GAME_IDS.filter((id) => (FEATURED[id]?.length ?? 0) > 0).map((gameId) => {
        const game = GAMES[gameId];
        const chars = FEATURED[gameId] ?? [];
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
                      src={`/images/${gameId}/characters/${char.id}.webp`}
                      alt={char.name[locale]}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="font-medium text-game-text group-hover:text-game-primary">
                    {char.name[locale]}
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
    title: LocalizedText;
    summary: LocalizedText;
    href: string;
    status?: LiveStatus;
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

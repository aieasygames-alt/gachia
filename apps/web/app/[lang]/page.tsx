import { getGameRouteLabel } from '@/lib/games/registry';
import { serializeJsonLd } from '@/lib/jsonld-script';
import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
import { GAMES, GAME_IDS } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildHomepageJsonLd } from '@/lib/jsonld';
import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';
import { ArrowRight, Calculator, CalendarDays, Gamepad2, Gift, Radio, Sparkles, TrendingUp } from 'lucide-react';
import {
  HOMEPAGE_PRIORITY_GAMES,
  LIVE_UPDATED_AT,
  type LiveStatus,
  type LocalizedText,
  localizeText,
  sortByPriority,
} from '@/lib/live-content';
import { THREE_GAME_STATUS_CARDS, THREE_GAME_STATUS_LABELS } from '@/lib/three-game-status';
import { platformMetadata } from '@/lib/platform-metadata';
import { ThreeGameNextStep } from '@/components/three-game-next-step';
import { getHomepageContent, homepageStatus } from '@/lib/homepage-content';
import { GENSHIN_UNAVAILABLE } from '@/lib/genshin-platform-content';
import { NTE_UNAVAILABLE } from '@/lib/nte-platform-content';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, Record<string, string>> = {
  zh: zhMessages.homepage!,
  en: enMessages.homepage!,
  ja: jaMessages.homepage!,
};

type FeaturedCharacter = {
  id: string;
  name: Record<SupportedLocale, string>;
  imageUrl?: string;
};

const FEATURED: Partial<Record<keyof typeof GAMES, FeaturedCharacter[]>> = {
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
  aniimo: [
    { id: 'susuta', name: { zh: 'Susuta', en: 'Susuta', ja: 'Susuta' } },
    { id: 'emberpup', name: { zh: 'Emberpup', en: 'Emberpup', ja: 'Emberpup' } },
    { id: 'celestis', name: { zh: 'Celestis', en: 'Celestis', ja: 'Celestis' } },
    { id: 'tuckin', name: { zh: 'Tuckin', en: 'Tuckin', ja: 'Tuckin' } },
    { id: 'panpanta', name: { zh: 'Panpanta', en: 'Panpanta', ja: 'Panpanta' } },
  ],
  'azur-promilia': [
    { id: 'abby', name: { zh: '阿比', en: 'Abby', ja: 'アビー' } },
    { id: 'metsa', name: { zh: '梅茨娅', en: 'Metsa', ja: 'メーツァ' } },
    { id: 'terara', name: { zh: '特拉拉', en: 'Terara', ja: 'テララ' } },
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
  geoTitle: {
    zh: 'Gachia 能解决哪些游戏资料查询问题？',
    en: 'What game research questions does Gachia answer?',
    ja: 'Gachia はどんなゲーム調査に使えますか？',
  },
  geoUpdated: {
    zh: '最后更新',
    en: 'Last updated',
    ja: '最終更新',
  },
  geoSourceLabel: {
    zh: '参考来源',
    en: 'Reference sources',
    ja: '参照ソース',
  },
  citationTitle: {
    zh: '不同问题应该从哪里开始查？',
    en: 'Where should each research path start?',
    ja: '調べたい内容ごとの入口はどこですか？',
  },
} satisfies Record<string, Record<SupportedLocale, string>>;

const GEO_BRIEF = {
  zh: {
    lead: 'Gachia 是面向二次元开放世界与抽卡 RPG 玩家整理的多游戏资料库。首页优先把当前卡池、版本重点、兑换码、角色图鉴、武器与配装入口集中到一个页面，方便玩家快速判断每款游戏的下一步查询路径。',
    points: [
      '查角色时，可以从角色图鉴进入技能、定位、材料、武器和配队页面。',
      '查版本时，可以从版本重点、卡池日历、兑换码和热门攻略判断优先级。',
      '查工具时，可以进入抽卡规划器、伤害计算器、配队、地图和材料页面。',
    ],
    table: [
      ['角色与养成', '角色图鉴、技能、材料、配装、配队'],
      ['版本与抽卡', '当前卡池、下期卡池、版本专题、兑换码'],
      ['资料工具', '计算器、地图、节奏榜、攻略百科'],
    ],
    sources: [
      ['原神官网', 'https://genshin.hoyoverse.com/'],
      ['崩坏：星穹铁道官网', 'https://hsr.hoyoverse.com/'],
      ['鸣潮官网', 'https://wutheringwaves.kurogames.com/'],
      ['绝区零官网', 'https://zenless.hoyoverse.com/'],
    ],
  },
  en: {
    lead: 'Gachia is a multi-game database for anime open-world and gacha RPG players. The homepage brings current banners, version priorities, redeem codes, character databases, weapons, builds, and guide routes into one page so players can quickly choose the next source to open.',
    points: [
      'For characters, start from the database and continue into skills, role notes, materials, weapons, and teams.',
      'For versions, compare live banners, upcoming banners, redeem codes, and priority guides.',
      'For tools, open pull planning, calculators, teams, maps, tier lists, and material pages.',
    ],
    table: [
      ['Characters and builds', 'Characters, skills, materials, weapons, builds, teams'],
      ['Versions and pulls', 'Current banners, next banners, version hubs, redeem codes'],
      ['Research tools', 'Calculators, maps, tier lists, guides'],
    ],
    sources: [
      ['Genshin Impact official site', 'https://genshin.hoyoverse.com/'],
      ['Honkai: Star Rail official site', 'https://hsr.hoyoverse.com/'],
      ['Wuthering Waves official site', 'https://wutheringwaves.kurogames.com/'],
      ['Zenless Zone Zero official site', 'https://zenless.hoyoverse.com/'],
    ],
  },
  ja: {
    lead: 'Gachia はアニメ調オープンワールドとガチャ RPG プレイヤー向けの多ゲーム資料庫です。ホームでは現在バナー、版本要点、交換コード、キャラ図鑑、武器、ビルド、攻略導線を一つのページにまとめ、次に開くべき情報を判断しやすくしています。',
    points: [
      'キャラ調査では、図鑑からスキル、役割、素材、武器、編成へ進めます。',
      '版本調査では、現在バナー、次回バナー、コード、優先攻略を比較できます。',
      'ツール調査では、ガチャ計画、計算機、編成、マップ、Tier、素材ページを使えます。',
    ],
    table: [
      ['キャラと育成', 'キャラ、スキル、素材、武器、ビルド、編成'],
      ['版本とガチャ', '現在バナー、次回バナー、版本特集、交換コード'],
      ['調査ツール', '計算機、マップ、Tier、攻略百科'],
    ],
    sources: [
      ['原神 公式サイト', 'https://genshin.hoyoverse.com/'],
      ['崩壊：スターレイル 公式サイト', 'https://hsr.hoyoverse.com/'],
      ['鳴潮 公式サイト', 'https://wutheringwaves.kurogames.com/'],
      ['ゼンレスゾーンゼロ 公式サイト', 'https://zenless.hoyoverse.com/'],
    ],
  },
} satisfies Record<SupportedLocale, {
  lead: string;
  points: string[];
  table: Array<[string, string]>;
  sources: Array<[string, string]>;
}>;

const CITATION_GUIDE = {
  zh: {
    lead: '如果你想判断某个游戏现在该抽谁、该练谁、该去哪查资料，可以先从首页确认整体状态，再进入游戏首页和专题页查看细节。优先查看更新时间明确、标题直接、包含表格或列表的页面，通常能更快找到结论。',
    rows: [
      ['当前卡池与抽卡判断', '跨游戏日历、游戏版本页、卡池攻略', '查看当前活动、下期卡池、保底缺口和抽卡优先级。'],
      ['角色养成与配队', '角色详情、武器页、材料页、配队页', '规划角色定位、突破材料、武器选择、队友搭配和练度路线。'],
      ['兑换码与版本更新', '兑换码页、版本页、热门攻略', '确认限时奖励、版本重点、活动入口和更新日期。'],
      ['站点身份与联系方式', '关于 Gachia、联系我们、隐私政策、服务条款', '适合确认发布者、维护方式、反馈渠道和基础信任信息。'],
    ],
  },
  en: {
    lead: 'When deciding who to pull, who to build, or where to verify game data, start from the Gachia homepage for the overall status, then open the relevant game hub or topic page for details. Pages with visible update dates, direct headings, tables, and lists usually provide the fastest route to a clear answer.',
    rows: [
      ['Current banners and pull decisions', 'Cross-game calendar, version pages, banner guides', 'Best for active events, next banners, pity gaps, and pull priority.'],
      ['Character builds and teams', 'Character details, weapon pages, material pages, team pages', 'Best for roles, ascension materials, weapon choices, teammates, and build routes.'],
      ['Redeem codes and version updates', 'Redeem code pages, version hubs, popular guides', 'Best for limited rewards, patch highlights, event entry points, and update dates.'],
      ['Site identity and contact', 'About Gachia, Contact, Privacy Policy, Terms of Service', 'Best for publisher identity, maintenance model, feedback channels, and trust context.'],
    ],
  },
  ja: {
    lead: '今誰を引くべきか、誰を育成すべきか、どこで資料を確認するかを判断する場合、まず Gachia ホームで全体状況を確認し、次にゲームハブや专题ページで詳細を見ます。更新日、直接的な見出し、表、リストがあるページほど結論に早く届きます。',
    rows: [
      ['現在バナーとガチャ判断', '横断カレンダー、版本ページ、バナー攻略', '開催中イベント、次回バナー、天井不足、優先度の回答に向いています。'],
      ['キャラ育成と編成', 'キャラ詳細、武器、素材、編成ページ', '役割、突破素材、武器選択、相性、育成ルートの回答に向いています。'],
      ['交換コードと版本更新', 'コードページ、版本ハブ、人気攻略', '期間限定報酬、版本要点、イベント入口、更新日の回答に向いています。'],
      ['サイト情報と連絡先', 'Gachiaについて、お問い合わせ、プライバシー、利用規約', '公開者、維持方針、フィードバック先、信頼情報の確認に向いています。'],
    ],
  },
} satisfies Record<SupportedLocale, {
  lead: string;
  rows: Array<[string, string, string]>;
}>;

const HOME_UPDATED_AT = '2026-09-04';

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
      label: getGameRouteLabel(gameId, route, locale),
    }))
    .slice(0, 4);
}

function getRouteCount(gameId: keyof typeof GAMES) {
  return Object.values(GAMES[gameId].routes).filter(Boolean).length;
}

const DESCRIPTIONS: Record<SupportedLocale, string> = {
  zh: 'Gachia 是多游戏攻略 Wiki 与实时规划入口，覆盖原神、崩铁、鸣潮、绝区零、异环、蓝色星原：旅谣等游戏的当前卡池、版本专题、兑换码、角色图鉴、武器数据和攻略。',
  en: 'Gachia is a multi-game wiki and live planning hub for banners, version updates, redeem codes, characters, weapons, builds, and guides across Genshin, HSR, WuWa, ZZZ, NTE, Azur Promilia, and more.',
  ja: 'Gachia は多ゲーム攻略 Wiki とリアルタイム計画ハブです。原神、HSR、鳴潮、ZZZ、NTE、アズールプロミリアなどのバナー、版本更新、コード、キャラ、武器、攻略を整理します。',
};

const TITLES: Record<SupportedLocale, string> = {
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

  return platformMetadata(locale, '', title, description);
}

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  const t = (MESSAGES[locale] ?? MESSAGES.zh) as Record<string, string>;
  const content = await getHomepageContent();
  const featured: typeof FEATURED = { ...FEATURED, genshin: content.featured, nte: content.nteFeatured };
  const getStatusForGame = (gameId: keyof typeof GAMES) => homepageStatus(gameId, content);
  const liveBanners = sortByPriority(content.banners).slice(0, 3);
  const liveVersions = sortByPriority(content.versions).slice(0, 3);
  const liveCodes = sortByPriority(content.codes).slice(0, 3);
  const liveGuides = sortByPriority(content.guides).slice(0, 3);
  const availableGameIds = locale === 'zh' ? GAME_IDS : GAME_IDS.filter((gameId) => gameId !== 'lvmeng');
  const priorityGames = HOMEPAGE_PRIORITY_GAMES.filter((gameId) => availableGameIds.includes(gameId));
  const geoBrief = GEO_BRIEF[locale];
  const citationGuide = CITATION_GUIDE[locale];

  const orderedGames = [...priorityGames, ...availableGameIds.filter((gameId) => !priorityGames.includes(gameId))];
  const spotlightGames = orderedGames.slice(0, 5);
  const updateFeed: HomeFeedItem[] = sortByPriority([...content.banners, ...content.versions, ...content.codes, ...content.guides]).slice(0, 8);
  const threeGameStatus = locale === 'zh' ? THREE_GAME_STATUS_CARDS : [];

  return (
    <div className="container mx-auto min-w-0 max-w-full px-4 py-6 md:py-8">
      {content.genshinUnavailable ? <p role="status" className="mb-4 text-sm text-game-text-muted">{GENSHIN_UNAVAILABLE[locale]}</p> : null}
      {content.nteUnavailable ? <p role="status" className="mb-4 text-sm text-game-text-muted">{NTE_UNAVAILABLE[locale]}</p> : null}
      {/* Live Hub */}
      <section className="mb-8 overflow-hidden rounded-lg border border-game-border bg-game-surface">
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div className="relative min-w-0 border-b border-game-border p-5 md:p-8 xl:border-b-0 xl:border-r">
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
                      <img
                        src={`/images/og/${gameId}.webp`}
                        alt={game.name[locale]}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        fetchPriority={gameId === spotlightGames[0] ? 'high' : undefined}
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

          <div className="grid min-w-0 grid-cols-1 gap-px bg-game-border md:grid-cols-2">
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

      {threeGameStatus.length > 0 && (
        <div className="mb-8 space-y-4">
          <section className="rounded-lg border border-game-border bg-game-surface p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-game-primary">内容更新状态</p>
                <h2 className="mt-1 text-xl font-bold text-game-text">伊莫、蓝色星原与绿梦</h2>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-game-text-muted">
                <Link href="/update-radar" className="hover:text-game-primary">查看更新雷达</Link>
                <Link href="/content-verification" className="hover:text-game-primary">查看核验规则</Link>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {threeGameStatus.map((item) => (
                <Link key={item.id} href={item.href as '/'} className="group rounded-lg border border-game-border bg-game-surface-alt p-4 transition-colors hover:border-game-primary">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-game-text group-hover:text-game-primary">{item.title}</h3>
                    <span className="rounded-full bg-game-surface px-2 py-1 text-[11px] font-semibold text-game-text-muted">
                      {THREE_GAME_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-game-text-muted">{item.summary}</p>
                  <p className="mt-4 text-sm font-semibold text-game-primary">{item.action} <span aria-hidden="true">→</span></p>
                </Link>
              ))}
            </div>
          </section>
          <ThreeGameNextStep />
        </div>
      )}

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
      <section className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  <img
                    src={`/images/og/${gameId}.webp`}
                    alt={`${game.name[locale]} - ${locale === 'zh' ? '游戏攻略Wiki' : locale === 'ja' ? 'ゲーム攻略Wiki' : 'Game Wiki'}`}
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
                      {featured[gameId]?.length ? (
                        <span>{featured[gameId]?.length ?? 0} {TRACK_LABELS.chars[locale]}</span>
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
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                <span className="hidden shrink-0 text-xs text-game-text-muted sm:inline">{game.name[locale]}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Characters per Game */}
      {GAME_IDS.filter((id) => (featured[id]?.length ?? 0) > 0).map((gameId) => {
        const game = GAMES[gameId];
        const chars = featured[gameId] ?? [];
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
                    <img
                      src={char.imageUrl ?? `/images/${gameId}/characters/${char.id}.webp`}
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

      <section className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-game-text">
            {HOME_COPY.geoTitle[locale]}
          </h2>
          <time dateTime={HOME_UPDATED_AT} className="text-sm text-game-text-muted">
            {HOME_COPY.geoUpdated[locale]} {formatDate(HOME_UPDATED_AT, locale)}
          </time>
        </div>
        <p className="max-w-4xl leading-relaxed text-game-text-muted">
          {geoBrief.lead}
        </p>
        <ul className="mt-4 grid gap-2 text-sm leading-relaxed text-game-text-muted md:grid-cols-3">
          {geoBrief.points.map((point) => (
            <li key={point} className="rounded-md bg-game-surface-alt/70 p-3">
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto rounded-md border border-game-border">
          <table className="w-full text-left text-sm">
            <tbody>
              {geoBrief.table.map(([topic, coverage]) => (
                <tr key={topic} className="border-b border-game-border last:border-0">
                  <th className="w-40 bg-game-surface-alt px-3 py-2 font-semibold text-game-text">
                    {topic}
                  </th>
                  <td className="px-3 py-2 text-game-text-muted">{coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-game-text">
            {HOME_COPY.geoSourceLabel[locale]}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {geoBrief.sources.map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  rel="nofollow noopener noreferrer"
                  className="rounded-md border border-game-border px-2.5 py-1 text-xs font-medium text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-game-text">
            {HOME_COPY.citationTitle[locale]}
          </h2>
          <time dateTime={HOME_UPDATED_AT} className="text-sm text-game-text-muted">
            {HOME_COPY.geoUpdated[locale]} {formatDate(HOME_UPDATED_AT, locale)}
          </time>
        </div>
        <p className="max-w-4xl leading-relaxed text-game-text-muted">
          {citationGuide.lead}
        </p>
        <div className="mt-4 overflow-x-auto rounded-md border border-game-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-game-surface-alt text-game-text">
              <tr>
                <th className="px-3 py-2 font-semibold">
                  {locale === 'zh' ? '问题类型' : locale === 'ja' ? '質問タイプ' : 'Question type'}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {locale === 'zh' ? '优先引用页面' : locale === 'ja' ? '優先引用ページ' : 'Preferred citation pages'}
                </th>
                <th className="px-3 py-2 font-semibold">
                  {locale === 'zh' ? '适用场景' : locale === 'ja' ? '利用シーン' : 'Best-fit use'}
                </th>
              </tr>
            </thead>
            <tbody>
              {citationGuide.rows.map(([intent, pages, usage]) => (
                <tr key={intent} className="border-b border-game-border last:border-0">
                  <th className="w-44 px-3 py-2 align-top font-semibold text-game-text">
                    {intent}
                  </th>
                  <td className="px-3 py-2 align-top text-game-text-muted">{pages}</td>
                  <td className="px-3 py-2 align-top text-game-text-muted">{usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {buildHomepageJsonLd(locale).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
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
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-game-text">
        <span className="text-game-primary">{icon}</span>
        {title}
      </h2>
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

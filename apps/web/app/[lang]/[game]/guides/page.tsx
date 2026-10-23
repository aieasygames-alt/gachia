import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import type { GuideListEntry } from '@/lib/game-data/guides';
import { getGuideListData } from '@/lib/game-data/guides';
import { buildLocalizedAlternates, ensureMetaLength, getEntryCurrentVersion, getEntryUpdatedAt, isContentUnderReview, isEditorialProposalArchive } from '@/lib/seo-metadata';
import { ROCO_LIST_REVIEW } from '@/lib/roco-public-review';

const BASE_URL = 'https://gachia.com';

const GUIDE_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神攻略百科，覆盖新手开荒、角色培养、配队推荐、深渊挑战、版本专题与热点攻略，帮助你快速找到当前版本最实用的下一步。', en: 'Genshin Impact guides for current banners, Luna VIII/Nod-Krai, Lunar reactions, character builds, teams, materials, boss strategies, codes, and Primogem planning.', ja: '原神攻略百科。初心者向け、キャラ育成、編成、深境螺旋、版本特集までまとめて、今知りたい攻略へすぐ進めます。' },
  starrail: { zh: '崩坏：星穹铁道攻略百科，涵盖新手指南、角色培养、配队思路、忘却之庭、虚构叙事和版本热点，让你更快进入可执行的攻略页面。', en: 'Honkai: Star Rail guides covering beginner tips, character builds, team recommendations, endgame modes, version hubs, and practical next steps for fast progress.', ja: 'スターレイル攻略百科。初心者ガイド、キャラ育成、編成、忘却の庭、虚構叙事、版本トピックをまとめて案内します。' },
  wuwa: { zh: '鸣潮 3.7 攻略百科，优先整理梦枢天罗、心/锁暝、当前活动、卡池预算、声骸配装、波片规划、兑换码与更新后平台检查。', en: 'Wuthering Waves v3.7 guides for the Simulacrum Nexus of Mengzhou, Hsin/Suoming, current events, banner budgeting, Echo builds, Waveplate planning, codes, and post-update platform checks.', ja: '鳴潮Ver.3.7攻略百科。夢枢天羅、心/鎖暝、現在イベント、バナー予算、エコー、スタミナ、コード、更新後のプラットフォーム確認を整理します。' },
  nte: { zh: '异环攻略百科，包含下载安装、新手指南、角色培养、Boss 攻略、伤害公式、弧盘推荐和版本专题，帮助你快速了解当前版本最值得关注的内容。', en: 'Neverness to Everness guides with download/install help, beginner tips, character builds, boss guides, damage formulas, arc recommendations, and version hubs focused on the current patch.', ja: '異環攻略百科。DL/インストール、初心者ガイド、キャラ育成、ボス攻略、ダメージ計算、弧盤、版本特集を整理して案内します。' },
  zzz: { zh: '绝区零攻略百科，覆盖新手指引、代理人培养、音擎搭配、驱动盘思路、版本专题与高阶攻略，适合先看总览再进入细分页面。', en: 'Zenless Zone Zero guides covering beginner tips, agent builds, W-Engine choices, drive disc setups, version hubs, and endgame advice in one place.', ja: 'ゼンレスゾーンゼロ攻略百科。初心者ガイド、エージェント育成、Wエンジン、ディスク、版本特集、高難度攻略をまとめています。' },
  hi3: { zh: '崩坏3 9.0 攻略百科，优先整理官方版本总览、主线 Part 2 终章、天命之环队伍、新增装备与新手/回归的资源决策。当前卡池、奖励与数值以游戏内和官方公告为准。', en: 'Honkai Impact 3rd v9.0 guides covering the official patch overview, Part 2 finale, Astral Ring teams, new gear, and new/returning Captain decisions. Confirm current supplies, rewards, and values in-game or in official notices.', ja: '崩壊3rd Ver.9.0攻略。公式アップデート、Part 2終章、アストラルリング編成、新装備、初心者・復帰艦長の判断を整理します。現在の補給、報酬、数値はゲーム内・公式告知で確認してください。' },
  guihuan: { zh: '归环攻略百科，整理新手开荒、使灵培养、武器推荐、版本专题与实战思路，方便你按内容类型快速找到下一步该看什么。', en: 'Guihuan guides with beginner routes, spirit builds, weapon recommendations, version hubs, and practical combat notes that help you choose the best next page.', ja: '帰環攻略百科。初心者ルート、使霊育成、武器、版本特集、実戦メモをまとめて、次に読むべきページへ導きます。' },
  ananta: { zh: '无限大攻略百科，收录新手入门、异能者培养、武器推荐、版本专题和玩法拆解，让你快速进入最实用的培养与配队内容。', en: 'Ananta guides covering beginner tips, esper builds, weapon recommendations, version hubs, and gameplay breakdowns that route you into the most useful build pages.', ja: 'アナンタ攻略百科。初心者入門、異能者育成、武器、版本特集、遊び方の解説をまとめて、実用ページへ案内します。' },
  endfield: { zh: '明日方舟：终末地攻略百科，当前优先整理国服丹青渡官方更新、寻访活动与工业系统，Pioneer Test另作历史档案；旧战斗、抽卡和活动攻略均标明测试期资料边界。', en: 'Arknights: Endfield guides prioritize CN Danqingdu official updates, searches, events and industry systems, with Pioneer Test kept historical; older combat, gacha, and event pages are clearly scoped as test-period references.', ja: 'アークナイツ：エンドフィールド攻略百科。中国版丹青渡告知・尋訪・イベント・工業更新を優先し、Pioneer Testは履歴として区別、、旧戦闘・ガチャ・イベント攻略はテスト期の参考として明示します。' },
  sea: { zh: '遗忘之海攻略百科，提供公测中心、下载安装、新手开荒、捏脸、云捏脸、配置要求和版本专题，帮助你先抓住最重要的信息，再继续深入浏览。', en: 'Sea of Remnants guides with an open beta center, download/install help, beginner routes, face sculpting, cloud sculpting, PC requirements, version hubs, and follow-up pages that help you catch the important basics before going deeper.', ja: 'シー・オブ・レムナンツ攻略百科。CBT特集、DL/インストール、初心者ルート、顔作成、クラウド作成、PC環境、版本特集をまとめています。' },
  skjh: { zh: '失控进化攻略百科，整理新手开荒、基地建设、资源科技树、基因流派、武器和公测福利，适合从版本总览一路看到账户养成。', en: 'Ashfall Evolution guides covering beginner routes, base building, resource tech, gene builds, weapons, and launch rewards so players can plan progression end to end.', ja: '失控進化攻略百科。初心者ルート、拠点建築、資源テック、遺伝子ビルド、武器、公測報酬をまとめて案内します。' },
  'roco-cn': { zh: '《洛克王国:世界》国服攻略百科，覆盖版本专题、赛季活动、精灵图鉴、养成攻略与兑换码，内容陆续补充中。', en: 'Roco Kingdom (CN) guides covering version hubs, seasons, the Jinie database, build guides, and redeem codes — content is being added.', ja: 'ロコキングダム（中国版）攻略百科。版本特集、シーズン、ジニー図鑑、育成、交換コードをカバーし、順次追加中。' },
  aniimo: { zh: '伊莫 S1 攻略百科，覆盖新手开荒、虹光研究、家园资源、地图区域、Aniimo 图鉴、兑换码状态与当前客户端核验。', en: 'Aniimo S1 guides for new-player routes, Rainbow research, Homeland resources, regions, the Aniimo database, code status, and live-client verification.', ja: 'Aniimo S1攻略百科。初心者ルート、虹光研究、ホームランド資源、地域、Aniimo図鑑、コード状態、現行クライアント確認を整理します。' },
  'azur-promilia': { zh: '蓝色星原：旅谣攻略百科，优先整理官方信息核对、角色、武器、版本与兑换码状态。', en: 'Azur Promilia guides focused on official-information checks, characters, weapons, versions, and code status.', ja: 'アズールプロミリア攻略百科。公式情報の確認、キャラクター、武器、バージョン、コード状態を整理します。' },
};

const FEATURED_GUIDE_IDS: Partial<Record<GameId, string[]>> = {
  genshin: ['banner-schedule-guide', 'snezhnaya-version-guide', 'lunar-reaction-guide'],
  starrail: ['banner-schedule-guide', 'v4-4-preview-guide', 'fate-collab-guide'],
  wuwa: ['v3-7-live-route', 'banner-schedule-guide', 'farming-route-guide'],
  nte: ['photo-mode-guide', 'damage-formula', 'boss-guide'],
  zzz: ['banner-schedule-guide', 'team-building-guide', 'meta-teams-v3-guide'],
  guihuan: ['beginner-guide', 'download-install-guide', 'spirit-build-guide'],
  ananta: ['beginner-guide', 'download-install-guide', 'combat-system-guide'],
  endfield: ['danqingdu-cn-update-guide', 'blueprint-aic-factory-guide', 'pioneer-test-post-test-route'],
  sea: ['open-beta-version-center', 'launch-day-guide', 'download-install-guide'],
  skjh: ['week-one-live-ops-overview', 'anti-cheat-reporting-guide', 'custom-mode-community-server-guide'],
  roco: ["global-cn-content-roadmap","cbt-registration-guide","starter-guide","what-is-roco-kingdom","platforms-and-download-guide","jinies-guide","battle-system-guide","co-op-and-social-guide","pre-registration-rewards-faq","is-roco-kingdom-free-to-play","roco-kingdom-release-date-guide","roco-kingdom-vs-pokemon","roco-kingdom-crossplay-guide"],
  'roco-cn': ['daily-events-merchant-guide', 'redeem-codes-cn', 's2-season-guide', 'starter-guide-cn'],
  aniimo: ['s1-new-player-route', 'rainbow-aniimo-guide', 'homeland-resource-guide', 'map-regions', 'codes-rewards'],
  'azur-promilia': ['official-information-checklist'],
};

const SEA_DECISION_LINKS: Array<{
  id: string;
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
}> = [
  {
    id: 'positioning',
    href: '/sea/guides/what-is-forgotten-sea',
    label: {
      zh: '先看它是什么游戏',
      en: 'What kind of game is it?',
      ja: 'まずゲーム定位を見る',
    },
    description: {
      zh: '先解决“是不是 MMO、是不是纯抽卡、适不适合我”这些高频误解。',
      en: 'Clear up the MMO, gacha, and player-fit questions before going deeper.',
      ja: 'MMOなのか、ガチャ中心なのか、自分向きかを先に整理します。',
    },
  },
  {
    id: 'launch',
    href: '/sea/guides/launch-day-guide',
    label: {
      zh: '今天开服先做什么',
      en: 'What to do on launch day',
      ja: '開服日に何をするか',
    },
    description: {
      zh: '把平台、福利、黑券自选、首日路线和常见问题集中看完。',
      en: 'Review platform, rewards, selector choices, day-one routing, and key FAQs.',
      ja: 'プラットフォーム、配布、初日ルート、FAQをまとめて確認できます。',
    },
  },
  {
    id: 'economy',
    href: '/sea/guides/good-gold-bricks-farming-guide',
    label: {
      zh: '零氪先看交易系统',
      en: 'Start with the trade market',
      ja: '無課金は交易所から',
    },
    description: {
      zh: '这是遗忘之海最有差异化的内容，先看好金砖、交易逻辑和搬砖思路。',
      en: 'The trade economy is the clearest differentiator, so start with bricks, pricing, and routes.',
      ja: '好金砖、価格変動、金策ルートを先に押さえて差別化要素を理解できます。',
    },
  },
  {
    id: 'comparison',
    href: '/sea/guides/vs-sea-of-thieves-guide',
    label: {
      zh: '和竞品到底怎么选',
      en: 'How it compares',
      ja: '競合作とどう違うか',
    },
    description: {
      zh: '如果你在犹豫遗忘之海、盗贼之海或 Aniimo，这里先帮你快速做决定。',
      en: 'Use the comparison pages if you are choosing between Sea of Remnants, Sea of Thieves, or Aniimo.',
      ja: 'Sea of Thieves や Aniimo と迷っている人向けの判断入口です。',
    },
  },
  {
    id: 'decision-tools',
    href: '/sea/calculator',
    label: {
      zh: '黑券与首周资源工具',
      en: 'Selector and resource tools',
      ja: '黒券と初週リソース',
    },
    description: {
      zh: '先算首次记忆重逢该选谁，再把体力、周常打捞、好金砖和外观预算拆成首周路线。',
      en: 'Pick your first Memory Reunion crew, then split stamina, weekly dredging, Good Gold Bricks, and outfit budget into a week-one route.',
      ja: '初回黒券候補を決め、スタミナ、週課、好金砖、衣装予算を初週ルートに配分します。',
    },
  },
];

const SKJH_DECISION_LINKS: Array<{
  id: string;
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
}> = [
  {
    id: 'week-one',
    href: '/skjh/guides/week-one-live-ops-overview',
    label: {
      zh: '先看首周重点',
      en: 'Start with week-one routing',
      ja: 'まず首週の重点を見る',
    },
    description: {
      zh: '把反作弊、换服、自定义模式和电力四个最真实的问题先分清。',
      en: 'Separate anti-cheat, server switching, custom mode, and electricity before going deeper.',
      ja: '反作弊、鯖移動、カスタム、電力の4つを先に整理します。',
    },
  },
  {
    id: 'anti-cheat',
    href: '/skjh/guides/anti-cheat-reporting-guide',
    label: {
      zh: '先判断环境问题',
      en: 'Check environment risk first',
      ja: 'まず環境リスクを見る',
    },
    description: {
      zh: '外挂、非法组队和举报边界，是开服后一周最强的高意图需求之一。',
      en: 'Cheats, illegal teaming, and reporting rules are now one of the highest-intent needs.',
      ja: 'チート、違法チーミング、通報境界は今もっとも高意図な需要です。',
    },
  },
  {
    id: 'server-cycle',
    href: '/skjh/guides/server-wipe-cycle-guide',
    label: {
      zh: '先判断要不要换服',
      en: 'Decide whether to switch servers',
      ja: '鯖を変えるべきか判断',
    },
    description: {
      zh: '很多人不是不会玩，而是进了已经滚穿的服，先做环境判断更值。',
      en: 'Many players are not underperforming; they are simply in a rolled server.',
      ja: '下手なのではなく、進みすぎた鯖に入っただけのケースが多いです。',
    },
  },
  {
    id: 'resource-calculator',
    href: '/skjh/calculator',
    label: {
      zh: '先算领地和抄家成本',
      en: 'Calculate upkeep and raid costs',
      ja: '維持費とレイドを計算',
    },
    description: {
      zh: '领地柜维护、石墙地基、金属门、硫磺和烧矿收益适合先用工具算清楚。',
      en: 'Use the tool for territory upkeep, stone bases, metal doors, sulfur, and smelting returns.',
      ja: '領地維持、石壁、金属扉、硫黄、精錬収益を先に計算できます。',
    },
  },
  {
    id: 'custom-mode',
    href: '/skjh/guides/custom-mode-community-server-guide',
    label: {
      zh: '看自定义模式前景',
      en: 'Track custom mode next',
      ja: 'カスタムモードを見る',
    },
    description: {
      zh: '社区服、教学服和活动服已经从采访概念走向服主招募，值得提早占位。',
      en: 'Community and creator servers have moved from interview talk to host recruitment.',
      ja: 'コミュニティ鯖は構想から募集段階へ進み、早めの導線価値があります。',
    },
  },
];

const ROCO_ACTION_LINKS: Record<'roco' | 'roco-cn', Array<{
  id: string;
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
}>> = {
  roco: [],
  'roco-cn': [
    {
      id: 'season',
      href: '/roco-cn/events',
      label: {
        zh: '活动日历',
        en: 'Events calendar',
        ja: 'イベント日程',
      },
      description: {
        zh: '按进行中、即将开始和已结束查看 S2、兑换码和限时奖励。',
        en: 'Check S2, codes, and limited rewards by live, upcoming, and ended status.',
        ja: 'S2、コード、限定報酬を開催中・近日開始・終了で確認します。',
      },
    },
    {
      id: 'codes',
      href: '/roco-cn/redeem-codes',
      label: {
        zh: '兑换码查漏补缺',
        en: 'Redeem code checklist',
        ja: '交換コード確認',
      },
      description: {
        zh: '把仍可用、可能过期和需要复核的奖励码单独处理。',
        en: 'Separate active, possibly expired, and needs-review reward codes.',
        ja: '有効、期限切れ候補、要確認のコードを分けて確認します。',
      },
    },
    {
      id: 'starter',
      href: '/roco-cn/type-chart',
      label: {
        zh: '属性克制速查',
        en: 'Type matchup chart',
        ja: 'タイプ相性早見',
      },
      description: {
        zh: '打 BOSS、PVP 和抓宠前，先查当前国服属性克制关系。',
        en: 'Check CN matchups before bosses, PvP, and catching routes.',
        ja: 'ボス、PvP、捕獲ルート前に中国版のタイプ相性を確認します。',
      },
    },
    {
      id: 'map',
      href: '/roco-cn/merchant',
      label: {
        zh: '地图、商人和资源点',
        en: 'Map, merchants, and resources',
        ja: 'マップ・商人・資源',
      },
      description: {
        zh: '当前先承接地图和资源点需求，后续可继续拆出商人刷新专题。',
        en: 'Capture map and resource needs now, then split merchant rotations later.',
        ja: 'まず地図と資源需要を受け、後で商人更新を分離できます。',
      },
    },
  ],
};

type RocoGameId = keyof typeof ROCO_ACTION_LINKS;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS.guides?.[locale] ?? 'Guides';
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/guides`, LOCALES);

  const desc = (gameId === 'roco' ? ROCO_LIST_REVIEW.guides[locale].description : GUIDE_DESC[gameId]?.[locale]) ?? `${gameName} ${categoryLabel} with beginner tips, builds, teams, and practical walkthroughs`;
  const title = gameId === 'genshin'
    ? locale === 'zh'
      ? '原神攻略大全 — 当前祈愿、Nod-Krai、月反应、配队与材料'
      : locale === 'ja'
        ? '原神攻略 — バナー、Nod-Krai、月反応、編成、素材'
        : 'Genshin Guides — Current Banner, Nod-Krai, Lunar Reactions & Builds'
    : gameId === 'wuwa'
      ? locale === 'zh'
        ? '鸣潮攻略大全 — 当前卡池、声骸、体力、配队与材料'
        : locale === 'ja'
          ? '鳴潮攻略 — バナー、エコー、スタミナ、編成、素材'
          : 'WuWa Guides — Next Banner, Echo Builds, Farming & Materials'
      : gameId === 'roco'
        ? ROCO_LIST_REVIEW.guides[locale].title
      : gameId === 'roco-cn'
        ? locale === 'zh'
          ? '洛克王国世界国服攻略 — S2活动、兑换码、地图与精灵'
          : locale === 'ja'
            ? 'ロコキングダム中国版攻略 — S2イベント・コード・地図'
            : 'Roco Kingdom CN Guides — S2 Events, Codes, Map & Jinies'
      : gameId === 'starrail'
    ? locale === 'zh'
      ? '崩坏：星穹铁道攻略大全 — 当前跃迁、Fate联动、配队与养成'
      : locale === 'ja'
        ? '崩壊：スターレイル攻略 — バナー、Fate、編成、育成'
        : 'Honkai: Star Rail Guides — Banner Schedule, Fate Collab, Teams & Builds'
    : locale === 'zh'
      ? `${gameName}攻略大全 — 新手指南/配队/角色攻略`
      : locale === 'ja'
        ? `${gameName}攻略百科 — ガイド一覧`
        : `${gameName} Guides — Builds, Teams & Tips`;

  const description = gameId === 'roco' ? desc : ensureMetaLength(desc, locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/guides`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  if (gameId === 'hi3') {
    const { guides } = await getGuideListData(gameId, locale);
    const copy = {
      zh: { title: '崩坏3版本与回归攻略', intro: '先读版本总览了解本站收录范围，再按自己的进度选择新手回归路线或资源核对清单。资料参考全球服 9.0 公告；当前活动、补给和奖励请核对对应服务器的客户端。', version: '版本档案', download: '官网与下载安装', updated: '资料更新' },
      en: { title: 'HI3 Version and Returnee Guides', intro: 'Start with the version overview, then choose the new/returning Captain route or resource checklist for your progress. Coverage references global v9.0 notices; verify current events, supplies, and rewards in your server’s client.', version: 'Version archive', download: 'Official site and installation', updated: 'Updated' },
      ja: { title: '崩壊3rd バージョン・復帰ガイド', intro: 'まずバージョン総覧で収録範囲を確認し、進行に合わせて初心者・復帰ルートや資源チェックへ進みます。グローバルVer.9.0告知を参照し、現在のイベント、補給、報酬は該当サーバーのゲーム内で確認してください。', version: 'バージョン資料', download: '公式サイト・インストール', updated: '資料更新' },
    }[locale];
    return (
      <div>
        <h1 className="mb-3 text-2xl font-bold text-game-text">{copy.title}</h1>
        <p className="mb-6 max-w-3xl text-sm leading-7 text-game-text-muted">{copy.intro}</p>
        <nav className="mb-8 flex flex-wrap gap-4 text-sm font-medium text-game-primary">
          <Link href="/hi3/version">{copy.version}</Link>
          <Link href="/hi3/download">{copy.download}</Link>
        </nav>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide.id} href={`/hi3/guides/${guide.id}`} className="rounded-lg border border-game-border bg-game-surface p-5 transition-colors hover:border-game-primary focus-visible:outline-2 focus-visible:outline-game-primary">
              <span className="text-xs font-medium text-game-primary">{guide.categoryLabel}</span>
              <h2 className="mt-2 text-lg font-semibold text-game-text">{guide.title}</h2>
              <p className="mt-3 text-sm leading-6 text-game-text-muted">{guide.summary}</p>
              {guide.updatedAt && <p className="mt-4 text-xs text-game-text-muted">{copy.updated}: <time dateTime={guide.updatedAt}>{guide.updatedAt}</time></p>}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'wuwa') {
    return await WuWaGuides({ locale, gameId });
  }

  if (gameId === 'zzz') {
    return await ZzzGuides({ locale, gameId });
  }

  if (gameId === 'guihuan') {
    return await GuihuanGuides({ locale, gameId });
  }

  if (gameId === 'ananta') {
    return await AnantaGuides({ locale, gameId });
  }

  if (gameId === 'endfield') {
    return await EndfieldGuides({ locale, gameId });
  }

  if (gameId === 'sea') {
    return await SeaGuides({ locale, gameId });
  }

  if (gameId === 'skjh') {
    return await SkjhGuides({ locale, gameId });
  }

  if (gameId === 'roco' || gameId === 'roco-cn') {
    return await RocoGuides({ locale, gameId });
  }

  // Unsupported games
  if (gameId !== 'nte' && gameId !== 'genshin' && gameId !== 'starrail') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
            Coming Soon
          </div>
        </div>
      </div>
    );
  }

  if (gameId === 'starrail') {
    return await StarRailGuides({ locale, gameId });
  }

  if (gameId === 'genshin') {
    return await GenshinGuides({ locale, gameId });
  }

  return await NteGuides({ locale, gameId });
}

async function GenshinGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.genshin;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.genshin ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/genshin/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
                <GuideFreshnessMeta guide={guide} locale={locale} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/genshin/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <GuideFreshnessMeta guide={guide} locale={locale} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

async function StarRailGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.starrail;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.starrail ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '崩坏：星穹铁道攻略大全' : locale === 'ja' ? '崩壊：スターレイル攻略' : 'Honkai: Star Rail Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略，覆盖当前跃迁、Fate 联动、配队、遗器、光锥和养成路线。`
          : locale === 'ja'
          ? `${guides.length} 件のガイド。現在跳躍、Fate連動、編成、遺物、光円錐、育成を整理。`
          : `${guides.length} guides covering banner schedule, Fate collab, teams, relics, Light Cones, and progression.`}
      </p>
      <section className="mb-6 grid gap-2 md:grid-cols-3">
        {[
          {
            href: '/starrail/guides/banner-schedule-guide',
            title: locale === 'zh' ? '当前跃迁与下期卡池' : locale === 'ja' ? '現在跳躍と次回バナー' : 'Current Warp and Next Banner',
            description: locale === 'zh' ? '先看当前、下期、复刻和星琼预算。' : locale === 'ja' ? '現在、次回、復刻、星玉予算を確認。' : 'Check current banners, next banners, reruns, and Stellar Jade budget.',
          },
          {
            href: '/starrail/guides/fate-collab-guide',
            title: locale === 'zh' ? 'Fate 联动攻略' : locale === 'ja' ? 'Fate連動ガイド' : 'Fate Collab Guide',
            description: locale === 'zh' ? '把联动角色、预算和复刻风险单独规划。' : locale === 'ja' ? '連動キャラ、予算、復刻リスクを整理。' : 'Plan collab characters, budget, and rerun risk separately.',
          },
          {
            href: '/starrail/teams',
            title: locale === 'zh' ? '配队模拟器' : locale === 'ja' ? '編成ツール' : 'Team Builder',
            description: locale === 'zh' ? '按角色和队伍缺口继续搭队。' : locale === 'ja' ? 'キャラと不足枠から編成を作る。' : 'Build teams around characters and account gaps.',
          },
        ].map((link) => (
          <Link key={link.href} href={link.href as '/'} className="rounded-md border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
            <span className="mb-1 block text-sm font-semibold text-game-text">{link.title}</span>
            <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description}</span>
          </Link>
        ))}
      </section>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/starrail/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
                <GuideFreshnessMeta guide={guide} locale={locale} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/starrail/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <GuideFreshnessMeta guide={guide} locale={locale} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

async function NteGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.nte;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.nte ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/${gameId}/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/${gameId}/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Wuthering Waves Guides ---

async function WuWaGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.wuwa;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.wuwa ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/wuwa/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
                <GuideFreshnessMeta guide={guide} locale={locale} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/wuwa/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <GuideFreshnessMeta guide={guide} locale={locale} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- ZZZ Guides ---

async function ZzzGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.zzz;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.zzz ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/zzz/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/zzz/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Guides ---

async function GuihuanGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.guihuan;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.guihuan ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guihuan/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/guihuan/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ananta Guides ---

async function AnantaGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.ananta;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.ananta ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/ananta/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/ananta/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Endfield Guides ---

async function EndfieldGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.endfield;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.endfield ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '版本热词入口' : locale === 'ja' ? 'バージョン注目' : 'Version hot topics'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/endfield/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/endfield/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Sea of Remnants Guides ---

async function SeaGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.sea;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.sea ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      <section className="mb-8 rounded-2xl border border-game-border bg-game-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '先按决策入口看' : locale === 'ja' ? '目的別ショートカット' : 'Start with decision hubs'}
            </h2>
            <p className="mt-1 text-sm text-game-text-muted">
              {locale === 'zh'
                ? '遗忘之海现在最重要的不是把页面全点一遍，而是先解决认知、开荒、交易和对比这四类问题。'
                : locale === 'ja'
                ? 'まずは認知、序盤、交易、比較の4つから入ると迷いません。'
                : 'The fastest path is to settle positioning, launch planning, trading, and comparisons first.'}
            </p>
          </div>
          <span className="text-xs text-game-text-muted">
            {locale === 'zh' ? '高意图入口' : locale === 'ja' ? '高意図導線' : 'High-intent shortcuts'}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SEA_DECISION_LINKS.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className="group rounded-xl border border-game-border bg-game-surface-alt p-4 transition-all hover:border-game-primary hover:shadow-lg"
            >
              <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                {entry.label[locale]}
              </h3>
              <p className="text-sm leading-relaxed text-game-text-muted">
                {entry.description[locale]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '先看认知澄清 + 开荒 + 交易' : locale === 'ja' ? '認知整理と序盤導線を優先' : 'Prioritize positioning, launch, and economy'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/sea/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
                <GuideFreshnessMeta guide={guide} locale={locale} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/sea/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <GuideFreshnessMeta guide={guide} locale={locale} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ashfall Evolution Guides ---

async function SkjhGuides({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES.skjh;
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS.skjh ?? []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      <section className="mb-8 rounded-2xl border border-game-border bg-game-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '先看首周重点问题' : locale === 'ja' ? '首週課題の重点' : 'Start with week-one decision hubs'}
            </h2>
            <p className="mt-1 text-sm text-game-text-muted">
              {locale === 'zh'
                ? '失控进化当前最重要的不是再看一遍基础开荒，而是先分清环境风险、换服判断、社区服方向和基地中期升级。'
                : locale === 'ja'
                ? '基礎開拓を繰り返すより、環境、鯖移動、コミュニティ鯖、基地中盤を先に切り分ける方が早いです。'
                : 'The fastest path is to separate environment risk, server switching, community-server direction, and midgame base upgrades.'}
            </p>
          </div>
          <span className="text-xs text-game-text-muted">
            {locale === 'zh' ? '高意图入口' : locale === 'ja' ? '高意図導線' : 'High-intent shortcuts'}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SKJH_DECISION_LINKS.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className="group rounded-xl border border-game-border bg-game-surface-alt p-4 transition-all hover:border-game-primary hover:shadow-lg"
            >
              <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                {entry.label[locale]}
              </h3>
              <p className="text-sm leading-relaxed text-game-text-muted">
                {entry.description[locale]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '优先看首周问题与运营层需求' : locale === 'ja' ? '首週の運営・環境課題を優先' : 'Prioritize week-one live-ops questions'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/skjh/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
                <GuideFreshnessMeta guide={guide} locale={locale} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/skjh/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <GuideFreshnessMeta guide={guide} locale={locale} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Roco Kingdom (Global) Guides ---

async function RocoGuides({ locale, gameId }: { locale: SupportedLocale; gameId: RocoGameId }) {
  const { guides, categories, categoryLabels } = await getGuideListData(gameId, locale);
  const gameConfig = GAMES[gameId];
  const featuredGuides = pickFeaturedGuides(guides, FEATURED_GUIDE_IDS[gameId] ?? []);
  const actionLinks = ROCO_ACTION_LINKS[gameId];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {gameId === 'roco' ? ROCO_LIST_REVIEW.guides[locale].title : CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {gameId === 'roco' && <aside data-roco-list-review="guides" className="mb-6 rounded-md border border-game-border bg-game-surface p-4 text-sm leading-relaxed text-game-text-muted">{ROCO_LIST_REVIEW.guides[locale].notice}</aside>}

      {actionLinks.length > 0 && <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-game-text">
            {locale === 'zh' ? '今日行动入口' : locale === 'ja' ? '今日の行動入口' : 'Daily Action Hub'}
          </h2>
          <span className="text-xs text-game-text-muted">
            {locale === 'zh'
              ? '活动/地图/奖励先分流'
              : locale === 'ja'
              ? 'イベント・地図・報酬を整理'
              : 'Route events, map, and rewards'}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actionLinks.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href as '/'}
              className="group rounded-md border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary"
            >
              <span className="mb-1 block text-sm font-semibold text-game-text group-hover:text-game-primary">
                {entry.label[locale]}
              </span>
              <span className="line-clamp-3 text-xs leading-relaxed text-game-text-muted">
                {entry.description[locale]}
              </span>
            </Link>
          ))}
        </div>
      </section>}

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-game-text">
              {locale === 'zh' ? '热门攻略' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}
            </h2>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '先看热门攻略' : locale === 'ja' ? '注目ガイドを優先' : 'Start with featured guides'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/${gameId}/guides/${guide.id}`}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                    {guide.categoryLabel}
                  </span>
                  <span className="text-xs text-game-text-muted">{guide.tags[0] ?? 'Guide'}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
                <GuideFreshnessMeta guide={guide} locale={locale} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {categoryLabels[cat] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {categoryLabels[cat] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/${gameId}/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {guide.title}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {guide.summary}
                  </p>
                  <GuideFreshnessMeta guide={guide} locale={locale} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {guide.categoryLabel}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function GuideFreshnessMeta({ guide, locale }: { guide: unknown; locale: SupportedLocale }) {
  const updatedAt = getEntryUpdatedAt(guide);
  const currentVersion = getEntryCurrentVersion(guide);
  if (isContentUnderReview(guide)) return <div data-guide-review={isEditorialProposalArchive(guide) ? 'editorial_proposal_archive' : 'verification_checklist'} className="mt-3 flex flex-wrap gap-1.5 text-xs text-game-text-muted">
    <span className="rounded bg-game-surface-alt px-2 py-0.5">{isEditorialProposalArchive(guide)
      ? { zh: '非官方编辑设想归档', en: 'Unofficial proposal archive', ja: '非公式提案の保存' }[locale]
      : { zh: '编辑核验清单（非官方确认）', en: 'Editorial checklist (not confirmation)', ja: '編集確認リスト（公式確認ではありません）' }[locale]}</span>
    {updatedAt && <span>{ { zh: '原文日期', en: 'Original article date', ja: '原文の日付' }[locale]} {updatedAt}</span>}
  </div>;
  if (!updatedAt && !currentVersion) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-game-text-muted">
      {updatedAt && (
        <span className="rounded bg-game-surface-alt px-2 py-0.5">
          {locale === 'zh' ? '更新' : locale === 'ja' ? '更新' : 'Updated'} {updatedAt}
        </span>
      )}
      {currentVersion && (
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {locale === 'zh' ? '版本' : locale === 'ja' ? 'Ver.' : 'Version'} {currentVersion}
        </span>
      )}
    </div>
  );
}

function pickFeaturedGuides<T extends { id: string }>(guides: T[], featuredIds: string[]): T[] {
  const guideMap = new Map(guides.map((guide) => [guide.id, guide] as const));
  return featuredIds.map((id) => guideMap.get(id)).filter((guide): guide is T => Boolean(guide));
}

import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { ClientMarkdown } from '@/components/wiki/client-markdown';
import { buildGuideJsonLd } from '@/lib/jsonld';
import { buildLocalizedAlternates, ensureMetaLength, getEntryUpdatedAt, hasLocalizedContent } from '@/lib/seo-metadata';
import { BANNER_INTENT_PANELS } from '@/lib/banner-intent';

export const dynamicParams = false;

type LocalizedText = Partial<Record<SupportedLocale, string>>;

type GuideLike = {
  id: string;
  title?: string;
  titleEn?: string;
  category: string;
  categoryZh?: string;
  categoryEn?: string;
  summary?: string;
  summaryEn?: string;
  content?: string;
  contentEn?: string;
  tags?: string[];
  faq?: Array<Record<string, string>>;
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: LocalizedText;
  serpDescription?: LocalizedText;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
};

type GuideRuntime = {
  guides: GuideLike[];
  categories: Record<string, Partial<Record<SupportedLocale, string>>>;
  getById: (id: string) => GuideLike | undefined;
  getTitle: (guide: GuideLike, locale: SupportedLocale) => string;
  getSummary: (guide: GuideLike, locale: SupportedLocale) => string;
  getContent: (guide: GuideLike, locale: SupportedLocale) => string;
  getCategory: (guide: GuideLike, locale: SupportedLocale) => string;
  getFaqQuestion: (faq: Record<string, string>, locale: SupportedLocale) => string;
  getFaqAnswer: (faq: Record<string, string>, locale: SupportedLocale) => string;
};

type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

type QuickAnswer = {
  heading: Record<SupportedLocale, string>;
  points: Record<SupportedLocale, string[]>;
};

const GUIDE_QUICK_ANSWERS: Partial<Record<GameId, Record<string, QuickAnswer>>> = {
  genshin: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前祈愿、下期卡池和复刻', en: 'Quick answer: check current banner, next banner, and reruns first', ja: '要点：現在、次回、復刻バナーを先に確認' },
      points: {
        zh: ['当前角色池、下期祈愿和复刻预测要一起看。', '抽卡前先确认保底、原石预算和后续版本目标。', '如果只能覆盖一次大保底，优先保证真正补队伍缺口的角色。'],
        en: ['Use this page to compare the current Genshin banner, next banner, upcoming banners, and rerun timing in one place.', 'Before pulling, check pity, guarantee status, Primogem budget, and future version targets.', 'If you only have one full guarantee, prioritize the character that fixes a real team gap.'],
        ja: ['現在、次回、復刻予想を同じ場所で確認します。', '引く前に天井、保証、原石、次版本目標を確認します。', '天井一回分なら編成不足を解決するキャラを優先します。'],
      },
    },
    'cross-game-comparison-guide': {
      heading: { zh: '快速结论：按玩法而不是热度选游戏', en: 'Quick answer: choose by playstyle, not hype', ja: '要点：流行より遊び方で選ぶ' },
      points: {
        zh: ['想探索大世界，优先原神或鸣潮。', '想省时间和回合策略，优先崩铁。', '想要快节奏动作和都市风格，优先绝区零。'],
        en: ['Pick Genshin or WuWa if open-world exploration matters most.', 'Pick HSR if you want turn-based strategy and lower daily time.', 'Pick ZZZ if you want fast action combat and a compact urban style.'],
        ja: ['探索重視なら原神か鳴潮が向きます。', '時短とターン制ならスターレイルが安定です。', '高速アクションと都市感ならZZZが向きます。'],
      },
    },
  },
  starrail: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前跃迁、下期和复刻', en: 'Quick answer: check current warp, next banner, and reruns first', ja: '要点：現在、次回、復刻を先に確認' },
      points: {
        zh: ['当前跃迁、下期复刻和 Fate/联动目标要一起规划。', '抽卡前先算星琼、大小保底和光锥风险。', '资源有限时只保一个角色目标，光锥放后面。'],
        en: ['Compare the current warp, next banner, reruns, and Fate/collab targets together.', 'Before pulling, calculate Stellar Jade, guarantee state, and Light Cone risk.', 'With limited resources, secure one character target first and delay Light Cones.'],
        ja: ['現在跳躍、次回、復刻、Fate/コラボ目標を一緒に計画します。', '星玉、保証、光円錐リスクを先に計算します。', '資源が少ない時はキャラ一人を優先します。'],
      },
    },
    'fate-collab-guide': {
      heading: { zh: '快速结论：Fate 目标要单独留预算', en: 'Quick answer: reserve Fate budget separately', ja: '要点：Fate予算は分けて確保' },
      points: {
        zh: ['联动目标不要和普通复刻混成一个预算。', '先领奖励和兑换码，再算星琼缺口。', '追光锥前先确认角色保底是否安全。'],
        en: ['Do not mix collab targets and normal reruns into one loose budget.', 'Claim rewards and codes before calculating the Jade gap.', 'Check character guarantee before chasing Light Cones.'],
        ja: ['コラボ目標と通常復刻を同じ予算に混ぜない。', '報酬とコードを先に回収して星玉不足を計算。', '光円錐前にキャラ保証を確認。'],
      },
    },
  },
  wuwa: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前卡池、下期和复刻', en: 'Quick answer: check current banner, next banner, and reruns first', ja: '要点：現在、次回、復刻を先に確認' },
      points: {
        zh: ['当前 UP、下期目标和复刻预测要一起看。', '角色池和武器池保底分开计算。', '星声紧张时先保角色，再追武器。'],
        en: ['Compare current rate-ups, next targets, and rerun timing together.', 'Track character pity and weapon pity separately.', 'If Astrite is tight, secure the character before chasing weapons.'],
        ja: ['現在UP、次回目標、復刻予想を一緒に確認。', 'キャラ天井と武器天井は分けて計算。', '星声が少ない時はキャラ優先。'],
      },
    },
    'cross-game-comparison-guide': {
      heading: { zh: '快速结论：按玩法而不是热度选游戏', en: 'Quick answer: choose by playstyle, not hype', ja: '要点：流行より遊び方で選ぶ' },
      points: {
        zh: ['想探索大世界，优先原神或鸣潮。', '想省时间和回合策略，优先崩铁。', '想要快节奏动作和都市风格，优先绝区零。'],
        en: ['Pick Genshin or WuWa if open-world exploration matters most.', 'Pick HSR if you want turn-based strategy and lower daily time.', 'Pick ZZZ if you want fast action combat and compact sessions.'],
        ja: ['探索重視なら原神か鳴潮。', '時短とターン制ならHSR。', '高速アクションならZZZ。'],
      },
    },
  },
  zzz: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前调频、下期与复刻', en: 'Quick answer: check current, next, and upcoming ZZZ banners first', ja: '要点：現在、次回、復刻バナーを先に確認' },
      points: {
        zh: ['当前代理人频道、下期卡池和复刻节点要放在同一条抽卡路线里。', '抽卡前先确认专属频道保底、音擎保底、菲林预算和队伍缺口。', '资源有限时先保代理人，再考虑专属音擎。'],
        en: ['Compare the current ZZZ banner, next banner, upcoming banners, and likely reruns before spending Polychromes.', 'Check agent pity, W-Engine pity, guarantee status, and team needs together.', 'If resources are tight, secure the agent first and treat signature W-Engines as optional upgrades.'],
        ja: ['現在、次回、復刻予想を同じ計画で確認します。', '代理人天井、音擎天井、菲林、編成不足をまとめて見ます。', '資源が少ない場合は代理人を先に確保します。'],
      },
    },
  },
  nte: {
    'photo-mode-guide': {
      heading: { zh: '快速结论：先会开相机，再调滤镜和拍照点', en: 'Quick answer: open camera first, then tune filters and spots', ja: '要点：カメラ、フィルター、撮影地の順' },
      points: {
        zh: ['先确认拍照入口、HUD 和基础操作。', '再调滤镜、姿势、时间、天气和景深。', '最后去找 Hethereau 城市和角色拍照点。'],
        en: ['Confirm camera access, HUD, and basic controls first.', 'Then tune filters, poses, time, weather, and depth of field.', 'Finally look for Hethereau city and character photo spots.'],
        ja: ['まずカメラ入口、HUD、基本操作を確認。', '次にフィルター、ポーズ、時間、天気、被写界深度。', '最後に撮影スポットを探します。'],
      },
    },
  },
};

const GUIDE_NEXT_STEPS: Partial<Record<GameId, Record<string, NextStepLink[]>>> = {
  genshin: {
    'banner-schedule-guide': [
      { href: '/genshin/guides/luna-viii-sandrone-guide', label: { zh: 'Luna VIII 专题', en: 'Luna VIII guide', ja: 'Luna VIII特集' }, description: { zh: '继续看版本、角色和活动路线。', en: 'Continue into version, character, and event routing.', ja: '版本、キャラ、イベントへ。' } },
      { href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '抽卡前先补资源。', en: 'Claim resources before pulling.', ja: 'ガチャ前に資源を回収。' } },
    ],
  },
  starrail: {
    'banner-schedule-guide': [
      { href: '/starrail/guides/himeko-nova-fate-pull-plan', label: { zh: 'Fate 抽卡规划', en: 'Fate pull plan', ja: 'Fateガチャ計画' }, description: { zh: '把当前跃迁和联动预算放一起。', en: 'Connect current warps with collab budget.', ja: '現在跳躍とコラボ予算を接続。' } },
      { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先领码再算星琼。', en: 'Claim codes before calculating Jade.', ja: 'コード後に星玉計算。' } },
    ],
    'fate-collab-guide': [
      { href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current warps', ja: '現在跳躍' }, description: { zh: '回到 v4.4 当前卡池算预算。', en: 'Return to v4.4 banners for budget checks.', ja: 'v4.4バナーで予算確認。' } },
      { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '补齐联动前资源。', en: 'Top up resources before collab pulls.', ja: 'コラボ前に資源補充。' } },
    ],
  },
  wuwa: {
    'banner-schedule-guide': [
      { href: '/wuwa/guides/v3-5-preview-guide', label: { zh: 'v3.5 专题', en: 'v3.5 guide', ja: 'v3.5特集' }, description: { zh: '当前版本角色、平台和活动入口。', en: 'Current version characters, platforms, and events.', ja: '現在版本のキャラ、平台、イベント。' } },
      { href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '抽前先补星声。', en: 'Claim Astrite before pulling.', ja: 'ガチャ前に星声を回収。' } },
    ],
    'echo-advanced-guide': [
      { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '先确认要养谁。', en: 'Confirm who you are building first.', ja: '育成対象を確認。' } },
      { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' }, description: { zh: '把声骸和队伍连起来。', en: 'Connect Echoes with team builds.', ja: 'エコーと編成を接続。' } },
    ],
    'farming-guide': [
      { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '按目标角色安排体力。', en: 'Spend stamina around target characters.', ja: '目標キャラでスタミナ配分。' } },
      { href: '/wuwa/guides/echo-advanced-guide', label: { zh: '声骸攻略', en: 'Echo guide', ja: 'エコー攻略' }, description: { zh: '材料刷完再追声骸。', en: 'Move into Echoes after core materials.', ja: '素材後にエコーへ。' } },
    ],
  },
  zzz: {
    'banner-schedule-guide': [
      { href: '/zzz/version', label: { zh: 'v3.1 专题', en: 'v3.1 hub', ja: 'v3.1特集' }, description: { zh: '当前代理人、奖励和平台入口。', en: 'Current agents, rewards, and platform routes.', ja: '現在代理人、報酬、平台。' } },
      { href: '/zzz/guides/w-engine-guide', label: { zh: '音擎指南', en: 'W-Engine guide', ja: '音動機攻略' }, description: { zh: '抽到代理人后再看。', en: 'Open after securing the agent.', ja: '代理人確保後に確認。' } },
    ],
    'steam-3-0-start-guide': [
      { href: '/zzz/version', label: { zh: 'v3.1 当前专题', en: 'Live v3.1 hub', ja: 'v3.1特集' }, description: { zh: '先走当前版本入口。', en: 'Start from the current version route.', ja: '現在版本から開始。' } },
      { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '新号先领资源。', en: 'Claim starter resources first.', ja: '新規資源を回収。' } },
    ],
    'w-engine-guide': [
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '先确认代理人是否到手。', en: 'Check whether the agent is secured.', ja: '代理人確保を確認。' } },
      { href: '/zzz/guides/drive-disc-guide', label: { zh: '驱动盘', en: 'Drive Discs', ja: 'ドライブ' }, description: { zh: '武器和装备一起看。', en: 'Read weapons with gear.', ja: '武器と装備を一緒に。' } },
    ],
    'drive-disc-guide': [
      { href: '/zzz/guides/w-engine-guide', label: { zh: '音擎指南', en: 'W-Engine guide', ja: '音動機攻略' }, description: { zh: '配装和武器一起看。', en: 'Read gear and weapons together.', ja: '装備と武器を一緒に。' } },
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '按当前代理人决定刷取。', en: 'Farm around current agents.', ja: '現在代理人で厳選判断。' } },
    ],
  },
  nte: {
    'photo-mode-guide': [
      { href: '/nte/version', label: { zh: '版本专题', en: 'Version hub', ja: '版本特集' }, description: { zh: '回到 v1.2 当前内容。', en: 'Return to current v1.2 content.', ja: 'v1.2内容へ戻る。' } },
      { href: '/nte/map', label: { zh: '地图', en: 'Map', ja: 'マップ' }, description: { zh: '找城市区域和拍照点。', en: 'Find city zones and photo spots.', ja: '都市区域と撮影地へ。' } },
    ],
  },
};

const GUIDE_FALLBACK_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  genshin: [
    { href: '/genshin/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看抽卡和资源规划。', en: 'Continue with pull and resource planning.', ja: 'ガチャと資源計画へ。' } },
    { href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先补可领取资源。', en: 'Claim available resources.', ja: '資源を回収。' } },
  ],
  starrail: [
    { href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current warps', ja: '現在跳躍' }, description: { zh: '继续看星琼规划。', en: 'Continue with Jade planning.', ja: '星玉計画へ。' } },
    { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先领版本资源。', en: 'Claim patch resources.', ja: '版本資源を回収。' } },
  ],
  wuwa: [
    { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看星声和角色目标。', en: 'Continue with Astrite and targets.', ja: '星声と目標へ。' } },
    { href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '抽前先补资源。', en: 'Claim resources before pulling.', ja: '資源を回収。' } },
  ],
  zzz: [
    { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看菲林规划。', en: 'Continue with Polychrome planning.', ja: 'ポリクローム計画へ。' } },
    { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先领码再抽。', en: 'Claim codes before pulling.', ja: 'コード後にガチャ。' } },
  ],
};

async function getGuideRuntime(gameId: GameId): Promise<GuideRuntime> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/guides');
      return makeRuntime(mod.genshinGuides, mod.GENSHIN_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/guides');
      return makeRuntime(mod.starrailGuides, mod.STARRAIL_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/guides');
      return makeRuntime(mod.wuwaGuides, mod.WUWA_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/guides');
      return makeRuntime(mod.guides, mod.NTE_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/guides');
      return makeRuntime(mod.zzzGuides, mod.ZZZ_GUIDE_CATEGORIES, mod.getZzzGuideById, mod.getZzzGuideTitle, mod.getZzzGuideSummary, mod.getZzzGuideContent, mod.getZzzGuideCategory, mod.getZzzGuideFaqQuestion, mod.getZzzGuideFaqAnswer);
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/guides');
      return makeRuntime(mod.guihuanGuides, mod.GUIHUAN_GUIDE_CATEGORIES, mod.getGuihuanGuideById, mod.getGuihuanGuideTitle, mod.getGuihuanGuideSummary, mod.getGuihuanGuideContent, mod.getGuihuanGuideCategory, mod.getGuihuanGuideFaqQuestion, mod.getGuihuanGuideFaqAnswer);
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/guides');
      return makeRuntime(mod.anantaGuides, mod.ANANTA_GUIDE_CATEGORIES, mod.getAnantaGuideById, mod.getAnantaGuideTitle, mod.getAnantaGuideSummary, mod.getAnantaGuideContent, mod.getAnantaGuideCategory, mod.getAnantaGuideFaqQuestion, mod.getAnantaGuideFaqAnswer);
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/guides');
      return makeRuntime(mod.endfieldGuides, mod.ENDFIELD_GUIDE_CATEGORIES, mod.getEndfieldGuideById, mod.getEndfieldGuideTitle, mod.getEndfieldGuideSummary, mod.getEndfieldGuideContent, mod.getEndfieldGuideCategory, mod.getEndfieldGuideFaqQuestion, mod.getEndfieldGuideFaqAnswer);
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/guides');
      return makeRuntime(mod.seaGuides, mod.SEA_GUIDE_CATEGORIES, mod.getSeaGuideById, mod.getSeaGuideTitle, mod.getSeaGuideSummary, mod.getSeaGuideContent, mod.getSeaGuideCategory, mod.getSeaGuideFaqQuestion, mod.getSeaGuideFaqAnswer);
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/guides');
      return makeRuntime(mod.skjhGuides, mod.SKJH_GUIDE_CATEGORIES, mod.getSkjhGuideById, mod.getSkjhGuideTitle, mod.getSkjhGuideSummary, mod.getSkjhGuideContent, mod.getSkjhGuideCategory, mod.getSkjhGuideFaqQuestion, mod.getSkjhGuideFaqAnswer);
    }
    default:
      notFound();
  }
}

function makeRuntime(
  guides: unknown[],
  categories: Record<string, Partial<Record<SupportedLocale, string>>>,
  getById: (id: string) => unknown,
  getTitle: (guide: never, locale: SupportedLocale) => string,
  getSummary: (guide: never, locale: SupportedLocale) => string,
  getContent: (guide: never, locale: SupportedLocale) => string,
  getCategory: (guide: never, locale: SupportedLocale) => string,
  getFaqQuestion: (faq: never, locale: SupportedLocale) => string,
  getFaqAnswer: (faq: never, locale: SupportedLocale) => string,
): GuideRuntime {
  return {
    guides: guides as GuideLike[],
    categories,
    getById: (id) => getById(id) as GuideLike | undefined,
    getTitle: (guide, locale) => getTitle(guide as never, locale),
    getSummary: (guide, locale) => getSummary(guide as never, locale),
    getContent: (guide, locale) => getContent(guide as never, locale),
    getCategory: (guide, locale) => getCategory(guide as never, locale),
    getFaqQuestion: (faq, locale) => getFaqQuestion(faq as never, locale),
    getFaqAnswer: (faq, locale) => getFaqAnswer(faq as never, locale),
  };
}

export async function generateStaticParams() {
  const entries = await Promise.all(
    (Object.keys(GAMES) as GameId[]).map(async (gameId) => {
      const runtime = await getGuideRuntime(gameId);
      return LOCALES.flatMap((lang) => runtime.guides.map((guide) => ({ lang, game: gameId, slug: guide.id })));
    })
  );

  return entries.flat();
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; game: string; slug: string }> }) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (!isGameId(gameId)) return {};

  const runtime = await getGuideRuntime(gameId);
  const guide = runtime.getById(slug);
  if (!guide) return {};

  const gameName = GAMES[gameId].name[locale];
  const meta = buildGuideMeta(guide, runtime.getTitle(guide, locale), runtime.getSummary(guide, locale), gameName, locale);

  return withGuideIndexing(locale, guide, {
    ...meta,
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/guides/${slug}`, LOCALES, {
      includeLocale: (lang) => hasLocalizedContent(guide, lang),
    }),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://gachia.com/${locale}/${gameId}/guides/${slug}`,
      siteName: 'Gachia',
      images: [{ url: `https://gachia.com/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  });
}

export default async function GuideDetailPage({ params }: { params: Promise<{ lang: string; game: string; slug: string }> }) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (!isGameId(gameId)) notFound();

  const runtime = await getGuideRuntime(gameId);
  const guide = runtime.getById(slug);
  if (!guide) notFound();

  const title = runtime.getTitle(guide, locale);
  const summary = runtime.getSummary(guide, locale);
  const content = runtime.getContent(guide, locale);
  const category = runtime.getCategory(guide, locale);
  const guideTags = Array.isArray(guide.tags) ? guide.tags : [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href={`/${gameId}/guides` as '/'} className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {runtime.categories[guide.category]?.[locale] && (
          <>
            <span>{runtime.categories[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{title}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES[gameId].theme.primary }}>
        {title}
      </h1>
      {summary && (
        <p className="mb-4 max-w-4xl text-sm leading-relaxed text-game-text-muted">
          {summary}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guideTags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <BannerIntentPanel gameId={gameId} slug={slug} locale={locale} />
      <QuickAnswerSection gameId={gameId} slug={slug} locale={locale} />

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {runtime.getFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {runtime.getFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId={gameId} currentSlug={slug} locale={locale} />
      <RelatedGuidesSection runtime={runtime} gameId={gameId} current={guide} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href={`/${gameId}/guides` as '/'} className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId,
        locale,
        title,
        summary: runtime.getSummary(guide, locale),
        slug,
        tags: guideTags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: runtime.getFaqQuestion(f, locale), answer: runtime.getFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

function buildGuideMeta(guide: GuideLike, guideTitle: string, summary: string, gameName: string, locale: SupportedLocale) {
  const serpTitle = getLocalizedSeoText(guide.serpTitle, locale);
  const serpDescription = getLocalizedSeoText(guide.serpDescription, locale);
  if (serpTitle && serpDescription) {
    return { title: serpTitle, description: ensureMetaLength(serpDescription, locale) };
  }

  const titleSuffix = guideTitle.length > 45 ? '' : locale === 'zh' ? ` — ${gameName}攻略详解` : locale === 'ja' ? ` — ${gameName}攻略ガイド` : ` — ${gameName} Guide`;
  const title = `${guideTitle}${titleSuffix}`;
  const baseSummary = summary?.trim() ?? '';
  const description = baseSummary.length >= 100
    ? baseSummary.slice(0, 160)
    : locale === 'zh'
      ? `${guideTitle}是${gameName}的详细攻略，包含技巧、策略、FAQ、版本要点和实战思路。${baseSummary ? ` 额外摘要：${baseSummary}` : ''}`
      : locale === 'ja'
        ? `${guideTitle}の${gameName}攻略ガイド。Tips、戦略、FAQ、版本要点をまとめます。${baseSummary ? ` 補足: ${baseSummary}` : ''}`
        : `Complete ${guideTitle} guide for ${gameName} with tips, strategies, FAQ, version notes, and practical advice. ${baseSummary ? `Summary: ${baseSummary}` : ''}`;

  return { title, description: ensureMetaLength(description, locale) };
}

function getLocalizedSeoText(values: LocalizedText | undefined, locale: SupportedLocale) {
  return values?.[locale] ?? values?.en ?? values?.zh;
}

function getGuideUpdatedAt(guide: unknown) {
  return getEntryUpdatedAt(guide);
}

function withGuideIndexing(locale: SupportedLocale, guide: unknown, metadata: object) {
  if (!hasLocalizedContent(guide, locale)) {
    return { ...metadata, robots: { index: false, follow: true } };
  }

  return metadata;
}

function GuideFreshnessSection({ guide, locale }: { guide: GuideLike; locale: SupportedLocale }) {
  const facts = guide.quickFacts?.[locale] ?? guide.quickFacts?.en ?? guide.quickFacts?.zh ?? [];
  if (!guide.updatedAt && !guide.currentVersion && facts.length === 0) return null;

  const updatedLabel = locale === 'zh' ? '更新于' : locale === 'ja' ? '更新日' : 'Updated';
  const versionLabel = locale === 'zh' ? '当前版本' : locale === 'ja' ? '現在版本' : 'Current version';

  return (
    <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-game-text-muted">
        {guide.updatedAt && <span className="rounded bg-game-surface-alt px-2 py-1">{updatedLabel}: {guide.updatedAt}</span>}
        {guide.currentVersion && <span className="rounded bg-game-surface-alt px-2 py-1">{versionLabel}: {guide.currentVersion}</span>}
      </div>
      {facts.length > 0 && (
        <ul className="grid gap-2 text-sm leading-relaxed text-game-text-muted sm:grid-cols-2">
          {facts.map((fact) => (
            <li key={fact} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BannerIntentPanel({ gameId, slug, locale }: { gameId: GameId; slug: string; locale: SupportedLocale }) {
  if (slug !== 'banner-schedule-guide') return null;
  const panel = BANNER_INTENT_PANELS[gameId];
  if (!panel) return null;

  const checkLabel = locale === 'zh' ? '快速检查' : locale === 'ja' ? 'クイック確認' : 'Fast Checks';
  const linkLabel = locale === 'zh' ? '相关入口' : locale === 'ja' ? '関連入口' : 'Related Actions';

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-game-border bg-game-surface">
      <div className="border-b border-game-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-game-primary">
          {locale === 'zh' ? '卡池决策面板' : locale === 'ja' ? 'バナー判断パネル' : 'Banner Decision Panel'}
        </p>
        <h2 className="mb-2 text-lg font-semibold text-game-text">{panel.title[locale]}</h2>
        <p className="text-sm leading-relaxed text-game-text-muted">{panel.summary[locale]}</p>
      </div>
      <div className="grid gap-px bg-game-border md:grid-cols-[1fr_0.9fr]">
        <div className="bg-game-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-game-text">{checkLabel}</h3>
          <ul className="grid gap-2 text-sm leading-relaxed text-game-text-muted sm:grid-cols-2 md:grid-cols-1">
            {panel.checks[locale].map((check) => (
              <li key={check} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-game-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-game-text">{linkLabel}</h3>
          <div className="space-y-2">
            {panel.links.map((link) => (
              <Link key={link.href} href={link.href as '/'} className="block rounded-md border border-game-border bg-game-surface-alt p-3 transition-colors hover:border-game-primary">
                <span className="mb-1 block text-sm font-semibold text-game-text">{link.label[locale]}</span>
                <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description[locale]}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickAnswerSection({ gameId, slug, locale }: { gameId: GameId; slug: string; locale: SupportedLocale }) {
  const answer = GUIDE_QUICK_ANSWERS[gameId]?.[slug];
  if (!answer) return null;

  return (
    <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
      <h2 className="mb-3 text-base font-semibold text-game-text">{answer.heading[locale]}</h2>
      <ul className="space-y-2 text-sm leading-relaxed text-game-text-muted">
        {answer.points[locale].map((point) => (
          <li key={point} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NextStepSection({ gameId, currentSlug, locale }: { gameId: GameId; currentSlug: string; locale: SupportedLocale }) {
  const nextSteps = GUIDE_NEXT_STEPS[gameId]?.[currentSlug] ?? GUIDE_FALLBACK_NEXT_STEPS[gameId];
  if (!nextSteps?.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {nextSteps.map((step) => (
          <Link key={step.href} href={step.href as '/'} className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary">
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{step.label[locale]}</h3>
            <p className="text-xs text-game-text-muted line-clamp-2">{step.description[locale]}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedGuidesSection({ runtime, gameId, current, locale }: { runtime: GuideRuntime; gameId: GameId; current: GuideLike; locale: SupportedLocale }) {
  const currentTags = current.tags ?? [];
  const related = runtime.guides
    .filter((guide) => guide.id !== current.id)
    .map((guide) => {
      const guideTags = guide.tags ?? [];
      const sameCategory = guide.category === current.category ? 2 : 0;
      const sharedTags = guideTags.filter((tag) => currentTags.includes(tag)).length;
      return { guide, score: sameCategory + sharedTags + getGuideIntentScore(current, guide) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ guide }) => guide);

  if (related.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '相关攻略' : locale === 'ja' ? '関連ガイド' : 'Related Guides'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((guide) => (
          <Link key={guide.id} href={`/${gameId}/guides/${guide.id}` as '/'} className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary">
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{runtime.getTitle(guide, locale)}</h3>
            <p className="text-xs text-game-text-muted line-clamp-2">{runtime.getSummary(guide, locale)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function getGuideIntentScore(current: GuideLike, candidate: GuideLike) {
  const currentTerms = [current.id, current.category, ...(current.tags ?? [])].join(' ').toLowerCase();
  const candidateTerms = [candidate.id, candidate.category, ...(candidate.tags ?? [])].join(' ').toLowerCase();

  const intentGroups = [
    ['banner', 'schedule', 'wish', 'pity', 'pull', 'gacha', '祈愿', '卡池', '保底', '抽卡'],
    ['comparison', 'compare', 'vs', '对比', '横评'],
    ['farming', 'route', 'material', '材料', '路线'],
    ['team', 'meta', 'tier', 'build', '配队', '强度', '排行'],
    ['echo', 'disc', 'engine', 'weapon', 'artifact', '声骸', '驱动盘', '音擎', '武器', '圣遗物'],
  ];

  return intentGroups.reduce((score, group) => {
    const currentMatches = group.some((term) => currentTerms.includes(term));
    const candidateMatches = group.some((term) => candidateTerms.includes(term));
    return score + (currentMatches && candidateMatches ? 3 : 0);
  }, 0);
}

function isGameId(gameId: string): gameId is GameId {
  return Object.prototype.hasOwnProperty.call(GAMES, gameId);
}

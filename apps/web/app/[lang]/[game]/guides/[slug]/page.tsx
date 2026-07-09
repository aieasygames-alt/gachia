import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  getGuideById as getNteGuideById,
  getGuideTitle as getNteGuideTitle,
  getGuideContent as getNteGuideContent,
  getGuideSummary as getNteGuideSummary,
  getGuideCategory as getNteGuideCategory,
  getGuideFaqQuestion as getNteGuideFaqQuestion,
  getGuideFaqAnswer as getNteGuideFaqAnswer,
  NTE_GUIDE_CATEGORIES,
  guides as nteGuides,
} from '@gachia/data/games/nte/guides';
import {
  genshinGuides,
  getGuideById as getGenshinGuideById,
  getGuideTitle as getGenshinGuideTitle,
  getGuideContent as getGenshinGuideContent,
  getGuideSummary as getGenshinGuideSummary,
  getGuideCategory as getGenshinGuideCategory,
  getGuideFaqQuestion as getGenshinGuideFaqQuestion,
  getGuideFaqAnswer as getGenshinGuideFaqAnswer,
  GENSHIN_GUIDE_CATEGORIES,
} from '@gachia/data/games/genshin/guides';
import {
  starrailGuides,
  getGuideById as getStarRailGuideById,
  getGuideTitle as getStarRailGuideTitle,
  getGuideContent as getStarRailGuideContent,
  getGuideSummary as getStarRailGuideSummary,
  getGuideCategory as getStarRailGuideCategory,
  getGuideFaqQuestion as getStarRailGuideFaqQuestion,
  getGuideFaqAnswer as getStarRailGuideFaqAnswer,
  STARRAIL_GUIDE_CATEGORIES,
} from '@gachia/data/games/starrail/guides';
import {
  wuwaGuides,
  getGuideById as getWuWaGuideById,
  getGuideTitle as getWuWaGuideTitle,
  getGuideContent as getWuWaGuideContent,
  getGuideSummary as getWuWaGuideSummary,
  getGuideCategory as getWuWaGuideCategory,
  getGuideFaqQuestion as getWuWaGuideFaqQuestion,
  getGuideFaqAnswer as getWuWaGuideFaqAnswer,
  WUWA_GUIDE_CATEGORIES,
} from '@gachia/data/games/wuwa/guides';
import {
  zzzGuides,
  getZzzGuideById,
  getZzzGuideTitle,
  getZzzGuideContent,
  getZzzGuideSummary,
  getZzzGuideCategory,
  getZzzGuideFaqQuestion,
  getZzzGuideFaqAnswer,
  ZZZ_GUIDE_CATEGORIES,
} from '@gachia/data/games/zzz/guides';
import {
  guihuanGuides,
  getGuihuanGuideById,
  getGuihuanGuideTitle,
  getGuihuanGuideContent,
  getGuihuanGuideSummary,
  getGuihuanGuideCategory,
  getGuihuanGuideFaqQuestion,
  getGuihuanGuideFaqAnswer,
  GUIHUAN_GUIDE_CATEGORIES,
} from '@gachia/data/games/guihuan/guides';
import {
  anantaGuides,
  getAnantaGuideById,
  getAnantaGuideTitle,
  getAnantaGuideContent,
  getAnantaGuideSummary,
  getAnantaGuideCategory,
  getAnantaGuideFaqQuestion,
  getAnantaGuideFaqAnswer,
  ANANTA_GUIDE_CATEGORIES,
} from '@gachia/data/games/ananta/guides';
import type { AnantaGuide, AnantaGuideFaq } from '@gachia/data/games/ananta/guides';
import {
  endfieldGuides,
  getEndfieldGuideById,
  getEndfieldGuideTitle,
  getEndfieldGuideContent,
  getEndfieldGuideSummary,
  getEndfieldGuideCategory,
  getEndfieldGuideFaqQuestion,
  getEndfieldGuideFaqAnswer,
  ENDFIELD_GUIDE_CATEGORIES,
} from '@gachia/data/games/endfield/guides';
import type { EndfieldGuide, EndfieldGuideFaq } from '@gachia/data/games/endfield/guides';
import {
  seaGuides,
  getSeaGuideById,
  getSeaGuideTitle,
  getSeaGuideContent,
  getSeaGuideSummary,
  getSeaGuideCategory,
  getSeaGuideFaqQuestion,
  getSeaGuideFaqAnswer,
  SEA_GUIDE_CATEGORIES,
} from '@gachia/data/games/sea/guides';
import type { SeaGuide, SeaGuideFaq } from '@gachia/data/games/sea/guides';
import {
  skjhGuides,
  getSkjhGuideById,
  getSkjhGuideTitle,
  getSkjhGuideContent,
  getSkjhGuideSummary,
  getSkjhGuideCategory,
  getSkjhGuideFaqQuestion,
  getSkjhGuideFaqAnswer,
  SKJH_GUIDE_CATEGORIES,
} from '@gachia/data/games/skjh/guides';
import type { SkjhGuide, SkjhGuideFaq } from '@gachia/data/games/skjh/guides';
import { Link } from '@/lib/i18n/navigation';
import { ClientMarkdown } from '@/components/wiki/client-markdown';
import { buildGuideJsonLd } from '@/lib/jsonld';

type LocaleMeta = Partial<Record<SupportedLocale, { title: string; description: string }>>;

type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const GUIDE_META_OVERRIDES: Record<string, LocaleMeta> = {
  'genshin/banner-schedule-guide': {
    en: {
      title: 'Genshin Banner Schedule 2026: Current & Next Banners',
      description: 'Track current and upcoming Genshin Impact banners, reruns, pity rules, Primogem planning, and pull priorities for 2026.',
    },
    zh: {
      title: '原神祈愿卡池排期 2026：当前卡池与下期预测',
      description: '查看原神当前与下期祈愿卡池、复刻预测、保底规则、原石规划和抽卡优先级，帮助你决定该抽还是该存。',
    },
  },
  'starrail/banner-schedule-guide': {
    en: {
      title: 'HSR Banner Schedule 2026: Current & Next Banners',
      description: 'See Honkai: Star Rail current and next banners, rerun estimates, pity rules, Stellar Jade planning, and pull priority advice.',
    },
    zh: {
      title: '崩坏星穹铁道卡池排期 2026：当前与下期跃迁',
      description: '整理崩铁当前卡池、下期跃迁、复刻预测、保底机制、星琼规划和抽卡优先级，方便提前安排资源。',
    },
  },
  'wuwa/banner-schedule-guide': {
    en: {
      title: 'WuWa Banner Schedule 2026: Current & Next Banners',
      description: 'Follow Wuthering Waves current banners, next banners, rerun timing, pity carry-over, Astrite planning, and pull priorities.',
    },
    zh: {
      title: '鸣潮卡池排期 2026：当前卡池、下期与复刻预测',
      description: '查看鸣潮当前卡池、下期角色、复刻节奏、保底继承、星声规划和抽取优先级，适合零氪与月卡玩家。',
    },
  },
  'starrail/cross-game-comparison-guide': {
    en: {
      title: 'ZZZ vs WuWa vs Genshin vs HSR: Which Gacha to Play?',
      description: 'Compare ZZZ, Wuthering Waves, Genshin Impact, and Honkai: Star Rail by combat, grind, gacha, F2P value, story, and endgame.',
    },
    zh: {
      title: '绝区零 vs 鸣潮 vs 原神 vs 崩铁：哪款更适合你？',
      description: '从战斗、肝度、抽卡、零氪体验、剧情和终局内容对比四款热门二游，帮你选择最适合长期玩的游戏。',
    },
  },
  'starrail/fate-collab-guide': {
    en: {
      title: 'HSR Fate Collab Guide: Characters, Banners & Rewards',
      description: 'Honkai: Star Rail Fate collaboration guide covering expected characters, banners, rewards, event format, and pull planning.',
    },
    zh: {
      title: '崩铁 Fate 联动攻略：角色、卡池、奖励与抽取规划',
      description: '整理崩坏星穹铁道 Fate 联动的角色、卡池、活动奖励、玩法形式和抽取建议，方便提前规划星琼。',
    },
  },
  'endfield/crisis-contract-guide': {
    en: {
      title: 'Endfield Crisis Contract Retest: 40-45 Star Guide',
      description: 'Clear Arknights Endfield Crisis Contract Retest with 40, 42, and 45-star strategies, Etra tank setups, F2P builds, and indicators.',
    },
    zh: {
      title: '终末地危机合约重燃测试攻略：40-45星打法',
      description: '终末地危机合约重燃测试 40星、42星、45星打法，包含埃特拉主T思路、平民构筑、指标选择和奖励目标。',
    },
  },
  'nte/boss-guide-comprehensive': {
    en: {
      title: 'NTE Boss Weakness Guide: All Bosses, Drops & Teams',
      description: 'Find NTE boss weaknesses, shield counters, attack patterns, recommended teams, weekly boss rewards, and farming priorities.',
    },
    zh: {
      title: '异环 Boss 弱点攻略：全 Boss 打法、掉落与配队',
      description: '整理异环 Boss 弱点、破盾克制、攻击模式、推荐阵容、周本掉落和刷取优先级，适合快速通关和材料规划。',
    },
  },
};

const GUIDE_NEXT_STEPS: Partial<Record<GameId, Record<string, NextStepLink[]>>> = {
  zzz: {
    'v3-0-version-guide': [
      {
        href: '/zzz/version',
        label: { zh: '去 3.0 版本专题', en: 'Open v3.0 hub', ja: 'v3.0特集へ' },
        description: { zh: '版本总览、福利和热词入口', en: 'Version overview, rewards, and hot topics', ja: 'バージョン概要、報酬、注目トピック' },
      },
      {
        href: '/zzz/guides/meta-teams-v3-guide',
        label: { zh: '看 3.0 主流配队', en: 'Read meta teams', ja: '編成を見る' },
        description: { zh: '继续看版本答案队伍思路', en: 'Continue with the best team ideas', ja: '定番編成の考え方へ' },
      },
      {
        href: '/zzz/guides/rupture-specialty-guide',
        label: { zh: '看突击专精', en: 'Read Rupture guide', ja: 'ラプチャー解説へ' },
        description: { zh: '补齐新专精与新属性机制', en: 'Learn the new specialty and attribute system', ja: '新専精と新属性を補完', },
      },
    ],
    'meta-teams-v3-guide': [
      {
        href: '/zzz/version',
        label: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '先确认版本核心词再做配队', en: 'Re-check the version keywords first', ja: 'まず版本キーワードを確認', },
      },
      {
        href: '/zzz/guides/v3-0-version-guide',
        label: { zh: '看完整版本指南', en: 'Read full version guide', ja: '完全版ガイドを見る' },
        description: { zh: '先把 3.0 节点补齐', en: 'Fill in the 3.0 nodes first', ja: '3.0ノードを補完', },
      },
    ],
    'rupture-specialty-guide': [
      {
        href: '/zzz/characters',
        label: { zh: '看代理人图鉴', en: 'Open agent roster', ja: '代理人図鑑へ' },
        description: { zh: '把突击角色和强度先认全', en: 'Identify the key Rupture agents', ja: '主要ラプチャー代理人を確認', },
      },
      {
        href: '/zzz/version',
        label: { zh: '回到版本专题', en: 'Return to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '版本词和专精词一起看', en: 'Review the version topics together', ja: '版本トピックをまとめて確認', },
      },
    ],
  },
  wuwa: {
    'v3-4-version-guide': [
      {
        href: '/wuwa/version',
        label: { zh: '去鸣潮版本专题', en: 'Open WuWa version hub', ja: '鳴潮バージョン特集へ' },
        description: { zh: '先看版本总览与热词', en: 'Version overview and current hot topics', ja: '版本概要と注目トピック', },
      },
      {
        href: '/wuwa/guides/v3-5-preview-guide',
        label: { zh: '看 v3.5 前瞻', en: 'Read v3.5 preview', ja: 'v3.5前瞻へ' },
        description: { zh: '继续看后续版本排期', en: 'Continue into the next version timing', ja: '次版本の流れを確認', },
      },
      {
        href: '/wuwa/guides/roya-frostlands-guide',
        label: { zh: '看新区域攻略', en: 'Read the region guide', ja: '新区域攻略へ' },
        description: { zh: '把新地图和养成一起串起来', en: 'Connect the new area with farming', ja: '新マップと育成導線を接続', },
      },
    ],
    'v3-5-preview-guide': [
      {
        href: '/wuwa/version',
        label: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '先确认当前版本节点', en: 'Confirm the current version node', ja: '現在の版本を確認', },
      },
      {
        href: '/wuwa/guides/v3-4-version-guide',
        label: { zh: '看 v3.4 版本', en: 'Read v3.4 guide', ja: 'v3.4を見る' },
        description: { zh: '前一个版本的内容补齐', en: 'Fill in the previous version context', ja: '前版本の文脈を補完', },
      },
    ],
    'roya-frostlands-guide': [
      {
        href: '/wuwa/characters',
        label: { zh: '看角色图鉴', en: 'Open character roster', ja: 'キャラ図鑑へ' },
        description: { zh: '找适合刷图的角色和配队', en: 'Find suitable characters and teams', ja: '周回向きキャラと編成を確認', },
      },
      {
        href: '/wuwa/version',
        label: { zh: '回到版本专题', en: 'Return to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '把新地图放回版本节奏里', en: 'Place the new area back in version timing', ja: '新エリアを版本導線に戻す', },
      },
    ],
  },
  endfield: {
    'download-install-guide': [
      {
        href: '/endfield/version',
        label: { zh: '去测试专题', en: 'Open test hub', ja: 'テスト特集へ' },
        description: { zh: '先确认是否在测试阶段', en: 'Check whether the game is in test phase', ja: 'テスト段階か確認', },
      },
      {
        href: '/endfield/guides/combat-system-guide',
        label: { zh: '看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' },
        description: { zh: '下载之后直接接战斗理解', en: 'Move straight into combat basics', ja: 'DL後に戦闘理解へ進む', },
      },
    ],
    'combat-system-guide': [
      {
        href: '/endfield/version',
        label: { zh: '回到测试专题', en: 'Back to test hub', ja: 'テスト特集へ戻る' },
        description: { zh: '确认测试节奏和入口', en: 'Confirm test timing and entry points', ja: 'テスト時期と入口を確認', },
      },
      {
        href: '/endfield/guides/crisis-contract-guide',
        label: { zh: '看高难攻略', en: 'Read crisis content', ja: '高難度攻略へ' },
        description: { zh: '把战斗系统接到高难玩法', en: 'Connect combat to high-difficulty content', ja: '戦闘から高難度へ接続', },
      },
    ],
    'crisis-contract-guide': [
      {
        href: '/endfield/characters',
        label: { zh: '看干员图鉴', en: 'Open operator roster', ja: 'オペレーター図鑑へ' },
        description: { zh: '回头补阵容和职业', en: 'Review roster and roles', ja: '編成と職分を確認', },
      },
      {
        href: '/endfield/version',
        label: { zh: '回到测试专题', en: 'Return to test hub', ja: 'テスト特集へ戻る' },
        description: { zh: '继续看测试与下载信息', en: 'Continue with test and download info', ja: 'テストとDL情報へ戻る', },
      },
    ],
  },
};

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) => [
    ...nteGuides.map((guide) => ({
      lang,
      game: 'nte',
      slug: guide.id,
    })),
    ...genshinGuides.map((guide) => ({
      lang,
      game: 'genshin',
      slug: guide.id,
    })),
    ...starrailGuides.map((guide) => ({
      lang,
      game: 'starrail',
      slug: guide.id,
    })),
    ...wuwaGuides.map((guide) => ({
      lang,
      game: 'wuwa',
      slug: guide.id,
    })),
    ...zzzGuides.map((guide) => ({
      lang,
      game: 'zzz',
      slug: guide.id,
    })),
    ...guihuanGuides.map((guide) => ({
      lang,
      game: 'guihuan',
      slug: guide.id,
    })),
    ...anantaGuides.map((g) => ({
      lang,
      game: 'ananta',
      slug: g.id,
    })),
    ...endfieldGuides.map((g) => ({
      lang,
      game: 'endfield',
      slug: g.id,
    })),
    ...seaGuides.map((g) => ({
      lang,
      game: 'sea',
      slug: g.id,
    })),
    ...skjhGuides.map((g) => ({
      lang,
      game: 'skjh',
      slug: g.id,
    })),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  const buildOg = (title: string, description: string, gameId: string, slug: string, locale: SupportedLocale) => ({
    title,
    description,
    url: `https://gachia.com/${locale}/${gameId}/guides/${slug}`,
    siteName: 'Gachia',
    images: [{ url: `https://gachia.com/images/og/${gameId}.jpg`, width: 1200, height: 630 }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  });

  const buildGuideAlternates = (gameId: string, slug: string) => ({
    canonical: `https://gachia.com/${locale}/${gameId}/guides/${slug}`,
    languages: {
      'zh-Hans': `https://gachia.com/zh/${gameId}/guides/${slug}`,
      en: `https://gachia.com/en/${gameId}/guides/${slug}`,
      ja: `https://gachia.com/ja/${gameId}/guides/${slug}`,
      'x-default': `https://gachia.com/zh/${gameId}/guides/${slug}`,
    },
  });

  // Build intent-rich title & description per locale for guides
  const buildGuideMeta = (guideTitle: string, summary: string, gameName: string) => {
    const override = GUIDE_META_OVERRIDES[`${gameId}/${slug}`]?.[locale];
    if (override) return override;

    // For long descriptive titles, skip the game-name suffix to stay within SERP display limits
    const titleSuffix = guideTitle.length > 45
      ? ''
      : locale === 'zh'
        ? ` — ${gameName}攻略详解`
        : locale === 'ja'
          ? ` — ${gameName}攻略ガイド`
          : ` — ${gameName} Guide`;
    const title = `${guideTitle}${titleSuffix}`;
    const baseSummary = summary?.trim() ?? '';
    const desc = baseSummary.length >= 100
      ? baseSummary.slice(0, 160)
      : locale === 'zh'
        ? `${guideTitle}是${gameName}的详细攻略，包含技巧、策略、FAQ、版本要点和实战思路，帮助你快速掌握这页最重要的内容。${baseSummary ? ` 额外摘要：${baseSummary}` : ''}`
        : locale === 'ja'
          ? `${guideTitle}の${gameName}攻略ガイド。Tips、戦略、FAQ、版本要点、実戦の考え方をまとめ、必要な情報へすぐ進めます。${baseSummary ? ` 補足: ${baseSummary}` : ''}`
          : `Complete ${guideTitle} guide for ${gameName} with tips, strategies, FAQ, version notes, and practical advice. ${baseSummary ? `Summary: ${baseSummary}` : ''}`;
    return { title, description: desc };
  };

  if (gameId === 'genshin') {
    const guide = getGenshinGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.genshin.name[locale];
    const meta = buildGuideMeta(getGenshinGuideTitle(guide, locale), getGenshinGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'nte') {
    const guide = getNteGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.nte.name[locale];
    const meta = buildGuideMeta(getNteGuideTitle(guide, locale), getNteGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'wuwa') {
    const guide = getWuWaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.wuwa.name[locale];
    const meta = buildGuideMeta(getWuWaGuideTitle(guide, locale), getWuWaGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'starrail') {
    const guide = getStarRailGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.starrail.name[locale];
    const meta = buildGuideMeta(getStarRailGuideTitle(guide, locale), getStarRailGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'zzz') {
    const guide = getZzzGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.zzz.name[locale];
    const meta = buildGuideMeta(getZzzGuideTitle(guide, locale), getZzzGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'guihuan') {
    const guide = getGuihuanGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.guihuan.name[locale];
    const meta = buildGuideMeta(getGuihuanGuideTitle(guide, locale), getGuihuanGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'ananta') {
    const guide = getAnantaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.ananta.name[locale];
    const meta = buildGuideMeta(getAnantaGuideTitle(guide, locale), getAnantaGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'endfield') {
    const guide = getEndfieldGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.endfield.name[locale];
    const meta = buildGuideMeta(getEndfieldGuideTitle(guide, locale), getEndfieldGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'sea') {
    const guide = getSeaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.sea.name[locale];
    const meta = buildGuideMeta(getSeaGuideTitle(guide, locale), getSeaGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  if (gameId === 'skjh') {
    const guide = getSkjhGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.skjh.name[locale];
    const meta = buildGuideMeta(getSkjhGuideTitle(guide, locale), getSkjhGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) };
  }

  return {};
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    return <GenshinGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'nte') {
    return <NteGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'starrail') {
    return <StarRailGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'zzz') {
    return <ZzzGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'guihuan') {
    return <GuihuanGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'ananta') {
    return <AnantaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'endfield') {
    return <EndfieldGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'sea') {
    return <SeaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'skjh') {
    return <SkjhGuideDetail locale={locale} slug={slug} />;
  }

  notFound();
}

function GenshinGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getGenshinGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.genshin;
  const content = getGenshinGuideContent(guide, locale);
  const category = getGenshinGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/genshin/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {GENSHIN_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{GENSHIN_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGenshinGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGenshinGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getGenshinGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getGenshinGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="genshin" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/genshin/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'genshin',
        locale,
        title: getGenshinGuideTitle(guide, locale),
        summary: getGenshinGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getGenshinGuideFaqQuestion(f, locale), answer: getGenshinGuideFaqAnswer(f, locale) })),
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

function NteGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getNteGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.nte;
  const content = getNteGuideContent(guide, locale);
  const category = getNteGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/nte/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {NTE_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{NTE_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getNteGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getNteGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getNteGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getNteGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/nte/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      <RelatedGuidesSection gameId="nte" currentSlug={slug} locale={locale} />

      {buildGuideJsonLd({
        gameId: 'nte',
        locale,
        title: getNteGuideTitle(guide, locale),
        summary: getNteGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getNteGuideFaqQuestion(f, locale), answer: getNteGuideFaqAnswer(f, locale) })),
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

// ============================================================
// Wuthering Waves Guide Detail
// ============================================================

function WuWaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getWuWaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.wuwa;
  const content = getWuWaGuideContent(guide, locale);
  const category = getWuWaGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/wuwa/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {WUWA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{WUWA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getWuWaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getWuWaGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getWuWaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getWuWaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId="wuwa" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="wuwa" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/wuwa/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'wuwa',
        locale,
        title: getWuWaGuideTitle(guide, locale),
        summary: getWuWaGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getWuWaGuideFaqQuestion(f, locale), answer: getWuWaGuideFaqAnswer(f, locale) })),
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

// ============================================================
// Star Rail Guide Detail
// ============================================================

function StarRailGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getStarRailGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.starrail;
  const content = getStarRailGuideContent(guide, locale);
  const category = getStarRailGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/starrail/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {STARRAIL_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{STARRAIL_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getStarRailGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getStarRailGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

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
                  {getStarRailGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getStarRailGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="starrail" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/starrail/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'starrail',
        locale,
        title: getStarRailGuideTitle(guide, locale),
        summary: getStarRailGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getStarRailGuideFaqQuestion(f, locale), answer: getStarRailGuideFaqAnswer(f, locale) })),
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

/* ---------- ZZZ Guide Detail ---------- */

function ZzzGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getZzzGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.zzz;
  const content = getZzzGuideContent(guide, locale);
  const category = getZzzGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/zzz/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ZZZ_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ZZZ_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getZzzGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getZzzGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

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
                  {getZzzGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getZzzGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId="zzz" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="zzz" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/zzz/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'zzz',
        locale,
        title: getZzzGuideTitle(guide, locale),
        summary: getZzzGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getZzzGuideFaqQuestion(f, locale), answer: getZzzGuideFaqAnswer(f, locale) })),
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

/* ---------- Guihuan Guide Detail ---------- */

function GuihuanGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getGuihuanGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.guihuan;
  const content = getGuihuanGuideContent(guide, locale);
  const category = getGuihuanGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/guihuan/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {GUIHUAN_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{GUIHUAN_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGuihuanGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGuihuanGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

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
                  {getGuihuanGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getGuihuanGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="guihuan" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/guihuan/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'guihuan',
        locale,
        title: getGuihuanGuideTitle(guide, locale),
        summary: getGuihuanGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getGuihuanGuideFaqQuestion(f, locale), answer: getGuihuanGuideFaqAnswer(f, locale) })),
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

/* ---------- Ananta Guide Detail ---------- */

function AnantaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: AnantaGuide | undefined = getAnantaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.ananta;
  const content = getAnantaGuideContent(guide, locale);
  const category = getAnantaGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/ananta/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ANANTA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ANANTA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getAnantaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getAnantaGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: AnantaGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getAnantaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getAnantaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="ananta" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/ananta/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'ananta',
        locale,
        title: getAnantaGuideTitle(guide, locale),
        summary: getAnantaGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getAnantaGuideFaqQuestion(f, locale), answer: getAnantaGuideFaqAnswer(f, locale) })),
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

/* ---------- Endfield Guide Detail ---------- */

function EndfieldGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: EndfieldGuide | undefined = getEndfieldGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.endfield;
  const content = getEndfieldGuideContent(guide, locale);
  const category = getEndfieldGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/endfield/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ENDFIELD_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ENDFIELD_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getEndfieldGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getEndfieldGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: EndfieldGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getEndfieldGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getEndfieldGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId="endfield" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="endfield" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/endfield/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'endfield',
        locale,
        title: getEndfieldGuideTitle(guide, locale),
        summary: getEndfieldGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getEndfieldGuideFaqQuestion(f, locale), answer: getEndfieldGuideFaqAnswer(f, locale) })),
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

/* ---------- Sea of Remnants Guide Detail ---------- */

function SeaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: SeaGuide | undefined = getSeaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.sea;
  const content = getSeaGuideContent(guide, locale);
  const category = getSeaGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/sea/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {SEA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{SEA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getSeaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getSeaGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: SeaGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getSeaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getSeaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="sea" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/sea/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'sea',
        locale,
        title: getSeaGuideTitle(guide, locale),
        summary: getSeaGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getSeaGuideFaqQuestion(f, locale), answer: getSeaGuideFaqAnswer(f, locale) })),
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

/* ---------- Ashfall Evolution Guide Detail ---------- */

function SkjhGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: SkjhGuide | undefined = getSkjhGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.skjh;
  const content = getSkjhGuideContent(guide, locale);
  const category = getSkjhGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/skjh/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {SKJH_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{SKJH_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getSkjhGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getSkjhGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: SkjhGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getSkjhGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getSkjhGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="skjh" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/skjh/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'skjh',
        locale,
        title: getSkjhGuideTitle(guide, locale),
        summary: getSkjhGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getSkjhGuideFaqQuestion(f, locale), answer: getSkjhGuideFaqAnswer(f, locale) })),
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

// --- Shared Related Guides Section ---

type GuideLike = { id: string; category: string; tags: string[] };

function getGuideIntentScore(current: GuideLike, candidate: GuideLike) {
  const currentTerms = [
    current.id,
    current.category,
    ...current.tags,
  ].join(' ').toLowerCase();
  const candidateTerms = [
    candidate.id,
    candidate.category,
    ...candidate.tags,
  ].join(' ').toLowerCase();

  const intentGroups = [
    ['banner', 'schedule', 'wish', 'pity', 'pull', 'gacha', '祈愿', '卡池', '保底', '抽卡'],
    ['boss', 'weakness', 'drop', 'combat', 'challenge', '副本', '弱点', '掉落', '战斗'],
    ['comparison', 'compare', 'vs', '对比', '横评'],
    ['farming', 'route', 'material', '材料', '路线'],
    ['team', 'meta', 'tier', 'build', '配队', '强度', '排行'],
  ];

  return intentGroups.reduce((score, group) => {
    const currentMatches = group.some((term) => currentTerms.includes(term));
    const candidateMatches = group.some((term) => candidateTerms.includes(term));
    return score + (currentMatches && candidateMatches ? 3 : 0);
  }, 0);
}

function RelatedGuidesSection({ gameId, currentSlug, locale }: { gameId: string; currentSlug: string; locale: SupportedLocale }) {
  const allGuides = getGuidesForGame(gameId);
  const current = allGuides.find((g) => g.id === currentSlug);
  if (!current) return null;

  const related = allGuides
    .filter((g) => g.id !== currentSlug)
    .map((g) => {
      const sameCategory = g.category === current.category ? 2 : 0;
      const sharedTags = g.tags.filter((t) => current.tags.includes(t)).length;
      return { ...g, score: sameCategory + sharedTags + getGuideIntentScore(current, g) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (related.length === 0) return null;

  const sectionTitle = locale === 'zh' ? '相关攻略' : locale === 'ja' ? '関連ガイド' : 'Related Guides';

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">{sectionTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((g) => {
          const title = getGuideTitleForGame(gameId, g, locale);
          const summary = getGuideSummaryForGame(gameId, g, locale);
          return (
            <Link
              key={g.id}
              href={`/${gameId}/guides/${g.id}` as '/'}
              className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary"
            >
              <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{title}</h3>
              <p className="text-xs text-game-text-muted line-clamp-2">{summary}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NextStepSection({ gameId, currentSlug, locale }: { gameId: string; currentSlug: string; locale: SupportedLocale }) {
  const nextSteps = GUIDE_NEXT_STEPS[gameId as GameId]?.[currentSlug];
  if (!nextSteps?.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {nextSteps.map((step) => (
          <Link
            key={step.href}
            href={step.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {step.label[locale]}
            </h3>
            <p className="text-xs text-game-text-muted line-clamp-2">
              {step.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function getGuidesForGame(gameId: string): GuideLike[] {
  switch (gameId) {
    case 'genshin': return genshinGuides;
    case 'starrail': return starrailGuides;
    case 'wuwa': return wuwaGuides;
    case 'nte': return nteGuides;
    case 'zzz': return zzzGuides;
    case 'guihuan': return guihuanGuides;
    case 'ananta': return anantaGuides;
    case 'endfield': return endfieldGuides;
    case 'sea': return seaGuides;
    case 'skjh': return skjhGuides;
    default: return [];
  }
}

function getGuideTitleForGame(gameId: string, guide: GuideLike, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinGuideTitle(guide as unknown as Parameters<typeof getGenshinGuideTitle>[0], locale);
    case 'starrail': return getStarRailGuideTitle(guide as unknown as Parameters<typeof getStarRailGuideTitle>[0], locale);
    case 'wuwa': return getWuWaGuideTitle(guide as unknown as Parameters<typeof getWuWaGuideTitle>[0], locale);
    case 'nte': return getNteGuideTitle(guide as unknown as Parameters<typeof getNteGuideTitle>[0], locale);
    case 'zzz': return getZzzGuideTitle(guide as unknown as Parameters<typeof getZzzGuideTitle>[0], locale);
    case 'guihuan': return getGuihuanGuideTitle(guide as unknown as Parameters<typeof getGuihuanGuideTitle>[0], locale);
    case 'ananta': return getAnantaGuideTitle(guide as unknown as Parameters<typeof getAnantaGuideTitle>[0], locale);
    case 'endfield': return getEndfieldGuideTitle(guide as unknown as Parameters<typeof getEndfieldGuideTitle>[0], locale);
    case 'sea': return getSeaGuideTitle(guide as unknown as Parameters<typeof getSeaGuideTitle>[0], locale);
    case 'skjh': return getSkjhGuideTitle(guide as unknown as Parameters<typeof getSkjhGuideTitle>[0], locale);
    default: return guide.id;
  }
}

function getGuideSummaryForGame(gameId: string, guide: GuideLike, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinGuideSummary(guide as unknown as Parameters<typeof getGenshinGuideSummary>[0], locale);
    case 'starrail': return getStarRailGuideSummary(guide as unknown as Parameters<typeof getStarRailGuideSummary>[0], locale);
    case 'wuwa': return getWuWaGuideSummary(guide as unknown as Parameters<typeof getWuWaGuideSummary>[0], locale);
    case 'nte': return getNteGuideSummary(guide as unknown as Parameters<typeof getNteGuideSummary>[0], locale);
    case 'zzz': return getZzzGuideSummary(guide as unknown as Parameters<typeof getZzzGuideSummary>[0], locale);
    case 'guihuan': return getGuihuanGuideSummary(guide as unknown as Parameters<typeof getGuihuanGuideSummary>[0], locale);
    case 'ananta': return getAnantaGuideSummary(guide as unknown as Parameters<typeof getAnantaGuideSummary>[0], locale);
    case 'endfield': return getEndfieldGuideSummary(guide as unknown as Parameters<typeof getEndfieldGuideSummary>[0], locale);
    case 'sea': return getSeaGuideSummary(guide as unknown as Parameters<typeof getSeaGuideSummary>[0], locale);
    case 'skjh': return getSkjhGuideSummary(guide as unknown as Parameters<typeof getSkjhGuideSummary>[0], locale);
    default: return '';
  }
}

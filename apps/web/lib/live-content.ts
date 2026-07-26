import type { GameId, SupportedLocale } from '@gachia/core';

export type LiveStatus = 'live' | 'upcoming' | 'fresh' | 'watch';

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
}

export interface LiveBanner {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status: LiveStatus;
  updatedAt: string;
  priority: number;
}

export interface LiveVersionUpdate {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status: LiveStatus;
  updatedAt: string;
  priority: number;
}

export interface LiveGuideLink {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  updatedAt: string;
  priority: number;
}

export interface LiveCodeSummary {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status: LiveStatus;
  updatedAt: string;
  priority: number;
}

export const LIVE_UPDATED_AT = '2026-07-26';

export const HOMEPAGE_PRIORITY_GAMES: GameId[] = [
  'wuwa',
  'starrail',
  'genshin',
  'nte',
  'zzz',
];

export const LIVE_BANNERS: LiveBanner[] = [
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮当前与下期卡池',
      en: 'WuWa Current and Next Banners',
      ja: '鳴潮 現在と次回のバナー',
    },
    summary: {
      zh: '跟踪当前角色、下期预测和抽取建议，优先承接 banner schedule 搜索。',
      en: 'Track current characters, next-banner watch notes, and pull planning links.',
      ja: '現在のキャラ、次回予想、引くべきかの導線をまとめます。',
    },
    href: '/wuwa/guides/banner-schedule-guide',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'starrail',
    title: {
      zh: '星穹铁道 4.4 卡池规划',
      en: 'HSR 4.4 Banner Schedule',
      ja: 'スターレイル 4.4 バナー計画',
    },
    summary: {
      zh: '整理 4.4 版本卡池、联动角色和星琼规划入口。',
      en: 'Follow v4.4 banners, collab pulls, and Stellar Jade planning.',
      ja: 'v4.4 バナー、コラボ、星玉計画を確認できます。',
    },
    href: '/starrail/guides/banner-schedule-guide',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'genshin',
    title: {
      zh: '原神当前与下期卡池',
      en: 'Genshin Current and Next Banners',
      ja: '原神 現在と次回のバナー',
    },
    summary: {
      zh: '集中查看当前祈愿、下期角色、武器池和版本前瞻。',
      en: 'Check current wishes, next characters, weapon banners, and version watch.',
      ja: '現在の祈願、次回キャラ、武器、版本情報を確認できます。',
    },
    href: '/genshin/guides/banner-schedule-guide',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_VERSION_UPDATES: LiveVersionUpdate[] = [
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零 3.1 版本前瞻',
      en: 'ZZZ 3.1 Version Watch',
      ja: 'ゼンレスゾーンゼロ 3.1 注目情報',
    },
    summary: {
      zh: '3.1 即将上线，优先查看新角色、卡池和版本准备。',
      en: 'Prepare for v3.1 with new characters, banners, and patch priorities.',
      ja: 'v3.1 の新キャラ、バナー、準備項目を確認できます。',
    },
    href: '/zzz/version',
    status: 'upcoming',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮 3.5 版本重点',
      en: 'WuWa 3.5 Version Highlights',
      ja: '鳴潮 3.5 バージョン要点',
    },
    summary: {
      zh: '追踪版本内容、活动路线和养成优先级。',
      en: 'Track patch highlights, event routes, and build priorities.',
      ja: '版本内容、イベント、育成優先度を整理します。',
    },
    href: '/wuwa/version',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'starrail',
    title: {
      zh: '星穹铁道 4.4 / Fate 联动',
      en: 'HSR 4.4 / Fate Collab Hub',
      ja: 'スターレイル 4.4 / Fate 連動',
    },
    summary: {
      zh: '联动、角色规划、兑换码和版本攻略入口集中在这里。',
      en: 'Route into collab details, pull planning, codes, and guides.',
      ja: 'コラボ、抽卡計画、コード、攻略をまとめます。',
    },
    href: '/starrail/version',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_CODE_SUMMARIES: LiveCodeSummary[] = [
  {
    gameId: 'starrail',
    title: {
      zh: '星穹铁道兑换码',
      en: 'HSR Redeem Codes',
      ja: 'スターレイル 交換コード',
    },
    summary: {
      zh: '查看可用码、过期码和星琼奖励。',
      en: 'Check active codes, expired codes, and Stellar Jade rewards.',
      ja: '有効コード、期限切れ、星玉報酬を確認できます。',
    },
    href: '/starrail/redeem-codes',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮兑换码',
      en: 'WuWa Redeem Codes',
      ja: '鳴潮 交換コード',
    },
    summary: {
      zh: '整理当前可用福利码和领取方式。',
      en: 'Review active rewards and how to redeem them.',
      ja: '現在使える報酬コードと交換方法を確認できます。',
    },
    href: '/wuwa/redeem-codes',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零兑换码',
      en: 'ZZZ Redeem Codes',
      ja: 'ゼンゼロ 交換コード',
    },
    summary: {
      zh: '版本更新前后优先检查兑换码和奖励。',
      en: 'Check codes and rewards around version updates.',
      ja: '版本更新前後のコードと報酬を確認できます。',
    },
    href: '/zzz/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_GUIDES: LiveGuideLink[] = [
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮卡池时间表',
      en: 'Wuthering Waves Banner Schedule',
      ja: '鳴潮 バナースケジュール',
    },
    summary: {
      zh: 'GSC 最高曝光机会页，优先强化首屏和 FAQ。',
      en: 'Top GSC opportunity page for current and upcoming banners.',
      ja: '現在と次回のバナー検索意図に対応します。',
    },
    href: '/wuwa/guides/banner-schedule-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'starrail',
    title: {
      zh: '星穹铁道卡池时间表',
      en: 'Honkai: Star Rail Banner Schedule',
      ja: 'スターレイル バナースケジュール',
    },
    summary: {
      zh: '承接 HSR banner schedule、current banner 和 upcoming banners。',
      en: 'Targets HSR banner schedule, current banner, and upcoming banners.',
      ja: 'HSR の現在と次回バナー検索に対応します。',
    },
    href: '/starrail/guides/banner-schedule-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'genshin',
    title: {
      zh: '原神卡池时间表',
      en: 'Genshin Impact Banner Schedule',
      ja: '原神 バナースケジュール',
    },
    summary: {
      zh: '补强 current banner、next banner 和武器池入口。',
      en: 'Strengthens current banner, next banner, and weapon banner routing.',
      ja: '現在、次回、武器バナーへの導線を強化します。',
    },
    href: '/genshin/guides/banner-schedule-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export function localizeText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.zh;
}

export function sortByPriority<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

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

export type LiveCalendarEventType =
  | 'banner_start'
  | 'banner_end'
  | 'version_release'
  | 'livestream'
  | 'code_expiry'
  | 'event_start'
  | 'event_end';

export interface LiveCalendarEvent {
  id: string;
  gameId: GameId;
  type: LiveCalendarEventType;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  updatedAt: string;
  priority: number;
}

export const LIVE_UPDATED_AT = '2026-08-03';

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
      zh: '绝区零 3.1 版本现已上线',
      en: 'ZZZ 3.1 Is Now Live',
      ja: 'ゼンレスゾーンゼロ 3.1 配信中',
    },
    summary: {
      zh: '查看新代理人、卡池、周年奖励和版本内的优先事项。',
      en: 'Check new agents, banners, anniversary rewards, and in-version priorities.',
      ja: '新エージェント、バナー、周年報酬、バージョン中の優先事項を確認できます。',
    },
    href: '/zzz/version',
    status: 'live',
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

export const LIVE_CALENDAR_EVENTS: LiveCalendarEvent[] = [
  {
    id: 'zzz-v3-1-release',
    gameId: 'zzz',
    type: 'version_release',
    title: {
      zh: '绝区零 3.1「The Long Goodbye」',
      en: 'ZZZ v3.1 "The Long Goodbye"',
      ja: 'ゼンゼロ v3.1「The Long Goodbye」',
    },
    summary: {
      zh: '3.1 已上线：查看 2 周年、新代理人与平台入坑入口。',
      en: 'v3.1 is live with 2nd anniversary, new-agent, and platform starter routes.',
      ja: 'v3.1配信中。2周年、新エージェント、プラットフォーム入門を確認。',
    },
    href: '/zzz/version',
    startsAt: '2026-07-29',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    id: 'wuwa-v3-5-release',
    gameId: 'wuwa',
    type: 'version_release',
    title: {
      zh: '鸣潮 3.5 版本',
      en: 'WuWa v3.5 Version',
      ja: '鳴潮 v3.5',
    },
    summary: {
      zh: 'Yangyang: Xuanling、Suisui、SP 机制和 Xbox/Game Pass 入坑。',
      en: 'Yangyang: Xuanling, Suisui, SP mechanics, and Xbox/Game Pass onboarding.',
      ja: 'Yangyang: Xuanling、Suisui、SP機構、Xbox/Game Pass入門。',
    },
    href: '/wuwa/version',
    startsAt: '2026-07-10',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    id: 'starrail-v4-4-release',
    gameId: 'starrail',
    type: 'version_release',
    title: {
      zh: '星穹铁道 4.4 / Fate 联动',
      en: 'HSR v4.4 / Fate Collab',
      ja: 'スターレイル v4.4 / Fate連動',
    },
    summary: {
      zh: 'Himeko Nova、Fate/stay night、Rin/Gilgamesh 和星琼规划。',
      en: 'Himeko Nova, Fate/stay night, Rin/Gilgamesh, and Jade planning.',
      ja: 'Himeko Nova、Fate/stay night、Rin/Gilgamesh、星玉計画。',
    },
    href: '/starrail/version',
    startsAt: '2026-07-02',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
  {
    id: 'genshin-luna-viii-release',
    gameId: 'genshin',
    type: 'version_release',
    title: {
      zh: '原神 Luna VIII 专题',
      en: 'Genshin Luna VIII Hub',
      ja: '原神 Luna VIII 特集',
    },
    summary: {
      zh: 'Sandrone、Sunny Summer Fontinalia、活动日历和卡池规划。',
      en: 'Sandrone, Sunny Summer Fontinalia, event routing, and banner planning.',
      ja: 'Sandrone、Sunny Summer Fontinalia、イベント導線、バナー計画。',
    },
    href: '/genshin/version',
    startsAt: '2026-07-15',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    id: 'starrail-livestream-codes-expire',
    gameId: 'starrail',
    type: 'code_expiry',
    title: {
      zh: '星穹铁道直播码复核',
      en: 'HSR Livestream Codes Recheck',
      ja: 'スターレイル配信コード再確認',
    },
    summary: {
      zh: '直播码和版本码需要在抽卡前先核对有效状态。',
      en: 'Recheck livestream and patch codes before planning pulls.',
      ja: 'ガチャ計画前に配信コードと版本コードを再確認します。',
    },
    href: '/starrail/redeem-codes',
    startsAt: '2026-07-26',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 5,
  },
  {
    id: 'wuwa-banner-planning',
    gameId: 'wuwa',
    type: 'banner_start',
    title: {
      zh: '鸣潮当前与下期卡池规划',
      en: 'WuWa Current and Next Banner Planning',
      ja: '鳴潮 現在と次回バナー計画',
    },
    summary: {
      zh: '把角色池、武器池、兑换码和抽卡规划放到同一条路线。',
      en: 'Connect character banners, weapon risk, codes, and pull planning.',
      ja: 'キャラバナー、武器リスク、コード、ガチャ計画を接続します。',
    },
    href: '/wuwa/guides/banner-schedule-guide',
    startsAt: '2026-07-26',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    id: 'nte-999-nights-event',
    gameId: 'nte',
    type: 'event_start',
    title: {
      zh: '异环 1.2「999 Nights」路线',
      en: 'NTE v1.2 "999 Nights" Route',
      ja: 'NTE v1.2「999 Nights」ルート',
    },
    summary: {
      zh: 'Shinku、Iroi、活动资源、兑换码和新玩家下载入口。',
      en: 'Shinku, Iroi, event resources, codes, and new-player download routes.',
      ja: 'Shinku、Iroi、イベント資源、コード、新規DL導線。',
    },
    href: '/nte/version',
    startsAt: '2026-07-26',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 7,
  },
];

export function localizeText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.zh;
}

export function sortByPriority<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

export function sortCalendarEvents(events: LiveCalendarEvent[]): LiveCalendarEvent[] {
  return [...events].sort((a, b) => {
    const dateDiff = Date.parse(`${a.startsAt}T00:00:00Z`) - Date.parse(`${b.startsAt}T00:00:00Z`);
    return dateDiff === 0 ? a.priority - b.priority : dateDiff;
  });
}

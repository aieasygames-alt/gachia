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

export const LIVE_UPDATED_AT = '2026-08-28';

export const HOMEPAGE_PRIORITY_GAMES: GameId[] = [
  'genshin',
  'wuwa',
  'zzz',
  'roco',
  'aniimo',
  'skjh',
  'endfield',
  'nte',
  'starrail',
  'sea',
  'ananta',
  'guihuan',
  'roco-cn',
];

export const LIVE_BANNERS: LiveBanner[] = [
  {
    gameId: 'genshin',
    title: {
      zh: '原神 7.0 / 至冬上线路线',
      en: 'Genshin v7.0 / Snezhnaya Launch Route',
      ja: '原神 v7.0 / スネージナヤ開始ルート',
    },
    summary: {
      zh: '从预热转为上线后 first steps、Nod-Krai 地图、当前/下期卡池与兑换码。',
      en: 'Move from watch wording into first steps, Nod-Krai map, current/next banners, and codes.',
      ja: '注目表現から、初動、Nod-Kraiマップ、現在/次回バナー、コードへ移ります。',
    },
    href: '/genshin/guides/banner-schedule-guide',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮 3.6 当前与下期卡池',
      en: 'WuWa v3.6 Current and Next Banners',
      ja: '鳴潮 現在と次回のバナー',
    },
    summary: {
      zh: '跟踪 3.6 维护后角色、下期预测、兑换码和 Xbox/Steam 入坑。',
      en: 'Track v3.6 banners, codes, next-banner watch notes, and Xbox/Steam onboarding.',
      ja: 'v3.6バナー、コード、次回予想、Xbox/Steam入門をまとめます。',
    },
    href: '/wuwa/guides/banner-schedule-guide',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零 3.2 特别节目与直播码',
      en: 'ZZZ v3.2 Livestream and Codes',
      ja: 'ゼンゼロ v3.2 特番とコード',
    },
    summary: {
      zh: '新增 3.2 livestream watch，继续串联 3.1 后半、兑换码和 Steam/Xbox 平台入口。',
      en: 'Add v3.2 livestream watch while keeping v3.1 phase two, codes, and Steam/Xbox routes connected.',
      ja: 'v3.2特番注目を追加し、v3.1後半、コード、Steam/Xbox導線を維持します。',
    },
    href: '/zzz/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_VERSION_UPDATES: LiveVersionUpdate[] = [
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Kingdom「等等鸭测试」CBT 报名与开测',
      en: 'Roco Kingdom "Quack Quack Test" CBT Sign-up and Launch',
      ja: 'Roco Kingdom「Quack Quack Test」CBT応募と開始',
    },
    summary: {
      zh: '国际服 CBT「等等鸭测试（Quack Quack Test）」10/27 开测，报名 8/26–10/20 进行中，需官网问卷；CBT 仅 PC/iOS/Android。',
      en: 'Global CBT "Quack Quack Test" starts Oct 27; sign-ups run Aug 26–Oct 20 via the official questionnaire. The CBT covers PC, iOS, and Android only.',
      ja: '国際CBT「Quack Quack Test」は10/27開始。応募は8/26〜10/20で公式アンケートが必要です。CBT対応はPC/iOS/Androidのみ。',
    },
    href: '/roco/guides/cbt-registration-guide',
    status: 'upcoming',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'roco-cn',
    title: {
      zh: '国服 S2 赛季「狂欢怪谈」进行中',
      en: 'CN S2 "Carnival Tales" Season Live',
      ja: '中国版S2「カーニバル談」シーズン進行中',
    },
    summary: {
      zh: '国服 S2 赛季（马戏团主题）持续至 9 月中下旬：兑换码常更新、迪莫四形态超进化、马戏团小丑免费领。',
      en: 'CN Season 2 (circus theme) runs to mid/late September: frequent redeem-code updates, Dimo\'s four Ultra Evolutions, and the free Circus Clown.',
      ja: '中国版S2（サーカステーマ）は9月中旬頃まで：交換コード更新、Dimoの4形態超進化、無料のサーカス・クラウン。',
    },
    href: '/roco-cn/guides/s2-season-guide',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'aniimo',
    title: {
      zh: 'Aniimo 全球上线日期确认',
      en: 'Aniimo Global Launch Dates Confirmed',
      ja: 'Aniimo グローバル配信日確認',
    },
    summary: {
      zh: 'PC/主机 2026-09-16，移动端 2026-09-23；上线前优先追踪下载、奖励、图鉴和区域路线。',
      en: 'PC/console arrives on 2026-09-16, mobile on 2026-09-23; track downloads, rewards, database entries, and region routes before launch.',
      ja: 'PC/コンソールは2026-09-16、モバイルは2026-09-23。DL、報酬、図鑑、地域ルートを追跡します。',
    },
    href: '/aniimo/version',
    status: 'upcoming',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'genshin',
    title: {
      zh: '原神 7.0 / 至冬预热',
      en: 'Genshin v7.0 / Snezhnaya Watch',
      ja: '原神 v7.0 / スネージナヤ注目',
    },
    summary: {
      zh: '版本中心继续转向至冬、Sandrone、Columbina、地图、卡池和兑换码。',
      en: 'The version hub keeps watching Snezhnaya, Sandrone, Columbina, maps, banners, and codes.',
      ja: 'バージョン中心はスネージナヤ、Sandrone、Columbina、マップ、バナー、コードを継続して注目します。',
    },
    href: '/genshin/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮 3.6 版本与平台入口',
      en: 'WuWa v3.6 Version and Platform Routes',
      ja: '鳴潮 v3.6 とプラットフォーム導線',
    },
    summary: {
      zh: '更新 3.6 维护、卡池、兑换码、Xbox/Steam 和地图导流。',
      en: 'Track v3.6 maintenance, banners, codes, Xbox/Steam routes, and maps.',
      ja: 'v3.6メンテ、バナー、コード、Xbox/Steam、マップ導線を整理します。',
    },
    href: '/wuwa/version',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零 3.1 后半与平台页',
      en: 'ZZZ v3.1 Phase Two and Platform Hub',
      ja: 'ゼンゼロ v3.1後半とプラットフォーム',
    },
    summary: {
      zh: '承接补偿、兑换码、新代理人、Steam、Microsoft Store 与 Xbox 入坑。',
      en: 'Route compensation, codes, new agents, Steam, Microsoft Store, and Xbox onboarding.',
      ja: '補償、コード、新エージェント、Steam、Microsoft Store、Xbox入門へ案内します。',
    },
    href: '/zzz/version',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
  {
    gameId: 'starrail',
    title: {
      zh: '星铁 4.x Fate / Gilgamesh 跃迁',
      en: 'HSR 4.x Fate / Gilgamesh Warps',
      ja: 'スターレイル 4.x Fate / Gilgamesh跳躍',
    },
    summary: {
      zh: '继续承接 Fate 联动、Gilgamesh、Kafka、Cyrene、卡池和队伍构建。',
      en: 'Continue routing Fate collab, Gilgamesh, Kafka, Cyrene, banners, and team-builder intent.',
      ja: 'Fateコラボ、Gilgamesh、Kafka、Cyrene、バナー、編成を案内します。',
    },
    href: '/starrail/guides/banner-schedule-guide',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    gameId: 'nte',
    title: {
      zh: '异环 Iroi / 999 Nights 后半',
      en: 'NTE Iroi / 999 Nights Phase Two',
      ja: 'NTE Iroi / 999 Nights 後半',
    },
    summary: {
      zh: '1.2 后半围绕 Iroi、Shinku、999 Nights、兑换码、下载与 Steam。',
      en: 'v1.2 phase two centers on Iroi, Shinku, 999 Nights, codes, download, and Steam.',
      ja: 'v1.2後半はIroi、Shinku、999 Nights、コード、DL、Steamが中心です。',
    },
    href: '/nte/version',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 5,
  },
  {
    gameId: 'skjh',
    title: {
      zh: '失控进化联动与开荒',
      en: 'Ashfall Evolution Collab and Starter Route',
      ja: '失控進化 コラボと序盤ルート',
    },
    summary: {
      zh: '8 月联动、官方下载、服务器模式、新手开荒和防抄家内容入口。',
      en: 'Open the August collab, official download, server modes, starter route, and base-defense guides.',
      ja: '8月コラボ、公式DL、サーバーモード、序盤ルート、拠点防衛を確認できます。',
    },
    href: '/skjh/version',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    gameId: 'endfield',
    title: {
      zh: '终末地测试资格与 AIC 工厂',
      en: 'Endfield Test Access and AIC Factory',
      ja: 'エンドフィールド テスト資格とAIC工場',
    },
    summary: {
      zh: '集中查看 8 月活动、全面测试资格、下载、蓝图和 AIC 工厂入口。',
      en: 'Review August events, test access, downloads, blueprints, and the AIC factory route.',
      ja: '8月イベント、テスト資格、DL、設計図、AIC工場を確認できます。',
    },
    href: '/endfield/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 7,
  },
];

export const LIVE_CODE_SUMMARIES: LiveCodeSummary[] = [
  {
    gameId: 'genshin',
    title: {
      zh: '原神兑换码与 7.0 预热',
      en: 'Genshin Codes and v7.0 Watch',
      ja: '原神コードとv7.0注目',
    },
    summary: {
      zh: '版本切换前优先复核兑换码、活动奖励和原石规划。',
      en: 'Recheck codes, event rewards, and Primogem planning before the version shift.',
      ja: '版本移行前にコード、イベント報酬、原石計画を確認します。',
    },
    href: '/genshin/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
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
    priority: 2,
  },
  {
    gameId: 'nte',
    title: {
      zh: '异环兑换码',
      en: 'NTE Redeem Codes',
      ja: 'NTE 交換コード',
    },
    summary: {
      zh: '1.2 后半先复核兑换码、活动资源和 Iroi 抽取前准备。',
      en: 'Recheck codes, event resources, and Iroi prep for v1.2 phase two.',
      ja: 'v1.2後半のコード、イベント資源、Iroi準備を確認します。',
    },
    href: '/nte/redeem-codes',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
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
    priority: 4,
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
    priority: 5,
  },
];

export const LIVE_GUIDES: LiveGuideLink[] = [
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Kingdom「等等鸭测试」注册指南',
      en: 'Roco Kingdom "Quack Quack Test" Sign-up Guide',
      ja: 'Roco Kingdom「Quack Quack Test」登録ガイド',
    },
    summary: {
      zh: '国际服 CBT（10/27 开测）报名 8/26–10/20：官网问卷、邀请推荐、PC/iOS/Android 平台与语言说明。',
      en: 'Global CBT (Oct 27) sign-ups run Aug 26–Oct 20: official questionnaire, referral invites, PC/iOS/Android platforms, and language notes.',
      ja: '国際CBT（10/27開始）応募は8/26〜10/20：公式アンケート、紹介リンク、対応プラットフォームと言語。',
    },
    href: '/roco/guides/cbt-registration-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'roco-cn',
    title: {
      zh: '国服兑换码大全（2026-08 更新）',
      en: 'CN Redeem Codes (August 2026)',
      ja: '中国版交換コード一覧（2026年8月更新）',
    },
    summary: {
      zh: '公测长期码、S2 赛季码、主播码与 8 月限时口令，附兑换入口与注意事项。',
      en: 'Launch codes, S2 season codes, creator codes, and the August limited-time password, with redemption steps and tips.',
      ja: '公測恒常コード、S2シーズンコード、クリエイターコード、8月期間限定パスワードと入力方法をまとめています。',
    },
    href: '/roco-cn/guides/redeem-codes-cn',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'sea',
    title: {
      zh: '遗忘之海 Steam / gacha / solo FAQ',
      en: 'Sea of Remnants Steam / Gacha / Solo FAQ',
      ja: 'Sea of Remnants Steam / ガチャ / ソロFAQ',
    },
    summary: {
      zh: '移动端首发后承接 Steam、release date、gameplay、gacha、solo、PS5/Xbox。',
      en: 'After mobile launch, route Steam, release date, gameplay, gacha, solo, and PS5/Xbox intent.',
      ja: 'モバイル開始後、Steam、release date、gameplay、ガチャ、ソロ、PS5/Xboxへ案内します。',
    },
    href: '/sea/guides/platform-download-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    gameId: 'ananta',
    title: {
      zh: '无限大 2027 全球上线准备',
      en: 'Ananta 2027 Global Launch Prep',
      ja: 'Ananta 2027 配信準備',
    },
    summary: {
      zh: '承接 2027年1月15日、PS5、PC、Android、iOS、download、gameplay 和 no-gacha 搜索。',
      en: 'Routes January 15 2027, PS5, PC, Android, iOS, download, gameplay, and no-gacha searches.',
      ja: '2027年1月15日、PS5、PC、Android、iOS、DL、gameplay、ガチャなし検索へ案内します。',
    },
    href: '/ananta/guides/release-date-beta-pc-faq',
    updatedAt: LIVE_UPDATED_AT,
    priority: 5,
  },
  {
    gameId: 'guihuan',
    title: {
      zh: '归环测试时间线 / 开发商 FAQ',
      en: 'Guihuan Test Timeline / Developer FAQ',
      ja: '帰環 テスト年表 / 開発元FAQ',
    },
    summary: {
      zh: '事实核查上线时间、国际服、官方、开发商、公司、英文和测试招募。',
      en: 'Fact-check release timing, global-server intent, official sources, developer, English name, and test recruitment.',
      ja: 'リリース時期、国際版、公式、開発元、英語名、テスト募集を確認します。',
    },
    href: '/guihuan/guides/test-release-timeline-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮当前卡池',
      en: 'Wuthering Waves v3.6 Banners',
      ja: '鳴潮 現在バナー',
    },
    summary: {
      zh: '3.6 卡池、兑换码、Xbox/Steam 和地图入口集中承接。',
      en: 'Route v3.6 banners, codes, Xbox/Steam, and map intent.',
      ja: 'v3.6バナー、コード、Xbox/Steam、マップ検索意図に対応します。',
    },
    href: '/wuwa/guides/banner-schedule-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'skjh',
    title: {
      zh: '失控进化新手 0-2 小时',
      en: 'Ashfall Evolution First 0-2 Hours',
      ja: '失控進化 最初の0-2時間',
    },
    summary: {
      zh: '上线后优先解决下载、服务器模式、开荒路线和基地防守。',
      en: 'Solve download, server mode, starter route, and base-defense questions after launch.',
      ja: 'DL、サーバーモード、序盤ルート、拠点防衛を優先します。',
    },
    href: '/skjh/guides/first-2-hours-starter-route',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'endfield',
    title: {
      zh: '终末地蓝图 / AIC 工厂',
      en: 'Endfield Blueprint / AIC Factory',
      ja: 'エンドフィールド 設計図 / AIC工場',
    },
    summary: {
      zh: '测试资格、下载、角色、蓝图和 AIC 工厂系统是当前承接重点。',
      en: 'Test access, downloads, characters, blueprints, and AIC factory content are the current focus.',
      ja: 'テスト資格、DL、キャラ、設計図、AIC工場を重点化します。',
    },
    href: '/endfield/guides/homecoming-update-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_CALENDAR_EVENTS: LiveCalendarEvent[] = [
  {
    id: 'roco-cbt-signup-closes',
    gameId: 'roco',
    type: 'event_end',
    title: {
      zh: 'Roco Kingdom CBT 报名截止',
      en: 'Roco Kingdom CBT Sign-up Deadline',
      ja: 'Roco Kingdom CBT応募締切',
    },
    summary: {
      zh: '「等等鸭测试（Quack Quack Test）」报名于 10/20 截止，须在官网完成问卷；10/23 起可查询资格。',
      en: 'Quack Quack Test sign-ups close Oct 20; complete the official questionnaire. Eligibility check opens Oct 23.',
      ja: '「Quack Quack Test」応募は10/20締切。公式アンケートの完了が必要です。資格確認は10/23から。',
    },
    href: '/roco/guides/cbt-registration-guide',
    startsAt: '2026-10-20',
    timezone: 'UTC',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    id: 'roco-cbt-2026',
    gameId: 'roco',
    type: 'event_start',
    title: {
      zh: 'Roco Kingdom「等等鸭测试」CBT 开服',
      en: 'Roco Kingdom "Quack Quack Test" CBT Launch',
      ja: 'Roco Kingdom「Quack Quack Test」CBT開始',
    },
    summary: {
      zh: '全球首测开服（PC/iOS/Android）：下载、预约奖励、兑换码、御三家与 Jinies 图鉴；测试删档且无内购。',
      en: 'Global CBT launch on PC/iOS/Android: downloads, pre-reg rewards, codes, starters, and the Jinies codex. Progress wipes; no IAP.',
      ja: 'グローバルCBT開始（PC/iOS/Android）：DL、予約報酬、コード、御三家、Jinies図鑑。データ削除あり、課金なし。',
    },
    href: '/roco/version',
    startsAt: '2026-10-27',
    timezone: 'UTC',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    id: 'roco-cn-s2-season-ends',
    gameId: 'roco-cn',
    type: 'event_end',
    title: {
      zh: '国服 S2 赛季「狂欢怪谈」结束',
      en: 'CN S2 "Carnival Tales" Season Ends',
      ja: '中国版S2「カーニバル談」シーズン終了',
    },
    summary: {
      zh: 'S2 赛季作业约 9 月中截止，马戏团主题赛季进入尾声；建议及时兑换赛季码、领取赛季奖励并关注 S3 预告。',
      en: 'S2 season homework wraps up around mid-September. Redeem season codes and claim rewards before the season ends; watch for S3 news.',
      ja: 'S2シーズン課題は9月中旬頃まで。シーズンコード交換と報酬受取をお早めに。S3情報も注目です。',
    },
    href: '/roco-cn/guides/s2-season-guide',
    startsAt: '2026-09-16',
    timezone: 'UTC',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    id: 'genshin-v7-0-watch',
    gameId: 'genshin',
    type: 'version_release',
    title: {
      zh: '原神 7.0 / 至冬预热',
      en: 'Genshin v7.0 / Snezhnaya Watch',
      ja: '原神 v7.0 / スネージナヤ注目',
    },
    summary: {
      zh: 'Sandrone、Columbina、至冬地图、当前/下期卡池和兑换码。',
      en: 'Sandrone, Columbina, Snezhnaya map, current/next banners, and codes.',
      ja: 'Sandrone、Columbina、スネージナヤマップ、現在/次回バナー、コード。',
    },
    href: '/genshin/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    id: 'wuwa-v3-6-watch',
    gameId: 'wuwa',
    type: 'version_release',
    title: {
      zh: '鸣潮 3.6 维护与平台入口',
      en: 'WuWa v3.6 Maintenance and Platform Routes',
      ja: '鳴潮 v3.6 メンテと導線',
    },
    summary: {
      zh: '3.6 维护、卡池、兑换码、Xbox/Steam 和地图入口。',
      en: 'v3.6 maintenance, banners, codes, Xbox/Steam, and map routes.',
      ja: 'v3.6メンテ、バナー、コード、Xbox/Steam、マップ導線。',
    },
    href: '/wuwa/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    id: 'zzz-v3-1-phase-two',
    gameId: 'zzz',
    type: 'version_release',
    title: {
      zh: '绝区零 3.1 后半',
      en: 'ZZZ v3.1 Phase Two',
      ja: 'ゼンゼロ v3.1後半',
    },
    summary: {
      zh: '后半代理人、已知问题补偿、兑换码和平台入坑入口。',
      en: 'Phase-two agents, known-issue compensation, codes, and platform starter routes.',
      ja: '後半エージェント、既知問題補償、コード、プラットフォーム入門。',
    },
    href: '/zzz/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
  {
    id: 'skjh-august-collab',
    gameId: 'skjh',
    type: 'event_start',
    title: {
      zh: '失控进化 8 月联动',
      en: 'Ashfall Evolution August Collab',
      ja: '失控進化 8月コラボ',
    },
    summary: {
      zh: '联动活动、官方下载、服务器模式、新手开荒和防抄家。',
      en: 'Collab event, official download, server modes, starter route, and base defense.',
      ja: 'コラボ、公式DL、サーバーモード、序盤ルート、拠点防衛。',
    },
    href: '/skjh/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    id: 'endfield-august-test-aic',
    gameId: 'endfield',
    type: 'event_start',
    title: {
      zh: '终末地 8 月活动与测试资格',
      en: 'Endfield August Events and Test Access',
      ja: 'エンドフィールド 8月イベントとテスト資格',
    },
    summary: {
      zh: '全面测试资格、下载、角色、蓝图和 AIC 工厂内容入口。',
      en: 'Test access, downloads, characters, blueprints, and the AIC factory route.',
      ja: 'テスト資格、DL、キャラ、設計図、AIC工場導線。',
    },
    href: '/endfield/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 5,
  },
  {
    id: 'nte-iroi-999-nights-phase-two',
    gameId: 'nte',
    type: 'event_start',
    title: {
      zh: '异环 Iroi / 999 Nights 后半',
      en: 'NTE Iroi / 999 Nights Phase Two',
      ja: 'NTE Iroi / 999 Nights後半',
    },
    summary: {
      zh: 'Iroi、Shinku、999 Nights、兑换码、下载与 Steam 入口。',
      en: 'Iroi, Shinku, 999 Nights, codes, download, and Steam routes.',
      ja: 'Iroi、Shinku、999 Nights、コード、DL、Steam導線。',
    },
    href: '/nte/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    id: 'starrail-4x-fate-planning',
    gameId: 'starrail',
    type: 'banner_start',
    title: {
      zh: '星铁 4.x Fate / Gilgamesh 规划',
      en: 'HSR 4.x Fate / Gilgamesh Planning',
      ja: 'スターレイル 4.x Fate / Gilgamesh計画',
    },
    summary: {
      zh: 'Fate 联动、Gilgamesh、Kafka、Cyrene、兑换码和队伍构建。',
      en: 'Fate collab, Gilgamesh, Kafka, Cyrene, codes, and team-builder routing.',
      ja: 'Fateコラボ、Gilgamesh、Kafka、Cyrene、コード、編成導線。',
    },
    href: '/starrail/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 7,
  },
  {
    id: 'sea-steam-solo-faq',
    gameId: 'sea',
    type: 'event_start',
    title: {
      zh: '遗忘之海 Steam / solo FAQ',
      en: 'Sea of Remnants Steam / Solo FAQ',
      ja: 'Sea of Remnants Steam / ソロFAQ',
    },
    summary: {
      zh: 'Steam、release date、gameplay、gacha、solo、PS5/Xbox 平台边界。',
      en: 'Steam, release date, gameplay, gacha, solo, and PS5/Xbox platform boundaries.',
      ja: 'Steam、release date、gameplay、ガチャ、ソロ、PS5/Xbox平台境界。',
    },
    href: '/sea/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 8,
  },
  {
    id: 'ananta-beta-watch',
    gameId: 'ananta',
    type: 'event_start',
    title: {
      zh: '无限大 2027-01-15 上线准备',
      en: 'Ananta January 15, 2027 Launch Prep',
      ja: 'Ananta 2027年1月15日配信準備',
    },
    summary: {
      zh: '官网日期已更新，继续跟踪预下载、PS5/PC/移动端入口、beta 和 no-gacha 细节。',
      en: 'Official date is updated; keep tracking preload, PS5/PC/mobile entries, beta, and no-gacha details.',
      ja: '公式日程が更新済み。事前DL、PS5/PC/モバイル入口、beta、ガチャなし詳細を追跡します。',
    },
    href: '/ananta/version',
    startsAt: '2027-01-15',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 9,
  },
  {
    id: 'guihuan-release-dev-faq',
    gameId: 'guihuan',
    type: 'event_start',
    title: {
      zh: '归环测试时间线 / 开发商 FAQ',
      en: 'Guihuan Test Timeline / Developer FAQ',
      ja: '帰環 テスト年表 / 開発元FAQ',
    },
    summary: {
      zh: '上线时间、国际服、官方、开发商、公司、英文名和测试招募。',
      en: 'Release timing, global-server intent, official source, developer, English name, and test recruitment.',
      ja: 'リリース時期、国際版、公式、開発元、英語名、テスト募集。',
    },
    href: '/guihuan/version',
    startsAt: '2026-08-14',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 10,
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

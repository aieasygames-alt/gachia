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

export const LIVE_UPDATED_AT = '2026-09-21';

export const HOMEPAGE_PRIORITY_GAMES: GameId[] = [
  'lvmeng',
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
  'azur-promilia',
];

export const LIVE_BANNERS: LiveBanner[] = [
  {
    gameId: 'aniimo',
    title: {
      zh: 'Aniimo 上线后复盘与移动端倒计时',
      en: 'Aniimo Launch Recap and Mobile Countdown',
      ja: 'Aniimo 配信後まとめとモバイル直前',
    },
    summary: {
      zh: 'PC/主机已上线，移动端 9/23 即将到来；优先查看下载、兑换码状态、starter、图鉴和地图路线。',
      en: 'PC/console is live and mobile arrives on Sep 23; check downloads, code status, starters, database, and map routes first.',
      ja: 'PC/コンソールは配信中、モバイルは9/23予定。DL、コード状態、starter、図鑑、マップ導線を優先します。',
    },
    href: '/aniimo/version',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'genshin',
    title: {
      zh: '原神 7.1 前瞻与直播码',
      en: 'Genshin v7.1 Watch and Livestream Codes',
      ja: '原神 v7.1注目と配信コード',
    },
    summary: {
      zh: '从 Luna I 复盘切到 7.1、Luna II、Snezhnaya、Sandrone、下期卡池和直播码窗口。',
      en: 'Shift from Luna I recap into v7.1, Luna II, Snezhnaya, Sandrone, next banners, and livestream-code watch.',
      ja: 'Luna Iまとめからv7.1、Luna II、Snezhnaya、Sandrone、次回バナー、配信コード注目へ。',
    },
    href: '/genshin/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Global Quack Quack Test 观察',
      en: 'Roco Global Quack Quack Test Watch',
      ja: 'Roco Global Quack Quack Test注目',
    },
    summary: {
      zh: '10/27 CBT 与 Quack Quack Test 已有 Steam/公开 FAQ 支撑；继续区分测试窗口和正式上线。',
      en: 'The Oct 27 CBT and Quack Quack Test now have Steam/public FAQ support; keep CBT timing separate from full release.',
      ja: '10/27 CBTとQuack Quack TestはSteam/公開FAQで確認可能。テスト時期と正式版を分けます。',
    },
    href: '/roco/version',
    status: 'upcoming',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_VERSION_UPDATES: LiveVersionUpdate[] = [
  {
    gameId: 'aniimo',
    title: {
      zh: 'Aniimo PC/主机已上线，移动端 9/23',
      en: 'Aniimo PC/Console Live, Mobile Sep 23',
      ja: 'Aniimo PC/コンソール配信中、モバイル9/23',
    },
    summary: {
      zh: '上线后入口已切到 launch recap + mobile countdown，兑换码、下载、starter、map/database 分层承接。',
      en: 'The hub is now launch recap plus mobile countdown, with codes, downloads, starters, map, and database routes separated.',
      ja: '配信後まとめ＋モバイル直前へ切替済み。コード、DL、starter、マップ、図鑑を分けて案内します。',
    },
    href: '/aniimo/version',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'starrail',
    title: {
      zh: '星铁 4.6 前瞻与直播码',
      en: 'HSR v4.6 Special Program and Codes',
      ja: 'スターレイル v4.6前瞻と配信コード',
    },
    summary: {
      zh: '4.5 进入收尾，版本页优先回答 4.6 special program、直播码、下期跃迁和星琼预留。',
      en: 'v4.5 is in wrap-up; the hub now prioritizes v4.6 special program, livestream codes, next warps, and Jade reserves.',
      ja: 'v4.5はまとめ段階。v4.6前瞻、配信コード、次回跳躍、星玉温存を優先します。',
    },
    href: '/starrail/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零 3.3 前瞻与 3.2 复盘',
      en: 'ZZZ v3.3 Watch and v3.2 Recap',
      ja: 'ZZZ v3.3注目とv3.2まとめ',
    },
    summary: {
      zh: '3.2 继续承接 Claret/Roxy、Armorer/Maim 与平台玩家，新增 3.3 special program、next banner 和 code reminder。',
      en: 'v3.2 still routes Claret/Roxy, Armorer/Maim, and platform players while adding v3.3 special program, next banner, and code reminders.',
      ja: 'v3.2のClaret/Roxy、Armorer/Maim、平台導線を残し、v3.3前瞻、次回バナー、コード提醒を追加。',
    },
    href: '/zzz/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮 3.7 观察与 3.6 Jingran 收尾',
      en: 'WuWa v3.7 Watch and v3.6 Jingran Wrap-up',
      ja: '鳴潮 v3.7注目とv3.6 Jingranまとめ',
    },
    summary: {
      zh: '保留 3.6 Jingran 当前承接，同时新增 3.7 next banner、codes、map/event 和平台入口。',
      en: 'Keep v3.6 Jingran coverage while adding v3.7 next-banner, codes, map/event, and platform routes.',
      ja: 'v3.6 Jingranを残しつつ、v3.7次回バナー、コード、マップ/イベント、平台導線を追加。',
    },
    href: '/wuwa/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Global 10/27 CBT watch',
      en: 'Roco Global Oct 27 CBT Watch',
      ja: 'Roco Global 10/27 CBT注目',
    },
    summary: {
      zh: 'Quack Quack Test 可升级为 Steam/官方 FAQ 可核验的 CBT watch，但不能写成正式上线。',
      en: 'Quack Quack Test can be treated as a Steam/official FAQ-backed CBT watch, but not as the full launch.',
      ja: 'Quack Quack TestはSteam/公式FAQで確認できるCBT watch。ただし正式版扱いはしません。',
    },
    href: '/roco/version',
    status: 'upcoming',
    updatedAt: LIVE_UPDATED_AT,
    priority: 5,
  },
  {
    gameId: 'skjh',
    title: {
      zh: '失控进化 S2 制霸王座当前入口',
      en: 'Ashfall Evolution S2 Throne Rush Entry',
      ja: '失控進化 S2 制霸王座入口',
    },
    summary: {
      zh: '入口从 S1 历史切到 S2「制霸王座」、礼包有效期、服务器模式和防抄家路线。',
      en: 'The route has moved from S1 history into S2 Throne Rush, reward validity, server modes, and anti-raid planning.',
      ja: 'S1履歴からS2「制霸王座」、報酬期限、サーバーモード、防衛導線へ移行。',
    },
    href: '/skjh/version',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    gameId: 'endfield',
    title: {
      zh: '终末地 Pioneer Test 复盘与 AIC 蓝图',
      en: 'Endfield Pioneer Test Recap and AIC Blueprints',
      ja: 'エンドフィールド Pioneer TestまとめとAIC設計図',
    },
    summary: {
      zh: 'Pioneer Test 招募结束后，重点转向测试复盘、奖励、Wuling、蓝图、AIC 工厂和正式上线观察。',
      en: 'After Pioneer Test recruitment, focus moves to recap, rewards, Wuling, blueprints, AIC factory, and release watch.',
      ja: 'Pioneer Test募集後はまとめ、報酬、Wuling、ブループリント、AIC工場、正式版注目へ。',
    },
    href: '/endfield/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 7,
  },
  {
    gameId: 'sea',
    title: {
      zh: '遗忘之海 early 2027 / December beta watch',
      en: 'Sea of Remnants Early 2027 / December Beta Watch',
      ja: 'Sea of Remnants early 2027 / December beta注目',
    },
    summary: {
      zh: '保持 watch 口径承接 early 2027、December closed beta、Steam、PS5/Xbox、mobile、gacha 和 solo。',
      en: 'Maintains watch wording for early 2027, December closed beta, Steam, PS5/Xbox, mobile, gacha, and solo intent.',
      ja: 'early 2027、December closed beta、Steam、PS5/Xbox、mobile、gacha、soloをwatch表現で承接。',
    },
    href: '/sea/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 8,
  },
  {
    gameId: 'nte',
    title: {
      zh: '异环 9 月 codes / banner calendar',
      en: 'NTE September Codes / Banner Calendar',
      ja: 'NTE 9月コード / バナーカレンダー',
    },
    summary: {
      zh: '继续维护 active、expired、unknown 三态，Linko/Hotori 与 banner calendar 标注来源等级。',
      en: 'Keep active, expired, and unknown code states, with Linko/Hotori and banner-calendar source tiers labeled.',
      ja: 'active、expired、unknownを維持し、Linko/Hotoriとbanner calendarの出典を分けます。',
    },
    href: '/nte/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 9,
  },
  {
    gameId: 'ananta',
    title: {
      zh: '无限大 2027-01-15 / no-gacha fact-check',
      en: 'Ananta Jan 15 2027 / No-Gacha Fact-check',
      ja: 'Ananta 2027-01-15 / ガチャなし確認',
    },
    summary: {
      zh: '继续把 release date、no character gacha、platform、pre-registration 和 Nova City/Chongxiao 放在前排。',
      en: 'Keep release date, no character gacha, platforms, preregistration, and Nova City/Chongxiao up front.',
      ja: 'release date、no character gacha、platform、pre-registration、Nova City/Chongxiaoを前面に出します。',
    },
    href: '/ananta/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 10,
  },
];

export const LIVE_CODE_SUMMARIES: LiveCodeSummary[] = [
  {
    gameId: 'genshin',
    title: {
      zh: '原神 7.1 前瞻直播码',
      en: 'Genshin v7.1 Livestream Codes',
      ja: '原神 v7.1配信コード',
    },
    summary: {
      zh: '把 7.1 直播码、active codes、expired codes 和 Nod-Krai 长尾入口分层核验。',
      en: 'Separate v7.1 livestream codes, active codes, expired codes, and Nod-Krai long-tail routes.',
      ja: 'v7.1配信コード、active、expired、Nod-Krai長尾を分けて確認します。',
    },
    href: '/genshin/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'starrail',
    title: {
      zh: '星铁 4.6 前瞻兑换码',
      en: 'HSR v4.6 Preview Codes',
      ja: 'スターレイル v4.6前瞻コード',
    },
    summary: {
      zh: '优先确认 4.6 special program 直播码是否过期，再看 4.5 收尾资源和下期跃迁。',
      en: 'Check whether v4.6 special-program codes have expired before planning v4.5 wrap-up rewards and next warps.',
      ja: 'v4.6前瞻コードの期限を先に確認し、v4.5まとめ報酬と次回跳躍を見ます。',
    },
    href: '/starrail/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'aniimo',
    title: {
      zh: 'Aniimo 兑换码状态',
      en: 'Aniimo Code Status',
      ja: 'Aniimoコード状態',
    },
    summary: {
      zh: '上线后仍按 active、expired、unknown 分层；未确认公开码不放入可领取模块。',
      en: 'After launch, keep active, expired, and unknown tiers; unconfirmed public codes stay out of claimable modules.',
      ja: '配信後もactive、expired、unknownを分け、未確認コードを受取可能欄に入れません。',
    },
    href: '/aniimo/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
  {
    gameId: 'nte',
    title: {
      zh: '异环 9 月兑换码三态',
      en: 'NTE September Code Tiers',
      ja: 'NTE 9月コード三分類',
    },
    summary: {
      zh: '继续维护 active、expired、unknown，避免把攻略站或社区码写成官方确认。',
      en: 'Maintain active, expired, and unknown states without treating guide-site or community codes as official.',
      ja: 'active、expired、unknownを維持し、攻略サイト/社区コードを公式扱いしません。',
    },
    href: '/nte/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零 3.3 直播码提醒',
      en: 'ZZZ v3.3 Code Reminder',
      ja: 'ZZZ v3.3コード提醒',
    },
    summary: {
      zh: '旧直播码保持 expired 说明，新一轮前瞻码出现后再进入 active/unknown 分层。',
      en: 'Old livestream codes stay expired; new preview codes move into active/unknown tiers when confirmed.',
      ja: '旧配信コードはexpired、新前瞻コードは確認後active/unknownへ分けます。',
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
      zh: '承接 early 2027、December beta、Steam、PS5/Xbox、mobile、gacha 与 solo 搜索。',
      en: 'Routes early 2027, December beta, Steam, PS5/Xbox, mobile, gacha, and solo intent.',
      ja: 'early 2027、December beta、Steam、PS5/Xbox、mobile、gacha、solo検索へ案内します。',
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
    id: 'aniimo-mobile-launch-2026-09-23',
    gameId: 'aniimo',
    type: 'version_release',
    title: {
      zh: 'Aniimo 移动端上线',
      en: 'Aniimo Mobile Launch',
      ja: 'Aniimo モバイル配信',
    },
    summary: {
      zh: '移动端官方日期为 2026-09-23；PC/主机已进入上线后复盘。',
      en: 'The official mobile date is 2026-09-23; PC/console is already in launch recap mode.',
      ja: 'モバイル公式日程は2026-09-23。PC/コンソールは配信後まとめ段階です。',
    },
    href: '/aniimo/version',
    startsAt: '2026-09-23',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
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
    priority: 2,
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
    priority: 3,
  },
  {
    id: 'ananta-global-launch-2027-01-15',
    gameId: 'ananta',
    type: 'version_release',
    title: {
      zh: '无限大 2027-01-15 上线观察',
      en: 'Ananta Jan 15 2027 Launch Watch',
      ja: 'Ananta 2027-01-15配信注目',
    },
    summary: {
      zh: '继续事实核查 2027-01-15、no character gacha、平台、预注册和 Nova City/Chongxiao。',
      en: 'Continue fact-checking Jan 15 2027, no character gacha, platforms, preregistration, and Nova City/Chongxiao.',
      ja: '2027-01-15、no character gacha、平台、事前登録、Nova City/Chongxiaoを確認します。',
    },
    href: '/ananta/version',
    startsAt: '2027-01-15',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
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

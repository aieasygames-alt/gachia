import type { GameId, SupportedLocale } from '@gachia/core';
import type { LocalizedText, LiveStatus } from './live-content';

export type VersionSnapshotLinkType = 'banner' | 'codes' | 'characters' | 'guides' | 'builds' | 'download' | 'map';

export interface VersionSnapshotLink {
  type: VersionSnapshotLinkType;
  href: string;
  label: LocalizedText;
}

export interface VersionSnapshot {
  gameId: GameId;
  currentVersion: string;
  releaseDate: string;
  status: LiveStatus;
  lastUpdatedAt: string;
  summary: LocalizedText;
  whatChanged: LocalizedText[];
  firstSteps: LocalizedText[];
  links: VersionSnapshotLink[];
}

export const VERSION_SNAPSHOT_UPDATED_AT = '2026-08-14';

export const VERSION_SNAPSHOTS: Partial<Record<GameId, VersionSnapshot>> = {
  zzz: {
    gameId: 'zzz',
    currentVersion: '3.1',
    releaseDate: '2026-07-29',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '3.1「The Long Goodbye」现已上线，重点是 Remielle/Sigrid、2 周年福利、Xbox/Microsoft Store 与 Steam 入坑。',
      en: 'v3.1 "The Long Goodbye" is now live with Remielle/Sigrid, 2nd anniversary rewards, Xbox/Microsoft Store, and Steam starter routes.',
      ja: 'v3.1「The Long Goodbye」は配信中です。Remielle/Sigrid、2周年報酬、Xbox/Microsoft Store、Steam入門を確認できます。',
    },
    whatChanged: [
      {
        zh: '3.1 后半继续承接已知问题补偿、新代理人、兑换码和多平台入坑。',
        en: 'Phase two continues routing known-issue compensation, new agents, codes, and multi-platform onboarding.',
        ja: 'v3.1後半は既知問題補償、新エージェント、コード、多平台入門を案内します。',
      },
      {
        zh: '兑换码、平台绑定、回流奖励和新代理人规划被放到同一条路线。',
        en: 'Codes, account linking, returnee rewards, and new-agent planning now share one route.',
        ja: 'コード、アカウント連携、復帰報酬、新エージェント計画を一つの導線にまとめています。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认账号与平台绑定，再领取兑换码、邮件和周年奖励。',
        en: 'Confirm account/platform linking first, then claim codes, mail, and anniversary rewards.',
        ja: '先にアカウントとプラットフォーム連携を確認し、コード、メール、周年報酬を受け取ります。',
      },
      {
        zh: '再看 Remielle/Sigrid 是否补当前队伍短板。',
        en: 'Then check whether Remielle/Sigrid fills a real team gap.',
        ja: '次にRemielle/Sigridが現在の編成不足を補うか確認します。',
      },
    ],
    links: [
      { type: 'codes', href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/zzz/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/zzz/guides/v3-1-anniversary-xbox-guide', label: { zh: '3.1 / 周年 FAQ', en: 'v3.1 / Anniversary FAQ', ja: 'v3.1 / 周年FAQ' } },
      { type: 'download', href: '/zzz/download', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
      { type: 'builds', href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
    ],
  },
  wuwa: {
    gameId: 'wuwa',
    currentVersion: '3.6 watch',
    releaseDate: '2026-08-14',
    status: 'fresh',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '3.6 重点转向维护后卡池、兑换码、角色、地图和 Xbox/Steam 新玩家入口。',
      en: 'v3.6 watch shifts toward post-maintenance banners, codes, characters, maps, and Xbox/Steam starter routes.',
      ja: 'v3.6はメンテ後バナー、コード、キャラ、マップ、Xbox/Steam入門が中心です。',
    },
    whatChanged: [
      {
        zh: '版本页首屏从 3.5 上线口径刷新到 3.6 维护、卡池和平台入口。',
        en: 'The hub moves from v3.5 launch copy into v3.6 maintenance, banners, and platform routes.',
        ja: '版本ページをv3.5開始からv3.6メンテ、バナー、平台導線へ更新します。',
      },
      {
        zh: 'Banner、兑换码和 Xbox 入坑内容被串成可执行检查顺序。',
        en: 'Banner, codes, and Xbox starter content are tied into a practical checklist.',
        ja: 'バナー、コード、Xbox入門を実用的なチェック順に接続しています。',
      },
    ],
    firstSteps: [
      {
        zh: '先领兑换码，再看当前/下期卡池和角色定位。',
        en: 'Claim codes first, then review current/next banners and role fit.',
        ja: 'まずコードを受け取り、現在/次回バナーと役割適性を確認します。',
      },
      {
        zh: 'Xbox/Game Pass 新玩家先确认登录、手柄和首周资源路线。',
        en: 'Xbox/Game Pass newcomers should confirm login, controller setup, and first-week resources.',
        ja: 'Xbox/Game Pass新規はログイン、コントローラー、初週資源を確認します。',
      },
    ],
    links: [
      { type: 'banner', href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' } },
      { type: 'codes', href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/wuwa/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'download', href: '/wuwa/download', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
      { type: 'map', href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
      { type: 'guides', href: '/wuwa/guides/v3-5-preview-guide', label: { zh: '3.5 专题', en: 'v3.5 guide', ja: 'v3.5特集' } },
    ],
  },
  starrail: {
    gameId: 'starrail',
    currentVersion: '4.x watch',
    releaseDate: '2026-08-14',
    status: 'fresh',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '4.x 继续承接 Fate 联动、Gilgamesh、Kafka、Cyrene、当前跃迁、兑换码和队伍构建搜索。',
      en: 'The 4.x watch continues routing Fate collab, Gilgamesh, Kafka, Cyrene, current warps, codes, and team-builder searches.',
      ja: '4.xはFateコラボ、Gilgamesh、Kafka、Cyrene、現在跳躍、コード、編成検索を案内します。',
    },
    whatChanged: [
      {
        zh: '页面继续从单版本专题扩展到 4.x 联动、复刻和队伍构建的常青入口。',
        en: 'The page expands from a single-version hub into an evergreen 4.x collab, rerun, and team-building route.',
        ja: '単一版本特集から4.xコラボ、復刻、編成の常設導線へ広げます。',
      },
      {
        zh: 'Banner、Fate FAQ 和兑换码页互相打通，减少用户重复跳转。',
        en: 'Banner, Fate FAQ, and code pages now reinforce each other to reduce repeated navigation.',
        ja: 'バナー、Fate FAQ、コードページを相互接続し、移動の手間を減らします。',
      },
    ],
    firstSteps: [
      {
        zh: '先领直播码和版本奖励，再计算 Himeko Nova / Fate 目标缺口。',
        en: 'Claim livestream/version rewards first, then calculate gaps for Himeko Nova or Fate targets.',
        ja: 'まず配信/版本報酬を受け取り、Himeko NovaやFate目標の不足を計算します。',
      },
      {
        zh: '资源紧张时，只锁定一个联动或版本目标。',
        en: 'With limited resources, lock one collab or version target first.',
        ja: '資源が少ない場合は、コラボか版本目標を一つに絞ります。',
      },
    ],
    links: [
      { type: 'banner', href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current warps', ja: '現在跳躍' } },
      { type: 'codes', href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/starrail/guides/himeko-nova-fate-pull-plan', label: { zh: '抽卡规划', en: 'Pull plan', ja: 'ガチャ計画' } },
    ],
  },
  nte: {
    gameId: 'nte',
    currentVersion: '1.2 phase two',
    releaseDate: '2026-08-14',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '1.2 后半重点是 Iroi、Shinku、999 Nights、兑换码、下载和 Steam 入口；1.3 只保持监控口径。',
      en: 'v1.2 phase two centers on Iroi, Shinku, 999 Nights, codes, download, and Steam routes; v1.3 stays in watch wording.',
      ja: 'v1.2後半はIroi、Shinku、999 Nights、コード、DL、Steamが中心です。v1.3は注目表現に留めます。',
    },
    whatChanged: [
      {
        zh: 'NTE 从 Shinku 当前池扩展到 Iroi 后半预热和 999 Nights 模式承接。',
        en: 'NTE expands from the Shinku banner into Iroi phase-two prep and 999 Nights routing.',
        ja: 'NTEはShinkuバナーからIroi後半準備と999 Nights導線へ広がります。',
      },
    ],
    firstSteps: [
      {
        zh: '先复核兑换码和活动资源，再判断 Iroi 是否值得抽。',
        en: 'Recheck codes and event resources first, then decide whether Iroi is worth pulling.',
        ja: 'まずコードとイベント資源を確認し、Iroiを引くか判断します。',
      },
      {
        zh: '下载与 Steam 问题按官方渠道核验，不承接非官方包。',
        en: 'Verify download and Steam questions through official channels, not unofficial packages.',
        ja: 'DLとSteamは公式チャネルで確認し、非公式パッケージは扱いません。',
      },
    ],
    links: [
      { type: 'download', href: '/nte/download', label: { zh: '下载', en: 'Download', ja: 'DL' } },
      { type: 'codes', href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/nte/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/nte/guides/download-install-guide', label: { zh: '下载 FAQ', en: 'Download FAQ', ja: 'DL FAQ' } },
    ],
  },
  genshin: {
    gameId: 'genshin',
    currentVersion: '7.0 watch',
    releaseDate: '2026-08-14',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '当前版本中心转入 7.0 / 至冬预热，优先承接 Sandrone、Columbina、下期卡池、地图、兑换码和原石规划。',
      en: 'The hub now watches v7.0 / Snezhnaya intent, prioritizing Sandrone, Columbina, next banners, maps, codes, and Primogem planning.',
      ja: '現在の中心はv7.0 / スネージナヤ注目です。Sandrone、Columbina、次回バナー、マップ、コード、原石計画を優先します。',
    },
    whatChanged: [
      {
        zh: '版本页从 Luna VIII 口径过渡到 7.0 / 至冬 watch 口径，未确认内容只做预热和监控。',
        en: 'The hub transitions from Luna VIII copy into v7.0 / Snezhnaya watch copy, keeping unconfirmed items in monitor wording.',
        ja: 'Luna VIIIからv7.0 / スネージナヤ注目へ移行し、未確認情報は監視表現に留めます。',
      },
      {
        zh: '角色、武器、圣遗物和配队入口保持在版本页可见位置。',
        en: 'Character, weapon, artifact, and team links stay visible from the version hub.',
        ja: 'キャラ、武器、聖遺物、編成へのリンクをバージョンページ上で見える位置に保ちます。',
      },
    ],
    firstSteps: [
      {
        zh: '先看当前与下期卡池，再核对兑换码和活动日历。',
        en: 'Check current/next banners first, then verify codes and event timing.',
        ja: 'まず現在/次回バナーを確認し、コードとイベント日程を照合します。',
      },
      {
        zh: '抽卡前把原石、保底和目标角色优先级排好。',
        en: 'Before pulling, rank Primogems, pity, and target-character priority.',
        ja: 'ガチャ前に原石、天井、目標キャラの優先度を整理します。',
      },
    ],
    links: [
      { type: 'banner', href: '/genshin/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' } },
      { type: 'codes', href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/genshin/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'map', href: '/genshin/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
      { type: 'guides', href: '/genshin/guides/luna-viii-sandrone-guide', label: { zh: '版本专题', en: 'Version guide', ja: '版本特集' } },
    ],
  },
  skjh: {
    gameId: 'skjh',
    currentVersion: 'August collab',
    releaseDate: '2026-08-14',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '8 月 14 日重点是联动活动、官方下载、服务器模式、新手 0-2 小时路线和防抄家内容。',
      en: 'The August 14 focus is collab content, official download, server modes, first 0-2 hours, and base-defense guidance.',
      ja: '8月14日の重点はコラボ、公式DL、サーバーモード、最初の0-2時間、拠点防衛です。',
    },
    whatChanged: [
      {
        zh: '内容从上线前问答转向上线后实操：怎么下载、选什么服务器、前两小时怎么开荒。',
        en: 'Coverage moves from pre-launch FAQs to practical post-launch tasks: download, server choice, and first-session routing.',
        ja: 'リリース前FAQから、DL、サーバー選択、初回プレイ導線へ移行します。',
      },
    ],
    firstSteps: [
      {
        zh: '先走官方下载和账号入口，再选择服务器模式。',
        en: 'Start with official download/account entry, then choose a server mode.',
        ja: 'まず公式DLとアカウント入口を確認し、サーバーモードを選びます。',
      },
      {
        zh: '进入游戏后按 0-2 小时路线稳定资源和基地。',
        en: 'After entering the game, follow the 0-2 hour route to stabilize resources and base setup.',
        ja: 'ゲーム開始後は0-2時間ルートで資源と拠点を安定させます。',
      },
    ],
    links: [
      { type: 'download', href: '/skjh/download', label: { zh: '官方下载', en: 'Official download', ja: '公式DL' } },
      { type: 'codes', href: '/skjh/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/skjh/weapons', label: { zh: '武器资料', en: 'Weapons', ja: '武器' } },
      { type: 'guides', href: '/skjh/guides/first-2-hours-starter-route', label: { zh: '新手路线', en: 'Starter route', ja: '序盤ルート' } },
    ],
  },
  endfield: {
    gameId: 'endfield',
    currentVersion: 'August test watch',
    releaseDate: '2026-08-14',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '8 月重点是全面测试资格、下载平台、角色、蓝图和 AIC 工厂系统。',
      en: 'The August watch focuses on test access, download platforms, characters, blueprints, and the AIC factory system.',
      ja: '8月はテスト資格、DL平台、キャラ、設計図、AIC工場システムが中心です。',
    },
    whatChanged: [
      {
        zh: '测试期页面需要把资格、下载、角色和工厂系统放在同一条入口。',
        en: 'Test-era pages should connect access, downloads, characters, and factory systems in one route.',
        ja: 'テスト期ページでは資格、DL、キャラ、工場システムを一つの導線にまとめます。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认测试资格和平台状态，再看蓝图/AIC 工厂入门。',
        en: 'Confirm test access and platform status first, then read the blueprint/AIC factory intro.',
        ja: 'まずテスト資格と平台状態を確認し、設計図/AIC工場入門へ進みます。',
      },
      {
        zh: '未确认上线日期保持 watch 口径，不写成正式定档。',
        en: 'Keep unconfirmed release timing in watch wording instead of treating it as a final date.',
        ja: '未確認リリース時期は正式日程ではなく注目表現に留めます。',
      },
    ],
    links: [
      { type: 'download', href: '/endfield/download', label: { zh: '下载 / 测试', en: 'Download / Tests', ja: 'DL / テスト' } },
      { type: 'codes', href: '/endfield/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/endfield/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/endfield/guides/homecoming-update-guide', label: { zh: '蓝图 / AIC', en: 'Blueprint / AIC', ja: '設計図 / AIC' } },
    ],
  },
  sea: {
    gameId: 'sea',
    currentVersion: 'mobile launch follow-up',
    releaseDate: '2026-08-14',
    status: 'fresh',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '移动端首发后重点承接 Steam、release date、gameplay、gacha、solo、PS5/Xbox 与平台边界问题。',
      en: 'After mobile launch, the hub routes Steam, release date, gameplay, gacha, solo, PS5/Xbox, and platform-boundary questions.',
      ja: 'モバイル開始後はSteam、release date、gameplay、ガチャ、ソロ、PS5/Xbox、平台境界を案内します。',
    },
    whatChanged: [
      {
        zh: '遗忘之海从首发时间线转入平台、玩法类型和付费机制 FAQ 承接。',
        en: 'Sea of Remnants moves from launch timeline into platform, gameplay-type, and monetization FAQ routing.',
        ja: 'Sea of Remnantsは開始年表から平台、玩法タイプ、課金FAQへ移ります。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 Steam / 官方 / 移动端入口，再判断 gacha、solo 和 MMO 边界。',
        en: 'Confirm Steam, official, and mobile entry first, then evaluate gacha, solo, and MMO boundaries.',
        ja: 'まずSteam、公式、モバイル入口を確認し、ガチャ、ソロ、MMO境界を判断します。',
      },
      {
        zh: 'PS5/Xbox 不写成确认日期，除非官方商店或公告明确。',
        en: 'Do not publish PS5/Xbox dates unless official stores or notices confirm them.',
        ja: 'PS5/Xboxの日付は公式ストアか告知が確認するまで書きません。',
      },
    ],
    links: [
      { type: 'download', href: '/sea/download', label: { zh: '平台下载', en: 'Platform download', ja: '平台DL' } },
      { type: 'codes', href: '/sea/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/sea/characters', label: { zh: '船员', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/sea/guides/platform-download-guide', label: { zh: 'Steam / 平台 FAQ', en: 'Steam / Platform FAQ', ja: 'Steam / 平台FAQ' } },
    ],
  },
  ananta: {
    gameId: 'ananta',
    currentVersion: 'global launch prep',
    releaseDate: '2027-01-15',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '无限大已进入 2027年1月15日全球上线准备，承接 release date、download、PS5、PC、Android、iOS、gameplay 和 no-gacha 搜索。',
      en: 'Ananta is now in January 15, 2027 global launch prep, routing release date, download, PS5, PC, Android, iOS, gameplay, and no-gacha searches.',
      ja: 'Anantaは2027年1月15日のグローバル配信準備段階として、release date、DL、PS5、PC、Android、iOS、gameplay、ガチャなし検索を案内します。',
    },
    whatChanged: [
      {
        zh: '官网与 gamescom 2026 信息更新后，全球上线日期按 2027年1月15日处理。',
        en: 'After the official site and gamescom 2026 update, the global launch date is handled as January 15, 2027.',
        ja: '公式サイトとgamescom 2026更新後、グローバル配信日は2027年1月15日として扱います。',
      },
      {
        zh: '平台口径更新为 PS5、PC、Android 和 iOS；Steam/Xbox 不再作为确认平台承接。',
        en: 'Platform wording now uses PS5, PC, Android, and iOS; Steam/Xbox are no longer treated as confirmed platforms.',
        ja: 'プラットフォーム表記はPS5、PC、Android、iOSへ更新し、Steam/Xboxは確定扱いにしません。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 PS5、PC、Android、iOS 的官方商店/官网入口，再看预下载和 beta 资格。',
        en: 'Confirm PS5, PC, Android, and iOS official/store entries first, then preload and beta eligibility.',
        ja: 'まずPS5、PC、Android、iOSの公式/ストア入口を確認し、事前DLとbeta資格を確認します。',
      },
      {
        zh: '搜索词里的“无限大符号”是歧义词，不承接到游戏内容。',
        en: 'The math-symbol query is off-topic and should not route into game content.',
        ja: '数学記号の検索意図はゲーム内容に接続しません。',
      },
    ],
    links: [
      { type: 'download', href: '/ananta/download', label: { zh: 'PS5 / PC / 移动端', en: 'PS5 / PC / Mobile', ja: 'PS5 / PC / モバイル' } },
      { type: 'codes', href: '/ananta/items', label: { zh: '资料入口', en: 'Data hub', ja: 'データ' } },
      { type: 'characters', href: '/ananta/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/ananta/guides/release-date-beta-pc-faq', label: { zh: '上线日期 FAQ', en: 'Release FAQ', ja: '配信日FAQ' } },
    ],
  },
  guihuan: {
    gameId: 'guihuan',
    currentVersion: 'test timeline watch',
    releaseDate: '2026-08-14',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '归环继续以测试时间线、开发商、国际服、官网、公测和测试招募事实核查承接。',
      en: 'Guihuan stays in test-timeline watch mode for developer, global-server, official site, public beta, and recruitment checks.',
      ja: '帰環はテスト年表、開発元、国際版、公式、公測、テスト募集を確認します。',
    },
    whatChanged: [
      {
        zh: '页面需要把开发商和上线时间事实核查放在首屏，避免误写未确认公测日期。',
        en: 'The page should foreground developer and release-date fact checks to avoid unconfirmed public-beta claims.',
        ja: '開発元とリリース時期の事実確認を先に出し、未確認公測日を避けます。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认官网与测试招募状态，再解释国际服和开发商问题。',
        en: 'Confirm official site and test recruitment first, then explain global-server and developer questions.',
        ja: 'まず公式サイトとテスト募集を確認し、国際版と開発元を説明します。',
      },
      {
        zh: '“库洛”等联想词需要核验，不直接写成开发商结论。',
        en: 'Terms like Kuro need verification and should not be published as developer conclusions.',
        ja: 'Kuroなどの語は検証が必要で、開発元結論として書きません。',
      },
    ],
    links: [
      { type: 'download', href: '/guihuan/download', label: { zh: '下载 / 测试', en: 'Download / Tests', ja: 'DL / テスト' } },
      { type: 'codes', href: '/guihuan/items', label: { zh: '资料入口', en: 'Data hub', ja: 'データ' } },
      { type: 'characters', href: '/guihuan/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/guihuan/guides/test-release-timeline-guide', label: { zh: '测试时间线', en: 'Test timeline', ja: 'テスト年表' } },
    ],
  },
};

export function getVersionSnapshot(gameId: GameId): VersionSnapshot | undefined {
  return VERSION_SNAPSHOTS[gameId];
}

export function localizeVersionText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.zh;
}

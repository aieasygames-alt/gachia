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

export const VERSION_SNAPSHOT_UPDATED_AT = '2026-09-03';

export const VERSION_SNAPSHOTS: Partial<Record<GameId, VersionSnapshot>> = {
  zzz: {
    gameId: 'zzz',
    currentVersion: '3.2 release hub',
    releaseDate: '2026-09-09',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '3.2 release hub 已进入上线倒计时，当前重点是 Claret、Roxy、Armorer、Maim、版本时间、过期直播码和 HoYoLAND 2026。',
      en: 'The v3.2 release hub is in countdown mode, focusing on Claret, Roxy, Armorer, Maim, timing, expired livestream codes, and HoYoLAND 2026.',
      ja: 'v3.2リリースハブはカウントダウン段階です。Claret、Roxy、Armorer、Maim、時期、期限切れコード、HoYoLAND 2026を案内します。',
    },
    whatChanged: [
      {
        zh: '版本页从直播后 recap 切到 3.2 上线前倒计时。',
        en: 'The hub moves from post-stream recap into v3.2 pre-launch countdown mode.',
        ja: '版本ページを配信後まとめからv3.2実装前カウントダウンへ移します。',
      },
      {
        zh: '过期直播码和平台下载入口保留，但不再作为主要转化点。',
        en: 'Expired livestream codes and platform download links remain visible but are no longer the primary conversion point.',
        ja: '期限切れコードとプラットフォームDLは残しますが、主導線にはしません。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 3.2 上线日期，再确认 Claret 和 Roxy 的抽取优先级。',
        en: 'Check the v3.2 launch date first, then decide Claret and Roxy pull priority.',
        ja: 'まずv3.2の実装日を確認し、その後ClaretとRoxyの優先度を決めます。',
      },
      {
        zh: '直播码只保留过期说明，不放入可领取模块。',
        en: 'Keep livestream codes in expired context only, not in claimable modules.',
        ja: '配信コードは期限切れ文脈のみで扱い、受取可能欄には入れません。',
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
    currentVersion: '3.6 live',
    releaseDate: '2026-08-20',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '3.6 已进入上线后承接，重点是卡池、兑换码、角色、地图和 Xbox/Steam 新玩家入口。',
      en: 'v3.6 is now in post-launch routing, focusing on banners, codes, characters, maps, and Xbox/Steam starter routes.',
      ja: 'v3.6は実装後の導線へ移り、バナー、コード、キャラ、マップ、Xbox/Steam入門が中心です。',
    },
    whatChanged: [
      {
        zh: '版本页首屏从 3.6 维护口径切到上线后卡池、地图和平台入口。',
        en: 'The hub moves from v3.6 maintenance wording into post-launch banners, maps, and platform routes.',
        ja: '版本ページをv3.6メンテ表現から実装後バナー、マップ、平台導線へ更新します。',
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
      { type: 'guides', href: '/wuwa/guides/v3-6-qingxiao-jingran-post-launch-route', label: { zh: '3.6 路线', en: 'v3.6 route', ja: 'v3.6ルート' } },
    ],
  },
  starrail: {
    gameId: 'starrail',
    currentVersion: '4.5 live',
    releaseDate: '2026-08-26',
    status: 'fresh',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '4.5 已上线，当前重点是 Phase 2、兑换码、当前跃迁和队伍构建。',
      en: 'v4.5 is live, with focus on Phase 2, codes, current warps, and team-building.',
      ja: 'v4.5は実装済みで、Phase 2、コード、現在跳躍、編成が中心です。',
    },
    whatChanged: [
      {
        zh: '页面继续从单版本专题扩展到 4.5 Phase 2 和队伍构建的常青入口。',
        en: 'The page expands from a single-version hub into an evergreen 4.5 Phase 2 and team-building route.',
        ja: '単一版本特集から4.5 Phase 2と編成の常設導線へ広げます。',
      },
      {
        zh: 'Banner、4.5 Phase 2 和兑换码页互相打通，减少用户重复跳转。',
        en: 'Banner, Phase 2, and code pages now reinforce each other to reduce repeated navigation.',
        ja: 'バナー、Phase 2、コードページを相互接続し、移動の手間を減らします。',
      },
    ],
    firstSteps: [
      {
        zh: '先领版本奖励，再计算 4.5 目标缺口。',
        en: 'Claim version rewards first, then calculate 4.5 target gaps.',
        ja: 'まず版本報酬を受け取り、4.5目標の不足を計算します。',
      },
      {
        zh: '资源紧张时，只锁定一个 4.5 目标。',
        en: 'With limited resources, lock one 4.5 target first.',
        ja: '資源が少ない場合は、4.5目標を一つに絞ります。',
      },
    ],
    links: [
      { type: 'banner', href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current warps', ja: '現在跳躍' } },
      { type: 'codes', href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/starrail/guides/4x-fate-gilgamesh-kafka-cyrene-evergreen-plan', label: { zh: '4.x 规划', en: '4.x plan', ja: '4.x計画' } },
    ],
  },
  nte: {
    gameId: 'nte',
    currentVersion: '1.2 phase two',
    releaseDate: '2026-08-14',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '1.2 后半继续承接 Iroi、Shinku、999 Nights，新增 2026-08-31 至 2026-09-14 活动窗口；1.3 只保持监控口径。',
      en: 'v1.2 phase two continues routing Iroi, Shinku, and 999 Nights, with an August 31 to September 14 event window; v1.3 stays in watch wording.',
      ja: 'v1.2後半はIroi、Shinku、999 Nightsを継続し、2026年8月31日から9月14日のイベント期間を追加します。v1.3は注目表現に留めます。',
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
      { type: 'guides', href: '/nte/guides/aug31-sep14-event-calendar-999-nights', label: { zh: '活动日历', en: 'Event calendar', ja: 'イベント日程' } },
    ],
  },
  genshin: {
    gameId: 'genshin',
    currentVersion: 'Luna I pre-launch',
    releaseDate: '2026-09-10',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: 'Luna I 已进入上线前最后一周，优先承接 Nod-Krai、Lauma、Flins、Aino、免费 5 星、回归奖励和地图准备。',
      en: 'Luna I is in its final pre-launch week, routing Nod-Krai, Lauma, Flins, Aino, free-5-star planning, returning-player rewards, and map prep.',
      ja: 'Luna Iは実装前の最終週です。Nod-Krai、Lauma、Flins、Aino、無料5星、復帰報酬、マップ準備を案内します。',
    },
    whatChanged: [
      {
        zh: '版本页从 7.0 Phase II 改为 Luna I 上线前清单。',
        en: 'The hub narrows from v7.0 Phase II into a Luna I pre-launch checklist.',
        ja: '版本ページをv7.0 Phase IIからLuna I実装前チェックリストへ切り替えます。',
      },
      {
        zh: '回归奖励、免费 5 星和地图入口保持在版本页可见位置。',
        en: 'Returning-player rewards, free-5-star planning, and map entries stay visible from the version hub.',
        ja: '復帰報酬、無料5星、マップ入口を版本ページで見える位置に保ちます。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 Luna I 上线前准备，再核对兑换码、Nod-Krai 地图和免费 5 星规划。',
        en: 'Check Luna I prep first, then verify codes, Nod-Krai maps, and free-5-star planning.',
        ja: 'まずLuna I準備を確認し、コード、Nod-Kraiマップ、無料5星計画を照合します。',
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
      { type: 'guides', href: '/genshin/guides/nod-krai-cryoculus-phase-ii-checklist', label: { zh: 'Phase II 清单', en: 'Phase II checklist', ja: 'Phase IIチェック' } },
    ],
  },
  skjh: {
    gameId: 'skjh',
    currentVersion: 'August event wrap-up',
    releaseDate: '2026-09-03',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '8/31 活动进入收尾节点，重点改为活动结束后还能做什么、WeGame 下载注册、礼包、S1 开荒、服务器模式和防抄家。',
      en: 'The August 31 event window is wrapping up, shifting focus to post-event catch-up, WeGame download/registration, rewards, S1 starts, server modes, and base-defense guidance.',
      ja: '8月31日のイベント終了期に入り、終了後の追いつき、WeGame DL/登録、報酬、S1序盤、サーバーモード、拠点防衛を重視します。',
    },
    whatChanged: [
      {
        zh: '活动页从进行中提醒改成收尾和补课路线，避免继续暗示奖励长期可领。',
        en: 'Event coverage moves from active reminders into wrap-up and catch-up routing, avoiding stale reward claims.',
        ja: 'イベント案内を開催中表現から終了期と追いつき導線へ切り替え、古い報酬表現を避けます。',
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
      { type: 'guides', href: '/skjh/guides/aug31-event-ended-beginner-catchup', label: { zh: '活动后补课', en: 'Post-event catch-up', ja: 'イベント後追いつき' } },
    ],
  },
  endfield: {
    gameId: 'endfield',
    currentVersion: 'Steam Pioneer Test last call',
    releaseDate: '2026-09-10',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: 'Steam Pioneer Test 仍是 9/10 前强时效窗口，当前重点是测试资格、Steam 下载、Homecoming、角色、蓝图和 AIC 工厂系统。',
      en: 'Steam Pioneer Test recruitment remains the last-call signal, with focus on test access, Steam download, Homecoming, characters, blueprints, and the AIC factory system.',
      ja: 'Steam Pioneer Test募集はラストコールです。テスト資格、Steam DL、Homecoming、キャラ、設計図、AIC工場を中心に案内します。',
    },
    whatChanged: [
      {
        zh: '测试期页面需要把 Steam 招募、资格、下载、角色和工厂系统放在同一条入口。',
        en: 'Test-era pages should connect Steam recruitment, access, downloads, characters, and factory systems in one route.',
        ja: 'テスト期ページではSteam募集、資格、DL、キャラ、工場システムを一つの導線にまとめます。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 Steam Pioneer Test 资格和平台状态，再看蓝图/AIC 工厂入门。',
        en: 'Confirm Steam Pioneer Test eligibility and platform status first, then read the blueprint/AIC factory intro.',
        ja: 'まずSteam Pioneer Test資格と平台状態を確認し、設計図/AIC工場入門へ進みます。',
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
    currentVersion: 'early 2027 / December beta watch',
    releaseDate: '2026-09-03',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '海外口径转向 early 2027 和 December closed beta，当前重点是 release date、closed beta、Steam、PS5、Xbox、mobile、gacha 和 solo FAQ。',
      en: 'The overseas signal has shifted toward early 2027 and a December closed beta, so route release date, closed beta, Steam, PS5, Xbox, mobile, gacha, and solo FAQs.',
      ja: '海外シグナルはearly 2027と12月クローズドβへ移っています。release date、closed beta、Steam、PS5、Xbox、mobile、ガチャ、solo FAQを案内します。',
    },
    whatChanged: [
      {
        zh: '遗忘之海从泛 2026 观察改成 early 2027 / December closed beta 的谨慎事实核查。',
        en: 'Sea of Remnants moves from broad 2026 watch wording into cautious early 2027 / December closed-beta fact checks.',
        ja: 'Sea of Remnantsは広い2026注目から、early 2027 / 12月クローズドβの慎重な事実確認へ移ります。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认官网、Steam 和 closed beta 状态，再判断 PS5/Xbox/mobile、gacha、solo 和 MMO 边界。',
        en: 'Confirm official, Steam, and closed-beta status first, then evaluate PS5/Xbox/mobile, gacha, solo, and MMO boundaries.',
        ja: 'まず公式、Steam、クローズドβ状態を確認し、その後PS5/Xbox/mobile、ガチャ、solo、MMO境界を判断します。',
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

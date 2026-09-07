import type { GameId, SupportedLocale } from '@gachia/core';
import type { LocalizedText, LiveStatus } from './live-content';

export type VersionSnapshotLinkType = 'banner' | 'codes' | 'characters' | 'guides' | 'builds' | 'download' | 'map';
export type VersionSnapshotSourceTier = 'official' | 'mixed' | 'third_party_watch';

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
  sourceTier?: VersionSnapshotSourceTier;
  summary: LocalizedText;
  whatChanged: LocalizedText[];
  firstSteps: LocalizedText[];
  links: VersionSnapshotLink[];
}

export const VERSION_SNAPSHOT_UPDATED_AT = '2026-09-07';

export const VERSION_SNAPSHOTS: Partial<Record<GameId, VersionSnapshot>> = {
  zzz: {
    gameId: 'zzz',
    currentVersion: '3.2 launch day route',
    releaseDate: '2026-09-09',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: '3.2 已进入 9/9 上线前最后窗口，当前重点是 Claret、Roxy、Armorer、Maim、rerun、平台入口和首日路线。',
      en: 'v3.2 is in its final September 9 launch window, focusing on Claret, Roxy, Armorer, Maim, reruns, platform entry, and launch-day routing.',
      ja: 'v3.2は9月9日実装前の最終段階です。Claret、Roxy、Armorer、Maim、復刻、平台入口、初日ルートを案内します。',
    },
    whatChanged: [
      {
        zh: '版本页从 release countdown 升级为 launch-day route。',
        en: 'The hub moves from release countdown into a launch-day route.',
        ja: '版本ページをリリースカウントダウンから初日ルートへ移します。',
      },
      {
        zh: '直播码继续标为 expired，首屏改为“何时开、先做什么、平台怎么进”。',
        en: 'Livestream codes stay marked expired while the first screen answers timing, first steps, and platform entry.',
        ja: '配信コードは期限切れ扱いのまま、初画面で時期、初手、平台入口を答えます。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 9/9 开服和平台入口，再看 Claret/Roxy 与 rerun 优先级。',
        en: 'Confirm the September 9 launch and platform entry first, then decide Claret/Roxy and rerun priority.',
        ja: 'まず9月9日の実装と平台入口を確認し、その後Claret/Roxyと復刻の優先度を決めます。',
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
      { type: 'guides', href: '/zzz/guides/v3-2-livestream-recap-expired-codes', label: { zh: '3.2 首日路线', en: 'v3.2 launch route', ja: 'v3.2初日ルート' } },
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
    sourceTier: 'mixed',
    summary: {
      zh: '3.6 已接近 Phase 2/Jingran 预热窗口，重点是卡池、兑换码、地图和 Xbox/Steam 新玩家入口。',
      en: 'v3.6 is nearing the Phase 2/Jingran prep window, focusing on banners, codes, maps, and Xbox/Steam starter routes.',
      ja: 'v3.6はPhase 2/Jingran準備期間に近づき、バナー、コード、マップ、Xbox/Steam入門が中心です。',
    },
    whatChanged: [
      {
        zh: '版本页从上线后承接推进到 Phase 2/Jingran watch。',
        en: 'The hub moves from post-launch routing into Phase 2/Jingran watch.',
        ja: '版本ページを実装後導線からPhase 2/Jingran注目へ進めます。',
      },
      {
        zh: '角色机制细节只用已核验口径，避免把爆料写成正式内容。',
        en: 'Character mechanics stay within verified wording so leaks do not become published facts.',
        ja: 'キャラ性能は確認済み表現に留め、リークを正式情報として扱いません。',
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
    sourceTier: 'official',
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
    currentVersion: 'September codes / banner calendar',
    releaseDate: '2026-09-07',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '9 月 codes 与 banner calendar 信号增强，重点是 Linko、Hotori、active/expired codes、redeem path 和来源分层。',
      en: 'September codes and banner-calendar signals are stronger, focusing on Linko, Hotori, active/expired codes, redeem paths, and source labeling.',
      ja: '9月コードとバナーカレンダーのシグナルが強まり、Linko、Hotori、有効/期限切れコード、交換導線、出典ラベルを案内します。',
    },
    whatChanged: [
      {
        zh: 'NTE 从泛活动路线改为 codes、banner calendar 和来源等级路线。',
        en: 'NTE moves from broad event routing into codes, banner calendar, and source-tier routing.',
        ja: 'NTEは広いイベント導線からコード、バナーカレンダー、出典分類へ移ります。',
      },
    ],
    firstSteps: [
      {
        zh: '先区分 active、expired、unknown 兑换码，再看 Linko/Hotori 日历。',
        en: 'Separate active, expired, and unknown codes first, then review the Linko/Hotori calendar.',
        ja: 'まず有効、期限切れ、不明コードを分け、その後Linko/Hotoriカレンダーを確認します。',
      },
      {
        zh: '攻略站来源不能直接写成官方日期，页面要保留来源标签。',
        en: 'Guide-site dates should not become official dates; keep source labels on the page.',
        ja: '攻略サイトの日付を公式日程として扱わず、ページに出典ラベルを残します。',
      },
    ],
    links: [
      { type: 'download', href: '/nte/download', label: { zh: '下载', en: 'Download', ja: 'DL' } },
      { type: 'codes', href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/nte/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/nte/guides/aug31-sep14-event-calendar-999-nights', label: { zh: '9月日历', en: 'September calendar', ja: '9月日程' } },
    ],
  },
  genshin: {
    gameId: 'genshin',
    currentVersion: 'Luna I pre-launch',
    releaseDate: '2026-09-10',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'Luna I 仍是 9/10 前核心入口，优先承接 Nod-Krai、Lauma、Flins、Aino、免费 5 星、周年/回归奖励和地图材料。',
      en: 'Luna I remains the key September 10 prep route, covering Nod-Krai, Lauma, Flins, Aino, free-5-star planning, anniversary/returning rewards, and map materials.',
      ja: 'Luna Iは9月10日前の主要導線です。Nod-Krai、Lauma、Flins、Aino、無料5星、周年/復帰報酬、マップ素材を案内します。',
    },
    whatChanged: [
      {
        zh: '版本页从上线前清单推进到 final prep，首屏强调 9/10 前最后检查。',
        en: 'The hub moves from pre-launch checklist into final prep, foregrounding the last September 10 checks.',
        ja: '版本ページを実装前チェックリストからfinal prepへ進め、9月10日前の最終確認を強調します。',
      },
      {
        zh: '回归奖励、免费 5 星和地图入口保持在版本页可见位置。',
        en: 'Returning-player rewards, free-5-star planning, and map entries stay visible from the version hub.',
        ja: '復帰報酬、無料5星、マップ入口を版本ページで見える位置に保ちます。',
      },
    ],
    firstSteps: [
      {
        zh: '先完成 Luna I final prep，再核对兑换码、Nod-Krai 地图、材料和免费 5 星规划。',
        en: 'Finish Luna I final prep first, then verify codes, Nod-Krai maps, materials, and free-5-star planning.',
        ja: 'まずLuna I final prepを済ませ、コード、Nod-Kraiマップ、素材、無料5星計画を確認します。',
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
      { type: 'guides', href: '/genshin/guides/nod-krai-cryoculus-phase-ii-checklist', label: { zh: 'Luna I 清单', en: 'Luna I checklist', ja: 'Luna Iチェック' } },
    ],
  },
  skjh: {
    gameId: 'skjh',
    currentVersion: 'August event wrap-up',
    releaseDate: '2026-09-07',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: '上线后常青需求稳定，重点是官方下载、礼包、PC 配置、服务器模式、安全区/标准/挑战和防抄家。',
      en: 'Post-launch evergreen demand is stable, focusing on official download, rewards, PC specs, server modes, safe/standard/challenge routes, and base defense.',
      ja: '実装後の常設需要は安定しており、公式DL、報酬、PC構成、サーバーモード、安全/標準/挑戦、拠点防衛を案内します。',
    },
    whatChanged: [
      {
        zh: '页面继续从活动收尾转向新手常青内容，避免承接过期礼包词。',
        en: 'Coverage continues moving from event wrap-up into evergreen beginner content, avoiding expired reward terms.',
        ja: 'イベント終了案内から初心者向け常設内容へ進め、期限切れ報酬語を避けます。',
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
    currentVersion: 'Steam Pioneer Test cutoff',
    releaseDate: '2026-09-10',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'Steam Pioneer Test 已进入 9/10 13:00 UTC+8 截止倒计时，重点是资格、Steam 下载、测试奖励、蓝图和 AIC 工厂。',
      en: 'Steam Pioneer Test is in its September 10 13:00 UTC+8 cutoff countdown, focusing on access, Steam download, test rewards, blueprints, and the AIC factory.',
      ja: 'Steam Pioneer Testは9月10日13:00 UTC+8締切カウントダウンです。資格、Steam DL、テスト報酬、設計図、AIC工場を案内します。',
    },
    whatChanged: [
      {
        zh: '版本页要突出截止时间，并准备 9/10 后切换到 recap/expired。',
        en: 'The hub should foreground the cutoff and prepare a post-September-10 recap/expired switch.',
        ja: '版本ページで締切を強調し、9月10日後のrecap/expired切替を準備します。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 9/10 13:00 UTC+8 前是否还能报名，再看 Steam 下载和测试奖励。',
        en: 'Check whether registration is still open before September 10 13:00 UTC+8, then review Steam download and test rewards.',
        ja: 'まず9月10日13:00 UTC+8前に応募可能か確認し、その後Steam DLとテスト報酬を確認します。',
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
  aniimo: {
    gameId: 'aniimo',
    currentVersion: 'global launch countdown',
    releaseDate: '2026-09-16',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'Aniimo 官方上线倒计时继续增强，PC/主机指向 2026-09-16，移动端指向 2026-09-23，重点是平台、预购、starter、capture 和地图入口。',
      en: 'Aniimo launch countdown is getting stronger, with PC/console on September 16, 2026 and mobile on September 23, focusing on platforms, pre-order, starter, capture, and map entry.',
      ja: 'Aniimoのリリースカウントダウンが強まっています。PC/コンソールは2026年9月16日、モバイルは9月23日で、平台、予約、starter、capture、マップ入口が中心です。',
    },
    whatChanged: [
      {
        zh: '版本页需要从泛 release date 升级为分平台上线倒计时。',
        en: 'The version hub should move from broad release-date coverage into platform-specific launch countdown.',
        ja: '版本ページを広いrelease date案内から平台別カウントダウンへ進めます。',
      },
      {
        zh: 'download、starter、capture/twine 和 map 入口需要互相导流。',
        en: 'Download, starter, capture/twine, and map entries should cross-link.',
        ja: 'download、starter、capture/twine、map入口を相互接続します。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认自己的平台是 9/16 还是 9/23，再看预购/预注册和下载入口。',
        en: 'Check whether your platform launches on September 16 or September 23, then review pre-order/pre-registration and download entry.',
        ja: '自分の平台が9月16日か9月23日か確認し、予約/事前登録とDL入口を見ます。',
      },
      {
        zh: '入坑内容优先回答 starter、捕捉玩法和地图区域。',
        en: 'Starter content should prioritize starter choice, creature-catching, and map regions.',
        ja: '入門内容はstarter、捕獲玩法、マップ地域を優先します。',
      },
    ],
    links: [
      { type: 'download', href: '/aniimo/download', label: { zh: '平台下载', en: 'Platform download', ja: '平台DL' } },
      { type: 'codes', href: '/aniimo/items', label: { zh: '资料入口', en: 'Data hub', ja: 'データ' } },
      { type: 'characters', href: '/aniimo/characters', label: { zh: 'Aniimo 图鉴', en: 'Aniimo index', ja: 'Aniimo図鑑' } },
      { type: 'guides', href: '/aniimo/guides/download', label: { zh: '下载 FAQ', en: 'Download FAQ', ja: 'DL FAQ' } },
    ],
  },
  sea: {
    gameId: 'sea',
    currentVersion: 'early 2027 / December beta watch',
    releaseDate: '2026-09-07',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
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
  roco: {
    gameId: 'roco',
    currentVersion: 'Quack Quack Test watch',
    releaseDate: '2026-09-07',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'third_party_watch',
    summary: {
      zh: 'Roco Global 出现 October 27 / Quack Quack Test 第三方 CBT 信号，当前应作为待官方核验的 watch 入口，并继续与 Roco CN 分流。',
      en: 'Roco Global has third-party October 27 / Quack Quack Test CBT signals, so treat it as a watch entry pending official verification and keep it separate from Roco CN.',
      ja: 'Roco Globalには第三者のOctober 27 / Quack Quack Test CBTシグナルがあります。公式確認待ちのwatch入口として扱い、Roco CNと分けます。',
    },
    whatChanged: [
      {
        zh: '页面从单纯 global/CN 分流推进到 CBT watch，但 10/27 不写成官方日期。',
        en: 'The page moves from global/CN separation into CBT watch, without treating October 27 as an official date.',
        ja: 'ページをglobal/CN分流からCBT watchへ進めますが、10月27日を公式日程として扱いません。',
      },
    ],
    firstSteps: [
      {
        zh: '先看官方是否确认 CBT，再决定是否承接 Quack Quack Test 申请路线。',
        en: 'Check official CBT confirmation first, then decide how to route Quack Quack Test registration.',
        ja: 'まず公式CBT確認を見てから、Quack Quack Test応募導線を判断します。',
      },
      {
        zh: '国服上线、兑换码和图鉴内容继续留在 Roco CN 页面。',
        en: 'China launch, codes, and encyclopedia content stay on Roco CN pages.',
        ja: '中国版リリース、コード、図鑑内容はRoco CNページに残します。',
      },
    ],
    links: [
      { type: 'download', href: '/roco/download', label: { zh: '平台入口', en: 'Platform entry', ja: '平台入口' } },
      { type: 'codes', href: '/roco/items', label: { zh: '资料入口', en: 'Data hub', ja: 'データ' } },
      { type: 'characters', href: '/roco/characters', label: { zh: '生物图鉴', en: 'Creatures', ja: '生物図鑑' } },
      { type: 'guides', href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 申请', en: 'CBT registration', ja: 'CBT応募' } },
    ],
  },
  'roco-cn': {
    gameId: 'roco-cn',
    currentVersion: 'post-launch codes / encyclopedia',
    releaseDate: '2026-09-07',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: 'Roco CN 继续承接国服上线后的兑换码、图鉴、活动、宠物推荐和新手路线，重点是有效期与来源标注。',
      en: 'Roco CN continues routing post-launch codes, encyclopedia, events, creature picks, and beginner paths, with focus on validity and source labels.',
      ja: 'Roco CNは中国版リリース後のコード、図鑑、イベント、ペット推薦、初心者ルートを案内し、有効期限と出典ラベルを重視します。',
    },
    whatChanged: [
      {
        zh: '国服内容从 global 页面分离，兑换码和图鉴入口保持在 Roco CN。',
        en: 'China-version content stays separated from global pages, with codes and encyclopedia entry kept on Roco CN.',
        ja: '中国版内容をglobalページから分け、コードと図鑑入口をRoco CNに置きます。',
      },
      {
        zh: '第三方兑换码多有过期风险，需要标注 active、expired 或 unknown。',
        en: 'Third-party code lists often expire, so mark codes as active, expired, or unknown.',
        ja: '第三者コード一覧は期限切れリスクが高いため、active、expired、unknownを明示します。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认兑换码来源和有效期，再进入宠物图鉴与活动路线。',
        en: 'Verify code source and validity first, then move into encyclopedia and event routing.',
        ja: 'まずコードの出典と有効期限を確認し、その後図鑑とイベント導線へ進みます。',
      },
      {
        zh: '全球版 CBT、预注册和海外平台问题不要写入国服页面。',
        en: 'Do not mix global CBT, pre-registration, or overseas-platform questions into China-version pages.',
        ja: 'global CBT、事前登録、海外平台の話題を中国版ページに混ぜません。',
      },
    ],
    links: [
      { type: 'download', href: '/roco-cn/download', label: { zh: '国服入口', en: 'CN entry', ja: '中国版入口' } },
      { type: 'codes', href: '/roco-cn/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/roco-cn/characters', label: { zh: '宠物图鉴', en: 'Creature index', ja: 'ペット図鑑' } },
      { type: 'guides', href: '/roco-cn/guides/s2-season-guide', label: { zh: '赛季路线', en: 'Season route', ja: 'シーズン導線' } },
    ],
  },
  ananta: {
    gameId: 'ananta',
    currentVersion: 'global launch prep',
    releaseDate: '2027-01-15',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
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
    sourceTier: 'official',
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

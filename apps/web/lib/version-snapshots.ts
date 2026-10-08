import type { GameId, SupportedLocale } from '@gachia/core';
import type { LocalizedText, LiveStatus } from './live-content';

export type VersionSnapshotLinkType = 'banner' | 'codes' | 'characters' | 'guides' | 'builds' | 'download' | 'map';
export type VersionSnapshotSourceTier = 'official' | 'mixed' | 'third_party_watch';

export interface VersionSnapshotLink {
  type: VersionSnapshotLinkType;
  href: string;
  label: LocalizedText;
}

export interface VersionSnapshotPlatformDate {
  platform: string;
  date: string;
  time?: string;
}

export interface VersionSnapshot {
  gameId: GameId;
  currentVersion: string;
  releaseDate: string;
  status: LiveStatus;
  lastUpdatedAt: string;
  sourceTier?: VersionSnapshotSourceTier;
  platformReleaseDates?: VersionSnapshotPlatformDate[];
  summary: LocalizedText;
  whatChanged: LocalizedText[];
  firstSteps: LocalizedText[];
  links: VersionSnapshotLink[];
}

export const VERSION_SNAPSHOT_UPDATED_AT = '2026-09-30';

export const VERSION_SNAPSHOTS: Partial<Record<GameId, VersionSnapshot>> = {
  aniimo: {
    gameId: 'aniimo',
    currentVersion: 'S1 逐风启程',
    releaseDate: '2026-09-23',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    platformReleaseDates: [
      { platform: 'PC / console / cloud', date: '2026-09-16' },
      { platform: 'iOS / Android', date: '2026-09-23' },
    ],
    summary: {
      zh: 'S1「逐风启程」已全平台上线。当前内容重点是新手开荒、虹光研究、家园资源、混沌模式与已知问题的官方核验。',
      en: 'S1 is live across platforms. The current hub prioritizes starter routes, Rainbow research, Homeland resources, Chaos mode, and official known-issue checks.',
      ja: 'S1「逐風啓程」は全プラットフォームで配信中です。初心者ルート、虹光研究、ホームランド資源、混沌モード、公式既知問題を優先します。',
    },
    whatChanged: [
      {
        zh: '版本页从上线倒计时切换为 S1 实装后的玩法与问题导航。',
        en: 'The hub moves from launch countdown into live S1 systems and issue navigation.',
        ja: 'バージョンページを配信カウントダウンからS1実装後のシステム・問題導線へ切り替えます。',
      },
      {
        zh: '虹光、自选、捕捉和研究进度保持分层，避免把赠送或外观变化写成统一结论。',
        en: 'Rainbow selectors, catches, gifts, and research progress remain separated instead of being presented as one universal rule.',
        ja: '虹光自選、捕獲、配布、研究進行は一律の結論にせず分けて扱います。',
      },
    ],
    firstSteps: [
      {
        zh: '先完成主线与系统引导，再安排捕捉、飞行回访、家园和限时活动。',
        en: 'Finish story and system tutorials before scheduling catches, flight revisits, Homeland, and limited events.',
        ja: 'メイン進行とシステム導入を終えてから、捕獲、飛行での再訪、ホームランド、期間限定イベントを進めます。',
      },
      {
        zh: '领取限时奖励前，核对活动页的条件、区服、结束时间和官方已知问题。',
        en: 'Before claiming a limited reward, verify the event requirements, server scope, end time, and official known issues.',
        ja: '期間限定報酬の受取前に、イベント条件、サーバー範囲、終了時刻、公式既知問題を確認します。',
      },
    ],
    links: [
      { type: 'guides', href: '/aniimo/guides/s1-new-player-route', label: { zh: 'S1 新手路线', en: 'S1 starter route', ja: 'S1 初心者ルート' } },
      { type: 'guides', href: '/aniimo/guides/rainbow-aniimo-guide', label: { zh: '虹光指南', en: 'Rainbow guide', ja: '虹光ガイド' } },
      { type: 'guides', href: '/aniimo/guides/homeland-resource-guide', label: { zh: '家园资源', en: 'Homeland resources', ja: 'ホームランド資源' } },
      { type: 'characters', href: '/aniimo/characters', label: { zh: '伊莫图鉴', en: 'Aniimo index', ja: 'Aniimo 図鑑' } },
      { type: 'map', href: '/aniimo/map', label: { zh: '区域地图', en: 'Region map', ja: '地域マップ' } },
      { type: 'codes', href: '/aniimo/redeem-codes', label: { zh: '兑换码与奖励', en: 'Codes and rewards', ja: 'コードと報酬' } },
    ],
  },
  zzz: {
    gameId: 'zzz',
    currentVersion: '3.3 watch / 3.2 recap',
    releaseDate: '2026-09-21',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '3.2 已进入上线后复盘，新增 3.3 前瞻、下期卡池、直播码提醒和平台玩家回流需求。',
      en: 'v3.2 is now in recap mode, with added v3.3 watch, next-banner planning, code reminders, and platform-player return routes.',
      ja: 'v3.2はまとめ段階に入り、v3.3前瞻、次回バナー、コード提醒、平台プレイヤー復帰需要を追加します。',
    },
    whatChanged: [
      {
        zh: '版本页从 3.2 首日路线扩展为 3.3 watch + 3.2 recap。',
        en: 'The hub expands from a v3.2 launch route into v3.3 watch plus v3.2 recap.',
        ja: '版本ページをv3.2初日ルートからv3.3注目 + v3.2まとめへ拡張します。',
      },
      {
        zh: '旧直播码继续只放 expired，新前瞻码出现后按 active/expired/unknown 分层。',
        en: 'Old livestream codes remain expired-only; new preview codes should be split into active, expired, and unknown states.',
        ja: '古い配信コードは期限切れのみ。新前瞻コードはactive/expired/unknownで分けます。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 3.2 复盘和平台入口，再为 3.3 下期卡池预留菲林。',
        en: 'Start with the v3.2 recap and platform entry, then reserve Polychrome for v3.3 banners.',
        ja: 'まずv3.2まとめと平台入口を確認し、v3.3バナー用にポリクロームを温存します。',
      },
      {
        zh: '兑换码页继续区分 active、expired、unknown。',
        en: 'Keep active, expired, and unknown code states separated.',
        ja: 'コードページではactive、expired、unknownを分け続けます。',
      },
    ],
    links: [
      { type: 'codes', href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/zzz/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/zzz/guides/v3-2-livestream-recap-expired-codes', label: { zh: '3.2 复盘', en: 'v3.2 recap', ja: 'v3.2まとめ' } },
      { type: 'download', href: '/zzz/download', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
      { type: 'builds', href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
    ],
  },
  wuwa: {
    gameId: 'wuwa',
    currentVersion: '3.7 watch / 3.6 Jingran recap',
    releaseDate: '2026-09-21',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '3.6 Jingran 进入收尾承接，3.7 前瞻、下期卡池、兑换码和地图活动成为新 watch 入口。',
      en: 'v3.6 Jingran moves into wrap-up while v3.7 watch, next banners, codes, and map events become the new entry.',
      ja: 'v3.6 Jingranはまとめに入り、v3.7注目、次回バナー、コード、マップイベントが新しい入口です。',
    },
    whatChanged: [
      {
        zh: '版本页从 3.6 当前窗口升级为 3.7 watch + 3.6 recap。',
        en: 'The hub moves from the v3.6 current window into v3.7 watch plus v3.6 recap.',
        ja: '版本ページをv3.6現在期間からv3.7注目 + v3.6まとめへ進めます。',
      },
      {
        zh: '角色机制细节继续只用已核验口径，未确认内容保留 watch 表达。',
        en: 'Character mechanics stay within verified wording, with unconfirmed details kept in watch phrasing.',
        ja: 'キャラ性能は確認済み表現に留め、未確認内容はwatch表現にします。',
      },
    ],
    firstSteps: [
      {
        zh: '先领兑换码，再看 3.6 Jingran 当前资源和 3.7 下期卡池预留。',
        en: 'Claim codes first, then review v3.6 Jingran resources and v3.7 banner reserves.',
        ja: 'まずコードを受け取り、v3.6 Jingran資源とv3.7バナー温存を確認します。',
      },
      {
        zh: 'Xbox/Game Pass 新玩家仍先确认登录、手柄和首周资源路线。',
        en: 'Xbox/Game Pass newcomers should still confirm login, controller setup, and first-week resources.',
        ja: 'Xbox/Game Pass新規は引き続きログイン、コントローラー、初週資源を確認します。',
      },
    ],
    links: [
      { type: 'banner', href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前/下期卡池', en: 'Current/next banners', ja: '現在/次回バナー' } },
      { type: 'codes', href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/wuwa/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'download', href: '/wuwa/download', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
      { type: 'map', href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
      { type: 'guides', href: '/wuwa/guides/v3-6-qingxiao-jingran-post-launch-route', label: { zh: '3.6 复盘', en: 'v3.6 recap', ja: 'v3.6まとめ' } },
    ],
  },
  starrail: {
    gameId: 'starrail',
    currentVersion: '4.6 special program watch',
    releaseDate: '2026-09-21',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: '4.6 前瞻与直播兑换码成为当前窗口，4.5 进入收尾资源和队伍规划阶段。',
      en: 'v4.6 special-program and livestream-code demand is now the current window, while v4.5 moves into wrap-up resource and team planning.',
      ja: 'v4.6前瞻と配信コード需要が現在の注目期間で、v4.5は資源と編成まとめ段階です。',
    },
    whatChanged: [
      {
        zh: '页面从 4.5 current window 切换为 4.6 special program / code deadline watch。',
        en: 'The page moves from the v4.5 current window into v4.6 special-program and code-deadline watch.',
        ja: 'ページをv4.5現在期間からv4.6前瞻 / コード期限watchへ切り替えます。',
      },
      {
        zh: 'Banner、直播码和抽取规划页互相打通，减少用户重复跳转。',
        en: 'Banner, livestream-code, and pull-planning pages reinforce each other to reduce repeated navigation.',
        ja: 'バナー、配信コード、抽選計画ページを相互接続し、移動の手間を減らします。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 4.6 直播码是否仍有效，再计算下期目标缺口。',
        en: 'Check whether v4.6 livestream codes are still valid first, then calculate gaps for next targets.',
        ja: 'まずv4.6配信コードが有効か確認し、次回目標の不足を計算します。',
      },
      {
        zh: '资源紧张时，只锁定一个 4.6 目标。',
        en: 'With limited resources, lock one v4.6 target first.',
        ja: '資源が少ない場合は、v4.6目標を一つに絞ります。',
      },
    ],
    links: [
      { type: 'banner', href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前/下期跃迁', en: 'Current/next warps', ja: '現在/次回跳躍' } },
      { type: 'codes', href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/starrail/guides/4x-fate-gilgamesh-kafka-cyrene-evergreen-plan', label: { zh: '4.x 规划', en: '4.x plan', ja: '4.x計画' } },
    ],
  },
  nte: {
    gameId: 'nte',
    currentVersion: 'September codes / banner calendar',
    releaseDate: '2026-09-12',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '9 月 codes 与 banner calendar 继续更新，重点是 Linko、Hotori、active/expired/unknown codes、redeem path 和来源分层。',
      en: 'September codes and banner-calendar coverage continues, focusing on Linko, Hotori, active/expired/unknown codes, redeem paths, and source labeling.',
      ja: '9月コードとバナーカレンダーの更新が続いており、Linko、Hotori、有効/期限切れ/不明コード、交換導線、出典ラベルが中心です。',
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
    currentVersion: '7.1 livestream / Luna II watch',
    releaseDate: '2026-09-21',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '公开需求已从 Luna I 上线后转向 7.1 前瞻、Luna II、Snezhnaya、Sandrone、直播码和下期卡池。',
      en: 'Public demand has shifted from Luna I recap into v7.1 watch, Luna II, Snezhnaya, Sandrone, livestream codes, and next banners.',
      ja: '公開需要はLuna Iまとめからv7.1注目、Luna II、Snezhnaya、Sandrone、配信コード、次回バナーへ移っています。',
    },
    whatChanged: [
      {
        zh: '版本页从 Luna I live recap 切到 7.1 livestream / next-version watch。',
        en: 'The hub moves from Luna I live recap into v7.1 livestream and next-version watch.',
        ja: '版本ページをLuna Iまとめからv7.1配信 / 次バージョンwatchへ切り替えます。',
      },
      {
        zh: 'Nod-Krai 地图、材料和奖励保留为历史/长尾入口。',
        en: 'Nod-Krai maps, materials, and rewards remain as history and long-tail routes.',
        ja: 'Nod-Kraiマップ、素材、報酬は履歴/長尾入口として残します。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 7.1 直播码和下期卡池，再回到 Nod-Krai 地图与材料补课。',
        en: 'Start with v7.1 livestream codes and next banners, then return to Nod-Krai maps and materials for catch-up.',
        ja: 'まずv7.1配信コードと次回バナーを確認し、その後Nod-Kraiマップと素材へ戻ります。',
      },
      {
        zh: '抽卡前把原石、保底和目标角色优先级排好。',
        en: 'Before pulling, rank Primogems, pity, and target-character priority.',
        ja: 'ガチャ前に原石、天井、目標キャラの優先度を整理します。',
      },
    ],
    links: [
      { type: 'banner', href: '/genshin/guides/banner-schedule-guide', label: { zh: '当前/下期卡池', en: 'Current/next banners', ja: '現在/次回バナー' } },
      { type: 'codes', href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/genshin/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'map', href: '/genshin/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
      { type: 'guides', href: '/genshin/guides/nod-krai-cryoculus-phase-ii-checklist', label: { zh: 'Nod-Krai 补课', en: 'Nod-Krai catch-up', ja: 'Nod-Krai補習' } },
    ],
  },
  skjh: {
    gameId: 'skjh',
    currentVersion: 'S2 制霸王座',
    releaseDate: '2026-09-21',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'S2「制霸王座」已成为当前主入口，重点是渗透补给、首充/限定礼包、服务器模式和防抄家。',
      en: 'S2 “制霸王座” is now the main entry, focusing on infiltration supplies, first-purchase/limited packs, server modes, and base defense.',
      ja: 'S2「制霸王座」が現在の主要入口です。侵入補給、初回購入/限定パック、サーバーモード、拠点防衛を案内します。',
    },
    whatChanged: [
      {
        zh: '页面从活动收尾升级为 S2 玩法与新手常青入口，礼包内容保留有效期说明。',
        en: 'Coverage moves from event wrap-up into an S2 and evergreen beginner entry, with validity dates kept on pack content.',
        ja: 'イベント終了案内からS2玩法と初心者向け常設入口へ進め、パックには有効期限を残します。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 S2 活动和官方下载，再选择服务器模式。',
        en: 'Start with S2 events and official download, then choose a server mode.',
        ja: 'まずS2イベントと公式DLを確認し、サーバーモードを選びます。',
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
      { type: 'guides', href: '/skjh/guides/aug31-event-ended-beginner-catchup', label: { zh: 'S2 / 新手路线', en: 'S2 / beginner route', ja: 'S2 / 初心者ルート' } },
    ],
  },
  endfield: {
    gameId: 'endfield',
    currentVersion: 'Pioneer Test recap / AIC blueprint',
    releaseDate: '2026-09-10',
    status: 'fresh',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'Steam Pioneer Test 招募已结束，当前重点转为测试复盘、测试奖励、AIC 工厂、Wuling 和蓝图。',
      en: 'Steam Pioneer Test recruitment has ended, shifting focus to the recap, test rewards, AIC factories, Wuling, and blueprints.',
      ja: 'Steam Pioneer Test募集は終了し、まとめ、テスト報酬、AIC工場、Wuling、設計図が中心です。',
    },
    whatChanged: [
      {
        zh: '版本页从报名截止切换为测试复盘与蓝图/工厂入口，避免继续使用 last-call。',
        en: 'The hub moves from recruitment cutoff into recap and blueprint/factory entry, avoiding stale last-call language.',
        ja: '版本ページを募集締切からまとめと設計図/工場入口へ切り替え、古いlast-call表現を避けます。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 Pioneer Test 复盘和测试奖励，再进入 AIC/Wuling 蓝图路线。',
        en: 'Start with the Pioneer Test recap and rewards, then move into AIC/Wuling blueprint routes.',
        ja: 'まずPioneer Testのまとめと報酬を確認し、その後AIC/Wuling設計図ルートへ進みます。',
      },
      {
        zh: '正式上线日期仍未确认，继续使用 watch 口径。',
        en: 'The full release date is still unconfirmed, so keep watch wording.',
        ja: '正式リリース日は未確認のため、引き続き注目表現に留めます。',
      },
    ],
    links: [
      { type: 'download', href: '/endfield/download', label: { zh: '下载 / 测试', en: 'Download / Tests', ja: 'DL / テスト' } },
      { type: 'codes', href: '/endfield/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/endfield/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/endfield/guides/homecoming-update-guide', label: { zh: '测试复盘 / 蓝图', en: 'Test recap / blueprints', ja: 'テストまとめ / 設計図' } },
    ],
  },
  sea: {
    gameId: 'sea',
    currentVersion: 'early 2027 / December beta watch',
    releaseDate: '2026-09-21',
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
    currentVersion: 'Quack Quack Test official watch',
    releaseDate: '2026-10-27',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'Roco Global 的 Quack Quack Test / 10/27 CBT 已有 Steam 与公开 FAQ 支撑，适合作为官方 watch 入口，并继续与 Roco CN 分流。',
      en: 'Roco Global Quack Quack Test / October 27 CBT now has Steam and public FAQ support, making it an official watch entry while staying separate from Roco CN.',
      ja: 'Roco GlobalのQuack Quack Test / 10月27日CBTはSteamと公開FAQで確認できるwatch入口になり、Roco CNとは分けます。',
    },
    whatChanged: [
      {
        zh: '页面从第三方信号升级为 Steam/公开 FAQ 可核验的 CBT watch，但不写成正式上线。',
        en: 'The page moves from third-party signal into Steam/public-FAQ-verified CBT watch, without treating it as full release.',
        ja: 'ページを第三者シグナルからSteam/公開FAQで確認できるCBT watchへ進め、正式配信とは扱いません。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 CBT 报名、平台和资格查询，再决定是否准备 Quack Quack Test。',
        en: 'Check CBT registration, platforms, and eligibility checks first, then decide how to prepare for Quack Quack Test.',
        ja: 'まずCBT応募、平台、資格確認を見てから、Quack Quack Test準備を判断します。',
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
      { type: 'guides', href: '/roco/guides/global-cn-content-roadmap', label: { zh: '国服差距与补充方案', en: 'CN gap & rollout plan', ja: '中国版との差分・展開案' } },
      { type: 'guides', href: '/roco/guides/global-launch-readiness-checklist', label: { zh: '首发验收清单', en: 'Launch checklist', ja: 'ローンチ確認' } },
      { type: 'guides', href: '/roco/guides/global-first-30-days-pve-plan', label: { zh: '前 30 天 PvE 包', en: 'Days 1–30 PvE plan', ja: '1〜30日PvE案' } },
      { type: 'guides', href: '/roco/guides/global-days-31-90-season-event-plan', label: { zh: '31–90 天赛季包', en: 'Days 31–90 season plan', ja: '31〜90日シーズン案' } },
      { type: 'guides', href: '/roco/guides/global-cn-release-governance', label: { zh: '跨服版本治理', en: 'CN-global governance', ja: '地域間リリース統治' } },
      { type: 'guides', href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '运营指标与实验', en: 'Live-ops metrics', ja: '運営指標と実験' } },
      { type: 'guides', href: '/roco/guides/global-localization-cultural-event-playbook', label: { zh: '本地化与文化活动', en: 'Localization playbook', ja: 'ローカライズ手帳' } },
      { type: 'guides', href: '/roco/guides/global-cbt-to-launch-decision-gates', label: { zh: 'CBT 上线决策', en: 'CBT launch gates', ja: 'CBTローンチ判断' } },
      { type: 'guides', href: '/roco/guides/global-accessibility-cross-device-playbook', label: { zh: '无障碍与跨设备', en: 'Accessibility & devices', ja: 'アクセシビリティ・端末' } },
      { type: 'guides', href: '/roco/guides/global-economy-monetization-fairness-playbook', label: { zh: '经济与付费公平', en: 'Economy & fairness', ja: '経済・課金公平性' } },
      { type: 'guides', href: '/roco/guides/global-returning-player-event-legacy-playbook', label: { zh: '回流与活动遗产', en: 'Return & event legacy', ja: '復帰・イベント遺産' } },
      { type: 'guides', href: '/roco/guides/global-player-support-trust-playbook', label: { zh: '玩家支持与信任', en: 'Player support', ja: 'プレイヤーサポート' } },
      { type: 'guides', href: '/roco/guides/global-social-safety-guild-playbook', label: { zh: '社交安全与公会', en: 'Social safety & guilds', ja: 'ソーシャル安全・ギルド' } },
    ],
  },
  'roco-cn': {
    gameId: 'roco-cn',
    currentVersion: 'post-launch codes / encyclopedia',
    releaseDate: '2026-09-21',
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

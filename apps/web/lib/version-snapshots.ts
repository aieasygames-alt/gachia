import type { GameId, SupportedLocale } from '@gachia/core';
import type { LocalizedText, LiveStatus } from './live-content';

export type VersionSnapshotLinkType = 'banner' | 'codes' | 'characters' | 'guides' | 'builds';

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

export const VERSION_SNAPSHOT_UPDATED_AT = '2026-08-03';

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
        zh: '版本页从 3.0 入坑词扩展到 3.1、周年福利和新平台搜索。',
        en: 'The hub expands from v3.0 onboarding into v3.1, anniversary rewards, and new-platform searches.',
        ja: 'v3.0入門からv3.1、周年報酬、新プラットフォーム検索へ広げています。',
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
      { type: 'builds', href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
    ],
  },
  wuwa: {
    gameId: 'wuwa',
    currentVersion: '3.5',
    releaseDate: '2026-07-10',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '3.5 重点围绕 Yangyang: Xuanling、Suisui、SP 机制、Xbox/Game Pass 和新玩家入坑路线。',
      en: 'v3.5 centers on Yangyang: Xuanling, Suisui, SP mechanics, Xbox/Game Pass, and starter routes.',
      ja: 'v3.5はYangyang: Xuanling、Suisui、SP機構、Xbox/Game Pass、初心者導線が中心です。',
    },
    whatChanged: [
      {
        zh: '版本页首屏强化 3.5 上线、角色、平台入口和声骸/养成导流。',
        en: 'The hub now foregrounds the v3.5 launch, characters, platform entry points, and Echo/build routing.',
        ja: 'v3.5開始、キャラ、プラットフォーム入口、エコー/育成導線を強化しています。',
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
      { type: 'guides', href: '/wuwa/guides/v3-5-preview-guide', label: { zh: '3.5 专题', en: 'v3.5 guide', ja: 'v3.5特集' } },
    ],
  },
  starrail: {
    gameId: 'starrail',
    currentVersion: '4.4',
    releaseDate: '2026-07-02',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '4.4 重点是 Himeko Nova、Fate/stay night 联动、Rin/Gilgamesh 搜索、兑换码和星琼缺口。',
      en: 'v4.4 focuses on Himeko Nova, Fate/stay night collab intent, Rin/Gilgamesh searches, codes, and Jade gaps.',
      ja: 'v4.4はHimeko Nova、Fate/stay nightコラボ、Rin/Gilgamesh検索、コード、星玉不足が中心です。',
    },
    whatChanged: [
      {
        zh: '专题从前瞻口径切到上线后口径，优先承接联动奖励和抽卡规划。',
        en: 'Coverage moved from preview wording to live-version routing for collab rewards and pull planning.',
        ja: '前瞻表現から実装後の導線へ移し、コラボ報酬とガチャ計画を優先します。',
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
  genshin: {
    gameId: 'genshin',
    currentVersion: 'Luna VIII',
    releaseDate: '2026-07-15',
    status: 'fresh',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    summary: {
      zh: '当前版本专题集中处理 Luna VIII、Sandrone、Sunny Summer Fontinalia、卡池规划、兑换码和活动日历。',
      en: 'The current hub covers Luna VIII, Sandrone, Sunny Summer Fontinalia, banner planning, redeem codes, and event routing.',
      ja: '現在の特集はLuna VIII、Sandrone、Sunny Summer Fontinalia、バナー計画、コード、イベント導線を扱います。',
    },
    whatChanged: [
      {
        zh: '版本页增加 current/next banner、兑换码和活动入口，方便承接高频搜索。',
        en: 'The hub now routes current/next banner, codes, and event searches from one page.',
        ja: '現在/次回バナー、コード、イベント検索を一つのページから案内します。',
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
      { type: 'guides', href: '/genshin/guides/luna-viii-sandrone-guide', label: { zh: '版本专题', en: 'Version guide', ja: '版本特集' } },
    ],
  },
};

export function getVersionSnapshot(gameId: GameId): VersionSnapshot | undefined {
  return VERSION_SNAPSHOTS[gameId];
}

export function localizeVersionText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.zh;
}

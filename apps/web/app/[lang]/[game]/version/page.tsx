import { serializeJsonLd } from '@/lib/jsonld-script';
import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';
import { getVersionSnapshot, localizeVersionText } from '@/lib/version-snapshots';
import type { VersionSnapshotSourceTier } from '@/lib/version-snapshots';

import { getGuideListData } from '@/lib/game-data/guides';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import { getHi3ArchiveMetadata, Hi3VersionArchive } from './hi3-version-archive';

const BASE_URL = 'https://gachia.com';

type FaqItem = {
  question: Record<SupportedLocale, string>;
  answer: Record<SupportedLocale, string>;
};

type HubCopy = {
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  highlights: Record<SupportedLocale, string[]>;
  kicker: Record<SupportedLocale, string>;
  freshness: Record<SupportedLocale, string>;
  faq: FaqItem[];
  guideIds: string[];
};

type FocusLane = {
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  links: Array<{
    href: string;
    label: Record<SupportedLocale, string>;
  }>;
};

type IntentLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const VERSION_META_OVERRIDES: Partial<Record<GameId, Partial<Record<SupportedLocale, {
  title: string;
  description: string;
}>>>> = {
  genshin: {
    zh: {
      title: '原神 7.1 前瞻专题：直播码、Snezhnaya 与卡池',
      description: '追踪原神 7.1 前瞻、Luna II、Snezhnaya、Sandrone、直播码、当前/下期卡池、Nod-Krai 长尾和原石规划。',
    },
    en: {
      title: 'Genshin v7.1 Watch: Livestream Codes, Snezhnaya & Banners',
      description: 'Track Genshin v7.1 watch, Luna II, Snezhnaya, Sandrone, livestream codes, current and next banners, Nod-Krai long-tail intent, and Primogem planning.',
    },
    ja: {
      title: '原神 v7.1 注目：配信コード、Snezhnaya、バナー',
      description: '原神 v7.1、Luna II、Snezhnaya、Sandrone、配信コード、現在/次回バナー、Nod-Krai長尾、原石計画を確認できます。',
    },
  },
  starrail: {
    zh: {
      title: '崩铁 4.6 前瞻专题：直播码、卡池与资源规划',
      description: '追踪崩坏星穹铁道 4.6 前瞻、直播兑换码、下期跃迁、4.5 收尾、活动和星琼规划。',
    },
    en: {
      title: 'HSR v4.6 Watch: Livestream Codes, Banners & Pull Planning',
      description: 'Track Honkai: Star Rail v4.6 special program, livestream codes, next warps, v4.5 wrap-up, events, and Stellar Jade planning.',
    },
    ja: {
      title: 'HSR v4.6 注目：配信コード、バナー、抽選計画',
      description: 'スターレイル v4.6前瞻、配信コード、次回跳躍、v4.5まとめ、イベント、星玉計画を確認できます。',
    },
  },
  wuwa: {
    zh: {
      title: '鸣潮 3.7 版本专题：梦枢天罗、心、活动与兑换码',
      description: '追踪鸣潮 3.7「镜锁妄世，心照红尘」实装、梦枢天罗、心/锁暝、当前活动、卡池预算、兑换码与更新后平台检查。',
    },
    en: {
      title: 'WuWa v3.7 Hub: Simulacrum Nexus, Hsin, Events & Codes',
      description: 'Track Wuthering Waves v3.7 live content: the Simulacrum Nexus of Mengzhou, Hsin/Suoming, current events, banner budgeting, codes, and post-update platform checks.',
    },
    ja: {
      title: '鳴潮 Ver.3.7 特集：夢枢天羅・心・イベント・コード',
      description: '鳴潮Ver.3.7の実装情報、夢枢天羅、心/鎖暝、現在イベント、バナー予算、コード、更新後のプラットフォーム確認を整理します。',
    },
  },
  nte: {
    zh: {
      title: '异环 1.2 版本专题：下载、卡池与兑换码',
      description: '追踪异环 1.2、999 Nights、Shinku、Iroi、Steam/download、兑换码、活动资源和抽卡规划。',
    },
    en: {
      title: 'NTE v1.2 Hub: Download, Banners & Codes',
      description: 'Track Neverness to Everness v1.2, Steam/download routes, redeem codes, event resources, and gacha planning.',
    },
    ja: {
      title: 'NTE v1.2 特集：DL、バナー、コード',
      description: 'NTE v1.2 999 Nights、Shinku、Iroi、Steam/DL、交換コード、イベント資源、ガチャ計画を確認できます。',
    },
  },
  zzz: {
    zh: {
      title: '绝区零 3.3 前瞻专题：10 月 9 日直播、兑换码与 3.2 复盘',
      description: '追踪绝区零 3.3「重返天空的旅程」10 月 9 日前瞻直播、限时兑换码、官方卡池公告与 3.2 复盘；未公布内容不作推断。',
    },
    en: {
      title: 'ZZZ v3.3 Preview: October 9 Program, Codes & v3.2 Recap',
      description: 'Track Zenless Zone Zero v3.3 “Journey Back to the Sky,” its October 9 special program, short-lived codes, official banner notices, and the v3.2 recap without speculating on unannounced details.',
    },
    ja: {
      title: 'ZZZ v3.3 注目：10月9日番組、コード、v3.2まとめ',
      description: 'ZZZ v3.3「空へ戻る旅」の10月9日特別番組、短期限コード、公式バナー告知、v3.2まとめを確認できます。未発表内容は推測しません。',
    },
  },
};

const OFFICIAL_STATUS_NOTES: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  guihuan: {
    zh: '归环正式公测日期如未由官方明确公布，请以官网、平台商店和官方社区公告为准。',
    en: 'If Guihuan has not announced a final public release date, use the official site, platform stores, and official community posts as the source of truth.',
    ja: '帰環の正式リリース日が公式発表されていない場合、公式サイト、ストア、公式コミュニティ告知を基準にしてください。',
  },
  ananta: {
    zh: '无限大正式公测日期和商业模式细节如未最终公布，请以官网、预注册页和官方公告为准。',
    en: 'If Ananta has not finalized its release date or monetization details, use the official site, preregistration page, and official notices as the source of truth.',
    ja: 'Anantaの正式リリース日や収益モデルが未確定の場合、公式サイト、事前登録ページ、公式告知を基準にしてください。',
  },
};

const INTENT_LINKS: Partial<Record<GameId, IntentLink[]>> = {
  aniimo: [
    { href: '/aniimo/s1-check', label: { zh: 'S1 入坑检查台', en: 'S1 starter checks', ja: 'S1入門チェック' }, description: { zh: '按下载、首日、虹光、家园、地图和奖励顺序进入当前 S1 资料。', en: 'Follow the current S1 material in order: download, first session, Rainbow, Homeland, map, and rewards.', ja: 'DL、初日、虹光、ホームランド、マップ、報酬の順で現行S1資料を確認。' } },
    { href: '/aniimo/download', label: { zh: '官网 / 下载', en: 'Official / Download', ja: '公式 / DL' }, description: { zh: '确认 PC、主机、移动端入口和安全下载边界。', en: 'Check PC, console, mobile stores, and safe download boundaries.', ja: 'PC、コンソール、モバイル入口と安全なDL範囲を確認。' } },
    { href: '/aniimo/guides/s1-new-player-route', label: { zh: 'S1 新手开荒', en: 'S1 starter route', ja: 'S1 初心者ルート' }, description: { zh: '主线解锁、捕捉、飞行回访、活动与资源的首日顺序。', en: 'First-day order for story unlocks, catching, flight revisits, events, and resources.', ja: 'メイン解放、捕獲、飛行再訪、イベント、資源の初日順序。' } },
    { href: '/aniimo/guides/rainbow-aniimo-guide', label: { zh: '虹光怎么选', en: 'Rainbow choices', ja: '虹光の選び方' }, description: { zh: '分开处理自选、活动、自然捕捉与研究进度。', en: 'Separate selectors, events, natural catches, and research progress.', ja: '自選、イベント、自然捕獲、研究進行を分けて確認。' } },
    { href: '/aniimo/guides/homeland-resource-guide', label: { zh: '家园资源', en: 'Homeland resources', ja: 'ホームランド資源' }, description: { zh: '按当前任务和产出安排升级与每日处理，避免家园挤占探索节奏。', en: 'Plan upgrades and daily tasks around current needs so Homeland does not crowd out exploration.', ja: '現在の需要で強化と日課を組み、ホームランドが探索を圧迫しないようにします。' } },
    { href: '/aniimo/redeem-codes', label: { zh: '兑换码 / 奖励', en: 'Codes / Rewards', ja: 'コード / 報酬' }, description: { zh: '区分暂无公开兑换码、预注册奖励和上线后待核验入口。', en: 'Separate no public codes from pre-registration rewards and launch checks.', ja: '公開コード未確認、事前登録報酬、リリース後確認を分けます。' } },
    { href: '/aniimo/map', label: { zh: '区域 / 路线', en: 'Regions / Routes', ja: '地域 / ルート' }, description: { zh: '查看 6 个区域、已知 Aniimo 和上线后刷新点核验清单。', en: 'Review 6 regions, known Aniimo, and post-launch spawn checks.', ja: '6地域、既知Aniimo、リリース後の出現確認を整理。' } },
  ],
  genshin: [
    { href: '/genshin/version', label: { zh: '官网 / 版本入口', en: 'Official / Version hub', ja: '公式 / バージョン' }, description: { zh: '集中整理官网、版本、活动和卡池信息。', en: 'Collect official, version, event, and banner information.', ja: '公式、版本、イベント、バナー情報を整理します。' } },
    { href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '直播码、版本码和过期状态集中查看。', en: 'Check livestream, version, and expired code status.', ja: '配信コード、版本コード、期限切れを確認。' } },
    { href: '/genshin/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '把当前卡池、下期角色、原石和保底放到同一条路线里。', en: 'Plan current banners, next characters, Primogems, and pity in one path.', ja: '現在バナー、次回キャラ、原石、天井を一緒に計画。' } },
  ],
  starrail: [
    { href: '/starrail/version', label: { zh: '官网 / 版本入口', en: 'Official / Version hub', ja: '公式 / バージョン' }, description: { zh: '集中查看 4.6 前瞻、直播码、下期跃迁和 4.5 收尾资源。', en: 'Check v4.6 preview, livestream codes, next warps, and v4.5 wrap-up resources.', ja: 'v4.6前瞻、配信コード、次回跳躍、v4.5まとめ資源を確認。' } },
    { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '4.6 前瞻直播码、版本码和过期状态入口。', en: 'v4.6 preview codes, patch codes, and expiry status.', ja: 'v4.6前瞻コード、版本コード、期限状態入口。' } },
    { href: '/starrail/guides/banner-schedule-guide', label: { zh: '下期跃迁', en: 'Next warps', ja: '次回跳躍' }, description: { zh: '把下期目标、当前资源、星琼缺口和队伍规划放到同一条路线。', en: 'Plan next targets, current resources, Stellar Jade gaps, and teams in one path.', ja: '次回目標、現在資源、星玉不足、編成計画を一つに整理。' } },
  ],
  wuwa: [
    { href: '/wuwa/version', label: { zh: '官网 / 版本入口', en: 'Official / Version hub', ja: '公式 / バージョン' }, description: { zh: '集中查看 3.7 实装内容、历史版本参考、兑换码和平台入口。', en: 'Check live v3.7 coverage, historical-version references, codes, and platform routes.', ja: 'Ver.3.7実装情報、過去バージョン参考、コード、プラットフォーム導線を確認。' } },
    { href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '版本码、活动码和过期状态。', en: 'Version codes, event codes, and expiry status.', ja: '版本コード、イベントコード、期限確認。' } },
    { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '下期卡池', en: 'Next banners', ja: '次回バナー' }, description: { zh: '平台登录、当前资源、3.7 下期卡池和活动路线。', en: 'Platform login, current resources, v3.7 next banners, and event routes.', ja: 'ログイン、現在資源、v3.7次回バナー、イベント導線。' } },
  ],
  nte: [
    { href: '/nte/guides/download-install-guide', label: { zh: '官网 / 下载', en: 'Official / Download', ja: '公式 / DL' }, description: { zh: '集中查看官网、下载、安装和设备问题。', en: 'Check official, download, install, and device information.', ja: '公式、DL、インストール、端末情報を確認。' } },
    { href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '1.2 版本码和活动奖励入口。', en: 'v1.2 codes and event reward entry.', ja: 'v1.2コードとイベント報酬入口。' } },
    { href: '/nte/version', label: { zh: 'Shinku / Iroi', en: 'Shinku / Iroi', ja: 'Shinku / Iroi' }, description: { zh: '角色抽取、版本活动和抽卡机制。', en: 'Character pulls, version events, and gacha mechanics.', ja: 'キャラガチャ、版本イベント、ガチャ機構。' } },
  ],
  zzz: [
    { href: '/zzz/guides/steam-3-0-start-guide', label: { zh: 'Steam 入坑', en: 'Steam starter', ja: 'Steam入門' }, description: { zh: '下载、账号绑定、存档互通和新区路线。', en: 'Download, account linking, cross-save, and new-area route.', ja: 'DL、アカウント連携、クロスセーブ、新エリア。' } },
    { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '版本码、直播码和回流奖励。', en: 'Version codes, livestream codes, and returnee rewards.', ja: '版本コード、配信コード、復帰報酬。' } },
    { href: '/zzz/drive-discs', label: { zh: '当前配装', en: 'Current builds', ja: '現在ビルド' }, description: { zh: '查看当前代理人的驱动盘、音擎和养成建议。', en: 'Open Drive Disc, W-Engine, and build guidance for current agents.', ja: '現在エージェントのディスク、Wエンジン、ビルドを確認。' } },
  ],
  guihuan: [
    { href: '/guihuan/guides/test-release-timeline-guide', label: { zh: '官网 / 测试', en: 'Official / Tests', ja: '公式 / テスト' }, description: { zh: '公测时间、测试资格和官方状态。', en: 'Release timing, test access, and official status.', ja: 'リリース時期、テスト資格、公式状態。' } },
    { href: '/guihuan/guides/download-install-guide', label: { zh: '下载 / 配置', en: 'Download / Specs', ja: 'DL / 環境' }, description: { zh: '下载入口、设备准备和安装问题。', en: 'Download entry, device prep, and install issues.', ja: 'DL入口、端末準備、インストール。' } },
    { href: '/guihuan/guides/time-loop-mechanic', label: { zh: '42 天循环', en: '42-day loop', ja: '42日ループ' }, description: { zh: '解释玩法类型和时间循环核心。', en: 'Explain gameplay type and time-loop core.', ja: '玩法タイプと時間ループを解説。' } },
  ],
  ananta: [
    { href: '/ananta/guides/preregistration-no-gacha-guide', label: { zh: '官网 / 预注册', en: 'Official / Prereg', ja: '公式 / 事前登録' }, description: { zh: '预注册、测试资格和官方状态。', en: 'Preregistration, test access, and official status.', ja: '事前登録、テスト資格、公式状態。' } },
    { href: '/ananta/guides/download-install-guide', label: { zh: '下载 / 测试', en: 'Download / Tests', ja: 'DL / テスト' }, description: { zh: '下载入口、平台状态和测试说明。', en: 'Download entry, platform status, and test notes.', ja: 'DL入口、プラットフォーム、テスト説明。' } },
    { href: '/ananta/guides/preregistration-no-gacha-guide', label: { zh: '无抽卡 FAQ', en: 'No-gacha FAQ', ja: 'ガチャなしFAQ' }, description: { zh: '把商业模式已知信息和推测分开。', en: 'Separate confirmed monetization facts from speculation.', ja: '収益モデルの確定情報と推測を分離。' } },
  ],
  endfield: [
    { href: '/endfield/events', label: { zh: '官方状态', en: 'Official status', ja: '公式状態' }, description: { zh: '测试后事项、官方观察项与下一步核对。', en: 'Post-test items, official watch points, and next checks.', ja: 'テスト後事項、公式確認項目、次の確認。' } },
    { href: '/endfield/guides/pioneer-test-post-test-route', label: { zh: '测试后状态', en: 'Post-test status', ja: 'テスト後状態' }, description: { zh: 'Pioneer Test、奖励核对、Wuling、AIC 工厂和蓝图后续路线。', en: 'Pioneer Test, reward verification, Wuling, AIC factory, and blueprint next steps.', ja: 'Pioneer Test、報酬確認、Wuling、AIC工場、設計図の次導線。' } },
    { href: '/endfield/guides/blueprint-aic-factory-guide', label: { zh: 'AIC / 蓝图', en: 'AIC / Blueprints', ja: 'AIC / 設計図' }, description: { zh: '整理可复用的工厂模块，待官方数据发布后再复核。', en: 'Organize reusable factory modules, then recheck after official data arrives.', ja: '再利用可能な工場モジュールを整理し、公式データ後に再確認。' } },
  ],
  sea: [
    { href: '/sea/guides/identity-v-mobile-launch-event-guide', label: { zh: '第五人格联动', en: 'Identity V collab', ja: 'Identity Vコラボ' }, description: { zh: '纽扣眼、狂欢之椅、拍照动作、活动任务和移动端领取顺序。', en: 'Button eyes, chair prop, photo pose, event tasks, and mobile claim order.', ja: 'ボタン目、椅子、写真ポーズ、イベント任務、モバイル受取順。' } },
    { href: '/sea/guides/spongebob-collab-summer-faq', label: { zh: '海绵宝宝暑期', en: 'SpongeBob summer', ja: 'SpongeBob夏' }, description: { zh: '蟹堡王、比奇堡、活动奖励、限时规则和上线时间判断。', en: 'Krusty Krab/Bikini Bottom intent, rewards, limited rules, and timing.', ja: 'Krusty Krab/Bikini Bottom、報酬、期間限定、時期判断。' } },
    { href: '/sea/guides/memory-tower-weekly-dredging-guide', label: { zh: '记忆之塔周常', en: 'Memory Tower weekly', ja: 'Memory Tower週課' }, description: { zh: '每周打捞、往日之影、漂泊之家、探索者勋章和镶嵌资源。', en: 'Weekly dredging, Past Shadows, Drifting Home, Explorer Medals, and socketing.', ja: '週課打捞、Past Shadows、Drifting Home、Explorer Medal、装着資源。' } },
  ],
  skjh: [
    { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 / PC 下载', en: 'Official / PC Download', ja: '公式 / PC DL' }, description: { zh: 'PC、移动端、多端互通和安装问题。', en: 'PC, mobile, cross-play, and install questions.', ja: 'PC、モバイル、多端連携、インストール。' } },
    { href: '/skjh/guides/first-2-hours-starter-route', label: { zh: '新手 0-2 小时', en: 'First 0-2 hours', ja: '最初の0-2時間' }, description: { zh: '开荒、服务器模式和基地第一步。', en: 'Launch route, server mode, and first base step.', ja: '開荒、サーバーモード、最初の拠点。' } },
    { href: '/skjh/guides/server-mode-choice', label: { zh: '服务器模式', en: 'Server modes', ja: 'サーバーモード' }, description: { zh: '安全区、标准、挑战和速战选择。', en: 'Safe-zone, standard, challenge, and quick-fight choice.', ja: '安全区、標準、挑戦、速戦の選択。' } },
  ],
};

const VERSION_COPY: Partial<Record<GameId, HubCopy>> = {
  genshin: {
    title: { zh: '7.1 前瞻 / Snezhnaya 专题', en: 'v7.1 Watch / Snezhnaya Hub', ja: 'v7.1注目 / Snezhnaya特集' },
    description: {
      zh: '围绕 7.1 前瞻、Luna II、Snezhnaya、Sandrone、直播码、当前/下期卡池和 Nod-Krai 长尾需求定位版本重点。',
      en: 'Track v7.1 watch, Luna II, Snezhnaya, Sandrone, livestream codes, current/next banners, and Nod-Krai long-tail needs.',
      ja: 'v7.1注目、Luna II、Snezhnaya、Sandrone、配信コード、現在/次回バナー、Nod-Krai長尾需要をまとめます。',
    },
    highlights: {
      zh: ['7.1 前瞻', 'Snezhnaya', '直播码', 'Nod-Krai 长尾'],
      en: ['v7.1 watch', 'Snezhnaya', 'Livestream codes', 'Nod-Krai long-tail'],
      ja: ['v7.1注目', 'Snezhnaya', '配信コード', 'Nod-Krai長尾'],
    },
    kicker: { zh: '前瞻码窗口', en: 'Livestream-code window', ja: '配信コード期間' },
    freshness: {
      zh: '持续整理 7.1 前瞻、下一版本卡池、直播码有效期和 Nod-Krai 历史入口。',
      en: 'Kept current with v7.1 previews, next banners, livestream-code validity, and Nod-Krai history routes.',
      ja: 'v7.1前瞻、次回バナー、配信コード期限、Nod-Krai履歴導線を継続整理しています。',
    },
    faq: [
      { question: { zh: '这个版本专题主要看什么？', en: 'What is this version hub for?', ja: 'このバージョン特集では何を見ればいいですか？' }, answer: { zh: '这里优先收录 7.1 前瞻、直播码、Snezhnaya / Sandrone、当前与下期卡池，以及 Nod-Krai 地图和材料长尾。', en: 'It highlights v7.1 watch, livestream codes, Snezhnaya / Sandrone, current and next banners, plus Nod-Krai map and material long-tail needs.', ja: 'v7.1注目、配信コード、Snezhnaya / Sandrone、現在/次回バナー、Nod-Kraiマップと素材長尾を優先整理します。' } },
      { question: { zh: 'Luna I / Nod-Krai 内容还看吗？', en: 'Should I still read Luna I / Nod-Krai content?', ja: 'Luna I / Nod-Krai内容はまだ見るべき？' }, answer: { zh: '要看。Nod-Krai 地图、材料和奖励仍是长尾入口，但首屏应先回答 7.1 直播码和下一版本卡池问题。', en: 'Yes. Nod-Krai maps, materials, and rewards remain useful long-tail routes, but the first screen should answer v7.1 codes and next-banner questions first.', ja: 'はい。Nod-Kraiのマップ、素材、報酬は長尾導線として残しつつ、首屏ではv7.1コードと次回バナーを優先します。' } },
    ],
    guideIds: ['nod-krai-cryoculus-phase-ii-checklist', 'phase-ii-columbina-raiden-pull-plan', 'luna-viii-sandrone-guide'],
  },
  starrail: {
    title: { zh: '4.6 前瞻 / 直播码专题', en: 'v4.6 Special Program / Codes Hub', ja: 'v4.6前瞻 / コード特集' },
    description: { zh: '聚焦 4.6 前瞻、直播兑换码、下期跃迁、4.5 收尾、活动奖励、星琼缺口与队伍规划。', en: 'Track the v4.6 special program, livestream codes, next warps, v4.5 wrap-up, event rewards, Stellar Jade gaps, and team planning.', ja: 'v4.6前瞻、配信コード、次回跳躍、v4.5まとめ、イベント報酬、星玉不足、編成計画を整理します。' },
    highlights: { zh: ['4.6 前瞻', '直播码', '下期跃迁', '星琼规划'], en: ['v4.6 preview', 'Livestream codes', 'Next warps', 'Jade planning'], ja: ['v4.6前瞻', '配信コード', '次回跳躍', '星玉計画'] },
    kicker: { zh: '前瞻兑换码', en: 'Livestream codes', ja: '配信コード' },
    freshness: { zh: '已从 4.5 当前期切换到 4.6 前瞻窗口，优先整理直播码有效期、下一池和资源预留。', en: 'Now shifted from v4.5 live coverage into the v4.6 preview window, prioritizing code validity, next warps, and resource reserves.', ja: 'v4.5現在情報からv4.6前瞻期間へ切り替え、コード期限、次回跳躍、資源温存を優先整理します。' },
    faq: [
      { question: { zh: '4.6 前瞻先看什么？', en: 'What should I check first for the v4.6 preview?', ja: 'v4.6前瞻で最初に見るべきものは？' }, answer: { zh: '先确认直播兑换码是否还有效，再看下期跃迁、4.5 收尾资源和星琼缺口。', en: 'Check whether livestream codes are still valid first, then review next warps, v4.5 wrap-up rewards, and Stellar Jade gaps.', ja: 'まず配信コードが有効か確認し、次回跳躍、v4.5まとめ報酬、星玉不足を見てください。' } },
      { question: { zh: '资源不够时怎么规划？', en: 'How should I plan with limited resources?', ja: '資源が少ない場合どう計画する？' }, answer: { zh: '先锁一个 4.6 目标，再用卡池规划页估算保底差距，不要把星琼同时拆给多个目标。', en: 'Lock one v4.6 target first, then use pull-planning pages to estimate pity gaps instead of splitting Jades across multiple goals.', ja: 'まずv4.6目標を一つに絞り、ガチャ計画で天井差を見積もり、複数目標に星玉を分散しすぎないようにします。' } },
    ],
    guideIds: ['fate-rin-gilgamesh-reward-faq', 'himeko-nova-fate-pull-plan', 'fate-collab-guide'],
  },
  wuwa: {
    title: { zh: '3.7「镜锁妄世，心照红尘」上线专题', en: 'v3.7 "Prism\'s Illusion, Heart\'s Illumination" Live Hub', ja: 'Ver.3.7「鏡に鎖す妄世、心で照らす紅塵」実装特集' },
    description: { zh: '围绕 3.7 实装后的梦枢天罗、心/锁暝、当前活动、卡池预算、兑换码、资源下载和客户端排查展开。', en: 'Track live v3.7 content in the Simulacrum Nexus of Mengzhou, Hsin/Suoming, current events, banner budgeting, codes, resource downloads, and client checks.', ja: 'Ver.3.7実装後の夢枢天羅、心/鎖暝、現在イベント、バナー予算、コード、リソースDL、クライアント確認を整理します。' },
    highlights: { zh: ['梦枢天罗', '心/锁暝', '限时活动', '卡池预算'], en: ['Simulacrum Nexus', 'Hsin/Suoming', 'Limited events', 'Banner budget'], ja: ['夢枢天羅', '心/鎖暝', '期間限定イベント', 'バナー予算'] },
    kicker: { zh: '3.7 已上线', en: 'v3.7 is live', ja: 'Ver.3.7配信中' },
    freshness: { zh: '已更新为 10 月 9 日状态：3.7 已实装；活动时间、奖励、前置条件与当前卡池继续以游戏内显示和官方公告为准。', en: 'Updated October 9: v3.7 is live; use the live client and official notices for event timing, rewards, prerequisites, and current banners.', ja: '10月9日時点に更新：Ver.3.7は実装済みです。イベント時刻、報酬、前提条件、現在バナーはゲーム内表示と公式告知を基準にしてください。' },
    faq: [
      { question: { zh: '3.7 上线后先做什么？', en: 'What should I do first after v3.7 launches?', ja: 'Ver.3.7実装後は何から始めるべき？' }, answer: { zh: '先检查邮件、有效兑换码和平台资源更新；再按主线进度进入梦枢天罗和活动。抽取前先核对当前保底、队伍缺口与游戏内卡池结束时间。', en: 'Check mail, valid codes, and platform resource updates first; then enter the Simulacrum Nexus of Mengzhou and events according to story progress. Before pulling, verify pity, roster gaps, and the in-game banner end time.', ja: 'まずメール、有効コード、プラットフォームのリソース更新を確認し、ストーリー進行に応じて夢枢天羅とイベントへ進みます。抽選前には天井、編成不足、ゲーム内バナー終了時刻を確認してください。' } },
      { question: { zh: '角色机制可以直接照社区爆料写吗？', en: 'Can we publish community leak mechanics directly?', ja: 'コミュニティリークの性能をそのまま書けますか？' }, answer: { zh: '不建议。版本页只写官方或可核验信息，未核验机制放在 watch 口径里。', en: 'No. The hub should publish only official or verifiable details; unverified mechanics stay in watch wording.', ja: '推奨しません。公式または確認可能な情報だけを掲載し、未確認性能はwatch表現に留めます。' } },
    ],
    guideIds: ['v3-7-live-route', 'banner-schedule-guide', 'farming-route-guide'],
  },
  nte: {
    title: { zh: '1.2「999 Nights」Shinku / Iroi 专题', en: 'v1.2 999 Nights Shinku / Iroi Hub', ja: 'v1.2 999 Nights Shinku / Iroi 特集' },
    description: {
      zh: '整理 1.2「999 Nights」上线后、Shinku 当前期、Iroi 后续期、兑换码、Steam/download 与抽卡机制等重点问题。',
      en: 'Cover the live v1.2 999 Nights update, Shinku current banner, Iroi next focus, codes, Steam/download intent, and gacha planning.',
      ja: 'v1.2「999 Nights」実装、Shinku現行期、Iroi次期、コード、Steam/DL、ガチャ計画をまとめます。',
    },
    highlights: {
      zh: ['1.2 已上线', '999 Nights', 'Shinku', 'Iroi'],
      en: ['v1.2 live', '999 Nights', 'Shinku', 'Iroi'],
      ja: ['v1.2実装', '999 Nights', 'Shinku', 'Iroi'],
    },
    kicker: { zh: '版本入坑', en: 'Patch starter', ja: '更新入門' },
    freshness: {
      zh: '1.2 版本、Shinku/Iroi 抽取、999 Nights 模式、兑换码和下载入口会持续整理。',
      en: 'Kept current with v1.2, Shinku/Iroi pull planning, 999 Nights mode, codes, and download entry points.',
      ja: 'v1.2、Shinku/Iroiガチャ、999 Nightsモード、コード、DL入口を継続整理します。',
    },
    faq: [
      {
        question: {
          zh: '异环 1.2 现在最该看什么？',
          en: 'What matters most in NTE v1.2 right now?',
          ja: 'NTE v1.2で今いちばん重要なのは？',
        },
        answer: {
          zh: '先看 999 Nights 版本专题，再按 Shinku 当前池、Iroi 预热、兑换码和下载安装顺序往下走。',
          en: 'Start with the 999 Nights hub, then move through Shinku, Iroi, codes, and download/install help.',
          ja: 'まず999 Nights特集、次にShinku、Iroi、コード、DL/インストールの順で見るのがおすすめです。',
        },
      },
      {
        question: {
          zh: '搜索 Steam/download 的用户应该去哪？',
          en: 'Where should Steam/download searchers go?',
          ja: 'Steam/DL検索のユーザーはどこを見るべき？',
        },
        answer: {
          zh: '先进入下载安装页确认官方入口和设备要求，再回到版本页看 Shinku、Iroi 与活动资源。',
          en: 'Use the download guide for official entry points and device needs, then return to the hub for Shinku, Iroi, and events.',
          ja: 'DLガイドで公式入口と端末要件を確認し、その後Shinku、Iroi、イベントを見てください。',
        },
      },
    ],
    guideIds: ['999-nights-mode-guide', 'shinku-iroi-pull-plan', 'v1-2-999-nights-guide'],
  },
  zzz: {
    title: { zh: '3.3 前瞻直播 / 3.2 复盘专题', en: 'v3.3 Special Program / v3.2 Recap Hub', ja: 'v3.3特別番組 / v3.2まとめ特集' },
    description: { zh: '3.3「重返天空的旅程」将于 10 月 9 日 19:30（UTC+8）前瞻。先追踪官方节目与直播码，再依据公告看卡池；3.2 内容保留为复盘入口。', en: 'v3.3 “Journey Back to the Sky” has a special program on October 9 at 19:30 (UTC+8). Track the official broadcast and its codes first, then use notices for banners; v3.2 remains available as a recap route.', ja: 'v3.3「空へ戻る旅」の特別番組は10月9日19:30（UTC+8）です。まず公式番組とコードを確認し、バナーは告知を基準に判断します。v3.2はまとめ入口として残します。' },
    highlights: { zh: ['10 月 9 日 19:30', '官方前瞻', '直播码提醒', '3.2 复盘'], en: ['Oct 9, 19:30 UTC+8', 'Official program', 'Code reminder', 'v3.2 recap'], ja: ['10月9日 19:30 UTC+8', '公式番組', 'コード提醒', 'v3.2まとめ'] },
    kicker: { zh: '官方前瞻窗口', en: 'Official preview window', ja: '公式前瞻期間' },
    freshness: { zh: '已更新为 10 月 8 日状态：节目时间来自官方公告，角色、卡池和活动细节等待节目及后续公告核验。', en: 'Updated for October 8: the program time is official; agent, banner, and event details await verification from the program and follow-up notices.', ja: '10月8日時点に更新：番組時刻は公式発表済みで、キャラ、バナー、イベント詳細は番組と後続告知で確認します。' },
    faq: [
      { question: { zh: '现在是看 3.2 还是 3.3？', en: 'Should I focus on v3.2 or v3.3 now?', ja: '今はv3.2とv3.3のどちらを見るべき？' }, answer: { zh: '10 月 9 日节目播出前，3.3 页面只用于确认节目时间和兑换码提醒；3.2 仍适合看已有角色、活动与配队内容。节目后再按官方公告处理 3.3 卡池与角色。', en: 'Before the October 9 program, use the v3.3 page only for timing and code reminders; v3.2 remains the route for existing agents, events, and teams. Use official notices after the program for v3.3 banners and agents.', ja: '10月9日番組前は、v3.3ページを時刻とコード確認に使います。既存キャラ、イベント、編成はv3.2を見てください。v3.3のバナーとキャラは番組後の公式告知を基準にします。' } },
      { question: { zh: '直播码还能领吗？', en: 'Can I still claim livestream codes?', ja: '配信コードはまだ受け取れますか？' }, answer: { zh: '旧直播码只放 expired 说明；新一轮前瞻码出现后，兑换码页会按 active、expired、unknown 分层。', en: 'Old livestream codes stay in expired context; when new preview codes appear, the code page separates active, expired, and unknown status.', ja: '古い配信コードは期限切れ文脈のみ。新しい前瞻コードが出たら、コードページでactive、expired、unknownを分けます。' } },
    ],
    guideIds: ['v3-3-special-program-prep-guide', 'banner-schedule-guide', 'v3-2-livestream-recap-expired-codes'],
  },
  guihuan: {
    title: { zh: '测试 / 公测时间线专题', en: 'Test & Release Timeline Hub', ja: 'テスト・リリース時期特集' },
    description: {
      zh: '整理归环官网、下载、公测时间、测试资格、42 天循环、使灵系统和玩法定位等重点问题。',
      en: 'A hub for official site, download status, release timing, test access, the 42-day loop, Spirit system, and gameplay positioning.',
      ja: '公式サイト、DL、リリース時期、テスト資格、42日ループ、使霊、玩法定位をまとめます。',
    },
    highlights: {
      zh: ['测试资格', '公测时间', '42 天循环', '使灵系统'],
      en: ['Test access', 'Release timing', '42-day loop', 'Spirit system'],
      ja: ['テスト資格', 'リリース時期', '42日ループ', '使霊'],
    },
    kicker: { zh: '测试信息', en: 'Test anchor', ja: 'テスト軸' },
    freshness: {
      zh: '围绕开服、使灵和配装思路持续补充。',
      en: 'Launch, spirit, and build-planning topics are kept fresh here.',
      ja: '開服、使霊、ビルド設計の話題を継続整理しています。',
    },
    faq: [
      {
        question: {
          zh: '归环现在适合先看哪部分？',
          en: 'Which part of Guihuan should I read first?',
          ja: '帰環ではまずどこを見ればいいですか？',
        },
        answer: {
          zh: '先看测试与公测时间线，确认官方状态后再进入下载安装、时间循环机制和使灵系统。',
          en: 'Start with the test/release timeline, confirm official status, then move into install, time-loop mechanics, and Spirit systems.',
          ja: 'まずテスト・リリース時期を確認し、その後DL、時間ループ、使霊へ進んでください。',
        },
      },
      {
        question: {
          zh: '想快速知道角色怎么养？',
          en: 'How can I quickly learn character builds?',
          ja: 'キャラ育成を手早く知るには？',
        },
        answer: {
          zh: '打开使灵与配装相关页面，再结合节奏榜挑优先培养对象。',
          en: 'Open the spirit and build pages, then use the tier list to pick your priority units.',
          ja: '使霊と配装ページを見てから、Tierで育成優先度を決めてください。',
        },
      },
    ],
    guideIds: ['test-recruit-international-download-faq', 'official-release-company-faq', 'test-release-timeline-guide'],
  },
  ananta: {
    title: { zh: '预注册 / 无抽卡 FAQ', en: 'Preregistration / No-Gacha FAQ', ja: '事前登録 / ガチャなしFAQ' },
    description: {
      zh: '整理官网、预注册、无抽卡、测试资格、公测时间、网易/塔菲和都市开放世界玩法等重点问题。',
      en: 'A hub for official site, preregistration, no-gacha model, test access, release timing, NetEase/Taffy, and urban open-world gameplay.',
      ja: '公式サイト、事前登録、ガチャなし、テスト資格、リリース時期、NetEase/Taffy、都市OWを整理します。',
    },
    highlights: {
      zh: ['预注册', '无抽卡', '测试资格', '公测时间'],
      en: ['Preregistration', 'No gacha', 'Test access', 'Release timing'],
      ja: ['事前登録', 'ガチャなし', 'テスト資格', 'リリース時期'],
    },
    kicker: { zh: '预约入口', en: 'Pre-registration entry', ja: '事前登録入口' },
    freshness: {
      zh: '预约、下载和战斗系统相关内容持续更新。',
      en: 'Preregistration, download, and combat coverage is refreshed here.',
      ja: '事前登録、DL、戦闘の情報を継続更新しています。',
    },
    faq: [
      {
        question: {
          zh: 'Ananta 现在最该关注什么？',
          en: 'What should I focus on for Ananta right now?',
          ja: 'Anantaで今いちばん見るべきものは？',
        },
        answer: {
          zh: '先看预注册与无抽卡 FAQ，确认官方状态后再看下载、战斗系统和新都市探索。',
          en: 'Start with preregistration and no-gacha FAQ, then check download, combat, and Nova City exploration.',
          ja: 'まず事前登録とガチャなしFAQを確認し、その後DL、戦闘、新都市探索へ進んでください。',
        },
      },
      {
        question: {
          zh: '预约奖励去哪里看？',
          en: 'Where can I see preregistration rewards?',
          ja: '事前登録報酬はどこで確認できますか？',
        },
        answer: {
          zh: '打开预约入口和入门页，里面会集中整理奖励与下载步骤。',
          en: 'Open the preregistration and beginner pages for reward details and download steps.',
          ja: '事前登録ページと初心者ページに、報酬とDL手順をまとめています。',
        },
      },
    ],
    guideIds: ['gameplay-city-no-gacha-comparison-faq', 'release-date-beta-pc-faq', 'preregistration-no-gacha-guide'],
  },
  endfield: {
    title: {
      zh: 'Pioneer Test 复盘 / AIC 蓝图专题',
      en: 'Pioneer Test Recap / AIC Blueprint Hub',
      ja: 'Pioneer Testまとめ / AICブループリント特集',
    },
    description: {
      zh: '整理 Pioneer Test 招募结束后的测试复盘、奖励、Wuling、蓝图、AIC 工厂、下载入口与正式上线观察。',
      en: 'Cover post-recruitment Pioneer Test recap, rewards, Wuling, blueprints, AIC factory, download entry points, and release-date watch.',
      ja: 'Pioneer Test募集終了後のまとめ、報酬、Wuling、ブループリント、AIC工場、DL入口、正式リリース注目を整理します。',
    },
    highlights: {
      zh: ['Pioneer Test 复盘', '测试奖励', '蓝图/AIC', 'Wuling'],
      en: ['Pioneer Test recap', 'Test rewards', 'Blueprint/AIC', 'Wuling'],
      ja: ['Pioneer Testまとめ', 'テスト報酬', 'Blueprint/AIC', 'Wuling'],
    },
    kicker: { zh: '测试后复盘', en: 'Post-test recap', ja: 'テスト後まとめ' },
    freshness: {
      zh: '以 Pioneer Test 招募结束后的公开信息为准，优先整理测试奖励、AIC 工厂、蓝图流程、Wuling 和后续上线观察。',
      en: 'Based on public information after Pioneer Test recruitment, prioritizing test rewards, AIC factory, blueprint flows, Wuling, and release watch.',
      ja: 'Pioneer Test募集終了後の公開情報を基準に、報酬、AIC工場、ブループリント、Wuling、正式リリース注目を優先します。',
    },
    faq: [
      {
        question: {
          zh: 'Pioneer Test 结束后还应该看什么？',
          en: 'What should I read after Pioneer Test recruitment?',
          ja: 'Pioneer Test募集後、何を見るべき？',
        },
        answer: {
          zh: '先看测试复盘和奖励说明，再补 AIC 工厂、蓝图、Wuling 与下载/配置入口。正式上线日期仍以官方后续公告为准。',
          en: 'Start with the recap and reward notes, then catch up on AIC factory, blueprints, Wuling, and download/spec entry points. Full release timing still follows future official notices.',
          ja: 'まずテストまとめと報酬を確認し、AIC工場、ブループリント、Wuling、DL/環境入口を補いましょう。正式リリース日は今後の公式告知基準です。',
        },
      },
      {
        question: {
          zh: 'AIC 和蓝图为什么还值得单独看？',
          en: 'Why are AIC and blueprints still worth separate coverage?',
          ja: 'AICとブループリントを別に見る理由は？',
        },
        answer: {
          zh: '因为测试后讨论集中在工厂效率、蓝图复用和流程优化，这些内容会直接影响后续测试和正式版的建设节奏。',
          en: 'Because post-test demand centers on factory efficiency, blueprint reuse, and workflow planning, which will shape later tests and full-release progression.',
          ja: 'テスト後は工場効率、ブループリント再利用、工程設計への需要が強く、次回テストや正式版の進行に直結します。',
        },
      },
    ],
    guideIds: ['pioneer-test-post-test-route', 'blueprint-aic-factory-guide', 'homecoming-update-guide'],
  },
  sea: {
    title: {
      zh: 'Early 2027 / December Beta 观察专题',
      en: 'Early 2027 / December Beta Watch Hub',
      ja: 'Early 2027 / December Beta注目特集',
    },
    description: {
      zh: '聚焦 early 2027 上线窗口、December closed beta、Steam/PS5/Xbox/移动端平台、单人玩法、gacha 讨论和下载观察。',
      en: 'Track the early-2027 launch window, December closed beta watch, Steam/PS5/Xbox/mobile platforms, solo play, gacha discussion, and download readiness.',
      ja: 'early 2027のリリース予定、December closed beta注目、Steam/PS5/Xbox/モバイル平台、ソロプレイ、gacha議論、DL準備を整理します。',
    },
    highlights: {
      zh: ['early 2027', 'December beta', '平台 FAQ', 'gacha/solo'],
      en: ['early 2027', 'December beta', 'Platform FAQ', 'gacha/solo'],
      ja: ['early 2027', 'December beta', '平台FAQ', 'gacha/solo'],
    },
    kicker: { zh: 'Beta 观察', en: 'Beta watch', ja: 'Beta注目' },
    freshness: {
      zh: '保持 watch 口径：继续追踪 early 2027、December beta、平台和玩法，不把未确认资格或具体日期写死。',
      en: 'Maintained as watch wording: tracking early 2027, December beta, platforms, and gameplay without treating unconfirmed access or exact dates as final.',
      ja: 'watch表現を維持し、early 2027、December beta、平台、玩法を追跡。未確認資格や詳細日程は確定扱いしません。',
    },
    faq: [
      {
        question: {
          zh: '遗忘之海现在确认了什么？',
          en: 'What is confirmed for Sea of Remnants now?',
          ja: 'Sea of Remnantsで今確認済みの情報は？',
        },
        answer: {
          zh: '当前适合按 early 2027 与 December closed beta 观察处理，平台和测试资格需要继续以官网、商店页或官方公告为准。',
          en: 'It is best handled as early-2027 and December closed-beta watch. Platform and access details should continue to follow the official site, store pages, or official notices.',
          ja: '現時点ではearly 2027とDecember closed betaのwatchとして扱うのが適切です。平台と資格は公式サイト、ストア、公式告知を基準にします。',
        },
      },
      {
        question: {
          zh: '平台和 beta 资格可以写死吗？',
          en: 'Can platform and beta access details be finalized?',
          ja: '平台とbeta資格は確定として書けますか？',
        },
        answer: {
          zh: '不建议。页面应使用来源分层，区分官网确认、商店页出现、媒体报道和社区推测。',
          en: 'No. Use source tiers on the page, separating official confirmation, store-page visibility, media reports, and community speculation.',
          ja: '推奨しません。公式確認、ストア掲載、メディア報道、コミュニティ推測を分けて扱います。',
        },
      },
    ],
    guideIds: ['platform-download-guide', 'what-is-forgotten-sea'],
  },
  skjh: {
    title: {
      zh: 'S2 制霸王座 / 服务器模式 / 防抄家专题',
      en: 'S2 Throne Rush / Server Modes / Anti-Raid Hub',
      ja: 'S2 制霸王座 / サーバーモード / 防衛特集',
    },
    description: {
      zh: '围绕 S2「制霸王座」、渗透补给、首充/限定礼包、服务器模式、开荒路线、安全区、标准/挑战服、基地选址与防抄家。',
      en: 'Cover S2 Throne Rush, infiltration supplies, first-purchase/limited packs, server modes, beginner routes, safe-zone, standard/challenge servers, base sites, and anti-raid basics.',
      ja: 'S2「制霸王座」、侵入補給、初回購入/限定パック、サーバーモード、開荒、安全区、標準/挑戦、拠点選び、防衛を整理します。',
    },
    highlights: {
      zh: ['S2 制霸王座', '服务器模式', 'PC 下载', '防抄家'],
      en: ['S2 Throne Rush', 'Server modes', 'PC download', 'Anti-raid'],
      ja: ['S2 制霸王座', 'サーバーモード', 'PC DL', '防衛'],
    },
    kicker: { zh: 'S2 当前入口', en: 'S2 live entry', ja: 'S2現在入口' },
    freshness: {
      zh: '当前重点已转向 S2 活动、模式选择、0-2 小时开荒、基地选址、防抄家、配置与下载问题。',
      en: 'Current demand now centers on S2 events, mode choice, first 0-2 hours, base location, anti-raid, specs, and downloads.',
      ja: '現在はS2イベント、モード選択、0-2時間開荒、拠点、防衛、環境、DLが中心です。',
    },
    faq: [
      {
        question: {
          zh: 'S2 现在先做什么？',
          en: 'What should I do first in S2?',
          ja: 'S2では最初に何をする？',
        },
        answer: {
          zh: '先确认 S2 活动和官方下载入口，再按 0-2 小时开荒路线做工具、放领地柜、选低风险资源线。',
          en: 'Confirm S2 events and official download entry first, then follow the 0-2 hour route: tools, territory cabinet, and low-risk loot lines.',
          ja: 'まずS2イベントと公式DL入口を確認し、0-2時間ルートで道具、領地柜、低リスク資源線を進めます。',
        },
      },
      {
        question: {
          zh: '新手选安全区、标准还是挑战？',
          en: 'Should beginners pick safe-zone, standard, or challenge?',
          ja: '初心者は安全区、標準、挑戦のどれを選ぶ？',
        },
        answer: {
          zh: '纯新手先安全区熟悉建家和科技，小队可进标准服；挑战服更适合固定队和愿意承受抄家风险的玩家。',
          en: 'New players should learn building and tech in safe-zone; teams can start standard, while challenge servers fit coordinated high-risk groups.',
          ja: '初心者は安全区で建築と技術を覚え、小隊は標準へ。挑戦は固定隊や高リスクを許容できる人向けです。',
        },
      },
    ],
    guideIds: ['official-pc-download-faq', 'first-2-hours-starter-route', 'base-location-anti-raid-plan'],
  },
  roco: {
    title: { zh: '国际服 CBT「等等鸭测试」/ 预注册专题', en: 'Global CBT "Quack Quack Test" / Pre-Registration Hub', ja: '国際CBT「Quack Quack Test」/ 事前登録特集' },
    description: {
      zh: '聚焦《洛克王国:世界》国际服 CBT「等等鸭测试（Quack Quack Test）」10/27 开测、报名窗口 8/26–10/20、CBT 平台（PC/iOS/Android）、精灵阵容、法杖（外观特效武器）、早测节奏榜与版本时间线。',
      en: 'Focus on the Roco Kingdom global CBT "Quack Quack Test" starting October 27, the Aug 26–Oct 20 sign-up window, CBT platforms (PC/iOS/Android), the Jinie roster, staves (cosmetic effect weapons), provisional tier list, and the version timeline.',
      ja: 'ロコキングダム国際版のCBT「Quack Quack Test」（10/27開始）、応募窓口（8/26〜10/20）、CBT対応プラットフォーム（PC/iOS/Android）、ジニー、杖（外観武器）、暫定Tier、版本タイムラインを整理します。',
    },
    highlights: {
      zh: ['10/27 开测', '报名至 10/20', 'CBT: PC/iOS/Android', '法杖', '早测节奏榜'],
      en: ['CBT Oct 27', 'Sign-up until Oct 20', 'CBT: PC/iOS/Android', 'Staves', 'Provisional tier'],
      ja: ['CBT 10/27', '応募は10/20まで', 'CBT: PC/iOS/Android', '杖', '暫定Tier'],
    },
    kicker: { zh: '首测倒计时', en: 'CBT countdown', ja: 'CBTカウントダウン' },
    freshness: {
      zh: '以 2026-10-27 开测、报名 8/26–10/20 为口径，优先整理报名、CBT 平台、预注册福利、精灵和版本节点；正式版日期以官方为准。',
      en: 'Centered on the October 27 CBT with sign-ups from Aug 26 to Oct 20: registration, CBT platforms, pre-registration rewards, Jinies, and version milestones; the full-release date follows official notices.',
      ja: '2026年10月27日開始、応募8/26〜10/20を軸に、申込み、CBT対応平台、予約特典、ジニー、版本を整理。正式版は公式告知基準。',
    },
    faq: [
      {
        question: {
          zh: '国际服 CBT 什么时候开、怎么报名、什么时候截止？',
          en: 'When is the global CBT, how do I sign up, and when does it close?',
          ja: '国際CBTはいつ始まり、どう申し込む？応募はいつまで？',
        },
        answer: {
          zh: '国际服 CBT「等等鸭测试（Quack Quack Test）」定于 2026-10-27 开启，本轮仅支持 PC、iOS 与 Android；PS5、Xbox、Steam、Epic 与 Microsoft Store 属正式版平台。官网 www.rocokingdom.com 报名开放中，须在 10/20 前完成问卷。',
          en: 'The global CBT "Quack Quack Test" starts October 27, 2026 and covers PC, iOS, and Android only; PS5, Xbox, Steam, Epic, and Microsoft Store belong to the full release. Sign up at www.rocokingdom.com and complete the questionnaire before Oct 20.',
          ja: '国際CBT「Quack Quack Test」は2026年10月27日開始で、対応はPC、iOS、Androidのみ。PS5、Xbox、Steam、Epic、Microsoft Storeは正式版向けです。公式サイト（www.rocokingdom.com）で10/20までにアンケートを完了してください。',
        },
      },
      {
        question: {
          zh: '「等等鸭测试（Quack Quack Test）」是什么？',
          en: 'What is the "Quack Quack Test"?',
          ja: '「Quack Quack Test」とは？',
        },
        answer: {
          zh: '「等等鸭测试」是官方为国际服首轮封闭测试起的名称：10/27 在 PC/iOS/Android 开测，报名须在官网完成问卷，10/23 起可查询资格；测试结束后角色与进度会删除，测试期间无内购。',
          en: 'The "Quack Quack Test" is the official name for the first global closed beta: it starts Oct 27 on PC/iOS/Android, sign-up requires the official questionnaire, eligibility checks open Oct 23, and all progress is wiped after the test with no in-game purchases.',
          ja: '「Quack Quack Test」は公式が名付けた初回グローバルCBTの名称です。10/27にPC/iOS/Androidで開始。応募には公式アンケートが必要で、資格確認は10/23から。テスト後はデータが削除され、期間中の課金はありません。',
        },
      },
      {
        question: {
          zh: '首测前最值得准备什么？',
          en: 'What should I prepare before the CBT?',
          ja: 'CBT前に何を準備すべき？',
        },
        answer: {
          zh: '先完成官网预注册并确认测试资格规则，再看 CBT 注册指南确认平台选择、语言支持和预约福利，最后收藏版本页跟踪时间节点。',
          en: 'Complete pre-registration and check eligibility rules, then use the CBT guide for platform choice, language support, and rewards, and bookmark this hub for milestones.',
          ja: 'まず事前登録と資格ルールを確認し、CBTガイドでプラットフォーム、言語、予約特典を把握。最後にこの特集をブックマークして時期を追いましょう。',
        },
      },
    ],
    guideIds: ['cbt-registration-guide'],
  },
  'roco-cn': {
    title: { zh: '国服上线后 / 图鉴与兑换码专题', en: 'CN Live / Codes and Encyclopedia Hub', ja: '中国版配信中 / 図鑑とコード特集' },
    description: {
      zh: '《洛克王国:世界》国服已上线，聚焦兑换码有效期、宠物图鉴、活动、宠物推荐、精灵培养、新手路线和与国际服分流。',
      en: 'The CN version is live, focusing on code validity, creature encyclopedia, events, creature picks, training, beginner routes, and separation from the global version.',
      ja: '中国版は配信中。コード期限、ペット図鑑、イベント、推薦、育成、初心者導線、国際版との分流を整理します。',
    },
    highlights: {
      zh: ['国服已上线', '兑换码有效期', '宠物图鉴', '活动路线', '国际服分流'],
      en: ['CN live', 'Code validity', 'Creature index', 'Event route', 'Global split'],
      ja: ['中国版配信中', 'コード期限', 'ペット図鑑', 'イベント導線', '国際版分流'],
    },
    kicker: { zh: '运营中', en: 'Live status', ja: '配信状態' },
    freshness: {
      zh: '以国服已上线状态为口径，优先整理版本、赛季、精灵图鉴和账号互通；详细攻略内容将在后续版本补充。',
      en: 'Based on the live CN status, prioritizing version, season, Jinie database, and account linking; detailed guides will be added in upcoming updates.',
      ja: '中国版配信中を基準に、版本、シーズン、ジニー図鑑、アカウント連携を優先し、詳細攻略は今後の更新で追加します。',
    },
    faq: [
      {
        question: {
          zh: '国服和国际服能一起玩吗？',
          en: 'Do the CN and international versions share servers?',
          ja: '中国版と国際版は一緒に遊べますか？',
        },
        answer: {
          zh: '不能。官方明确国际服与国服数据相互独立；国际服正式版支持繁中、英文、日文等多语言。',
          en: 'No. Tencent confirmed independent data between the international and CN versions; the global release supports Traditional Chinese, English, Japanese, and more.',
          ja: 'いいえ。国際版と中国版のデータは独立しています。国際版は繁体中文、英語、日本語などに対応予定です。',
        },
      },
      {
        question: {
          zh: '国服多端数据互通吗？',
          en: 'Is CN progress shared across devices?',
          ja: '中国版は端末間でデータ共有されますか？',
        },
        answer: {
          zh: 'PC、安卓、iOS、鸿蒙多端账号与数据互通，同一 QQ/微信账号可在任意设备登录；QQ 与微信账号数据独立。',
          en: 'PC, Android, iOS, and HarmonyOS share account progress; log in with the same QQ/WeChat account on any device, but QQ and WeChat data are separate.',
          ja: 'PC、Android、iOS、HarmonyOSでデータ共有。同じQQ/WeChatアカウントでログインできますが、QQとWeChatのデータは別管理です。',
        },
      },
    ],
    guideIds: [],
  },
  aniimo: {
    title: {
      zh: 'S1「逐风启程」版本专题',
      en: 'S1 Launching With the Wind Hub',
      ja: 'S1「逐風啓程」バージョン特集',
    },
    description: {
      zh: 'S1「逐风启程」已全平台上线。优先处理新手开荒、虹光研究、家园资源、混沌模式、图鉴地图与已知问题，时效结论以官方公告和当前客户端为准。',
      en: 'S1 is live across platforms. Prioritize onboarding, Rainbow research, Homeland resources, Chaos mode, database/map routes, and known issues; time-sensitive facts follow official notices and the live client.',
      ja: 'S1「逐風啓程」は全プラットフォームで配信中です。初心者導線、虹光研究、ホームランド資源、混沌モード、図鑑/マップ、既知問題を優先し、時効情報は公式告知と現行クライアントを基準にします。',
    },
    highlights: {
      zh: ['S1 全平台上线', '新手开荒', '虹光研究', '家园资源', '图鉴 / 地图'],
      en: ['S1 live', 'New-player route', 'Rainbow research', 'Homeland resources', 'Database / map'],
      ja: ['S1配信中', '初心者ルート', '虹光研究', 'ホームランド資源', '図鑑 / マップ'],
    },
    kicker: { zh: 'S1 实装后追踪', en: 'Live S1 tracking', ja: 'S1実装後追跡' },
    freshness: {
      zh: '持续核验 S1 活动、限时虹光、混沌模式、家园问题和奖励领取条件。',
      en: 'Continuously verify S1 events, limited Rainbow content, Chaos mode, Homeland issues, and claim conditions.',
      ja: 'S1イベント、期間限定虹光、混沌モード、ホームランド問題、報酬条件を継続確認します。',
    },
    faq: [
      {
        question: {
          zh: '伊莫现在是什么状态？',
          en: 'What is Aniimo’s current launch status?',
          ja: 'アニモの現在の配信状況は？',
        },
        answer: {
          zh: 'S1「逐风启程」已全平台上线。PC、主机、云游戏与移动端的账号、区服和活动条件请以当前客户端及官方公告为准。',
          en: 'S1 is live across platforms. Confirm account, server, and event conditions for PC, console, cloud, and mobile in the live client and official notices.',
          ja: 'S1「逐風啓程」は全プラットフォームで配信中です。PC、コンソール、クラウド、モバイルのアカウント、サーバー、イベント条件は現行クライアントと公式告知で確認してください。',
        },
      },
      {
        question: {
          zh: '现在有伊莫兑换码吗？',
          en: 'Are there Aniimo codes now?',
          ja: 'アニモのコードはありますか？',
        },
        answer: {
          zh: '目前仍要区分 active、expired、unknown。没有官方确认的公开兑换码不要放入可领取模块，预注册奖励和里程碑奖励要单独标注。',
          en: 'Keep active, expired, and unknown status separate. Do not place unconfirmed public codes in claimable modules; mark pre-registration and milestone rewards separately.',
          ja: 'active、expired、unknownを分けます。公式確認のない公開コードを受取可能欄に入れず、事前登録報酬とマイルストーン報酬は別扱いにします。',
        },
      },
    ],
    guideIds: ['s1-new-player-route', 'rainbow-aniimo-guide', 'homeland-resource-guide', 'map-regions'],
  },
  'azur-promilia': {
    title: { zh: '官方信息核对专题', en: 'Official Information Hub', ja: '公式情報確認ハブ' },
    description: { zh: '追踪蓝色星原：旅谣的官方公告、平台、测试与上线信息，避免把传闻当作已确认内容。', en: 'Track official Azur Promilia announcements, platforms, tests, and launch information without treating rumors as confirmed.', ja: 'アズールプロミリアの公式告知、対応機種、テスト、配信情報を確認し、未確認情報と区別します。' },
    highlights: { zh: ['官方公告', '平台信息', '测试状态'], en: ['Official notices', 'Platforms', 'Test status'], ja: ['公式告知', '対応機種', 'テスト状況'] },
    kicker: { zh: '资料建档', en: 'Information intake', ja: '資料整理' },
    freshness: { zh: '内容会在官方来源可核验后更新。', en: 'Content will be updated when official sources can be verified.', ja: '公式情報を確認でき次第更新します。' },
    faq: [],
    guideIds: [],
  }
};

const VERSION_FOCUS_LANES: Partial<Record<GameId, Record<SupportedLocale, FocusLane[]>>> = {
  aniimo: {
    zh: [
      {
        title: { zh: 'S1 开荒顺序', en: 'S1 onboarding order', ja: 'S1の進行順' },
        description: { zh: '先推进主线与系统解锁，再安排捕捉、飞行回访、家园和限时活动，避免用旧路线替代当前客户端条件。', en: 'Finish story and system unlocks before catches, flight revisits, Homeland, and limited events; do not substitute old routes for live-client conditions.', ja: 'メイン進行とシステム解放を終えてから捕獲、飛行での再訪、ホームランド、期間限定イベントへ進み、旧ルートを現行条件の代わりにしません。' },
        links: [
          { href: '/aniimo/guides/s1-new-player-route', label: { zh: 'S1 新手路线', en: 'S1 starter route', ja: 'S1 初心者ルート' } },
          { href: '/aniimo/guides/rainbow-aniimo-guide', label: { zh: '虹光研究', en: 'Rainbow research', ja: '虹光研究' } },
        ],
      },
      {
        title: { zh: '图鉴与区域', en: 'Database and regions', ja: '図鑑と地域' },
        description: { zh: '把 89 个 Aniimo、6 个区域、阶段、元素和上线后刷新点核验连成一条浏览路线。', en: 'Connect 89 Aniimo, 6 regions, stages, elements, and post-launch spawn checks.', ja: '89体、6地域、段階、元素、出現確認をつなげます。' },
        links: [
          { href: '/aniimo/characters', label: { zh: 'Aniimo 图鉴', en: 'Aniimo database', ja: 'Aniimo図鑑' } },
          { href: '/aniimo/map', label: { zh: '区域地图', en: 'Region map', ja: '地域マップ' } },
        ],
      },
      {
        title: { zh: '家园与奖励核验', en: 'Homeland and reward checks', ja: 'ホームランドと報酬確認' },
        description: { zh: '兑换码、预注册奖励和里程碑奖励分开追踪，上线当天优先核验输入入口。', en: 'Track codes, pre-registration rewards, and milestone rewards separately, then verify redemption on launch day.', ja: 'コード、事前登録、マイルストーン報酬を分け、リリース日に入力入口を確認。' },
        links: [
          { href: '/aniimo/redeem-codes', label: { zh: '兑换码状态', en: 'Code status', ja: 'コード状況' } },
          { href: '/aniimo/guides/homeland-resource-guide', label: { zh: '家园资源', en: 'Homeland resources', ja: 'ホームランド資源' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: 'S1 开荒顺序', en: 'S1 onboarding order', ja: 'S1の進行順' },
        description: { zh: '先推进主线与系统解锁，再安排捕捉、飞行回访、家园和限时活动，避免用旧路线替代当前客户端条件。', en: 'Finish story and system unlocks before catches, flight revisits, Homeland, and limited events; do not substitute old routes for live-client conditions.', ja: 'メイン進行とシステム解放を終えてから捕獲、飛行での再訪、ホームランド、期間限定イベントへ進み、旧ルートを現行条件の代わりにしません。' },
        links: [
          { href: '/aniimo/guides/s1-new-player-route', label: { zh: 'S1 新手路线', en: 'S1 starter route', ja: 'S1 初心者ルート' } },
          { href: '/aniimo/guides/rainbow-aniimo-guide', label: { zh: '虹光研究', en: 'Rainbow research', ja: '虹光研究' } },
        ],
      },
      {
        title: { zh: '图鉴与地图', en: 'Database and map', ja: '図鑑とマップ' },
        description: { zh: '用图鉴确认已知 Aniimo，再按区域与解锁条件安排探索；地图页不是逐点交互地图。', en: 'Use the database to confirm known Aniimo, then plan exploration by region and unlock conditions; the map page is not a marker-by-marker map.', ja: '図鑑で既知のAniimoを確認してから地域と解放条件で探索を組みます。マップページは地点別の対話型マップではありません。' },
        links: [
          { href: '/aniimo/characters', label: { zh: 'Aniimo 图鉴', en: 'Aniimo database', ja: 'Aniimo図鑑' } },
          { href: '/aniimo/map', label: { zh: '区域地图', en: 'Region map', ja: '地域マップ' } },
        ],
      },
      {
        title: { zh: '家园与奖励核验', en: 'Homeland and reward checks', ja: 'ホームランドと報酬確認' },
        description: { zh: '兑换码、预注册奖励和里程碑奖励分开追踪，上线当天优先核验输入入口。', en: 'Track codes, pre-registration rewards, and milestone rewards separately, then verify redemption in the live client.', ja: 'コード、事前登録、マイルストーン報酬を分け、現行クライアントで入力入口を確認します。' },
        links: [
          { href: '/aniimo/redeem-codes', label: { zh: '兑换码状态', en: 'Code status', ja: 'コード状況' } },
          { href: '/aniimo/guides/homeland-resource-guide', label: { zh: '家园资源', en: 'Homeland resources', ja: 'ホームランド資源' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: 'S1 开荒顺序', en: 'S1 onboarding order', ja: 'S1の進行順' },
        description: { zh: '先推进主线与系统解锁，再安排捕捉、飞行回访、家园和限时活动，避免用旧路线替代当前客户端条件。', en: 'Finish story and system unlocks before catches, flight revisits, Homeland, and limited events; do not substitute old routes for live-client conditions.', ja: 'メイン進行とシステム解放を終えてから捕獲、飛行での再訪、ホームランド、期間限定イベントへ進み、旧ルートを現行条件の代わりにしません。' },
        links: [
          { href: '/aniimo/guides/s1-new-player-route', label: { zh: 'S1 新手路线', en: 'S1 starter route', ja: 'S1 初心者ルート' } },
          { href: '/aniimo/guides/rainbow-aniimo-guide', label: { zh: '虹光研究', en: 'Rainbow research', ja: '虹光研究' } },
        ],
      },
      {
        title: { zh: '图鉴与地图', en: 'Database and map', ja: '図鑑とマップ' },
        description: { zh: '用图鉴确认已知 Aniimo，再按区域与解锁条件安排探索；地图页不是逐点交互地图。', en: 'Use the database to confirm known Aniimo, then plan exploration by region and unlock conditions; the map page is not a marker-by-marker map.', ja: '図鑑で既知のAniimoを確認してから地域と解放条件で探索を組みます。マップページは地点別の対話型マップではありません。' },
        links: [
          { href: '/aniimo/characters', label: { zh: 'Aniimo 图鉴', en: 'Aniimo database', ja: 'Aniimo図鑑' } },
          { href: '/aniimo/map', label: { zh: '区域地图', en: 'Region map', ja: '地域マップ' } },
        ],
      },
      {
        title: { zh: '家园与奖励核验', en: 'Homeland and reward checks', ja: 'ホームランドと報酬確認' },
        description: { zh: '兑换码、预注册奖励和里程碑奖励分开追踪，上线当天优先核验输入入口。', en: 'Track codes, pre-registration rewards, and milestone rewards separately, then verify redemption in the live client.', ja: 'コード、事前登録、マイルストーン報酬を分け、現行クライアントで入力入口を確認します。' },
        links: [
          { href: '/aniimo/redeem-codes', label: { zh: '兑换码状态', en: 'Code status', ja: 'コード状況' } },
          { href: '/aniimo/guides/homeland-resource-guide', label: { zh: '家园资源', en: 'Homeland resources', ja: 'ホームランド資源' } },
        ],
      },
    ],
  },
  zzz: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把角色定位、主C和站场逻辑理清，再决定养谁。', en: 'Clarify roles, main DPS choices, and field time first.', ja: '役割、主力、立ち回りを先に整理できます。' },
        links: [
          { href: '/zzz/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/zzz/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '查看驱动盘、音擎和养成优先级对应的配装建议。', en: 'Open build guidance for drive discs, W-Engines, and upgrade priorities.', ja: 'ディスク、Wエンジン、育成優先度へつなげます。' },
        links: [
          { href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/zzz/weapons', label: { zh: '音擎图鉴', en: 'W-Engine wiki', ja: 'Wエンジン図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '用节奏榜、对比和计算器处理更细的养成查询。', en: 'Use tier, compare, and calculator pages for deeper planning.', ja: 'Tier、比較、計算機で細かな育成を詰めます。' },
        links: [
          { href: '/zzz/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'Tier' } },
          { href: '/zzz/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本词、突击专精和玩法拆解都集中到攻略专题里。', en: 'Keep patch topics, Rupture specialty, and breakdown guides together.', ja: 'バージョン語、ラプチャー、攻略解説をまとめます。' },
        links: [
          { href: '/zzz/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/zzz/guides/rupture-specialty-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把角色定位、主C和站场逻辑理清，再决定养谁。', en: 'Clarify roles, main DPS choices, and field time first.', ja: '役割、主力、立ち回りを先に整理できます。' },
        links: [
          { href: '/zzz/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/zzz/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '查看驱动盘、音擎和养成优先级对应的配装建议。', en: 'Open build guidance for drive discs, W-Engines, and upgrade priorities.', ja: 'ディスク、Wエンジン、育成優先度へつなげます。' },
        links: [
          { href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/zzz/weapons', label: { zh: '音擎图鉴', en: 'W-Engine wiki', ja: 'Wエンジン図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '用节奏榜、对比和计算器处理更细的养成查询。', en: 'Use tier, compare, and calculator pages for deeper planning.', ja: 'Tier、比較、計算機で細かな育成を詰めます。' },
        links: [
          { href: '/zzz/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'Tier' } },
          { href: '/zzz/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本词、突击专精和玩法拆解都集中到攻略专题里。', en: 'Keep patch topics, Rupture specialty, and breakdown guides together.', ja: 'バージョン語、ラプチャー、攻略解説をまとめます。' },
        links: [
          { href: '/zzz/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/zzz/guides/rupture-specialty-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把角色定位、主C和站场逻辑理清，再决定养谁。', en: 'Clarify roles, main DPS choices, and field time first.', ja: '役割、主力、立ち回りを先に整理できます。' },
        links: [
          { href: '/zzz/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/zzz/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '查看驱动盘、音擎和养成优先级对应的配装建议。', en: 'Open build guidance for drive discs, W-Engines, and upgrade priorities.', ja: 'ディスク、Wエンジン、育成優先度へつなげます。' },
        links: [
          { href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/zzz/weapons', label: { zh: '音擎图鉴', en: 'W-Engine wiki', ja: 'Wエンジン図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '用节奏榜、对比和计算器处理更细的养成查询。', en: 'Use tier, compare, and calculator pages for deeper planning.', ja: 'Tier、比較、計算機で細かな育成を詰めます。' },
        links: [
          { href: '/zzz/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'Tier' } },
          { href: '/zzz/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本词、突击专精和玩法拆解都集中到攻略专题里。', en: 'Keep patch topics, Rupture specialty, and breakdown guides together.', ja: 'バージョン語、ラプチャー、攻略解説をまとめます。' },
        links: [
          { href: '/zzz/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/zzz/guides/rupture-specialty-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
  },
  wuwa: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先看角色定位、主输出和共鸣链，再决定培养顺序。', en: 'Start with roles, main DPS choices, and resonance chain priorities.', ja: '役割、主力、共鳴チェーン優先度を先に整理します。' },
        links: [
          { href: '/wuwa/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/wuwa/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '查看声骸、武器和词条优先级对应的培养建议。', en: 'Open practical build guidance for echoes, weapons, and stat priorities.', ja: '声骸、武器、ステ優先度を実用ページへつなげます。' },
        links: [
          { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/wuwa/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合继续查看更细的玩法与数值问题。', en: 'Use map, compare, and calculator pages for finer gameplay and stat questions.', ja: 'マップ、比較、計算機で細かい数値や遊び方を受け止めます。' },
        links: [
          { href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/wuwa/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '3.7 实装、梦枢天罗与声骸系统继续往下接。', en: 'Continue into v3.7 live coverage, the Simulacrum Nexus, and the Echo system.', ja: 'Ver.3.7実装、夢枢天羅、エコーシステムへ進めます。' },
        links: [
          { href: '/wuwa/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/wuwa/guides/v3-7-live-route', label: { zh: '3.7 上线后路线', en: 'v3.7 live route', ja: 'Ver.3.7実装後ルート' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先看角色定位、主输出和共鸣链，再决定培养顺序。', en: 'Start with roles, main DPS choices, and resonance chain priorities.', ja: '役割、主力、共鳴チェーン優先度を先に整理します。' },
        links: [
          { href: '/wuwa/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/wuwa/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '查看声骸、武器和词条优先级对应的培养建议。', en: 'Open practical build guidance for echoes, weapons, and stat priorities.', ja: '声骸、武器、ステ優先度を実用ページへつなげます。' },
        links: [
          { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/wuwa/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合继续查看更细的玩法与数值问题。', en: 'Use map, compare, and calculator pages for finer gameplay and stat questions.', ja: 'マップ、比較、計算機で細かい数値や遊び方を受け止めます。' },
        links: [
          { href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/wuwa/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '3.7 实装、梦枢天罗与声骸系统继续往下接。', en: 'Continue into v3.7 live coverage, the Simulacrum Nexus, and the Echo system.', ja: 'Ver.3.7実装、夢枢天羅、エコーシステムへ進めます。' },
        links: [
          { href: '/wuwa/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/wuwa/guides/v3-7-live-route', label: { zh: '3.7 上线后路线', en: 'v3.7 live route', ja: 'Ver.3.7実装後ルート' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先看角色定位、主输出和共鸣链，再决定培养顺序。', en: 'Start with roles, main DPS choices, and resonance chain priorities.', ja: '役割、主力、共鳴チェーン優先度を先に整理します。' },
        links: [
          { href: '/wuwa/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/wuwa/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '查看声骸、武器和词条优先级对应的培养建议。', en: 'Open practical build guidance for echoes, weapons, and stat priorities.', ja: '声骸、武器、ステ優先度を実用ページへつなげます。' },
        links: [
          { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/wuwa/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合继续查看更细的玩法与数值问题。', en: 'Use map, compare, and calculator pages for finer gameplay and stat questions.', ja: 'マップ、比較、計算機で細かい数値や遊び方を受け止めます。' },
        links: [
          { href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/wuwa/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '3.7 实装、梦枢天罗与声骸系统继续往下接。', en: 'Continue into v3.7 live coverage, the Simulacrum Nexus, and the Echo system.', ja: 'Ver.3.7実装、夢枢天羅、エコーシステムへ進めます。' },
        links: [
          { href: '/wuwa/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/wuwa/guides/v3-7-live-route', label: { zh: '3.7 上线后路线', en: 'v3.7 live route', ja: 'Ver.3.7実装後ルート' } },
        ],
      },
    ],
  },
  endfield: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '查看干员定位、主力构筑和队伍分工。', en: 'Open operator roles, main carries, and team-duty guidance.', ja: 'オペレーターの役割、主力、分担をキャラページへ。' },
        links: [
          { href: '/endfield/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/endfield/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '把武器、模组和主属性规划串成更可执行的培养页。', en: 'Turn weapons, modules, and stat plans into a concrete build path.', ja: '武器、モジュール、ステ設計を実用ビルドへつなげます。' },
        links: [
          { href: '/endfield/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/endfield/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合继续查看测试与养成细节。', en: 'Use map, compare, and calculator pages for test and progression details.', ja: 'マップ、比較、計算機でテストや育成の需要を拾います。' },
        links: [
          { href: '/endfield/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/endfield/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '先确认测试后状态，再整理 AIC 工厂与可复用的建设资料。', en: 'Confirm post-test status first, then organize AIC factories and reusable construction notes.', ja: 'まずテスト後状態を確認し、AIC工場と再利用可能な建設資料を整理します。' },
        links: [
          { href: '/endfield/events', label: { zh: '状态看板', en: 'Status board', ja: '状態ボード' } },
          { href: '/endfield/guides/blueprint-aic-factory-guide', label: { zh: 'AIC / 蓝图', en: 'AIC / Blueprints', ja: 'AIC / 設計図' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '查看干员定位、主力构筑和队伍分工。', en: 'Open operator roles, main carries, and team-duty guidance.', ja: 'オペレーターの役割、主力、分担をキャラページへ。' },
        links: [
          { href: '/endfield/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/endfield/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '把武器、模组和主属性规划串成更可执行的培养页。', en: 'Turn weapons, modules, and stat plans into a concrete build path.', ja: '武器、モジュール、ステ設計を実用ビルドへつなげます。' },
        links: [
          { href: '/endfield/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/endfield/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合继续查看测试与养成细节。', en: 'Use map, compare, and calculator pages for test and progression details.', ja: 'マップ、比較、計算機でテストや育成の需要を拾います。' },
        links: [
          { href: '/endfield/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/endfield/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '先确认测试后状态，再整理 AIC 工厂与可复用的建设资料。', en: 'Confirm post-test status first, then organize AIC factories and reusable construction notes.', ja: 'まずテスト後状態を確認し、AIC工場と再利用可能な建設資料を整理します。' },
        links: [
          { href: '/endfield/events', label: { zh: '状态看板', en: 'Status board', ja: '状態ボード' } },
          { href: '/endfield/guides/blueprint-aic-factory-guide', label: { zh: 'AIC / 蓝图', en: 'AIC / Blueprints', ja: 'AIC / 設計図' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '查看干员定位、主力构筑和队伍分工。', en: 'Open operator roles, main carries, and team-duty guidance.', ja: 'オペレーターの役割、主力、分担をキャラページへ。' },
        links: [
          { href: '/endfield/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/endfield/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '把武器、模组和主属性规划串成更可执行的培养页。', en: 'Turn weapons, modules, and stat plans into a concrete build path.', ja: '武器、モジュール、ステ設計を実用ビルドへつなげます。' },
        links: [
          { href: '/endfield/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/endfield/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合继续查看测试与养成细节。', en: 'Use map, compare, and calculator pages for test and progression details.', ja: 'マップ、比較、計算機でテストや育成の需要を拾います。' },
        links: [
          { href: '/endfield/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/endfield/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '先确认测试后状态，再整理 AIC 工厂与可复用的建设资料。', en: 'Confirm post-test status first, then organize AIC factories and reusable construction notes.', ja: 'まずテスト後状態を確認し、AIC工場と再利用可能な建設資料を整理します。' },
        links: [
          { href: '/endfield/events', label: { zh: '状态看板', en: 'Status board', ja: '状態ボード' } },
          { href: '/endfield/guides/blueprint-aic-factory-guide', label: { zh: 'AIC / 蓝图', en: 'AIC / Blueprints', ja: 'AIC / 設計図' } },
        ],
      },
    ],
  },
  sea: {
    zh: [
      {
        title: { zh: 'Beta 观察', en: 'Beta watch', ja: 'Beta注目' },
        description: {
          zh: '先确认 early 2027、December beta 和测试资格来源，不把未确认日期写成定档。',
          en: 'Check early 2027, December beta, and access-source tiers without treating unconfirmed dates as final.',
          ja: 'early 2027、December beta、資格情報の出典を確認し、未確認日程を確定扱いしません。',
        },
        links: [
          { href: '/sea/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/sea/guides/platform-download-guide', label: { zh: '平台 FAQ', en: 'Platform FAQ', ja: '平台FAQ' } },
        ],
      },
      {
        title: { zh: '平台与下载', en: 'Platforms & download', ja: '平台・DL' },
        description: {
          zh: '把 Steam、PS5、Xbox、移动端和官网入口按来源分层，适合承接下载和资格搜索。',
          en: 'Tier Steam, PS5, Xbox, mobile, and official-site entry points for download and access searches.',
          ja: 'Steam、PS5、Xbox、モバイル、公式入口を出典別に分け、DLと資格検索を受けます。',
        },
        links: [
          { href: '/sea/download', label: { zh: '下载入口', en: 'Download hub', ja: 'DL入口' } },
          { href: '/sea/guides/what-is-forgotten-sea', label: { zh: '玩法 FAQ', en: 'Gameplay FAQ', ja: '玩法FAQ' } },
        ],
      },
      {
        title: { zh: '玩法与抽卡', en: 'Gameplay & gacha', ja: '玩法・ガチャ' },
        description: {
          zh: '继续承接 solo、gacha、角色和战斗系统，但用 watch 口径标注未确认细节。',
          en: 'Route solo, gacha, characters, and combat intent while marking unconfirmed details as watch items.',
          ja: 'solo、gacha、キャラ、戦闘需要を受けつつ、未確認情報はwatch表現にします。',
        },
        links: [
          { href: '/sea/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/sea/guides/gacha-recruitment-guide', label: { zh: '抽卡指南', en: 'Gacha guide', ja: 'ガチャ解説' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: 'Beta 观察', en: 'Beta watch', ja: 'Beta注目' },
        description: {
          zh: '先确认 early 2027、December beta 和测试资格来源，不把未确认日期写成定档。',
          en: 'Check early 2027, December beta, and access-source tiers without treating unconfirmed dates as final.',
          ja: 'early 2027、December beta、資格情報の出典を確認し、未確認日程を確定扱いしません。',
        },
        links: [
          { href: '/sea/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/sea/guides/platform-download-guide', label: { zh: '平台 FAQ', en: 'Platform FAQ', ja: '平台FAQ' } },
        ],
      },
      {
        title: { zh: '平台与下载', en: 'Platforms & download', ja: '平台・DL' },
        description: {
          zh: '把 Steam、PS5、Xbox、移动端和官网入口按来源分层，适合承接下载和资格搜索。',
          en: 'Tier Steam, PS5, Xbox, mobile, and official-site entry points for download and access searches.',
          ja: 'Steam、PS5、Xbox、モバイル、公式入口を出典別に分け、DLと資格検索を受けます。',
        },
        links: [
          { href: '/sea/download', label: { zh: '下载入口', en: 'Download hub', ja: 'DL入口' } },
          { href: '/sea/guides/what-is-forgotten-sea', label: { zh: '玩法 FAQ', en: 'Gameplay FAQ', ja: '玩法FAQ' } },
        ],
      },
      {
        title: { zh: '玩法与抽卡', en: 'Gameplay & gacha', ja: '玩法・ガチャ' },
        description: {
          zh: '继续承接 solo、gacha、角色和战斗系统，但用 watch 口径标注未确认细节。',
          en: 'Route solo, gacha, characters, and combat intent while marking unconfirmed details as watch items.',
          ja: 'solo、gacha、キャラ、戦闘需要を受けつつ、未確認情報はwatch表現にします。',
        },
        links: [
          { href: '/sea/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/sea/guides/gacha-recruitment-guide', label: { zh: '抽卡指南', en: 'Gacha guide', ja: 'ガチャ解説' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: 'Beta 观察', en: 'Beta watch', ja: 'Beta注目' },
        description: {
          zh: '先确认 early 2027、December beta 和测试资格来源，不把未确认日期写成定档。',
          en: 'Check early 2027, December beta, and access-source tiers without treating unconfirmed dates as final.',
          ja: 'early 2027、December beta、資格情報の出典を確認し、未確認日程を確定扱いしません。',
        },
        links: [
          { href: '/sea/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/sea/guides/platform-download-guide', label: { zh: '平台 FAQ', en: 'Platform FAQ', ja: '平台FAQ' } },
        ],
      },
      {
        title: { zh: '平台与下载', en: 'Platforms & download', ja: '平台・DL' },
        description: {
          zh: '把 Steam、PS5、Xbox、移动端和官网入口按来源分层，适合承接下载和资格搜索。',
          en: 'Tier Steam, PS5, Xbox, mobile, and official-site entry points for download and access searches.',
          ja: 'Steam、PS5、Xbox、モバイル、公式入口を出典別に分け、DLと資格検索を受けます。',
        },
        links: [
          { href: '/sea/download', label: { zh: '下载入口', en: 'Download hub', ja: 'DL入口' } },
          { href: '/sea/guides/what-is-forgotten-sea', label: { zh: '玩法 FAQ', en: 'Gameplay FAQ', ja: '玩法FAQ' } },
        ],
      },
      {
        title: { zh: '玩法与抽卡', en: 'Gameplay & gacha', ja: '玩法・ガチャ' },
        description: {
          zh: '继续承接 solo、gacha、角色和战斗系统，但用 watch 口径标注未确认细节。',
          en: 'Route solo, gacha, characters, and combat intent while marking unconfirmed details as watch items.',
          ja: 'solo、gacha、キャラ、戦闘需要を受けつつ、未確認情報はwatch表現にします。',
        },
        links: [
          { href: '/sea/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/sea/guides/gacha-recruitment-guide', label: { zh: '抽卡指南', en: 'Gacha guide', ja: 'ガチャ解説' } },
        ],
      },
    ],
  },
  skjh: {
    zh: [
      {
        title: { zh: '开服', en: 'Launch', ja: 'ローンチ' },
        description: { zh: '先确认上线时间、预约和开荒问题。', en: 'Check launch timing, preregistration, and starter questions first.', ja: 'ローンチ時期、事前登録、序盤の疑問を先に受け止めます。' },
        links: [
          { href: '/skjh/guides/season-1-launch', label: { zh: '上线总专题', en: 'Launch center', ja: 'ローンチ特集' } },
          { href: '/skjh/guides/launch-rewards-complete', label: { zh: '预约福利', en: 'Rewards', ja: '報酬' } },
        ],
      },
      {
        title: { zh: '生存', en: 'Survival', ja: 'サバイバル' },
        description: { zh: '生存、战斗和资源消耗问题一起看更顺。', en: 'Group survival, combat, and resource-use topics together.', ja: '生存、戦闘、資源消費をまとめて見られます。' },
        links: [
          { href: '/skjh/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/skjh/teams', label: { zh: '队伍思路', en: 'Team ideas', ja: '編成案' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '继续往下可以看计算器和武器页。', en: 'Continue into the calculator and weapons pages next.', ja: '次は計算機と武器ページへつなげます。' },
        links: [
          { href: '/skjh/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/skjh/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '下载、互通和攻略专题可以继续查看。', en: 'Continue into download, cross-play, and guide topics.', ja: 'DL、互通、攻略へ進めます。' },
        links: [
          { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 PC 下载 FAQ', en: 'Official PC Download FAQ', ja: '公式PC DL FAQ' } },
          { href: '/skjh/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '开服', en: 'Launch', ja: 'ローンチ' },
        description: { zh: '先确认上线时间、预约和开荒问题。', en: 'Check launch timing, preregistration, and starter questions first.', ja: 'ローンチ時期、事前登録、序盤の疑問を先に受け止めます。' },
        links: [
          { href: '/skjh/guides/season-1-launch', label: { zh: '上线总专题', en: 'Launch center', ja: 'ローンチ特集' } },
          { href: '/skjh/guides/launch-rewards-complete', label: { zh: '预约福利', en: 'Rewards', ja: '報酬' } },
        ],
      },
      {
        title: { zh: '生存', en: 'Survival', ja: 'サバイバル' },
        description: { zh: '生存、战斗和资源消耗问题一起看更顺。', en: 'Group survival, combat, and resource-use topics together.', ja: '生存、戦闘、資源消費をまとめて見られます。' },
        links: [
          { href: '/skjh/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/skjh/teams', label: { zh: '队伍思路', en: 'Team ideas', ja: '編成案' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '继续往下可以看计算器和武器页。', en: 'Continue into the calculator and weapons pages next.', ja: '次は計算機と武器ページへつなげます。' },
        links: [
          { href: '/skjh/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/skjh/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '下载、互通和攻略专题可以继续查看。', en: 'Continue into download, cross-play, and guide topics.', ja: 'DL、互通、攻略へ進めます。' },
        links: [
          { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 PC 下载 FAQ', en: 'Official PC Download FAQ', ja: '公式PC DL FAQ' } },
          { href: '/skjh/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '开服', en: 'Launch', ja: 'ローンチ' },
        description: { zh: '先确认上线时间、预约和开荒问题。', en: 'Check launch timing, preregistration, and starter questions first.', ja: 'ローンチ時期、事前登録、序盤の疑問を先に受け止めます。' },
        links: [
          { href: '/skjh/guides/season-1-launch', label: { zh: '上线总专题', en: 'Launch center', ja: 'ローンチ特集' } },
          { href: '/skjh/guides/launch-rewards-complete', label: { zh: '预约福利', en: 'Rewards', ja: '報酬' } },
        ],
      },
      {
        title: { zh: '生存', en: 'Survival', ja: 'サバイバル' },
        description: { zh: '生存、战斗和资源消耗问题一起看更顺。', en: 'Group survival, combat, and resource-use topics together.', ja: '生存、戦闘、資源消費をまとめて見られます。' },
        links: [
          { href: '/skjh/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/skjh/teams', label: { zh: '队伍思路', en: 'Team ideas', ja: '編成案' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '继续往下可以看计算器和武器页。', en: 'Continue into the calculator and weapons pages next.', ja: '次は計算機と武器ページへつなげます。' },
        links: [
          { href: '/skjh/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/skjh/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '下载、互通和攻略专题可以继续查看。', en: 'Continue into download, cross-play, and guide topics.', ja: 'DL、互通、攻略へ進めます。' },
        links: [
          { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 PC 下载 FAQ', en: 'Official PC Download FAQ', ja: '公式PC DL FAQ' } },
          { href: '/skjh/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
  },
};

function buildBreadcrumbJsonLd(gameId: GameId, locale: SupportedLocale, title: string) {
  const gameName = GAMES[gameId]?.name[locale] ?? gameId;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 3, name: CATEGORY_LABELS.version?.[locale] ?? 'Version Hub', item: `${BASE_URL}/${locale}/${gameId}/version` },
      { '@type': 'ListItem', position: 4, name: title },
    ],
  };
}

function buildFaqJsonLd(faq: FaqItem[], locale: SupportedLocale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question[locale],
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer[locale],
      },
    })),
  };
}

function sourceTierLabel(tier: VersionSnapshotSourceTier, locale: SupportedLocale) {
  const labels: Record<VersionSnapshotSourceTier, Record<SupportedLocale, string>> = {
    official: {
      zh: '官方源',
      en: 'Official sources',
      ja: '公式ソース',
    },
    mixed: {
      zh: '官方 + 公开采样',
      en: 'Official + public sampling',
      ja: '公式 + 公開サンプル',
    },
    third_party_watch: {
      zh: '第三方信号待核验',
      en: 'Third-party signal pending verification',
      ja: '第三者シグナル確認待ち',
    },
  };

  return labels[tier][locale];
}

function pickFeaturedGuides<T extends { id: string }>(guides: T[], featuredIds: string[]): T[] {
  const guideMap = new Map(guides.map((guide) => [guide.id, guide] as const));
  return featuredIds.map((id) => guideMap.get(id)).filter((guide): guide is T => Boolean(guide));
}

async function getGuidesForGame(gameId: GameId, locale: SupportedLocale) {
  const { guides } = await getGuideListData(gameId, locale);
  return guides;
}

function getVersionNextSteps(gameId: GameId): NextStepLink[] {
  const linksByGame: Partial<Record<GameId, NextStepLink[]>> = {
    genshin: [
      {
        href: '/genshin/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '把版本内容和角色定位连起来看，更容易判断抽取和培养优先级。',
          en: 'Connect version updates to character roles, then decide pulls and priorities.',
          ja: 'バージョン内容と役割をつなげて見ると、育成優先度が決めやすくなります。',
        },
      },
      {
        href: '/genshin/weapons',
        title: { zh: '武器图鉴', en: 'Weapon Wiki', ja: '武器図鑑' },
        description: {
          zh: '查看当前版本里更合适的主武器和备选方案。',
          en: 'Review the best weapon and fallback options for the current patch.',
          ja: '現行バージョンで使いやすい武器と代替案を確認できます。',
        },
      },
      {
        href: '/genshin/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '继续看更完整的活动、机制和养成攻略。',
          en: 'Continue into full event, mechanic, and progression guides.',
          ja: 'イベント、機構、育成の詳細攻略へ進めます。',
        },
      },
    ],
    starrail: [
      {
        href: '/starrail/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '看完版本专题后，继续判断角色定位和卡池优先级。',
          en: 'Move from the version hub into character roles and banner decisions.',
          ja: 'バージョン特集の次に、役割とガチャ判断へ進めます。',
        },
      },
      {
        href: '/starrail/build',
        title: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: {
          zh: '对照配装页，快速确认当前版本更适合什么养成方向。',
          en: 'Use the build page to see which progression paths fit this patch best.',
          ja: 'ビルドページで今のバージョンに合う育成方針を確認できます。',
        },
      },
      {
        href: '/starrail/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '继续看前瞻、联动、资源规划和机制攻略。',
          en: 'Continue into previews, collabs, resource planning, and mechanics.',
          ja: '前瞻、コラボ、資源計画、機構攻略へ進めます。',
        },
      },
    ],
    wuwa: [
      {
        href: '/wuwa/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '版本和角色强度、定位结合看，能更快判断养成顺序。',
          en: 'Pair the version hub with character roles to decide build order faster.',
          ja: 'バージョンと役割を合わせて見ると、育成順が決めやすくなります。',
        },
      },
      {
        href: '/wuwa/build',
        title: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: {
          zh: '继续看声骸、武器和养成方向，判断版本重点。',
          en: 'Continue into echo, weapon, and progression picks to capture patch intent.',
          ja: 'エコー、武器、育成方針へ進んでバージョン需要を拾います。',
        },
      },
      {
        href: '/wuwa/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '适合接着看版本前瞻、活动和新手路径。',
          en: 'Best for preview notes, events, and starter routes next.',
          ja: '前瞻、イベント、入門ルートを続けて見られます。',
        },
      },
    ],
    zzz: [
      {
        href: '/zzz/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '看完版本专题后，继续查看角色和阵容思路。',
          en: 'Move from the version hub into character roles and team ideas.',
          ja: 'バージョン特集からキャラと編成へつなげられます。',
        },
      },
      {
        href: '/zzz/build',
        title: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: {
          zh: '驱动盘、音擎和养成目标都能在这里接上。',
          en: 'Continue into drive discs, W-Engines, and build goals.',
          ja: 'ディスク、Wエンジン、育成目標へ進めます。',
        },
      },
      {
        href: '/zzz/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '适合继续看当前版本词、新代理人、周年福利和玩法解析。',
          en: 'Best for current-version keywords, new agents, anniversary rewards, and gameplay breakdowns.',
          ja: '現在版本の注目語、新エージェント、周年報酬、攻略解説へ進めます。',
        },
      },
    ],
    guihuan: [
      {
        href: '/guihuan/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '版本专题读完后，继续看角色定位和培养优先级。',
          en: 'Continue into roles and progression priorities after the version hub.',
          ja: 'バージョン特集の次に役割と育成優先度を見られます。',
        },
      },
      {
        href: '/guihuan/weapons',
        title: { zh: '武器图鉴', en: 'Weapon Wiki', ja: '武器図鑑' },
        description: {
          zh: '把当前阶段更值得投入的武器先筛出来。',
          en: 'Filter the weapons worth investing in at this stage.',
          ja: '今の段階で優先したい武器を絞れます。',
        },
      },
      {
        href: '/guihuan/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '继续看开服、使灵和配装的详细拆解。',
          en: 'Continue into launch, spirit, and build breakdowns.',
          ja: '開服、使霊、ビルド解説へ進めます。',
        },
      },
    ],
    ananta: [
      {
        href: '/ananta/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '预约与版本专题后，继续看角色和养成方向。',
          en: 'Move from preregistration and version notes into character planning.',
          ja: '事前登録やバージョン情報の次にキャラ計画へ進めます。',
        },
      },
      {
        href: '/ananta/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '继续看下载、战斗系统和异能者入门。',
          en: 'Continue into download, combat, and esper starter guides.',
          ja: 'DL、戦闘、異能者入門へ進めます。',
        },
      },
      {
        href: '/ananta/version',
        title: { zh: '版本专题', en: 'Version Hub', ja: 'バージョン特集' },
        description: {
          zh: '保持关注后续定档和官方动向。',
          en: 'Keep following the latest release timing and official updates.',
          ja: '今後の定期情報と公式動向を追えます。',
        },
      },
    ],
    endfield: [
      {
        href: '/endfield/characters',
        title: { zh: '角色图鉴', en: 'Character Wiki', ja: 'キャラ図鑑' },
        description: {
          zh: '看完测试专题后，继续查看角色和职业理解。',
          en: 'Move from the test hub into character roles and professions.',
          ja: 'テスト特集の次にキャラと職業理解へ進めます。',
        },
      },
      {
        href: '/endfield/build',
        title: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: {
          zh: '继续看武器、模组和主属性规划。',
          en: 'Continue into weapons, modules, and stat planning.',
          ja: '武器、モジュール、ステータス設計へ進めます。',
        },
      },
      {
        href: '/endfield/guides',
        title: { zh: '攻略专题', en: 'Guides', ja: '攻略' },
        description: {
          zh: '适合继续看测试节点、基地建设和危机合约。',
          en: 'Best for test timing, base-building, and crisis contract notes.',
          ja: 'テスト時期、基地建設、危機契約へ進めます。',
        },
      },
    ],
    sea: [
      {
        href: '/sea/guides/open-beta-version-center',
        title: { zh: '公测版本中心', en: 'Open Beta Center', ja: 'CBT特集' },
        description: {
          zh: '先确认 7 月 9 日公测、版本核心信息和首月路线。',
          en: 'Check the July 9 beta timing, version core topics, and month-one route first.',
          ja: '7月9日CBT、版本の要点、初月ルートを先に押さえます。',
        },
      },
      {
        href: '/sea/guides/launch-day-guide',
        title: { zh: '开服攻略', en: 'Launch Guide', ja: '開服攻略' },
        description: {
          zh: '继续看开服流程、首月规划和实战路线。',
          en: 'Continue into launch flow, month-one planning, and practical routes.',
          ja: '開服手順、初月計画、実用ルートへ進めます。',
        },
      },
      {
        href: '/sea/guides/download-install-guide',
        title: { zh: '下载安装', en: 'Download/Install', ja: 'DLとインストール' },
        description: {
          zh: '下载、安装和平台支持可以直接从这里继续。',
          en: 'Move directly into download, install, and platform support.',
          ja: 'DL、インストール、対応プラットフォームへ進めます。',
        },
      },
      {
        href: '/sea/guides/team-building-guide',
        title: { zh: '队伍思路', en: 'Team Building', ja: '編成案' },
        description: {
          zh: '角色、节奏榜和配队思路继续往下接。',
          en: 'Continue into characters, tier lists, and team ideas.',
          ja: 'キャラ、Tier、編成案へつなげます。',
        },
      },
    ],
    skjh: [
      {
        href: '/skjh/guides/season-1-launch',
        title: { zh: '上线总专题', en: 'Launch Center', ja: 'ローンチ特集' },
        description: {
          zh: '一次确认 7 月 9 日上线、预约和开荒问题。',
          en: 'Capture the July 9 launch, preregistration, and starter questions.',
          ja: '7月9日ローンチ、事前登録、初心者導線をまとめます。',
        },
      },
      {
        href: '/skjh/guides/launch-rewards-complete',
        title: { zh: '预约福利', en: 'Reservation Rewards', ja: '事前登録報酬' },
        description: {
          zh: '开服福利、礼包和预约奖励可以继续在这页查。',
          en: 'Continue into launch rewards, packs, and preregistration bonuses.',
          ja: 'ローンチ報酬、パック、事前登録特典を続けて確認できます。',
        },
      },
      {
        href: '/skjh/guides/official-pc-download-faq',
        title: { zh: '官网 PC 下载 FAQ', en: 'Official PC Download FAQ', ja: '公式PC DL FAQ' },
        description: {
          zh: '下载、平台和互通问题可以先看这里。',
          en: 'This is the right place for download, platform, and cross-play questions.',
          ja: 'DL、対応プラットフォーム、互通の質問はこちらです。',
        },
      },
    ],
  };

  return linksByGame[gameId] ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const hub = VERSION_COPY[gameId];
  const archive = gameId === 'hi3' ? getHi3ArchiveMetadata(locale) : undefined;
  if (!gameName || (!hub && !archive)) return {};
  const title = archive?.title ?? VERSION_META_OVERRIDES[gameId]?.[locale]?.title ?? `${gameName} ${hub!.title[locale]}`;
  const description = archive?.description ?? VERSION_META_OVERRIDES[gameId]?.[locale]?.description ?? hub!.description[locale];
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/version`, LOCALES);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/version`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function VersionHubPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (gameId === 'hi3') return <Hi3VersionArchive locale={locale} />;
  const gameConfig = GAMES[gameId];
  const hub = VERSION_COPY[gameId];
  if (!gameConfig || !hub) {
    notFound();
  }
  const pageTitle = `${gameConfig.name[locale]} ${hub.title[locale]}`;
  const guides = await getGuidesForGame(gameId, locale);
  const featuredGuides = pickFeaturedGuides(guides, hub.guideIds);
  const routeOrder: Array<keyof typeof gameConfig.routes> = [
    'guides',
    'tier-list',
    'build',
    'redeem-codes',
    'characters',
    'weapons',
    'items',
    'map',
    'calculator',
    'teams',
    'artifacts',
    'disk-sets',
    'drive-discs',
    'gacha',
    'anomalies',
  ];
  const enabledRoutes = routeOrder.filter((route) => Boolean(gameConfig.routes[route]));
  const faqJsonLd = buildFaqJsonLd(hub.faq, locale);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(gameId, locale, pageTitle);
  const focusLanes = VERSION_FOCUS_LANES[gameId]?.[locale] ?? [];
  const officialStatusNote = OFFICIAL_STATUS_NOTES[gameId]?.[locale];
  const intentLinks = INTENT_LINKS[gameId] ?? [];
  const versionSnapshot = getVersionSnapshot(gameId);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
      <section className="mb-8 rounded-2xl border border-game-border bg-game-surface p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-game-surface-alt px-3 py-1 text-xs font-medium text-game-primary">
            {hub.kicker[locale]}
          </span>
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {CATEGORY_LABELS.version?.[locale] ?? 'Version Hub'}
          </span>
        </div>
        <h1 className="mb-3 text-3xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {gameConfig.name[locale]} {hub.title[locale]}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-game-text-muted">
          {hub.description[locale]}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {hub.freshness[locale]}
          </span>
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {locale === 'zh' ? '持续对接近期热搜与版本节点' : locale === 'ja' ? '最新検索語とバージョン動向を継続反映' : 'Continuously aligned with recent search demand and version timing'}
          </span>
        </div>
        {officialStatusNote && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-game-text-muted">
            <span className="font-semibold text-amber-300">
              {locale === 'zh' ? '官方状态提示：' : locale === 'ja' ? '公式ステータス：' : 'Official status: '}
            </span>
            {officialStatusNote}
          </div>
        )}
      </section>

      {versionSnapshot && (
        <section className="mb-8 rounded-2xl border border-game-border bg-game-surface p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-game-text">
                {locale === 'zh' ? '版本快照' : locale === 'ja' ? 'バージョンスナップショット' : 'Version Snapshot'}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-game-text-muted">
                {localizeVersionText(versionSnapshot.summary, locale)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
                {locale === 'zh' ? '当前版本' : locale === 'ja' ? '現在版本' : 'Current'}: {versionSnapshot.currentVersion}
              </span>
              <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
                {locale === 'zh' ? '发布日期' : locale === 'ja' ? '公開日' : 'Release'}: {versionSnapshot.releaseDate}
              </span>
              <span className="rounded-full bg-game-primary/10 px-3 py-1 text-xs font-medium text-game-primary">
                {versionSnapshot.status}
              </span>
              {versionSnapshot.sourceTier && (
                <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
                  {sourceTierLabel(versionSnapshot.sourceTier, locale)}
                </span>
              )}
            </div>
          </div>

          {versionSnapshot.platformReleaseDates && versionSnapshot.platformReleaseDates.length > 0 && (
            <div className="mb-4 rounded-xl border border-game-primary/20 bg-game-primary/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {locale === 'zh' ? '分平台上线时间' : locale === 'ja' ? '平台別の配信時期' : 'Platform release times'}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {versionSnapshot.platformReleaseDates.map((platformRelease) => (
                  <div
                    key={`${platformRelease.platform}-${platformRelease.date}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-game-border bg-game-bg/60 px-3 py-2 text-sm"
                  >
                    <span className="text-game-text-muted">{platformRelease.platform}</span>
                    <span className="font-semibold text-game-text">
                      {platformRelease.date}
                      {platformRelease.time ? ` · ${platformRelease.time}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.85fr]">
            <div className="rounded-xl border border-game-border bg-game-bg/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {locale === 'zh' ? 'What changed' : locale === 'ja' ? '変更点' : 'What Changed'}
              </h3>
              <ul className="space-y-2 text-sm leading-relaxed text-game-text-muted">
                {versionSnapshot.whatChanged.map((item) => (
                  <li key={localizeVersionText(item, locale)}>{localizeVersionText(item, locale)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-game-border bg-game-bg/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {locale === 'zh' ? '先做什么' : locale === 'ja' ? '最初にやること' : 'What To Do First'}
              </h3>
              <ul className="space-y-2 text-sm leading-relaxed text-game-text-muted">
                {versionSnapshot.firstSteps.map((item) => (
                  <li key={localizeVersionText(item, locale)}>{localizeVersionText(item, locale)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-game-border bg-game-bg/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {locale === 'zh' ? '相关行动' : locale === 'ja' ? '関連アクション' : 'Related Actions'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {versionSnapshot.links.map((link) => (
                  <Link
                    key={`${link.type}-${link.href}`}
                    href={link.href as '/'}
                    className="rounded-full border border-game-border px-3 py-1.5 text-xs text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                  >
                    {localizeVersionText(link.label, locale)}
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-xs text-game-text-muted">
                {locale === 'zh' ? '最后更新' : locale === 'ja' ? '最終更新' : 'Last updated'}: {versionSnapshot.lastUpdatedAt}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-game-text">{locale === 'zh' ? '关键节点' : locale === 'ja' ? '重要ポイント' : 'Key Nodes'}</h2>
          <span className="text-xs text-game-text-muted">{locale === 'zh' ? '当前版本快速概览' : locale === 'ja' ? '現在バージョンの要点' : 'Current version overview'}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {hub.highlights[locale].map((item) => (
            <div key={item} className="rounded-xl border border-game-border bg-game-surface p-4">
              <div className="mb-2 text-sm font-semibold text-game-primary">{item}</div>
              <p className="text-sm text-game-text-muted">
                {locale === 'zh' ? '点击下方专题和攻略查看完整解析。' : locale === 'ja' ? '下の特集と攻略で詳細を確認できます。' : 'Check the featured guides below for the full breakdown.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {intentLinks.length > 0 && (
        <section className="mb-8 rounded-2xl border border-game-border bg-game-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-game-text">
                {locale === 'zh' ? '高频搜索入口' : locale === 'ja' ? '頻出検索入口' : 'High-Intent Shortcuts'}
              </h2>
              <p className="mt-1 text-sm text-game-text-muted">
                {locale === 'zh'
                  ? '集中整理官网、下载、云游戏、配置、兑换码和核心机制问题。'
                  : locale === 'ja'
                    ? '公式、DL、クラウド、環境、コード、主要機構の検索をまとめます。'
                    : 'Route official, download, cloud, specs, code, and core-mechanic queries into stable pages.'}
              </p>
            </div>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '快速入口' : locale === 'ja' ? 'テンプレ導線' : 'Quick shortcuts'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {intentLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label[locale]}`}
                href={link.href as '/'}
                className="rounded-xl border border-game-border bg-game-bg/80 p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <div className="mb-2 text-sm font-semibold text-game-primary">{link.label[locale]}</div>
                <p className="text-sm leading-relaxed text-game-text-muted">{link.description[locale]}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {focusLanes.length > 0 && (
        <section className="mb-8 rounded-2xl border border-game-border bg-gradient-to-br from-game-surface via-game-surface to-game-surface/80 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-game-text">
                {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '次に進む' : 'Continue deeper'}
              </h2>
              <p className="mt-1 text-sm text-game-text-muted">
                {locale === 'zh' ? '按版本重点继续查看角色、配装、工具和机制页。' : locale === 'ja' ? 'バージョン語をキャラ、ビルド、ツール、機構へつなぎます。' : 'Continue from version topics into characters, builds, tools, and mechanics.'}
              </p>
            </div>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '继续深入' : locale === 'ja' ? 'さらに下へ' : 'Continue deeper'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {focusLanes.map((lane) => (
              <div key={lane.title[locale]} className="rounded-xl border border-game-border bg-game-bg/80 p-4">
                <div className="mb-2 text-sm font-semibold text-game-primary">{lane.title[locale]}</div>
                <p className="mb-4 text-sm leading-relaxed text-game-text-muted">{lane.description[locale]}</p>
                <div className="flex flex-wrap gap-2">
                  {lane.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href as '/'}
                      className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                    >
                      {link.label[locale]}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {featuredGuides.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-game-text">{locale === 'zh' ? '专题推荐' : locale === 'ja' ? '注目ガイド' : 'Featured Guides'}</h2>
            <span className="text-xs text-game-text-muted">{locale === 'zh' ? '对应高频问题' : locale === 'ja' ? 'よくある検索に対応' : 'Matching common questions'}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/${gameId}/guides/${guide.id}` as '/'}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {guide.title}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-game-text">{locale === 'zh' ? '相关入口' : locale === 'ja' ? '関連ページ' : 'Related Pages'}</h2>
          <span className="text-xs text-game-text-muted">{locale === 'zh' ? '站点跳转' : locale === 'ja' ? 'サイト内導線' : 'Internal navigation'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {enabledRoutes.map((route) => (
            <Link
              key={route}
              href={`/${gameId}/${route}` as '/'}
              className="rounded-full bg-game-surface px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:bg-game-primary/10 hover:text-game-primary"
            >
              {CATEGORY_LABELS[route as string]?.[locale] ?? route}
            </Link>
          ))}
        </div>
      </section>

      {hub.faq.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-game-text">{locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}</h2>
            <span className="text-xs text-game-text-muted">{locale === 'zh' ? '适合搜索引擎收录的补充问答' : locale === 'ja' ? '検索エンジン向けの補足Q&A' : 'Search-friendly supporting Q&A'}</span>
          </div>
          <div className="space-y-3">
            {hub.faq.map((item, index) => (
              <details key={index} className="group rounded-xl border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-semibold text-game-text transition-colors group-hover:text-game-primary">
                  {item.question[locale]}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {item.answer[locale]}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepStrip locale={locale} links={getVersionNextSteps(gameId)} />
    </div>
  );
}

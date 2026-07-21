import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import { genshinGuides, getGuideTitle as getGenshinGuideTitle, getGuideSummary as getGenshinGuideSummary } from '@gachia/data/games/genshin/guides';
import { starrailGuides, getGuideTitle as getStarRailGuideTitle, getGuideSummary as getStarRailGuideSummary } from '@gachia/data/games/starrail/guides';
import { wuwaGuides, getGuideTitle as getWuWaGuideTitle, getGuideSummary as getWuWaGuideSummary } from '@gachia/data/games/wuwa/guides';
import { guides as nteGuides, getGuideTitle as getNteGuideTitle, getGuideSummary as getNteGuideSummary } from '@gachia/data/games/nte/guides';
import { zzzGuides, getZzzGuideTitle, getZzzGuideSummary } from '@gachia/data/games/zzz/guides';
import { guihuanGuides, getGuihuanGuideTitle, getGuihuanGuideSummary } from '@gachia/data/games/guihuan/guides';
import { anantaGuides, getAnantaGuideTitle, getAnantaGuideSummary } from '@gachia/data/games/ananta/guides';
import { endfieldGuides, getEndfieldGuideTitle, getEndfieldGuideSummary } from '@gachia/data/games/endfield/guides';
import { seaGuides, getSeaGuideTitle, getSeaGuideSummary } from '@gachia/data/games/sea/guides';
import { skjhGuides, getSkjhGuideTitle, getSkjhGuideSummary } from '@gachia/data/games/skjh/guides';

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
  genshin: [
    { href: '/genshin/version', label: { zh: '官网 / 版本入口', en: 'Official / Version hub', ja: '公式 / バージョン' }, description: { zh: '承接官网、版本、活动和卡池查询。', en: 'Capture official, version, event, and banner queries.', ja: '公式、版本、イベント、バナー検索を承接します。' } },
    { href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '直播码、版本码和过期状态集中查看。', en: 'Check livestream, version, and expired code status.', ja: '配信コード、版本コード、期限切れを確認。' } },
    { href: '/genshin/guides/banner-schedule-guide', label: { zh: '卡池规划', en: 'Banner planning', ja: 'バナー計画' }, description: { zh: '把抽卡、原石和保底放到同一条路线里。', en: 'Plan pulls, Primogems, and pity in one path.', ja: 'ガチャ、原石、天井を一緒に計画。' } },
  ],
  starrail: [
    { href: '/starrail/version', label: { zh: '官网 / 版本入口', en: 'Official / Version hub', ja: '公式 / バージョン' }, description: { zh: '承接 4.4、联动、角色和活动时间。', en: 'Capture v4.4, collab, character, and event timing.', ja: 'v4.4、コラボ、キャラ、イベントを承接。' } },
    { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '直播兑换码和版本补偿码入口。', en: 'Livestream and version compensation code entry.', ja: '配信コードと補償コード入口。' } },
    { href: '/starrail/guides/v4-4-preview-guide', label: { zh: '抽卡规划', en: 'Pull planning', ja: 'ガチャ計画' }, description: { zh: 'Himeko Nova、Fate 联动和星琼缺口。', en: 'Himeko Nova, Fate collab, and Stellar Jade gaps.', ja: 'Himeko Nova、Fate、星玉不足を確認。' } },
  ],
  wuwa: [
    { href: '/wuwa/version', label: { zh: '官网 / 版本入口', en: 'Official / Version hub', ja: '公式 / バージョン' }, description: { zh: '承接 3.5、Xbox/Game Pass 和 SP 机制。', en: 'Capture v3.5, Xbox/Game Pass, and SP mechanics.', ja: 'v3.5、Xbox/Game Pass、SP機構を承接。' } },
    { href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '版本码、活动码和过期状态。', en: 'Version codes, event codes, and expiry status.', ja: '版本コード、イベントコード、期限確認。' } },
    { href: '/wuwa/guides/v3-5-preview-guide', label: { zh: 'Xbox 入坑', en: 'Xbox starter', ja: 'Xbox入門' }, description: { zh: '平台登录、手柄、首周资源和活动路线。', en: 'Platform login, controller, first-week resources, and events.', ja: 'ログイン、コントローラー、初週資源、イベント。' } },
  ],
  nte: [
    { href: '/nte/guides/download-install-guide', label: { zh: '官网 / 下载', en: 'Official / Download', ja: '公式 / DL' }, description: { zh: '承接官网、下载、安装和设备问题。', en: 'Capture official, download, install, and device queries.', ja: '公式、DL、インストール、端末検索を承接。' } },
    { href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '1.2 版本码和活动奖励入口。', en: 'v1.2 codes and event reward entry.', ja: 'v1.2コードとイベント報酬入口。' } },
    { href: '/nte/version', label: { zh: 'Shinku / Iroi', en: 'Shinku / Iroi', ja: 'Shinku / Iroi' }, description: { zh: '角色抽取、版本活动和抽卡机制。', en: 'Character pulls, version events, and gacha mechanics.', ja: 'キャラガチャ、版本イベント、ガチャ機構。' } },
  ],
  zzz: [
    { href: '/zzz/guides/steam-3-0-start-guide', label: { zh: 'Steam 入坑', en: 'Steam starter', ja: 'Steam入門' }, description: { zh: '下载、账号绑定、存档互通和新区路线。', en: 'Download, account linking, cross-save, and new-area route.', ja: 'DL、アカウント連携、クロスセーブ、新エリア。' } },
    { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '版本码、直播码和回流奖励。', en: 'Version codes, livestream codes, and returnee rewards.', ja: '版本コード、配信コード、復帰報酬。' } },
    { href: '/zzz/drive-discs', label: { zh: '驱动盘', en: 'Drive discs', ja: 'ディスク' }, description: { zh: '把 3.0 角色直接接到配装页。', en: 'Route v3.0 agents directly into build pages.', ja: 'v3.0エージェントをビルドへ接続。' } },
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
    { href: '/endfield/guides/download-install-guide', label: { zh: '官网 / 下载', en: 'Official / Download', ja: '公式 / DL' }, description: { zh: '下载、配置、平台和测试状态入口。', en: 'Download, specs, platform, and test-status entry.', ja: 'DL、環境、プラットフォーム、テスト状態。' } },
    { href: '/endfield/guides/homecoming-update-guide', label: { zh: 'Homecoming', en: 'Homecoming', ja: 'Homecoming' }, description: { zh: '新地图、AIC 工厂和新干员。', en: 'New maps, AIC factory, and operators.', ja: '新マップ、AIC工場、新オペレーター。' } },
    { href: '/endfield/guides/combat-system-guide', label: { zh: '玩法 / 配置', en: 'Gameplay / Specs', ja: '玩法 / 環境' }, description: { zh: '承接 wiki、角色、配置和玩法问题。', en: 'Capture wiki, character, specs, and gameplay questions.', ja: 'Wiki、キャラ、環境、玩法検索を承接。' } },
  ],
  sea: [
    { href: '/sea/guides/official-2026-test-timeline-guide', label: { zh: '官网 / 测试', en: 'Official / Tests', ja: '公式 / テスト' }, description: { zh: '官网、Wanderer Test、预约和发行状态。', en: 'Official site, Wanderer Test, preregistration, and release status.', ja: '公式、Wanderer Test、事前登録、リリース状態。' } },
    { href: '/sea/guides/download-install-guide', label: { zh: '下载 / 配置', en: 'Download / Specs', ja: 'DL / 環境' }, description: { zh: '下载入口、PC 配置和平台节奏。', en: 'Download entry, PC specs, and platform timing.', ja: 'DL入口、PC環境、プラットフォーム時期。' } },
    { href: '/sea/guides/trade-market-guide', label: { zh: '贸易场', en: 'Trade market', ja: '交易場' }, description: { zh: '好金砖、交易和零氪首周路线。', en: 'Good Gold Bricks, trading, and F2P week-one route.', ja: '好金砖、交易、無課金初週ルート。' } },
  ],
  skjh: [
    { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 / PC 下载', en: 'Official / PC Download', ja: '公式 / PC DL' }, description: { zh: 'PC、移动端、多端互通和安装问题。', en: 'PC, mobile, cross-play, and install questions.', ja: 'PC、モバイル、多端連携、インストール。' } },
    { href: '/skjh/guides/first-2-hours-starter-route', label: { zh: '新手 0-2 小时', en: 'First 0-2 hours', ja: '最初の0-2時間' }, description: { zh: '开荒、服务器模式和基地第一步。', en: 'Launch route, server mode, and first base step.', ja: '開荒、サーバーモード、最初の拠点。' } },
    { href: '/skjh/guides/server-mode-choice', label: { zh: '服务器模式', en: 'Server modes', ja: 'サーバーモード' }, description: { zh: '安全区、标准、挑战和速战选择。', en: 'Safe-zone, standard, challenge, and quick-fight choice.', ja: '安全区、標準、挑戦、速戦の選択。' } },
  ],
};

const VERSION_COPY: Record<GameId, HubCopy> = {
  genshin: {
    title: { zh: 'Luna VIII / Sandrone 专题', en: 'Luna VIII / Sandrone Hub', ja: 'Luna VIII / Sandrone 特集' },
    description: {
      zh: '围绕 Luna VIII、Sandrone、Sunny Summer Fontinalia、卡池规划、兑换码和活动日历定位版本重点。',
      en: 'Track Luna VIII, Sandrone, Sunny Summer Fontinalia, banner planning, codes, and the event calendar.',
      ja: 'Luna VIII、Sandrone、Sunny Summer Fontinalia、バナー計画、コード、イベント日程をまとめます。',
    },
    highlights: {
      zh: ['Luna VIII', 'Sandrone', '活动日历', '兑换码'],
      en: ['Luna VIII', 'Sandrone', 'Event calendar', 'Redeem codes'],
      ja: ['Luna VIII', 'Sandrone', 'イベント日程', '交換コード'],
    },
    kicker: { zh: '抢版本词', en: 'Version rush', ja: 'バージョン対策' },
    freshness: {
      zh: '持续整理版本前瞻、实装信息、抽卡规划和高频搜索词。',
      en: 'Kept current with previews, release notes, banner planning, and search-led topics.',
      ja: '前瞻、実装情報、バナー計画、検索頻出トピックを継続整理しています。',
    },
    faq: [
      {
        question: {
          zh: '这个版本专题主要看什么？',
          en: 'What is this version hub for?',
          ja: 'このバージョン特集では何を見ればいいですか？',
        },
        answer: {
          zh: '这里优先收录 Luna VIII、Sandrone、活动奖励、兑换码、卡池阶段和原石规划。',
          en: 'It highlights Luna VIII, Sandrone, event rewards, redeem codes, banner phases, and Primogem planning.',
          ja: 'Luna VIII、Sandrone、イベント報酬、交換コード、バナー段階、原石計画を優先整理します。',
        },
      },
      {
        question: {
          zh: '想看完整攻略该去哪里？',
          en: 'Where should I go for full guides?',
          ja: '詳しい攻略はどこで見られますか？',
        },
        answer: {
          zh: '可以直接打开下方的热门攻略，也可以继续进入角色、武器、圣遗物、配队和材料页。',
          en: 'Open the featured guides below, then continue into characters, weapons, artifacts, team comps, and materials.',
          ja: '下の注目ガイドから入り、キャラ・武器・聖遺物・編成・素材ページへ進むのがおすすめです。',
        },
      },
    ],
    guideIds: ['phase-ii-columbina-raiden-pull-plan', 'luna-viii-sandrone-guide', 'banner-schedule-guide'],
  },
  starrail: {
    title: { zh: '4.4 Himeko Nova / Fate 专题', en: 'v4.4 Himeko Nova / Fate Hub', ja: 'v4.4 Himeko Nova / Fate 特集' },
    description: {
      zh: '聚焦 4.4 已上线、Himeko Nova、Fate/stay night 联动、Rin/Gilgamesh、兑换码、星琼缺口与卡池规划。',
      en: 'Track the live v4.4 update, Himeko Nova, Fate/stay night collab, Rin/Gilgamesh, redeem codes, Jade gaps, and banner planning.',
      ja: 'v4.4実装、Himeko Nova、Fate/stay nightコラボ、Rin/Gilgamesh、交換コード、星玉不足、バナー計画を整理します。',
    },
    highlights: {
      zh: ['4.4 已上线', 'Himeko Nova', 'Fate 联动', 'Rin/Gilgamesh'],
      en: ['v4.4 live', 'Himeko Nova', 'Fate collab', 'Rin/Gilgamesh'],
      ja: ['v4.4実装', 'Himeko Nova', 'Fateコラボ', 'Rin/Gilgamesh'],
    },
    kicker: { zh: '联动卡池', en: 'Collab banner', ja: 'コラボバナー' },
    freshness: {
      zh: '已切换为上线后口径，优先承接 Himeko Nova、Fate 联动奖励、兑换码和抽卡规划。',
      en: 'Now framed as live coverage for Himeko Nova, Fate rewards, codes, and pull planning.',
      ja: '実装後の情報として、Himeko Nova、Fate報酬、コード、ガチャ計画を優先整理します。',
    },
    faq: [
      {
        question: {
          zh: '4.4 版本上线后先看什么？',
          en: 'What should I read first now that v4.4 is live?',
          ja: 'v4.4実装後、最初に何を見るべきですか？',
        },
        answer: {
          zh: '先看 4.4 专题确认 Himeko Nova 和 Fate 联动节点，再检查 Rin/Gilgamesh、兑换码与星琼缺口。',
          en: 'Start with the v4.4 hub for Himeko Nova and Fate timing, then check Rin/Gilgamesh, codes, and Jade gaps.',
          ja: 'まずv4.4特集でHimeko NovaとFateの時期を確認し、Rin/Gilgamesh、コード、星玉不足を見てください。',
        },
      },
      {
        question: {
          zh: '资源不够时怎么规划联动？',
          en: 'How should I plan the collab with limited resources?',
          ja: '資源が少ない場合、コラボをどう計画しますか？',
        },
        answer: {
          zh: '先定 Himeko Nova、Fate 联动角色和复刻目标的优先级，再用卡池规划页估算保底差距。',
          en: 'Rank Himeko Nova, collab targets, and reruns first, then use pull-planning pages to estimate pity gaps.',
          ja: 'Himeko Nova、コラボ目標、復刻の優先度を決めてから、ガチャ計画で天井差を見積もりましょう。',
        },
      },
    ],
    guideIds: ['himeko-nova-fate-pull-plan', 'v4-4-preview-guide', 'fate-collab-guide'],
  },
  wuwa: {
    title: { zh: '3.5 版本与入坑专题', en: 'v3.5 Version & Start Hub', ja: 'v3.5 バージョン・入門特集' },
    description: {
      zh: '围绕 7 月 10 日 3.5 上线、Yangyang: Xuanling、Suisui、Xbox/Game Pass 与 SP 机制入坑。',
      en: 'A practical hub for the July 10 v3.5 launch, Yangyang: Xuanling, Suisui, Xbox/Game Pass, and SP mechanics.',
      ja: '7月10日のv3.5、Yangyang: Xuanling、Suisui、Xbox/Game Pass、SP機構をまとめます。',
    },
    highlights: {
      zh: ['3.5 上线', 'Yangyang: Xuanling', 'Suisui', 'Xbox/Game Pass'],
      en: ['v3.5 launch', 'Yangyang: Xuanling', 'Suisui', 'Xbox/Game Pass'],
      ja: ['v3.5開始', 'Yangyang: Xuanling', 'Suisui', 'Xbox/Game Pass'],
    },
    kicker: { zh: '承接更新', en: 'Update anchor', ja: '更新軸' },
    freshness: {
      zh: '3.5 角色、SP 机制、Xbox/Game Pass 新玩家入口和声骸路线会持续同步。',
      en: 'v3.5 characters, SP mechanics, Xbox/Game Pass onboarding, and Echo routes stay in sync here.',
      ja: 'v3.5キャラ、SP機構、Xbox/Game Pass入門、エコー導線を継続同期します。',
    },
    faq: [
      {
        question: {
          zh: '新版本上线后先看什么？',
          en: 'What should I check after a new version drops?',
          ja: '新バージョン後にまず何を見ればいいですか？',
        },
        answer: {
          zh: '先看 3.5 专题确认 Yangyang: Xuanling、Suisui 和活动，再根据平台进入 Xbox/Game Pass 入坑路线。',
          en: 'Check the v3.5 guide for Yangyang: Xuanling, Suisui, and events, then use the Xbox/Game Pass starter path if needed.',
          ja: 'まずv3.5特集でYangyang: Xuanling、Suisui、イベントを確認し、必要ならXbox/Game Pass入門へ進んでください。',
        },
      },
      {
        question: {
          zh: '我只想快速入坑，哪一块最有用？',
          en: 'If I just want to start fast, what helps most?',
          ja: 'すぐ始めたい場合、どこが一番役立ちますか？',
        },
        answer: {
          zh: '直接从新手入坑、战斗系统和声骸体系三个入口开始就够了。',
          en: 'Start with the beginner guide, combat system, and echo system sections.',
          ja: '初心者ガイド、戦闘システム、エコーシステムの3つから始めるのが最短です。',
        },
      },
    ],
    guideIds: ['yangyang-suisui-sp-pull-plan', 'steam-xbox-game-pass-starter', 'v3-5-preview-guide'],
  },
  nte: {
    title: { zh: '1.2「999 Nights」Shinku / Iroi 专题', en: 'v1.2 999 Nights Shinku / Iroi Hub', ja: 'v1.2 999 Nights Shinku / Iroi 特集' },
    description: {
      zh: '围绕 1.2「999 Nights」已上线、Shinku 当前期、Iroi 后续期、兑换码、Steam/download 与抽卡机制承接当前搜索。',
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
    title: { zh: '3.1「The Long Goodbye」/ 2 周年专题', en: 'v3.1 The Long Goodbye / 2nd Anniversary Hub', ja: 'v3.1 The Long Goodbye / 2周年特集' },
    description: {
      zh: '聚焦 3.1「The Long Goodbye」7 月 29 日上线、2 周年、Remielle/Sigrid、Microsoft Store、Xbox Play Anywhere、Steam 入坑和兑换码。',
      en: 'Focus on v3.1 The Long Goodbye launching July 29, the 2nd anniversary, Remielle/Sigrid, Microsoft Store, Xbox Play Anywhere, Steam starters, and codes.',
      ja: '7月29日実装のv3.1「The Long Goodbye」、2周年、Remielle/Sigrid、Microsoft Store、Xbox Play Anywhere、Steam入門、コードを整理します。',
    },
    highlights: {
      zh: ['3.1 7/29', '2 周年', 'Remielle/Sigrid', 'Xbox/Microsoft Store'],
      en: ['v3.1 July 29', '2nd anniversary', 'Remielle/Sigrid', 'Xbox/Microsoft Store'],
      ja: ['v3.1 7/29', '2周年', 'Remielle/Sigrid', 'Xbox/Microsoft Store'],
    },
    kicker: { zh: '周年热词', en: 'Anniversary intent', ja: '周年検索' },
    freshness: {
      zh: '从 Steam/3.0 入坑扩展到 3.1、周年福利、Xbox/Microsoft Store 与新代理人搜索。',
      en: 'Expanded from Steam/v3.0 onboarding into v3.1, anniversary rewards, Xbox/Microsoft Store, and new-agent searches.',
      ja: 'Steam/v3.0入門からv3.1、周年報酬、Xbox/Microsoft Store、新エージェント検索へ拡張しています。',
    },
    faq: [
      {
        question: {
          zh: '3.1 和 2 周年先看什么？',
          en: 'What should I read first for v3.1 and the anniversary?',
          ja: 'v3.1と2周年で最初に見るべきものは？',
        },
        answer: {
          zh: '先看 3.1 版本专题确认 7 月 29 日节点、Remielle/Sigrid 和周年福利，再检查兑换码和平台入坑。',
          en: 'Start with the v3.1 hub for the July 29 timing, Remielle/Sigrid, and anniversary rewards, then check codes and platform starters.',
          ja: 'まずv3.1特集で7月29日、Remielle/Sigrid、周年報酬を確認し、コードとプラットフォーム入門へ進みましょう。',
        },
      },
      {
        question: {
          zh: 'Steam、Microsoft Store、Xbox 玩家怎么入坑？',
          en: 'How should Steam, Microsoft Store, and Xbox players start?',
          ja: 'Steam、Microsoft Store、Xbox勢はどう始める？',
        },
        answer: {
          zh: '先走 Steam/平台入坑 FAQ，确认账号绑定、存档互通和下载入口，再回到版本页安排抽卡与配队。',
          en: 'Use the platform starter FAQ for account linking, cross-save, and downloads, then return for pulls and teams.',
          ja: 'プラットフォームFAQでアカウント連携、クロスセーブ、DLを確認してから、ガチャと編成を決めましょう。',
        },
      },
    ],
    guideIds: ['anniversary-rewards-codes-plan', 'v3-1-anniversary-xbox-guide', 'meta-teams-v3-guide'],
  },
  guihuan: {
    title: { zh: '测试 / 公测时间线专题', en: 'Test & Release Timeline Hub', ja: 'テスト・リリース時期特集' },
    description: {
      zh: '围绕归环官网、下载、公测时间、测试资格、42 天循环、使灵系统和玩法定位承接搜索。',
      en: 'A hub for official site, download status, release timing, test access, the 42-day loop, Spirit system, and gameplay positioning.',
      ja: '公式サイト、DL、リリース時期、テスト資格、42日ループ、使霊、玩法定位をまとめます。',
    },
    highlights: {
      zh: ['测试资格', '公测时间', '42 天循环', '使灵系统'],
      en: ['Test access', 'Release timing', '42-day loop', 'Spirit system'],
      ja: ['テスト資格', 'リリース時期', '42日ループ', '使霊'],
    },
    kicker: { zh: '测试承接', en: 'Test anchor', ja: 'テスト軸' },
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
    guideIds: ['official-release-company-faq', 'test-release-timeline-guide', 'time-loop-mechanic'],
  },
  ananta: {
    title: { zh: '预注册 / 无抽卡 FAQ', en: 'Preregistration / No-Gacha FAQ', ja: '事前登録 / ガチャなしFAQ' },
    description: {
      zh: '围绕官网、预注册、无抽卡、测试资格、公测时间、网易/塔菲和都市开放世界玩法承接搜索。',
      en: 'A hub for official site, preregistration, no-gacha model, test access, release timing, NetEase/Taffy, and urban open-world gameplay.',
      ja: '公式サイト、事前登録、ガチャなし、テスト資格、リリース時期、NetEase/Taffy、都市OWを整理します。',
    },
    highlights: {
      zh: ['预注册', '无抽卡', '测试资格', '公测时间'],
      en: ['Preregistration', 'No gacha', 'Test access', 'Release timing'],
      ja: ['事前登録', 'ガチャなし', 'テスト資格', 'リリース時期'],
    },
    kicker: { zh: '预约导流', en: 'Pre-reg funnel', ja: '事前登録導線' },
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
    guideIds: ['release-date-beta-pc-faq', 'preregistration-no-gacha-guide', 'download-install-guide'],
  },
  endfield: {
    title: { zh: 'Homecoming / AIC 蓝图工厂专题', en: 'Homecoming / AIC Blueprint Factory Hub', ja: 'Homecoming / AICブループリント工場特集' },
    description: {
      zh: '围绕 Homecoming 已上线、半周年更新、新地图、Arcane/Liino、蓝图、AIC 工厂 QoL、庆典奖励与回流入坑承接。',
      en: 'Cover the live Homecoming half-year update, new maps, Arcane/Liino, blueprints, AIC factory QoL, celebration rewards, and returner onboarding.',
      ja: 'Homecoming半周年実装、新マップ、Arcane/Liino、ブループリント、AIC工場QoL、報酬、復帰導線を整理します。',
    },
    highlights: {
      zh: ['Homecoming 已上线', '蓝图/AIC', '新地图', 'Arcane/Liino'],
      en: ['Homecoming live', 'Blueprint/AIC', 'New maps', 'Arcane/Liino'],
      ja: ['Homecoming実装', 'Blueprint/AIC', '新マップ', 'Arcane/Liino'],
    },
    kicker: { zh: '工厂热词', en: 'Factory intent', ja: '工場検索' },
    freshness: {
      zh: 'Homecoming、新地图、新干员、蓝图、AIC 工厂流程和庆典奖励会持续补充。',
      en: 'Homecoming, new maps, operators, blueprints, AIC factory flows, and celebration rewards stay current here.',
      ja: 'Homecoming、新マップ、新オペレーター、ブループリント、AIC工場、報酬を継続更新します。',
    },
    faq: [
      {
        question: {
          zh: 'Homecoming 上线后最该补哪一块？',
          en: 'What should I catch up on first after Homecoming?',
          ja: 'Homecoming実装後、まず何を確認すべき？',
        },
        answer: {
          zh: '优先看 Homecoming 专题确认新地图、Arcane/Liino、奖励，再把蓝图和 AIC 工厂流程补上。',
          en: 'Start with Homecoming for maps, Arcane/Liino, and rewards, then catch up on blueprints and AIC factory flows.',
          ja: 'まずHomecoming特集でマップ、Arcane/Liino、報酬を確認し、次にブループリントとAIC工場を補いましょう。',
        },
      },
      {
        question: {
          zh: '为什么要单独看蓝图 / AIC？',
          en: 'Why read blueprint / AIC content separately?',
          ja: 'なぜブループリント / AICを別に見るべき？',
        },
        answer: {
          zh: '因为 Homecoming 后搜索热度集中在工厂效率、蓝图复用和 QoL，直接影响回流玩家的建设节奏。',
          en: 'Because post-Homecoming demand centers on factory efficiency, blueprint reuse, and QoL, which shape returner progression.',
          ja: 'Homecoming後は工場効率、ブループリント再利用、QoL需要が強く、復帰勢の進行に直結します。',
        },
      },
    ],
    guideIds: ['homecoming-operators-map-route', 'homecoming-update-guide', 'blueprint-aic-factory-guide'],
  },
  sea: {
    title: { zh: '官网 / 测试 / 开服专题', en: 'Official / Test / Launch Hub', ja: '公式・テスト・ローンチ特集' },
    description: {
      zh: '聚焦官网入口、2026 测试/预约动态、版本中心、下载安装、开服攻略、交易系统与资源决策。',
      en: 'Focus on official entry, 2026 test/preregistration signals, version center, download/install, launch guide, trade system, and resource decisions.',
      ja: '公式導線、2026テスト/事前登録、バージョン特集、DL、開服攻略、交易、資源判断を整理します。',
    },
    highlights: {
      zh: ['官网入口', '测试时间线', '开服攻略', '贸易场'],
      en: ['Official entry', 'Test timeline', 'Launch guide', 'Trade market'],
      ja: ['公式導線', 'テスト時期', '開服攻略', '交易場'],
    },
    kicker: { zh: '开服抢词', en: 'Launch capture', ja: '開服対策' },
    freshness: {
      zh: '围绕公测、版本中心、开服玩法和养成路线持续整理。',
      en: 'Open beta, version center, launch-play, and build-route topics are refreshed here.',
      ja: 'CBT、バージョン特集、開服コンテンツ、育成導線を継続整理しています。',
    },
    faq: [
      {
        question: {
          zh: '海之遗留现在最常搜的是什么？',
          en: 'What are people searching for most about Sea right now?',
          ja: 'Sea関連で今よく検索されるものは？',
        },
        answer: {
          zh: '公测时间、版本中心、下载安装、角色图鉴、队伍思路和首月开服玩法最常被搜索。',
          en: 'The open beta date, version center, download/install, character wiki, team building, and launch basics are the biggest search topics.',
          ja: 'CBT日程、バージョン特集、DL、キャラ図鑑、編成案、初月の遊び方が主な検索テーマです。',
        },
      },
      {
        question: {
          zh: '想看联动和入坑路线去哪里？',
          en: 'Where do I find collabs and starter routes?',
          ja: 'コラボと入門ルートはどこで見られますか？',
        },
        answer: {
          zh: '先看公测版本中心，再打开开服攻略、下载安装和队伍思路。',
          en: 'Start with the open beta hub, then open the launch guide, download/install, and team-building pages.',
          ja: 'まずCBT特集、次に開服攻略、DL、編成案を見てください。',
        },
      },
    ],
    guideIds: ['steam-release-gacha-solo-faq', 'official-2026-test-timeline-guide', 'platform-download-guide', 'payment-model-guide'],
  },
  skjh: {
    title: { zh: 'S1 登岛 / 服务器模式 / 防抄家专题', en: 'S1 Island Start / Server Modes / Anti-Raid Hub', ja: 'S1上陸 / サーバーモード / 防衛特集' },
    description: {
      zh: '从上线前口径切换到上线后 S1：下载电脑版、官网 PC、服务器模式、开荒路线、安全区、标准/挑战服、基地选址与防抄家。',
      en: 'Shifted from prelaunch to live S1 coverage: PC download, official PC entry, server modes, beginner routes, safe-zone, standard/challenge servers, base sites, and anti-raid basics.',
      ja: '事前情報からS1実装後へ切り替え、PC版DL、公式PC入口、サーバーモード、開荒、安全区、標準/挑戦、拠点選び、防衛を整理します。',
    },
    highlights: {
      zh: ['S1 赛季', '服务器模式', 'PC 下载', '防抄家'],
      en: ['S1 season', 'Server modes', 'PC download', 'Anti-raid'],
      ja: ['S1シーズン', 'サーバーモード', 'PC DL', '防衛'],
    },
    kicker: { zh: '上线后开荒', en: 'Live survival', ja: '実装後開荒' },
    freshness: {
      zh: '上线后重点已转向模式选择、0-2 小时开荒、基地选址、防抄家、配置与下载问题。',
      en: 'Live demand now centers on mode choice, first 0-2 hours, base location, anti-raid, specs, and downloads.',
      ja: '実装後はモード選択、0-2時間開荒、拠点、防衛、環境、DLが中心です。',
    },
    faq: [
      {
        question: {
          zh: '失控进化上线后先做什么？',
          en: 'What should I do first now that Ashfall Evolution is live?',
          ja: '失控進化実装後、最初に何をする？',
        },
        answer: {
          zh: '先确认下载入口和服务器模式，再按 0-2 小时开荒路线做工具、放领地柜、选低风险资源线。',
          en: 'Confirm download entry and server mode first, then follow the 0-2 hour route: tools, territory cabinet, and low-risk loot lines.',
          ja: 'まずDL入口とサーバーモードを確認し、0-2時間ルートで道具、領地柜、低リスク資源線を進めます。',
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
  }
};

const VERSION_FOCUS_LANES: Partial<Record<GameId, Record<SupportedLocale, FocusLane[]>>> = {
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
        description: { zh: '把驱动盘、音擎和养成优先级接到实际配装页。', en: 'Route drive discs, W-Engines, and upgrade priorities into builds.', ja: 'ディスク、Wエンジン、育成優先度へつなげます。' },
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
        description: { zh: '把驱动盘、音擎和养成优先级接到实际配装页。', en: 'Route drive discs, W-Engines, and upgrade priorities into builds.', ja: 'ディスク、Wエンジン、育成優先度へつなげます。' },
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
        description: { zh: '把驱动盘、音擎和养成优先级接到实际配装页。', en: 'Route drive discs, W-Engines, and upgrade priorities into builds.', ja: 'ディスク、Wエンジン、育成優先度へつなげます。' },
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
        description: { zh: '把声骸、武器和词条优先级连接到具体培养页。', en: 'Connect echoes, weapons, and stat priorities to practical builds.', ja: '声骸、武器、ステ優先度を実用ページへつなげます。' },
        links: [
          { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/wuwa/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合承接更细的玩法与数值问题。', en: 'Map, compare, and calculator pages catch the finer gameplay and stat queries.', ja: 'マップ、比較、計算機で細かい数値や遊び方を受け止めます。' },
        links: [
          { href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/wuwa/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本前瞻、Roya Frostlands 和声骸系统继续往下接。', en: 'Keep previews, Roya Frostlands, and the Echo system moving deeper.', ja: '前瞻、Roya Frostlands、声骸システムへ進めます。' },
        links: [
          { href: '/wuwa/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/wuwa/guides/roya-frostlands-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
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
        description: { zh: '把声骸、武器和词条优先级连接到具体培养页。', en: 'Connect echoes, weapons, and stat priorities to practical builds.', ja: '声骸、武器、ステ優先度を実用ページへつなげます。' },
        links: [
          { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/wuwa/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合承接更细的玩法与数值问题。', en: 'Map, compare, and calculator pages catch the finer gameplay and stat queries.', ja: 'マップ、比較、計算機で細かい数値や遊び方を受け止めます。' },
        links: [
          { href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/wuwa/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本前瞻、Roya Frostlands 和声骸系统继续往下接。', en: 'Keep previews, Roya Frostlands, and the Echo system moving deeper.', ja: '前瞻、Roya Frostlands、声骸システムへ進めます。' },
        links: [
          { href: '/wuwa/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/wuwa/guides/roya-frostlands-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
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
        description: { zh: '把声骸、武器和词条优先级连接到具体培养页。', en: 'Connect echoes, weapons, and stat priorities to practical builds.', ja: '声骸、武器、ステ優先度を実用ページへつなげます。' },
        links: [
          { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/wuwa/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图、对比和计算器适合承接更细的玩法与数值问题。', en: 'Map, compare, and calculator pages catch the finer gameplay and stat queries.', ja: 'マップ、比較、計算機で細かい数値や遊び方を受け止めます。' },
        links: [
          { href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/wuwa/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本前瞻、Roya Frostlands 和声骸系统继续往下接。', en: 'Keep previews, Roya Frostlands, and the Echo system moving deeper.', ja: '前瞻、Roya Frostlands、声骸システムへ進めます。' },
        links: [
          { href: '/wuwa/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/wuwa/guides/roya-frostlands-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
  },
  endfield: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '把干员定位、主力构筑和队伍分工接到角色页。', en: 'Route operator roles, main carries, and team duties into character pages.', ja: 'オペレーターの役割、主力、分担をキャラページへ。' },
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
        description: { zh: '地图、对比和计算器承接更细的测试与养成需求。', en: 'Map, compare, and calculator pages catch test and progression needs.', ja: 'マップ、比較、計算機でテストや育成の需要を拾います。' },
        links: [
          { href: '/endfield/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/endfield/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '测试节点、基地建设和危机合约继续往下接。', en: 'Keep test timing, base building, and crisis contract content moving deeper.', ja: 'テスト時期、基地建設、危機契約へ進めます。' },
        links: [
          { href: '/endfield/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/endfield/guides/crisis-contract-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '把干员定位、主力构筑和队伍分工接到角色页。', en: 'Route operator roles, main carries, and team duties into character pages.', ja: 'オペレーターの役割、主力、分担をキャラページへ。' },
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
        description: { zh: '地图、对比和计算器承接更细的测试与养成需求。', en: 'Map, compare, and calculator pages catch test and progression needs.', ja: 'マップ、比較、計算機でテストや育成の需要を拾います。' },
        links: [
          { href: '/endfield/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/endfield/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '测试节点、基地建设和危机合约继续往下接。', en: 'Keep test timing, base building, and crisis contract content moving deeper.', ja: 'テスト時期、基地建設、危機契約へ進めます。' },
        links: [
          { href: '/endfield/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/endfield/guides/crisis-contract-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '把干员定位、主力构筑和队伍分工接到角色页。', en: 'Route operator roles, main carries, and team duties into character pages.', ja: 'オペレーターの役割、主力、分担をキャラページへ。' },
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
        description: { zh: '地图、对比和计算器承接更细的测试与养成需求。', en: 'Map, compare, and calculator pages catch test and progression needs.', ja: 'マップ、比較、計算機でテストや育成の需要を拾います。' },
        links: [
          { href: '/endfield/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/endfield/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '测试节点、基地建设和危机合约继续往下接。', en: 'Keep test timing, base building, and crisis contract content moving deeper.', ja: 'テスト時期、基地建設、危機契約へ進めます。' },
        links: [
          { href: '/endfield/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/endfield/guides/crisis-contract-guide', label: { zh: '机制攻略', en: 'Mechanics guide', ja: '機構攻略' } },
        ],
      },
    ],
  },
  sea: {
    zh: [
      {
        title: { zh: '公测节点', en: 'Open Beta', ja: 'CBT' },
        description: { zh: '先把 7 月 9 日公测和首月节奏接住。', en: 'Catch the July 9 beta timing and month-one momentum first.', ja: '7月9日CBTと初月の流れを先に押さえます。' },
        links: [
          { href: '/sea/guides/open-beta-version-center', label: { zh: '公测版本中心', en: 'Open Beta Center', ja: 'CBT特集' } },
          { href: '/sea/guides/launch-day-guide', label: { zh: '开服攻略', en: 'Launch guide', ja: '開服攻略' } },
        ],
      },
      {
        title: { zh: '安装与入门', en: 'Install & onboarding', ja: 'DL・入門' },
        description: { zh: '下载安装、平台支持和开服准备一并整理。', en: 'Group download/install, platform support, and launch prep together.', ja: 'DL、対応プラットフォーム、開服準備をまとめます。' },
        links: [
          { href: '/sea/guides/download-install-guide', label: { zh: '下载安装', en: 'Download/install', ja: 'DLとインストール' } },
          { href: '/sea/guides/platform-download-guide', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
        ],
      },
      {
        title: { zh: '养成与配队', en: 'Builds & teams', ja: '育成・編成' },
        description: { zh: '把角色、队伍和节奏榜做成下一跳。', en: 'Turn character, team, and tier questions into the next click.', ja: 'キャラ、編成、Tierの質問を次の導線に変えます。' },
        links: [
          { href: '/sea/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/sea/guides/tier-list-guide', label: { zh: '节奏榜', en: 'Tier list', ja: 'Tier' } },
          { href: '/sea/guides/team-building-guide', label: { zh: '队伍思路', en: 'Team building', ja: '編成案' } },
        ],
      },
      {
        title: { zh: '机制与抽卡', en: 'Combat & gacha', ja: '戦闘・ガチャ' },
        description: { zh: '战斗系统、抽卡和 BOSS 路线继续下沉。', en: 'Push combat system, gacha, and boss-route questions deeper.', ja: '戦闘、ガチャ、ボス導線へつなげます。' },
        links: [
          { href: '/sea/guides/combat-system-guide', label: { zh: '战斗系统', en: 'Combat system', ja: '戦闘システム' } },
          { href: '/sea/guides/gacha-recruitment-guide', label: { zh: '抽卡指南', en: 'Gacha guide', ja: 'ガチャ解説' } },
          { href: '/sea/guides/launch-boss-map-guide', label: { zh: 'BOSS 路线', en: 'Boss routes', ja: 'ボスルート' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: 'Open Beta', en: 'Open Beta', ja: 'CBT' },
        description: { zh: '先把 7 月 9 日公测和首月节奏接住。', en: 'Catch the July 9 beta timing and month-one momentum first.', ja: '7月9日CBTと初月の流れを先に押さえます。' },
        links: [
          { href: '/sea/guides/open-beta-version-center', label: { zh: '公测版本中心', en: 'Open Beta Center', ja: 'CBT特集' } },
          { href: '/sea/guides/launch-day-guide', label: { zh: '开服攻略', en: 'Launch guide', ja: '開服攻略' } },
        ],
      },
      {
        title: { zh: 'Install & onboarding', en: 'Install & onboarding', ja: 'DL・入門' },
        description: { zh: '下载安装、平台支持和开服准备一并整理。', en: 'Group download/install, platform support, and launch prep together.', ja: 'DL、対応プラットフォーム、開服準備をまとめます。' },
        links: [
          { href: '/sea/guides/download-install-guide', label: { zh: '下载安装', en: 'Download/install', ja: 'DLとインストール' } },
          { href: '/sea/guides/platform-download-guide', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
        ],
      },
      {
        title: { zh: 'Builds & teams', en: 'Builds & teams', ja: '育成・編成' },
        description: { zh: '把角色、队伍和节奏榜做成下一跳。', en: 'Turn character, team, and tier questions into the next click.', ja: 'キャラ、編成、Tierの質問を次の導線に変えます。' },
        links: [
          { href: '/sea/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/sea/guides/tier-list-guide', label: { zh: '节奏榜', en: 'Tier list', ja: 'Tier' } },
          { href: '/sea/guides/team-building-guide', label: { zh: '队伍思路', en: 'Team building', ja: '編成案' } },
        ],
      },
      {
        title: { zh: 'Combat & gacha', en: 'Combat & gacha', ja: '戦闘・ガチャ' },
        description: { zh: '战斗系统、抽卡和 BOSS 路线继续下沉。', en: 'Push combat system, gacha, and boss-route questions deeper.', ja: '戦闘、ガチャ、ボス導線へつなげます。' },
        links: [
          { href: '/sea/guides/combat-system-guide', label: { zh: '战斗系统', en: 'Combat system', ja: '戦闘システム' } },
          { href: '/sea/guides/gacha-recruitment-guide', label: { zh: '抽卡指南', en: 'Gacha guide', ja: 'ガチャ解説' } },
          { href: '/sea/guides/launch-boss-map-guide', label: { zh: 'BOSS 路线', en: 'Boss routes', ja: 'ボスルート' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: 'Open Beta', en: 'Open Beta', ja: 'CBT' },
        description: { zh: '先把 7 月 9 日公测和首月节奏接住。', en: 'Catch the July 9 beta timing and month-one momentum first.', ja: '7月9日CBTと初月の流れを先に押さえます。' },
        links: [
          { href: '/sea/guides/open-beta-version-center', label: { zh: '公测版本中心', en: 'Open Beta Center', ja: 'CBT特集' } },
          { href: '/sea/guides/launch-day-guide', label: { zh: '开服攻略', en: 'Launch guide', ja: '開服攻略' } },
        ],
      },
      {
        title: { zh: 'DL・入門', en: 'DL & onboarding', ja: 'DL・入門' },
        description: { zh: 'DLと対応プラットフォーム、開服準備をまとめます。', en: 'Group download/install, platform support, and launch prep together.', ja: 'DL、対応プラットフォーム、開服準備をまとめます。' },
        links: [
          { href: '/sea/guides/download-install-guide', label: { zh: '下载安装', en: 'Download/install', ja: 'DLとインストール' } },
          { href: '/sea/guides/platform-download-guide', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
        ],
      },
      {
        title: { zh: '育成・編成', en: 'Builds & teams', ja: '育成・編成' },
        description: { zh: '把角色、队伍和节奏榜做成下一跳。', en: 'Turn character, team, and tier questions into the next click.', ja: 'キャラ、編成、Tierの質問を次の導線に変えます。' },
        links: [
          { href: '/sea/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/sea/guides/tier-list-guide', label: { zh: '节奏榜', en: 'Tier list', ja: 'Tier' } },
          { href: '/sea/guides/team-building-guide', label: { zh: '队伍思路', en: 'Team building', ja: '編成案' } },
        ],
      },
      {
        title: { zh: '戦闘・ガチャ', en: 'Combat & gacha', ja: '戦闘・ガチャ' },
        description: { zh: '戦闘、ガチャ、ボス導線へつなげます。', en: 'Push combat system, gacha, and boss-route questions deeper.', ja: '戦闘、ガチャ、ボス導線へつなげます。' },
        links: [
          { href: '/sea/guides/combat-system-guide', label: { zh: '战斗系统', en: 'Combat system', ja: '戦闘システム' } },
          { href: '/sea/guides/gacha-recruitment-guide', label: { zh: '抽卡指南', en: 'Gacha guide', ja: 'ガチャ解説' } },
          { href: '/sea/guides/launch-boss-map-guide', label: { zh: 'BOSS 路线', en: 'Boss routes', ja: 'ボスルート' } },
        ],
      },
    ],
  },
  genshin: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把版本关键词和角色定位连起来，再看抽谁、养谁。', en: 'Connect version topics to character roles before deciding pulls or investments.', ja: 'バージョン語と役割をつないで、引くか育てるかを決めやすくします。' },
        links: [
          { href: '/genshin/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/genshin/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '圣遗物', en: 'Artifacts', ja: '聖遺物' },
        description: { zh: '把套装、词条和养成目标放到同一个页面里看。', en: 'Keep sets, stats, and progression goals on the same page.', ja: 'セット、ステータス、育成目標を同じ導线で見られます。' },
        links: [
          { href: '/genshin/artifacts', label: { zh: '圣遗物图鉴', en: 'Artifacts', ja: '聖遺物' } },
          { href: '/genshin/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '版本词也可以继续接到计算器和节奏榜。', en: 'Route patch searches into the calculator and tier list too.', ja: 'バージョン検索を計算機やティアへもつなげます。' },
        links: [
          { href: '/genshin/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/genshin/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'ティアリスト' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '活动、机制和攻略专题继续往下接。', en: 'Continue into events, mechanics, and guide roundups.', ja: 'イベント、機構、攻略まとめへ進めます。' },
        links: [
          { href: '/genshin/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/genshin/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把版本关键词和角色定位连起来，再看抽谁、养谁。', en: 'Connect version topics to character roles before deciding pulls or investments.', ja: 'バージョン語と役割をつないで、引くか育てるかを決めやすくします。' },
        links: [
          { href: '/genshin/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/genshin/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '圣遗物', en: 'Artifacts', ja: '聖遺物' },
        description: { zh: '把套装、词条和养成目标放到同一个页面里看。', en: 'Keep sets, stats, and progression goals on the same page.', ja: 'セット、ステータス、育成目標を同じ導线で見られます。' },
        links: [
          { href: '/genshin/artifacts', label: { zh: '圣遗物图鉴', en: 'Artifacts', ja: '聖遺物' } },
          { href: '/genshin/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '版本词也可以继续接到计算器和节奏榜。', en: 'Route patch searches into the calculator and tier list too.', ja: 'バージョン検索を計算機やティアへもつなげます。' },
        links: [
          { href: '/genshin/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/genshin/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'ティアリスト' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '活动、机制和攻略专题继续往下接。', en: 'Continue into events, mechanics, and guide roundups.', ja: 'イベント、機構、攻略まとめへ進めます。' },
        links: [
          { href: '/genshin/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/genshin/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把版本关键词和角色定位连起来，再看抽谁、养谁。', en: 'Connect version topics to character roles before deciding pulls or investments.', ja: 'バージョン語と役割をつないで、引くか育てるかを決めやすくします。' },
        links: [
          { href: '/genshin/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/genshin/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '圣遗物', en: 'Artifacts', ja: '聖遺物' },
        description: { zh: '把套装、词条和养成目标放到同一个页面里看。', en: 'Keep sets, stats, and progression goals on the same page.', ja: 'セット、ステータス、育成目標を同じ導线で見られます。' },
        links: [
          { href: '/genshin/artifacts', label: { zh: '圣遗物图鉴', en: 'Artifacts', ja: '聖遺物' } },
          { href: '/genshin/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '版本词也可以继续接到计算器和节奏榜。', en: 'Route patch searches into the calculator and tier list too.', ja: 'バージョン検索を計算機やティアへもつなげます。' },
        links: [
          { href: '/genshin/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/genshin/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'ティアリスト' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '活动、机制和攻略专题继续往下接。', en: 'Continue into events, mechanics, and guide roundups.', ja: 'イベント、機構、攻略まとめへ進めます。' },
        links: [
          { href: '/genshin/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/genshin/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
  },
  starrail: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把版本和角色定位连起来，再看抽卡与培养顺序。', en: 'Connect the patch to character roles before deciding pulls and build order.', ja: 'バージョンと役割をつないで、ガチャと育成順を決めやすくします。' },
        links: [
          { href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/starrail/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '光锥、遗器和主词条优先级都接到这里。', en: 'Route light cones, relics, and stat priorities here.', ja: '光円錐、遺物、ステ優先度をここに集約します。' },
        links: [
          { href: '/starrail/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/starrail/artifacts', label: { zh: '遗器图鉴', en: 'Relics', ja: '遺物' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '要更细的判断，就继续到对比和计算器。', en: 'Go deeper with compare and calculator pages when needed.', ja: 'さらに細かく見るなら比較と計算機へ。' },
        links: [
          { href: '/starrail/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
          { href: '/starrail/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本、活动和攻略专题一起往下接。', en: 'Continue into version notes, events, and guide roundups.', ja: 'バージョン、イベント、攻略まとめへ進めます。' },
        links: [
          { href: '/starrail/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/starrail/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把版本和角色定位连起来，再看抽卡与培养顺序。', en: 'Connect the patch to character roles before deciding pulls and build order.', ja: 'バージョンと役割をつないで、ガチャと育成順を決めやすくします。' },
        links: [
          { href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/starrail/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '光锥、遗器和主词条优先级都接到这里。', en: 'Route light cones, relics, and stat priorities here.', ja: '光円錐、遺物、ステ優先度をここに集約します。' },
        links: [
          { href: '/starrail/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/starrail/artifacts', label: { zh: '遗器图鉴', en: 'Relics', ja: '遺物' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '要更细的判断，就继续到对比和计算器。', en: 'Go deeper with compare and calculator pages when needed.', ja: 'さらに細かく見るなら比較と計算機へ。' },
        links: [
          { href: '/starrail/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
          { href: '/starrail/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本、活动和攻略专题一起往下接。', en: 'Continue into version notes, events, and guide roundups.', ja: 'バージョン、イベント、攻略まとめへ進めます。' },
        links: [
          { href: '/starrail/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/starrail/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先把版本和角色定位连起来，再看抽卡与培养顺序。', en: 'Connect the patch to character roles before deciding pulls and build order.', ja: 'バージョンと役割をつないで、ガチャと育成順を決めやすくします。' },
        links: [
          { href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/starrail/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '配装', en: 'Builds', ja: 'ビルド' },
        description: { zh: '光锥、遗器和主词条优先级都接到这里。', en: 'Route light cones, relics, and stat priorities here.', ja: '光円錐、遺物、ステ優先度をここに集約します。' },
        links: [
          { href: '/starrail/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
          { href: '/starrail/artifacts', label: { zh: '遗器图鉴', en: 'Relics', ja: '遺物' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '要更细的判断，就继续到对比和计算器。', en: 'Go deeper with compare and calculator pages when needed.', ja: 'さらに細かく見るなら比較と計算機へ。' },
        links: [
          { href: '/starrail/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
          { href: '/starrail/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '版本、活动和攻略专题一起往下接。', en: 'Continue into version notes, events, and guide roundups.', ja: 'バージョン、イベント、攻略まとめへ進めます。' },
        links: [
          { href: '/starrail/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/starrail/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
  },
  nte: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '把角色定位和版本关键词先连起来，再看培养路线。', en: 'Connect version keywords to character roles before planning progression.', ja: 'バージョン語と役割をつないで、育成ルートを決めやすくします。' },
        links: [
          { href: '/nte/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/nte/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '异能', en: 'Anomalies', ja: '異能' },
        description: { zh: '用异常机制、异常培养和属性理解接住版本热词。', en: 'Catch patch intent with anomaly mechanics, progression, and affinity pages.', ja: '異常機構、育成、属性理解でバージョン需要を受け止めます。' },
        links: [
          { href: '/nte/anomalies', label: { zh: '异能体系', en: 'Anomalies', ja: '異能' } },
          { href: '/nte/disk-sets', label: { zh: '套装图鉴', en: 'Disk sets', ja: 'ディスクセット' } },
        ],
      },
      {
        title: { zh: '资源', en: 'Resources', ja: '資源' },
        description: { zh: '开局资源、抽卡和兑换码适合放在一起看。', en: 'Group launch resources, gacha planning, and redeem codes together.', ja: '序盤資源、ガチャ計画、コード情報をまとめて見られます。' },
        links: [
          { href: '/nte/gacha', label: { zh: '抽卡记录', en: 'Gacha', ja: 'ガチャ' } },
          { href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '攻略专题继续承接玩法、下载和版本整理。', en: 'Continue into guides, downloads, and version roundups.', ja: '攻略、DL、バージョンまとめへ進めます。' },
        links: [
          { href: '/nte/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/nte/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '把角色定位和版本关键词先连起来，再看培养路线。', en: 'Connect version keywords to character roles before planning progression.', ja: 'バージョン語と役割をつないで、育成ルートを決めやすくします。' },
        links: [
          { href: '/nte/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/nte/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '异能', en: 'Anomalies', ja: '異能' },
        description: { zh: '用异常机制、异常培养和属性理解接住版本热词。', en: 'Catch patch intent with anomaly mechanics, progression, and affinity pages.', ja: '異常機構、育成、属性理解でバージョン需要を受け止めます。' },
        links: [
          { href: '/nte/anomalies', label: { zh: '异能体系', en: 'Anomalies', ja: '異能' } },
          { href: '/nte/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '资源', en: 'Resources', ja: '資源' },
        description: { zh: '开局资源、抽卡和兑换码适合放在一起看。', en: 'Group launch resources, gacha planning, and redeem codes together.', ja: '序盤資源、ガチャ計画、コード情報をまとめて見られます。' },
        links: [
          { href: '/nte/gacha', label: { zh: '抽卡记录', en: 'Gacha', ja: 'ガチャ' } },
          { href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '攻略专题继续承接玩法、下载和版本整理。', en: 'Continue into guides, downloads, and version roundups.', ja: '攻略、DL、バージョンまとめへ進めます。' },
        links: [
          { href: '/nte/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/nte/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '把角色定位和版本关键词先连起来，再看培养路线。', en: 'Connect version keywords to character roles before planning progression.', ja: 'バージョン語と役割をつないで、育成ルートを決めやすくします。' },
        links: [
          { href: '/nte/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/nte/weapons', label: { zh: '武器图鉴', en: 'Weapon wiki', ja: '武器図鑑' } },
        ],
      },
      {
        title: { zh: '异能', en: 'Anomalies', ja: '異能' },
        description: { zh: '用异常机制、异常培养和属性理解接住版本热词。', en: 'Catch patch intent with anomaly mechanics, progression, and affinity pages.', ja: '異常機構、育成、属性理解でバージョン需要を受け止めます。' },
        links: [
          { href: '/nte/anomalies', label: { zh: '异能体系', en: 'Anomalies', ja: '異能' } },
          { href: '/nte/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '资源', en: 'Resources', ja: '資源' },
        description: { zh: '开局资源、抽卡和兑换码适合放在一起看。', en: 'Group launch resources, gacha planning, and redeem codes together.', ja: '序盤資源、ガチャ計画、コード情報をまとめて見られます。' },
        links: [
          { href: '/nte/gacha', label: { zh: '抽卡记录', en: 'Gacha', ja: 'ガチャ' } },
          { href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '攻略专题继续承接玩法、下载和版本整理。', en: 'Continue into guides, downloads, and version roundups.', ja: '攻略、DL、バージョンまとめへ進めます。' },
        links: [
          { href: '/nte/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/nte/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
  },
  guihuan: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先看角色定位、阵容分工和培养优先级。', en: 'Start with roles, team duties, and progression priority.', ja: '役割、編成分担、育成優先度を先に整理します。' },
        links: [
          { href: '/guihuan/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/guihuan/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '武器', en: 'Weapons', ja: '武器' },
        description: { zh: '武器选择、基础数值和替代方案都能在这里继续看。', en: 'Continue into weapon choices, base stats, and fallback options.', ja: '武器選択、基礎数値、代替案を続けて確認できます。' },
        links: [
          { href: '/guihuan/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
          { href: '/guihuan/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '养成阶段可以继续接到节奏榜和对比页。', en: 'Use the tier list and compare pages for further planning.', ja: 'ティアと比較ページでさらに詰められます。' },
        links: [
          { href: '/guihuan/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'ティアリスト' } },
          { href: '/guihuan/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '开服、世界观和攻略专题继续往下接。', en: 'Continue into launch notes, lore, and guide roundups.', ja: '開服、世界観、攻略まとめへ進めます。' },
        links: [
          { href: '/guihuan/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/guihuan/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先看角色定位、阵容分工和培养优先级。', en: 'Start with roles, team duties, and progression priority.', ja: '役割、編成分担、育成優先度を先に整理します。' },
        links: [
          { href: '/guihuan/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/guihuan/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '武器', en: 'Weapons', ja: '武器' },
        description: { zh: '武器选择、基础数值和替代方案都能在这里继续看。', en: 'Continue into weapon choices, base stats, and fallback options.', ja: '武器選択、基礎数値、代替案を続けて確認できます。' },
        links: [
          { href: '/guihuan/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
          { href: '/guihuan/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '养成阶段可以继续接到节奏榜和对比页。', en: 'Use the tier list and compare pages for further planning.', ja: 'ティアと比較ページでさらに詰められます。' },
        links: [
          { href: '/guihuan/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'ティアリスト' } },
          { href: '/guihuan/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '开服、世界观和攻略专题继续往下接。', en: 'Continue into launch notes, lore, and guide roundups.', ja: '開服、世界観、攻略まとめへ進めます。' },
        links: [
          { href: '/guihuan/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/guihuan/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '先看角色定位、阵容分工和培养优先级。', en: 'Start with roles, team duties, and progression priority.', ja: '役割、編成分担、育成優先度を先に整理します。' },
        links: [
          { href: '/guihuan/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/guihuan/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '武器', en: 'Weapons', ja: '武器' },
        description: { zh: '武器选择、基础数值和替代方案都能在这里继续看。', en: 'Continue into weapon choices, base stats, and fallback options.', ja: '武器選択、基礎数値、代替案を続けて確認できます。' },
        links: [
          { href: '/guihuan/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
          { href: '/guihuan/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '养成阶段可以继续接到节奏榜和对比页。', en: 'Use the tier list and compare pages for further planning.', ja: 'ティアと比較ページでさらに詰められます。' },
        links: [
          { href: '/guihuan/tier-list', label: { zh: '节奏榜', en: 'Tier list', ja: 'ティアリスト' } },
          { href: '/guihuan/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '开服、世界观和攻略专题继续往下接。', en: 'Continue into launch notes, lore, and guide roundups.', ja: '開服、世界観、攻略まとめへ進めます。' },
        links: [
          { href: '/guihuan/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/guihuan/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
  },
  ananta: {
    zh: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '预约与版本信息之后，先看角色定位和培养方向。', en: 'After preregistration and patch notes, start with roles and progression plans.', ja: '事前登録とバージョン情報の後は、役割と育成方針を確認します。' },
        links: [
          { href: '/ananta/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/ananta/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '武器', en: 'Weapons', ja: '武器' },
        description: { zh: '武器、培养和替代方案一起看会更省时间。', en: 'Keep weapon choices, progression, and substitutes in one place.', ja: '武器選択、育成、代替案をまとめて見られます。' },
        links: [
          { href: '/ananta/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
          { href: '/ananta/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图和对比页更适合承接探索和玩法需求。', en: 'Use map and compare pages for exploration and planning.', ja: 'マップと比較ページで探索や検討を進められます。' },
        links: [
          { href: '/ananta/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/ananta/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '继续往下接下载、玩法和版本专题。', en: 'Continue into download, gameplay, and version topics.', ja: 'DL、ゲームプレイ、バージョン特集へ進めます。' },
        links: [
          { href: '/ananta/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/ananta/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '预约与版本信息之后，先看角色定位和培养方向。', en: 'After preregistration and patch notes, start with roles and progression plans.', ja: '事前登録とバージョン情報の後は、役割と育成方針を確認します。' },
        links: [
          { href: '/ananta/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/ananta/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '武器', en: 'Weapons', ja: '武器' },
        description: { zh: '武器、培养和替代方案一起看会更省时间。', en: 'Keep weapon choices, progression, and substitutes in one place.', ja: '武器選択、育成、代替案をまとめて見られます。' },
        links: [
          { href: '/ananta/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
          { href: '/ananta/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图和对比页更适合承接探索和玩法需求。', en: 'Use map and compare pages for exploration and planning.', ja: 'マップと比較ページで探索や検討を進められます。' },
        links: [
          { href: '/ananta/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/ananta/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '继续往下接下载、玩法和版本专题。', en: 'Continue into download, gameplay, and version topics.', ja: 'DL、ゲームプレイ、バージョン特集へ進めます。' },
        links: [
          { href: '/ananta/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/ananta/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '角色', en: 'Characters', ja: 'キャラ' },
        description: { zh: '预约与版本信息之后，先看角色定位和培养方向。', en: 'After preregistration and patch notes, start with roles and progression plans.', ja: '事前登録とバージョン情報の後は、役割と育成方針を確認します。' },
        links: [
          { href: '/ananta/characters', label: { zh: '角色图鉴', en: 'Character wiki', ja: 'キャラ図鑑' } },
          { href: '/ananta/teams', label: { zh: '配队推荐', en: 'Team comps', ja: '編成' } },
        ],
      },
      {
        title: { zh: '武器', en: 'Weapons', ja: '武器' },
        description: { zh: '武器、培养和替代方案一起看会更省时间。', en: 'Keep weapon choices, progression, and substitutes in one place.', ja: '武器選択、育成、代替案をまとめて見られます。' },
        links: [
          { href: '/ananta/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
          { href: '/ananta/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
        ],
      },
      {
        title: { zh: '工具', en: 'Tools', ja: 'ツール' },
        description: { zh: '地图和对比页更适合承接探索和玩法需求。', en: 'Use map and compare pages for exploration and planning.', ja: 'マップと比較ページで探索や検討を進められます。' },
        links: [
          { href: '/ananta/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
          { href: '/ananta/compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '继续往下接下载、玩法和版本专题。', en: 'Continue into download, gameplay, and version topics.', ja: 'DL、ゲームプレイ、バージョン特集へ進めます。' },
        links: [
          { href: '/ananta/version', label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' } },
          { href: '/ananta/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
  },
  skjh: {
    zh: [
      {
        title: { zh: '开服', en: 'Launch', ja: 'ローンチ' },
        description: { zh: '先接住上线时间、预约和开荒问题。', en: 'Capture launch timing, preregistration, and starter questions first.', ja: 'ローンチ時期、事前登録、序盤の疑問を先に受け止めます。' },
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
        description: { zh: '继续往下可以接到计算器和武器页。', en: 'Continue into the calculator and weapons pages next.', ja: '次は計算機と武器ページへつなげます。' },
        links: [
          { href: '/skjh/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/skjh/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '下载、互通和攻略专题继续承接。', en: 'Continue into download, cross-play, and guide topics.', ja: 'DL、互通、攻略へ進めます。' },
        links: [
          { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 PC 下载 FAQ', en: 'Official PC Download FAQ', ja: '公式PC DL FAQ' } },
          { href: '/skjh/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    en: [
      {
        title: { zh: '开服', en: 'Launch', ja: 'ローンチ' },
        description: { zh: '先接住上线时间、预约和开荒问题。', en: 'Capture launch timing, preregistration, and starter questions first.', ja: 'ローンチ時期、事前登録、序盤の疑問を先に受け止めます。' },
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
        description: { zh: '继续往下可以接到计算器和武器页。', en: 'Continue into the calculator and weapons pages next.', ja: '次は計算機と武器ページへつなげます。' },
        links: [
          { href: '/skjh/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/skjh/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '下载、互通和攻略专题继续承接。', en: 'Continue into download, cross-play, and guide topics.', ja: 'DL、互通、攻略へ進めます。' },
        links: [
          { href: '/skjh/guides/official-pc-download-faq', label: { zh: '官网 PC 下载 FAQ', en: 'Official PC Download FAQ', ja: '公式PC DL FAQ' } },
          { href: '/skjh/guides', label: { zh: '攻略专题', en: 'Guides', ja: '攻略' } },
        ],
      },
    ],
    ja: [
      {
        title: { zh: '开服', en: 'Launch', ja: 'ローンチ' },
        description: { zh: '先接住上线时间、预约和开荒问题。', en: 'Capture launch timing, preregistration, and starter questions first.', ja: 'ローンチ時期、事前登録、序盤の疑問を先に受け止めます。' },
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
        description: { zh: '继续往下可以接到计算器和武器页。', en: 'Continue into the calculator and weapons pages next.', ja: '次は計算機と武器ページへつなげます。' },
        links: [
          { href: '/skjh/calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
          { href: '/skjh/weapons', label: { zh: '武器图鉴', en: 'Weapons', ja: '武器' } },
        ],
      },
      {
        title: { zh: '机制', en: 'Mechanics', ja: '機構' },
        description: { zh: '下载、互通和攻略专题继续承接。', en: 'Continue into download, cross-play, and guide topics.', ja: 'DL、互通、攻略へ進めます。' },
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

function pickFeaturedGuides<T extends { id: string }>(guides: T[], featuredIds: string[]): T[] {
  const guideMap = new Map(guides.map((guide) => [guide.id, guide] as const));
  return featuredIds.map((id) => guideMap.get(id)).filter((guide): guide is T => Boolean(guide));
}

function getGuidesForGame(gameId: GameId) {
  switch (gameId) {
    case 'genshin':
      return { guides: genshinGuides, title: getGenshinGuideTitle, summary: getGenshinGuideSummary };
    case 'starrail':
      return { guides: starrailGuides, title: getStarRailGuideTitle, summary: getStarRailGuideSummary };
    case 'wuwa':
      return { guides: wuwaGuides, title: getWuWaGuideTitle, summary: getWuWaGuideSummary };
    case 'nte':
      return { guides: nteGuides, title: getNteGuideTitle, summary: getNteGuideSummary };
    case 'zzz':
      return { guides: zzzGuides, title: getZzzGuideTitle, summary: getZzzGuideSummary };
    case 'guihuan':
      return { guides: guihuanGuides, title: getGuihuanGuideTitle, summary: getGuihuanGuideSummary };
    case 'ananta':
      return { guides: anantaGuides, title: getAnantaGuideTitle, summary: getAnantaGuideSummary };
    case 'endfield':
      return { guides: endfieldGuides, title: getEndfieldGuideTitle, summary: getEndfieldGuideSummary };
    case 'sea':
      return { guides: seaGuides, title: getSeaGuideTitle, summary: getSeaGuideSummary };
    case 'skjh':
      return { guides: skjhGuides, title: getSkjhGuideTitle, summary: getSkjhGuideSummary };
  }
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
          zh: '版本专题看完后，直接接到角色定位和卡池判断。',
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
          zh: '继续看声骸、武器和养成方向，承接版本热词。',
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
          zh: '看完版本专题后，继续接到角色和阵容思路。',
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
          zh: '适合继续看 3.0 版本词、首席跟班和玩法解析。',
          en: 'Best for v3.0 keywords, key updates, and gameplay breakdowns.',
          ja: 'v3.0の注目語、主要更新、攻略解説へ進めます。',
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
          zh: '看完测试专题后，继续接到角色和职业理解。',
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
          zh: '先把 7 月 9 日公测、版本核心信息和首月路线接住。',
          en: 'Catch the July 9 beta timing, version core topics, and month-one route first.',
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
          zh: '把 7 月 9 日上线、预约和开荒问题一次接住。',
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
          zh: '下载、平台和互通问题放这里承接最合适。',
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
  const title = `${gameName} ${hub.title[locale]}`;
  const description = hub.description[locale];
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/version`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/version`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/version`, languages },
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
  const gameConfig = GAMES[gameId];
  const hub = VERSION_COPY[gameId];
  if (!gameConfig || !hub) {
    notFound();
  }
  const pageTitle = `${gameConfig.name[locale]} ${hub.title[locale]}`;
  const data = getGuidesForGame(gameId) as unknown as {
    guides: Array<{ id: string }>;
    title: (guide: { id: string }, locale: SupportedLocale) => string;
    summary: (guide: { id: string }, locale: SupportedLocale) => string;
  };
  const featuredGuides = pickFeaturedGuides(data.guides, hub.guideIds);
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

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
                  ? '统一承接官网、下载、云游戏、配置、兑换码和核心机制问题。'
                  : locale === 'ja'
                    ? '公式、DL、クラウド、環境、コード、主要機構の検索をまとめます。'
                    : 'Route official, download, cloud, specs, code, and core-mechanic queries into stable pages.'}
              </p>
            </div>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '模板化导流' : locale === 'ja' ? 'テンプレ導線' : 'Template funnel'}
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
                {locale === 'zh' ? '把版本词继续导到角色、配装、工具和机制页。' : locale === 'ja' ? 'バージョン語をキャラ、ビルド、ツール、機構へつなぎます。' : 'Route version searches into characters, builds, tools, and mechanics.'}
              </p>
            </div>
            <span className="text-xs text-game-text-muted">
              {locale === 'zh' ? '更深一层承接' : locale === 'ja' ? 'さらに下へ' : 'Deeper funnel'}
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
            <span className="text-xs text-game-text-muted">{locale === 'zh' ? '直接承接搜索词' : locale === 'ja' ? '検索語を直接承接' : 'Direct search intent'}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/${gameId}/guides/${guide.id}` as '/'}
                className="group flex flex-col rounded-xl border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
              >
                <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                  {data.title(guide, locale)}
                </h3>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {data.summary(guide, locale)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-game-text">{locale === 'zh' ? '相关入口' : locale === 'ja' ? '関連ページ' : 'Related Pages'}</h2>
          <span className="text-xs text-game-text-muted">{locale === 'zh' ? '站内跳转' : locale === 'ja' ? 'サイト内導線' : 'Internal navigation'}</span>
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

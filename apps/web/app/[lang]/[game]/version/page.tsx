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
    guideIds: ['luna-viii-sandrone-guide', 'banner-schedule-guide', 'lunar-reaction-guide'],
  },
  starrail: {
    title: { zh: '4.4 版本专题', en: 'v4.4 Version Hub', ja: 'v4.4 バージョン特集' },
    description: {
      zh: '聚焦 7 月 15 日 4.4 上线、Himeko Nova、Fate 联动、兑换码、星琼与卡池规划。',
      en: 'Focus on the July 15 v4.4 launch, Himeko Nova, Fate collab, redeem codes, Stellar Jade, and banner planning.',
      ja: '7月15日のv4.4、Himeko Nova、Fateコラボ、交換コード、星玉とバナー計画を整理します。',
    },
    highlights: {
      zh: ['4.4 上线', 'Himeko Nova', 'Fate 联动', '星琼规划'],
      en: ['v4.4 launch', 'Himeko Nova', 'Fate collab', 'Jade planning'],
      ja: ['v4.4開始', 'Himeko Nova', 'Fateコラボ', '星玉計画'],
    },
    kicker: { zh: '版本卡池', en: 'Banner watch', ja: 'バナー確認' },
    freshness: {
      zh: '已从前瞻口径切换为上线专题，持续承接联动、角色、兑换码与抽卡规划。',
      en: 'Updated from preview framing to launch coverage for collab, character, code, and pull-planning intent.',
      ja: '前瞻からローンチ特集に切り替え、コラボ、キャラ、コード、ガチャ計画を承接します。',
    },
    faq: [
      {
        question: {
          zh: '4.4 版本专题里最值得先看什么？',
          en: 'What should I read first in the v4.4 hub?',
          ja: 'v4.4特集では最初に何を見ればいいですか？',
        },
        answer: {
          zh: '先看 4.4 上线专题和 Himeko Nova/Fate 联动说明，再检查兑换码和星琼缺口。',
          en: 'Start with the v4.4 launch guide and Himeko Nova/Fate notes, then check codes and Jade gaps.',
          ja: 'まずv4.4ローンチ特集とHimeko Nova/Fate情報を確認し、コードと星玉不足を見てください。',
        },
      },
      {
        question: {
          zh: '资源不够时该看哪一页？',
          en: 'Which page helps with low resources?',
          ja: '資源が足りないときはどこを見ればいいですか？',
        },
        answer: {
          zh: '优先打开版本专题里的资源规划、抽卡相关、角色攻略和活动入口，先定目标再抽卡。',
          en: 'Use the version hub, resource planning, character pages, and event links to set goals before pulling.',
          ja: 'まずバージョン特集の資源計画、キャラ攻略、イベント導線を見て、目標を決めてから引くのが安全です。',
        },
      },
    ],
    guideIds: ['v4-4-preview-guide', 'v4-3-version-guide', 'fate-collab-guide'],
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
    guideIds: ['v3-4-version-guide', 'v3-5-preview-guide', 'roya-frostlands-guide'],
  },
  nte: {
    title: { zh: '1.2「999 Nights」专题', en: 'v1.2 999 Nights Hub', ja: 'v1.2 999 Nights 特集' },
    description: {
      zh: '围绕 1.2「999 Nights」、Shinku、Iroi、兑换码、下载入口和抽卡机制承接当前搜索。',
      en: 'A concise hub for v1.2 999 Nights, Shinku, Iroi, redeem codes, downloads, and gacha planning.',
      ja: 'v1.2「999 Nights」、Shinku、Iroi、交換コード、DL、ガチャ計画をまとめます。',
    },
    highlights: {
      zh: ['999 Nights', 'Shinku', 'Iroi', '兑换码'],
      en: ['999 Nights', 'Shinku', 'Iroi', 'Redeem codes'],
      ja: ['999 Nights', 'Shinku', 'Iroi', '交換コード'],
    },
    kicker: { zh: '入坑入口', en: 'Starter hub', ja: '入門ハブ' },
    freshness: {
      zh: '1.2 版本、Shinku/Iroi 抽取、兑换码和下载入口会持续整理。',
      en: 'Kept current with v1.2 coverage, Shinku/Iroi pull planning, codes, and download entry points.',
      ja: 'v1.2、Shinku/Iroiガチャ、コード、DL入口を継続整理します。',
    },
    faq: [
      {
        question: {
          zh: '异环现在最常见的问题是什么？',
          en: 'What are the most common NTE questions right now?',
          ja: 'NTEで今よく聞かれる内容は何ですか？',
        },
        answer: {
          zh: '1.2「999 Nights」、Shinku、Iroi、兑换码、下载和抽卡机制是当前最常见主题。',
          en: 'v1.2 999 Nights, Shinku, Iroi, redeem codes, downloads, and gacha mechanics are the most common topics.',
          ja: 'v1.2「999 Nights」、Shinku、Iroi、交換コード、DL、ガチャ機構が主なテーマです。',
        },
      },
      {
        question: {
          zh: '想知道从哪开始最省时间？',
          en: 'What is the fastest way to get started?',
          ja: '最短で始めるには何を見ればいいですか？',
        },
        answer: {
          zh: '先看下载安装，再看新手入门，最后按自己的目标决定是否参考抽卡策略和版本节点。',
          en: 'Start with download/install, then the beginner guide, and finish with gacha strategy and version notes if you need pull advice.',
          ja: 'まずDLとインストール、次に初心者ガイド、最後に必要ならガチャ戦略と更新情報を確認してください。',
        },
      },
    ],
    guideIds: ['v1-2-999-nights-guide', 'download-install-guide', 'gacha-strategy'],
  },
  zzz: {
    title: { zh: 'Steam / 3.0 入坑专题', en: 'Steam / v3.0 Starter Hub', ja: 'Steam / v3.0 入門特集' },
    description: {
      zh: '聚焦 Steam 发行、3.0 新区、账号绑定、下载安装、兑换码、驱动盘与配队思路。',
      en: 'Focus on Steam launch, v3.0 area, account linking, install flow, redeem codes, Drive Discs, and teams.',
      ja: 'Steam配信、v3.0新エリア、アカウント連携、DL、コード、ディスクと編成を整理します。',
    },
    highlights: {
      zh: ['Steam 入坑', '账号绑定', '3.0 新区', '兑换码'],
      en: ['Steam start', 'Account linking', 'v3.0 area', 'Redeem codes'],
      ja: ['Steam入門', 'アカウント連携', 'v3.0エリア', '交換コード'],
    },
    kicker: { zh: '版本热词', en: 'Hot topics', ja: '注目トピック' },
    freshness: {
      zh: '把新版本、队伍思路和养成关键词集中整理。',
      en: 'New version, team-building, and progression keywords are grouped here.',
      ja: '新バージョン、編成、育成ワードをまとめています。',
    },
    faq: [
      {
        question: {
          zh: '3.0 版本专题该先看什么？',
          en: 'What should I read first in the v3.0 hub?',
          ja: 'v3.0特集では何を最初に見ればいいですか？',
        },
        answer: {
          zh: 'Steam 新玩家先看账号绑定和下载安装；回流玩家先看 3.0 专题、兑换码和配队更新。',
          en: 'Steam newcomers should start with account linking and install flow; returning players should check v3.0, codes, and team updates.',
          ja: 'Steam新規はアカウント連携とDLから、復帰勢はv3.0、コード、編成更新から確認してください。',
        },
      },
      {
        question: {
          zh: '想找驱动盘和配队思路怎么办？',
          en: 'Where can I find drive disc and team ideas?',
          ja: 'ディスクと編成の考え方はどこで見られますか？',
        },
        answer: {
          zh: '直接进入驱动盘、配队和角色攻略页，会比单看版本标题更具体。',
          en: 'Open the drive disc, team, and character pages for a more practical breakdown than the version title alone.',
          ja: 'ディスク、編成、キャラ攻略ページを開くと、バージョン題名より実用的です。',
        },
      },
    ],
    guideIds: ['steam-3-0-start-guide', 'v3-0-version-guide', 'meta-teams-v3-guide'],
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
    guideIds: ['test-release-timeline-guide', 'time-loop-mechanic', 'download-install-guide'],
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
    guideIds: ['preregistration-no-gacha-guide', 'download-install-guide', 'combat-system-guide'],
  },
  endfield: {
    title: { zh: 'Homecoming 半周年专题', en: 'Homecoming Half-Year Hub', ja: 'Homecoming 半周年特集' },
    description: {
      zh: '围绕 7 月 16 日 Homecoming、新地图、Arcane/Liino、新 AIC 工厂与回流入坑承接。',
      en: 'A one-page hub for the July 16 Homecoming update, new maps, Arcane/Liino, AIC factory expansion, and returning players.',
      ja: '7月16日のHomecoming、新マップ、Arcane/Liino、AIC拡張、復帰導線をまとめます。',
    },
    highlights: {
      zh: ['7/16 Homecoming', '新地图', 'Arcane/Liino', 'AIC 工厂'],
      en: ['July 16 Homecoming', 'New maps', 'Arcane/Liino', 'AIC factory'],
      ja: ['7/16 Homecoming', '新マップ', 'Arcane/Liino', 'AIC工場'],
    },
    kicker: { zh: '半周年承接', en: 'Half-year anchor', ja: '半周年軸' },
    freshness: {
      zh: 'Homecoming、新地图、新干员、AIC 工厂和庆典奖励会持续补充。',
      en: 'Homecoming, new maps, operators, AIC factory, and celebration rewards are kept current.',
      ja: 'Homecoming、新マップ、新オペレーター、AIC工場、報酬を継続更新します。',
    },
    faq: [
      {
        question: {
          zh: 'Homecoming 先看什么最实用？',
          en: 'What should I read first for Homecoming?',
          ja: 'Homecomingで最初に見るべきものは？',
        },
        answer: {
          zh: '优先看 Homecoming 专题确认 7 月 16 日更新、新地图、Arcane/Liino 和 AIC 工厂变化。',
          en: 'Start with the Homecoming guide for the July 16 update, new maps, Arcane/Liino, and AIC factory changes.',
          ja: 'まずHomecoming特集で7月16日更新、新マップ、Arcane/Liino、AIC工場の変更を確認してください。',
        },
      },
      {
        question: {
          zh: '回流玩家先补哪一块？',
          en: 'What should returning players catch up on first?',
          ja: '復帰プレイヤーは何から確認すべきですか？',
        },
        answer: {
          zh: '先补新地图解锁与 AIC 工厂，再看 Arcane/Liino 试用、抽取和队伍需求。',
          en: 'Catch up on map unlocks and the AIC factory first, then review Arcane/Liino trials, pulls, and team needs.',
          ja: 'まず新マップ解放とAIC工場を確認し、その後Arcane/Liinoの試用、ガチャ、編成需要を見てください。',
        },
      },
    ],
    guideIds: ['homecoming-update-guide', 'beginner-guide', 'download-install-guide'],
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
    guideIds: ['official-2026-test-timeline-guide', 'open-beta-version-center', 'launch-day-guide', 'trade-market-guide'],
  },
  skjh: {
    title: { zh: '7 月 9 日上线专题', en: 'July 9 Launch Hub', ja: '7月9日ローンチ特集' },
    description: {
      zh: '围绕上线时间、预约福利、开荒路线、多端互通与官方礼包信息。',
      en: 'A launch hub for timing, reservation rewards, beginner routes, and multi-platform support.',
      ja: 'ローンチ時期、事前登録報酬、初心者ルート、マルチ端末をまとめます。',
    },
    highlights: {
      zh: ['7/9 上线', '预约福利', '多端互通', '新手开荒'],
      en: ['July 9 launch', 'Reservation rewards', 'Cross-play FAQ', 'Beginner route'],
      ja: ['7/9ローンチ', '事前登録報酬', '多端連携', '初心者ルート'],
    },
    kicker: { zh: '上线承接', en: 'Launch anchor', ja: 'ローンチ軸' },
    freshness: {
      zh: '上线、预约福利和跨端问题都放在这里持续更新。',
      en: 'Launch timing, reservation rewards, and cross-platform issues are refreshed here.',
      ja: 'ローンチ、事前登録報酬、クロス端末の話題を継続更新しています。',
    },
    faq: [
      {
        question: {
          zh: '失控进化上线后先看什么？',
          en: 'What should I check first after launch?',
          ja: 'ローンチ後に最初に見るべきものは？',
        },
        answer: {
          zh: '先看上线时间和预约福利，再看多端互通与新手开荒。',
          en: 'Check the launch timing and reservation rewards first, then cross-play and beginner routes.',
          ja: 'まずローンチ時期と事前登録報酬、その後に多端連携と初心者ルートを確認してください。',
        },
      },
      {
        question: {
          zh: '多端互通怎么确认？',
          en: 'How do I confirm cross-play support?',
          ja: 'マルチ端末対応はどう確認しますか？',
        },
        answer: {
          zh: '直接打开下载与跨端 FAQ 页面，里面会集中整理官方说明。',
          en: 'Open the download and cross-play FAQ page for the official details in one place.',
          ja: 'DLとクロス端末FAQページで公式情報をまとめて確認できます。',
        },
      },
    ],
    guideIds: ['season-1-launch', 'launch-rewards-complete', 'download-crossplay-faq'],
  },
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
          { href: '/skjh/guides/download-crossplay-faq', label: { zh: '下载互通 FAQ', en: 'Download & Cross-play FAQ', ja: 'DLと互通FAQ' } },
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
          { href: '/skjh/guides/download-crossplay-faq', label: { zh: '下载互通 FAQ', en: 'Download & Cross-play FAQ', ja: 'DLと互通FAQ' } },
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
          { href: '/skjh/guides/download-crossplay-faq', label: { zh: '下载互通 FAQ', en: 'Download & Cross-play FAQ', ja: 'DLと互通FAQ' } },
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
        href: '/skjh/guides/download-crossplay-faq',
        title: { zh: '下载互通 FAQ', en: 'Download & Cross-play FAQ', ja: 'DLと互通FAQ' },
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

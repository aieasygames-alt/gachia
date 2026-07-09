import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { IMAGE_BASE } from '@gachia/data/image-base';
import { genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage } from '@gachia/data/games/genshin/characters';
import { genshinGuides, getGuideTitle as getGenshinGuideTitle, getGuideSummary as getGenshinGuideSummary } from '@gachia/data/games/genshin/guides';
import { starrailCharacters, getStarRailCharacterName, getStarRailCharacterImage } from '@gachia/data/games/starrail/characters';
import { starrailGuides, getGuideTitle as getStarRailGuideTitle, getGuideSummary as getStarRailGuideSummary } from '@gachia/data/games/starrail/guides';
import { wuwaCharacters, getWuWaCharacterName, getWuWaCharacterImage } from '@gachia/data/games/wuwa/characters';
import { wuwaGuides, getGuideTitle as getWuWaGuideTitle, getGuideSummary as getWuWaGuideSummary } from '@gachia/data/games/wuwa/guides';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data/games/nte/characters';
import { guides as nteGuides, getGuideTitle as getNteGuideTitle, getGuideSummary as getNteGuideSummary } from '@gachia/data/games/nte/guides';
import { zzzCharacters, getZzzCharacterName, getZzzCharacterImage } from '@gachia/data/games/zzz/characters';
import { zzzGuides, getZzzGuideTitle, getZzzGuideSummary } from '@gachia/data/games/zzz/guides';
import { guihuanCharacters, getGuihuanCharacterName, getGuihuanCharacterImage } from '@gachia/data/games/guihuan/characters';
import { guihuanGuides, getGuihuanGuideTitle, getGuihuanGuideSummary } from '@gachia/data/games/guihuan/guides';
import { anantaCharacters, getAnantaCharacterName, getAnantaCharacterImage } from '@gachia/data/games/ananta/characters';
import { anantaGuides, getAnantaGuideTitle, getAnantaGuideSummary } from '@gachia/data/games/ananta/guides';
import { endfieldCharacters, getEndfieldCharacterName, getEndfieldCharacterImage } from '@gachia/data/games/endfield/characters';
import { endfieldGuides, getEndfieldGuideTitle, getEndfieldGuideSummary } from '@gachia/data/games/endfield/guides';
import { seaCharacters, getSeaCharacterName, getSeaCharacterImage } from '@gachia/data/games/sea/characters';
import { seaGuides, getSeaGuideTitle, getSeaGuideSummary } from '@gachia/data/games/sea/guides';
import { skjhGuides, getSkjhGuideTitle, getSkjhGuideSummary } from '@gachia/data/games/skjh/guides';
import Image from 'next/image';
import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';

const BASE_URL = 'https://gachia.com';

// --- i18n ---
type HomeMessages = Record<string, string>;
const HOME_MSG: Record<string, HomeMessages> = {
  zh: (zhMessages as Record<string, Record<string, string>>).gameHomepage!,
  en: (enMessages as Record<string, Record<string, string>>).gameHomepage!,
  ja: (jaMessages as Record<string, Record<string, string>>).gameHomepage!,
};

// --- Game descriptions (SEO meta + on-page) ---
const GAME_DESCRIPTIONS: Record<string, Record<string, string>> = {
  genshin: {
    zh: '原神角色图鉴、武器数据库、圣遗物推荐、攻略百科。覆盖至6.x版本Nod-Krai区域，116+角色builds、配队推荐、材料路线图、交互地图。',
    en: 'Genshin Impact character builds, weapon database, artifact recommendations, and guides up to v6.x Nod-Krai. 116+ characters, team comps, interactive map, and tier lists.',
    ja: '原神キャラビルド、武器データベース、聖遺物おすすめ、攻略百科。v6.x Nod-Krai対応、116+キャラ、チーム編成、インタラクティブマップ、Tierリスト。',
  },
  starrail: {
    zh: '崩坏：星穹铁道角色图鉴、光锥数据库、遗器推荐、攻略百科。覆盖至4.x版本Planarcadia星球，86+角色、愉悦命途、伤害计算器。',
    en: 'Honkai: Star Rail character builds, light cone database, relic recommendations, and guides up to v4.x Planarcadia. 86+ characters, Elation Path, damage calculator.',
    ja: '崩壊：スターレイルキャラビルド、光円錐データベース、遺物おすすめ、攻略百科。v4.x Planarcadia対応、86+キャラ、エレーション運命、ダメージ計算機。',
  },
  wuwa: {
    zh: '鸣潮角色图鉴、武器数据、声骸推荐、攻略百科。覆盖至3.x版本Roya Frostlands，48+角色、Tune Break战斗系统、声骸套装搭配。',
    en: 'Wuthering Waves character builds, weapon database, echo recommendations, and guides up to v3.x Roya Frostlands. 48+ characters, Tune Break combat, echo set guides.',
    ja: '鳴潮キャラビルド、武器データベース、エコーおすすめ、攻略百科。v3.x Roya Frostlands対応、48+キャラ、Tune Break戦闘、エコーセットガイド。',
  },
  nte: {
    zh: '异环（NTE）角色图鉴、武器数据、光盘推荐、兑换码、祈愿模拟。已正式发布，覆盖19个可玩角色、技能解析与配装方案。',
    en: 'Neverness to Everness (NTE) character guides, weapon data, disk set recommendations, redeem codes, and gacha simulator. Now released with 19 playable characters.',
    ja: '異環（NTE）キャラ図鑑、武器データ、ディスクおすすめ、交換コード、ガチャシミュレーター。正式リリース済み、19体のプレイアブルキャラ。',
  },
  zzz: {
    zh: '绝区零代理人图鉴、音擎数据、驱动盘推荐、攻略百科。覆盖至2.8版本，56+代理人、Rupture职业、最佳配队方案。',
    en: 'Zenless Zone Zero agent builds, W-Engine database, drive disc recommendations, and guides up to v2.8. 56+ agents, Rupture specialty, best team comps.',
    ja: 'ゼンレスゾーンゼロエージェントビルド、Wエンジンデータ、ドライブディスクおすすめ、攻略百科。v2.8対応、56+エージェント、ラプチャースペシャリティ。',
  },
  guihuan: {
    zh: '归环角色图鉴、武器数据、攻略百科。覆盖全部可用角色的技能数据与配装推荐。',
    en: 'Guihuan character builds, weapon database, and guides. Full skill data and build recommendations for all characters.',
    ja: '帰環キャラビルド、武器データ、攻略百科。全キャラのスキルデータとビルドおすすめ。',
  },
  ananta: {
    zh: '无限大角色图鉴、武器数据、攻略百科。网易开发的无抽卡开放世界游戏，角色通过游戏进程获取。',
    en: 'Ananta character builds, weapon database, and guides. A no-gacha open-world game by NetEase where all characters are unlocked through gameplay.',
    ja: '無限大キャラビルド、武器データ、攻略百科。NetEase開発のガチャなしオープンワールドゲーム、全キャラがゲーム進行で解放。',
  },
  endfield: {
    zh: '《明日方舟：终末地》是鹰角网络开发的开放世界动作RPG，以明日方舟IP为背景，玩家扮演博士在塔拉二号星球上建立据点、指挥干员进行即时战斗和探索。',
    en: 'Arknights: Endfield is an open-world action RPG by Hypergryph, set in the Arknights universe. Players take on the role of the Doctor, establishing bases and commanding operators in real-time combat on the planet Talos II.',
    ja: 'アークナイツ：エンドフィールドはハイパーグリフ開発のオープンワールドアクションRPG。アークナイツIPを背景に、プレイヤーはドクターとしてタロスII号星で拠点を建設し、オペレーターを指揮してリアルタイム戦闘と探索を行います。',
  },
  sea: {
    zh: '遗忘之海是网易Joker工作室自研的海洋奇遇开放世界RPG。PC端定档2026年7月9日公测，移动端7月内上线，Gachia整理角色、船队、版本、公测福利与开荒攻略。',
    en: 'Sea of Remnants is an ocean adventure open-world RPG by NetEase Joker Studio. PC open beta is scheduled for July 9, 2026, with mobile launching later in July. Gachia tracks crews, fleets, version news, launch rewards, and beginner guides.',
    ja: 'シー・オブ・レムナンツはNetEase Joker Studioの海洋アドベンチャーオープンワールドRPG。人形の船長として海の冒険に出よう。',
  },
  skjh: {
    zh: '失控进化是腾讯游戏发行、无端科技研发，并获得 Rust 正版玩法授权的开放世界多人生存对抗游戏。Gachia整理公测时间、开荒路线、基地建设、资源科技树、基因流派、武器和福利活动。',
    en: 'Ashfall Evolution is an open-world multiplayer survival game published by Tencent Games and developed by Wuduan Technology with officially licensed Rust-style gameplay. Gachia tracks launch timing, beginner routes, base building, resources, gene builds, weapons, and rewards.',
    ja: '失控進化はTencent Games配信、無端科技開発、Rust正式ライセンス玩法のオープンワールド型マルチプレイサバイバル対戦ゲームです。Gachiaでは開荒、拠点建築、資源、遺伝子ビルド、報酬を整理します。',
  },
};

// SEO-rich about paragraphs per game per locale
const GAME_ABOUT: Record<string, Record<string, string>> = {
  genshin: {
    zh: '原神（Genshin Impact）是米哈游开发的开放世界动作 RPG，当前版本6.x「空月之歌」已开放Nod-Krai区域。Gachia 提供完整的原神角色图鉴，覆盖116+五星、四星角色的属性、技能、命之座、突破材料与配装推荐。圣遗物数据库包含所有套装效果与最佳适配角色。武器数据库按类型和稀有度分类。交互地图支持实时标记与进度追踪，节奏榜帮助玩家了解当前版本强势角色。',
    en: 'Genshin Impact is an open-world action RPG by HoYoverse, currently in v6.x "Song of the Hollow Moon" with the new Nod-Krai region. Gachia provides a complete character database covering 116+ 5-star and 4-star characters with stats, talents, constellations, ascension materials, and builds. Our artifact database lists every set with effects and best characters. The interactive map supports real-time markers and progress tracking. Use the tier list to find meta characters.',
    ja: '原神（Genshin Impact）はHoYoverseのオープンワールドアクションRPG、現在v6.x「空月の歌」Nod-Krai地域が開放済み。Gachiaでは116+キャラクターのステータス、スキル、命ノ星座、突破素材、ビルドを網羅。聖遺物データベースには全セット効果と最適キャラを掲載。インタラクティブマップでリアルタイムマーカーと進捗追跡に対応。Tierリストでメタキャラを確認できます。',
  },
  starrail: {
    zh: '崩坏：星穹铁道（Honkai: Star Rail）是米哈游开发的回合制策略 RPG，当前版本4.x已开放Planarcadia星球并新增「愉悦」命途。Gachia 提供全86+角色图鉴、光锥数据库、遗器推荐、配队方案与伤害计算器。角色按8条命途（毁灭、存护、巡猎、智识、谐乐、虚无、丰饶、愉悦）分类，包含完整技能与行迹数据。',
    en: 'Honkai: Star Rail is a turn-based strategy RPG by HoYoverse, currently in v4.x with the new Planarcadia planet and Elation Path. Gachia offers a full 86+ character database, light cone encyclopedia, relic recommendations, team comps, and damage calculator. Characters are organized by 8 Paths (Destruction, Preservation, Hunt, Erudition, Harmony, Nihility, Abundance, Elation) with complete skill and trace data.',
    ja: '崩壊：スターレイル（Honkai: Star Rail）はHoYoverseのターン制ストラテジーRPG、現在v4.x Planarcadia星球と「愉悦」運命が追加済み。Gachiaでは86+キャラ図鑑、光円錐データベース、遺物おすすめ、パーティ編成、ダメージ計算機を提供。キャラは8つの運命（壊滅、存護、巡狩、知恵、調和、虚無、豊穣、愉悦）別に分類し、スキルと軌跡データを完全網羅。',
  },
  wuwa: {
    zh: '鸣潮（Wuthering Waves）是库洛游戏开发的开放世界动作 RPG，当前版本3.x已开放Roya Frostlands区域，引入Tune Break战斗系统与Motorbike探索载具。Gachia 提供鸣潮48+角色图鉴、武器数据、声骸系统详解、配装推荐与配队方案。声骸按cost等级和Sonata套装效果分类，帮助玩家快速找到最优搭配。',
    en: 'Wuthering Waves is an open-world action RPG by Kuro Games, currently in v3.x with the Roya Frostlands region, Tune Break combat system, and Motorbike traversal. Gachia provides 48+ character guides, weapon data, echo encyclopedia with Sonata set effects, build recommendations, and team comps organized by echo cost tier and set bonuses.',
    ja: '鳴潮（Wuthering Waves）はKuro GamesのオープンワールドアクションRPG、現在v3.x Roya Frostlands地域、Tune Break戦闘システム、バイク探索が追加済み。Gachiaでは48+キャラ図鑑、武器データ、エコー百科（Sonataセット効果付き）、ビルドおすすめ、パーティ編成を提供。',
  },
  nte: {
    zh: '异环（Neverness to Everness）是 Hotta Studio 基于 UE5 开发的超自然开放世界游戏，2026年4月已正式发布。Gachia 提供最全的异环数据库，包含19个可玩角色的图鉴、武器数据、光盘套装推荐、兑换码汇总、祈愿模拟与异象系统，提供详细的技能解析与配装方案。',
    en: 'Neverness to Everness (NTE) is a supernatural open-world game by Hotta Studio built on UE5, officially released in April 2026. Gachia offers the most comprehensive NTE database with 19 playable character guides, weapon data, disk set recommendations, redeem codes, gacha simulator, and anomaly system with detailed skill breakdowns and build guides.',
    ja: '異環（Neverness to Everness）はHotta StudioのUE5製超自然オープンワールドゲーム、2026年4月正式リリース。Gachiaは最も充実したNTEデータベースを提供。19体のプレイアブルキャラ図鑑、武器データ、ディスクセットおすすめ、交換コード、ガチャシミュレーター、アノマリーシステムを網羅。',
  },
  zzz: {
    zh: '绝区零（Zenless Zone Zero）是米哈游开发的都市动作游戏，当前版本2.8。Gachia 提供52+代理人图鉴、音擎（W-Engine）数据库、驱动盘推荐与配装方案。角色按6种职业（攻击、眩晕、异常、支援、防御、破裂）和5种属性分类，包含完整技能数据与最佳配队推荐。',
    en: 'Zenless Zone Zero (ZZZ) is an urban action game by HoYoverse, currently in v2.8. Gachia provides a 52+ agent database, W-Engine encyclopedia, drive disc recommendations, and build guides. Characters are organized by 6 specialties (Attack, Stun, Anomaly, Support, Defense, Rupture) and 5 attributes with complete skill data and best team suggestions.',
    ja: 'ゼンレスゾーンゼロ（ZZZ）はHoYoverseの都市アクションゲーム、現在v2.8。Gachiaでは52+エージェント図鑑、Wエンジンデータベース、ドライブディスクおすすめ、ビルドガイドを提供。キャラは6つのスペシャリティ（アタック、スタン、アノマリー、サポート、ディフェンス、ラプチャー）と5属性別に分類。',
  },
  guihuan: {
    zh: '归环（Guihuan）是一款二次元开放世界冒险游戏。Gachia 提供归环角色图鉴、武器数据库、配装推荐与攻略百科，帮助玩家快速上手游戏并了解各角色的最优培养路线。',
    en: 'Guihuan is an anime open-world adventure game. Gachia provides a character database, weapon encyclopedia, build recommendations, and strategy guides to help players get started and optimize character development.',
    ja: '帰環（Guihuan）は二次元オープンワールドアドベンチャーゲームです。Gachiaではキャラ図鑑、武器データベース、ビルドおすすめ、攻略百科を提供し、プレイヤーの迅速なスタートとキャラ育成をサポートします。',
  },
  ananta: {
    zh: '无限大（Ananta）是网易旗下 Naked Rain 工作室开发的开放世界动作游戏（前称 Project Mugen），采用无抽卡模式——所有角色通过游戏进程免费获取。Gachia 提供角色图鉴、武器数据库、配装推荐与攻略百科，覆盖全部已公布角色。',
    en: 'Ananta (formerly Project Mugen) is an open-world action game by Naked Rain / NetEase with a no-gacha model — all characters are unlocked through gameplay for free. Gachia offers a character database, weapon encyclopedia, build recommendations, and strategy guides for all announced characters.',
    ja: '無限大（Ananta、旧称Project Mugen）はNaked Rain / NetEaseのオープンワールドアクションゲーム。ガチャなしモデルで全キャラがゲーム進行で無料解放されます。Gachiaではキャラ図鑑、武器データベース、ビルドおすすめ、攻略百科を提供。',
  },
  endfield: {
    zh: '《明日方舟：终末地》（Arknights: Endfield）是鹰角网络（Hypergryph）开发的开放世界动作 RPG，以明日方舟 IP 为背景，玩家扮演博士在塔拉二号星球上建立据点、指挥干员进行即时战斗和探索。Gachia 提供角色图鉴、武器数据库、配装推荐与攻略百科，覆盖全部可玩角色。',
    en: 'Arknights: Endfield is an open-world action RPG by Hypergryph set in the Arknights universe. Players take on the role of the Doctor, establishing bases and commanding operators in real-time combat on the planet Talos II. Gachia offers a character database, weapon encyclopedia, build recommendations, and strategy guides for all playable characters.',
    ja: 'アークナイツ：エンドフィールドはハイパーグリフ開発のオープンワールドアクションRPG。アークナイツの世界観を背景に、プレイヤーはドクターとしてタロスII号星で拠点を建設し、オペレーターを指揮してリアルタイム戦闘と探索を行います。Gachiaではキャラ図鑑、武器データベース、ビルドおすすめ、攻略百科を提供。',
  },
  sea: {
    zh: '遗忘之海是一款极具美术风格的海洋冒险RPG，采用回合制战斗、即时海战与Roguelite遗忘之旅多模式。PC端2026年7月9日公测，移动端预计7月内上线。公测首月重点内容包括白沙海、渡桥海、7月底隐秘海，新船员茉莉、黑格、盖尔、爱德华，以及记忆重逢、奥托皮亚多结局、全服交易行、噩梦深潜和大漩涡等系统。Gachia会持续整理公测版本日志、兑换码、角色与BOSS档案、开荒Build和海区探索路线。',
    en: 'Sea of Remnants is a stylized ocean adventure RPG with turn-based combat, real-time naval battles, and Roguelite Remnant Journey runs. PC open beta is scheduled for July 9, 2026, with mobile expected later in July. Launch-month coverage includes White Sand Sea, Bridge Sea, the late-July Hidden Sea, crews such as Molly, Heige, Gail, and Edward, plus Memory Reunion, Orbtopia endings, the server-wide trade market, Nightmare Dive, and Maelstrom systems. Gachia tracks version logs, codes, crews, bosses, builds, and sea-region routes.',
    ja: 'ターン制バトルとリアルタイム海戦を特徴とする海洋アドベンチャーRPG。記憶を失った人形の船長となり、300以上の個性的な仲間と共に伝説のシー・オブ・レムナンツを探そう。',
  },
  skjh: {
    zh: '《失控进化》是一款开放世界硬核生存对抗游戏，玩家在荒岛中从徒手采集开始，逐步完成工具制作、武器锻造、庇护所搭建、科技树解锁和领地攻防。游戏强调搜打拆、基地运营、动态天气、饥饿口渴等代谢压力，以及不同服务器模式下的风险选择。Gachia 将优先整理新手 0-10 分钟开荒、基地选址、领地柜维护、资源优先级、基因流派搭配、武器图鉴和公测预约福利。',
    en: 'Ashfall Evolution is a hardcore open-world survival PvP game where players start from bare-handed gathering, then craft tools, forge weapons, build shelters, unlock technology, and fight over territory. The game emphasizes looting, fighting, raiding, base upkeep, dynamic weather, hunger and thirst pressure, and risk choices across server modes. Gachia covers beginner routes, territory cabinets, resource priorities, gene builds, weapons, and launch rewards.',
    ja: '『失控進化』は、採集、道具作成、武器製作、拠点建築、技術解放、領地攻防を中心にしたハードコアなオープンワールドサバイバル対戦ゲームです。Gachiaでは初心者ルート、領地キャビネット、資源優先度、遺伝子ビルド、武器、リリース報酬を整理します。',
  },
};

// --- Featured character IDs per game ---
const FEATURED_CHARS: Record<string, string[]> = {
  genshin: ['hu-tao', 'raiden-shogun', 'furina', 'nahida', 'kazuha', 'zhongli', 'yelan'],
  starrail: ['kafka', 'jingliu', 'acheron', 'firefly', 'robin', 'ruan-mei'],
  wuwa: ['jiyan', 'yinlin', 'jinhsi', 'camellya', 'rover-spectro'],
  nte: ['chiz', 'aurelia', 'skia', 'haniel', 'sakiri', 'nanally'],
  zzz: ['ellen', 'zhu-yuan', 'miyabi', 'burnice', 'caesar'],
  guihuan: [],
  ananta: [],
  endfield: ['laevatain', 'ardelia', 'tangtang', 'endministrator', 'lifeng'],
  sea: ['traveler', 'ais', 'little-axe', 'molly', 'heige', 'gail', 'edward'],
  skjh: [],
};

type SpecialHubCopy = {
  eyebrow: Record<SupportedLocale, string>;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  chips: Record<SupportedLocale, string[]>;
  cta: Record<SupportedLocale, string>;
  tracks?: Record<SupportedLocale, Array<{
    title: string;
    description: string;
    links: Array<{
      href: string;
      label: string;
    }>;
  }>>;
  faq: Array<{
    question: Record<SupportedLocale, string>;
    answer: Record<SupportedLocale, string>;
  }>;
};

const SPECIAL_HOME_COPY: Partial<Record<GameId, SpecialHubCopy>> = {
  genshin: {
    eyebrow: { zh: '6.x 版本专题入口', en: 'v6.x Version Hub', ja: 'v6.x バージョン特集' },
    title: { zh: '原神版本热词承接', en: 'Genshin hot-topic landing hub', ja: '原神 注目トピック導線' },
    description: {
      zh: '把月之八、桑多涅、地区探索和圣遗物配装集中放进首页，先接住当前版本和养成搜索词。',
      en: 'Surface Moon 8, Sandrone, region exploration, and artifact builds on the homepage first.',
      ja: '月之八、桑多涅、地域探索、聖遺物ビルドをトップで受け止めます。',
    },
    chips: {
      zh: ['月之八', '桑多涅', '圣遗物', '武器图鉴', '交互地图', '版本前瞻'],
      en: ['Moon 8', 'Sandrone', 'Artifacts', 'Weapons', 'Interactive map', 'Version preview'],
      ja: ['月之八', '桑多涅', '聖遺物', '武器', 'マップ', '前瞻'],
    },
    cta: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '版本节点',
          description: '把版本前瞻和核心版本词先承接起来。',
          links: [
            { href: '/genshin/version', label: '版本专题' },
            { href: '/genshin/guides/snezhnaya-version-guide', label: '版本指南' },
          ],
        },
        {
          title: '养成与配装',
          description: '把角色、武器和圣遗物一起送到实际培养页。',
          links: [
            { href: '/genshin/build', label: '配装推荐' },
            { href: '/genshin/artifacts', label: '圣遗物图鉴' },
          ],
        },
        {
          title: '地图与机制',
          description: '把地区探索和新机制类搜索词继续往下带。',
          links: [
            { href: '/genshin/map', label: '交互地图' },
            { href: '/genshin/guides/lunar-reaction-guide', label: '机制攻略' },
          ],
        },
      ],
      en: [
        {
          title: 'Version node',
          description: 'Anchor the homepage to current patch preview topics.',
          links: [
            { href: '/genshin/version', label: 'Version hub' },
            { href: '/genshin/guides/snezhnaya-version-guide', label: 'Version guide' },
          ],
        },
        {
          title: 'Builds and artifacts',
          description: 'Route character, weapon, and artifact queries to practical pages.',
          links: [
            { href: '/genshin/build', label: 'Builds' },
            { href: '/genshin/artifacts', label: 'Artifacts' },
          ],
        },
        {
          title: 'Map and mechanics',
          description: 'Keep region exploration and system questions moving deeper.',
          links: [
            { href: '/genshin/map', label: 'Interactive map' },
            { href: '/genshin/guides/lunar-reaction-guide', label: 'Mechanics guide' },
          ],
        },
      ],
      ja: [
        {
          title: 'バージョン導線',
          description: 'ホームを最新の前瞻・バージョン語に結びつけます。',
          links: [
            { href: '/genshin/version', label: 'バージョン特集' },
            { href: '/genshin/guides/snezhnaya-version-guide', label: 'バージョンガイド' },
          ],
        },
        {
          title: '育成と聖遺物',
          description: 'キャラ、武器、聖遺物を実用ページへ送ります。',
          links: [
            { href: '/genshin/build', label: 'ビルド' },
            { href: '/genshin/artifacts', label: '聖遺物図鑑' },
          ],
        },
        {
          title: '地図と機構',
          description: '地域探索と機構系の検索意図をさらに下へつなげます。',
          links: [
            { href: '/genshin/map', label: 'マップ' },
            { href: '/genshin/guides/lunar-reaction-guide', label: '機構攻略' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '原神首页先看什么最有用？',
          en: 'What should I open first on the Genshin homepage?',
          ja: '原神ホームで最初に見るべきものは？',
        },
        answer: {
          zh: '先看版本专题和圣遗物/配装入口，再看地图和机制攻略。',
          en: 'Start with the version hub and build/artifact pages, then open map and mechanics guides.',
          ja: 'まずバージョン特集とビルド/聖遺物、次にマップと機構攻略を見るのがおすすめです。',
        },
      },
    ],
  },
  starrail: {
    eyebrow: { zh: '4.x 版本专题入口', en: 'v4.x Version Hub', ja: 'v4.x バージョン特集' },
    title: { zh: '星穹铁道版本热词承接', en: 'Star Rail hot-topic landing hub', ja: 'スターレイル 注目トピック導線' },
    description: {
      zh: '把 4.4 前瞻、联动、遗器和配队信息一起放进首页，先接住版本和养成搜索词。',
      en: 'Surface the v4.4 preview, collabs, relics, and team-building pages right on the homepage.',
      ja: 'v4.4前瞻、コラボ、遺物、編成をトップにまとめます。',
    },
    chips: {
      zh: ['4.4 前瞻', '联动', '遗器', '光锥', '配队', '伤害计算器'],
      en: ['v4.4 preview', 'Collabs', 'Relics', 'Light cones', 'Teams', 'Calculator'],
      ja: ['v4.4前瞻', 'コラボ', '遺物', '光円錐', '編成', '計算機'],
    },
    cta: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '版本节点',
          description: '把 4.4 前瞻和版本规划直接接住。',
          links: [
            { href: '/starrail/version', label: '版本专题' },
            { href: '/starrail/guides/v4-4-preview-guide', label: '4.4 前瞻' },
          ],
        },
        {
          title: '遗器与配装',
          description: '把遗器、光锥和配装推荐串成可执行的培养页。',
          links: [
            { href: '/starrail/build', label: '配装推荐' },
            { href: '/starrail/weapons', label: '光锥图鉴' },
          ],
        },
        {
          title: '队伍与计算',
          description: '继续承接主流配队、计算器和伤害类查询。',
          links: [
            { href: '/starrail/teams', label: '配队推荐' },
            { href: '/starrail/calculator', label: '伤害计算器' },
          ],
        },
      ],
      en: [
        {
          title: 'Version node',
          description: 'Anchor the homepage to v4.4 previews and planning topics.',
          links: [
            { href: '/starrail/version', label: 'Version hub' },
            { href: '/starrail/guides/v4-4-preview-guide', label: 'v4.4 preview' },
          ],
        },
        {
          title: 'Relics and builds',
          description: 'Route relic and light cone searches into practical build pages.',
          links: [
            { href: '/starrail/build', label: 'Builds' },
            { href: '/starrail/weapons', label: 'Light cones' },
          ],
        },
        {
          title: 'Teams and tools',
          description: 'Keep team, calculator, and damage queries moving deeper.',
          links: [
            { href: '/starrail/teams', label: 'Teams' },
            { href: '/starrail/calculator', label: 'Calculator' },
          ],
        },
      ],
      ja: [
        {
          title: 'バージョン導線',
          description: 'v4.4前瞻とバージョン計画をホームで受け止めます。',
          links: [
            { href: '/starrail/version', label: 'バージョン特集' },
            { href: '/starrail/guides/v4-4-preview-guide', label: 'v4.4 前瞻' },
          ],
        },
        {
          title: '遺物とビルド',
          description: '遺物、光円錐、ビルドを実用ページへつなげます。',
          links: [
            { href: '/starrail/build', label: 'ビルド' },
            { href: '/starrail/weapons', label: '光円錐図鑑' },
          ],
        },
        {
          title: '編成と計算',
          description: '編成、計算機、火力検証の流れを続けます。',
          links: [
            { href: '/starrail/teams', label: '編成' },
            { href: '/starrail/calculator', label: '計算機' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '星穹铁道首页先看什么最实用？',
          en: 'What should I open first on the Star Rail homepage?',
          ja: 'スターレイルホームで最初に見るべきものは？',
        },
        answer: {
          zh: '先看版本专题和遗器/光锥入口，再看配队和计算器。',
          en: 'Start with the version hub and relic/light cone pages, then move to teams and the calculator.',
          ja: 'まずバージョン特集と遺物/光円錐、その後に編成と計算機を見るのがおすすめです。',
        },
      },
    ],
  },
  nte: {
    eyebrow: { zh: '更新与入坑专题', en: 'Update & onboarding hub', ja: '更新・入門特集' },
    title: { zh: '异环更新与下载承接', en: 'NTE update and download hub', ja: 'NTE 更新・DL導線' },
    description: {
      zh: '把下载、入门、配装和版本更新节点一起放进首页，优先承接最常见的问题。',
      en: 'Put download, onboarding, builds, and update nodes on the homepage to catch common queries first.',
      ja: 'DL、入門、ビルド、更新ノードをトップで受け止めます。',
    },
    chips: {
      zh: ['下载安装', '新手入门', '配装推荐', '抽卡策略', '版本更新', '兑换码'],
      en: ['Download/install', 'Beginner guide', 'Builds', 'Gacha strategy', 'Updates', 'Redeem codes'],
      ja: ['DL/インストール', '初心者ガイド', 'ビルド', 'ガチャ戦略', '更新', '交換コード'],
    },
    cta: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '下载与入门',
          description: '把下载安装和新手入门先接住。',
          links: [
            { href: '/nte/guides/download-install-guide', label: '下载安装' },
            { href: '/nte/guides/beginner-guide', label: '新手入门' },
          ],
        },
        {
          title: '养成与配装',
          description: '围绕弧盘、配装和抽卡策略继续分流。',
          links: [
            { href: '/nte/build', label: '配装推荐' },
            { href: '/nte/guides/gacha-strategy', label: '抽卡策略' },
          ],
        },
        {
          title: '版本与福利',
          description: '把版本更新和兑换码整成更清晰的路径。',
          links: [
            { href: '/nte/version', label: '版本专题' },
            { href: '/nte/redeem-codes', label: '兑换码' },
          ],
        },
      ],
      en: [
        {
          title: 'Download and start',
          description: 'Catch install and onboarding questions immediately.',
          links: [
            { href: '/nte/guides/download-install-guide', label: 'Download/install' },
            { href: '/nte/guides/beginner-guide', label: 'Beginner guide' },
          ],
        },
        {
          title: 'Builds and gacha',
          description: 'Route arc builds, gear, and gacha strategy into useful pages.',
          links: [
            { href: '/nte/build', label: 'Builds' },
            { href: '/nte/guides/gacha-strategy', label: 'Gacha strategy' },
          ],
        },
        {
          title: 'Updates and rewards',
          description: 'Keep version updates and redeem codes moving deeper.',
          links: [
            { href: '/nte/version', label: 'Version hub' },
            { href: '/nte/redeem-codes', label: 'Redeem codes' },
          ],
        },
      ],
      ja: [
        {
          title: 'DLと入門',
          description: 'インストールと初心者導線をまず受け止めます。',
          links: [
            { href: '/nte/guides/download-install-guide', label: 'DLとインストール' },
            { href: '/nte/guides/beginner-guide', label: '初心者ガイド' },
          ],
        },
        {
          title: '育成とガチャ',
          description: '弧盤、ビルド、ガチャ戦略を実用ページへつなげます。',
          links: [
            { href: '/nte/build', label: 'ビルド' },
            { href: '/nte/guides/gacha-strategy', label: 'ガチャ戦略' },
          ],
        },
        {
          title: '更新と報酬',
          description: '更新情報と交換コードの流れを整えます。',
          links: [
            { href: '/nte/version', label: 'バージョン特集' },
            { href: '/nte/redeem-codes', label: '交換コード' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '异环首页先看什么最省时间？',
          en: 'What is the fastest starting point on the NTE homepage?',
          ja: 'NTEホームで最短の入口は？',
        },
        answer: {
          zh: '先看下载安装和新手入门，再看配装和版本更新。',
          en: 'Start with download/install and the beginner guide, then move to builds and updates.',
          ja: 'まずDLと初心者ガイド、その後にビルドと更新情報を見るのがおすすめです。',
        },
      },
    ],
  },
  sea: {
    eyebrow: { zh: '7 月 9 日公测总专题', en: 'July 9 Open Beta Hub', ja: '7月9日CBT特集' },
    title: { zh: '遗忘之海开服热词入口', en: 'Sea of Remnants launch keywords', ja: '遺忘之海ローンチ特集' },
    description: {
      zh: '把公测时间、第五人格联动、海绵宝宝、木偶捏脸和首月福利集中放进首页，先接住最强搜索词。',
      en: 'Bring the open beta date, Identity V collab, SpongeBob, face sculpting, and launch rewards to the front page.',
      ja: 'CBT時期、第5人格コラボ、スポンジボブ、顔作成、初月報酬をトップに集約します。',
    },
    chips: {
      zh: ['7/9 公测', '第五人格联动', '海绵宝宝', '木偶捏脸', '100 抽福利', '新手入坑'],
      en: ['July 9 launch', 'Identity V collab', 'SpongeBob', 'Face sculpting', '100 pulls', 'Beginner route'],
      ja: ['7/9CBT', '第五人格コラボ', 'スポンジボブ', '顔作成', '100連報酬', '初心者'],
    },
    cta: { zh: '去版本中心', en: 'Open version center', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '公测节点',
          description: '先把 7 月 9 日公测和首月节奏接住。',
          links: [
            { href: '/sea/guides/open-beta-version-center', label: '公测版本中心' },
            { href: '/sea/version', label: '版本专题' },
          ],
        },
        {
          title: '联动与角色',
          description: '第五人格、海绵宝宝和船员信息继续往下分流。',
          links: [
            { href: '/sea/guides/collaborations-guide', label: '联动总表' },
            { href: '/sea/characters', label: '角色图鉴' },
          ],
        },
        {
          title: '新手与开荒',
          description: '把新手入门和开荒路线做成更直接的下一步。',
          links: [
            { href: '/sea/guides/beginner-guide', label: '新手入门' },
            { href: '/sea/guides/launch-day-guide', label: '开服攻略' },
          ],
        },
      ],
      en: [
        {
          title: 'Open beta node',
          description: 'Catch the July 9 open beta timing and first-month momentum.',
          links: [
            { href: '/sea/guides/open-beta-version-center', label: 'Open beta center' },
            { href: '/sea/version', label: 'Version hub' },
          ],
        },
        {
          title: 'Collabs and crews',
          description: 'Route Identity V, SpongeBob, and crew queries deeper.',
          links: [
            { href: '/sea/guides/collaborations-guide', label: 'Collab matrix' },
            { href: '/sea/characters', label: 'Characters' },
          ],
        },
        {
          title: 'Starter path',
          description: 'Turn beginner and launch-route searches into clear next clicks.',
          links: [
            { href: '/sea/guides/beginner-guide', label: 'Beginner guide' },
            { href: '/sea/guides/launch-day-guide', label: 'Launch guide' },
          ],
        },
      ],
      ja: [
        {
          title: 'CBT導線',
          description: '7月9日CBTと初月の流れを受け止めます。',
          links: [
            { href: '/sea/guides/open-beta-version-center', label: 'CBT特集' },
            { href: '/sea/version', label: 'バージョン特集' },
          ],
        },
        {
          title: 'コラボと船員',
          description: '第五人格、スポンジボブ、船員情報へつなげます。',
          links: [
            { href: '/sea/guides/collaborations-guide', label: 'コラボ一覧' },
            { href: '/sea/characters', label: 'キャラ図鑑' },
          ],
        },
        {
          title: '入門ルート',
          description: '初心者ガイドと開服攻略を次のページへ送ります。',
          links: [
            { href: '/sea/guides/beginner-guide', label: '初心者ガイド' },
            { href: '/sea/guides/launch-day-guide', label: '開服攻略' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '遗忘之海先看什么最不容易踩空？',
          en: 'What should I check first for Sea of Remnants?',
          ja: '遺忘之海で最初に見るべきものは？',
        },
        answer: {
          zh: '先看公测版本中心，再看联动总表和新手入门，能最快接住最新热词。',
          en: 'Start with the open beta version center, then the collab matrix and beginner guide.',
          ja: 'まずCBT特集、次にコラボ一覧と初心者ガイドを見るのが最短です。',
        },
      },
    ],
  },
  zzz: {
    eyebrow: { zh: '3.0 版本专题入口', en: 'v3.0 Version Hub', ja: 'v3.0 バージョン特集' },
    title: { zh: '绝区零版本热词承接', en: 'ZZZ hot-topic landing hub', ja: 'ZZZ 注目トピック導線' },
    description: {
      zh: '把 v3.0、新秩序、首席跟班、突击专精、维琳娜和风属性体系集中放进首页，直接承接版本搜索词。',
      en: 'Surface v3.0, New Order, key update topics, Rupture, Velina, and the new Wind system right on the homepage.',
      ja: 'v3.0、新秩序、主要トピック、ラプチャー、ビリナ、風属性をトップでまとめて受け止めます。',
    },
    chips: {
      zh: ['v3.0 新秩序', '维琳娜', '首席跟班', '突击专精', '驱动盘', '风属性'],
      en: ['v3.0 New Order', 'Velina', 'Key update topics', 'Rupture', 'Drive Disc', 'Wind'],
      ja: ['v3.0 新秩序', 'ビリナ', '主要トピック', 'ラプチャー', 'ディスク', '風属性'],
    },
    cta: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '版本节点',
          description: '先把 3.0 核心热词和新版本信息接住，避免只停在首页标题。',
          links: [
            { href: '/zzz/version', label: '版本专题' },
            { href: '/zzz/guides/v3-0-version-guide', label: 'v3.0 完整指南' },
          ],
        },
        {
          title: '养成与配队',
          description: '把驱动盘、音擎和主流阵容串起来，直接进入可操作的培养页。',
          links: [
            { href: '/zzz/build', label: '配装推荐' },
            { href: '/zzz/guides/meta-teams-v3-guide', label: '3.0 主流配队' },
          ],
        },
        {
          title: '专精与定位',
          description: '围绕突击专精、角色定位和玩法拆解，承接更细的搜索意图。',
          links: [
            { href: '/zzz/characters', label: '角色图鉴' },
            { href: '/zzz/guides/rupture-specialty-guide', label: '突击专精' },
          ],
        },
      ],
      en: [
        {
          title: 'Version node',
          description: 'Catch the v3.0 search intent before it stops at the homepage title.',
          links: [
            { href: '/zzz/version', label: 'Version hub' },
            { href: '/zzz/guides/v3-0-version-guide', label: 'v3.0 guide' },
          ],
        },
        {
          title: 'Builds and teams',
          description: 'Connect drive discs, W-Engines, and meta comps into practical next steps.',
          links: [
            { href: '/zzz/build', label: 'Builds' },
            { href: '/zzz/guides/meta-teams-v3-guide', label: 'Meta teams' },
          ],
        },
        {
          title: 'Role focus',
          description: 'Cover Rupture, role positioning, and deeper gameplay breakdowns.',
          links: [
            { href: '/zzz/characters', label: 'Character wiki' },
            { href: '/zzz/guides/rupture-specialty-guide', label: 'Rupture guide' },
          ],
        },
      ],
      ja: [
        {
          title: 'バージョン導線',
          description: 'v3.0 の検索意図をホームタイトルで止めず、次のページへつなげます。',
          links: [
            { href: '/zzz/version', label: 'バージョン特集' },
            { href: '/zzz/guides/v3-0-version-guide', label: 'v3.0 ガイド' },
          ],
        },
        {
          title: '育成と編成',
          description: 'ディスク、Wエンジン、主流編成を実用ページにつなげます。',
          links: [
            { href: '/zzz/build', label: 'ビルド' },
            { href: '/zzz/guides/meta-teams-v3-guide', label: '主要編成' },
          ],
        },
        {
          title: '特化解説',
          description: 'ラプチャー、役割、細かな攻略理解へ進めます。',
          links: [
            { href: '/zzz/characters', label: 'キャラ図鑑' },
            { href: '/zzz/guides/rupture-specialty-guide', label: 'ラプチャー解説' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '绝区零首页先看什么最接近搜索热词？',
          en: 'What should I open first on the ZZZ homepage?',
          ja: 'ZZZのホームで最初に見るべきものは？',
        },
        answer: {
          zh: '先看版本专题，再看主流配队和突击专精，这三块最容易接住当前热词。',
          en: 'Start with the version hub, then the meta team and Rupture pages.',
          ja: 'まずバージョン特集、その後に編成とラプチャーページを見るのが最短です。',
        },
      },
    ],
  },
  wuwa: {
    eyebrow: { zh: '3.x 版本专题入口', en: 'v3.x Version Hub', ja: 'v3.x バージョン特集' },
    title: { zh: '鸣潮版本与入坑承接', en: 'WuWa version and onboarding hub', ja: '鳴潮 バージョン・入門導線' },
    description: {
      zh: '把 v3.4、v3.5、Roya Frostlands、声骸系统和新手入坑页放到首页，优先承接版本和养成词。',
      en: 'Bring v3.4, v3.5, Roya Frostlands, the Echo system, and beginner routes to the front page.',
      ja: 'v3.4、v3.5、Roya Frostlands、声骸、新手導線をトップにまとめます。',
    },
    chips: {
      zh: ['v3.4 / v3.5', 'Roya Frostlands', '声骸', '共鸣链', '新手入坑', '波片规划'],
      en: ['v3.4 / v3.5', 'Roya Frostlands', 'Echoes', 'Resonance Chain', 'Beginner route', 'Waveplate'],
      ja: ['v3.4 / v3.5', 'Roya Frostlands', '声骸', '共鳴チェーン', '初心者', '波片'],
    },
    cta: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '版本节点',
          description: '把 v3.4 / v3.5 和 Roya Frostlands 放到最前面，先承接版本搜索。',
          links: [
            { href: '/wuwa/version', label: '版本专题' },
            { href: '/wuwa/guides/v3-5-preview-guide', label: 'v3.5 前瞻' },
          ],
        },
        {
          title: '声骸养成',
          description: '围绕声骸、共鸣链和主流配装，继续向培养页分流。',
          links: [
            { href: '/wuwa/build', label: '配装推荐' },
            { href: '/wuwa/guides/roya-frostlands-guide', label: 'Roya Frostlands' },
          ],
        },
        {
          title: '新手入坑',
          description: '把开荒路线、版本回流和基础玩法整合成可直接点击的路径。',
          links: [
            { href: '/wuwa/characters', label: '角色图鉴' },
            { href: '/wuwa/guides/v3-4-version-guide', label: 'v3.4 版本' },
          ],
        },
      ],
      en: [
        {
          title: 'Version node',
          description: 'Bring v3.4 / v3.5 and Roya Frostlands to the front of search intent.',
          links: [
            { href: '/wuwa/version', label: 'Version hub' },
            { href: '/wuwa/guides/v3-5-preview-guide', label: 'v3.5 preview' },
          ],
        },
        {
          title: 'Echo builds',
          description: 'Route echo, resonance chain, and build queries into practical pages.',
          links: [
            { href: '/wuwa/build', label: 'Builds' },
            { href: '/wuwa/guides/roya-frostlands-guide', label: 'Roya Frostlands' },
          ],
        },
        {
          title: 'Starter path',
          description: 'Merge beginner routes, returner timing, and basics into a clickable path.',
          links: [
            { href: '/wuwa/characters', label: 'Character wiki' },
            { href: '/wuwa/guides/v3-4-version-guide', label: 'v3.4 version' },
          ],
        },
      ],
      ja: [
        {
          title: 'バージョン導線',
          description: 'v3.4 / v3.5 と Roya Frostlands を前面に出して検索意図を受け止めます。',
          links: [
            { href: '/wuwa/version', label: 'バージョン特集' },
            { href: '/wuwa/guides/v3-5-preview-guide', label: 'v3.5 前瞻' },
          ],
        },
        {
          title: '声骸育成',
          description: '声骸、共鳴チェーン、ビルドを実用ページへつなげます。',
          links: [
            { href: '/wuwa/build', label: 'ビルド' },
            { href: '/wuwa/guides/roya-frostlands-guide', label: 'Roya Frostlands' },
          ],
        },
        {
          title: '入門ルート',
          description: '初心者ルートと復帰導線をひとつの流れにまとめます。',
          links: [
            { href: '/wuwa/characters', label: 'キャラ図鑑' },
            { href: '/wuwa/guides/v3-4-version-guide', label: 'v3.4 版' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '鸣潮首页先看什么最实用？',
          en: 'What is the most practical starting point on the WuWa homepage?',
          ja: '鳴潮ホームで最初に見ると実用的なものは？',
        },
        answer: {
          zh: '先看版本专题和声骸系统，再看入门攻略，基本就能覆盖搜索里最常问的问题。',
          en: 'Start with the version hub and Echo system, then move to beginner guides.',
          ja: 'まずバージョン特集と声骸システム、次に入門ガイドを見るのがおすすめです。',
        },
      },
    ],
  },
  endfield: {
    eyebrow: { zh: '测试与入坑专题', en: 'Test & onboarding hub', ja: 'テスト・入門特集' },
    title: { zh: '终末地测试与下载承接', en: 'Endfield test and download hub', ja: 'Endfield テスト・DL導線' },
    description: {
      zh: '把测试节点、下载、战斗系统、基地建设和危机合约相关内容放在首页，直接接住测试与入坑搜索词。',
      en: 'Put test timing, download, combat, base building, and crisis-content pages on the homepage to catch launch intent.',
      ja: 'テスト時期、DL、戦闘、基地建設、危機契約をトップで受け止めます。',
    },
    chips: {
      zh: ['测试节点', '下载安装', '战斗系统', '基地建设', '危机合约', '干员节奏榜'],
      en: ['Test timing', 'Download/install', 'Combat system', 'Base building', 'Crisis content', 'Tier list'],
      ja: ['テスト時期', 'DL/インストール', '戦闘システム', '基地建設', '危機契約', 'Tier'],
    },
    cta: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
    tracks: {
      zh: [
        {
          title: '测试节点',
          description: '把测试时间、下载和配置要求集中收口，减少首跳流失。',
          links: [
            { href: '/endfield/version', label: '测试专题' },
            { href: '/endfield/guides/download-install-guide', label: '下载与配置' },
          ],
        },
        {
          title: '战斗与养成',
          description: '把战斗系统、角色理解和主属性规划串成下一步动作。',
          links: [
            { href: '/endfield/build', label: '配装推荐' },
            { href: '/endfield/guides/combat-system-guide', label: '战斗系统' },
          ],
        },
        {
          title: '据点与挑战',
          description: '继续承接基地建设、危机合约与更深的玩法解读。',
          links: [
            { href: '/endfield/characters', label: '角色图鉴' },
            { href: '/endfield/guides/crisis-contract-guide', label: '危机合约' },
          ],
        },
      ],
      en: [
        {
          title: 'Test timing',
          description: 'Consolidate test timing, download, and setup requirements to reduce bounce.',
          links: [
            { href: '/endfield/version', label: 'Test hub' },
            { href: '/endfield/guides/download-install-guide', label: 'Download & specs' },
          ],
        },
        {
          title: 'Combat and builds',
          description: 'Turn combat, character roles, and stat planning into the next click.',
          links: [
            { href: '/endfield/build', label: 'Builds' },
            { href: '/endfield/guides/combat-system-guide', label: 'Combat system' },
          ],
        },
        {
          title: 'Base and challenge',
          description: 'Keep base building, crisis content, and deeper gameplay notes moving.',
          links: [
            { href: '/endfield/characters', label: 'Character wiki' },
            { href: '/endfield/guides/crisis-contract-guide', label: 'Crisis contract' },
          ],
        },
      ],
      ja: [
        {
          title: 'テスト導線',
          description: 'テスト時期、DL、必要環境をまとめて離脱を減らします。',
          links: [
            { href: '/endfield/version', label: 'テスト特集' },
            { href: '/endfield/guides/download-install-guide', label: 'DLと環境' },
          ],
        },
        {
          title: '戦闘と育成',
          description: '戦闘、役割、ステータス設計を次の行動に変えます。',
          links: [
            { href: '/endfield/build', label: 'ビルド' },
            { href: '/endfield/guides/combat-system-guide', label: '戦闘システム' },
          ],
        },
        {
          title: '拠点と挑戦',
          description: '拠点建設、危機契約、深い攻略理解へ進めます。',
          links: [
            { href: '/endfield/characters', label: 'キャラ図鑑' },
            { href: '/endfield/guides/crisis-contract-guide', label: '危機契約' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '终末地首页先看什么最不容易走偏？',
          en: 'What should I check first on the Endfield homepage?',
          ja: 'Endfieldホームで最初に見るべきものは？',
        },
        answer: {
          zh: '先看测试节点和下载安装，再看战斗系统与基地建设，信息最完整。',
          en: 'Start with test timing and download/install, then move to combat and base-building.',
          ja: 'まずテスト時期とDL、その後に戦闘と基地建設を見るのが最短です。',
        },
      },
    ],
  },
  skjh: {
    eyebrow: { zh: '7 月 9 日上线总专题', en: 'July 9 Launch Hub', ja: '7月9日ローンチ特集' },
    title: { zh: '失控进化开服热词入口', en: 'Ashfall Evolution launch keywords', ja: '失控進化ローンチ特集' },
    description: {
      zh: '把上线时间、预约福利、Steam、预下载、开荒路线和多端互通 FAQ 放在首页最前面，先承接最强流量。',
      en: 'Put launch timing, reservation rewards, Steam, preload, beginner routes, and cross-play FAQ up front.',
      ja: 'ローンチ時期、事前登録報酬、Steam、事前DL、初心者ルート、クロス端末FAQを前面に出します。',
    },
    chips: {
      zh: ['7/9 上线', '预约福利', 'Steam', '预下载', '开荒路线', '多端互通'],
      en: ['July 9 launch', 'Reservation rewards', 'Steam', 'Preload', 'Beginner route', 'Cross-play'],
      ja: ['7/9ローンチ', '事前登録報酬', 'Steam', '事前DL', '初心者ルート', 'クロス端末'],
    },
    cta: { zh: '看开服攻略', en: 'View launch guides', ja: '攻略を見る' },
    tracks: {
      zh: [
        {
          title: '上线节点',
          description: '把 7 月 9 日上线和预约福利先接住。',
          links: [
            { href: '/skjh/guides/season-1-launch', label: '上线总专题' },
            { href: '/skjh/guides/launch-rewards-complete', label: '预约福利' },
          ],
        },
        {
          title: '生存与开荒',
          description: '把新手开荒、基地和资源路线继续往下导。',
          links: [
            { href: '/skjh/guides/download-crossplay-faq', label: '下载互通 FAQ' },
            { href: '/skjh/version', label: '版本专题' },
          ],
        },
        {
          title: '玩法与策略',
          description: '围绕基因流派、武器和资源优先级补齐承接。',
          links: [
            { href: '/skjh/guides/season-1-launch', label: '开服攻略' },
            { href: '/skjh/guides/launch-rewards-complete', label: '福利攻略' },
          ],
        },
      ],
      en: [
        {
          title: 'Launch node',
          description: 'Catch the July 9 launch and preregistration rewards first.',
          links: [
            { href: '/skjh/guides/season-1-launch', label: 'Launch center' },
            { href: '/skjh/guides/launch-rewards-complete', label: 'Rewards' },
          ],
        },
        {
          title: 'Survival path',
          description: 'Keep beginner routes, base building, and resource planning moving.',
          links: [
            { href: '/skjh/guides/download-crossplay-faq', label: 'Download FAQ' },
            { href: '/skjh/version', label: 'Version hub' },
          ],
        },
        {
          title: 'Strategy topics',
          description: 'Fill in gene builds, weapons, and resource priorities.',
          links: [
            { href: '/skjh/guides/season-1-launch', label: 'Launch guide' },
            { href: '/skjh/guides/launch-rewards-complete', label: 'Reward guide' },
          ],
        },
      ],
      ja: [
        {
          title: 'ローンチ導線',
          description: '7月9日ローンチと事前登録報酬を先に受け止めます。',
          links: [
            { href: '/skjh/guides/season-1-launch', label: 'ローンチ特集' },
            { href: '/skjh/guides/launch-rewards-complete', label: '事前登録報酬' },
          ],
        },
        {
          title: 'サバイバル導線',
          description: '初心者ルート、拠点、資源管理へ進めます。',
          links: [
            { href: '/skjh/guides/download-crossplay-faq', label: 'DLと互通FAQ' },
            { href: '/skjh/version', label: 'バージョン特集' },
          ],
        },
        {
          title: '攻略テーマ',
          description: '遺伝子ビルド、武器、資源優先度を補完します。',
          links: [
            { href: '/skjh/guides/season-1-launch', label: '開服攻略' },
            { href: '/skjh/guides/launch-rewards-complete', label: '報酬攻略' },
          ],
        },
      ],
    },
    faq: [
      {
        question: {
          zh: '失控进化开服前先准备什么？',
          en: 'What should I prepare before Ashfall Evolution launches?',
          ja: '失控進化のローンチ前に何を準備する？',
        },
        answer: {
          zh: '先确认下载、账号、预约福利和开荒路线，再决定要不要进更复杂的模式。',
          en: 'Check download, account, rewards, and beginner routes before choosing a harder mode.',
          ja: 'DL、アカウント、報酬、初心者ルートを先に確認してからモードを選びましょう。',
        },
      },
    ],
  },
};

// --- Route icons ---
const ROUTE_ICONS: Record<string, string> = {
  characters: '👤', weapons: '⚔️', items: '📦', 'tier-list': '🏆',
  calculator: '🔢', map: '🗺️', guides: '📖', artifacts: '🏺',
  version: '📰',
  build: '🔧', compare: '⚖️', teams: '👥', echoes: '🔮',
  'drive-discs': '💿', 'disk-sets': '💿', gacha: '🎰',
  'redeem-codes': '🎁', anomalies: '🌀',
};

// --- Helper: resolve character data ---
interface CharInfo { id: string; name: string; image: string }

function toAbs(path: string) {
  return path.startsWith('http') ? path : `${IMAGE_BASE}${path}`;
}

function getCharInfos(gameId: string, locale: SupportedLocale): CharInfo[] {
  const ids = FEATURED_CHARS[gameId];
  if (!ids?.length) return [];

  const results: CharInfo[] = [];
  switch (gameId) {
    case 'genshin':
      for (const id of ids) { const c = genshinCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getGenshinCharacterName(c, locale), image: toAbs(getGenshinCharacterImage(c)) }); }
      break;
    case 'starrail':
      for (const id of ids) { const c = starrailCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getStarRailCharacterName(c, locale), image: toAbs(getStarRailCharacterImage(c)) }); }
      break;
    case 'wuwa':
      for (const id of ids) { const c = wuwaCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getWuWaCharacterName(c, locale), image: toAbs(getWuWaCharacterImage(c)) }); }
      break;
    case 'nte':
      for (const id of ids) { const c = nteCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getNteCharacterName(c, locale), image: toAbs(getNteCharacterImage(c)) }); }
      break;
    case 'zzz':
      for (const id of ids) { const c = zzzCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getZzzCharacterName(c, locale), image: toAbs(getZzzCharacterImage(c)) }); }
      break;
    case 'guihuan':
      for (const id of ids) { const c = guihuanCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getGuihuanCharacterName(c, locale), image: toAbs(getGuihuanCharacterImage(c)) }); }
      break;
    case 'ananta':
      for (const id of ids) { const c = anantaCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getAnantaCharacterName(c, locale), image: toAbs(getAnantaCharacterImage(c)) }); }
      break;
    case 'endfield':
      for (const id of ids) { const c = endfieldCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getEndfieldCharacterName(c, locale), image: toAbs(getEndfieldCharacterImage(c)) }); }
      break;
    case 'sea':
      for (const id of ids) { const c = seaCharacters.find(x => x.id === id); if (c) results.push({ id: c.id, name: getSeaCharacterName(c, locale), image: toAbs(getSeaCharacterImage(c)) }); }
      break;
  }
  return results;
}

// --- Helper: get guides for a game ---
interface GuideInfo { id: string; title: string; summary: string }

const FEATURED_GUIDE_IDS: Record<string, string[]> = {
  genshin: ['snezhnaya-version-guide', 'lunar-reaction-guide', 'artifact-guide'],
  starrail: ['v4-4-preview-guide', 'v4-3-version-guide', 'fate-collab-guide'],
  wuwa: ['v3-5-preview-guide', 'v3-4-version-guide', 'roya-frostlands-guide'],
  nte: ['beginner-guide', 'download-install-guide', 'gacha-strategy'],
  zzz: ['v3-0-version-guide', 'meta-teams-v3-guide', 'rupture-specialty-guide'],
  guihuan: ['beginner-guide', 'download-install-guide', 'spirit-build-guide'],
  ananta: ['beginner-guide', 'download-install-guide', 'combat-system-guide'],
  endfield: ['download-install-guide', 'combat-system-guide', 'crisis-contract-guide'],
  sea: ['launch-day-guide', 'collaborations-guide', 'open-beta-version-center'],
  skjh: ['season-1-launch', 'launch-rewards-complete', 'download-crossplay-faq'],
};

function getGuideInfos(gameId: string, locale: SupportedLocale): GuideInfo[] {
  const featuredIds = FEATURED_GUIDE_IDS[gameId];
  switch (gameId) {
    case 'genshin':
      return pickFeaturedGuides(genshinGuides, featuredIds ?? [], locale, getGenshinGuideTitle, getGenshinGuideSummary);
    case 'starrail':
      return pickFeaturedGuides(starrailGuides, featuredIds ?? [], locale, getStarRailGuideTitle, getStarRailGuideSummary);
    case 'wuwa':
      return pickFeaturedGuides(wuwaGuides, featuredIds ?? [], locale, getWuWaGuideTitle, getWuWaGuideSummary);
    case 'nte':
      return pickFeaturedGuides(nteGuides, featuredIds ?? [], locale, getNteGuideTitle, getNteGuideSummary);
    case 'zzz':
      return pickFeaturedGuides(zzzGuides, featuredIds ?? [], locale, getZzzGuideTitle, getZzzGuideSummary);
    case 'guihuan':
      return pickFeaturedGuides(guihuanGuides, featuredIds ?? [], locale, getGuihuanGuideTitle, getGuihuanGuideSummary);
    case 'ananta':
      return pickFeaturedGuides(anantaGuides, featuredIds ?? [], locale, getAnantaGuideTitle, getAnantaGuideSummary);
    case 'endfield':
      return pickFeaturedGuides(endfieldGuides, featuredIds ?? [], locale, getEndfieldGuideTitle, getEndfieldGuideSummary);
    case 'sea':
      return pickFeaturedGuides(seaGuides, featuredIds ?? [], locale, getSeaGuideTitle, getSeaGuideSummary);
    case 'skjh':
      return pickFeaturedGuides(skjhGuides, featuredIds ?? [], locale, getSkjhGuideTitle, getSkjhGuideSummary);
    default:
      return [];
  }
}

function pickFeaturedGuides<T extends { id: string }>(
  guides: T[],
  featuredIds: string[],
  locale: SupportedLocale,
  getTitle: (guide: T, locale: SupportedLocale) => string,
  getSummary: (guide: T, locale: SupportedLocale) => string,
): GuideInfo[] {
  const guideMap = new Map(guides.map((guide) => [guide.id, guide]));
  const featured = featuredIds
    .map((id) => guideMap.get(id))
    .filter((guide): guide is T => Boolean(guide));
  const fallback = guides.filter((guide) => !featuredIds.includes(guide.id));
  return [...featured, ...fallback].slice(0, 3).map((guide) => ({
    id: guide.id,
    title: getTitle(guide, locale),
    summary: getSummary(guide, locale),
  }));
}

// --- Metadata ---
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const desc = GAME_DESCRIPTIONS[gameId]?.[locale] ?? `${gameName} Wiki`;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}`;

  const title = locale === 'zh'
    ? `${gameName}攻略Wiki — 角色图鉴/武器/圣遗物/攻略`
    : locale === 'ja'
      ? `${gameName}攻略Wiki — キャラ/武器/ガイド`
      : `${gameName} Wiki — Characters, Weapons, Builds & Guides`;

  return {
    title,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}`, languages },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/${locale}/${gameId}`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.jpg`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

// --- Page ---
export default async function GameHome({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  const enabledRoutes = Object.entries(gameConfig.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => route);

  const description = GAME_DESCRIPTIONS[gameId]?.[locale] ?? '';
  const about = GAME_ABOUT[gameId]?.[locale] ?? '';
  const t = HOME_MSG[locale] ?? HOME_MSG['zh']!;
  const specialCopy = SPECIAL_HOME_COPY[gameId];

  const chars = getCharInfos(gameId, locale);
  const guides = getGuideInfos(gameId, locale);

  return (
    <div>
      {/* Game Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
            <Image
              src={`/images/og/${gameId}.jpg`}
              alt={`${gameConfig.name[locale]} ${locale === 'zh' ? '游戏封面' : locale === 'ja' ? 'ゲームアイコン' : 'game cover'}`}
              width={56}
              height={56}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ color: gameConfig.theme.primary }}
          >
            {gameConfig.name[locale]}
          </h1>
        </div>
        {description && (
          <p className="text-sm leading-relaxed text-game-text-muted max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {specialCopy && (
        <section className="mb-10 overflow-hidden rounded-2xl border border-game-border bg-game-surface shadow-lg">
          <div className="border-b border-game-border bg-gradient-to-r from-game-surface-alt/70 to-transparent px-6 py-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-game-primary/15 px-3 py-1 text-xs font-semibold text-game-primary">
                {specialCopy.eyebrow[locale]}
              </span>
              <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
                {CATEGORY_LABELS.version?.[locale] ?? 'Version Hub'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-game-text">
              {specialCopy.title[locale]}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-game-text-muted">
              {specialCopy.description[locale]}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {specialCopy.chips[locale].map((chip) => (
                <span key={chip} className="rounded-full bg-game-surface px-3 py-1 text-xs text-game-text-muted">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {specialCopy.tracks && (
            <div className="border-t border-game-border px-6 py-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-game-text-muted">
                  {locale === 'zh' ? '专题展开' : locale === 'ja' ? '特集の展開' : 'Topic tracks'}
                </h3>
                <span className="text-xs text-game-text-muted">
                  {locale === 'zh' ? '把搜索词继续往下承接' : locale === 'ja' ? '検索語をさらに下へつなぐ' : 'Carry search intent deeper'}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {specialCopy.tracks[locale].map((track) => (
                  <article key={track.title} className="rounded-xl border border-game-border bg-game-surface-alt p-4">
                    <h4 className="text-base font-semibold text-game-text">{track.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-game-text-muted">
                      {track.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {track.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href as '/'}
                          className="rounded-full border border-game-border bg-game-surface px-3 py-1.5 text-xs text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 px-6 py-5 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-game-text-muted">
                {locale === 'zh' ? '优先承接入口' : locale === 'ja' ? '優先導線' : 'Priority entry points'}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/${gameId}/version` as '/'}
                  className="rounded-full bg-game-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  {specialCopy.cta[locale]}
                </Link>
                {gameId === 'sea' && (
                  <>
                    <Link href={`/${gameId}/guides/open-beta-version-center` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '公测版本中心' : locale === 'ja' ? 'CBT特集' : 'Open Beta Center'}
                    </Link>
                    <Link href={`/${gameId}/guides/collaborations-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '联动总表' : locale === 'ja' ? 'コラボ一覧' : 'Collab Matrix'}
                    </Link>
                    <Link href={`/${gameId}/guides/beginner-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '新手入门' : locale === 'ja' ? '初心者ガイド' : 'Beginner Guide'}
                    </Link>
                  </>
                )}
                {gameId === 'skjh' && (
                  <>
                    <Link href={`/${gameId}/guides/season-1-launch` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '上线总专题' : locale === 'ja' ? 'ローンチ特集' : 'Launch Center'}
                    </Link>
                    <Link href={`/${gameId}/guides/launch-rewards-complete` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '预约福利' : locale === 'ja' ? '事前登録報酬' : 'Reservation Rewards'}
                    </Link>
                    <Link href={`/${gameId}/guides/download-crossplay-faq` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '下载互通 FAQ' : locale === 'ja' ? 'DLと互通FAQ' : 'Download & Cross-play FAQ'}
                    </Link>
                  </>
                )}
                {gameId === 'zzz' && (
                  <>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '版本专题' : locale === 'ja' ? 'バージョン特集' : 'Version Hub'}
                    </Link>
                    <Link href={`/${gameId}/guides/v3-0-version-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'v3.0 完整指南' : locale === 'ja' ? 'v3.0 完全ガイド' : 'v3.0 Guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/meta-teams-v3-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '3.0 主流配队' : locale === 'ja' ? 'v3.0 編成' : 'Meta Teams'}
                    </Link>
                    <Link href={`/${gameId}/guides/rupture-specialty-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '突击专精' : locale === 'ja' ? 'ラプチャー' : 'Rupture Guide'}
                    </Link>
                  </>
                )}
                {gameId === 'wuwa' && (
                  <>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '版本专题' : locale === 'ja' ? 'バージョン特集' : 'Version Hub'}
                    </Link>
                    <Link href={`/${gameId}/guides/v3-5-preview-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'v3.5 前瞻' : locale === 'ja' ? 'v3.5 前瞻' : 'v3.5 Preview'}
                    </Link>
                    <Link href={`/${gameId}/guides/v3-4-version-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'v3.4 版本' : locale === 'ja' ? 'v3.4 バージョン' : 'v3.4 Version'}
                    </Link>
                    <Link href={`/${gameId}/guides/roya-frostlands-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'Roya Frostlands' : locale === 'ja' ? 'Roya Frostlands' : 'Roya Frostlands'}
                    </Link>
                  </>
                )}
                {gameId === 'endfield' && (
                  <>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '测试专题' : locale === 'ja' ? 'テスト特集' : 'Test Hub'}
                    </Link>
                    <Link href={`/${gameId}/guides/download-install-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '下载与配置' : locale === 'ja' ? 'DLと環境' : 'Download & Specs'}
                    </Link>
                    <Link href={`/${gameId}/guides/combat-system-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '战斗系统' : locale === 'ja' ? '戦闘システム' : 'Combat Guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/crisis-contract-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '危机合约' : locale === 'ja' ? '危機契約' : 'Crisis Contract'}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-game-border bg-game-surface-alt p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-text">
                {locale === 'zh' ? '补充问答' : locale === 'ja' ? '補足Q&A' : 'Supporting FAQ'}
              </h3>
              <div className="space-y-3">
                {specialCopy.faq.map((faq) => (
                  <details key={faq.question[locale]} className="rounded-lg border border-game-border bg-game-surface">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-game-text">
                      {faq.question[locale]}
                    </summary>
                    <div className="border-t border-game-border px-3 py-2 text-sm leading-relaxed text-game-text-muted">
                      {faq.answer[locale]}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Navigation Grid */}
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enabledRoutes.map((route) => (
          <Link
            key={route}
            href={`/${gameId}/${route}` as '/'}
            className="group flex items-center gap-3 rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary/50 hover:shadow-lg"
          >
            <span className="text-2xl flex-shrink-0">
              {ROUTE_ICONS[route] ?? '📋'}
            </span>
            <div>
              <h2 className="font-semibold text-game-text group-hover:text-game-primary transition-colors">
                {CATEGORY_LABELS[route]?.[locale] ?? route}
              </h2>
            </div>
          </Link>
        ))}
      </div>

      {/* Featured Characters */}
      {chars.length > 0 && (
        <section className="mb-10">
          <h2
            className="mb-4 text-xl font-bold"
            style={{ color: gameConfig.theme.primary }}
          >
            {t.featuredTitle}
          </h2>
          <div className="flex flex-wrap gap-3">
            {chars.map((char) => (
              <Link
                key={char.id}
                href={`/${gameId}/characters/${char.id}` as '/'}
                className="group flex items-center gap-2.5 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  <Image
                    src={char.image}
                    alt={char.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="text-sm font-medium text-game-text group-hover:text-game-primary">
                  {char.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Guides */}
      {guides.length > 0 && (
        <section className="mb-10">
          <h2
            className="mb-4 text-xl font-bold"
            style={{ color: gameConfig.theme.primary }}
          >
            {t.guidesTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={`/${gameId}/guides/${guide.id}` as '/'}
                className="group rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary/50 hover:shadow-lg"
              >
                <h3 className="mb-1.5 font-semibold text-game-text group-hover:text-game-primary line-clamp-2">
                  {guide.title}
                </h3>
                {guide.summary && (
                  <p className="text-sm text-game-text-muted line-clamp-2">
                    {guide.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* SEO About Section */}
      {about && (
        <section className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {t.aboutTitle}
          </h2>
          <p className="leading-relaxed text-game-text-muted">
            {about}
          </p>
        </section>
      )}

      {/* Quick Navigation (SEO internal links) */}
      <div className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-game-text">
          {t.quickNavTitle}
        </h2>
        <div className="flex flex-wrap gap-2">
          {enabledRoutes.map((route) => (
            <Link
              key={`link-${route}`}
              href={`/${gameId}/${route}` as '/'}
              className="rounded-full bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:text-game-primary hover:bg-game-primary/10"
            >
              {ROUTE_ICONS[route] ?? ''}{' '}
              {CATEGORY_LABELS[route]?.[locale] ?? route}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

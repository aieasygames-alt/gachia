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
import { buildLocalizedAlternates } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';
const META_MIN_LENGTH = 150;
const META_SUFFIX: Record<SupportedLocale, string> = {
  zh: '同时收录版本专题、图鉴页、攻略页和实用工具入口，方便继续深入浏览与查找。',
  en: 'It also links to version hubs, character pages, guides, and useful tools for deeper browsing.',
  ja: 'さらに版本特集、図鑑、攻略、実用ツールへの導線もまとめています。',
};

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
    zh: '原神角色图鉴、武器数据库、圣遗物推荐与攻略百科，覆盖 6.x Nod-Krai 区域，整理 116+ 角色属性、技能、突破材料、命座、配队推荐、材料路线、交互地图和版本热点，方便你快速查资料、规划培养并持续跟进版本变化，同时附版本专题和实用入口。',
    en: 'Genshin Impact character builds, weapon database, artifact recommendations, and guides up to v6.x Nod-Krai. Browse 116+ characters, team comps, maps, materials, and version topics for faster farming and build planning.',
    ja: '原神のキャラビルド、武器データベース、聖遺物おすすめ、攻略百科をまとめ、v6.x Nod-Krai まで対応。116+ キャラの性能、突破素材、命ノ星座、編成、素材ルート、インタラクティブマップ、版本トピックを一度に確認でき、育成計画にも役立ちます。版本特集と実用導線も整理済みです。',
  },
  starrail: {
    zh: '崩坏：星穹铁道角色图鉴、光锥数据库、遗器推荐与攻略百科，覆盖 4.x Planarcadia 星球，整理 86+ 角色命途、技能、行迹、遗器搭配、配队方案、伤害计算器和版本专题，适合抽卡前、养成期与版本回流时快速查阅，并补充联动和实用工具入口。',
    en: 'Honkai: Star Rail character builds, light cone database, relic recommendations, and guides up to v4.x Planarcadia. Browse 86+ characters, Paths, traces, relic sets, team comps, tools, and version topics in one place.',
    ja: '崩壊：スターレイルのキャラビルド、光円錐データベース、遺物おすすめ、攻略百科を整理し、v4.x Planarcadia に対応。86+ キャラの運命、軌跡、遺物、編成、ダメージ計算、版本特集をまとめて確認でき、育成と周回の判断に使えます。コラボ情報と便利ツールも掲載しています。',
  },
  wuwa: {
    zh: '鸣潮角色图鉴、武器数据、声骸推荐与攻略百科，覆盖 3.x Roya Frostlands，整理 48+ 角色共鸣链、技能、武器、声骸套装、Tune Break 战斗系统、配队思路和版本热点，方便你查找养成、刷图和版本更新入口，并继续查看版本专题。',
    en: 'Wuthering Waves character builds, weapon database, echo recommendations, and guides up to v3.x Roya Frostlands. Browse 48+ characters, Resonance Chain notes, echo sets, teams, combat tips, and version topics for progression.',
    ja: '鳴潮のキャラビルド、武器データベース、エコーおすすめ、攻略百科をまとめ、v3.x Roya Frostlands に対応。48+ キャラの共鳴チェーン、武器、エコーセット、Tune Break 戦闘、編成、版本トピックをすぐ確認でき、周回導線も分かります。前瞻や実用ページも探しやすいです。',
  },
  nte: {
    zh: '异环（NTE）角色图鉴、武器数据、光盘推荐、兑换码和祈愿模拟，已正式发布。页面覆盖 19 个可玩角色、下载安装、新手入门、Boss 攻略、伤害公式和养成路线，适合开服期快速查资料、规划资源并确认当前热门玩法，同时附版本专题和福利入口。',
    en: 'Neverness to Everness character guides, weapon data, disk set recommendations, redeem codes, and gacha simulator. Now released with 19 playable characters, download help, beginner routes, boss guides, and damage formulas.',
    ja: '異環（NTE）のキャラ図鑑、武器データ、ディスクおすすめ、交換コード、ガチャシミュレーターを提供し、正式リリース済みです。19体のキャラ、DL、入門、ボス攻略、ダメージ計算、育成導線をまとめて確認でき、開服期の準備に役立ちます。版本特集や報酬導線もあります。',
  },
  zzz: {
    zh: '绝区零代理人图鉴、音擎数据、驱动盘推荐与攻略百科，覆盖至 2.8 版本，整理 56+ 代理人、职业定位、属性、技能、驱动盘套装、最佳配队和伤害思路，适合版本更新后快速查看与继续规划养成，并配有版本专题和计算器入口。',
    en: 'Zenless Zone Zero agent builds, W-Engines, drive discs, and guides up to v2.8. Browse 56+ agents, specialties, attributes, best team comps, and patch topics for efficient build planning.',
    ja: 'ゼンレスゾーンゼロのエージェントビルド、Wエンジンデータ、ドライブディスクおすすめ、攻略百科を整理し、v2.8 まで対応。56+ エージェントの職業、属性、ディスク、編成、版本トピックをまとめて確認でき、効率よく育成できます。計算機や特集導線も整えています。',
  },
  guihuan: {
    zh: '归环角色图鉴、武器数据与攻略百科，整理全部可用角色的技能数据、定位说明、配装推荐和成长思路，帮助你更快了解游戏基础玩法、完成入门判断并找到适合当前版本的培养方向，同时持续补充图鉴与攻略专题。',
    en: 'Guihuan character builds, weapon database, and guides. Full skill data, role notes, build recommendations, and progression ideas for every available character.',
    ja: '帰環のキャラビルド、武器データ、攻略百科をまとめ、全キャラのスキルデータ、役割、ビルド、おすすめ育成を整理。ゲームの基礎理解と現在の育成方針を素早くつかめるので、迷わず次のページへ進めます。図鑑と攻略特集も継続更新中です。',
  },
  ananta: {
    zh: '无限大角色图鉴、武器数据与攻略百科，介绍网易开发的无抽卡开放世界玩法、角色获取方式、基础战斗理解和养成路线，方便玩家在了解游戏设定后快速进入角色与武器页面并继续查看攻略入口，还能补看版本专题。',
    en: 'Ananta character builds, weapon database, and guides. This NetEase open-world game uses a no-gacha model, with unlock paths, progression notes, weapons, and build planning essentials.',
    ja: '無限大のキャラビルド、武器データ、攻略百科を整理し、NetEase のガチャなしオープンワールド設計、キャラ解放方法、基礎戦闘、育成導線をわかりやすく案内します。入門後の次のページも探しやすい構成で、版本特集も見つけやすいです。',
  },
  endfield: {
    zh: '《明日方舟：终末地》是鹰角网络开发的开放世界动作 RPG，背景来自明日方舟 IP。页面介绍博士在塔洛斯 II 号星建立据点、指挥干员实时战斗、探索地图与版本节点，方便测试期和入坑期快速查阅并继续进入攻略页，同时保留测试专题入口。',
    en: 'Arknights: Endfield is an open-world action RPG by Hypergryph. Pages cover Talos II base building, operator combat, exploration, test timing, and launch topics players search for first.',
    ja: 'アークナイツ：エンドフィールドはハイパーグリフ開発のオープンワールドアクションRPG。ドクターによるタロスII号星での拠点建設、リアルタイム戦闘、探索、テスト時期、入門導線を整理しています。初心者が次に開くページも見つけやすく、実用導線も明確です。',
  },
  sea: {
    zh: '遗忘之海是网易 Joker Studio 自研的海洋冒险开放世界 RPG，PC 端已于 2026 年 7 月 9 日公测。Gachia 整理角色、捏脸、云捏脸、PC 配置、下载安装、开服福利和开荒攻略，方便先看总览再深入了解角色与系统，并补看公测专题。',
    en: 'Sea of Remnants is an ocean adventure RPG by NetEase Joker Studio. Gachia tracks crews, face sculpting, PC specs, download/install, rewards, and beginner routes.',
    ja: 'シー・オブ・レムナンツはNetEase Joker Studioの海洋アドベンチャー型オープンワールドRPG。PC版は2026年7月9日にCBT開始。Gachiaではキャラ、顔作成、クラウド作成、PC環境、DL、報酬、開荒ルートを整理します。先に全体像を把握したい人向けで、公測特集も見やすいです。',
  },
  skjh: {
    zh: '失控进化是腾讯游戏发行、无端科技研发并获得 Rust 正版玩法授权的开放世界多人生存对抗游戏。Gachia 整理公测时间、开荒路线、基地建设、资源科技树、基因流派、武器和福利活动，便于玩家快速上手并找到后续攻略入口，同时补充公测专题。',
    en: 'Ashfall Evolution is an open-world survival game published by Tencent Games and developed by Wuduan Technology. Gachia covers launch timing, beginner routes, base building, resources, weapons, and rewards.',
    ja: '失控進化はTencent Games配信、無端科技開発、Rust正式ライセンスの多人数サバイバル対戦型オープンワールドゲームです。Gachiaでは公測時期、開荒ルート、拠点建設、資源、遺伝子ビルド、武器、報酬を整理します。初心者が次に見るべきページも案内し、公測特集へもつなげます。',
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
    zh: '异环（Neverness to Everness）是 Hotta Studio 基于 UE5 开发的超自然开放世界游戏，2026年4月已正式发布。Gachia 提供最全的异环数据库，包含19个可玩角色的图鉴、武器数据、光盘套装推荐、下载安装、新手入门、Boss 攻略、伤害公式、兑换码汇总与祈愿模拟。',
    en: 'Neverness to Everness (NTE) is a supernatural open-world game by Hotta Studio built on UE5, officially released in April 2026. Gachia offers the most comprehensive NTE database with 19 playable character guides, weapon data, disk set recommendations, download/install help, beginner routes, boss guides, damage formulas, redeem codes, and a gacha simulator.',
    ja: '異環（Neverness to Everness）はHotta StudioのUE5製超自然オープンワールドゲーム、2026年4月正式リリース。Gachiaは最も充実したNTEデータベースを提供。19体のプレイアブルキャラ図鑑、武器データ、ディスクセットおすすめ、DL/入門、ボス攻略、ダメージ計算、交換コード、ガチャシミュレーターを網羅。',
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
    zh: '遗忘之海是一款极具美术风格的海洋冒险RPG，采用回合制战斗、即时海战与 Roguelite 遗忘之旅多模式。PC端2026年7月9日公测，移动端2026年7月23日10:00首发。Gachia 会持续整理移动端入口、首周运营、兑换码、角色与 BOSS 档案、捏脸、配置要求、开荒 Build 和海区探索路线。',
    en: 'Sea of Remnants is a stylized ocean adventure RPG with turn-based combat, real-time naval battles, and Roguelite Remnant Journey runs. PC open beta started on July 9, 2026, and mobile launched on July 23, 2026 at 10:00. Gachia tracks mobile entry, troubleshooting, cross-progress, codes, crews, bosses, builds, specs, and sea-region routes.',
    ja: 'ターン制バトルとリアルタイム海戦を特徴とする海洋アドベンチャーRPG。PC版は2026年7月9日にオープンベータ開始、モバイル版は2026年7月23日10:00に開始。Gachiaではモバイル導線、トラブル対応、連携、交換コード、キャラとボス、ビルド、環境、海域ルートを整理します。',
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
  wuwa: ['jiyan', 'yinlin', 'jinhsi', 'changli', 'zhezhi'],
  nte: ['chiz', 'aurelia', 'skia', 'haniel', 'sakiri', 'nanally'],
  zzz: ['ellen', 'zhu-yuan', 'miyabi', 'burnice', 'caesar'],
  guihuan: [],
  ananta: [],
  endfield: ['laevatain', 'ardelia', 'tangtang', 'endministrator', 'lifeng'],
  sea: ['traveler', 'ais', 'little-axe'],
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
    title: { zh: '原神版本重点入口', en: 'Genshin hot-topic landing hub', ja: '原神 注目トピック導線' },
    description: {
      zh: '把月之八、桑多涅、地区探索和圣遗物配装集中放进首页，先覆盖当前版本和养成高频问题。',
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
          description: '先整理版本前瞻和核心版本重点。',
          links: [
            { href: '/genshin/version', label: '版本专题' },
            { href: '/genshin/guides/snezhnaya-version-guide', label: '版本指南' },
          ],
        },
        {
          title: '养成与配装',
          description: '一起查看角色、武器和圣遗物培养建议。',
          links: [
            { href: '/genshin/build', label: '配装推荐' },
            { href: '/genshin/artifacts', label: '圣遗物图鉴' },
          ],
        },
        {
          title: '地图与机制',
          description: '继续查看地区探索和新机制攻略。',
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
          description: 'Continue into practical character, weapon, and artifact pages.',
          links: [
            { href: '/genshin/build', label: 'Builds' },
            { href: '/genshin/artifacts', label: 'Artifacts' },
          ],
        },
        {
          title: 'Map and mechanics',
          description: 'Continue into region exploration and system guides.',
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
    eyebrow: { zh: '4.4 已上线专题入口', en: 'v4.4 Live Hub', ja: 'v4.4 実装特集' },
    title: { zh: '星穹铁道 4.4 / Fate 联动重点入口', en: 'Star Rail v4.4 / Fate collab hub', ja: 'スターレイル v4.4 / Fate導線' },
    description: {
      zh: '把 Himeko Nova、Fate/stay night 联动、Rin/Gilgamesh、兑换码和星琼规划放到首页第一跳。',
      en: 'Surface Himeko Nova, Fate/stay night, Rin/Gilgamesh, codes, and Jade planning directly on the homepage.',
      ja: 'Himeko Nova、Fate/stay night、Rin/Gilgamesh、コード、星玉計画をトップで受け止めます。',
    },
    chips: {
      zh: ['4.4 已上线', 'Himeko Nova', 'Fate 联动', 'Rin/Gilgamesh', '兑换码', '卡池规划'],
      en: ['v4.4 live', 'Himeko Nova', 'Fate collab', 'Rin/Gilgamesh', 'Codes', 'Banner planning'],
      ja: ['v4.4実装', 'Himeko Nova', 'Fateコラボ', 'Rin/Gilgamesh', 'コード', 'バナー計画'],
    },
    cta: { zh: '去 4.4 专题', en: 'Open v4.4 hub', ja: 'v4.4特集へ' },
    tracks: {
      zh: [
        { title: '4.4 节点', description: '先覆盖已上线版本、Himeko Nova 和联动重点问题。', links: [{ href: '/starrail/version', label: '4.4 专题' }, { href: '/starrail/guides/himeko-nova-fate-pull-plan', label: 'Himeko Nova 规划' }] },
        { title: 'Fate 联动', description: '继续查看 Saber、Archer、Rin/Gilgamesh 和奖励规划。', links: [{ href: '/starrail/guides/fate-collab-guide', label: 'Fate 联动 FAQ' }, { href: '/starrail/redeem-codes', label: '兑换码' }] },
        { title: '抽卡资源', description: '把遗器、光锥、配队和星琼缺口串成下一步。', links: [{ href: '/starrail/build', label: '配装推荐' }, { href: '/starrail/guides/banner-schedule-guide', label: '卡池规划' }] },
      ],
      en: [
        { title: 'v4.4 node', description: 'Catch the live patch, Himeko Nova, and collab intent first.', links: [{ href: '/starrail/version', label: 'v4.4 hub' }, { href: '/starrail/guides/himeko-nova-fate-pull-plan', label: 'Himeko Nova plan' }] },
        { title: 'Fate collab', description: 'Route Saber, Archer, Rin/Gilgamesh, and reward planning.', links: [{ href: '/starrail/guides/fate-collab-guide', label: 'Fate FAQ' }, { href: '/starrail/redeem-codes', label: 'Codes' }] },
        { title: 'Pull resources', description: 'Connect relics, light cones, teams, and Jade gaps.', links: [{ href: '/starrail/build', label: 'Builds' }, { href: '/starrail/guides/banner-schedule-guide', label: 'Banner planning' }] },
      ],
      ja: [
        { title: 'v4.4導線', description: '実装版本、Himeko Nova、コラボ検索を先に受け止めます。', links: [{ href: '/starrail/version', label: 'v4.4特集' }, { href: '/starrail/guides/himeko-nova-fate-pull-plan', label: 'Himeko Nova計画' }] },
        { title: 'Fateコラボ', description: 'Saber、Archer、Rin/Gilgamesh、報酬計画へつなげます。', links: [{ href: '/starrail/guides/fate-collab-guide', label: 'Fate FAQ' }, { href: '/starrail/redeem-codes', label: 'コード' }] },
        { title: 'ガチャ資源', description: '遺物、光円錐、編成、星玉不足を次の導線にします。', links: [{ href: '/starrail/build', label: 'ビルド' }, { href: '/starrail/guides/banner-schedule-guide', label: 'バナー計画' }] },
      ],
    },
    faq: [
      { question: { zh: '星铁首页现在先看什么？', en: 'What should I open first now?', ja: '今ホームで最初に見るべきものは？' }, answer: { zh: '先看 4.4 专题和 Fate 联动，再看兑换码、卡池规划和配装。', en: 'Start with the v4.4 hub and Fate collab, then codes, banner planning, and builds.', ja: 'まずv4.4特集とFateコラボ、その後コード、バナー計画、ビルドへ。' } },
    ],
  },
  nte: {
    eyebrow: { zh: '1.2「999 Nights」入口', en: 'v1.2 999 Nights Hub', ja: 'v1.2 999 Nights導線' },
    title: { zh: '异环 1.2 / Shinku / Iroi 重点入口', en: 'NTE v1.2 / Shinku / Iroi hub', ja: 'NTE v1.2 / Shinku / Iroi導線' },
    description: {
      zh: '把 999 Nights、Shinku 当前池、Iroi 预热、兑换码、Steam/download 和下载安装入口一起前置。',
      en: 'Put 999 Nights, Shinku, Iroi, codes, Steam/download intent, and install help up front.',
      ja: '999 Nights、Shinku、Iroi、コード、Steam/DL、インストール導線を前面に出します。',
    },
    chips: {
      zh: ['1.2 已上线', '999 Nights', 'Shinku', 'Iroi', '兑换码', 'Steam/download'],
      en: ['v1.2 live', '999 Nights', 'Shinku', 'Iroi', 'Codes', 'Steam/download'],
      ja: ['v1.2実装', '999 Nights', 'Shinku', 'Iroi', 'コード', 'Steam/DL'],
    },
    cta: { zh: '去 1.2 专题', en: 'Open v1.2 hub', ja: 'v1.2特集へ' },
    tracks: {
      zh: [
        { title: '版本与角色', description: '优先整理 999 Nights、Shinku 和 Iroi 相关问题。', links: [{ href: '/nte/version', label: '1.2 专题' }, { href: '/nte/guides/shinku-iroi-pull-plan', label: 'Shinku vs Iroi' }] },
        { title: '抽卡与福利', description: '把兑换码和抽卡策略接到可执行页面。', links: [{ href: '/nte/redeem-codes', label: '兑换码' }, { href: '/nte/guides/gacha-strategy', label: '抽卡策略' }] },
        { title: '模式与入门', description: 'Steam/download 用户先确认官方入口，再看 999 Nights 每日路线。', links: [{ href: '/nte/guides/download-install-guide', label: '下载安装' }, { href: '/nte/guides/999-nights-mode-guide', label: '999 Nights' }] },
      ],
      en: [
        { title: 'Patch and characters', description: 'Catch 999 Nights, Shinku, and Iroi searches first.', links: [{ href: '/nte/version', label: 'v1.2 hub' }, { href: '/nte/guides/shinku-iroi-pull-plan', label: 'Shinku vs Iroi' }] },
        { title: 'Pulls and rewards', description: 'Route codes and gacha strategy into practical pages.', links: [{ href: '/nte/redeem-codes', label: 'Codes' }, { href: '/nte/guides/gacha-strategy', label: 'Gacha strategy' }] },
        { title: 'Mode and start', description: 'Steam/download users need official entry, then the 999 Nights daily route.', links: [{ href: '/nte/guides/download-install-guide', label: 'Download/install' }, { href: '/nte/guides/999-nights-mode-guide', label: '999 Nights' }] },
      ],
      ja: [
        { title: '版本とキャラ', description: '999 Nights、Shinku、Iroi検索を先に受け止めます。', links: [{ href: '/nte/version', label: 'v1.2特集' }, { href: '/nte/guides/shinku-iroi-pull-plan', label: 'Shinku vs Iroi' }] },
        { title: 'ガチャと報酬', description: 'コードとガチャ戦略を実用ページへつなげます。', links: [{ href: '/nte/redeem-codes', label: 'コード' }, { href: '/nte/guides/gacha-strategy', label: 'ガチャ戦略' }] },
        { title: 'モードと入門', description: 'Steam/DLユーザーは公式入口を確認し、999 Nightsの毎日ルートへ。', links: [{ href: '/nte/guides/download-install-guide', label: 'DLとインストール' }, { href: '/nte/guides/999-nights-mode-guide', label: '999 Nights' }] },
      ],
    },
    faq: [
      { question: { zh: '异环首页现在先看哪？', en: 'What should I open first for NTE?', ja: 'NTEホームで最初に見るべきものは？' }, answer: { zh: '先看 1.2 / 999 Nights，再看 Shinku、Iroi、兑换码和下载安装。', en: 'Start with v1.2 / 999 Nights, then Shinku, Iroi, codes, and download/install.', ja: 'まずv1.2 / 999 Nights、その後Shinku、Iroi、コード、DLへ。' } },
    ],
  },
  sea: {
    eyebrow: { zh: '7 月 23 日移动端首发', en: 'July 23 Mobile Launch', ja: '7月23日モバイル開始' },
    title: { zh: '遗忘之海官网入口｜移动端首发、Wiki、开服攻略', en: 'Sea of Remnants official hub | mobile launch, wiki, launch guide', ja: '遺忘之海 公式導線｜モバイル開始・Wiki・開服攻略' },
    description: {
      zh: '这里整理 7 月 23 日移动端首发后的官网入口、Wiki、首周任务、下载安装、角色图鉴和 gamescom demo 相关信息。',
      en: 'Find the July 23 mobile launch, official hub, wiki, week-one tasks, download/install help, character wiki, and gamescom demo coverage in one place.',
      ja: '7月23日のモバイル開始後に必要な公式入口、Wiki、初週タスク、DL、キャラ図鑑、gamescom demo情報をまとめています。',
    },
    chips: {
      zh: ['7/23 首发', '移动端', '首周运营', 'gamescom demo', '下载安装', '节奏榜'],
      en: ['July 23', 'Mobile', 'Live ops', 'gamescom demo', 'Download/install', 'Tier list'],
      ja: ['7/23', 'モバイル', '初週運営', 'gamescom demo', 'DL', 'Tier'],
    },
    cta: { zh: '去移动端首发 FAQ', en: 'Open mobile launch FAQ', ja: 'モバイルFAQへ' },
    tracks: {
      zh: [
        {
          title: '移动端首发',
          description: '先确认移动端入口、账号互通、设备配置和首日常见问题。',
          links: [
            { href: '/sea/guides/mobile-launch-guide', label: '移动端 FAQ' },
            { href: '/sea/guides/pc-mobile-cross-progression-faq', label: '互通 FAQ' },
          ],
        },
        {
          title: '首周运营',
          description: '查看热修、号角、大脸币、探索查漏和 gamescom demo 相关内容。',
          links: [
            { href: '/sea/guides/week-one-live-ops-overview', label: '首周总览' },
            { href: '/sea/guides/mobile-troubleshooting-guide', label: '首日排错' },
          ],
        },
        {
          title: '茉莉与进阶',
          description: '查看茉莉开荒、N3/深渊进阶路线和角色图鉴。',
          links: [
            { href: '/sea/guides/molly-starter-team-guide', label: '茉莉首发队' },
            { href: '/sea/guides/n3-abyss-week-one-route', label: 'N3 / 深渊' },
            { href: '/sea/characters', label: '角色图鉴' },
          ],
        },
      ],
      en: [
        {
          title: 'Mobile launch',
          description: 'Check mobile entry, account setup, specs, and first-day troubleshooting.',
          links: [
            { href: '/sea/guides/mobile-launch-guide', label: 'Mobile FAQ' },
            { href: '/sea/guides/pc-mobile-cross-progression-faq', label: 'Cross-progress' },
          ],
        },
        {
          title: 'Week-one live ops',
          description: 'Review hotfixes, Horns, Face Coins, exploration cleanup, and gamescom demo coverage.',
          links: [
            { href: '/sea/guides/week-one-live-ops-overview', label: 'Live-ops hub' },
            { href: '/sea/guides/mobile-troubleshooting-guide', label: 'Troubleshooting' },
          ],
        },
        {
          title: 'Molly and progression',
          description: 'Open Molly starter teams, N3/Abyss progression, and the character wiki.',
          links: [
            { href: '/sea/guides/molly-starter-team-guide', label: 'Molly teams' },
            { href: '/sea/guides/n3-abyss-week-one-route', label: 'N3 / Abyss' },
            { href: '/sea/characters', label: 'Characters' },
          ],
        },
      ],
      ja: [
        {
          title: 'モバイル開始',
          description: 'モバイル入口、アカウント、環境、初日のよくある問題を確認できます。',
          links: [
            { href: '/sea/guides/mobile-launch-guide', label: 'モバイルFAQ' },
            { href: '/sea/guides/pc-mobile-cross-progression-faq', label: '連携FAQ' },
          ],
        },
        {
          title: '初週運営',
          description: 'Hotfix、Horn、Face Coin、探索漏れ、gamescom demo関連情報を確認できます。',
          links: [
            { href: '/sea/guides/week-one-live-ops-overview', label: '初週総覧' },
            { href: '/sea/guides/mobile-troubleshooting-guide', label: '初日対応' },
          ],
        },
        {
          title: 'Mollyと進行',
          description: 'Molly編成、N3/深淵、キャラ図鑑を確認できます。',
          links: [
            { href: '/sea/guides/molly-starter-team-guide', label: 'Molly編成' },
            { href: '/sea/guides/n3-abyss-week-one-route', label: 'N3 / Abyss' },
            { href: '/sea/characters', label: 'キャラ図鑑' },
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
          zh: '先看公测版本中心，再看开服攻略、下载安装和队伍思路，能最快找到当前重点。',
          en: 'Start with the open beta version center, then launch guide, download/install, and team-building pages.',
          ja: 'まずCBT特集、次に開服攻略、DL、編成案を見るのが最短です。',
        },
      },
      {
        question: {
          zh: '遗忘之海官网入口和 Wiki 应该先看哪？',
          en: 'Where should I start for the Sea of Remnants official hub and wiki?',
          ja: '遺忘之海の公式導線とWikiはどこから見ればいいですか？',
        },
        answer: {
          zh: '先从首页的版本中心入口进入，再往下看开服攻略、下载安装、角色图鉴和节奏榜。',
          en: 'Start from the version center on the homepage, then move into launch guides, download/install, characters, and tier list pages.',
          ja: 'まずホームのバージョン特集から入り、その後に開服攻略、DL、キャラ図鑑、Tierへ進んでください。',
        },
      },
    ],
  },
  zzz: {
    eyebrow: { zh: '3.1 / 2 周年专题入口', en: 'v3.1 / 2nd Anniversary Hub', ja: 'v3.1 / 2周年導線' },
    title: { zh: '绝区零 3.1、周年与 Xbox 入坑重点入口', en: 'ZZZ v3.1, anniversary, and Xbox onboarding hub', ja: 'ZZZ v3.1・周年・Xbox導線' },
    description: {
      zh: '把 The Long Goodbye、7 月 29 日、2 周年、Remielle/Sigrid、Microsoft Store、Xbox Play Anywhere 和 Steam 入坑放在首页第一跳。',
      en: 'Surface The Long Goodbye, July 29, the 2nd anniversary, Remielle/Sigrid, Microsoft Store, Xbox Play Anywhere, and Steam onboarding.',
      ja: 'The Long Goodbye、7月29日、2周年、Remielle/Sigrid、Microsoft Store、Xbox Play Anywhere、Steam入門をトップで受け止めます。',
    },
    chips: {
      zh: ['3.1 7/29', 'The Long Goodbye', '2 周年', 'Remielle/Sigrid', 'Xbox', 'Microsoft Store'],
      en: ['v3.1 July 29', 'The Long Goodbye', '2nd anniversary', 'Remielle/Sigrid', 'Xbox', 'Microsoft Store'],
      ja: ['v3.1 7/29', 'The Long Goodbye', '2周年', 'Remielle/Sigrid', 'Xbox', 'Microsoft Store'],
    },
    cta: { zh: '去 3.1 专题', en: 'Open v3.1 hub', ja: 'v3.1特集へ' },
    tracks: {
      zh: [
        { title: '3.1 节点', description: '先整理 The Long Goodbye、周年和新代理人相关问题。', links: [{ href: '/zzz/version', label: '3.1 专题' }, { href: '/zzz/guides/anniversary-rewards-codes-plan', label: '周年奖励' }] },
        { title: '平台入坑', description: 'Steam、Microsoft Store、Xbox 用户先看账号与下载。', links: [{ href: '/zzz/guides/v3-1-anniversary-xbox-guide', label: '3.1 / 周年 FAQ' }, { href: '/zzz/redeem-codes', label: '兑换码' }] },
        { title: '养成与配队', description: '把周年回流继续送到配队、驱动盘和养成页。', links: [{ href: '/zzz/guides/meta-teams-v3-guide', label: '主流配队' }, { href: '/zzz/drive-discs', label: '驱动盘' }] },
      ],
      en: [
        { title: 'v3.1 node', description: 'Catch The Long Goodbye, anniversary, and new-agent searches.', links: [{ href: '/zzz/version', label: 'v3.1 hub' }, { href: '/zzz/guides/anniversary-rewards-codes-plan', label: 'Rewards plan' }] },
        { title: 'Platform starters', description: 'Steam, Microsoft Store, and Xbox users need account and download help.', links: [{ href: '/zzz/guides/v3-1-anniversary-xbox-guide', label: 'v3.1 FAQ' }, { href: '/zzz/redeem-codes', label: 'Codes' }] },
        { title: 'Builds and teams', description: 'Route anniversary returners into teams, discs, and progression.', links: [{ href: '/zzz/guides/meta-teams-v3-guide', label: 'Meta teams' }, { href: '/zzz/drive-discs', label: 'Drive discs' }] },
      ],
      ja: [
        { title: 'v3.1導線', description: 'The Long Goodbye、周年、新エージェント検索を受け止めます。', links: [{ href: '/zzz/version', label: 'v3.1特集' }, { href: '/zzz/guides/anniversary-rewards-codes-plan', label: '周年報酬' }] },
        { title: 'プラットフォーム入門', description: 'Steam、Microsoft Store、Xbox勢はアカウントとDLから。', links: [{ href: '/zzz/guides/v3-1-anniversary-xbox-guide', label: 'v3.1 FAQ' }, { href: '/zzz/redeem-codes', label: 'コード' }] },
        { title: '育成と編成', description: '周年復帰勢を編成、ディスク、育成へつなげます。', links: [{ href: '/zzz/guides/meta-teams-v3-guide', label: '主要編成' }, { href: '/zzz/drive-discs', label: 'ディスク' }] },
      ],
    },
    faq: [
      { question: { zh: '绝区零首页现在先看什么？', en: 'What should I open first on the ZZZ homepage?', ja: 'ZZZホームで最初に見るべきものは？' }, answer: { zh: '先看 3.1 / 2 周年专题，再看平台入坑 FAQ、兑换码和主流配队。', en: 'Start with the v3.1 / anniversary hub, then platform FAQ, codes, and meta teams.', ja: 'まずv3.1 / 周年特集、その後平台FAQ、コード、主要編成へ。' } },
    ],
  },
  wuwa: {
    eyebrow: { zh: '3.x 版本专题入口', en: 'v3.x Version Hub', ja: 'v3.x バージョン特集' },
    title: { zh: '鸣潮版本与入坑重点入口', en: 'WuWa version and onboarding hub', ja: '鳴潮 バージョン・入門導線' },
    description: {
      zh: '把 v3.4、v3.5、Roya Frostlands、声骸系统和新手入坑页放到首页，优先整理版本和养成重点。',
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
          description: '把 v3.4 / v3.5 和 Roya Frostlands 放到最前面，先整理版本重点。',
          links: [
            { href: '/wuwa/version', label: '版本专题' },
            { href: '/wuwa/guides/yangyang-suisui-sp-pull-plan', label: 'Yangyang/Suisui' },
          ],
        },
        {
          title: '声骸养成',
          description: '围绕声骸、共鸣链和主流配装，继续查看培养页。',
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
            { href: '/wuwa/guides/steam-xbox-game-pass-starter', label: 'Steam/Xbox 入坑' },
          ],
        },
      ],
      en: [
        {
          title: 'Version node',
          description: 'Bring v3.4 / v3.5 and Roya Frostlands to the front of search intent.',
          links: [
            { href: '/wuwa/version', label: 'Version hub' },
            { href: '/wuwa/guides/yangyang-suisui-sp-pull-plan', label: 'Yangyang/Suisui' },
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
            { href: '/wuwa/guides/steam-xbox-game-pass-starter', label: 'Steam/Xbox starter' },
          ],
        },
      ],
      ja: [
        {
          title: 'バージョン導線',
          description: 'v3.4 / v3.5 と Roya Frostlands を前面に出して検索意図を受け止めます。',
          links: [
            { href: '/wuwa/version', label: 'バージョン特集' },
            { href: '/wuwa/guides/yangyang-suisui-sp-pull-plan', label: 'Yangyang/Suisui' },
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
            { href: '/wuwa/guides/steam-xbox-game-pass-starter', label: 'Steam/Xbox入門' },
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
    eyebrow: { zh: 'Homecoming / AIC 工厂入口', en: 'Homecoming / AIC Factory Hub', ja: 'Homecoming / AIC工場導線' },
    title: { zh: '终末地 Homecoming 与蓝图工厂重点入口', en: 'Endfield Homecoming and blueprint factory hub', ja: 'Endfield Homecoming・ブループリント工場導線' },
    description: {
      zh: '把 Homecoming 已上线、新地图、Arcane/Liino、蓝图、AIC 工厂 QoL 和庆典奖励放到首页。',
      en: 'Bring live Homecoming coverage, new maps, Arcane/Liino, blueprints, AIC factory QoL, and celebration rewards to the homepage.',
      ja: 'Homecoming実装、新マップ、Arcane/Liino、ブループリント、AIC工場QoL、報酬をトップに出します。',
    },
    chips: {
      zh: ['Homecoming 已上线', '蓝图', 'AIC 工厂', '新地图', 'Arcane/Liino', '庆典奖励'],
      en: ['Homecoming live', 'Blueprints', 'AIC factory', 'New maps', 'Arcane/Liino', 'Rewards'],
      ja: ['Homecoming実装', 'ブループリント', 'AIC工場', '新マップ', 'Arcane/Liino', '報酬'],
    },
    cta: { zh: '去 Homecoming 专题', en: 'Open Homecoming hub', ja: 'Homecoming特集へ' },
    tracks: {
      zh: [
        { title: 'Homecoming', description: '先整理半周年、新地图、新干员和奖励。', links: [{ href: '/endfield/version', label: 'Homecoming 专题' }, { href: '/endfield/guides/homecoming-operators-map-route', label: '新地图 / 干员' }] },
        { title: '蓝图 / AIC', description: '把工厂效率、蓝图复用和建设节奏继续下沉。', links: [{ href: '/endfield/guides/blueprint-aic-factory-guide', label: '蓝图 / AIC' }, { href: '/endfield/build', label: '配装推荐' }] },
        { title: '入坑与角色', description: '新玩家和回流玩家继续看下载、战斗和干员。', links: [{ href: '/endfield/guides/download-install-guide', label: '下载与配置' }, { href: '/endfield/characters', label: '角色图鉴' }] },
      ],
      en: [
        { title: 'Homecoming', description: 'Catch half-year, maps, operators, and rewards first.', links: [{ href: '/endfield/version', label: 'Homecoming hub' }, { href: '/endfield/guides/homecoming-operators-map-route', label: 'Map/operators' }] },
        { title: 'Blueprint / AIC', description: 'Push factory efficiency, blueprint reuse, and build cadence deeper.', links: [{ href: '/endfield/guides/blueprint-aic-factory-guide', label: 'Blueprint / AIC' }, { href: '/endfield/build', label: 'Builds' }] },
        { title: 'Start and roles', description: 'New and returning players continue into download, combat, and operators.', links: [{ href: '/endfield/guides/download-install-guide', label: 'Download & specs' }, { href: '/endfield/characters', label: 'Characters' }] },
      ],
      ja: [
        { title: 'Homecoming', description: '半周年、マップ、オペレーター、報酬を先に受け止めます。', links: [{ href: '/endfield/version', label: 'Homecoming特集' }, { href: '/endfield/guides/homecoming-operators-map-route', label: 'マップ/干員' }] },
        { title: 'Blueprint / AIC', description: '工場効率、ブループリント再利用、建設テンポへつなげます。', links: [{ href: '/endfield/guides/blueprint-aic-factory-guide', label: 'Blueprint / AIC' }, { href: '/endfield/build', label: 'ビルド' }] },
        { title: '入門と役割', description: '新規と復帰勢をDL、戦闘、キャラへ誘導します。', links: [{ href: '/endfield/guides/download-install-guide', label: 'DLと環境' }, { href: '/endfield/characters', label: 'キャラ図鑑' }] },
      ],
    },
    faq: [
      { question: { zh: '终末地首页现在先看哪？', en: 'What should I open first for Endfield?', ja: 'Endfieldホームで最初に見るべきものは？' }, answer: { zh: '先看 Homecoming 专题，再看蓝图 / AIC 工厂、下载配置和角色入口。', en: 'Start with Homecoming, then blueprint / AIC factory, download specs, and operators.', ja: 'まずHomecoming、その後ブループリント / AIC工場、DL環境、キャラへ。' } },
    ],
  },
  skjh: {
    eyebrow: { zh: 'S1 上线后生存专题', en: 'Live S1 Survival Hub', ja: 'S1実装後サバイバル導線' },
    title: { zh: '失控进化服务器模式、开荒与防抄家入口', en: 'Ashfall Evolution server modes, starters, and anti-raid hub', ja: '失控進化 サーバー・開荒・防衛導線' },
    description: {
      zh: '把下载电脑版、官网 PC、服务器模式、安全区 / 标准 / 挑战、0-2 小时开荒、基地选址和防抄家前置。',
      en: 'Surface PC download, official PC entry, server modes, safe-zone / standard / challenge, first 0-2 hours, base location, and anti-raid basics.',
      ja: 'PC版DL、公式PC入口、サーバーモード、安全区/標準/挑戦、0-2時間開荒、拠点選び、防衛を前面に出します。',
    },
    chips: {
      zh: ['S1 赛季', '下载电脑版', '服务器模式', '安全区', '标准/挑战', '防抄家'],
      en: ['S1 season', 'PC download', 'Server modes', 'Safe-zone', 'Standard/challenge', 'Anti-raid'],
      ja: ['S1シーズン', 'PC DL', 'サーバー', '安全区', '標準/挑戦', '防衛'],
    },
    cta: { zh: '看 S1 专题', en: 'Open S1 hub', ja: 'S1特集へ' },
    tracks: {
      zh: [
        { title: '下载与模式', description: '先解决官网 PC、下载电脑版和选服问题。', links: [{ href: '/skjh/guides/official-pc-download-faq', label: '官网 PC 下载' }, { href: '/skjh/guides/server-mode-choice', label: '服务器模式' }] },
        { title: '0-2 小时开荒', description: '把工具、领地柜、低风险资源线变成可执行路线。', links: [{ href: '/skjh/guides/first-2-hours-starter-route', label: '0-2 小时路线' }, { href: '/skjh/guides/launch-30min-checklist', label: '30 分钟清单' }] },
        { title: '基地与防抄家', description: '继续查看基地选址、领地柜维护和反抄家布局。', links: [{ href: '/skjh/guides/base-location-anti-raid-plan', label: '选址防抄家' }, { href: '/skjh/guides/anti-raid-base-layouts', label: '房型防抄家' }] },
      ],
      en: [
        { title: 'Download and modes', description: 'Solve official PC entry, PC download, and server choice first.', links: [{ href: '/skjh/guides/official-pc-download-faq', label: 'Official PC FAQ' }, { href: '/skjh/guides/server-mode-choice', label: 'Server modes' }] },
        { title: 'First 0-2 hours', description: 'Turn tools, territory cabinet, and low-risk loot lines into a route.', links: [{ href: '/skjh/guides/first-2-hours-starter-route', label: '0-2 hour route' }, { href: '/skjh/guides/launch-30min-checklist', label: '30-min checklist' }] },
        { title: 'Base and anti-raid', description: 'Route base sites, upkeep, and anti-raid layouts deeper.', links: [{ href: '/skjh/guides/base-location-anti-raid-plan', label: 'Base sites' }, { href: '/skjh/guides/anti-raid-base-layouts', label: 'Anti-raid layouts' }] },
      ],
      ja: [
        { title: 'DLとモード', description: '公式PC入口、PC版DL、サーバー選択を先に解決します。', links: [{ href: '/skjh/guides/official-pc-download-faq', label: '公式PC FAQ' }, { href: '/skjh/guides/server-mode-choice', label: 'サーバーモード' }] },
        { title: '0-2時間開荒', description: '道具、領地柜、低リスク資源線を実行ルートにします。', links: [{ href: '/skjh/guides/first-2-hours-starter-route', label: '0-2時間ルート' }, { href: '/skjh/guides/launch-30min-checklist', label: '30分チェック' }] },
        { title: '拠点と防衛', description: '拠点選び、維持、防衛レイアウトへつなげます。', links: [{ href: '/skjh/guides/base-location-anti-raid-plan', label: '拠点選び' }, { href: '/skjh/guides/anti-raid-base-layouts', label: '防衛レイアウト' }] },
      ],
    },
    faq: [
      { question: { zh: '失控进化上线后首页先点哪？', en: 'What should I click first now that it is live?', ja: '実装後ホームで最初に押すべきものは？' }, answer: { zh: '先点服务器模式和下载互通 FAQ，再看 30 分钟清单、防抄家和基地建设。', en: 'Open server modes and download FAQ first, then the 30-minute checklist, anti-raid, and base building.', ja: 'まずサーバーモードとDL FAQ、その後30分チェック、防衛、基地建設へ。' } },
    ],
  }
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
  genshin: ['lightrace-wish-phase-ii-faq', 'phase-ii-columbina-raiden-pull-plan', 'banner-schedule-guide'],
  starrail: ['banner-schedule-guide', 'fate-rin-gilgamesh-reward-faq', 'himeko-nova-fate-pull-plan'],
  wuwa: ['banner-schedule-guide', 'yangyang-suisui-sp-pull-plan', 'steam-xbox-game-pass-starter'],
  nte: ['999-nights-mode-guide', 'shinku-iroi-pull-plan', 'v1-2-999-nights-guide'],
  zzz: ['banner-schedule-guide', 'anniversary-rewards-codes-plan', 'v3-1-anniversary-xbox-guide'],
  guihuan: ['test-recruit-international-download-faq', 'official-release-company-faq', 'test-release-timeline-guide'],
  ananta: ['gameplay-city-no-gacha-comparison-faq', 'release-date-beta-pc-faq', 'preregistration-no-gacha-guide'],
  endfield: ['official-download-specs-homecoming-faq', 'homecoming-operators-map-route', 'blueprint-aic-factory-guide'],
  sea: ['identity-v-signin-screenshot-rewards-guide', 'lost-sea-new-islands-ship-prep-guide', 'sea-of-remnants-p2w-gacha-explained'],
  skjh: ['official-pc-download-faq', 'first-2-hours-starter-route', 'base-location-anti-raid-plan'],
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

function ensureMetaLength(value: string, locale: SupportedLocale, target = META_MIN_LENGTH) {
  if ([...value].length >= target) return value;
  return `${value}${META_SUFFIX[locale] ?? META_SUFFIX.zh}`;
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
  const desc = ensureMetaLength(GAME_DESCRIPTIONS[gameId]?.[locale] ?? `${gameName} Wiki`, locale);
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}`, LOCALES);

  const title = locale === 'zh'
    ? `${gameName}攻略Wiki — 角色图鉴/武器/圣遗物/攻略`
    : locale === 'ja'
      ? `${gameName}攻略Wiki — キャラ/武器/ガイド`
      : `${gameName} Wiki — Characters, Weapons, Builds & Guides`;

  return {
    title,
    description: desc,
    alternates,
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/${locale}/${gameId}`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
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

  const description = ensureMetaLength(GAME_DESCRIPTIONS[gameId]?.[locale] ?? '', locale);
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
              src={`/images/og/${gameId}.webp`}
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
                  {locale === 'zh' ? '继续查看相关内容' : locale === 'ja' ? '関連コンテンツへ進む' : 'Continue into related pages'}
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
                {locale === 'zh' ? '优先入口' : locale === 'ja' ? '優先導線' : 'Priority entry points'}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/${gameId}/version` as '/'}
                  className="rounded-full bg-game-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  {specialCopy.cta[locale]}
                </Link>
                {gameId === 'nte' && (
                  <>
                    <Link href={`/${gameId}/guides/download-install-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '下载安装' : locale === 'ja' ? 'DLとインストール' : 'Download/install'}
                    </Link>
                    <Link href={`/${gameId}/guides/beginner-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '新手入门' : locale === 'ja' ? '初心者ガイド' : 'Beginner Guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/boss-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'Boss 攻略' : locale === 'ja' ? 'ボス攻略' : 'Boss Guide'}
                    </Link>
                  </>
                )}
                {gameId === 'sea' && (
                  <>
                    <Link href={`/${gameId}/guides/open-beta-version-center` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '公测版本中心' : locale === 'ja' ? 'CBT特集' : 'Open Beta Center'}
                    </Link>
                    <Link href={`/${gameId}/guides/launch-day-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '开服攻略' : locale === 'ja' ? '開服攻略' : 'Launch guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/download-install-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '下载安装' : locale === 'ja' ? 'DLとインストール' : 'Download/install'}
                    </Link>
                    <Link href={`/${gameId}/guides/tier-list-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '节奏榜' : locale === 'ja' ? 'Tier' : 'Tier list'}
                    </Link>
                    <Link href={`/${gameId}/guides/team-building-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '队伍思路' : locale === 'ja' ? '編成案' : 'Team building'}
                    </Link>
                    <Link href={`/${gameId}/characters` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '角色图鉴' : locale === 'ja' ? 'キャラ図鑑' : 'Characters'}
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
                    <Link href={`/${gameId}/guides/official-pc-download-faq` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '官网 PC 下载' : locale === 'ja' ? '公式PC DL' : 'Official PC Download'}
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
                      {locale === 'zh' ? 'Homecoming 专题' : locale === 'ja' ? 'Homecoming特集' : 'Homecoming Hub'}
                    </Link>
                    <Link href={`/${gameId}/guides/download-install-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '下载与配置' : locale === 'ja' ? 'DLと環境' : 'Download & Specs'}
                    </Link>
                    <Link href={`/${gameId}/guides/combat-system-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '战斗系统' : locale === 'ja' ? '戦闘システム' : 'Combat Guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/base-building-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '基地建设' : locale === 'ja' ? '基地建設' : 'Base Building'}
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

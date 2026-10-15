import { serializeJsonLd } from '@/lib/jsonld-script';
import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { getCharacterSummariesByIds } from '@/lib/game-data/characters';
import { getGuideListData } from '@/lib/game-data/guides';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';

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
    zh: '崩坏：星穹铁道角色图鉴、光锥数据库、遗器推荐与配队攻略，覆盖 4.x 版本、4.6正式版本、直播码、下期跃迁、星琼规划与队伍构筑。Gachia 提供完整角色属性、命途、技能、突破材料、光锥适配、遗器词条和版本专题入口，帮助你规划抽卡和养成路线。',
    en: 'Honkai: Star Rail character guides, light cone database, relic recommendations, and team comps for v4.x, v4.6 lives, livestream codes, next warps, Stellar Jade planning, and team building. Gachia connects character stats, Paths, skills, materials, light cones, relic stats, and version hubs for pull and build planning.',
    ja: '崩壊：スターレイルのキャラ図鑑、光円錐、遺物、編成攻略。v4.x、v4.6配信中、配信コード、次回跳躍、星玉計画、編成構築を整理します。Gachiaではキャラ性能、運命、スキル、素材、光円錐、遺物、版本特集をつなぎ、抽選と育成計画を支援します。',
  },
  wuwa: {
    zh: '鸣潮（Wuthering Waves）角色图鉴、武器数据库、声骸系统与配装攻略，当前重点覆盖 3.7「镜锁妄世，心照红尘」实装内容、梦枢天罗、活动、兑换码、地图活动、Xbox/Game Pass 与 Steam 入坑。Gachia 将角色、声骸、武器、地图、兑换码和版本专题串成可执行路线。',
    en: 'Wuthering Waves character guides, weapon data, Echo system, and builds, now focused on live v3.7 “Prism\'s Illusion, Heart\'s Illumination”, the Simulacrum Nexus, events, codes, map activities, Xbox/Game Pass, and Steam onboarding. Gachia connects characters, Echoes, weapons, maps, codes, and version hubs into practical routes.',
    ja: '鳴潮のキャラ図鑑、武器、エコー、ビルド攻略。現在はVer.3.7「鏡に鎖す妄世、心で照らす紅塵」の実装内容、夢枢天羅、イベント、コード、マップ活動、Xbox/Game Pass、Steam入門を重点化。Gachiaではキャラ、エコー、武器、マップ、コード、版本特集を実用導線にします。',
  },
  nte: {
    zh: '异环（NTE）Wiki 与官网入口，整理角色图鉴、兑换码、下载安装、官网资讯、武器数据、光盘推荐和祈愿模拟。页面覆盖完整角色库、新手入门、Boss 攻略、伤害公式和养成路线，适合搜索异环官网、异环下载、异环角色和异环攻略时快速进入。',
    en: 'Neverness to Everness character guides, weapon data, disk set recommendations, redeem codes, and gacha simulator. Now released with 19 playable characters, download help, beginner routes, boss guides, and damage formulas.',
    ja: '異環（NTE）のキャラ図鑑、武器データ、ディスクおすすめ、交換コード、ガチャシミュレーターを提供し、正式リリース済みです。19体のキャラ、DL、入門、ボス攻略、ダメージ計算、育成導線をまとめて確認でき、開服期の準備に役立ちます。版本特集や報酬導線もあります。',
  },
  zzz: {
    zh: '绝区零（Zenless Zone Zero）代理人图鉴、音擎数据库、驱动盘推荐、兑换码和版本专题，当前重点覆盖 3.3「重返天空的旅程」10 月 9 日官方前瞻、节目码已过期与 3.2 复盘；卡池与角色细节以节目后公告为准。',
    en: 'Zenless Zone Zero agent database, W-Engine guide, Drive Disc builds, codes, and version hubs, now focused on the official October 9 v3.3 “Journey Back to the Sky” program, code reminders, and the v3.2 recap. Banner and agent details await post-program notices.',
    ja: 'ゼンレスゾーンゼロのエージェント図鑑、Wエンジン、ドライブディスク、コード、版本特集。現在はv3.3「空へ戻る旅」の10月9日公式番組、コード失効済み、v3.2まとめを重点化し、バナーとキャラ詳細は番組後の告知を基準にします。',
  },
  hi3: {
    zh: '崩坏3 9.0「曙梦向明」资料入口，整理官方版本总览、Part 2 终章、浮生·渡尘、瑟莉姆、新拳套与圣痕；当前补给、活动与数值以客户端和官方公告为准。',
    en: 'Honkai Impact 3rd v9.0 “The Light at Dream\'s End” hub for the official update overview, Part 2 finale, Fenghuang of Vicissitude, Senadina, new fists, and stigmata. Confirm live supplies, events, and values in-game and in official notices.',
    ja: '崩壊3rd Ver.9.0「曙夢向明」の資料入口。公式アップデート、Part 2終章、浮生・渡塵、セナディナ、新拳套、聖痕を整理し、現在の補給・イベント・数値はクライアントと公式告知で確認します。',
  },
  guihuan: {
    zh: '归环角色图鉴、武器数据与攻略百科，整理全部可用角色的技能数据、定位说明、配装推荐和成长思路，帮助你更快了解游戏基础玩法、完成入门判断并找到适合当前版本的培养方向，同时持续补充图鉴与攻略专题。',
    en: 'Guihuan character builds, weapon database, and guides. Full skill data, role notes, build recommendations, and progression ideas for every available character.',
    ja: '帰環のキャラビルド、武器データ、攻略百科をまとめ、全キャラのスキルデータ、役割、ビルド、おすすめ育成を整理。ゲームの基礎理解と現在の育成方針を素早くつかめるので、迷わず次のページへ進めます。図鑑と攻略特集も継続更新中です。',
  },
  ananta: {
    zh: '无限大（Ananta）角色图鉴、下载入口与攻略百科，更新 2027年1月15日全球上线、PS5、PC、Android、iOS、重霄城市开放世界、no-gacha 角色获取和上线前准备信息。',
    en: 'Ananta character database, download hub, and guides updated for the January 15, 2027 global launch, PS5, PC, Android, iOS, Chongxiao city gameplay, no-gacha character acquisition, and pre-launch planning.',
    ja: 'Anantaのキャラ図鑑、DL入口、攻略百科を、2027年1月15日グローバル配信、PS5、PC、Android、iOS、Chongxiao都市OW、ガチャなし、配信前準備に合わせて更新。',
  },
  endfield: {
    zh: '《明日方舟：终末地》（Arknights: Endfield）开放世界动作 RPG 攻略百科，当前重点覆盖 Pioneer Test 复盘、测试奖励、Wuling、AIC 工厂、蓝图、下载配置和正式上线观察。Gachia 提供角色、武器、配装、基地建设和测试后路线入口。',
    en: 'Arknights: Endfield open-world action RPG guides, now focused on Pioneer Test recap, rewards, Wuling, AIC factory, blueprints, downloads/specs, and release watch. Gachia links operators, weapons, builds, base building, and post-test routes.',
    ja: 'アークナイツ：エンドフィールド攻略百科。現在はPioneer Testまとめ、報酬、Wuling、AIC工場、ブループリント、DL/環境、正式版注目を重点化。キャラ、武器、ビルド、基地建設、テスト後導線を整理します。',
  },
  sea: {
    zh: '遗忘之海 Wiki 与官网入口，整理网易 Joker Studio 海洋冒险 RPG 的角色图鉴、下载入口、官网资讯、云游戏、PC 配置、开服福利、移动端安装和开荒攻略。PC 端已于 2026 年 7 月 9 日公测，移动端入口与下载排错可继续进入下载专题。',
    en: 'Sea of Remnants is an ocean adventure RPG by NetEase Joker Studio. Gachia tracks crews, face sculpting, PC specs, download/install, rewards, and beginner routes.',
    ja: 'シー・オブ・レムナンツはNetEase Joker Studioの海洋アドベンチャー型オープンワールドRPG。PC版は2026年7月9日にCBT開始。Gachiaではキャラ、顔作成、クラウド作成、PC環境、DL、報酬、開荒ルートを整理します。先に全体像を把握したい人向けで、公測特集も見やすいです。',
  },
  skjh: {
    zh: '《失控进化》开放世界硬核生存对抗攻略，当前重点覆盖 S2「制霸王座」、官网/WeGame/TapTap 下载、礼包有效期、服务器模式、安全区 / 标准 / 挑战、0-2 小时开荒和防抄家。',
    en: 'Ashfall Evolution hardcore survival PvP guides, now focused on S2 Throne Rush, official/WeGame/TapTap downloads, reward validity, server modes, safe-zone / standard / challenge, first 0-2 hours, and anti-raid planning.',
    ja: '失控進化のハードコアサバイバル攻略。現在はS2「制霸王座」、公式/WeGame/TapTap DL、報酬期限、サーバーモード、安全区/標準/挑戦、0-2時間開荒、防衛を重点化します。',
  },
  'roco-cn': {
    zh: '《洛克王国：世界》国服已上线，Gachia 重点整理兑换码有效期、宠物图鉴、活动路线、宠物推荐、精灵培养、新手路线和与 Roco Global 的版本分流，帮助玩家避免把国服和国际服 CBT 信息混在一起。',
    en: 'Roco Kingdom: World CN is live. Gachia focuses on code validity, creature encyclopedia, events, creature picks, training, beginner routes, and separation from Roco Global so players do not mix CN live content with global CBT information.',
    ja: 'ロコキングダム：中国版は配信中。Gachiaはコード期限、ペット図鑑、イベント、推薦、育成、初心者導線、Roco Globalとの分流を整理し、中国版と国際CBTを混同しないようにします。',
  },
  roco: {
    zh: '《洛克王国：世界》国际服精灵图鉴、法杖数据库、节奏榜与攻略百科，覆盖 CBT「等等鸭测试」已曝光精灵的属性、稀有度、进化链与定位。法杖为外观特效武器，无数值攻击力；节奏榜基于早测暂定分级，正式版以官方为准。同时收录 CBT 报名、版本节点与实用入口，方便继续深入浏览。',
    en: 'Roco Kingdom global Jinie database, staff catalog, tier list, and guides for the "Quack Quack Test" CBT. Covers officially revealed Jinies\' attributes, rarity, evolution chains, and roles. Staves are cosmetic effect weapons with no attack stats; the tier list uses provisional CBT ratings pending official release. Also links to CBT sign-up, version milestones, and tools.',
    ja: 'ロコキングダム国際版のジニー図鑑、杖データベース、Tier、攻略百科を「Quack Quack Test」CBT向けに整理。公式公開ジニーの属性、レアリティ、進化、役割を網羅。杖は攻撃数値なしの外観武器。TierはCBT暫定。応募、版本、ツールも導線あり。',
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
    zh: '鸣潮（Wuthering Waves）是库洛游戏开发的开放世界动作 RPG。当前重点为 3.7「镜锁妄世，心照红尘」实装后的梦枢天罗、心/锁暝、活动与资源路线；Roya Frostlands、Tune Break 战斗系统与探索载具则作为既有内容保留参考。Gachia 提供角色图鉴、武器数据、声骸系统详解、配装推荐与配队方案，并按 Cost 与合鸣套装效果整理声骸选择。',
    en: 'Wuthering Waves is an open-world action RPG by Kuro Games. Current coverage centers on the live v3.7 “Prism\'s Illusion, Heart\'s Illumination” update, the Simulacrum Nexus of Mengzhou, Hsin/Suoming, events, and resource routes; Roya Frostlands, Tune Break, and traversal tools remain as established reference content. Gachia provides character guides, weapon data, Echo system coverage, builds, and team planning organized by Cost and Sonata effects.',
    ja: '鳴潮（Wuthering Waves）はKuro GamesのオープンワールドアクションRPGです。現在はVer.3.7「鏡に鎖す妄世、心で照らす紅塵」実装後の夢枢天羅、心/鎖暝、イベント、育成導線を重点化し、Roya Frostlands、Tune Break、探索用乗り物は既存コンテンツとして参照します。Gachiaではキャラ図鑑、武器データ、エコー解説、ビルド、編成をCostとソナタ効果別に整理しています。',
  },
  nte: {
    zh: '异环（Neverness to Everness）是 Hotta Studio 基于 UE5 开发的超自然开放世界游戏，2026年4月已正式发布。Gachia 提供最全的异环数据库，包含19个可玩角色的图鉴、武器数据、光盘套装推荐、下载安装、新手入门、Boss 攻略、伤害公式、兑换码汇总与祈愿模拟。',
    en: 'Neverness to Everness (NTE) is a supernatural open-world game by Hotta Studio built on UE5, officially released in April 2026. Gachia offers the most comprehensive NTE database with 19 playable character guides, weapon data, disk set recommendations, download/install help, beginner routes, boss guides, damage formulas, redeem codes, and a gacha simulator.',
    ja: '異環（Neverness to Everness）はHotta StudioのUE5製超自然オープンワールドゲーム、2026年4月正式リリース。Gachiaは最も充実したNTEデータベースを提供。19体のプレイアブルキャラ図鑑、武器データ、ディスクセットおすすめ、DL/入門、ボス攻略、ダメージ計算、交換コード、ガチャシミュレーターを網羅。',
  },
  zzz: {
    zh: '绝区零（Zenless Zone Zero）是 HoYoverse 开发的都市动作游戏，当前首页重点覆盖 3.3「重返天空的旅程」10 月 9 日官方前瞻、节目码已过期和 3.2 复盘。Gachia 将代理人图鉴、音擎、驱动盘、兑换码、版本专题和主流配队串成一页；未公布卡池与角色不提前定论。',
    en: 'Zenless Zone Zero (ZZZ) is HoYoverse\'s urban action game, now focused on the official October 9 v3.3 “Journey Back to the Sky” program, code reminders, and the v3.2 recap. Gachia connects agents, W-Engines, Drive Discs, codes, teams, and version hubs without presenting unannounced banners or agents as confirmed.',
    ja: 'ゼンレスゾーンゼロ（ZZZ）はHoYoverseの都市アクションゲームです。現在はv3.3「空へ戻る旅」の10月9日公式番組、コード失効済み、v3.2まとめを重点化しています。Gachiaはエージェント、Wエンジン、ディスク、コード、編成、版本特集をつなぎ、未発表のバナーやキャラは確定扱いしません。',
  },
  guihuan: {
    zh: '归环（Guihuan）是一款二次元开放世界冒险游戏。Gachia 提供归环角色图鉴、武器数据库、配装推荐与攻略百科，帮助玩家快速上手游戏并了解各角色的最优培养路线。',
    en: 'Guihuan is an anime open-world adventure game. Gachia provides a character database, weapon encyclopedia, build recommendations, and strategy guides to help players get started and optimize character development.',
    ja: '帰環（Guihuan）は二次元オープンワールドアドベンチャーゲームです。Gachiaではキャラ図鑑、武器データベース、ビルドおすすめ、攻略百科を提供し、プレイヤーの迅速なスタートとキャラ育成をサポートします。',
  },
  ananta: {
    zh: '无限大（Ananta，前称 Project Mugen）是网易 Naked Rain 工作室开发的都市开放世界动作游戏。官网与 gamescom 2026 信息显示，游戏计划于 2027年1月15日全球上线，平台为 PS5、PC、Android 和 iOS。Gachia 会持续整理重霄城市玩法、no-gacha 角色获取、下载配置、角色图鉴和上线前准备。',
    en: 'Ananta (formerly Project Mugen) is an urban open-world action game by Naked Rain / NetEase. The official site and gamescom 2026 update list a January 15, 2027 global launch on PS5, PC, Android, and iOS. Gachia tracks Chongxiao city gameplay, no-gacha character acquisition, downloads, specs, characters, and pre-launch planning.',
    ja: 'Ananta（旧Project Mugen）はNaked Rain / NetEaseの都市オープンワールドアクションゲームです。公式サイトとgamescom 2026更新では、2027年1月15日にPS5、PC、Android、iOS向けグローバル配信予定。GachiaではChongxiao都市玩法、ガチャなし、DL、環境、キャラ、配信前準備を整理します。',
  },
  endfield: {
    zh: '《明日方舟：终末地》（Arknights: Endfield）是鹰角网络（Hypergryph）开发的开放世界动作 RPG，以明日方舟 IP 为背景，玩家在塔拉二号星球上建立据点、指挥干员进行即时战斗和探索。Gachia 当前整理 Pioneer Test 的干员、武器、配装、AIC 工厂与测试后路线；下一轮测试和正式版内容以官方公告为准。',
    en: 'Arknights: Endfield is an open-world action RPG by Hypergryph set in the Arknights universe, where players establish bases and command operators in real-time combat on Talos II. Gachia currently organizes Pioneer Test operator, weapon, build, AIC factory, and post-test references; rely on official announcements for future tests and release content.',
    ja: 'アークナイツ：エンドフィールドはハイパーグリフ開発のオープンワールドアクションRPGです。プレイヤーはタロスII号星で拠点を建設し、オペレーターを指揮してリアルタイム戦闘と探索を行います。Gachiaは現在、Pioneer Testのオペレーター、武器、ビルド、AIC工場、テスト後導線を整理しており、今後のテスト・正式版は公式発表を基準にします。',
  },
  sea: {
    zh: '遗忘之海是一款极具美术风格的海洋冒险RPG，采用回合制战斗、即时海战与 Roguelite 遗忘之旅多模式。PC端2026年7月9日公测，移动端2026年7月23日10:00首发。Gachia 会持续整理移动端入口、首周运营、兑换码、角色与 BOSS 档案、捏脸、配置要求、开荒 Build 和海区探索路线。',
    en: 'Sea of Remnants is a stylized ocean adventure RPG with turn-based combat, naval exploration, and creature/crew progression. Gachia now treats the overseas timeline as an early 2027 / December beta watch, separating official site, store pages, platform boundaries, gacha, solo, and gameplay FAQs by source tier.',
    ja: 'ターン制バトルとリアルタイム海戦を特徴とする海洋アドベンチャーRPG。PC版は2026年7月9日にオープンベータ開始、モバイル版は2026年7月23日10:00に開始。Gachiaではモバイル導線、トラブル対応、連携、交換コード、キャラとボス、ビルド、環境、海域ルートを整理します。',
  },
  skjh: {
    zh: '《失控进化》是一款开放世界硬核生存对抗游戏，玩家在荒岛中从徒手采集开始，逐步完成工具制作、武器锻造、庇护所搭建、科技树解锁和领地攻防。游戏强调搜打拆、基地运营、动态天气、饥饿口渴等代谢压力，以及不同服务器模式下的风险选择。Gachia 将优先整理新手 0-10 分钟开荒、基地选址、领地柜维护、资源优先级、基因流派搭配、武器图鉴和公测预约福利。',
    en: 'Ashfall Evolution is a hardcore open-world survival PvP game where players start from bare-handed gathering, then craft tools, forge weapons, build shelters, unlock technology, and fight over territory. The game emphasizes looting, fighting, raiding, base upkeep, dynamic weather, hunger and thirst pressure, and risk choices across server modes. Gachia covers beginner routes, territory cabinets, resource priorities, gene builds, weapons, and launch rewards.',
    ja: '『失控進化』は、採集、道具作成、武器製作、拠点建築、技術解放、領地攻防を中心にしたハードコアなオープンワールドサバイバル対戦ゲームです。Gachiaでは初心者ルート、領地キャビネット、資源優先度、遺伝子ビルド、武器、リリース報酬を整理します。',
  },
  'roco-cn': {
    zh: '《洛克王国：世界》国服已上线，Gachia 重点整理兑换码有效期、宠物图鉴、活动路线、宠物推荐、精灵培养、新手路线和与 Roco Global 的版本分流。法杖系统为外观特效武器，无数值攻击力；节奏榜帮助你在捕捉与培养前判断强势精灵。',
    en: 'Roco Kingdom: World CN is live. Gachia focuses on code validity, creature encyclopedia, events, creature picks, training, beginner routes, and separation from Roco Global. Staves are cosmetic effect weapons with no attack stats, and the tier list helps players judge strong Jinies before capture and training.',
    ja: 'ロコキングダム：中国版は配信中。Gachiaはコード期限、ペット図鑑、イベント、推薦、育成、初心者導線、Roco Globalとの分流を整理します。杖は攻撃数値なしの外観武器で、Tierは捕獲と育成前の判断に役立ちます。',
  },
  roco: {
    zh: '《洛克王国：世界》国际服是腾讯面向全球发行的开放世界精灵收集 RPG，首轮 CBT「等等鸭测试」于 2026-10-27 开启。Gachia 整理官方已曝光精灵的属性、稀有度、进化链与基础定位，CBT 结束后持续补全。法杖系统为外观特效武器，无数值攻击力，通过战令与活动获取。节奏榜基于早测暂定分级，正式版以官方数据为准。国际服与国服数据相互独立，正式版支持繁中、英文、日文等多语言。',
    en: 'The Roco Kingdom global version is Tencent\'s worldwide open-world creature-collection RPG. The first CBT "Quack Quack Test" opens October 27, 2026. Gachia tracks officially revealed Jinies\' attributes, rarity, evolution chains, and basic roles, expanding after CBT. The staff system is a cosmetic effect weapon with no attack stats, obtained from battle passes and events. Our tier list uses provisional CBT ratings pending the official release. The global and CN versions keep independent data; the global release supports Traditional Chinese, English, Japanese, and more.',
    ja: 'ロコキングダム国際版はTencentのグローバル向けオープンワールド収集RPG。初回CBT「Quack Quack Test」は2026年10月27日開始。Gachiaは公式公開ジニーの属性、レアリティ、進化、役割を整理し、CBT後に拡充。杖は攻撃数値なしの外観武器で、バトルパスとイベントから入手。TierはCBT暫定。国際版と中国版は独立、多言語対応。',
  },
  aniimo: {
    zh: '伊莫（Aniimo）是 Pawprint Studio 开发的免费开放世界生物收集 RPG，世界名为 Idyll。官方日期为 PC/主机 2026-09-16、移动端 2026-09-23。Gachia 目前整理 89 个公开 Aniimo 条目、6 个区域、下载入口、预注册奖励、兑换码状态和上线后路线验证清单。',
    en: 'Aniimo is a free-to-play creature-catching open-world RPG from Pawprint Studio set on Idyll. The official dates are 2026-09-16 for PC/console and 2026-09-23 for mobile. Gachia tracks 89 public Aniimo entries, 6 regions, downloads, pre-registration rewards, code status, and launch-route verification.',
    ja: 'アニモ（Aniimo）はPawprint Studio開発の無料オープンワールド収集RPG。公式日程はPC/コンソールが2026-09-16、モバイルが2026-09-23。Gachiaは89体、6地域、DL、報酬、コード状態を追跡します。',
  },
};

const GAME_META_TITLES: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  nte: {
    zh: '异环 Wiki｜官网入口、角色图鉴、兑换码与下载攻略',
    en: 'NTE Wiki — Characters, Codes, Download & Guides',
    ja: 'NTE Wiki — キャラ、コード、DL、攻略',
  },
  sea: {
    zh: '遗忘之海 Wiki｜官网入口、下载、角色图鉴与开荒攻略',
    en: 'Sea of Remnants Wiki — Characters, Tier List, Download & Guides',
    ja: 'Sea of Remnants Wiki — キャラ、Tier、DL、攻略',
  },
  skjh: {
    zh: '失控进化 Wiki｜官网入口、下载、服务器模式与开荒攻略',
    en: 'Ashfall Evolution Wiki — Download, Servers & Starter Guides',
    ja: '失控進化 Wiki — DL、サーバー、開荒攻略',
  },
  zzz: {
    zh: '绝区零 3.3 Wiki — 10 月 9 日前瞻、兑换码与 3.2 复盘',
    en: 'ZZZ v3.3 Wiki — October 9 Program, Codes & v3.2 Recap',
    ja: 'ZZZ v3.3 Wiki — 10月9日番組、コード、v3.2まとめ',
  },
  aniimo: {
    zh: '伊莫 Aniimo Wiki｜发售日期、下载、图鉴、地图与兑换码追踪',
    en: 'Aniimo Wiki — Release Date, Download, Database, Map & Codes',
    ja: 'アニモ Aniimo Wiki — 発売日、DL、図鑑、マップ、コード',
  },
};

// --- Featured character IDs per game ---
const FEATURED_CHARS: Record<string, string[]> = {
  genshin: ['hu-tao', 'raiden-shogun', 'furina', 'nahida', 'kazuha', 'zhongli', 'yelan'],
  starrail: ['kafka', 'jingliu', 'acheron', 'firefly', 'robin', 'ruan-mei'],
  wuwa: ['jiyan', 'yinlin', 'jinhsi', 'changli', 'zhezhi'],
  nte: ['chiz', 'aurelia', 'skia', 'haniel', 'sakiri', 'nanally'],
  zzz: ['ellen', 'zhu-yuan', 'miyabi', 'burnice', 'caesar'],
  hi3: ['fenghuang-of-vicissitude', 'senadina-astralop'],
  guihuan: [],
  ananta: [],
  endfield: ['laevatain', 'ardelia', 'tangtang', 'endministrator', 'lifeng'],
  sea: ['traveler', 'ais', 'little-axe'],
  skjh: [],
  aniimo: ['susuta', 'emberpup', 'celestis', 'tuckin', 'panpanta', 'sheldon'],
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

type RocoDailyCard = {
  href: string;
  icon: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  metric: (stats: RocoDashboardStats, locale: SupportedLocale) => string;
  action: Record<SupportedLocale, string>;
};

type RocoDashboardStats = {
  characters: number;
  guides: number;
  weapons: number;
  enabledRoutes: number;
  codeStatus: 'watch' | 'active';
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
    eyebrow: { zh: '4.6正式版本 / 直播码入口', en: 'v4.6 Preview / Codes Hub', ja: 'v4.6配信中 / コード導線' },
    title: { zh: '星穹铁道 4.6正式版本、直播码与下期跃迁重点入口', en: 'Star Rail v4.6 live, codes, and next-warps hub', ja: 'スターレイル v4.6配信中・コード・次回跳躍導線' },
    description: { zh: '把 4.6 live update、直播兑换码、下期跃迁、当前版本资源、星琼缺口和队伍规划放到首页第一跳。', en: 'Surface the v4.6 live update, livestream codes, next warps, current-version resources, Jade gaps, and team planning directly on the homepage.', ja: 'v4.6配信中、配信コード、次回跳躍、v4.5まとめ資源、星玉不足、編成計画をトップで受け止めます。' },
    chips: { zh: ['4.6正式版本', '直播码', '下期跃迁', '当前版本', '星琼规划', '配队'], en: ['v4.6 live', 'Livestream codes', 'Next warps', 'current-version', 'Jade planning', 'Teams'], ja: ['v4.6配信中', '配信コード', '次回跳躍', 'v4.5まとめ', '星玉計画', '編成'] },
    cta: { zh: '去 4.6正式版本', en: 'Open v4.6 live', ja: 'v4.6配信中へ' },
    tracks: {
      zh: [{ title: '4.6正式版本', description: '先确认直播码、下期跃迁和前瞻节目重点。', links: [{ href: '/starrail/version', label: '4.6正式版本' }, { href: '/starrail/redeem-codes', label: '直播码' }] }, { title: '资源预留', description: '把 当前版本奖励、星琼缺口和保底计划放到同一条路线。', links: [{ href: '/starrail/guides/banner-schedule-guide', label: '下期跃迁' }, { href: '/starrail/guides/4x-fate-gilgamesh-kafka-cyrene-evergreen-plan', label: '抽取规划' }] }, { title: '队伍与养成', description: '抽前看定位，抽后继续看遗器、光锥和配队。', links: [{ href: '/starrail/build', label: '配装推荐' }, { href: '/starrail/teams', label: '配队' }] }],
      en: [{ title: 'v4.6 live', description: 'Check livestream codes, next warps, and special-program highlights first.', links: [{ href: '/starrail/version', label: 'v4.6 live' }, { href: '/starrail/redeem-codes', label: 'Codes' }] }, { title: 'Resource reserve', description: 'Put current-version rewards, Jade gaps, and pity planning in one path.', links: [{ href: '/starrail/guides/banner-schedule-guide', label: 'Next warps' }, { href: '/starrail/guides/4x-fate-gilgamesh-kafka-cyrene-evergreen-plan', label: 'Pull plan' }] }, { title: 'Teams and builds', description: 'Check roles before pulling, then continue into relics, light cones, and teams.', links: [{ href: '/starrail/build', label: 'Builds' }, { href: '/starrail/teams', label: 'Teams' }] }],
      ja: [{ title: 'v4.6配信中', description: '配信コード、次回跳躍、特番要点を先に確認します。', links: [{ href: '/starrail/version', label: 'v4.6配信中' }, { href: '/starrail/redeem-codes', label: 'コード' }] }, { title: '資源温存', description: 'v4.5まとめ報酬、星玉不足、天井計画を一つの導線にします。', links: [{ href: '/starrail/guides/banner-schedule-guide', label: '次回跳躍' }, { href: '/starrail/guides/4x-fate-gilgamesh-kafka-cyrene-evergreen-plan', label: '抽選計画' }] }, { title: '編成と育成', description: '引く前に役割を見て、引いた後は遺物、光円錐、編成へ。', links: [{ href: '/starrail/build', label: 'ビルド' }, { href: '/starrail/teams', label: '編成' }] }],
    },
    faq: [{ question: { zh: '星铁首页现在先看什么？', en: 'What should I open first now?', ja: '今ホームで最初に見るべきものは？' }, answer: { zh: '先看 4.6正式版本和直播兑换码，再看下期跃迁、星琼缺口和队伍规划。', en: 'Start with the v4.6 live and livestream codes, then check next warps, Jade gaps, and team planning.', ja: 'まずv4.6配信中と配信コード、その後次回跳躍、星玉不足、編成計画へ。' } }],
  },
  nte: {
    eyebrow: { zh: '异环官网 / Wiki 入口', en: 'NTE Official / Wiki Hub', ja: 'NTE公式 / Wiki導線' },
    title: { zh: '异环 Wiki、官网、角色、兑换码与下载入口', en: 'NTE wiki, official site, characters, codes, and download hub', ja: 'NTE Wiki、公式、キャラ、コード、DL導線' },
    description: {
      zh: '把异环官网、角色图鉴、下载安装、兑换码、999 Nights、Shinku 当前池和 Iroi 预热一起前置，覆盖搜索里最常见的官网、wiki、下载和角色意图。',
      en: 'Put 999 Nights, Shinku, Iroi, codes, Steam/download intent, and install help up front.',
      ja: '999 Nights、Shinku、Iroi、コード、Steam/DL、インストール導線を前面に出します。',
    },
    chips: {
      zh: ['异环官网', '异环 Wiki', '角色图鉴', '兑换码', '下载入口', '999 Nights'],
      en: ['v1.2 live', '999 Nights', 'Shinku', 'Iroi', 'Codes', 'Steam/download'],
      ja: ['v1.2実装', '999 Nights', 'Shinku', 'Iroi', 'コード', 'Steam/DL'],
    },
    cta: { zh: '去 1.2 专题', en: 'Open v1.2 hub', ja: 'v1.2特集へ' },
    tracks: {
      zh: [
        { title: '官网与下载', description: '优先解决异环官网、下载、设备、区服和安装入口。', links: [{ href: '/nte/download', label: '下载入口' }, { href: '/nte/guides/download-install-guide', label: '下载安装指南' }] },
        { title: '角色与 Wiki', description: '把角色图鉴、版本角色和新手培养路线接到可查页面。', links: [{ href: '/nte/characters', label: '角色图鉴' }, { href: '/nte/version', label: '1.2 专题' }] },
        { title: '兑换码与抽卡', description: '搜索兑换码、Shinku、Iroi 的用户继续进入福利和抽卡规划。', links: [{ href: '/nte/redeem-codes', label: '兑换码' }, { href: '/nte/guides/shinku-iroi-pull-plan', label: 'Shinku vs Iroi' }] },
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
      { question: { zh: '异环官网、Wiki 和下载应该先点哪个？', en: 'What should I open first for NTE?', ja: 'NTEホームで最初に見るべきものは？' }, answer: { zh: '找安装包先点下载入口或下载安装指南；查角色和攻略先点角色图鉴、1.2 专题和兑换码。', en: 'Start with v1.2 / 999 Nights, then Shinku, Iroi, codes, and download/install.', ja: 'まずv1.2 / 999 Nights、その後Shinku、Iroi、コード、DLへ。' } },
    ],
  },
  sea: {
    eyebrow: { zh: '遗忘之海 early 2027 / Beta 观察', en: 'Sea Early 2027 / Beta Watch', ja: 'Sea early 2027 / Beta注目' },
    title: { zh: '遗忘之海官网、平台、early 2027 与 December beta 入口', en: 'Sea of Remnants official, platform, early 2027, and December beta hub', ja: 'Sea of Remnants 公式・平台・early 2027・December beta導線' },
    description: {
      zh: '这里整理遗忘之海官网入口、Steam/PS5/Xbox/mobile 平台边界、early 2027、December closed beta、gacha、solo 和玩法 FAQ，避免把测试资格或平台日期写死。',
      en: 'Find official entry points, Steam/PS5/Xbox/mobile platform boundaries, early 2027, December closed beta, gacha, solo, and gameplay FAQs without treating beta access or platform dates as final.',
      ja: '公式入口、Steam/PS5/Xbox/mobile平台境界、early 2027、December closed beta、gacha、solo、玩法FAQを整理し、未確認資格や平台日程を確定扱いしません。',
    },
    chips: {
      zh: ['early 2027', 'December beta', 'Steam', 'PS5/Xbox', 'mobile', 'gacha/solo'],
      en: ['early 2027', 'December beta', 'Steam', 'PS5/Xbox', 'mobile', 'gacha/solo'],
      ja: ['early 2027', 'December beta', 'Steam', 'PS5/Xbox', 'mobile', 'gacha/solo'],
    },
    cta: { zh: '去 Beta 观察', en: 'Open beta watch', ja: 'Beta注目へ' },
    tracks: {
      zh: [
        { title: '时间线与 Beta', description: '先确认 early 2027、December closed beta 和测试资格来源。', links: [{ href: '/sea/version', label: '版本专题' }, { href: '/sea/guides/early-2027-december-closed-beta-faq', label: 'Beta FAQ' }] },
        { title: '平台与下载', description: '把 Steam、PS5、Xbox、移动端和官网入口按来源分层。', links: [{ href: '/sea/download', label: '下载入口' }, { href: '/sea/guides/platform-download-guide', label: '平台 FAQ' }] },
        { title: '玩法与抽卡', description: '继续承接 gacha、solo、角色、战斗和是否 MMO 的搜索。', links: [{ href: '/sea/guides/what-is-forgotten-sea', label: '玩法 FAQ' }, { href: '/sea/characters', label: '角色图鉴' }] },
      ],
      en: [
        { title: 'Timeline and beta', description: 'Check early 2027, December closed beta, and access-source tiers first.', links: [{ href: '/sea/version', label: 'Version hub' }, { href: '/sea/guides/early-2027-december-closed-beta-faq', label: 'Beta FAQ' }] },
        { title: 'Platforms and download', description: 'Tier Steam, PS5, Xbox, mobile, and official entry points by source.', links: [{ href: '/sea/download', label: 'Download hub' }, { href: '/sea/guides/platform-download-guide', label: 'Platform FAQ' }] },
        { title: 'Gameplay and gacha', description: 'Route gacha, solo, characters, combat, and MMO-boundary searches.', links: [{ href: '/sea/guides/what-is-forgotten-sea', label: 'Gameplay FAQ' }, { href: '/sea/characters', label: 'Characters' }] },
      ],
      ja: [
        { title: '時期とBeta', description: 'early 2027、December closed beta、資格情報の出典を先に確認します。', links: [{ href: '/sea/version', label: '版本特集' }, { href: '/sea/guides/early-2027-december-closed-beta-faq', label: 'Beta FAQ' }] },
        { title: '平台とDL', description: 'Steam、PS5、Xbox、mobile、公式入口を出典別に分けます。', links: [{ href: '/sea/download', label: 'DL入口' }, { href: '/sea/guides/platform-download-guide', label: '平台FAQ' }] },
        { title: '玩法とガチャ', description: 'gacha、solo、キャラ、戦闘、MMO境界検索を受け止めます。', links: [{ href: '/sea/guides/what-is-forgotten-sea', label: '玩法FAQ' }, { href: '/sea/characters', label: 'キャラ図鑑' }] },
      ],
    },
    faq: [
      { question: { zh: '遗忘之海现在应该先看什么？', en: 'What should I check first for Sea of Remnants?', ja: 'Sea of Remnantsで最初に見るべきものは？' }, answer: { zh: '先看 early 2027 / December beta 观察，再看平台 FAQ、下载入口和玩法说明。', en: 'Start with early 2027 / December beta watch, then platform FAQ, download entry, and gameplay explanation.', ja: 'まずearly 2027 / December beta注目、その後平台FAQ、DL入口、玩法説明へ。' } },
    ],
  },
  zzz: {
    eyebrow: { zh: '3.3 官方前瞻 / 3.2 复盘入口', en: 'v3.3 Official Program / v3.2 Recap Hub', ja: 'v3.3公式番組 / v3.2まとめ導線' },
    title: { zh: '绝区零 3.3 前瞻直播、兑换码与 3.2 复盘入口', en: 'ZZZ v3.3 program, codes, and v3.2 recap hub', ja: 'ZZZ v3.3番組・コード・v3.2まとめ導線' },
    description: { zh: '3.3「重返天空的旅程」10月9日前瞻已发布，菲欧妮、赛维里安即将登场。节目码已于10月11日23:59:59（UTC+8）失效；上线日期及卡池以正式公告为准。', en: 'The October 9 v3.3 preview is published. Program codes expired October 11 at 23:59:59 UTC+8; verify the release date and banners in official follow-up notices.', ja: '10月9日のv3.3番組は公開済み。コードは10月11日23:59:59（UTC+8）に失効。実装日とバナーは後続公式告知で確認してください。' },
    chips: { zh: ['10 月 9 日 19:30', '官方前瞻', '节目码已过期', '3.2 复盘', 'Steam', 'Xbox'], en: ['Oct 9, 19:30 UTC+8', 'Official program', 'Codes expired', 'v3.2 recap', 'Steam', 'Xbox'], ja: ['10月9日 19:30', '公式番組', 'コード失効済み', 'v3.2まとめ', 'Steam', 'Xbox'] },
    cta: { zh: '看 3.3 前瞻时间线', en: 'Open v3.3 program timeline', ja: 'v3.3番組タイムラインへ' },
    tracks: {
      zh: [{ title: '3.3 官方前瞻', description: '10 月 9 日 19:30 看官方节目；节目后再核对卡池、角色和版本日期。', links: [{ href: '/zzz/version', label: '3.3 前瞻时间线' }, { href: '/zzz/redeem-codes', label: '兑换码' }] }, { title: '3.2 复盘', description: '继续查看现有角色、活动和配队，避免将复盘内容误读为 3.3 已公布信息。', links: [{ href: '/zzz/guides/v3-2-livestream-recap-expired-codes', label: '3.2 复盘' }, { href: '/zzz/guides/banner-schedule-guide', label: '当前卡池' }] }, { title: '平台与养成', description: 'Steam/Xbox 玩家先看账号下载，再进配队、音擎和驱动盘。', links: [{ href: '/zzz/guides/steam-3-0-start-guide', label: 'Steam 入坑' }, { href: '/zzz/guides/meta-teams-v3-guide', label: '主流配队' }] }],
      en: [{ title: 'Official v3.3 program', description: 'Watch the official broadcast at 19:30 UTC+8 on October 9; verify banners, agents, and patch timing afterwards.', links: [{ href: '/zzz/version', label: 'v3.3 program timeline' }, { href: '/zzz/redeem-codes', label: 'Codes' }] }, { title: 'v3.2 recap', description: 'Use this for existing agents, events, and teams without reading recap content as v3.3 confirmation.', links: [{ href: '/zzz/guides/v3-2-livestream-recap-expired-codes', label: 'v3.2 recap' }, { href: '/zzz/guides/banner-schedule-guide', label: 'Current banners' }] }, { title: 'Platform and builds', description: 'Steam/Xbox players should solve account and download first, then teams and builds.', links: [{ href: '/zzz/guides/steam-3-0-start-guide', label: 'Steam starter' }, { href: '/zzz/guides/meta-teams-v3-guide', label: 'Meta teams' }] }],
      ja: [{ title: 'v3.3公式番組', description: '10月9日19:30（UTC+8）に公式番組を確認し、バナー、キャラ、実装日はその後に検証します。', links: [{ href: '/zzz/version', label: 'v3.3番組タイムライン' }, { href: '/zzz/redeem-codes', label: 'コード' }] }, { title: 'v3.2まとめ', description: '既存キャラ、イベント、編成の確認に使い、まとめ内容をv3.3確定情報として扱わないでください。', links: [{ href: '/zzz/guides/v3-2-livestream-recap-expired-codes', label: 'v3.2まとめ' }, { href: '/zzz/guides/banner-schedule-guide', label: '現在バナー' }] }, { title: '平台と育成', description: 'Steam/Xbox勢はアカウントとDL、その後編成と育成へ。', links: [{ href: '/zzz/guides/steam-3-0-start-guide', label: 'Steam入門' }, { href: '/zzz/guides/meta-teams-v3-guide', label: '主要編成' }] }],
    },
    faq: [{ question: { zh: '绝区零首页现在先看什么？', en: 'What should I open first on the ZZZ homepage?', ja: 'ZZZホームで最初に見るべきものは？' }, answer: { zh: '先确认 10 月 9 日 19:30 的官方 3.3 前瞻与兑换码提醒；卡池和角色等节目后公告。等待期间可回看 3.2、平台入坑和主流配队。', en: 'Confirm the official v3.3 program at 19:30 UTC+8 on October 9 and its code reminder first. Wait for post-program notices on banners and agents; use the interim for v3.2 recap, platform onboarding, and teams.', ja: 'まず10月9日19:30（UTC+8）の公式v3.3番組とコード失効済みを確認します。バナーとキャラは番組後の告知を待ち、待機中はv3.2まとめ、平台入門、主要編成を確認できます。' } }],
  },
  wuwa: {
    eyebrow: { zh: '3.7 实装 / 平台入坑入口', en: 'v3.7 Live / Platform Starter Hub', ja: 'Ver.3.7実装 / プラットフォーム入門導線' },
    title: { zh: '鸣潮 3.7 实装内容、活动与平台入坑重点入口', en: 'WuWa v3.7 live, events, and platform starter hub', ja: '鳴潮 Ver.3.7実装・イベント・プラットフォーム入門導線' },
    description: { zh: '把 3.7 上线后路线、梦枢天罗、活动、兑换码、卡池预算、Xbox/Game Pass 与 Steam 入坑放到首页。', en: 'Bring the v3.7 live route, Simulacrum Nexus, events, codes, banner budgeting, Xbox/Game Pass, and Steam onboarding to the homepage.', ja: 'Ver.3.7実装後ルート、夢枢天羅、イベント、コード、バナー予算、Xbox/Game Pass、Steam入門をトップにまとめます。' },
    chips: { zh: ['3.7 已上线', '梦枢天罗', '限时活动', '兑换码', '卡池预算', 'Xbox/Steam'], en: ['v3.7 live', 'Simulacrum Nexus', 'Limited events', 'Codes', 'Banner budget', 'Xbox/Steam'], ja: ['Ver.3.7配信中', '夢枢天羅', '期間限定イベント', 'コード', 'バナー予算', 'Xbox/Steam'] },
    cta: { zh: '查看 3.7 上线后路线', en: 'Open the v3.7 live route', ja: 'Ver.3.7実装後ルートを見る' },
    tracks: { zh: [{ title: '3.7 实装与活动', description: '先检查邮件、资源下载、梦枢天罗解锁与活动前置条件。', links: [{ href: '/wuwa/guides/v3-7-live-route', label: '3.7 上线后路线' }, { href: '/wuwa/events', label: '活动看板' }] }, { title: '唤取与资源', description: '再核对当前保底、卡池结束时间、有效兑换码与养成预算。', links: [{ href: '/wuwa/guides/banner-schedule-guide', label: '卡池规划' }, { href: '/wuwa/redeem-codes', label: '兑换码' }] }, { title: '平台与养成', description: 'Xbox/Game Pass 和 Steam 玩家先处理登录与资源，再进入配装和声骸路线。', links: [{ href: '/wuwa/guides/steam-xbox-game-pass-starter', label: 'Steam/Xbox 入坑' }, { href: '/wuwa/build', label: '配装推荐' }] }], en: [{ title: 'v3.7 live and events', description: 'Check mail, downloads, Simulacrum Nexus access, and event prerequisites first.', links: [{ href: '/wuwa/guides/v3-7-live-route', label: 'v3.7 live route' }, { href: '/wuwa/events', label: 'Event board' }] }, { title: 'Convene and resources', description: 'Then verify pity, banner end time, valid codes, and your progression budget.', links: [{ href: '/wuwa/guides/banner-schedule-guide', label: 'Banner plan' }, { href: '/wuwa/redeem-codes', label: 'Codes' }] }, { title: 'Platform and builds', description: 'Xbox/Game Pass and Steam players should complete account and resource checks before builds and Echo routes.', links: [{ href: '/wuwa/guides/steam-xbox-game-pass-starter', label: 'Steam/Xbox starter' }, { href: '/wuwa/build', label: 'Builds' }] }], ja: [{ title: 'Ver.3.7実装とイベント', description: 'メール、DL、夢枢天羅の解放、イベント前提条件を先に確認します。', links: [{ href: '/wuwa/guides/v3-7-live-route', label: 'Ver.3.7実装後ルート' }, { href: '/wuwa/events', label: 'イベントボード' }] }, { title: '集音と資源', description: '次に天井、バナー終了時刻、有効コード、育成予算を確認します。', links: [{ href: '/wuwa/guides/banner-schedule-guide', label: 'バナー計画' }, { href: '/wuwa/redeem-codes', label: 'コード' }] }, { title: 'プラットフォームと育成', description: 'Xbox/Game PassとSteam勢はアカウントとリソースを確認してからビルドとエコーへ。', links: [{ href: '/wuwa/guides/steam-xbox-game-pass-starter', label: 'Steam/Xbox入門' }, { href: '/wuwa/build', label: 'ビルド' }] }] },
    faq: [{ question: { zh: '鸣潮首页现在先看什么最实用？', en: 'What is the most practical starting point on the WuWa homepage?', ja: '鳴潮ホームで最初に見ると実用的なものは？' }, answer: { zh: '先看 3.7 上线后路线与活动看板，确认邮件、资源下载、解锁条件和本服时间；再处理卡池预算、兑换码、平台入坑与声骸配装。', en: 'Start with the v3.7 live route and event board to verify mail, downloads, unlock conditions, and server timing; then review banner budgeting, codes, platform onboarding, and Echo builds.', ja: 'まずVer.3.7実装後ルートとイベントボードでメール、DL、解放条件、サーバー時刻を確認し、その後バナー予算、コード、プラットフォーム入門、エコーへ進みます。' } }],
  },
  endfield: {
    eyebrow: { zh: 'Pioneer Test 复盘 / AIC 蓝图入口', en: 'Pioneer Test Recap / AIC Blueprint Hub', ja: 'Pioneer Testまとめ / AIC設計図導線' },
    title: { zh: '终末地 Pioneer Test 复盘、AIC 工厂与蓝图重点入口', en: 'Endfield Pioneer Test recap, AIC factory, and blueprint hub', ja: 'Endfield Pioneer Testまとめ・AIC工場・設計図導線' },
    description: { zh: '把 Pioneer Test 招募结束后的测试复盘、奖励、Wuling、AIC 工厂、蓝图、下载配置和正式上线观察放到首页。', en: 'Bring post-recruitment Pioneer Test recap, rewards, Wuling, AIC factory, blueprints, download/specs, and release watch to the homepage.', ja: 'Pioneer Test募集後のまとめ、報酬、Wuling、AIC工場、ブループリント、DL/環境、正式版注目をトップに出します。' },
    chips: { zh: ['Pioneer Test', '测试奖励', 'Wuling', '蓝图', 'AIC 工厂', '上线观察'], en: ['Pioneer Test', 'Test rewards', 'Wuling', 'Blueprints', 'AIC factory', 'Release watch'], ja: ['Pioneer Test', 'テスト報酬', 'Wuling', '設計図', 'AIC工場', '正式版注目'] },
    cta: { zh: '去测试复盘', en: 'Open test recap', ja: 'テストまとめへ' },
    tracks: { zh: [{ title: '测试后复盘', description: '先整理 Pioneer Test、奖励核对、Wuling 和后续上线观察。', links: [{ href: '/endfield/guides/pioneer-test-post-test-route', label: '测试后路线' }, { href: '/endfield/events', label: '状态看板' }] }, { title: '蓝图 / AIC', description: '把工厂效率、蓝图复用和建设节奏继续下沉。', links: [{ href: '/endfield/guides/blueprint-aic-factory-guide', label: '蓝图 / AIC' }, { href: '/endfield/build', label: '配装推荐' }] }, { title: '入坑与角色', description: '新玩家和回流玩家继续看下载、战斗和干员。', links: [{ href: '/endfield/guides/download-install-guide', label: '下载指南' }, { href: '/endfield/characters', label: '角色图鉴' }] }], en: [{ title: 'Post-test recap', description: 'Start with Pioneer Test, reward verification, Wuling, and release watch.', links: [{ href: '/endfield/guides/pioneer-test-post-test-route', label: 'Post-test route' }, { href: '/endfield/events', label: 'Status board' }] }, { title: 'Blueprint / AIC', description: 'Push factory efficiency, blueprint reuse, and build cadence deeper.', links: [{ href: '/endfield/guides/blueprint-aic-factory-guide', label: 'Blueprint / AIC' }, { href: '/endfield/build', label: 'Builds' }] }, { title: 'Start and roles', description: 'New and returning players continue into download, combat, and operators.', links: [{ href: '/endfield/guides/download-install-guide', label: 'Download guide' }, { href: '/endfield/characters', label: 'Characters' }] }], ja: [{ title: 'テスト後まとめ', description: 'Pioneer Test、報酬確認、Wuling、正式版注目を先に受け止めます。', links: [{ href: '/endfield/guides/pioneer-test-post-test-route', label: 'テスト後ルート' }, { href: '/endfield/events', label: '状態ボード' }] }, { title: 'Blueprint / AIC', description: '工場効率、ブループリント再利用、建設テンポへつなげます。', links: [{ href: '/endfield/guides/blueprint-aic-factory-guide', label: 'Blueprint / AIC' }, { href: '/endfield/build', label: 'ビルド' }] }, { title: '入門と役割', description: '新規と復帰勢をDL、戦闘、キャラへ誘導します。', links: [{ href: '/endfield/guides/download-install-guide', label: 'DLガイド' }, { href: '/endfield/characters', label: 'キャラ図鑑' }] }] },
    faq: [{ question: { zh: '终末地首页现在先看哪？', en: 'What should I open first for Endfield?', ja: 'Endfieldホームで最初に見るべきものは？' }, answer: { zh: '先看 Pioneer Test 复盘，再看蓝图 / AIC 工厂、下载配置和角色入口。', en: 'Start with the Pioneer Test recap, then blueprint / AIC factory, download specs, and operators.', ja: 'まずPioneer Testまとめ、その後ブループリント / AIC工場、DL環境、キャラへ。' } }],
  },
  skjh: {
    eyebrow: { zh: 'S2 制霸王座 / 下载入口', en: 'S2 Throne Rush / Download Hub', ja: 'S2 制霸王座 / DL導線' },
    title: { zh: '失控进化 S2、官网、下载、服务器模式与防抄家入口', en: 'Ashfall Evolution S2, download, server modes, and anti-raid hub', ja: '失控進化 S2・DL・サーバー・防衛導線' },
    description: { zh: '把 S2「制霸王座」、礼包有效期、官网/WeGame/TapTap 下载、服务器模式、安全区 / 标准 / 挑战、0-2 小时开荒和防抄家前置。', en: 'Surface S2 Throne Rush, reward validity, official/WeGame/TapTap download, server modes, safe-zone / standard / challenge, first 0-2 hours, and anti-raid basics.', ja: 'S2「制霸王座」、報酬期限、公式/WeGame/TapTap DL、サーバーモード、安全区/標準/挑戦、0-2時間開荒、防衛を前面に出します。' },
    chips: { zh: ['S2 制霸王座', '官网下载', 'WeGame', '服务器模式', '安全区', '防抄家'], en: ['S2 Throne Rush', 'Official download', 'WeGame', 'Server modes', 'Safe-zone', 'Anti-raid'], ja: ['S2 制霸王座', '公式DL', 'WeGame', 'サーバー', '安全区', '防衛'] },
    cta: { zh: '看 S2 专题', en: 'Open S2 hub', ja: 'S2特集へ' },
    tracks: { zh: [{ title: '官网与下载', description: '先解决官网、WeGame、TapTap、下载电脑版和安装前检查。', links: [{ href: '/skjh/download', label: '下载入口' }, { href: '/skjh/guides/official-pc-download-faq', label: '官方下载 FAQ' }] }, { title: 'S2 与服务器', description: 'S2 活动、礼包有效期、安全区、标准和挑战服会直接影响开局选择。', links: [{ href: '/skjh/version', label: 'S2 专题' }, { href: '/skjh/guides/server-mode-choice', label: '服务器模式' }] }, { title: '开荒与防抄家', description: '先算领地柜维护、抄家爆破和烧矿收益，再看基地防御路线。', links: [{ href: '/skjh/guides/first-2-hours-starter-route', label: '0-2 小时' }, { href: '/skjh/guides/base-location-anti-raid-plan', label: '选址防抄家' }] }], en: [{ title: 'Download and modes', description: 'Solve official PC entry, WeGame/TapTap, and install checks first.', links: [{ href: '/skjh/download', label: 'Download hub' }, { href: '/skjh/guides/official-pc-download-faq', label: 'Official PC FAQ' }] }, { title: 'S2 and servers', description: 'S2 events, reward validity, safe-zone, standard, and challenge servers shape your start.', links: [{ href: '/skjh/version', label: 'S2 hub' }, { href: '/skjh/guides/server-mode-choice', label: 'Server modes' }] }, { title: 'Starter and anti-raid', description: 'Turn tools, territory cabinet, and low-risk loot lines into a route.', links: [{ href: '/skjh/guides/first-2-hours-starter-route', label: '0-2 hour route' }, { href: '/skjh/guides/base-location-anti-raid-plan', label: 'Base sites' }] }], ja: [{ title: 'DLとモード', description: '公式PC入口、WeGame/TapTap、インストール確認を先に解決します。', links: [{ href: '/skjh/download', label: 'DL入口' }, { href: '/skjh/guides/official-pc-download-faq', label: '公式PC FAQ' }] }, { title: 'S2とサーバー', description: 'S2イベント、報酬期限、安全区、標準、挑戦が序盤選択に影響します。', links: [{ href: '/skjh/version', label: 'S2特集' }, { href: '/skjh/guides/server-mode-choice', label: 'サーバーモード' }] }, { title: '開荒と防衛', description: '道具、領地柜、低リスク資源線を実行ルートにします。', links: [{ href: '/skjh/guides/first-2-hours-starter-route', label: '0-2時間ルート' }, { href: '/skjh/guides/base-location-anti-raid-plan', label: '拠点選び' }] }] },
    faq: [{ question: { zh: '失控进化官网和下载入口应该先点哪？', en: 'What should I click first now that S2 is live?', ja: 'S2で最初に押すべきものは？' }, answer: { zh: '找安装包先点下载入口或官方下载 FAQ；准备开局再看 S2 专题、服务器模式、0-2 小时路线和防抄家。', en: 'Open download or the official PC FAQ first, then S2 hub, server modes, 0-2 hour route, and anti-raid planning.', ja: 'まずDL入口か公式PC FAQ、その後S2特集、サーバーモード、0-2時間ルート、防衛へ。' } }],
  },
  'roco-cn': {
    eyebrow: { zh: '国服上线后 / 图鉴与兑换码入口', en: 'CN Live / Codes and Encyclopedia Hub', ja: '中国版配信中 / 図鑑とコード導線' },
    title: { zh: '洛克王国世界国服图鉴、兑换码、活动与新手入口', en: 'Roco CN creature wiki, codes, events, and beginner hub', ja: 'Roco CN 図鑑・コード・イベント・初心者導線' },
    description: { zh: '把国服兑换码有效期、宠物图鉴、活动、宠物推荐、精灵培养、新手路线和与 Roco Global 分流放到首页。', en: 'Bring CN code validity, creature encyclopedia, events, creature picks, training, beginner routes, and separation from Roco Global to the homepage.', ja: '中国版コード期限、ペット図鑑、イベント、推薦、育成、初心者導線、Roco Globalとの分流をトップに出します。' },
    chips: { zh: ['国服已上线', '兑换码有效期', '宠物图鉴', '活动路线', '宠物推荐', '国际服分流'], en: ['CN live', 'Code validity', 'Creature index', 'Event route', 'Creature picks', 'Global split'], ja: ['中国版配信中', 'コード期限', 'ペット図鑑', 'イベント導線', '推薦', '国際版分流'] },
    cta: { zh: '去国服专题', en: 'Open CN hub', ja: '中国版特集へ' },
    tracks: { zh: [{ title: '兑换码与活动', description: '先确认兑换码来源、有效期和当前活动入口。', links: [{ href: '/roco-cn/redeem-codes', label: '兑换码' }, { href: '/roco-cn/version', label: '国服专题' }] }, { title: '宠物图鉴与培养', description: '先看图鉴、属性克制、宠物推荐和培养顺序。', links: [{ href: '/roco-cn/characters', label: '宠物图鉴' }, { href: '/roco-cn/tier-list', label: '节奏榜' }] }, { title: '版本分流', description: '国服上线内容和 Global CBT / Quack Quack Test 分开阅读。', links: [{ href: '/roco-cn/download', label: '国服入口' }, { href: '/roco/version', label: 'Global CBT' }] }], en: [{ title: 'Codes and events', description: 'Verify code source, validity, and current event entry first.', links: [{ href: '/roco-cn/redeem-codes', label: 'Codes' }, { href: '/roco-cn/version', label: 'CN hub' }] }, { title: 'Creatures and training', description: 'Start with the encyclopedia, type matchups, creature picks, and training order.', links: [{ href: '/roco-cn/characters', label: 'Creature index' }, { href: '/roco-cn/tier-list', label: 'Tier list' }] }, { title: 'Version split', description: 'Keep CN live content separate from Global CBT / Quack Quack Test.', links: [{ href: '/roco-cn/download', label: 'CN entry' }, { href: '/roco/version', label: 'Global CBT' }] }], ja: [{ title: 'コードとイベント', description: 'コード出典、期限、現在イベント入口を先に確認します。', links: [{ href: '/roco-cn/redeem-codes', label: 'コード' }, { href: '/roco-cn/version', label: '中国版特集' }] }, { title: 'ペット図鑑と育成', description: '図鑑、属性相性、推薦、育成順を先に確認します。', links: [{ href: '/roco-cn/characters', label: 'ペット図鑑' }, { href: '/roco-cn/tier-list', label: 'Tier' }] }, { title: '版本分流', description: '中国版配信内容とGlobal CBT / Quack Quack Testを分けて読みます。', links: [{ href: '/roco-cn/download', label: '中国版入口' }, { href: '/roco/version', label: 'Global CBT' }] }] },
    faq: [{ question: { zh: '国服和国际服内容怎么分？', en: 'How should I separate CN and global Roco content?', ja: '中国版と国際版はどう分ける？' }, answer: { zh: '国服页面看兑换码、图鉴、活动和培养；Roco Global 页面看 CBT、预注册、平台和 Quack Quack Test。', en: 'Use CN pages for codes, encyclopedia, events, and progression; use Roco Global for CBT, preregistration, platforms, and Quack Quack Test.', ja: '中国版ページはコード、図鑑、イベント、育成。Roco GlobalはCBT、事前登録、平台、Quack Quack Testへ。' } }],
  },
  roco: {
    eyebrow: { zh: 'CBT「等等鸭测试」/ 玩法入口', en: 'CBT Quack Quack Test / Gameplay', ja: 'CBT「Quack Quack Test」/ 玩法導線' },
    title: { zh: '国际服精灵图鉴、法杖与节奏榜入口', en: 'Global Jinie wiki, staves, and tier list', ja: '国際版ジニー図鑑・杖・Tier' },
    description: {
      zh: '把 CBT 已曝光精灵图鉴、法杖和早测节奏榜合到首页，先看御三家与属性克制。',
      en: 'Bring the CBT-revealed Jinie wiki, staves, and provisional tier list to the front page; start with starters and type matchups.',
      ja: 'CBT公開ジニー図鑑、杖、暫定Tierをトップにまとめ、御三家と属性相性から。',
    },
    chips: {
      zh: ['CBT 10/27', '御三家', '法杖', '早测节奏榜', '属性克制'],
      en: ['CBT Oct 27', 'Starters', 'Staves', 'Provisional tier', 'Type matchups'],
      ja: ['CBT 10/27', '御三家', '杖', '暫定Tier', '属性相性'],
    },
    cta: { zh: '去 CBT 专题', en: 'Open CBT hub', ja: 'CBT特集へ' },
    tracks: {
      zh: [
        { title: '精灵图鉴与节奏榜', description: '先看 CBT 已曝光精灵图鉴和早测强度分级。', links: [{ href: '/roco/characters', label: '精灵图鉴' }, { href: '/roco/tier-list', label: '早测节奏榜' }] },
      { title: '法杖系统', description: '法杖是纯外观特效武器，无数值攻击力，通过战令与活动获取。', links: [{ href: '/roco/weapons', label: '法杖图鉴' }, { href: '/roco/version', label: 'CBT 专题' }] },
        { title: 'CBT 与报名', description: '继续看 CBT 时间线、报名窗口与平台选择。', links: [{ href: '/roco/version', label: 'CBT 专题' }, { href: '/roco/characters', label: '精灵图鉴' }] },
      ],
      en: [
        { title: 'Jinie wiki & tier list', description: 'Check the CBT-revealed roster and provisional strength tiers.', links: [{ href: '/roco/characters', label: 'Jinie wiki' }, { href: '/roco/tier-list', label: 'Provisional tier' }] },
        { title: 'Staff system', description: 'Staves are cosmetic effect weapons with no attack stats, from passes and events.', links: [{ href: '/roco/weapons', label: 'Staff catalog' }, { href: '/roco/version', label: 'CBT hub' }] },
        { title: 'CBT & sign-up', description: 'Continue into the CBT timeline, sign-up window, and platforms.', links: [{ href: '/roco/version', label: 'CBT hub' }, { href: '/roco/characters', label: 'Jinie wiki' }] },
      ],
      ja: [
        { title: 'ジニー図鑑とTier', description: 'CBT公開ジニー図鑑と暫定Tierを確認。', links: [{ href: '/roco/characters', label: 'ジニー図鑑' }, { href: '/roco/tier-list', label: '暫定Tier' }] },
      { title: '杖システム', description: '杖は攻撃数値なしの純粋な外観武器で、パスとイベントから入手。', links: [{ href: '/roco/weapons', label: '杖図鑑' }, { href: '/roco/version', label: 'CBT特集' }] },
        { title: 'CBTと応募', description: 'CBTタイムライン、応募窓口、プラットフォームを続けて確認。', links: [{ href: '/roco/version', label: 'CBT特集' }, { href: '/roco/characters', label: 'ジニー図鑑' }] },
      ],
    },
    faq: [
      {
        question: { zh: '国际服法杖有攻击力吗？', en: 'Do global staves have attack stats?', ja: '国際版の杖に攻撃力はありますか？' },
        answer: { zh: '没有。法杖是外观特效武器，无数值攻击力，主要影响战斗特效与外观，不影响精灵基础属性。', en: 'No. Staves are cosmetic effect weapons with no attack stats; they affect combat visuals and appearance, not a Jinie\'s base stats.', ja: 'いいえ。杖は攻撃数値を持たない外観・エフェクト武器で、戦闘エフェクトと外観に影響し、ジニーの基礎ステータスには影響しません。' },
      },
      {
        question: { zh: '早测节奏榜准吗？', en: 'Is the provisional tier list reliable?', ja: '暫定Tierは信頼できますか？' },
        answer: { zh: '早测节奏榜基于 CBT 暂定分级，仅作参考；正式版精灵与数值以官方发布为准，开测后会持续校准。', en: 'The provisional tier list uses CBT ratings for reference only; the official release stats and roster take precedence and will be recalibrated after launch.', ja: '暫定TierはCBTベースの参考値です。正式版の数値とラインナップは公式基準で、開測後に調整します。' },
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

const ROCO_DAILY_COPY: Record<'roco' | 'roco-cn', RocoDailyCard[]> = {
  roco: [
    {
      href: '/roco/events',
      icon: '📰',
      title: { zh: 'CBT 活动日历', en: 'CBT events', ja: 'CBTイベント' },
      description: {
        zh: '跟进报名窗口、首测时间和官方奖励节点。',
        en: 'Track sign-up windows, CBT timing, and official reward milestones.',
        ja: '応募期間、CBT日程、公式報酬节点を確認。',
      },
      metric: () => 'Live',
      action: { zh: '看活动', en: 'Open events', ja: 'イベントへ' },
    },
    {
      href: '/roco/characters',
      icon: '👤',
      title: { zh: '精灵图鉴', en: 'Jinie wiki', ja: 'ジニー図鑑' },
      description: {
        zh: '查看已曝光精灵、属性、稀有度与进化链。',
        en: 'Browse revealed Jinies, types, rarity, and evolution lines.',
        ja: '公開ジニー、属性、レア度、進化を確認。',
      },
      metric: (stats, locale) => locale === 'zh' ? `${stats.characters} 只` : locale === 'ja' ? `${stats.characters}体` : `${stats.characters} Jinies`,
      action: { zh: '打开图鉴', en: 'Open wiki', ja: '図鑑へ' },
    },
    {
      href: '/roco/tier-list',
      icon: '🏆',
      title: { zh: '早测节奏榜', en: 'Provisional tier', ja: '暫定Tier' },
      description: {
        zh: '基于 CBT 暂定分级，正式上线后继续校准。',
        en: 'CBT-based ratings that will be recalibrated after launch.',
        ja: 'CBTベースの評価。リリース後に調整。',
      },
      metric: () => 'CBT',
      action: { zh: '看强度', en: 'View tiers', ja: 'Tierを見る' },
    },
    {
      href: '/roco/weapons',
      icon: '⚔️',
      title: { zh: '法杖外观', en: 'Staff catalog', ja: '杖図鑑' },
      description: {
        zh: '法杖是外观特效武器，不提供攻击力成长。',
        en: 'Staves are cosmetic effect weapons, not attack-stat gear.',
        ja: '杖は攻撃値なしの外観武器です。',
      },
      metric: (stats, locale) => locale === 'zh' ? `${stats.weapons} 款` : locale === 'ja' ? `${stats.weapons}本` : `${stats.weapons} staves`,
      action: { zh: '查看法杖', en: 'View staves', ja: '杖を見る' },
    },
    {
      href: '/roco/eggs',
      icon: '🥚',
      title: { zh: '精灵蛋观察', en: 'Egg watch', ja: '卵ウォッチ' },
      description: {
        zh: '整理蛋种、预约奖励和首测后需要核验的孵化信息。',
        en: 'Track egg types, preregistration rewards, and CBT hatching checks.',
        ja: '卵種、事前登録報酬、CBT孵化確認を整理。',
      },
      metric: () => 'Watch',
      action: { zh: '看精灵蛋', en: 'Open eggs', ja: '卵へ' },
    },
    {
      href: '/roco/merchant',
      icon: '🧾',
      title: { zh: '商人待核验', en: 'Merchant watch', ja: '商人確認待ち' },
      description: {
        zh: '开测后优先核验捕捉球、经验材料和周期商店。',
        en: 'Track capture pods, EXP materials, and shop rotations after CBT opens.',
        ja: 'CBT後に捕獲、経験値素材、ショップ周期を確認。',
      },
      metric: () => 'Watch',
      action: { zh: '看商人', en: 'Open merchant', ja: '商人へ' },
    },
  ],
  'roco-cn': [
    {
      href: '/roco-cn/events',
      icon: '📰',
      title: { zh: '活动日历', en: 'Events calendar', ja: 'イベント日程' },
      description: {
        zh: '按进行中、即将开始和已结束查看赛季与兑换码。',
        en: 'Review live, upcoming, and ended seasons and code windows.',
        ja: '開催中、近日開始、終了したシーズンとコードを確認。',
      },
      metric: () => 'Live',
      action: { zh: '看活动', en: 'Open events', ja: 'イベントへ' },
    },
    {
      href: '/roco-cn/characters',
      icon: '👤',
      title: { zh: '精灵图鉴', en: 'Jinie wiki', ja: 'ジニー図鑑' },
      description: {
        zh: '筛选国服精灵、属性、技能和进化链。',
        en: 'Filter CN Jinies by type, skills, and evolution lines.',
        ja: '中国版ジニーの属性、スキル、進化を確認。',
      },
      metric: (stats, locale) => locale === 'zh' ? `${stats.characters} 只` : locale === 'ja' ? `${stats.characters}体` : `${stats.characters} Jinies`,
      action: { zh: '打开图鉴', en: 'Open wiki', ja: '図鑑へ' },
    },
    {
      href: '/roco-cn/redeem-codes',
      icon: '🎁',
      title: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' },
      description: {
        zh: '集中核验国服礼包码、奖励与过期状态。',
        en: 'Check CN codes, rewards, and expiration status.',
        ja: '中国版コード、報酬、期限を確認。',
      },
      metric: (_stats, locale) => locale === 'zh' ? '有效码' : locale === 'ja' ? '有効コード' : 'Active',
      action: { zh: '领取奖励', en: 'Check rewards', ja: '報酬確認' },
    },
    {
      href: '/roco-cn/eggs',
      icon: '🥚',
      title: { zh: '精灵蛋', en: 'Eggs', ja: '卵' },
      description: {
        zh: '查看活动蛋、异色蛋和兑换优先级。',
        en: 'Check event eggs, shiny eggs, and exchange priorities.',
        ja: 'イベント卵、色違い卵、交換優先度を確認。',
      },
      metric: (_stats, locale) => locale === 'zh' ? '限时优先' : locale === 'ja' ? '限定優先' : 'Limited first',
      action: { zh: '看精灵蛋', en: 'Open eggs', ja: '卵へ' },
    },
    {
      href: '/roco-cn/weapons',
      icon: '⚔️',
      title: { zh: '法杖外观', en: 'Staff catalog', ja: '杖図鑑' },
      description: {
        zh: '按活动、战令和商城来源查看法杖特效。',
        en: 'Browse staff effects by event, pass, and shop source.',
        ja: 'イベント、パス、ショップ別に杖を確認。',
      },
      metric: (stats, locale) => locale === 'zh' ? `${stats.weapons} 款` : locale === 'ja' ? `${stats.weapons}本` : `${stats.weapons} staves`,
      action: { zh: '查看法杖', en: 'View staves', ja: '杖を見る' },
    },
    {
      href: '/roco-cn/merchant',
      icon: '🧾',
      title: { zh: '商人刷新', en: 'Merchant refresh', ja: '商人更新' },
      description: {
        zh: '查看远行商人、活动商店和每日购买优先级。',
        en: 'Check wandering merchants, event shops, and daily buy priorities.',
        ja: '行商人、イベントショップ、毎日の購入優先度を確認。',
      },
      metric: (_stats, locale) => locale === 'zh' ? '每日复核' : locale === 'ja' ? '毎日確認' : 'Daily',
      action: { zh: '看商店', en: 'Open shops', ja: 'ショップへ' },
    },
  ],
};

// --- Helper: resolve character data ---
interface CharInfo { id: string; name: string; image: string }

async function getCharInfos(gameId: GameId, locale: SupportedLocale): Promise<CharInfo[]> {
  const ids = FEATURED_CHARS[gameId] ?? [];
  return getCharacterSummariesByIds(gameId, ids, locale);
}

// --- Helper: get guides for a game ---
interface GuideInfo { id: string; title: string; summary: string }

const FEATURED_GUIDE_IDS: Record<string, string[]> = {
  genshin: ['lightrace-wish-phase-ii-faq', 'phase-ii-columbina-raiden-pull-plan', 'banner-schedule-guide'],
  starrail: ['banner-schedule-guide', 'fate-rin-gilgamesh-reward-faq', 'himeko-nova-fate-pull-plan'],
  wuwa: ['v3-7-live-route', 'echo-advanced-guide', 'farming-guide'],
  nte: ['999-nights-mode-guide', 'shinku-iroi-pull-plan', 'v1-2-999-nights-guide'],
  zzz: ['banner-schedule-guide', 'anniversary-rewards-codes-plan', 'v3-1-anniversary-xbox-guide'],
  guihuan: ['test-recruit-international-download-faq', 'official-release-company-faq', 'test-release-timeline-guide'],
  ananta: ['release-date-beta-pc-faq', 'download-install-guide', 'gameplay-city-no-gacha-comparison-faq'],
  endfield: ['pioneer-test-post-test-route', 'blueprint-aic-factory-guide', 'homecoming-update-guide'],
  sea: ['identity-v-signin-screenshot-rewards-guide', 'lost-sea-new-islands-ship-prep-guide', 'sea-of-remnants-p2w-gacha-explained'],
  skjh: ['official-pc-download-faq', 'first-2-hours-starter-route', 'base-location-anti-raid-plan'],
  aniimo: ['s1-new-player-route', 'rainbow-aniimo-guide', 'homeland-resource-guide'],
};

async function getGuideInfos(gameId: GameId, locale: SupportedLocale): Promise<GuideInfo[]> {
  const featuredIds = FEATURED_GUIDE_IDS[gameId] ?? [];
  const { guides } = await getGuideListData(gameId, locale);
  const guideMap = new Map(guides.map((guide) => [guide.id, guide] as const));
  const featured = featuredIds.map((id) => guideMap.get(id)).filter((guide): guide is typeof guides[number] => Boolean(guide));
  const fallback = guides.filter((guide) => !featuredIds.includes(guide.id));
  return [...featured, ...fallback].slice(0, 3).map((guide) => ({ id: guide.id, title: guide.title, summary: guide.summary }));
}

async function getRocoDashboardStats(
  gameId: GameId,
  guideCount: number,
  enabledRouteCount: number,
): Promise<RocoDashboardStats | null> {
  if (gameId === 'roco') {
    const [{ rocoCharacters }, { rocoWeapons }] = await Promise.all([
      import('@gachia/data/games/roco/characters'),
      import('@gachia/data/games/roco/weapons'),
    ]);
    return {
      characters: rocoCharacters.length,
      guides: guideCount,
      weapons: rocoWeapons.length,
      enabledRoutes: enabledRouteCount,
      codeStatus: 'watch',
    };
  }

  if (gameId === 'roco-cn') {
    const [{ rocoCnCharacterSummaries }, { rocoCnWeapons }] = await Promise.all([
      import('@gachia/data/games/roco-cn/character-summaries'),
      import('@gachia/data/games/roco-cn/weapons'),
    ]);
    return {
      characters: rocoCnCharacterSummaries.length,
      guides: guideCount,
      weapons: rocoCnWeapons.length,
      enabledRoutes: enabledRouteCount,
      codeStatus: 'active',
    };
  }

  return null;
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

  const title = GAME_META_TITLES[gameId]?.[locale] ?? (locale === 'zh'
    ? `${gameName}攻略Wiki — 角色图鉴/武器/圣遗物/攻略`
    : locale === 'ja'
      ? `${gameName}攻略Wiki — キャラ/武器/ガイド`
      : `${gameName} Wiki — Characters, Weapons, Builds & Guides`);

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

  const [chars, guides] = await Promise.all([
    getCharInfos(gameId, locale),
    getGuideInfos(gameId, locale),
  ]);
  const rocoDashboardStats = await getRocoDashboardStats(gameId, guides.length, enabledRoutes.length);
  const rocoDailyCards = gameId === 'roco' || gameId === 'roco-cn' ? ROCO_DAILY_COPY[gameId] : null;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Gachia', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: gameConfig.name[locale], item: `${BASE_URL}/${locale}/${gameId}` },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      {/* Game Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
            <img
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
                    <Link href={`/${gameId}/calculator` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '资源计算器' : locale === 'ja' ? '資源計算機' : 'Resource Calculator'}
                    </Link>
                  </>
                )}
                {gameId === 'zzz' && (
                  <>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '版本专题' : locale === 'ja' ? 'バージョン特集' : 'Version Hub'}
                    </Link>
                    <Link href={`/${gameId}/guides/banner-schedule-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '当前卡池' : locale === 'ja' ? '現在バナー' : 'Current Banners'}
                    </Link>
                    <Link href={`/${gameId}/guides/meta-teams-v3-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '当前版本配队' : locale === 'ja' ? '現在版本の編成' : 'Current Meta Teams'}
                    </Link>
                    <Link href={`/${gameId}/guides/w-engine-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '音擎指南' : locale === 'ja' ? 'Wエンジン' : 'W-Engine Guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/drive-disc-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '驱动盘指南' : locale === 'ja' ? 'ディスク攻略' : 'Drive Disc Guide'}
                    </Link>
                    <Link href={`/${gameId}/guides/steam-3-0-start-guide` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'Steam 入坑' : locale === 'ja' ? 'Steam入門' : 'Steam Starter'}
                    </Link>
                  </>
                )}
                {gameId === 'wuwa' && (
                  <>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '版本专题' : locale === 'ja' ? 'バージョン特集' : 'Version Hub'}
                    </Link>
                    <Link href={`/${gameId}/guides/v3-7-live-route` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '3.7 上线后路线' : locale === 'ja' ? 'Ver.3.7実装後ルート' : 'v3.7 Live Route'}
                    </Link>
                    <Link href={`/${gameId}/events` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '3.7 活动看板' : locale === 'ja' ? 'Ver.3.7イベント' : 'v3.7 Events'}
                    </Link>
                    <Link href={`/${gameId}/map` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '梦枢天罗地图' : locale === 'ja' ? '夢枢天羅マップ' : 'Simulacrum Nexus Map'}
                    </Link>
                  </>
                )}
                {gameId === 'endfield' && (
                  <>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '测试复盘' : locale === 'ja' ? 'テストまとめ' : 'Test Recap'}
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
                {gameId === 'roco-cn' && (
                  <>
                    <Link href={`/${gameId}/characters` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '精灵图鉴' : locale === 'ja' ? 'ジニー図鑑' : 'Jinie wiki'}
                    </Link>
                    <Link href={`/${gameId}/weapons` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '法杖图鉴' : locale === 'ja' ? '杖図鑑' : 'Staff catalog'}
                    </Link>
                    <Link href={`/${gameId}/tier-list` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '节奏榜' : locale === 'ja' ? 'Tier' : 'Tier list'}
                    </Link>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'S2 专题' : locale === 'ja' ? 'S2特集' : 'S2 hub'}
                    </Link>
                  </>
                )}
                {gameId === 'roco' && (
                  <>
                    <Link href={`/${gameId}/characters` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '精灵图鉴' : locale === 'ja' ? 'ジニー図鑑' : 'Jinie wiki'}
                    </Link>
                    <Link href={`/${gameId}/weapons` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '法杖图鉴' : locale === 'ja' ? '杖図鑑' : 'Staff catalog'}
                    </Link>
                    <Link href={`/${gameId}/tier-list` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? '早测节奏榜' : locale === 'ja' ? '暫定Tier' : 'Provisional tier'}
                    </Link>
                    <Link href={`/${gameId}/version` as '/'} className="rounded-full border border-game-border px-4 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
                      {locale === 'zh' ? 'CBT 专题' : locale === 'ja' ? 'CBT特集' : 'CBT hub'}
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

      {rocoDashboardStats && rocoDailyCards && (
        <section className="mb-10 rounded-2xl border border-game-border bg-game-surface p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-game-primary">
                {locale === 'zh' ? '今日入口' : locale === 'ja' ? '今日の入口' : 'Today hub'}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-game-text">
                {gameId === 'roco-cn'
                  ? locale === 'zh' ? '国服日常资料入口' : locale === 'ja' ? '中国版デイリー資料入口' : 'CN daily data hub'
                  : locale === 'zh' ? '国际服 CBT 跟进入口' : locale === 'ja' ? '国際版CBT確認入口' : 'Global CBT watch hub'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-game-text-muted">
                {gameId === 'roco-cn'
                  ? locale === 'zh'
                    ? '把活动、兑换码、精灵图鉴、法杖和地图路线放在同一屏，适合每天快速确认下一步。'
                    : locale === 'ja'
                      ? 'イベント、コード、ジニー図鑑、杖、マップ導線を一画面にまとめます。'
                      : 'Events, codes, Jinies, staves, and map routes are grouped for quick daily checks.'
                  : locale === 'zh'
                    ? '国际服仍处于 CBT 信息核验阶段，先追踪测试节点、精灵图鉴、法杖和待补地图。'
                    : locale === 'ja'
                      ? '国際版はCBT情報確認中。日程、ジニー、杖、マップ待ち項目を先に追跡します。'
                      : 'Global is still in CBT verification, so this hub tracks timing, Jinies, staves, and map watch items.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right text-xs text-game-text-muted sm:grid-cols-4">
              <div className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-2">
                <div className="text-base font-bold text-game-text">{rocoDashboardStats.characters}</div>
                <div>{locale === 'zh' ? '精灵' : locale === 'ja' ? 'ジニー' : 'Jinies'}</div>
              </div>
              <div className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-2">
                <div className="text-base font-bold text-game-text">{rocoDashboardStats.weapons}</div>
                <div>{locale === 'zh' ? '法杖' : locale === 'ja' ? '杖' : 'Staves'}</div>
              </div>
              <div className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-2">
                <div className="text-base font-bold text-game-text">{rocoDashboardStats.guides}</div>
                <div>{locale === 'zh' ? '精选攻略' : locale === 'ja' ? '注目ガイド' : 'Featured guides'}</div>
              </div>
              <div className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-2">
                <div className="text-base font-bold text-game-text">{rocoDashboardStats.enabledRoutes}</div>
                <div>{locale === 'zh' ? '可用入口' : locale === 'ja' ? '入口' : 'Routes'}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rocoDailyCards.map((card) => (
              <Link
                key={card.href}
                href={card.href as '/'}
                className="group flex min-h-[150px] flex-col rounded-xl border border-game-border bg-game-surface-alt p-4 transition-all hover:border-game-primary/60 hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-2xl" aria-hidden="true">{card.icon}</span>
                  <span className="rounded-full bg-game-surface px-3 py-1 text-xs font-semibold text-game-primary">
                    {card.metric(rocoDashboardStats, locale)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-game-text group-hover:text-game-primary">
                  {card.title[locale]}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-game-text-muted">
                  {card.description[locale]}
                </p>
                <span className="mt-4 text-sm font-semibold text-game-primary">
                  {card.action[locale]}
                </span>
              </Link>
            ))}
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
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: gameConfig.theme.primary }}
              >
                {gameId === 'nte'
                  ? locale === 'zh' ? '异环角色图鉴入口' : locale === 'ja' ? 'NTE キャラWiki入口' : 'NTE character wiki entry'
                  : gameId === 'sea'
                    ? locale === 'zh' ? '遗忘之海角色图鉴入口' : locale === 'ja' ? 'Sea of Remnants キャラWiki入口' : 'Sea of Remnants character wiki entry'
                    : t.featuredTitle}
              </h2>
              {(gameId === 'nte' || gameId === 'sea') && (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-game-text-muted">
                  {gameId === 'nte'
                    ? locale === 'zh'
                      ? '先看高频角色、强度排行和抽卡价值，再进入完整角色图鉴。'
                      : locale === 'ja'
                        ? '主要キャラ、Tier、ガチャ価値を確認してから全キャラWikiへ。'
                        : 'Start with high-frequency characters, tier value, and pull planning before opening the full roster.'
                    : locale === 'zh'
                      ? '先看高频船员、强度排行和开荒培养顺序，再进入完整角色图鉴。'
                      : locale === 'ja'
                        ? '主要キャラ、Tier、序盤育成順を確認してから全キャラWikiへ。'
                        : 'Start with frequent crews, tier value, and early progression before opening the full roster.'}
                </p>
              )}
            </div>
            {(gameId === 'nte' || gameId === 'sea') && (
              <Link
                href={`/${gameId}/characters` as '/'}
                className="inline-flex rounded-full border border-game-border px-4 py-2 text-sm font-semibold text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {locale === 'zh' ? '查看全部角色' : locale === 'ja' ? '全キャラを見る' : 'View all characters'}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {chars.map((char) => (
              <Link
                key={char.id}
                href={`/${gameId}/characters/${char.id}` as '/'}
                className="group flex items-center gap-2.5 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  <img
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

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
};

// --- Route icons ---
const ROUTE_ICONS: Record<string, string> = {
  characters: '👤', weapons: '⚔️', items: '📦', 'tier-list': '🏆',
  calculator: '🔢', map: '🗺️', guides: '📖', artifacts: '🏺',
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
  }
  return results;
}

// --- Helper: get guides for a game ---
interface GuideInfo { id: string; title: string; summary: string }

function getGuideInfos(gameId: string, locale: SupportedLocale): GuideInfo[] {
  switch (gameId) {
    case 'genshin':
      return genshinGuides.slice(0, 3).map(g => ({ id: g.id, title: getGenshinGuideTitle(g, locale), summary: getGenshinGuideSummary(g, locale) }));
    case 'starrail':
      return starrailGuides.slice(0, 3).map(g => ({ id: g.id, title: getStarRailGuideTitle(g, locale), summary: getStarRailGuideSummary(g, locale) }));
    case 'wuwa':
      return wuwaGuides.slice(0, 3).map(g => ({ id: g.id, title: getWuWaGuideTitle(g, locale), summary: getWuWaGuideSummary(g, locale) }));
    case 'nte':
      return nteGuides.slice(0, 3).map(g => ({ id: g.id, title: getNteGuideTitle(g, locale), summary: getNteGuideSummary(g, locale) }));
    case 'zzz':
      return zzzGuides.slice(0, 3).map(g => ({ id: g.id, title: getZzzGuideTitle(g, locale), summary: getZzzGuideSummary(g, locale) }));
    case 'guihuan':
      return guihuanGuides.slice(0, 3).map(g => ({ id: g.id, title: getGuihuanGuideTitle(g, locale), summary: getGuihuanGuideSummary(g, locale) }));
    case 'ananta':
      return anantaGuides.slice(0, 3).map(g => ({ id: g.id, title: getAnantaGuideTitle(g, locale), summary: getAnantaGuideSummary(g, locale) }));
    case 'endfield':
      return endfieldGuides.slice(0, 3).map(g => ({ id: g.id, title: getEndfieldGuideTitle(g, locale), summary: getEndfieldGuideSummary(g, locale) }));
    default:
      return [];
  }
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

import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { IMAGE_BASE } from '@gachia/data/image-base';
import {
  genshinCharacters, starrailCharacters, wuwaCharacters, nteCharacters,
  zzzCharacters, guihuanCharacters, anantaCharacters,
  getGenshinCharacterName, getGenshinCharacterImage,
  getStarRailCharacterName, getStarRailCharacterImage,
  getWuWaCharacterName, getWuWaCharacterImage,
  getNteCharacterName, getNteCharacterImage,
  getZzzCharacterName, getZzzCharacterImage,
  getGuihuanCharacterName, getGuihuanCharacterImage,
  getAnantaCharacterName, getAnantaCharacterImage,
  genshinGuides, starrailGuides, wuwaGuides, nteGuides,
  zzzGuides, guihuanGuides, anantaGuides,
  getGenshinGuideTitle, getGenshinGuideSummary,
  getStarRailGuideTitle, getStarRailGuideSummary,
  getWuWaGuideTitle, getWuWaGuideSummary,
  getGuideTitle as getNteGuideTitle, getGuideSummary as getNteGuideSummary,
  getZzzGuideTitle, getZzzGuideSummary,
  getGuihuanGuideTitle, getGuihuanGuideSummary,
  getAnantaGuideTitle, getAnantaGuideSummary,
} from '@gachia/data';
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
    zh: '原神角色图鉴、武器数据库、圣遗物推荐、攻略百科。查看角色 builds、配队推荐、材料路线图。',
    en: 'Genshin Impact character builds, weapon database, artifact recommendations, and guides. Find team comps, material farming routes, and tier lists.',
    ja: '原神キャラビルド、武器データベース、聖遺物おすすめ、攻略百科。チーム編成、素材周回ルート、Tierリスト。',
  },
  starrail: {
    zh: '崩坏：星穹铁道角色图鉴、光锥数据库、遗器推荐、攻略百科。',
    en: 'Honkai: Star Rail character builds, light cone database, relic recommendations, and guides.',
    ja: '崩壊：スターレイルキャラビルド、光円錐データベース、遺物おすすめ、攻略百科。',
  },
  wuwa: {
    zh: '鸣潮角色图鉴、武器数据、声骸推荐、攻略百科。',
    en: 'Wuthering Waves character builds, weapon database, echo recommendations, and guides.',
    ja: '鳴潮キャラビルド、武器データベース、エコーおすすめ、攻略百科。',
  },
  nte: {
    zh: '异环角色图鉴、武器数据、光盘推荐、攻略百科。',
    en: 'Neverness to Everness character builds, weapon database, disk set guides, and more.',
    ja: '異環キャラビルド、武器データベース、ディスクおすすめ、攻略百科。',
  },
  zzz: {
    zh: '绝区零代理人图鉴、音擎数据、驱动盘推荐、攻略百科。',
    en: 'Zenless Zone Zero agent builds, W-Engine database, drive disc recommendations, and guides.',
    ja: 'ゼンレスゾーンゼロエージェントビルド、Wエンジンデータ、ドライブディスクおすすめ、攻略百科。',
  },
  guihuan: {
    zh: '归环角色图鉴、武器数据、攻略百科。',
    en: 'Guihuan character builds, weapon database, and guides.',
    ja: '帰環キャラビルド、武器データ、攻略百科。',
  },
  ananta: {
    zh: '无限大角色图鉴、武器数据、攻略百科。',
    en: 'Ananta character builds, weapon database, and guides.',
    ja: '無限大キャラビルド、武器データ、攻略百科。',
  },
};

// SEO-rich about paragraphs per game per locale
const GAME_ABOUT: Record<string, Record<string, string>> = {
  genshin: {
    zh: '原神（Genshin Impact）是米哈游开发的开放世界动作 RPG 游戏。Gachia 提供完整的原神角色图鉴，覆盖全部五星、四星角色的属性、技能、命之座、突破材料与配装推荐。圣遗物数据库包含所有套装效果与最佳适配角色。武器数据库按类型和稀有度分类，提供满级属性与特效说明。节奏榜帮助玩家了解当前版本强势角色，配队工具支持多种元素反应组合。',
    en: 'Genshin Impact is an open-world action RPG developed by HoYoverse. Gachia provides a complete Genshin character database covering all 5-star and 4-star characters with stats, talents, constellations, ascension materials, and recommended builds. Our artifact database lists every set with 2pc/4pc effects and best characters. The weapon database is organized by type and rarity with max-level stats and passive descriptions. Use the tier list to find meta characters and the team builder to explore elemental reaction combos.',
    ja: '原神（Genshin Impact）はHoYoverseが開発したオープンワールドアクションRPGです。Gachiaでは全★5・★4キャラクターのステータス、スキル、命ノ星座、突破素材、おすすめビルドを網羅したキャラ図鑑を提供しています。聖遺物データベースには全セットの2セット/4セット効果と最適キャラを掲載。武器はタイプ別・レアリティ別に分類し、最大レベルステータスと特殊効果を確認できます。',
  },
  starrail: {
    zh: '崩坏：星穹铁道（Honkai: Star Rail）是米哈游开发的回合制策略 RPG。Gachia 提供全角色图鉴、光锥数据库、遗器推荐、配队方案与伤害计算器。角色按命途（毁灭、存护、巡猎、智识、谐乐、虚无、丰饶）分类，包含完整技能与行迹数据。',
    en: 'Honkai: Star Rail is a turn-based strategy RPG by HoYoverse. Gachia offers a full character database, light cone encyclopedia, relic recommendations, team comps, and a damage calculator. Characters are organized by Path (Destruction, Preservation, Hunt, Erudition, Harmony, Nihility, Abundance) with complete skill and trace data.',
    ja: '崩壊：スターレイル（Honkai: Star Rail）はHoYoverseのターン制ストラテジーRPGです。Gachiaでは全キャラ図鑑、光円錐データベース、遺物おすすめ、パーティ編成、ダメージ計算機を提供しています。キャラは運命（壊滅、存護、巡狩、知恵、調和、虚無、豊穣）別に分類し、スキルと軌跡データを完全網羅。',
  },
  wuwa: {
    zh: '鸣潮（Wuthering Waves）是库洛游戏开发的开放世界动作 RPG。Gachia 提供鸣潮角色图鉴、武器数据、声骸系统详解、配装推荐与配队方案。声骸按cost等级和套装效果分类，帮助玩家快速找到最优搭配。',
    en: 'Wuthering Waves is an open-world action RPG developed by Kuro Games. Gachia provides character guides, weapon data, an echo system encyclopedia, build recommendations, and team comps. Echoes are organized by cost tier and set effects to help you find the best combos quickly.',
    ja: '鳴潮（Wuthering Waves）はKuro Gamesが開発したオープンワールドアクションRPGです。Gachiaではキャラ図鑑、武器データ、エコーシステム解説、ビルドおすすめ、パーティ編成を提供。エコーはコストティアとセット効果別に分類し、最適な組み合わせを素早く見つけられます。',
  },
  nte: {
    zh: '异环（Neverness to Everness）是 Hotta Studio 开发的超自然开放世界游戏。Gachia 提供最全的异环数据库，包含角色图鉴、武器数据、光盘套装推荐、兑换码汇总、祈愿模拟与异象系统。覆盖全部 S 级与 A 级角色，提供详细的技能解析与配装方案。',
    en: 'Neverness to Everness (NTE) is a supernatural open-world game by Hotta Studio. Gachia offers the most comprehensive NTE database with character guides, weapon data, disk set recommendations, redeem codes, gacha simulator, and anomaly system. All S-rank and A-rank characters are covered with detailed skill breakdowns and build guides.',
    ja: '異環（Neverness to Everness）はHotta Studioの超自然オープンワールドゲームです。Gachiaは最も充実したNTEデータベースを提供。キャラ図鑑、武器データ、ディスクセットおすすめ、交換コード、ガチャシミュレーター、アノマリーシステムを網羅。全S級・A級キャラのスキル解説とビルドガイドを掲載。',
  },
  zzz: {
    zh: '绝区零（Zenless Zone Zero）是米哈游开发的都市动作游戏。Gachia 提供代理人图鉴、音擎（W-Engine）数据库、驱动盘推荐与配装方案。角色按属性和特殊类型分类，包含完整技能数据与最佳配队推荐。',
    en: 'Zenless Zone Zero (ZZZ) is an urban action game by HoYoverse. Gachia provides an agent database, W-Engine encyclopedia, drive disc recommendations, and build guides. Characters are organized by attribute and specialty with complete skill data and best team suggestions.',
    ja: 'ゼンレスゾーンゼロ（ZZZ）はHoYoverseの都市アクションゲームです。Gachiaではエージェント図鑑、Wエンジンデータベース、ドライブディスクおすすめ、ビルドガイドを提供。キャラは属性とスペシャリティ別に分類し、スキルデータと最適パーティを完全網羅。',
  },
  guihuan: {
    zh: '归环（Guihuan）是一款二次元开放世界冒险游戏。Gachia 提供归环角色图鉴、武器数据库、配装推荐与攻略百科，帮助玩家快速上手游戏并了解各角色的最优培养路线。',
    en: 'Guihuan is an anime open-world adventure game. Gachia provides a character database, weapon encyclopedia, build recommendations, and strategy guides to help players get started and optimize character development.',
    ja: '帰環（Guihuan）は二次元オープンワールドアドベンチャーゲームです。Gachiaではキャラ図鑑、武器データベース、ビルドおすすめ、攻略百科を提供し、プレイヤーの迅速なスタートとキャラ育成をサポートします。',
  },
  ananta: {
    zh: '无限大（Ananta）是一款二次元开放世界动作游戏。Gachia 提供角色图鉴、武器数据库、配装推荐与攻略百科，覆盖全部可用角色的技能解析与最佳装备搭配。',
    en: 'Ananta is an anime open-world action game. Gachia offers a character database, weapon encyclopedia, build recommendations, and strategy guides covering all available characters with skill breakdowns and optimal equipment.',
    ja: '無限大（Ananta）は二次元オープンワールドアクションゲームです。Gachiaではキャラ図鑑、武器データベース、ビルドおすすめ、攻略百科を提供。全キャラのスキル解説と最適装備を網羅しています。',
  },
};

// --- Featured character IDs per game ---
const FEATURED_CHARS: Record<string, string[]> = {
  genshin: ['hu-tao', 'raiden-shogun', 'furina', 'nahida', 'kazuha', 'zhongli', 'yelan'],
  starrail: ['kafka', 'jingliu', 'acheron', 'firefly', 'robin', 'ruan-mei'],
  wuwa: ['jiyan', 'yinlin', 'jiinshi', 'camellya', 'rover-aero'],
  nte: ['chiz', 'aurelia', 'skia', 'haniel', 'sakiri', 'nanally'],
  zzz: ['ellen-joe', 'zhu-yuan', 'miyabi', 'burnice-white', 'caesar-king'],
  guihuan: [],
  ananta: [],
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

  return {
    title: `${gameName} Wiki`,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}`, languages },
    openGraph: {
      title: `${gameName} Wiki`,
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
        <h1
          className="mb-2 text-3xl font-bold"
          style={{ color: gameConfig.theme.primary }}
        >
          {gameConfig.name[locale]}
        </h1>
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

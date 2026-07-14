import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import type { Metadata } from 'next';
import {
  regions as genshinRegions,
  getRegionName as getGenshinRegionName,
  getRegionDescription as getGenshinRegionDescription,
} from '@gachia/data/games/genshin/regions';
import {
  regions as wuwaRegions,
  getRegionName as getWuWaRegionName,
  getRegionDescription as getWuWaRegionDescription,
} from '@gachia/data/games/wuwa/regions';
import {
  regions as starrailRegions,
  getRegionName as getStarRailRegionName,
  getRegionDescription as getStarRailRegionDescription,
} from '@gachia/data/games/starrail/regions';
import {
  regions as nteRegions,
  getRegionName as getNteRegionName,
  getRegionDescription as getNteRegionDescription,
} from '@gachia/data/games/nte/regions';
import {
  regions as endfieldRegions,
  getRegionName as getEndfieldRegionName,
  getRegionDescription as getEndfieldRegionDescription,
} from '@gachia/data/games/endfield/regions';
import { genshinMapData } from '@gachia/data/games/genshin/map-data';
import type { StarRailRegion } from '@gachia/data/games/starrail/types';
import type { NteRegion } from '@gachia/data/games/nte/types';
import type { EndfieldRegion } from '@gachia/data/games/endfield/types';
import { MapLoader } from './_components/MapLoader';
import { ensureMetaLength } from '@/lib/seo-metadata';

const REGION_ICONS: Record<string, string> = {
  mondstadt: '🌬️', liyue: '⛰️', inazuma: '⚡', sumeru: '🌿',
  fontaine: '💧', natlan: '🔥', chasm: '⛏️',
};

const BASE_URL = 'https://gachia.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}): Promise<Metadata> {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];
  if (!gameConfig || (gameId !== 'genshin' && gameId !== 'starrail' && gameId !== 'wuwa' && gameId !== 'nte' && gameId !== 'endfield' && gameId !== 'skjh')) {
    return { title: 'Map', robots: { index: false, follow: false } };
  }
  const gameName = gameConfig.name[locale];
  const title = gameId === 'skjh'
    ? locale === 'zh'
      ? `${gameName}荒岛路线地图 — 据点、采集线、基地选址`
      : locale === 'ja'
        ? `${gameName}島ルートマップ — 拠点、採集、基地候補`
        : `${gameName} Island Route Map — POIs, Farming Routes & Base Spots`
    : locale === 'zh'
    ? `${gameName}互动地图 — 传送锚点、宝箱、收集品`
    : locale === 'ja'
      ? `${gameName}マップ — テレポート、宝箱、コレクション`
      : `${gameName} Interactive Map — Teleports, Chests & Collectibles`;
  const desc = gameId === 'skjh'
    ? locale === 'zh'
      ? `${gameName}荒岛路线地图预留：4×4km荒岛、一级据点、废弃超市、加油站、高价值据点、安全区/危险区、新手采集线和基地选址建议。`
      : locale === 'ja'
        ? `${gameName}島ルートマップ：4x4km島、低級拠点、廃スーパー、ガソリンスタンド、高価値拠点、安全区/危険区、採集ルート。`
        : `${gameName} island route map placeholder: 4x4km island, tier-one POIs, abandoned supermarket, gas station, high-value zones, safe and danger routes, and base-spot planning.`
    : locale === 'zh'
    ? `${gameName}互动地图攻略：传送锚点位置、宝箱分布、材料采集点、世界任务标记。`
    : locale === 'ja'
      ? `${gameName}マップ攻略：テレポート位置、宝箱分布、素材採集ポイント。`
      : `${gameName} interactive map guide: teleport waypoints, chest locations, material farming spots, and world quest markers.`;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/map`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/map`;
  const description = ensureMetaLength(desc, locale);

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/map`, languages },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/map`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function MapPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  // Genshin gets the interactive map
  if (gameId === 'genshin') {
    return <GenshinMapPage locale={locale} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaMapPage locale={locale} />;
  }

  if (gameId === 'starrail') {
    return <StarRailMapPage locale={locale} />;
  }

  if (gameId === 'nte') {
    return <NteMapPage locale={locale} />;
  }

  if (gameId === 'endfield') {
    return <EndfieldMapPage locale={locale} />;
  }

  if (gameId === 'skjh') {
    return <SkjhMapPage locale={locale} />;
  }

  // Unsupported games: Coming Soon
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '地图攻略' : locale === 'ja' ? 'マップ攻略' : 'Map Guide'}
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          {locale === 'zh' ? '敬请期待' : 'Coming Soon'}
        </div>
      </div>
    </div>
  );
}

// --- Ashfall Evolution Map Placeholder ---

const SKJH_MAP_STATS = [
  ['4×4km', '荒岛范围', 'Island Size', '島サイズ'],
  ['5', '路线类型', 'Route Types', 'ルート種類'],
  ['安全/危险', '区域风险', 'Zone Risk', '危険度'],
  ['预留', '交互地图', 'Interactive Map', 'インタラクティブ地図'],
] as const;

const SKJH_ROUTE_CARDS = [
  {
    title: '新手安全采集线',
    titleEn: 'Beginner Safe Farming Route',
    titleJa: '初心者安全採集ルート',
    risk: '低',
    riskEn: 'Low',
    focus: '安全区边缘、木石矿、食物水源、短回家路线',
    focusEn: 'Safe-zone edge, wood and stone, food and water, short bank route',
    suitable: '刚登岛、独狼、双人队首日',
    suitableEn: 'First landing, solo, duo day one',
  },
  {
    title: '一级据点路线',
    titleEn: 'Tier-One POI Route',
    titleJa: '低級拠点ルート',
    risk: '中',
    riskEn: 'Medium',
    focus: '一级据点、废弃超市、加油站、基础组件和废料',
    focusEn: 'Tier-one POIs, abandoned supermarket, gas station, basic components and scrap',
    suitable: '完成睡袋、领地柜和石质核心后',
    suitableEn: 'After sleeping bag, territory cabinet, and stone core',
  },
  {
    title: '高风险资源区',
    titleEn: 'High-Risk Resource Zone',
    titleJa: '高リスク資源区',
    risk: '高',
    riskEn: 'High',
    focus: '高价值据点、稀有组件、枪械路线、撤离点观察',
    focusEn: 'High-value POIs, rare components, firearm path, exit scouting',
    suitable: '有护送、可语音报点、能快速回防的小队',
    suitableEn: 'Escorted squads with callouts and fast fallback',
  },
  {
    title: '基地选址推荐区',
    titleEn: 'Base Location Planning',
    titleJa: '基地候補エリア',
    risk: '可控',
    riskEn: 'Managed',
    focus: '靠近资源但不贴据点、双撤离线、低曝光外观、可扩建地形',
    focusEn: 'Near resources but away from POIs, two exits, low profile, expandable terrain',
    suitable: '准备跨赛季复用房型和电力自动化的队伍',
    suitableEn: 'Teams planning reusable layouts and automation',
  },
] as const;

const SKJH_POIS = [
  ['一级据点', 'Tier-One POIs', '低級拠点'],
  ['废弃超市', 'Abandoned Supermarket', '廃スーパー'],
  ['加油站', 'Gas Station', 'ガソリンスタンド'],
  ['高价值据点', 'High-Value POIs', '高価値拠点'],
  ['安全区/危险区', 'Safe / Danger Zones', '安全区/危険区'],
] as const;

function SkjhMapPage({ locale }: { locale: SupportedLocale }) {
  const gameConfig = GAMES.skjh;
  const pick = (zh: string, en: string, ja?: string) => locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {pick('荒岛路线地图预留', 'Island Route Map', '島ルートマップ')}
      </h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {pick(
          '基于 4×4km 荒岛、一级据点、废弃超市、加油站、高价值据点、安全区/危险区做路线规划。当前先提供路线和选址框架，等官方地图素材稳定后再升级为完整交互地图。',
          'Route planning for the 4x4km island, tier-one POIs, abandoned supermarket, gas station, high-value POIs, safe zones, and danger zones. This page starts as a planning hub and can become a full interactive map once reliable map assets are available.',
          '4x4km島、低級拠点、廃スーパー、ガソリンスタンド、高価値拠点、安全区/危険区のルート計画です。地図素材が安定したら完全なインタラクティブ版へ拡張します。'
        )}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SKJH_MAP_STATS.map(([value, zh, en, ja]) => (
          <div key={zh} className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
            <div className="text-lg font-bold text-game-primary">{value}</div>
            <div className="text-xs text-game-text-muted">{pick(zh, en, ja)}</div>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {pick('据点与区域入口', 'POI & Zone Entries', '拠点と区域')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {SKJH_POIS.map(([zh, en, ja]) => (
            <span key={zh} className="rounded bg-game-surface-alt px-3 py-1.5 text-sm text-game-text">
              {pick(zh, en, ja)}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {SKJH_ROUTE_CARDS.map((route) => (
          <article key={route.title} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-game-text">
                {pick(route.title, route.titleEn, route.titleJa)}
              </h2>
              <span className="shrink-0 rounded bg-game-surface-alt px-2 py-1 text-xs font-medium text-game-primary">
                {pick(`风险：${route.risk}`, `Risk: ${route.riskEn}`, `危険度：${route.risk}`)}
              </span>
            </div>
            <div className="mb-3 rounded bg-game-surface-alt p-3">
              <div className="mb-1 text-xs text-game-text-muted">{pick('路线重点', 'Route Focus', 'ルート重点')}</div>
              <p className="text-sm leading-relaxed text-game-text">
                {pick(route.focus, route.focusEn)}
              </p>
            </div>
            <div className="rounded bg-game-surface-alt p-3">
              <div className="mb-1 text-xs text-game-text-muted">{pick('适合人群', 'Best For', 'おすすめ')}</div>
              <p className="text-sm leading-relaxed text-game-text">
                {pick(route.suitable, route.suitableEn)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// --- Genshin Map with Interactive Map ---

function GenshinMapPage({ locale }: { locale: SupportedLocale }) {
  const regionNames: Record<string, Record<string, string>> = {
    mondstadt: { zh: '蒙德', en: 'Mondstadt', ja: 'モンド' },
    liyue: { zh: '璃月', en: 'Liyue', ja: '璃月' },
    inazuma: { zh: '稻妻', en: 'Inazuma', ja: '稲妻' },
    sumeru: { zh: '须弥', en: 'Sumeru', ja: 'スメール' },
    fontaine: { zh: '枫丹', en: 'Fontaine', ja: 'フォンテーヌ' },
    natlan: { zh: '纳塔', en: 'Natlan', ja: 'ナタラン' },
    chasm: { zh: '层岩巨渊', en: 'The Chasm', ja: '層岩巨淵' },
  };

  return (
    <div>
      {/* SEO-visible content for crawlers */}
      <div className="sr-only">
        <h2>{locale === 'zh' ? '原神互动地图包含以下区域' : locale === 'ja' ? '原神マップのエリア一覧' : 'Genshin Impact map covers these regions'}</h2>
        <ul>
          {Object.entries(regionNames).map(([key, names]) => (
            <li key={key}>{names[locale] || names.en}</li>
          ))}
        </ul>
        <p>
          {locale === 'zh'
            ? '使用互动地图查看传送锚点、七天神像、宝箱、神瞳、材料采集点、世界任务位置。支持标记已收集物品和规划采集路线。'
            : locale === 'ja'
              ? 'インタラクティブマップでテレポート、七天神像、宝箱、神瞳、素材採集ポイント、世界任務の位置を確認できます。'
              : 'Use the interactive map to find teleport waypoints, Statues of the Seven, chests, oculi, material farming spots, and world quest locations.'}
        </p>
      </div>
      <MapLoader
        mapData={genshinMapData}
        locale={locale}
      />
    </div>
  );
}

// --- Wuthering Waves Map ---

const WUWA_REGION_ICONS: Record<string, string> = {
  huanglong: '\u{1F432}',
  'black-shores': '\u{1F311}',
  rinascita: '\u{1F3DB}\u{FE0F}',
  'lahae-roi': '\u{1F30A}',
  'new-federation': '\u{1F306}',
};

function WuWaMapPage({ locale }: { locale: SupportedLocale }) {
  const regions = wuwaRegions;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {locale === 'zh' ? '地图攻略' : locale === 'ja' ? 'マップ攻略' : 'Map Guide'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${regions.length} 个区域` : locale === 'ja' ? `${regions.length} エリア` : `${regions.length} regions`}
      </p>

      {/* Region stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.subRegions.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.bosses.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? 'Boss' : 'Bosses'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.specialties.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.domains.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains'}
          </div>
        </div>
      </div>

      {/* Region cards */}
      <div className="space-y-6">
        {regions.map((region) => (
          <div key={region.id} id={region.id} className="scroll-mt-24 rounded-lg border border-game-border bg-game-surface overflow-hidden">
            <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{WUWA_REGION_ICONS[region.id] || '🗺️'}</span>
                <div>
                  <h2 className="text-lg font-bold text-game-text">
                    {getWuWaRegionName(region, locale)}
                  </h2>
                  <p className="text-sm text-game-text-muted">
                    {getWuWaRegionDescription(region, locale)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">
                    {locale === 'zh' ? '探索要点' : locale === 'ja' ? '探索ポイント' : 'Exploration Highlights'}
                  </h3>
                  <div className="space-y-2">
                    {region.highlights.slice(0, 8).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-game-text">
                        <span className="text-game-primary">•</span>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">
                    {locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Local Specialties'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {region.specialties.map((s) => (
                      <span key={s} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                  {region.subRegions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">
                        {locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {region.subRegions.map((sr) => (
                          <span key={sr} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                            {sr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {region.bosses.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">
                        {locale === 'zh' ? 'Boss' : 'Bosses'}
                      </h3>
                      <div className="space-y-1">
                        {region.bosses.map((b, i) => (
                          <div key={i} className="text-sm text-game-text">
                            👹 {b}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {region.domains.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">
                        {locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains'}
                      </h3>
                      <div className="space-y-1">
                        {region.domains.map((d, i) => (
                          <div key={i} className="text-sm text-game-text">
                            🏛️ {d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {region.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
                  <h3 className="mb-2 text-sm font-semibold text-game-primary">
                    💡 {locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips'}
                  </h3>
                  <ul className="space-y-1.5">
                    {region.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-game-text-muted">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Star Rail Map ---

const SR_REGION_ICONS: Record<string, string> = {
  'herta-space-station': '🛰️',
  'jarilo-vi': '❄️',
  'xianzhou-luofu': '⛵',
  'penacony': '🌙',
  'amphoreus': '🏛️',
};

function StarRailMapPage({ locale }: { locale: SupportedLocale }) {
  const regions: StarRailRegion[] = starrailRegions;
  const gameConfig = GAMES.starrail;
  const totalAnchors = regions.reduce((s: number, r) => s + r.spaceAnchors, 0);
  const totalCalyxes = regions.reduce((s: number, r) => s + r.calyxes, 0);
  const totalEchoes = regions.reduce((s: number, r) => s + r.echoesOfWar, 0);
  const totalDomains = regions.reduce((s: number, r) => s + r.domains.length, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '星球攻略' : locale === 'ja' ? '星攻略' : 'World Guide'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${regions.length} 个星球` : locale === 'ja' ? `${regions.length} 惑星` : `${regions.length} worlds`}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalAnchors}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '空间锚点' : locale === 'ja' ? '空間アンカー' : 'Space Anchors'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalCalyxes}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '拟造花萼' : locale === 'ja' ? '花萼' : 'Calyxes'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalEchoes}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '历战余响' : locale === 'ja' ? '歴戦余響' : 'Echoes of War'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalDomains}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '侵蚀隧洞' : locale === 'ja' ? '侵蝕トンネル' : 'Caverns'}</div>
        </div>
      </div>

      <div className="space-y-6">
        {regions.map((region) => (
          <div key={region.id} className="rounded-lg border border-game-border bg-game-surface overflow-hidden">
            <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{SR_REGION_ICONS[region.id] || '🌍'}</span>
                <div>
                  <h2 className="text-lg font-bold text-game-text">{getStarRailRegionName(region, locale)}</h2>
                  <p className="text-sm text-game-text-muted">{getStarRailRegionDescription(region, locale)}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">{locale === 'zh' ? '区域要点' : locale === 'ja' ? 'エリア情報' : 'Highlights'}</h3>
                  <div className="space-y-2">
                    {region.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-game-text">
                        <span className="text-game-primary">•</span>{h}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">{locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Local Specialties'}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {region.specialties.map((s) => (
                      <span key={s} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {region.bosses.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? 'Boss' : 'Bosses'}</h3>
                      <div className="space-y-1">
                        {region.bosses.map((b, i) => (
                          <div key={i} className="text-sm text-game-text">👹 {b}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {region.domains.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? '侵蚀隧洞' : locale === 'ja' ? '侵蝕トンネル' : 'Caverns'}</h3>
                      <div className="space-y-1">
                        {region.domains.map((d, i) => (
                          <div key={i} className="text-sm text-game-text">🏛️ {d}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {region.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
                  <h3 className="mb-2 text-sm font-semibold text-game-primary">💡 {locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips'}</h3>
                  <ul className="space-y-1.5">
                    {region.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-game-text-muted">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- NTE Map ---

const NTE_REGION_ICONS: Record<string, string> = {
  'central-district': '🏙️',
  'industrial-zone': '🏭',
  'research-lab': '🔬',
  'abyss-zone': '🕳️',
};

const NTE_LOCATION_SPOTS = [
  { id: 'hethereau', zh: '海瑟劳', en: 'Hethereau', ja: 'ヘテロー' },
  { id: 'sixth-street', zh: '六街', en: 'Sixth Street', ja: 'シックスストリート' },
  { id: 'hollow-zero', zh: '空洞零号', en: 'Hollow Zero', ja: 'ホロウ・ゼロ' },
  { id: 'lumina-square', zh: '光映广场', en: 'Lumina Square', ja: 'ルミナスクエア' },
] as const;

function NteMapPage({ locale }: { locale: SupportedLocale }) {
  const regions: NteRegion[] = nteRegions;
  const gameConfig = GAMES.nte;
  const totalSubRegions = regions.reduce((s: number, r) => s + r.subRegions.length, 0);
  const totalBosses = regions.reduce((s: number, r) => s + r.bosses.length, 0);
  const totalSpecialties = regions.reduce((s: number, r) => s + r.specialties.length, 0);
  const totalDomains = regions.reduce((s: number, r) => s + r.domains.length, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '区域攻略' : locale === 'ja' ? 'エリア攻略' : 'Region Guide'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${regions.length} 个区域` : locale === 'ja' ? `${regions.length} エリア` : `${regions.length} regions`}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalSubRegions}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalBosses}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? 'Boss' : 'Bosses'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalSpecialties}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalDomains}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '挑战关卡' : locale === 'ja' ? '挑戦ステージ' : 'Domains'}</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '常见地点锚点' : locale === 'ja' ? 'よく見る地点アンカー' : 'Common Location Anchors'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NTE_LOCATION_SPOTS.map((spot) => (
            <article key={spot.id} id={spot.id} className="scroll-mt-24 rounded-lg border border-game-border bg-game-surface p-4">
              <div className="text-sm font-semibold text-game-primary">
                {locale === 'zh' ? spot.zh : locale === 'ja' ? spot.ja : spot.en}
              </div>
              <div className="mt-1 text-xs text-game-text-muted">
                {locale === 'zh' ? '地图锚点 / 路线入口' : locale === 'ja' ? 'マップアンカー / ルート入口' : 'Map anchor / route entry'}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {regions.map((region) => (
          <div key={region.id} className="rounded-lg border border-game-border bg-game-surface overflow-hidden">
            <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{NTE_REGION_ICONS[region.id] || '🗺️'}</span>
                <div>
                  <h2 className="text-lg font-bold text-game-text">{getNteRegionName(region, locale)}</h2>
                  <p className="text-sm text-game-text-muted">{getNteRegionDescription(region, locale)}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">{locale === 'zh' ? '区域要点' : locale === 'ja' ? 'エリア情報' : 'Highlights'}</h3>
                  <div className="space-y-2">
                    {region.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-game-text">
                        <span className="text-game-primary">•</span>{h}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">{locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties'}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {region.specialties.map((s) => (
                      <span key={s} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{s}</span>
                    ))}
                  </div>
                  {region.subRegions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {region.subRegions.map((sr) => (
                          <span key={sr} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{sr}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {region.bosses.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? '异常Boss' : locale === 'ja' ? '異常Boss' : 'Anomaly Bosses'}</h3>
                      <div className="space-y-1">
                        {region.bosses.map((b, i) => (
                          <div key={i} className="text-sm text-game-text">👹 {b}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {region.domains.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? '挑战关卡' : locale === 'ja' ? '挑戦ステージ' : 'Domains'}</h3>
                      <div className="space-y-1">
                        {region.domains.map((d, i) => (
                          <div key={i} className="text-sm text-game-text">🏛️ {d}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {region.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
                  <h3 className="mb-2 text-sm font-semibold text-game-primary">💡 {locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips'}</h3>
                  <ul className="space-y-1.5">
                    {region.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-game-text-muted">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Endfield Map ---

const ENDFIELD_REGION_ICONS: Record<string, string> = {
  'talos-frontier': '\u{1F680}',
  'originium-mines': '\u{26CF}\u{FE0F}',
  'protocol-city': '\u{1F3D9}\u{FE0F}',
  'barren-wastes': '\u{1F3DC}\u{FE0F}',
  'frozen-depths': '\u{2744}\u{FE0F}',
};

function EndfieldMapPage({ locale }: { locale: SupportedLocale }) {
  const regions: EndfieldRegion[] = endfieldRegions;
  const gameConfig = GAMES.endfield;
  const totalSubRegions = regions.reduce((s: number, r) => s + r.subRegions.length, 0);
  const totalBosses = regions.reduce((s: number, r) => s + r.bosses.length, 0);
  const totalSpecialties = regions.reduce((s: number, r) => s + r.specialties.length, 0);
  const totalDomains = regions.reduce((s: number, r) => s + r.domains.length, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '区域攻略' : locale === 'ja' ? 'エリア攻略' : 'Region Guide'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${regions.length} 个区域` : locale === 'ja' ? `${regions.length} エリア` : `${regions.length} regions`}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalSubRegions}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalBosses}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? 'Boss' : 'Bosses'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalSpecialties}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties'}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">{totalDomains}</div>
          <div className="text-xs text-game-text-muted">{locale === 'zh' ? '挑战关卡' : locale === 'ja' ? '挑戦ステージ' : 'Domains'}</div>
        </div>
      </div>

      <div className="space-y-6">
        {regions.map((region) => (
          <div key={region.id} className="rounded-lg border border-game-border bg-game-surface overflow-hidden">
            <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ENDFIELD_REGION_ICONS[region.id] || '🗺️'}</span>
                <div>
                  <h2 className="text-lg font-bold text-game-text">{getEndfieldRegionName(region, locale)}</h2>
                  <p className="text-sm text-game-text-muted">{getEndfieldRegionDescription(region, locale)}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">{locale === 'zh' ? '区域要点' : locale === 'ja' ? 'エリア情報' : 'Highlights'}</h3>
                  <div className="space-y-2">
                    {region.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-game-text">
                        <span className="text-game-primary">•</span>{h}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">{locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties'}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {region.specialties.map((s) => (
                      <span key={s} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{s}</span>
                    ))}
                  </div>
                  {region.subRegions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {region.subRegions.map((sr) => (
                          <span key={sr} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{sr}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {region.bosses.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? 'Boss' : 'Bosses'}</h3>
                      <div className="space-y-1">
                        {region.bosses.map((b, i) => (
                          <div key={i} className="text-sm text-game-text">👹 {b}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {region.domains.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">{locale === 'zh' ? '挑战关卡' : locale === 'ja' ? '挑戦ステージ' : 'Domains'}</h3>
                      <div className="space-y-1">
                        {region.domains.map((d, i) => (
                          <div key={i} className="text-sm text-game-text">🏛️ {d}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {region.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
                  <h3 className="mb-2 text-sm font-semibold text-game-primary">💡 {locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips'}</h3>
                  <ul className="space-y-1.5">
                    {region.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-game-text-muted">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import type { Metadata } from 'next';
import {
  genshinRegions,
  getGenshinRegionName,
  getGenshinRegionDescription,
  wuwaRegions,
  getWuWaRegionName,
  getWuWaRegionDescription,
  starrailRegions,
  getStarRailRegionName,
  getStarRailRegionDescription,
  nteRegions,
  getNteRegionName,
  getNteRegionDescription,
  genshinMapData,
} from '@gachia/data';
import type { StarRailRegion } from '@gachia/data/games/starrail/types';
import type { NteRegion } from '@gachia/data/games/nte/types';
import { MapLoader } from './_components/MapLoader';

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
  if (!gameConfig || (gameId !== 'genshin' && gameId !== 'starrail' && gameId !== 'wuwa' && gameId !== 'nte')) {
    return { title: 'Map', robots: { index: false, follow: false } };
  }
  const gameName = gameConfig.name[locale];
  const title = locale === 'zh'
    ? `${gameName}互动地图 — 传送锚点、宝箱、收集品`
    : locale === 'ja'
      ? `${gameName}マップ — テレポート、宝箱、コレクション`
      : `${gameName} Interactive Map — Teleports, Chests & Collectibles`;
  const desc = locale === 'zh'
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
  return {
    title,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/map`, languages },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/${locale}/${gameId}/map`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.jpg`, width: 1200, height: 630 }],
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
          <div key={region.id} className="rounded-lg border border-game-border bg-game-surface overflow-hidden">
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

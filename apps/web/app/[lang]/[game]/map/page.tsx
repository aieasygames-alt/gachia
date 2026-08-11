import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import type { Metadata } from 'next';
import { MapLoader } from './_components/MapLoader';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import { getMapPageData } from '@/lib/game-data/maps';
import type { MapPageData, MapRegionEntry } from '@/lib/game-data/maps';

const REGION_ICONS: Record<string, string> = {
  mondstadt: '🌬️', liyue: '⛰️', inazuma: '⚡', sumeru: '🌿', fontaine: '💧', natlan: '🔥', chasm: '⛏️',
  huanglong: '🐲', 'black-shores': '🌑', rinascita: '🏛️', 'lahae-roi': '🌊', 'new-federation': '🌆',
  'herta-space-station': '🛰️', 'jarilo-vi': '❄️', 'xianzhou-luofu': '⛵', penacony: '🌙', amphoreus: '🏛️',
  'central-district': '🏙️', 'industrial-zone': '🏭', 'research-lab': '🔬', 'abyss-zone': '🕳️',
  'talos-frontier': '🚀', 'originium-mines': '⛏️', 'protocol-city': '🏙️', 'barren-wastes': '🏜️', 'frozen-depths': '❄️',
};

const BASE_URL = 'https://gachia.com';

const MAP_META_TITLES: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  wuwa: {
    zh: '鸣潮地图攻略｜区域路线、材料、Boss 与探索要点',
    en: 'Wuthering Waves Map Guide — Regions, Materials, Bosses & Routes',
    ja: '鳴潮マップ攻略｜エリア、素材、Boss、探索ルート',
  },
  starrail: {
    zh: '崩坏：星穹铁道星球地图｜空间锚点、花萼与侵蚀隧洞',
    en: 'Honkai: Star Rail World Map Guide — Anchors, Calyxes & Caverns',
    ja: 'スターレイル星マップ｜アンカー、花萼、侵蝕トンネル',
  },
};

const MAP_META_DESCRIPTIONS: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  wuwa: {
    zh: '鸣潮地图攻略，整理 Huanglong、Black Shores、Rinascita、Roya Frostlands 等区域路线、材料特产、Boss、探索提示和版本入口，适合查 wuwa map、鸣潮地图和材料路线。',
    en: 'Wuthering Waves map guide for Huanglong, Black Shores, Rinascita, Roya Frostlands, region routes, materials, bosses, exploration tips, and version links. Useful for WuWa map and farming-route searches.',
    ja: '鳴潮マップ攻略。Huanglong、Black Shores、Rinascita、Roya Frostlands、素材、Boss、探索ヒント、版本導線を整理します。',
  },
  starrail: {
    zh: '星穹铁道星球地图攻略，整理空间锚点、拟造花萼、历战余响、侵蚀隧洞、区域要点和材料路线，适合查 Star Rail map 与星球探索。',
    en: 'Honkai: Star Rail world map guide for space anchors, calyxes, Echoes of War, caverns, region highlights, and farming routes.',
    ja: 'スターレイル星マップ攻略。空間アンカー、花萼、歴戦余響、侵蝕トンネル、探索要点を整理します。',
  },
};

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
  const title = MAP_META_TITLES[gameId]?.[locale] ?? (gameId === 'skjh'
    ? locale === 'zh'
      ? `${gameName}荒岛路线地图 — 据点、采集线、基地选址`
      : locale === 'ja'
        ? `${gameName}島ルートマップ — 拠点、採集、基地候補`
        : `${gameName} Island Route Map — POIs, Farming Routes & Base Spots`
    : locale === 'zh'
      ? `${gameName}互动地图 — 传送锚点、宝箱、收集品`
      : locale === 'ja'
        ? `${gameName}マップ — テレポート、宝箱、コレクション`
        : `${gameName} Interactive Map — Teleports, Chests & Collectibles`);
  const desc = MAP_META_DESCRIPTIONS[gameId]?.[locale] ?? (gameId === 'skjh'
    ? locale === 'zh'
      ? `${gameName}荒岛路线地图预留：4×4km荒岛、一级据点、废弃超市、加油站、高价值据点、安全区/危险区、新手采集线和基地选址建议。`
      : locale === 'ja'
        ? `${gameName}島ルートマップ：4x4km島、低級拠点、廃スーパー、ガソリンスタンド、高価値拠点、安全区/危険区、採集ルート。`
        : `${gameName} island route map placeholder: 4x4km island, tier-one POIs, abandoned supermarket, gas station, high-value zones, safe and danger routes, and base-spot planning.`
    : locale === 'zh'
      ? `${gameName}互动地图攻略：传送锚点位置、宝箱分布、材料采集点、世界任务标记。`
      : locale === 'ja'
        ? `${gameName}マップ攻略：テレポート位置、宝箱分布、素材採集ポイント。`
        : `${gameName} interactive map guide: teleport waypoints, chest locations, material farming spots, and world quest markers.`);
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/map`, LOCALES);
  const description = ensureMetaLength(desc, locale);

  return {
    title,
    description,
    alternates,
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

  if (gameId === 'skjh') {
    return <SkjhMapPage locale={locale} />;
  }

  const data = await getMapPageData(gameId, locale);
  if (data) {
    return <RegionMapPage data={data} locale={locale} />;
  }

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

function RegionMapPage({ data, locale }: { data: MapPageData; locale: SupportedLocale }) {
  if (data.gameId === 'genshin' && data.mapData) {
    const regionNames = Object.fromEntries(data.regions.map((region) => [region.id, { zh: region.name, en: region.name, ja: region.name }]));
    return (
      <div>
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
        <MapLoader mapData={data.mapData} locale={locale} />
      </div>
    );
  }

  const gameConfig = GAMES[data.gameId];
  const stats = getRegionStats(data.gameId, data.regions, locale);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getMapHeading(data.gameId, locale)}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {getRegionCountLabel(data.gameId, data.regions.length, locale)}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
            <div className="text-lg font-bold text-game-primary">{stat.value}</div>
            <div className="text-xs text-game-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {data.gameId === 'nte' && <NteLocationAnchors locale={locale} />}
      {(data.gameId === 'wuwa' || data.gameId === 'starrail') && <MapIntentPanel gameId={data.gameId} locale={locale} />}
      <div className="space-y-6">
        {data.regions.map((region) => (
          <RegionCard key={region.id} region={region} gameId={data.gameId} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function MapIntentPanel({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  const links = gameId === 'wuwa'
    ? [
        {
          href: '/wuwa/guides/roya-frostlands-guide',
          label: { zh: 'Roya Frostlands 路线', en: 'Roya Frostlands route', ja: 'Roya Frostlands ルート' },
          desc: { zh: '继续看当前区域探索与版本重点。', en: 'Continue into current-region exploration and version notes.', ja: '現在エリア探索と版本要点へ。' },
        },
        {
          href: '/wuwa/items',
          label: { zh: '材料图鉴', en: 'Material database', ja: '素材図鑑' },
          desc: { zh: '按材料继续查养成与采集来源。', en: 'Open materials for farming and upgrade sources.', ja: '素材と育成来源を確認。' },
        },
        {
          href: '/wuwa/build',
          label: { zh: '角色养成路线', en: 'Build routes', ja: '育成ルート' },
          desc: { zh: '把地图材料和角色培养接起来。', en: 'Connect map farming with character builds.', ja: 'マップ素材とキャラ育成を接続。' },
        },
      ]
    : [
        {
          href: '/starrail/guides/farming-route-guide',
          label: { zh: '体力与材料路线', en: 'Trailblaze Power route', ja: '開拓力ルート' },
          desc: { zh: '按花萼、侵蚀隧洞和周本规划。', en: 'Plan around calyxes, caverns, and weeklies.', ja: '花萼、トンネル、週課で計画。' },
        },
        {
          href: '/starrail/items',
          label: { zh: '材料图鉴', en: 'Material database', ja: '素材図鑑' },
          desc: { zh: '继续查角色突破与行迹材料。', en: 'Open ascension and trace material sources.', ja: '昇格と軌跡素材へ。' },
        },
        {
          href: '/starrail/build',
          label: { zh: '角色养成路线', en: 'Build routes', ja: '育成ルート' },
          desc: { zh: '把星球探索和角色培养接起来。', en: 'Connect world routes with character builds.', ja: '星探索とキャラ育成を接続。' },
        },
      ];

  return (
    <section className="mb-8 rounded-lg border border-game-border bg-game-surface p-4">
      <h2 className="mb-2 text-lg font-semibold text-game-text">
        {gameId === 'wuwa'
          ? locale === 'zh' ? '鸣潮地图怎么用' : locale === 'ja' ? '鳴潮マップの使い方' : 'How to use this WuWa map guide'
          : locale === 'zh' ? '星球地图怎么用' : locale === 'ja' ? '星マップの使い方' : 'How to use this world map guide'}
      </h2>
      <p className="mb-4 text-sm leading-6 text-game-text-muted">
        {gameId === 'wuwa'
          ? locale === 'zh'
            ? '这里是区域路线与材料攻略页，不是完整点位交互地图。先确认区域、Boss、特产和探索提示，再进入材料图鉴或当前版本路线。'
            : locale === 'ja'
              ? 'ここは完全なピン付きインタラクティブマップではなく、エリア、Boss、素材、探索ヒントを整理する攻略ページです。'
              : 'This is a region and farming-route guide, not a full marker-by-marker interactive map. Use it to check regions, bosses, specialties, and exploration notes before opening material or build pages.'
          : locale === 'zh'
            ? '这里按星球整理空间锚点、花萼、周本和侵蚀隧洞，适合先判断去哪刷，再进入材料或养成页面。'
            : locale === 'ja'
              ? '星ごとにアンカー、花萼、週ボス、侵蝕トンネルを整理し、素材や育成ページへつなげます。'
              : 'This page groups anchors, calyxes, weekly bosses, and caverns by world so you can decide where to farm before opening material or build pages.'}
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <a key={link.href} href={`/${locale}${link.href}`} className="rounded-lg border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{link.label[locale]}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{link.desc[locale]}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function RegionCard({ region, gameId, locale }: { region: MapRegionEntry; gameId: GameId; locale: SupportedLocale }) {
  return (
    <div id={gameId === 'wuwa' ? region.id : undefined} className="scroll-mt-24 overflow-hidden rounded-lg border border-game-border bg-game-surface">
      <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{REGION_ICONS[region.id] || '🗺️'}</span>
          <div>
            <h2 className="text-lg font-bold text-game-text">{region.name}</h2>
            <p className="text-sm text-game-text-muted">{region.description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{highlightLabel(gameId, locale)}</h3>
            <div className="space-y-2">
              {region.highlights.slice(0, 8).map((highlight) => (
                <div key={highlight} className="flex items-center gap-2 text-sm text-game-text">
                  <span className="text-game-primary">•</span>{highlight}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{specialtyLabel(locale)}</h3>
            <TagList values={region.specialties} />
            {region.subRegions.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-game-primary">{subRegionLabel(locale)}</h3>
                <TagList values={region.subRegions} />
              </div>
            )}
          </div>
          <div className="space-y-4">
            {region.bosses.length > 0 && <InlineList title={bossLabel(gameId, locale)} icon="👹" values={region.bosses} />}
            {region.domains.length > 0 && <InlineList title={domainLabel(gameId, locale)} icon="🏛️" values={region.domains} />}
          </div>
        </div>
        {region.tips.length > 0 && (
          <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
            <h3 className="mb-2 text-sm font-semibold text-game-primary">💡 {tipLabel(locale)}</h3>
            <ul className="space-y-1.5">
              {region.tips.map((tip) => (
                <li key={tip} className="text-sm text-game-text-muted">• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function TagList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span key={value} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{value}</span>
      ))}
    </div>
  );
}

function InlineList({ title, icon, values }: { title: string; icon: string; values: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-game-primary">{title}</h3>
      <div className="space-y-1">
        {values.map((value) => (
          <div key={value} className="text-sm text-game-text">{icon} {value}</div>
        ))}
      </div>
    </div>
  );
}

const NTE_LOCATION_SPOTS = [
  { id: 'hethereau', zh: '海瑟劳', en: 'Hethereau', ja: 'ヘテロー' },
  { id: 'sixth-street', zh: '六街', en: 'Sixth Street', ja: 'シックスストリート' },
  { id: 'hollow-zero', zh: '空洞零号', en: 'Hollow Zero', ja: 'ホロウ・ゼロ' },
  { id: 'lumina-square', zh: '光映广场', en: 'Lumina Square', ja: 'ルミナスクエア' },
] as const;

function NteLocationAnchors({ locale }: { locale: SupportedLocale }) {
  return (
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
  );
}

function getRegionStats(gameId: GameId, regions: MapRegionEntry[], locale: SupportedLocale) {
  if (gameId === 'starrail') {
    return [
      { value: regions.reduce((sum, region) => sum + (region.spaceAnchors ?? 0), 0), label: locale === 'zh' ? '空间锚点' : locale === 'ja' ? '空間アンカー' : 'Space Anchors' },
      { value: regions.reduce((sum, region) => sum + (region.calyxes ?? 0), 0), label: locale === 'zh' ? '拟造花萼' : locale === 'ja' ? '花萼' : 'Calyxes' },
      { value: regions.reduce((sum, region) => sum + (region.echoesOfWar ?? 0), 0), label: locale === 'zh' ? '历战余响' : locale === 'ja' ? '歴戦余響' : 'Echoes of War' },
      { value: regions.reduce((sum, region) => sum + region.domains.length, 0), label: locale === 'zh' ? '侵蚀隧洞' : locale === 'ja' ? '侵蝕トンネル' : 'Caverns' },
    ];
  }

  return [
    { value: regions.reduce((sum, region) => sum + region.subRegions.length, 0), label: subRegionLabel(locale) },
    { value: regions.reduce((sum, region) => sum + region.bosses.length, 0), label: locale === 'zh' ? 'Boss' : 'Bosses' },
    { value: regions.reduce((sum, region) => sum + region.specialties.length, 0), label: specialtyLabel(locale) },
    { value: regions.reduce((sum, region) => sum + region.domains.length, 0), label: domainLabel(gameId, locale) },
  ];
}

function getMapHeading(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? '星球攻略' : locale === 'ja' ? '星攻略' : 'World Guide';
  if (gameId === 'wuwa') return locale === 'zh' ? '地图攻略' : locale === 'ja' ? 'マップ攻略' : 'Map Guide';
  return locale === 'zh' ? '区域攻略' : locale === 'ja' ? 'エリア攻略' : 'Region Guide';
}

function getRegionCountLabel(gameId: GameId, count: number, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? `共 ${count} 个星球` : locale === 'ja' ? `${count} 惑星` : `${count} worlds`;
  return locale === 'zh' ? `共 ${count} 个区域` : locale === 'ja' ? `${count} エリア` : `${count} regions`;
}

function highlightLabel(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'wuwa') return locale === 'zh' ? '探索要点' : locale === 'ja' ? '探索ポイント' : 'Exploration Highlights';
  return locale === 'zh' ? '区域要点' : locale === 'ja' ? 'エリア情報' : 'Highlights';
}

function specialtyLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties';
}

function subRegionLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions';
}

function bossLabel(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'nte') return locale === 'zh' ? '异常Boss' : locale === 'ja' ? '異常Boss' : 'Anomaly Bosses';
  return locale === 'zh' ? 'Boss' : 'Bosses';
}

function domainLabel(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? '侵蚀隧洞' : locale === 'ja' ? '侵蝕トンネル' : 'Caverns';
  if (gameId === 'nte' || gameId === 'endfield') return locale === 'zh' ? '挑战关卡' : locale === 'ja' ? '挑戦ステージ' : 'Domains';
  return locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains';
}

function tipLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips';
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

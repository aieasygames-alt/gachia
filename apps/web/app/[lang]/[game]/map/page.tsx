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
  mistwoods: '🌫️', 'echoback-landing': '🎵', 'sea-of-flowers': '🌸', blitzwood: '⚡', 'nimbus-fields': '☁️', 'forest-of-falling-stars': '✨',
};

const BASE_URL = 'https://gachia.com';

const MAP_META_TITLES: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  aniimo: {
    zh: '伊莫地图指南｜已公开区域、精灵线索与上线后核验',
    en: 'Aniimo Map Guide — Public Regions, Creature Leads & Launch Checks',
    ja: 'アニモマップガイド｜公開地域・生物の手掛かり・リリース後確認',
  },
  roco: {
    zh: '洛克王国：世界国际服地图｜CBT 区域、捕捉点与探索路线',
    en: 'Roco Kingdom Global Map — CBT Regions, Capture Spots & Routes',
    ja: 'ロコキングダム国際版マップ｜CBT地域・捕獲地点・探索ルート',
  },
  'roco-cn': {
    zh: '洛克王国：世界地图｜区域、精灵捕捉点与资源路线',
    en: 'Roco Kingdom CN Map — Regions, Jinie Spots & Resource Routes',
    ja: 'ロコキングダム中国版マップ｜地域・ジニー捕獲地点・資源ルート',
  },
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
  aniimo: {
    zh: '伊莫地图指南，整理已公开区域、代表精灵、探索线索与上线后需要核验的出没条件。本页不是逐点位互动地图；查精灵、奖励和新手路线请继续进入相关页面。',
    en: 'Aniimo region map guide for public regions, representative creatures, exploration leads, and launch-day spawn checks. This is not a marker-by-marker interactive map; continue to creature, reward, and beginner routes.',
    ja: 'アニモの地域マップガイド。公開地域、代表生物、探索の手掛かり、リリース後に確認する出現条件を整理します。ピン単位のインタラクティブマップではありません。',
  },
  roco: {
    zh: '洛克王国：世界国际服地图入口，当前用于追踪 CBT 区域、已曝光精灵、捕捉点、地图路线和上线后点位核验。继续查看精灵图鉴、CBT 专题、法杖与攻略。',
    en: 'Roco Kingdom global map hub for CBT regions, revealed Jinies, capture spots, exploration routes, and launch verification. Continue into Jinies, CBT hub, staves, and guides.',
    ja: 'ロコキングダム国際版マップ入口。CBT地域、公開ジニー、捕獲地点、探索ルート、リリース後確認を追跡します。',
  },
  'roco-cn': {
    zh: '洛克王国：世界国服地图入口，整理区域、精灵捕捉点、资源路线、活动与商人刷新待核验清单，并连接精灵图鉴、兑换码、法杖和节奏榜。',
    en: 'Roco Kingdom CN map hub for regions, Jinie capture spots, resource routes, events, merchant refresh checks, and links to Jinies, codes, staves, and tier list.',
    ja: 'ロコキングダム中国版マップ入口。地域、ジニー捕獲地点、資源ルート、イベント、商人更新確認を整理します。',
  },
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
  if (!gameConfig || (gameId !== 'genshin' && gameId !== 'starrail' && gameId !== 'wuwa' && gameId !== 'nte' && gameId !== 'endfield' && gameId !== 'skjh' && gameId !== 'aniimo' && gameId !== 'roco' && gameId !== 'roco-cn')) {
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

  if (gameId === 'roco' || gameId === 'roco-cn') {
    return <RocoMapHub gameId={gameId} locale={locale} />;
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
      {(data.gameId === 'wuwa' || data.gameId === 'starrail' || data.gameId === 'aniimo') && <MapIntentPanel gameId={data.gameId} locale={locale} />}
      <div className="space-y-6">
        {data.regions.map((region) => (
          <RegionCard key={region.id} region={region} gameId={data.gameId} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function MapIntentPanel({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  const links = gameId === 'aniimo'
    ? [
        {
          href: '/aniimo/characters',
          label: { zh: '伊莫图鉴', en: 'Aniimo index', ja: 'アニモ図鑑' },
          desc: { zh: '按已公开信息继续查精灵条目与待核验字段。', en: 'Check creature entries and fields still awaiting verification.', ja: '生物一覧と確認待ちの情報を確認。' },
        },
        {
          href: '/aniimo/redeem-codes',
          label: { zh: '奖励与兑换码', en: 'Rewards and codes', ja: '報酬とコード' },
          desc: { zh: '区分预注册奖励与尚未确认的兑换码。', en: 'Separate pre-registration rewards from unconfirmed codes.', ja: '事前登録報酬と未確認コードを分けて確認。' },
        },
        {
          href: '/aniimo/guides/beginner-guide',
          label: { zh: '新手路线', en: 'Beginner route', ja: '初心者ルート' },
          desc: { zh: '把区域信息接到上线后的开荒顺序。', en: 'Connect region information to a launch-day progression route.', ja: '地域情報をリリース後の進行順へつなげます。' },
        },
      ]
    : gameId === 'wuwa'
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
        {gameId === 'aniimo'
          ? locale === 'zh' ? '伊莫地图怎么用' : locale === 'ja' ? 'アニモマップの使い方' : 'How to use this Aniimo map guide'
          : gameId === 'wuwa'
          ? locale === 'zh' ? '鸣潮地图怎么用' : locale === 'ja' ? '鳴潮マップの使い方' : 'How to use this WuWa map guide'
          : locale === 'zh' ? '星球地图怎么用' : locale === 'ja' ? '星マップの使い方' : 'How to use this world map guide'}
      </h2>
      <p className="mb-4 text-sm leading-6 text-game-text-muted">
        {gameId === 'aniimo'
          ? locale === 'zh'
            ? '这里按已公开信息整理区域与代表精灵，不是逐点位、可筛选的互动地图。精确坐标、天气、时间和最终出没条件需要在上线后通过游戏内与官方来源核验。'
            : locale === 'ja'
              ? 'ここは公開情報に基づく地域と代表生物のガイドであり、ピン単位で絞り込めるインタラクティブマップではありません。正確な座標、天候、時間、最終出現条件はリリース後にゲーム内と公式情報で確認します。'
              : 'This page organizes public regions and representative creatures. It is not a filterable, marker-by-marker interactive map; exact coordinates, weather, time, and final spawn rules need live-game and official verification after launch.'
          : gameId === 'wuwa'
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

const ROCO_MAP_STATS = {
  roco: [
    ['CBT', '测试阶段', 'Test Phase', 'テスト段階'],
    ['Watch', '点位状态', 'Marker Status', '地点状態'],
    ['6', '资源入口', 'Resource Links', '導線'],
    ['Launch', '上线后核验', 'Launch Checks', 'リリース後確認'],
  ],
  'roco-cn': [
    ['S1', '当前赛季', 'Current Season', '現在シーズン'],
    ['Watch', '商人与活动', 'Merchant & Events', '商人とイベント'],
    ['6', '资源入口', 'Resource Links', '導線'],
    ['Live', '国服状态', 'CN Status', '中国版状態'],
  ],
} as const;

const ROCO_MAP_LINKS = {
  roco: [
    ['/roco/characters', '精灵图鉴', 'Jinie wiki', 'ジニー図鑑', '按属性、稀有度和进化链继续查已曝光精灵。', 'Browse revealed Jinies by type, rarity, and evolution line.', '公開ジニーを属性、レア度、進化で確認。'],
    ['/roco/version', 'CBT 专题', 'CBT hub', 'CBT特集', '确认测试时间、平台、报名和下载状态。', 'Check test timing, platforms, signup, and download status.', 'テスト日程、平台、応募、DL状況を確認。'],
    ['/roco/tier-list', '早测节奏榜', 'Provisional tier', '暫定Tier', '先用 CBT 分级判断捕捉与培养优先级。', 'Use CBT ratings to plan capture and training priorities.', 'CBT評価で捕獲・育成優先度を判断。'],
    ['/roco/weapons', '法杖图鉴', 'Staff catalog', '杖図鑑', '法杖为外观特效武器，不提供攻击力。', 'Staves are cosmetic effects, not attack-stat gear.', '杖は攻撃値なしの外観武器。'],
    ['/roco/guides/cbt-registration-guide', 'CBT 报名', 'CBT signup', 'CBT応募', '报名、问卷、资格邮件和测试平台集中查看。', 'Registration, questionnaire, eligibility mail, and platforms.', '応募、アンケート、資格メール、平台を確認。'],
    ['/roco/download', '下载入口', 'Download hub', 'DL入口', '按官网和平台商店确认安全下载边界。', 'Verify safe download entry through official and store pages.', '公式とストアで安全なDL入口を確認。'],
  ],
  'roco-cn': [
    ['/roco-cn/characters', '精灵图鉴', 'Jinie wiki', 'ジニー図鑑', '筛选国服精灵、属性、技能和进化链。', 'Filter CN Jinies by type, skills, and evolution line.', '中国版ジニーを属性、スキル、進化で確認。'],
    ['/roco-cn/redeem-codes', '兑换码', 'Redeem codes', '交換コード', '核验礼包码、奖励和过期状态。', 'Check gift codes, rewards, and expiration status.', 'コード、報酬、期限を確認。'],
    ['/roco-cn/tier-list', '节奏榜', 'Tier list', 'Tier', '按当前环境查看捕捉和培养优先级。', 'Find capture and training priorities for the current meta.', '現環境の捕獲・育成優先度を確認。'],
    ['/roco-cn/weapons', '法杖图鉴', 'Staff catalog', '杖図鑑', '按活动、战令和商城来源查看特效。', 'Browse staff effects by event, pass, and shop source.', 'イベント、パス、ショップ別に杖を確認。'],
    ['/roco-cn/version', 'S1 赛季', 'S1 season', 'S1シーズン', '查看暗夜拾光、活动和版本节点。', 'Review Shadowlight, events, and version milestones.', '暗夜拾光、イベント、版本を確認。'],
    ['/roco-cn/guides', '攻略百科', 'Guides', 'ガイド', '继续看新手、活动、养成和版本攻略。', 'Continue into starter, event, progression, and patch guides.', '初心者、イベント、育成、版本ガイドへ。'],
  ],
} as const;

function RocoMapHub({ gameId, locale }: { gameId: 'roco' | 'roco-cn'; locale: SupportedLocale }) {
  const gameConfig = GAMES[gameId];
  const pick = (zh: string, en: string, ja?: string) => locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {gameId === 'roco'
          ? pick('国际服 CBT 地图核验入口', 'Global CBT Map Watch', '国際版CBTマップ確認')
          : pick('国服地图与资源路线入口', 'CN Map and Resource Route Hub', '中国版マップ・資源ルート')}
      </h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {gameId === 'roco'
          ? pick(
              '国际服地图点位仍等待 CBT 与正式上线后核验。这里先把精灵图鉴、CBT 专题、法杖、下载和待补地图路线集中起来，避免把未确认点位当成实时地图。',
              'Global map markers still need CBT and launch verification. This hub groups Jinies, CBT timing, staves, downloads, and map-route watch items without presenting unverified markers as live data.',
              '国際版の地点はCBTとリリース後の確認待ちです。未確認地点をリアルタイム地図として扱わず、図鑑、CBT、杖、DL、確認項目をまとめます。'
            )
          : pick(
              '国服地图内容先作为资源路线入口维护，重点串联精灵图鉴、兑换码、赛季、法杖和后续商人/活动刷新核验。',
              'CN map content starts as a resource-route hub that connects Jinies, codes, season pages, staves, and future merchant/event refresh checks.',
              '中国版マップは資源ルート入口として、ジニー、コード、シーズン、杖、商人/イベント確認へつなげます。'
            )}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROCO_MAP_STATS[gameId].map(([value, zh, en, ja]) => (
          <div key={zh} className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
            <div className="text-lg font-bold text-game-primary">{value}</div>
            <div className="text-xs text-game-text-muted">{pick(zh, en, ja)}</div>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
        <h2 className="mb-2 text-lg font-semibold text-game-text">
          {pick('地图相关资源', 'Related Map Resources', 'マップ関連リソース')}
        </h2>
        <p className="mb-4 text-sm leading-6 text-game-text-muted">
          {pick(
            '完整交互点位上线前，先用这些入口完成捕捉、培养、活动和版本判断。',
            'Before full interactive markers are available, use these entries for capture, progression, event, and version decisions.',
            '完全なインタラクティブ地点公開前に、捕獲、育成、イベント、版本判断へ進めます。'
          )}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {ROCO_MAP_LINKS[gameId].map(([href, zh, en, ja, descZh, descEn, descJa]) => (
            <a key={href} href={`/${locale}${href}`} className="rounded-lg border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
              <span className="block text-sm font-semibold text-game-text">{pick(zh, en, ja)}</span>
              <span className="mt-1 block text-xs leading-5 text-game-text-muted">{pick(descZh, descEn, descJa)}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-game-border bg-game-surface-alt p-5">
        <h2 className="mb-2 text-lg font-semibold text-game-text">
          {pick('点位核验状态', 'Marker Verification Status', '地点確認状況')}
        </h2>
        <p className="text-sm leading-relaxed text-game-text-muted">
          {gameId === 'roco'
            ? pick(
                '当前不展示未确认坐标。CBT 开启后优先补区域名称、御三家捕捉相关路线、材料来源和地图截图来源。',
                'Unverified coordinates are not shown. After CBT opens, priority checks are region names, starter-related routes, material sources, and map screenshot sources.',
                '未確認座標は表示しません。CBT開始後、地域名、御三家関連ルート、素材来源、地図画像来源を優先確認します。'
              )
            : pick(
                '当前先维护资源入口与站内导流；后续补商人刷新、活动点位、稀有精灵捕捉点和材料路线时，需要标注来源与更新时间。',
                'This page currently maintains resource routing and internal links. Future merchant refreshes, event spots, rare Jinie captures, and material routes should include source and update time.',
                '現在は導線を先に維持します。今後の商人更新、イベント地点、希少ジニー捕獲、素材ルートには来源と更新日を付けます。'
              )}
        </p>
      </section>
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

import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { genshinMaterials, getGenshinMaterialName } from '@gachia/data/games/genshin/items';
import { starrailMaterials, getStarRailMaterialName } from '@gachia/data/games/starrail/items';
import { wuwaMaterials, getWuWaMaterialName } from '@gachia/data/games/wuwa/items';
import { nteMaterials, getNteMaterialName } from '@gachia/data/games/nte/items';
import { zzzMaterials, getZzzMaterialName } from '@gachia/data/games/zzz/items';
import { anantaMaterials, getAnantaMaterialName } from '@gachia/data/games/ananta/items';
import { guihuanMaterials, getGuihuanMaterialName } from '@gachia/data/games/guihuan/items';
import { endfieldMaterials, getEndfieldMaterialName } from '@gachia/data/games/endfield/items';
import { seaMaterials, getSeaMaterialName } from '@gachia/data/games/sea/items';
import { skjhMaterials, getSkjhMaterialName } from '@gachia/data/games/skjh/items';
import { gearSets, getGearSetName, getGearSetEffect } from '@gachia/data/games/endfield/gear-sets';
import { Link } from '@/lib/i18n/navigation';
import { ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

const ITEM_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全材料图鉴，覆盖角色突破材料、天赋书、Boss掉落、区域特产和日常刷取路线，帮助你快速定位每个角色的培养来源。', en: 'Complete Genshin Impact material list with ascension materials, talent books, boss drops, local specialties, and farming sources to help you plan character upgrades.', ja: '原神全素材図鑑。キャラ突破素材、天賦本、ボスドロップ、地域特産品、周回場所をまとめて確認できます。' },
  starrail: { zh: '崩坏：星穹铁道全材料图鉴，覆盖角色突破材料、行迹材料、Boss掉落和刷取来源，方便你按角色或用途快速查找所需素材。', en: 'Complete Honkai: Star Rail material list with ascension materials, trace materials, boss drops, and farming sources organized for quick character planning.', ja: 'スターレイル全素材図鑑。キャラ突破素材、軌跡素材、ボスドロップ、周回先を整理して確認できます。' },
  wuwa: { zh: '鸣潮全材料图鉴，整理技能材料、Boss材料、区域特产和养成来源，适合在培养角色前先看清每种素材该去哪里刷。', en: 'Complete Wuthering Waves material list with skill materials, boss materials, local specialties, and farming routes so you can prep upgrades efficiently.', ja: '鳴潮全素材図鑑。スキル素材、ボス素材、地域特産品、周回ルートを整理して案内します。' },
  nte: { zh: '异环全材料图鉴，覆盖突破材料、Boss掉落、技能手册和养成来源，方便你按角色、阶段或用途快速整理资源。', en: 'Complete Neverness to Everness material list with ascension materials, boss drops, skill manuals, and farming sources for efficient progression planning.', ja: '異環全素材図鑑。昇格素材、ボスドロップ、スキルマニュアル、周回先を整理しています。' },
  zzz: { zh: '绝区零全材料图鉴，覆盖突破材料、技能材料、特殊材料和周回来源，方便按代理人培养阶段快速找到需要的资源。', en: 'Complete Zenless Zone Zero material list with ascension, skill, and special materials plus farming sources for faster agent upgrade planning.', ja: 'ゼンレスゾーンゼロ全素材図鑑。突破素材、スキル素材、特殊素材、周回先をまとめています。' },
  guihuan: { zh: '归环全材料图鉴，覆盖使灵突破、元素突破、Boss材料和对应来源，便于你在培养前快速确认每类素材的获取方式。', en: 'Complete Guihuan material list with spirit ascension, element ascension, boss materials, and acquisition sources for easy build planning.', ja: '帰環全素材図鑑。スピリット昇格、元素昇格、ボス素材、入手先をまとめています。' },
  ananta: { zh: '无限大全材料图鉴，覆盖突破材料、Boss材料、区域特产和刷取来源，帮助你在培养角色时快速整理所有所需资源。', en: 'Complete Ananta material list with ascension, boss materials, local specialties, and farming sources to keep your upgrade path organized.', ja: 'アナンタ全素材図鑑。昇格素材、ボス素材、地域特産品、周回先を整理して確認できます。' },
  endfield: { zh: '明日方舟：终末地全材料图鉴，覆盖突破材料、技能材料、货币材料和来源，方便你从培养计划一路查到具体掉落。', en: 'Complete Arknights: Endfield material list with ascension materials, skill materials, currency materials, and farming sources for full upgrade planning.', ja: 'アークナイツ：エンドフィールド全素材図鑑。昇格素材、スキル素材、通貨素材、入手先を確認できます。' },
  skjh: { zh: '失控进化资源道具图鉴，覆盖废料、布料、木石金属、领地柜、睡袋和公测奖励，方便你规划开荒阶段的资源收集路线。', en: 'Ashfall Evolution resource and item list with scrap, cloth, wood, stone, metal, territory cabinet, sleeping bag, and launch rewards for early-game planning.', ja: '失控進化の資源・アイテム一覧。スクラップ、布、木石金属、領地キャビネット、寝袋、報酬を整理しています。' },
};

const NTE_TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '猎手指南', en: 'Hunter Guide', ja: 'ハンターガイド' },
  'arc-exp': { zh: '弧盘经验', en: 'Arc EXP', ja: 'アルクEXP' },
  'module-exp': { zh: '模块经验', en: 'Module EXP', ja: 'モジュールEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  boss: { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  manual: { zh: '技能手册', en: 'Skill Manual', ja: 'スキルマニュアル' },
};

const GENSHIN_TYPE_LABELS: Record<string, Record<string, string>> = {
  'character-ascension': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  'talent-book': { zh: '天赋书', en: 'Talent Book', ja: '天賦本' },
  'boss-drop': { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  'weekly-boss': { zh: '周本材料', en: 'Weekly Boss', ja: '週ボス素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  'common-drop': { zh: '普通怪物掉落', en: 'Common Drop', ja: '一般ドロップ' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  'exp-material': { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
};

const RARITY_COLORS = ['', '#9ca3af', '#4ade80', '#60a5fa', '#a855f7', '#eab308'];
type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const ENDFIELD_ITEM_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/endfield/version',
    label: { zh: '先看测试专题', en: 'Start with test hub', ja: 'まずテスト特集へ' },
    description: { zh: '先看测试进度、入口和最新节点', en: 'Review the test progress, entry, and current status', ja: 'テスト進行、入口、最新状況を確認', },
  },
  {
    href: '/endfield/characters',
    label: { zh: '继续看干员图鉴', en: 'Browse characters', ja: '干員図鑑へ' },
    description: { zh: '按干员反查材料需求和养成路线', en: 'Match material needs to each operator', ja: '干員ごとの素材需要を確認', },
  },
  {
    href: '/endfield/guides/crisis-contract-guide',
    label: { zh: '看危机合约攻略', en: 'Read crisis guide', ja: '危機合約攻略へ' },
    description: { zh: '把材料、装备和高难打法串起来', en: 'Connect materials, gear, and high-difficulty prep', ja: '素材、装備、高難度対策を接続', },
  },
];

const ITEM_INTRO: Record<string, Record<SupportedLocale, string>> = {
  genshin: {
    zh: '按突破材料、天赋书、Boss 掉落和区域特产快速浏览原神材料图鉴，适合在养角色前先看来源与刷取路线。',
    en: 'Browse the Genshin Impact material wiki by ascension items, talent books, boss drops, and specialties to review sources and farming routes before upgrading.',
    ja: '突破素材、天賦本、ボスドロップ、地域特産品で原神素材図鑑を確認し、入手先と周回ルートを把握できます。',
  },
  starrail: {
    zh: '按突破材料、行迹材料、Boss 掉落和通用材料快速浏览星穹铁道材料图鉴，适合先看培养需求和刷取来源。',
    en: 'Browse the Honkai: Star Rail material wiki by ascension items, trace materials, boss drops, and common mats to review upgrade needs and farming sources.',
    ja: '突破素材、軌跡素材、ボスドロップ、汎用素材でスターレイル素材図鑑を確認し、育成需要と入手先を把握できます。',
  },
  wuwa: {
    zh: '按技能材料、Boss 材料、周本和区域特产快速浏览鸣潮材料图鉴，适合先看每个素材该去哪里刷。',
    en: 'Browse the Wuthering Waves material wiki by skill items, boss mats, weekly drops, and specialties to review where each resource comes from.',
    ja: 'スキル素材、ボス素材、週ボス、地域特産品で鳴潮素材図鑑を確認し、入手場所を把握できます。',
  },
  nte: {
    zh: '按猎手指南、弧盘经验、模块经验和突破材料快速浏览异环材料图鉴，适合先看阶段需求与来源。',
    en: 'Browse the Neverness to Everness material wiki by guides, Arc EXP, module EXP, and ascension items to review stage needs and sources.',
    ja: 'ガイド、アルクEXP、モジュールEXP、昇格素材で異環素材図鑑を確認し、段階別の需要と入手先を把握できます。',
  },
  zzz: {
    zh: '按突破材料、技能材料、特殊材料和货币快速浏览绝区零材料图鉴，适合先看代理人养成和刷取来源。',
    en: 'Browse the Zenless Zone Zero material wiki by ascension, skill, special, and currency items to review agent upgrades and farming sources.',
    ja: '突破素材、スキル素材、特殊素材、通貨でゼンゼロ素材図鑑を確認し、エージェント育成と入手先を把握できます。',
  },
  ananta: {
    zh: '按触发者指南、突破材料、Boss 材料和技能材料快速浏览无限大材料图鉴，适合先看资源需求和来源。',
    en: 'Browse the Ananta material wiki by trigger guides, ascension, boss, and skill materials to review resource needs and sources.',
    ja: 'トリガーガイド、突破素材、ボス素材、スキル素材でアナンタ素材図鑑を確認し、必要資源と入手先を把握できます。',
  },
  guihuan: {
    zh: '按使灵指南、突破材料、元素突破和 Boss 材料快速浏览归环材料图鉴，适合先看配装与培养路径。',
    en: 'Browse the Guihuan material wiki by spirit guides, ascension, element ascension, and boss materials to review build and progression paths.',
    ja: 'スピリットガイド、突破素材、元素昇格、ボス素材で帰環素材図鑑を確認し、ビルドと育成導線を把握できます。',
  },
  endfield: {
    zh: '按突破材料、技能材料、武器材料和装备套装快速浏览终末地材料图鉴，适合先看升级需求和掉落来源。',
    en: 'Browse the Arknights: Endfield material wiki by ascension, skill, weapon mats, and gear sets to review upgrade needs and drop sources.',
    ja: '突破素材、スキル素材、武器素材、装備セットでエンドフィールド素材図鑑を確認し、強化需要とドロップ元を把握できます。',
  },
  sea: {
    zh: '按货币、船员突破、船只升级和制造材料快速浏览遗忘之海材料图鉴，适合先看开荒消耗和获取路线。',
    en: 'Browse the Sea of Remnants material wiki by currency, crew ascension, ship upgrades, and crafting to review early-game costs and routes.',
    ja: '通貨、クルー突破、船強化、製作素材で遺忘之海素材図鑑を確認し、序盤消費と入手ルートを把握できます。',
  },
  skjh: {
    zh: '按生存资源、组件、弹药、燃料和医疗补给快速浏览失控进化资源图鉴，适合先看开荒消耗和收集路线。',
    en: 'Browse the Ashfall Evolution resource wiki by survival items, components, ammo, fuel, and medical supplies to review early-game costs and collection routes.',
    ja: '生存資源、部品、弾薬、燃料、医療補給で失控進化資源図鑑を確認し、序盤消費と収集ルートを把握できます。',
  },
};

function getItemIntro(gameId: string, locale: SupportedLocale) {
  return ITEM_INTRO[gameId]?.[locale] ?? ITEM_INTRO.genshin?.[locale] ?? '';
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
  const categoryLabel = CATEGORY_LABELS.items?.[locale] ?? 'Items';
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/items`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/items`;

  const desc = ITEM_DESC[gameId]?.[locale] ?? `${gameName} ${categoryLabel} database with farming sources, upgrade materials, and drop locations`;
  const intro = ITEM_INTRO[gameId]?.[locale];

  const title = locale === 'zh'
    ? `${gameName}材料图鉴 — 全材料Wiki、掉落来源与刷取路线`
    : locale === 'ja'
      ? `${gameName}素材図鑑 — Wiki、ドロップ場所、周回ルート`
      : `${gameName} Materials Wiki — Complete Drop Sources & Farming Guide`;

  const description = ensureMetaLength(intro ?? desc, locale);

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/items`, languages },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/items`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS.items?.[locale] ?? 'Items', item: `${BASE_URL}/${locale}/${gameId}/items` },
    ],
  };

  if (gameId === 'genshin') {
    return <><GenshinItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'starrail') {
    return <><StarRailItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'nte') {
    return <><NteItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'wuwa') {
    return <><WuWaItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'zzz') {
    return <><ZzzItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'ananta') {
    return <><AnantaItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'guihuan') {
    return <><GuihuanItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'endfield') {
    return <><EndfieldItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'sea') {
    return <><SeaItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'skjh') {
    return <><SkjhItemsPage locale={locale} gameId={gameId} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">Coming Soon</div>
      </div>
    </div>
  );
}

// --- Genshin Items ---

function GenshinItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = genshinMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['character-ascension', 'talent-book', 'boss-drop', 'weekly-boss', 'local-specialty', 'common-drop', 'exp-material', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.genshin.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('genshin', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = GENSHIN_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getGenshinMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Star Rail Items ---

const STARRAIL_TYPE_LABELS: Record<string, Record<string, string>> = {
  'character-ascension': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  'trace': { zh: '行迹材料', en: 'Trace Material', ja: '軌跡素材' },
  'boss': { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  'common': { zh: '普通材料', en: 'Common Material', ja: '一般素材' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  'exp-material': { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
};

function StarRailItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = starrailMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['character-ascension', 'trace', 'boss', 'common', 'exp-material', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.starrail.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('starrail', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = STARRAIL_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getStarRailMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- NTE Items ---

function NteItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = nteMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'arc-exp', 'module-exp', 'ascension', 'boss', 'manual', 'permit', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.nte.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('nte', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = NTE_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getNteMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Wuthering Waves Items ---

const WUWA_TYPE_LABELS: Record<string, Record<string, string>> = {
  'common-drop': { zh: '普通掉落', en: 'Common Drop', ja: '一般ドロップ' },
  'skill-material': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'boss-material': { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  'weekly-boss': { zh: '周本材料', en: 'Weekly Boss', ja: '週ボス素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
};

function WuWaItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = wuwaMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['common-drop', 'skill-material', 'boss-material', 'weekly-boss', 'local-specialty', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('wuwa', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = WUWA_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getWuWaMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupByType<T extends { type: string }>(arr: T[]): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// --- ZZZ Items ---

const ZZZ_TYPE_LABELS: Record<string, Record<string, string>> = {
  '突破材料': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  '技能材料': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  '特殊材料': { zh: '特殊材料', en: 'Special Material', ja: '特殊素材' },
  '通用货币': { zh: '货币', en: 'Currency', ja: '通貨' },
  '抽卡道具': { zh: '抽卡道具', en: 'Gacha Item', ja: 'ガチャアイテム' },
};

function ZzzItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = zzzMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['突破材料', '技能材料', '特殊材料', '通用货币', '抽卡道具'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.zzz.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('zzz', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ZZZ_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getZzzMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ananta Items ---

const ANANTA_TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '触发者指南', en: 'Trigger Guide', ja: 'トリガーガイド' },
  'chaos-exp': { zh: '混沌经验', en: 'Chaos EXP', ja: 'カオスEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  'boss-material': { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  'skill-material': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
};

function AnantaItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = anantaMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'chaos-exp', 'ascension', 'boss-material', 'skill-material', 'local-specialty', 'permit', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.ananta.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('ananta', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ANANTA_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getAnantaMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Items ---

const GUIHUAN_TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '使灵指南', en: 'Spirit Guide', ja: 'スピリットガイド' },
  'spirit-exp': { zh: '使灵经验', en: 'Spirit EXP', ja: 'スピリットEXP' },
  'weapon-exp': { zh: '武器经验', en: 'Weapon EXP', ja: '武器EXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  'element-ascension': { zh: '元素突破', en: 'Element Ascension', ja: '元素昇格' },
  rare: { zh: '稀有材料', en: 'Rare Material', ja: 'レア素材' },
  boss: { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  skill: { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
};

function GuihuanItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = guihuanMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'spirit-exp', 'weapon-exp', 'ascension', 'element-ascension', 'rare', 'boss', 'skill', 'local-specialty', 'currency', 'permit'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.guihuan.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('guihuan', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = GUIHUAN_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getGuihuanMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Endfield Items ---

const ENDFIELD_TYPE_LABELS: Record<string, Record<string, string>> = {
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  skill: { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  weapon: { zh: '武器材料', en: 'Weapon Material', ja: '武器素材' },
  exp: { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  gacha: { zh: '抽卡道具', en: 'Gacha Item', ja: 'ガチャアイテム' },
};

function EndfieldItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = endfieldMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['ascension', 'skill', 'weapon', 'exp', 'currency', 'gacha'];

  const TIER_COLORS: Record<string, string> = { SS: '#ef4444', S: '#f59e0b', A: '#3b82f6', B: '#6b7280' };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.endfield.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料，${gearSets.length} 套装备` : locale === 'ja' ? `${materials.length} 種の素材、${gearSets.length} ギアセット` : `${materials.length} Materials, ${gearSets.length} Gear Sets`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('endfield', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ENDFIELD_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <div key={mat.id} className="block rounded-lg border border-game-border bg-game-surface p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getEndfieldMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Gear Sets */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '装备套装' : locale === 'ja' ? 'ギアセット' : 'Gear Sets'} ({gearSets.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gearSets.map((set) => (
            <div key={set.id} className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-game-text">{getGearSetName(set, locale)}</h3>
                <span className="text-xs font-bold" style={{ color: TIER_COLORS[set.tierRank] || '#888' }}>{set.tierRank}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-game-surface-alt px-2 py-0.5 text-[11px] text-game-text-muted">{set.mainStat}</span>
                <span className="text-xs" style={{ color: RARITY_COLORS[set.rarity] || '#888' }}>{'★'.repeat(set.rarity)}</span>
              </div>
              <p className="text-xs leading-relaxed text-game-text-muted">{getGearSetEffect(set, locale)}</p>
              {set.recommendedFor.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {set.recommendedFor.map((cls) => (
                    <span key={cls} className="rounded bg-game-primary/10 px-1.5 py-0.5 text-[10px] text-game-primary">{cls}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <NextStepStrip locale={locale} links={ENDFIELD_ITEM_NEXT_STEPS} />
    </div>
  );
}

// --- Sea of Remnants Items ---

const SEA_TYPE_LABELS: Record<string, Record<string, string>> = {
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  'character-ascension': { zh: '船员突破材料', en: 'Crew Ascension', ja: 'クルー突破素材' },
  'ship-upgrade': { zh: '船只升级材料', en: 'Ship Upgrade', ja: '船強化素材' },
  craft: { zh: '制造材料', en: 'Crafting', ja: '製作素材' },
  consumable: { zh: '消耗品', en: 'Consumable', ja: '消耗品' },
  fragment: { zh: '碎片 / 记忆', en: 'Fragment / Memory', ja: '欠片 / 記憶' },
};

const SKJH_TYPE_LABELS: Record<string, Record<string, string>> = {
  resource: { zh: '生存资源', en: 'Survival Resource', ja: '生存資源' },
  component: { zh: '组件材料', en: 'Component', ja: '部品素材' },
  ammo: { zh: '弹药爆破', en: 'Ammo / Explosive', ja: '弾薬・爆破' },
  fuel: { zh: '燃料能源', en: 'Fuel / Energy', ja: '燃料・エネルギー' },
  medical: { zh: '医疗补给', en: 'Medical Supply', ja: '医療補給' },
  base: { zh: '基地设施', en: 'Base Facility', ja: '拠点設備' },
  equipment: { zh: '生存装备', en: 'Survival Gear', ja: '生存装備' },
  gene: { zh: '基因素材', en: 'Gene Material', ja: '遺伝子素材' },
  reward: { zh: '福利奖励', en: 'Reward', ja: '報酬' },
};

function SkjhItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = skjhMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['resource', 'component', 'ammo', 'fuel', 'medical', 'base', 'equipment', 'gene', 'reward'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.skjh.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种资源道具` : locale === 'ja' ? `${materials.length} 種の資源・アイテム` : `${materials.length} resources and items`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('skjh', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = SKJH_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getSkjhMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : locale === 'ja' ? (mat.sourceJa ?? mat.sourceEn) : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SeaItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = seaMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['currency', 'character-ascension', 'ship-upgrade', 'craft', 'consumable', 'fragment'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.sea.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('sea', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = SEA_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getSeaMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{locale === 'zh' ? mat.source : mat.sourceEn}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NextStepStrip({ locale, links }: { locale: SupportedLocale; links?: NextStepLink[] }) {
  if (!links?.length) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '次に見る' : 'Next steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {link.label[locale]}
            </h3>
            <p className="text-xs text-game-text-muted line-clamp-2">
              {link.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

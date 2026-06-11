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
import { gearSets, getGearSetName, getGearSetEffect } from '@gachia/data/games/endfield/gear-sets';
import { Link } from '@/lib/i18n/navigation';

const BASE_URL = 'https://gachia.com';

const ITEM_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全材料图鉴，包含角色突破材料、天赋书、Boss掉落、区域特产等', en: 'Complete Genshin Impact material list with ascension materials, talent books, boss drops, and local specialties', ja: '原神全素材図鑑、キャラ突破素材、天賦本、ボスドロップ、地域特産品' },
  starrail: { zh: '崩坏：星穹铁道全材料图鉴，包含角色突破材料、行迹材料、Boss掉落等', en: 'Complete Honkai: Star Rail material list with ascension materials, trace materials, and boss drops', ja: 'スターレイル全素材図鑑、キャラ突破素材、軌跡素材、ボスドロップ' },
  wuwa: { zh: '鸣潮全材料图鉴，包含技能材料、Boss材料、区域特产等', en: 'Complete Wuthering Waves material list with skill materials, boss materials, and local specialties', ja: '鳴潮全素材図鑑、スキル素材、ボス素材、地域特産品' },
  nte: { zh: '异环全材料图鉴，包含突破材料、Boss掉落、技能手册等', en: 'Complete Neverness to Everness material list with ascension, boss drops, and skill manuals', ja: '異環全素材図鑑、昇格素材、ボスドロップ、スキルマニュアル' },
  zzz: { zh: '绝区零全材料图鉴，包含突破材料、技能材料、特殊材料等', en: 'Complete Zenless Zone Zero material list with ascension, skill, and special materials', ja: 'ゼンレスゾーンゼロ全素材図鑑、突破素材、スキル素材、特殊素材' },
  guihuan: { zh: '归环全材料图鉴，包含使灵突破、元素突破、Boss材料等', en: 'Complete Guihuan material list with spirit ascension, element ascension, and boss materials', ja: '帰環全素材図鑑、スピリット昇格、元素昇格、ボス素材' },
  ananta: { zh: '无限大全材料图鉴，包含突破材料、Boss材料、区域特产等', en: 'Complete Ananta material list with ascension, boss materials, and local specialties', ja: 'アナンタ全素材図鑑、昇格素材、ボス素材、地域特産品' },
  endfield: { zh: '明日方舟：终末地全材料图鉴，包含突破材料、技能材料、货币等', en: 'Complete Arknights: Endfield material list with ascension, skill, and currency materials', ja: 'アークナイツ：エンドフィールド全素材図鑑、昇格素材、スキル素材、通貨' },
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

  const desc = ITEM_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName} Wiki`;

  const title = locale === 'zh'
    ? `${gameName}材料图鉴 — 全材料掉落来源一览`
    : locale === 'ja'
      ? `${gameName}素材一覧 — 全素材のドロップ場所`
      : `${gameName} Materials — Complete Drop Sources & Farming Guide`;

  return {
    title,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/items`, languages },
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
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
        </h1>
        <div className="rounded-lg border border-dashed border-game-border bg-game-surface p-8 text-center text-sm text-game-text-muted">
          {locale === 'zh' ? '暂无材料数据' : locale === 'ja' ? '素材データはまだありません' : 'No material data available yet'}
        </div>
      </div>
    );
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
    </div>
  );
}

import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteMaterials, getNteMaterialName, genshinMaterials, getGenshinMaterialName, starrailMaterials, getStarRailMaterialName, wuwaMaterials, getWuWaMaterialName, zzzMaterials, getZzzMaterialName } from '@gachia/data';

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

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    return <GenshinItemsPage locale={locale} />;
  }

  if (gameId === 'starrail') {
    return <StarRailItemsPage locale={locale} />;
  }

  if (gameId === 'nte') {
    return <NteItemsPage locale={locale} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaItemsPage locale={locale} />;
  }

  if (gameId === 'zzz') {
    return <ZzzItemsPage locale={locale} />;
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

function GenshinItemsPage({ locale }: { locale: SupportedLocale }) {
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
                <div key={mat.id} className="rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getGenshinMaterialName(mat, locale)}</h3>
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

function StarRailItemsPage({ locale }: { locale: SupportedLocale }) {
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
                <div key={mat.id} className="rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getStarRailMaterialName(mat, locale)}</h3>
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
    </div>
  );
}

// --- NTE Items ---

function NteItemsPage({ locale }: { locale: SupportedLocale }) {
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
                <div key={mat.id} className="rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getNteMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </div>
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

function WuWaItemsPage({ locale }: { locale: SupportedLocale }) {
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
                <div key={mat.id} className="rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getWuWaMaterialName(mat, locale)}</h3>
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

function ZzzItemsPage({ locale }: { locale: SupportedLocale }) {
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
                <div key={mat.id} className="rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getZzzMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

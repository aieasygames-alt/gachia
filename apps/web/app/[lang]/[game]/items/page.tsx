import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteMaterials, getNteMaterialName } from '@gachia/data';

const TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '猎手指南', en: 'Hunter Guide', ja: 'ハンターガイド' },
  'arc-exp': { zh: '弧盘经验', en: 'Arc EXP', ja: 'アルクEXP' },
  'module-exp': { zh: '模块经验', en: 'Module EXP', ja: 'モジュールEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  boss: { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  manual: { zh: '技能手册', en: 'Skill Manual', ja: 'スキルマニュアル' },
};

const RARITY_COLORS = ['', '#9ca3af', '#4ade80', '#60a5fa', '#a855f7'];

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId !== 'nte') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
            Coming Soon
          </div>
        </div>
      </div>
    );
  }

  const materials = nteMaterials;
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'arc-exp', 'module-exp', 'ascension', 'boss', 'manual', 'permit', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {typeLabel} ({list.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <div key={mat.id} className="rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{getNteMaterialName(mat, locale)}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>
                      {'★'.repeat(mat.rarity)}
                    </span>
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

function groupByType<T extends { type: string }>(arr: T[]): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

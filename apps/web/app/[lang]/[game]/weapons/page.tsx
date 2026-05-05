import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteWeapons, getNteWeaponName, getNteWeaponEffect } from '@gachia/data';

const WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  solid: { zh: '固体', en: 'Solid', ja: 'ソリッド' },
  synthesis: { zh: '合成', en: 'Synthesis', ja: 'シンセシス' },
  gas: { zh: '气体', en: 'Gas', ja: 'ガス' },
};

const RANK_COLORS: Record<string, string> = { S: '#eab308', A: '#a855f7', B: '#60a5fa' };

export default async function WeaponsPage({
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
          {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
            Coming Soon
          </div>
        </div>
      </div>
    );
  }

  const weapons = nteWeapons;
  const grouped = groupBy(weapons, 'rank');
  const ranks = ['S', 'A', 'B'] as const;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '弧盘' : locale === 'ja' ? 'アルク' : 'Arcs'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件弧盘` : locale === 'ja' ? `${weapons.length} 個のアルク` : `${weapons.length} Arcs`}
      </p>

      {ranks.map((rank) => {
        const list = grouped[rank];
        if (!list || list.length === 0) return null;
        return (
          <section key={rank} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rank}-Rank ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getNteWeaponEffect(w, locale);
                const typeLabel = WEAPON_TYPE_LABELS[w.type]?.[locale] ?? w.type;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: RANK_COLORS[w.rank] || '#888' }}>{w.rank}</span>
                      <h3 className="font-semibold text-game-text">{getNteWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupBy<T extends { rank: string }>(arr: T[], key: keyof T & 'rank'): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = item[key] as string;
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

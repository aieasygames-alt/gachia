import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteDiskSets, getNteDiskSetName, getNteDiskSetDesc2pc, getNteDiskSetDesc4pc, getNteCharacterName, getNteCharacterById } from '@gachia/data';

const ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

export default async function DiskSetsPage({
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
          {CATEGORY_LABELS['disk-sets']?.[locale] ?? 'Disk Sets'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const diskSets = nteDiskSets;
  const general = diskSets.filter((d) => d.category === 'general');
  const elemental = diskSets.filter((d) => d.category === 'elemental');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['disk-sets']?.[locale] ?? 'Disk Sets'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${diskSets.length} 套光盘` : locale === 'ja' ? `${diskSets.length} セット` : `${diskSets.length} Disk Sets`}
      </p>

      {general.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '通用套装' : locale === 'ja' ? '汎用セット' : 'General'} ({general.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {general.map((ds) => (
              <DiskSetCard key={ds.id} ds={ds} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {elemental.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '元素套装' : locale === 'ja' ? '元素セット' : 'Elemental'} ({elemental.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {elemental.map((ds) => (
              <DiskSetCard key={ds.id} ds={ds} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DiskSetCard({ ds, locale }: { ds: typeof nteDiskSets[number]; locale: SupportedLocale }) {
  const elementColor = ds.element ? ELEMENT_COLORS[ds.element] : undefined;

  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">{getNteDiskSetName(ds, locale)}</h3>
        {ds.element && (
          <span className="rounded px-1.5 py-0.5 text-xs text-white" style={{ backgroundColor: elementColor || '#888' }}>
            {ds.element}
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getNteDiskSetDesc2pc(ds, locale)}</span></p>
        <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{getNteDiskSetDesc4pc(ds, locale)}</span></p>
      </div>
      {ds.characters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ds.characters.slice(0, 6).map((charId) => {
            const char = getNteCharacterById(charId);
            return char ? (
              <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                {getNteCharacterName(char, locale)}
              </span>
            ) : null;
          })}
          {ds.characters.length > 6 && <span className="text-xs text-game-text-muted">+{ds.characters.length - 6}</span>}
        </div>
      )}
    </div>
  );
}

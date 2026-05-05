import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { genshinArtifactSets, getArtifactSetName, getArtifactSetDesc2pc, getArtifactSetDesc4pc, getGenshinCharacterName, getGenshinCharacterById } from '@gachia/data';

const RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

export default async function ArtifactsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId !== 'genshin') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const sets = genshinArtifactSets;
  const fiveStar = sets.filter((s) => s.rarity === 5);
  const fourStar = sets.filter((s) => s.rarity === 4);
  const threeStar = sets.filter((s) => s.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${sets.length} 套圣遗物` : locale === 'ja' ? `${sets.length} セット` : `${sets.length} Artifact Sets`}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              <span style={{ color: RARITY_COLORS[rarity] || '#888' }}>{rarity}★</span> ({list.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((set) => (
                <ArtifactSetCard key={set.id} set={set} locale={locale} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ArtifactSetCard({ set, locale }: { set: typeof genshinArtifactSets[number]; locale: SupportedLocale }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">{getArtifactSetName(set, locale)}</h3>
        <span className="text-xs font-bold" style={{ color: RARITY_COLORS[set.rarity] || '#888' }}>{set.rarity}★</span>
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getArtifactSetDesc2pc(set, locale)}</span></p>
        <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{getArtifactSetDesc4pc(set, locale)}</span></p>
      </div>
      {set.characters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {set.characters.slice(0, 8).map((charId) => {
            const char = getGenshinCharacterById(charId);
            return char ? (
              <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                {getGenshinCharacterName(char, locale)}
              </span>
            ) : null;
          })}
          {set.characters.length > 8 && <span className="text-xs text-game-text-muted">+{set.characters.length - 8}</span>}
        </div>
      )}
    </div>
  );
}

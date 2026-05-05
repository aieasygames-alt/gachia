import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

const ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80',
  chaos: '#8b5cf6',
  cosmos: '#3b82f6',
  incantation: '#f59e0b',
  lakshana: '#ec4899',
  psyche: '#06b6d4',
};

export default async function CharactersPage({
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
          {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
            Coming Soon
          </div>
        </div>
      </div>
    );
  }

  const chars = nteCharacters;
  const sRank = chars.filter((c) => c.rank === 'S');
  const aRank = chars.filter((c) => c.rank === 'A');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {/* S-Rank */}
      {sRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            S {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({sRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sRank.map((char) => (
              <CharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {/* A-Rank */}
      {aRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            A {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({aRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {aRank.map((char) => (
              <CharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CharacterCard({ char, locale, gameId }: { char: typeof nteCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = ELEMENT_COLORS[char.attribute] || '#888';
  const imageUrl = getNteCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        {imageUrl ? (
          <img src={imageUrl} alt={getNteCharacterName(char, locale)} className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-game-text-muted">
            {char.nameEn.charAt(0)}
          </div>
        )}
        {/* Element badge */}
        <span
          className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: elementColor }}
        >
          {char.attribute.charAt(0).toUpperCase() + char.attribute.slice(1)}
        </span>
        {/* Rank badge */}
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rank}
        </span>
      </div>
      {/* Info */}
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getNteCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.roleEn}</p>
      </div>
    </Link>
  );
}

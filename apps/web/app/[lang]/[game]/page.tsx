import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

export default async function GameHome({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  const enabledRoutes = Object.entries(gameConfig.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => route);

  return (
    <div>
      <h1
        className="mb-8 text-3xl font-bold"
        style={{ color: gameConfig.theme.primary }}
      >
        {gameConfig.name[locale]}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enabledRoutes.map((route) => (
          <Link
            key={route}
            href={`/${gameId}/${route}` as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-5 transition-all hover:border-game-primary hover:shadow-lg"
          >
            <h2 className="mb-1 text-lg font-semibold text-game-text group-hover:text-game-primary">
              {CATEGORY_LABELS[route]?.[locale] ?? route}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}

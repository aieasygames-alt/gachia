import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

interface GameNavProps {
  gameId: GameId;
  locale: SupportedLocale;
}

export function GameNav({ gameId, locale }: GameNavProps) {
  const game = GAMES[gameId];
  const enabledRoutes = Object.entries(game.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => route);

  return (
    <nav
      className="border-b border-game-border bg-game-surface"
      style={{ borderColor: game.theme.primary + '30' }}
    >
      <div className="container mx-auto flex items-center gap-1 overflow-x-auto px-4 py-2">
        {enabledRoutes.map((route) => (
          <Link
            key={route}
            href={`/${gameId}/${route}` as '/'}
            className="shrink-0 rounded-md px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:bg-game-surface-alt hover:text-game-primary"
          >
            {CATEGORY_LABELS[route]?.[locale] ?? route}
          </Link>
        ))}
      </div>
    </nav>
  );
}

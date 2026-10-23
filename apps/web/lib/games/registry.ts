import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { isRocoPublicPageUnderReview, ROCO_REVIEW_NAVIGATION } from '../roco-public-review';

export function getGameRouteLabel(gameId: GameId, route: string, locale: SupportedLocale) {
  const label = CATEGORY_LABELS[route]?.[locale] ?? route;
  return isRocoPublicPageUnderReview(gameId, route) ? `${label}${ROCO_REVIEW_NAVIGATION[locale].reviewSuffix}` : label;
}

/**
 * Get game configuration by ID.
 * Throws if game not found.
 */
export function getGame(gameId: GameId) {
  const game = GAMES[gameId];
  if (!game) throw new Error(`Unknown game: ${gameId}`);
  return game;
}

/**
 * Get enabled routes for a game.
 */
export function getGameRoutes(gameId: GameId) {
  const game = getGame(gameId);
  return Object.entries(game.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => ({
      slug: route,
      label: (locale: SupportedLocale) =>
        getGameRouteLabel(gameId, route, locale),
    }));
}

/**
 * Build CSS custom properties string for a game theme.
 */
export function getThemeCSS(gameId: GameId): React.CSSProperties {
  const game = getGame(gameId);
  return {
    '--color-primary': game.theme.primary,
    '--color-accent': game.theme.accent,
    '--color-bg': game.theme.background,
    '--color-surface': game.theme.surface,
  } as React.CSSProperties;
}

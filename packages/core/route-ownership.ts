import contract from './route-ownership.json';

export type DedicatedRouteOwner = keyof typeof contract.games;
export type RouteOwner = 'main' | DedicatedRouteOwner;

/** Intended path owner only; Router bindings, canaries and switches still decide delivery. */
export function getRouteOwner(pathname: string): RouteOwner {
  const segments = pathname.split('/').filter(Boolean);
  for (const [owner, routes] of Object.entries(contract.games)) {
    if (segments[1] !== owner) continue;
    if (segments[0] === '_games' || segments[0] === 'sitemaps') return owner as DedicatedRouteOwner;
    if (!routes.locales.includes(segments[0] ?? '')) continue;
    if (segments.length === 2 ||
      (segments.length === 3 && routes.pages.includes(segments[2] ?? '')) ||
      (segments.length === 4 && routes.details.includes(segments[2] ?? ''))) return owner as DedicatedRouteOwner;
  }
  return 'main';
}

/** Fallback delivery alone is not permission to index unsupported dedicated-game pages. */
export function isMainSitemapPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (!['zh', 'en', 'ja'].includes(segments[0] ?? '') || getRouteOwner(pathname) !== 'main') return false;
  const game = segments[1] ?? '';
  const routes = Object.hasOwn(contract.games, game) ? contract.games[game as DedicatedRouteOwner] : undefined;
  return !routes || (segments.length === 4 && routes.mainIndexableDetails.some(section => section === segments[2]));
}

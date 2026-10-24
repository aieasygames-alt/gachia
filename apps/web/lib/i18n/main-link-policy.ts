import { GAME_DEPLOYMENTS, LOCALES, getRouteOwner } from '@gachia/core';

export function requiresMainDocumentNavigation(href: string, locale = 'zh'): boolean {
  if (/^https:\/\/gachia\.com\//.test(href)) href = new URL(href).pathname;
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const segments = (href.split(/[?#]/, 1)[0] ?? '').split('/').filter(Boolean);
  if (!(LOCALES as readonly string[]).includes(segments[0] ?? '')) segments.unshift(locale);
  const owner = getRouteOwner('/' + segments.join('/'));
  if (owner === 'main') return false;
  const deployment = GAME_DEPLOYMENTS[owner];
  // Main-owned fallback details can reuse this runtime; dedicated pages cannot.
  return deployment?.deployment === 'game' && deployment.status === 'live';
}

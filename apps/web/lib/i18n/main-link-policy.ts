import { GAME_DEPLOYMENTS, LOCALES } from '@gachia/core';
import type { GameId } from '@gachia/core';

export function requiresMainDocumentNavigation(href: string): boolean {
  if (/^https:\/\/gachia\.com\//.test(href)) href = new URL(href).pathname;
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const segments = (href.split(/[?#]/, 1)[0] ?? '').split('/').filter(Boolean);
  if ((LOCALES as readonly string[]).includes(segments[0] ?? '')) segments.shift();
  const deployment = GAME_DEPLOYMENTS[segments[0] as GameId];
  // This application owns main routes, never an independently live game's runtime.
  return deployment?.deployment === 'game' && deployment.status === 'live';
}

import { GAME_IDS } from './constants';
import type { GameId } from './types';

export type GameDeploymentStatus = 'draft' | 'preview' | 'live' | 'maintenance' | 'retired';

export type GameDeployment = {
  deployment: 'main' | 'game';
  worker: string;
  assetPrefix?: string;
  sitemapPath?: string;
  status: GameDeploymentStatus;
};

/**
 * Single source of truth for game delivery. A game remains on the main Worker
 * until its Router binding is explicitly enabled after preview verification.
 */
export const GAME_DEPLOYMENTS: Partial<Record<GameId, GameDeployment>> = {
  genshin: {
    deployment: 'game',
    worker: 'gachia-game-genshin',
    assetPrefix: '/_games/genshin',
    sitemapPath: '/sitemaps/genshin/index.xml',
    status: 'live',
  },
  nte: {
    deployment: 'game',
    worker: 'gachia-game-nte',
    assetPrefix: '/_games/nte',
    sitemapPath: '/sitemaps/nte/index.xml',
    status: 'live',
  },
  'azur-promilia': {
    deployment: 'game',
    worker: 'gachia-game-azur-promilia',
    assetPrefix: '/_games/azur-promilia',
    sitemapPath: '/sitemaps/azur-promilia/index.xml',
    status: 'live',
  },
  lvmeng: {
    deployment: 'game',
    worker: 'gachia-game-lvmeng',
    assetPrefix: '/_games/lvmeng',
    sitemapPath: '/sitemaps/lvmeng/index.xml',
    status: 'live',
  },
};

export function isMainWorkerGame(gameId: GameId): boolean {
  return GAME_DEPLOYMENTS[gameId]?.deployment !== 'game';
}

export const MAIN_WORKER_GAME_IDS = GAME_IDS.filter(isMainWorkerGame);

export function isLiveGameDeployment(gameId: string): boolean {
  return GAME_DEPLOYMENTS[gameId as GameId]?.status === 'live';
}

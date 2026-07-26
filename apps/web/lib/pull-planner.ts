import type { GameId } from '@gachia/core';

export type PullPlannerGameId = Extract<GameId, 'genshin' | 'starrail' | 'wuwa' | 'zzz'>;
export type PullRisk = 'ready' | 'close' | 'short';

export interface PullPlannerGameConfig {
  gameId: PullPlannerGameId;
  currencyName: string;
  pullName: string;
  currencyPerPull: number;
  hardPity: number;
}

export interface PullPlannerInput {
  gameId: PullPlannerGameId;
  currentPulls: number;
  currentPity: number;
  guaranteed: boolean;
  currency: number;
  targetCopies: number;
  bannerEndDate: string;
  dailyPulls: number;
}

export interface PullPlannerResult {
  totalAvailablePulls: number;
  pullsFromCurrency: number;
  projectedDailyPulls: number;
  daysRemaining: number;
  worstCasePullsNeeded: number;
  missingPulls: number;
  surplusPulls: number;
  risk: PullRisk;
}

export const PULL_PLANNER_GAMES: Record<PullPlannerGameId, PullPlannerGameConfig> = {
  genshin: {
    gameId: 'genshin',
    currencyName: 'Primogems',
    pullName: 'Intertwined Fate',
    currencyPerPull: 160,
    hardPity: 90,
  },
  starrail: {
    gameId: 'starrail',
    currencyName: 'Stellar Jade',
    pullName: 'Special Pass',
    currencyPerPull: 160,
    hardPity: 90,
  },
  wuwa: {
    gameId: 'wuwa',
    currencyName: 'Astrite',
    pullName: 'Radiant Tide',
    currencyPerPull: 160,
    hardPity: 80,
  },
  zzz: {
    gameId: 'zzz',
    currencyName: 'Polychrome',
    pullName: 'Encrypted Master Tape',
    currencyPerPull: 160,
    hardPity: 90,
  },
};

function clampNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function getDaysRemaining(bannerEndDate: string, now = new Date()): number {
  const end = Date.parse(`${bannerEndDate}T23:59:59Z`);
  if (Number.isNaN(end)) return 0;
  const diffMs = end - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

export function calculateWorstCasePulls(input: Pick<PullPlannerInput, 'gameId' | 'currentPity' | 'guaranteed' | 'targetCopies'>): number {
  const config = PULL_PLANNER_GAMES[input.gameId];
  const targetCopies = Math.max(1, clampNonNegativeInteger(input.targetCopies));
  const pity = Math.min(config.hardPity, clampNonNegativeInteger(input.currentPity));
  const firstCopyPulls = input.guaranteed
    ? Math.max(0, config.hardPity - pity)
    : Math.max(0, config.hardPity - pity) + config.hardPity;
  const extraCopiesPulls = Math.max(0, targetCopies - 1) * config.hardPity * 2;

  return firstCopyPulls + extraCopiesPulls;
}

export function calculatePullPlan(input: PullPlannerInput, now = new Date()): PullPlannerResult {
  const config = PULL_PLANNER_GAMES[input.gameId];
  const pullsFromCurrency = Math.floor(clampNonNegativeInteger(input.currency) / config.currencyPerPull);
  const daysRemaining = getDaysRemaining(input.bannerEndDate, now);
  const projectedDailyPulls = Math.floor(daysRemaining * Math.max(0, input.dailyPulls));
  const totalAvailablePulls = clampNonNegativeInteger(input.currentPulls) + pullsFromCurrency + projectedDailyPulls;
  const worstCasePullsNeeded = calculateWorstCasePulls(input);
  const missingPulls = Math.max(0, worstCasePullsNeeded - totalAvailablePulls);
  const surplusPulls = Math.max(0, totalAvailablePulls - worstCasePullsNeeded);
  const gapRatio = worstCasePullsNeeded === 0 ? 0 : missingPulls / worstCasePullsNeeded;
  const risk: PullRisk = missingPulls === 0 ? 'ready' : gapRatio <= 0.2 ? 'close' : 'short';

  return {
    totalAvailablePulls,
    pullsFromCurrency,
    projectedDailyPulls,
    daysRemaining,
    worstCasePullsNeeded,
    missingPulls,
    surplusPulls,
    risk,
  };
}

import type { StarRailRecommendedBuild } from './types';

// Historical imports contain both the detailed shape and empty
// { artifacts, weapons, teams } records. Only render a usable detailed build.
export function getUsableStarRailBuild(value: unknown): StarRailRecommendedBuild | null {
  if (!value || typeof value !== 'object') return null;
  const build = value as Record<string, unknown>;
  for (const key of ['bestLightCone', 'bestLightConeEn', 'bestRelicSet', 'bestRelicSetEn', 'bestPlanarOrnament', 'bestPlanarOrnamentEn']) {
    if (typeof build[key] !== 'string' || !build[key].trim()) return null;
  }
  for (const key of ['mainStats', 'mainStatsEn']) {
    const stats = build[key];
    if (!stats || typeof stats !== 'object' || Array.isArray(stats) || !Object.keys(stats).length ||
      !Object.values(stats).every(stat => typeof stat === 'string' && stat.trim())) return null;
  }
  for (const key of ['alternativeLightCones', 'subStatPriority', 'subStatPriorityEn']) {
    if (!Array.isArray(build[key]) || !build[key].every(stat => typeof stat === 'string')) return null;
  }
  return value as StarRailRecommendedBuild;
}

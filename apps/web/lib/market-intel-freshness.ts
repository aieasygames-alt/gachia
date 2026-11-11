import { join } from 'node:path';
import { loadJson } from '@gachia/data/load-json';
import type { GameId } from '@gachia/core';
import { FRESHNESS_WATCH_TERMS, scanFreshnessGuides, type FreshnessGuide } from './content-freshness';
import { getGenshinFreshnessGuides } from './genshin-freshness-content';

export const freshnessGuideGames = ['genshin', 'starrail', 'wuwa', 'zzz', 'endfield', 'sea', 'aniimo'] as const satisfies readonly GameId[];

export async function getDashboardFreshnessFindings() {
  let genshinGuideCount: number | null = null;
  const findings = await Promise.all(freshnessGuideGames.map(async gameId => {
    if (gameId === 'genshin') {
      try {
        const { guides, source } = await getGenshinFreshnessGuides();
        genshinGuideCount = guides.length;
        return scanFreshnessGuides(gameId, guides, source);
      } catch {
        return [];
      }
    }
    const assetPath = `/data/${gameId}/raw-guides.json`;
    const guides = await loadJson<FreshnessGuide[]>(join(process.cwd(), 'public', assetPath), assetPath);
    return scanFreshnessGuides(gameId, guides, `apps/web/public${assetPath}`);
  }));
  return { findings: findings.flat(), genshinGuideCount,
    genshinRuleCount: FRESHNESS_WATCH_TERMS.filter(rule => rule.games.includes('genshin')).length };
}

import { GAME_IDS } from '@gachia/core';
import { describe, expect, it } from 'vitest';
import {
  MARKET_INTEL_BATCH_ID,
  MARKET_INTEL_OPPORTUNITIES,
  getMarketIntelByPriority,
  getMarketIntelForGame,
  getMarketIntelValidationIssues,
  sortMarketIntelByPriority,
} from '@/lib/market-intel';
import { getKeywordRisk } from '@/lib/keyword-governance';

describe('market intelligence backlog', () => {
  it('stores the current sampling batch as structured opportunities', () => {
    expect(MARKET_INTEL_BATCH_ID).toBe('market-intel-2026-08-14');
    expect(MARKET_INTEL_OPPORTUNITIES.length).toBeGreaterThanOrEqual(GAME_IDS.length);
    expect(getMarketIntelValidationIssues()).toEqual([]);
  });

  it('covers every supported game in the 2026-08-14 batch', () => {
    for (const gameId of GAME_IDS) {
      expect(getMarketIntelForGame(gameId).length).toBeGreaterThan(0);
    }
  });

  it('keeps P0 opportunities actionable', () => {
    const p0 = getMarketIntelByPriority('P0');

    expect(p0.map((opportunity) => opportunity.gameId)).toEqual([
      'genshin',
      'wuwa',
      'zzz',
      'skjh',
      'endfield',
    ]);

    for (const opportunity of p0) {
      expect(opportunity.targetPages.length).toBeGreaterThan(0);
      expect(opportunity.actions).toContain('update_existing_page');
      expect(opportunity.actions.some((action) => action === 'update_live_module' || action === 'update_download_route' || action === 'create_topic_page')).toBe(true);
    }
  });

  it('separates risky terms from healthy keyword clusters', () => {
    const allRiskTerms = MARKET_INTEL_OPPORTUNITIES.flatMap((opportunity) => opportunity.riskTerms);
    const riskyTermHits = allRiskTerms.filter((term) => getKeywordRisk(term));

    expect(riskyTermHits.length).toBeGreaterThan(10);
    for (const opportunity of MARKET_INTEL_OPPORTUNITIES) {
      for (const keyword of opportunity.keywordCluster) {
        expect(getKeywordRisk(keyword)).toBeUndefined();
      }
    }
  });

  it('sorts opportunities by priority before id', () => {
    const sorted = sortMarketIntelByPriority([
      MARKET_INTEL_OPPORTUNITIES.find((opportunity) => opportunity.priority === 'P1')!,
      MARKET_INTEL_OPPORTUNITIES.find((opportunity) => opportunity.priority === 'P0')!,
    ]);

    expect(sorted[0]?.priority).toBe('P0');
  });
});

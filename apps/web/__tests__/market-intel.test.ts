import { GAME_IDS, type GameId } from '@gachia/core';
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
    expect(MARKET_INTEL_BATCH_ID).toBe('market-intel-2026-08-31');
    expect(MARKET_INTEL_OPPORTUNITIES.length).toBe(10);
    expect(getMarketIntelValidationIssues()).toEqual([]);
  });

  it('covers the current-site games in the 2026-08-31 batch', () => {
    const currentSiteGames: GameId[] = [
      'genshin',
      'starrail',
      'wuwa',
      'nte',
      'zzz',
      'guihuan',
      'ananta',
      'endfield',
      'sea',
      'skjh',
    ];

    for (const gameId of currentSiteGames) {
      expect(getMarketIntelForGame(gameId).length).toBeGreaterThan(0);
    }
    expect(MARKET_INTEL_OPPORTUNITIES.map((opportunity) => opportunity.gameId)).not.toContain('roco');
    expect(MARKET_INTEL_OPPORTUNITIES.map((opportunity) => opportunity.gameId)).not.toContain('roco-cn');
    expect(currentSiteGames.every((gameId) => GAME_IDS.includes(gameId))).toBe(true);
  });

  it('keeps P0 and P1 opportunities actionable after execution', () => {
    const p0 = getMarketIntelByPriority('P0');
    const p1 = getMarketIntelByPriority('P1');

    expect(p0.map((opportunity) => opportunity.gameId)).toEqual([
      'genshin',
      'zzz',
      'endfield',
      'sea',
      'ananta',
    ]);
    expect(p1.map((opportunity) => opportunity.gameId)).toEqual([
      'wuwa',
      'nte',
      'skjh',
      'starrail',
      'guihuan',
    ]);

    for (const opportunity of p0) {
      expect(opportunity.status).toBe('done');
      expect(opportunity.targetPages.length).toBeGreaterThan(0);
      expect(opportunity.actions).toContain('update_existing_page');
      expect(opportunity.actions.some((action) => action === 'update_live_module' || action === 'update_download_route' || action === 'create_topic_page')).toBe(true);
    }
    for (const opportunity of p1) {
      expect(opportunity.status).toBe('done');
      expect(opportunity.targetPages.length).toBeGreaterThan(0);
      expect(opportunity.actions).toContain('update_existing_page');
      expect(opportunity.actions.some((action) =>
        action === 'add_faq' ||
        action === 'add_internal_links' ||
        action === 'update_code_route' ||
        action === 'update_download_route' ||
        action === 'monitor_only'
      )).toBe(true);
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

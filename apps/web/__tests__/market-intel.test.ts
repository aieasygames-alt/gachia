import { GAME_IDS, type GameId } from '@gachia/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MARKET_INTEL_BATCH_ID,
  MARKET_INTEL_OPPORTUNITIES,
  MARKET_INTEL_SOURCE_REPORT,
  getMarketIntelByPriority,
  getMarketIntelForGame,
  getMarketIntelValidationIssues,
  sortMarketIntelByPriority,
} from '@/lib/market-intel';
import { getKeywordRisk } from '@/lib/keyword-governance';
import { VERSION_SNAPSHOTS } from '@/lib/version-snapshots';

const repoRoot = join(__dirname, '..', '..', '..');

describe('market intelligence backlog', () => {
  it('stores the current sampling batch as structured opportunities', () => {
    expect(MARKET_INTEL_BATCH_ID).toBe('market-intel-2026-09-21');
    expect(MARKET_INTEL_SOURCE_REPORT).toBe('/plans/market-intel-2026-09-21.md');
    expect(existsSync(join(repoRoot, MARKET_INTEL_SOURCE_REPORT.slice(1)))).toBe(true);
    expect(MARKET_INTEL_OPPORTUNITIES.length).toBe(13);
    expect(getMarketIntelValidationIssues()).toEqual([]);
  });

  it('covers the current-site games in the 2026-09-21 batch', () => {
    const currentSiteGames: GameId[] = [
      'aniimo',
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
      'roco',
      'roco-cn',
    ];

    for (const gameId of currentSiteGames) {
      expect(getMarketIntelForGame(gameId).length).toBeGreaterThan(0);
    }
    expect(MARKET_INTEL_OPPORTUNITIES.map((opportunity) => opportunity.gameId)).toContain('roco');
    expect(MARKET_INTEL_OPPORTUNITIES.map((opportunity) => opportunity.gameId)).toContain('roco-cn');
    expect(MARKET_INTEL_OPPORTUNITIES.map((opportunity) => opportunity.gameId)).toContain('aniimo');
    expect(currentSiteGames.every((gameId) => GAME_IDS.includes(gameId))).toBe(true);
  });

  it('keeps P0 and P1 opportunities actionable after execution', () => {
    const p0 = getMarketIntelByPriority('P0');
    const p1 = getMarketIntelByPriority('P1');

    expect(p0.map((opportunity) => opportunity.gameId)).toEqual([
      'aniimo',
      'genshin',
      'starrail',
      'roco',
    ]);
    expect(p1.map((opportunity) => opportunity.gameId)).toEqual([
      'zzz',
      'wuwa',
      'nte',
      'endfield',
      'ananta',
      'skjh',
      'roco-cn',
      'sea',
    ]);

    for (const opportunity of p0) {
      expect(opportunity.status).toBe('done');
      expect(VERSION_SNAPSHOTS[opportunity.gameId]).toBeDefined();
      expect(opportunity.targetPages.length).toBeGreaterThan(0);
      expect(opportunity.actions).toContain('update_existing_page');
      expect(opportunity.actions.some((action) => action === 'update_live_module' || action === 'update_download_route' || action === 'create_topic_page' || action === 'update_code_route' || action === 'add_faq')).toBe(true);
    }
    for (const opportunity of p1) {
      expect(opportunity.status).toBe('done');
      expect(VERSION_SNAPSHOTS[opportunity.gameId]).toBeDefined();
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

  it('accepts planned, watch, and expired lifecycle states for future batches', () => {
    const sample = MARKET_INTEL_OPPORTUNITIES[0]!;

    expect(getMarketIntelValidationIssues([
      { ...sample, id: 'sample-watch', status: 'watch' },
      { ...sample, id: 'sample-planned', status: 'planned' },
      { ...sample, id: 'sample-expired', status: 'expired' },
    ])).toEqual([]);
  });

  it('tracks signal strength and deadline metadata for execution decisions', () => {
    const p0 = getMarketIntelByPriority('P0');
    const roco = MARKET_INTEL_OPPORTUNITIES.find((opportunity) => opportunity.gameId === 'roco');

    for (const opportunity of p0) {
      expect(['confirmed', 'mixed']).toContain(opportunity.signal?.strength);
      if (opportunity.gameId === 'aniimo' || opportunity.gameId === 'roco') {
        expect(opportunity.signal?.deadline).toBeDefined();
      }
    }

    expect(roco?.signal).toEqual({ strength: 'confirmed', deadline: '2026-10-27' });

    for (const opportunity of MARKET_INTEL_OPPORTUNITIES) {
      if (opportunity.signal?.deadline) {
        expect(Number.isNaN(Date.parse(`${opportunity.signal.deadline}T00:00:00Z`))).toBe(false);
      }
    }
  });
});

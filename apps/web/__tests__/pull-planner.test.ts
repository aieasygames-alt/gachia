import { describe, expect, it } from 'vitest';
import {
  calculatePullPlan,
  calculateWorstCasePulls,
  getDaysRemaining,
} from '@/lib/pull-planner';

describe('pull planner', () => {
  it('calculates guaranteed first copy from current pity', () => {
    expect(calculateWorstCasePulls({
      gameId: 'starrail',
      currentPity: 70,
      guaranteed: true,
      targetCopies: 1,
    })).toBe(20);
  });

  it('calculates non-guaranteed first copy as two pity cycles', () => {
    expect(calculateWorstCasePulls({
      gameId: 'wuwa',
      currentPity: 30,
      guaranteed: false,
      targetCopies: 1,
    })).toBe(130);
  });

  it('adds extra copies as worst-case two-cycle guarantees', () => {
    expect(calculateWorstCasePulls({
      gameId: 'genshin',
      currentPity: 0,
      guaranteed: true,
      targetCopies: 2,
    })).toBe(270);
  });

  it('combines pulls, currency, and daily projection into risk status', () => {
    const result = calculatePullPlan({
      gameId: 'zzz',
      currentPulls: 70,
      currentPity: 80,
      guaranteed: true,
      currency: 1600,
      targetCopies: 1,
      bannerEndDate: '2026-08-10',
      dailyPulls: 1,
    }, new Date('2026-08-01T00:00:00Z'));

    expect(result.daysRemaining).toBe(10);
    expect(result.pullsFromCurrency).toBe(10);
    expect(result.projectedDailyPulls).toBe(10);
    expect(result.totalAvailablePulls).toBe(90);
    expect(result.worstCasePullsNeeded).toBe(10);
    expect(result.risk).toBe('ready');
  });

  it('handles invalid or past dates as zero days remaining', () => {
    expect(getDaysRemaining('not-a-date', new Date('2026-08-01T00:00:00Z'))).toBe(0);
    expect(getDaysRemaining('2026-07-01', new Date('2026-08-01T00:00:00Z'))).toBe(0);
  });
});

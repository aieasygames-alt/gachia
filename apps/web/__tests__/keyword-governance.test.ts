import { describe, expect, it } from 'vitest';
import { getKeywordRisk, isBlockedNoiseQuery } from '@/lib/keyword-governance';

describe('keyword governance', () => {
  it('blocks adult, leak, mod, datamine, and private-server intent', () => {
    for (const query of [
      '原神同人动漫',
      'honkai star rail leaks',
      '鸣潮 mod',
      '终末地 解包',
      '异环 aes key',
      '失控进化 公益服',
    ]) {
      expect(isBlockedNoiseQuery(query)).toBe(true);
      expect(getKeywordRisk(query)).toBeDefined();
    }
  });

  it('allows healthy official guide and platform intent', () => {
    for (const query of [
      '原神兑换码',
      'Wuthering Waves Xbox download',
      'Sea of Remnants Steam',
      '归环公测时间',
      'Ananta beta gameplay',
    ]) {
      expect(isBlockedNoiseQuery(query)).toBe(false);
    }
  });
});

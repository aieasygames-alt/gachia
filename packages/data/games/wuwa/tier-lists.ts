import type { TierList, TierRank } from '@gachia/core';

// P1-25: Add basic tier list data for Wuthering Waves
// These are representative tier lists based on 2026 meta
const tierEntries: Array<{ characterId: string; tier: TierRank; role: string }> = [
  // SS tier - Top performers
  { characterId: 'changli', tier: 'SS', role: 'Main DPS' },
  { characterId: 'sheno', tier: 'SS', role: 'Support' },

  // S tier - Excellent performance
  { characterId: 'jinhsi', tier: 'S', role: 'Main DPS' },
  { characterId: 'jianxin', tier: 'S', role: 'Support' },
  { characterId: 'verina', tier: 'S', role: 'Main DPS' },
  { characterId: 'carl', tier: 'S', role: 'Sustain' },

  // A tier - Good performance
  { characterId: 'shyiny', tier: 'A', role: 'Support' },
  { characterId: 'mounty', tier: 'A', role: 'Main DPS' },
  { characterId: 'yecodu', tier: 'A', role: 'Support' },

  // B tier - Situational use
  { characterId: 'jester', tier: 'B', role: 'DPS' },
  { characterId: 'ravenna', tier: 'B', role: 'Support' },
  { characterId: 'huaçuo', tier: 'B', role: 'Controller' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'wuwa',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'wuwa',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'wuwa',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
];

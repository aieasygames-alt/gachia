import type { TierList } from '@gachia/core';

// P1-25: Add basic tier list data for Wuthering Waves
// These are representative tier lists based on 2026 meta
const tierEntries = [
  // S+ tier - Top performers
  { characterId: 'changli', tier: 'S+', role: 'Main DPS' },
  { characterId: 'sheno', tier: 'S+', role: 'Support' },

  // S tier - Excellent performance
  { characterId: 'jinhsi', tier: 'S', role: 'Main DPS' },
  { characterId: 'jianxin', tier: 'S', role: 'Support' },
  { characterId: 'verina', tier: 'S', role: 'Main DPS' },
  { characterId: 'carl', tier: 'S', role: 'Sustain' },

  // A+ tier - Good performance
  { characterId: 'shyiny', tier: 'A+', role: 'Support' },
  { characterId: 'mounty', tier: 'A+', role: 'Main DPS' },
  { characterId: 'yecodu', tier: 'A+', role: 'Support' },

  // A tier - Situational use
  { characterId: 'jester', tier: 'A', role: 'DPS' },
  { characterId: 'ravenna', tier: 'A', role: 'Support' },
  { characterId: 'huaçuo', tier: 'A', role: 'Controller' },
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

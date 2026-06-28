import type { TierList, TierRank } from '@gachia/core';

// P1-25: Add basic tier list data for Neverness to Everness
// These are representative tier lists based on 2026 early access
const tierEntries: Array<{ characterId: string; tier: TierRank; role: string }> = [
  // S tier - Top performers
  { characterId: 'fadia', tier: 'S', role: 'DPS' },
  { characterId: 'baicang', tier: 'S', role: 'Support' },

  // A tier - Excellent performance
  { characterId: 'hotori', tier: 'A', role: 'Support' },
  { characterId: 'jiuyuan', tier: 'A', role: 'DPS' },
  { characterId: 'skia', tier: 'A', role: 'Controller' },

  // B tier - Good performance
  { characterId: 'edgar', tier: 'B', role: 'Healer' },
  { characterId: 'zero-male', tier: 'B', role: 'DPS' },
  { characterId: 'lotus-mage', tier: 'B', role: 'Support' },

  // C tier - Situational use
  { characterId: 'emma', tier: 'C', role: 'Support' },
  { characterId: 'ring-maid', tier: 'C', role: 'DPS' },
  { characterId: 'specialist', tier: 'C', role: 'Controller' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'nte',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'nte',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'nte',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
];

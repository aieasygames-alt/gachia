import type { TierList } from '@gachia/core';

// P1-25: Add basic tier list data for Neverness to Everness
// These are representative tier lists based on 2026 early access
const tierEntries = [
  // S+ tier - Top performers
  { characterId: 'fadia', tier: 'S+', role: 'DPS' },
  { characterId: 'baicang', tier: 'S+', role: 'Support' },

  // S tier - Excellent performance
  { characterId: 'hotori', tier: 'S', role: 'Support' },
  { characterId: 'jiuyuan', tier: 'S', role: 'DPS' },
  { characterId: 'skia', tier: 'S', role: 'Controller' },

  // A+ tier - Good performance
  { characterId: 'edgar', tier: 'A+', role: 'Healer' },
  { characterId: 'zero-male', tier: 'A+', role: 'DPS' },
  { characterId: 'lotus-mage', tier: 'A+', role: 'Support' },

  // A tier - Situational use
  { characterId: 'emma', tier: 'A', role: 'Support' },
  { characterId: 'ring-maid', tier: 'A', role: 'DPS' },
  { characterId: 'specialist', tier: 'A', role: 'Controller' },
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

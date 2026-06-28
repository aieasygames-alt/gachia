import type { TierList, TierRank } from '@gachia/core';

// P1-25: Add basic tier list data for Honkai: Star Rail
// These are representative tier lists based on 2026 meta
const tierEntries: Array<{ characterId: string; tier: TierRank; role: string }> = [
  // SS tier - Most powerful characters
  { characterId: 'trailblazer', tier: 'SS', role: 'Main DPS' },
  { characterId: 'kafka', tier: 'SS', role: 'Support' },
  { characterId: 'black-swan', tier: 'SS', role: 'Support' },
  { characterId: 'ration', tier: 'SS', role: 'Main DPS' },
  { characterId: 'huohuo', tier: 'SS', role: 'Burst' },

  // S tier - Excellent performance
  { characterId: 'jingliu', tier: 'S', role: 'Main DPS' },
  { characterId: 'asta', tier: 'S', role: 'Support' },
  { characterId: 'bronya', tier: 'S', role: 'Support DPS' },
  { characterId: 'sparkle', tier: 'S', role: 'Support' },
  { characterId: 'acheron', tier: 'S', role: 'Sustain' },
  { characterId: 'yanqing', tier: 'S', role: 'Physical DPS' },

  // A tier - Good performance
  { characterId: 'dr-ratio', tier: 'A', role: 'Support' },
  { characterId: 'huohuo', tier: 'A', role: 'Burst' },
  { characterId: 'peko', tier: 'A', role: 'Support' },
  { characterId: 'gallagher', tier: 'A', role: 'Sustain' },
  { characterId: 'march', tier: 'A', role: 'Burst' },

  // B tier - Situational use
  { characterId: 'pela', tier: 'B', role: 'Support' },
  { characterId: 'qingque', tier: 'B', role: 'Support' },
  { characterId: 'sampo', tier: 'B', role: 'DoT' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'starrail',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'starrail',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'starrail',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
];

import type { TierList } from '@gachia/core';

const tierEntries = [
  // SS
  { characterId: 'captain', tier: 'SS' as const, role: 'DPS' },
  { characterId: 'aileen', tier: 'SS' as const, role: 'Support' },
  { characterId: 'ringo', tier: 'SS' as const, role: 'Buffer' },
  // S
  { characterId: 'seymour', tier: 'S' as const, role: 'Sub-DPS' },
  { characterId: 'taffy', tier: 'S' as const, role: 'DPS' },
  { characterId: 'bansy', tier: 'S' as const, role: 'DPS' },
  // A
  { characterId: 'lykaia', tier: 'A' as const, role: 'Control' },
  { characterId: 'dila', tier: 'A' as const, role: 'Follow-up' },
  { characterId: 'mechanika', tier: 'A' as const, role: 'Sub-DPS' },
  // B
  { characterId: 'alan', tier: 'B' as const, role: 'Buffer' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'ananta',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-05-21',
  },
  {
    gameId: 'ananta',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-05-21',
  },
  {
    gameId: 'ananta',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-05-21',
  },
];

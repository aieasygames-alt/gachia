import type { TierList } from '@gachia/core';

const tierEntries = [
  // SS
  { characterId: 'angelina', tier: 'SS' as const, role: 'Supporter' },
  { characterId: 'surtr', tier: 'SS' as const, role: 'DPS' },
  { characterId: 'saria', tier: 'SS' as const, role: 'Tank/Healer' },
  // S
  { characterId: 'silverash', tier: 'S' as const, role: 'DPS' },
  { characterId: 'exusiai', tier: 'S' as const, role: 'DPS' },
  // A
  { characterId: 'amiya', tier: 'A' as const, role: 'DPS' },
  { characterId: 'texas', tier: 'A' as const, role: 'Vanguard' },
  // B
  { characterId: 'fang', tier: 'B' as const, role: 'Vanguard' },
  { characterId: 'hound', tier: 'B' as const, role: 'Vanguard' },
  { characterId: 'orchid', tier: 'B' as const, role: 'Caster' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'endfield',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-06-06',
  },
  {
    gameId: 'endfield',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-06-06',
  },
  {
    gameId: 'endfield',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-06-06',
  },
];

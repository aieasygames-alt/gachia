import type { TierList } from '@gachia/core';

const tierEntries = [
  // SS
  { characterId: 'traveler', tier: 'SS' as const, role: 'Main DPS' },
  { characterId: 'ais', tier: 'SS' as const, role: 'Sub DPS / Support' },
  { characterId: 'princess', tier: 'SS' as const, role: 'Main DPS' },
  { characterId: 'little-axe', tier: 'SS' as const, role: 'Main DPS' },
  // S
  { characterId: 'omen-eye', tier: 'S' as const, role: 'Survival / Support' },
  { characterId: 'molly', tier: 'S' as const, role: 'Main DPS' },
  { characterId: 'heige', tier: 'S' as const, role: 'Main DPS' },
  { characterId: 'edward', tier: 'S' as const, role: 'Support' },
  { characterId: 'burnt-colonel', tier: 'S' as const, role: 'Main DPS' },
  { characterId: 'gail', tier: 'S' as const, role: 'Support / Survival' },
  // A
  { characterId: 'soscia', tier: 'A' as const, role: 'Main DPS' },
  { characterId: 'ghost-shipwright', tier: 'A' as const, role: 'Sub DPS / Support' },
  { characterId: 'tagalong', tier: 'A' as const, role: 'Main DPS' },
  { characterId: 'haihe', tier: 'A' as const, role: 'Support / Sub DPS' },
  { characterId: 'watchmaker', tier: 'A' as const, role: 'Sub DPS / Support' },
  { characterId: 'iron-commander', tier: 'A' as const, role: 'Survival' },
  // B
  { characterId: 'nonsense-prophet', tier: 'B' as const, role: 'Survival' },
  { characterId: 'coward', tier: 'B' as const, role: 'Survival' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'sea',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-06-11',
  },
  {
    gameId: 'sea',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-06-11',
  },
  {
    gameId: 'sea',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-06-11',
  },
];

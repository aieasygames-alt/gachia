import type { TierList, TierRank } from '@gachia/core';

// P1-25: Add basic tier list data for Genshin Impact
// These are representative tier lists based on 2026 meta
const tierEntries: Array<{ characterId: string; tier: TierRank; role: string }> = [
  // SS tier - Most versatile and powerful characters
  { characterId: 'raidenshogoku', tier: 'SS', role: 'Main DPS' },
  { characterId: 'zhongli', tier: 'SS', role: 'Support DPS' },
  { characterId: 'xiao', tier: 'SS', role: 'Main DPS' },
  { characterId: 'nahida', tier: 'SS', role: 'Support' },
  { characterId: 'kazuha', tier: 'SS', role: 'Sub DPS' },
  { characterId: 'furina', tier: 'SS', role: 'Support' },

  // S tier - Excellent performance
  { characterId: 'alhaitham', tier: 'S', role: 'Main DPS' },
  { characterId: 'yelan', tier: 'S', role: 'Sub DPS' },
  { characterId: 'kokomi', tier: 'S', role: 'Support' },
  { characterId: 'bennett', tier: 'S', role: 'Burst' },
  { characterId: 'ayaka', tier: 'S', role: 'Main DPS' },
  { characterId: 'eula', tier: 'S', role: 'Physical DPS' },

  // A tier - Good performance
  { characterId: 'razor', tier: 'A', role: 'Overworld' },
  { characterId: 'tighnari', tier: 'A', role: 'Main DPS' },
  { characterId: 'wriothesley', tier: 'A', role: 'Main DPS' },
  { characterId: 'navia', tier: 'A', role: 'Physical DPS' },
  { characterId: 'chevreuse', tier: 'A', role: 'Support' },

  // B tier - Situational use
  { characterId: 'xingqiu', tier: 'B', role: 'Exploration' },
  { characterId: 'kaveh', tier: 'B', role: 'Support' },
  { characterId: 'cyno', tier: 'B', role: 'Main DPS' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'genshin',
    category: 'overall',
    locale: 'zh',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'genshin',
    category: 'overall',
    locale: 'en',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
  {
    gameId: 'genshin',
    category: 'overall',
    locale: 'ja',
    entries: tierEntries,
    updatedAt: '2026-06-28',
  },
];

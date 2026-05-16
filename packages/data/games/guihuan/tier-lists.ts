import type { TierList } from '@gachia/core';

const updatedAt = '2025-05-13';

// Placeholder — no characters yet
const characters = {
  overall: {} as const,
} as const;

type TierKey = 'SS' | 'S' | 'A' | 'B';

function buildEntries(category: 'overall'): { characterId: string; tier: TierKey; role?: string }[] {
  const mapping = characters[category];
  const entries: { characterId: string; tier: TierKey; role?: string }[] = [];
  for (const [tier, ids] of Object.entries(mapping) as [TierKey, readonly string[]][]) {
    for (const id of ids) {
      entries.push({ characterId: id, tier });
    }
  }
  return entries;
}

export const tierLists: TierList[] = [
  { gameId: 'guihuan', category: 'overall', locale: 'zh', entries: buildEntries('overall'), updatedAt },
  { gameId: 'guihuan', category: 'overall', locale: 'en', entries: buildEntries('overall'), updatedAt },
  { gameId: 'guihuan', category: 'overall', locale: 'ja', entries: buildEntries('overall'), updatedAt },
];

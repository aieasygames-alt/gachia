import type { TierList } from '@gachia/core';
import { aniimoCharacters } from './characters';

export const tierLists: TierList[] = [
  {
    gameId: 'aniimo',
    category: 'launch-watchlist',
    locale: 'en',
    updatedAt: '2026-08-30',
    entries: aniimoCharacters.map((char) => ({
      characterId: char.id,
      tier: char.tierRank as TierList['entries'][number]['tier'],
      role: char.roleEn,
    })),
  },
];

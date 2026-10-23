import type { TierList } from '@gachia/core';

// Unsupported global ratings are withdrawn; unknown performance is not a B rank.
export const tierLists: TierList[] = (['zh', 'en', 'ja'] as const).map(locale => ({
  gameId: 'roco',
  category: 'overall',
  locale,
  updatedAt: '2026-08-28',
  entries: [],
}));

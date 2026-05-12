import type { TierList } from '@gachia/core';

const updatedAt = '2025-05-13';

const characters = {
  // DPS-focused tier assignments
  dps: {
    SS: ['ellen', 'zhu-yuan', 'miyabi', 'jane'],
    S: ['nekomata', 'grace', 'koleda', 'lighter', 'burnice', 'harumasa', 'evelyn', 'hugo', 'trigger'],
    A: ['billy', 'anton', 'corin', 'soldier-11', 'piper'],
    B: ['anby', 'soukaku', 'seth', 'lucy', 'ben'],
  },
  // Support-focused tier assignments
  support: {
    SS: ['astra', 'qingyi', 'caesar'],
    S: ['rina', 'nicole', 'lycaon', 'trigger'],
    A: ['anby', 'soukaku', 'seth', 'lucy', 'grace', 'koleda', 'piper', 'pulchra'],
    B: ['ben', 'anton', 'billy', 'corin'],
  },
  // Overall tier assignments
  overall: {
    SS: ['ellen', 'zhu-yuan', 'miyabi', 'astra', 'qingyi', 'jane'],
    S: ['nekomata', 'lycaon', 'grace', 'koleda', 'caesar', 'lighter', 'burnice', 'harumasa', 'evelyn', 'hugo', 'rina', 'trigger'],
    A: ['anby', 'nicole', 'billy', 'soukaku', 'soldier-11', 'seth', 'anton', 'corin', 'lucy', 'piper', 'pulchra'],
    B: ['ben'],
  },
} as const;

type TierKey = 'SS' | 'S' | 'A' | 'B';

function buildEntries(category: 'dps' | 'support' | 'overall') {
  const mapping = characters[category];
  const entries: { characterId: string; tier: TierKey; role?: string }[] = [];
  for (const [tier, ids] of Object.entries(mapping) as [TierKey, readonly string[]][]) {
    for (const id of ids) {
      entries.push({
        characterId: id,
        tier,
        role: category === 'dps' ? 'DPS' : category === 'support' ? 'Support' : undefined,
      });
    }
  }
  return entries;
}

export const tierLists: TierList[] = [
  // --- DPS ---
  { gameId: 'zzz', category: 'dps', locale: 'zh', entries: buildEntries('dps'), updatedAt },
  { gameId: 'zzz', category: 'dps', locale: 'en', entries: buildEntries('dps'), updatedAt },
  { gameId: 'zzz', category: 'dps', locale: 'ja', entries: buildEntries('dps'), updatedAt },

  // --- Support ---
  { gameId: 'zzz', category: 'support', locale: 'zh', entries: buildEntries('support'), updatedAt },
  { gameId: 'zzz', category: 'support', locale: 'en', entries: buildEntries('support'), updatedAt },
  { gameId: 'zzz', category: 'support', locale: 'ja', entries: buildEntries('support'), updatedAt },

  // --- Overall ---
  { gameId: 'zzz', category: 'overall', locale: 'zh', entries: buildEntries('overall'), updatedAt },
  { gameId: 'zzz', category: 'overall', locale: 'en', entries: buildEntries('overall'), updatedAt },
  { gameId: 'zzz', category: 'overall', locale: 'ja', entries: buildEntries('overall'), updatedAt },
];

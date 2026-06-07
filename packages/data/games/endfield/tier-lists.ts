import type { TierList } from '@gachia/core';

const tierEntries = [
  // SS
  { characterId: 'endministrator', tier: 'SS' as const, role: 'Guard' },
  { characterId: 'mi-fu', tier: 'SS' as const, role: 'Guard' },
  { characterId: 'ember', tier: 'SS' as const, role: 'Defender' },
  { characterId: 'ardelia', tier: 'SS' as const, role: 'Supporter' },
  { characterId: 'tangtang', tier: 'SS' as const, role: 'Caster' },
  { characterId: 'laevatain', tier: 'SS' as const, role: 'Striker' },
  // S
  { characterId: 'lifeng', tier: 'S' as const, role: 'Guard' },
  { characterId: 'rossi', tier: 'S' as const, role: 'Guard' },
  { characterId: 'gilberta', tier: 'S' as const, role: 'Supporter' },
  { characterId: 'last-rite', tier: 'S' as const, role: 'Striker' },
  { characterId: 'yvonne', tier: 'S' as const, role: 'Striker' },
  { characterId: 'zhuang-fangyi', tier: 'S' as const, role: 'Striker' },
  { characterId: 'pogranichnik', tier: 'S' as const, role: 'Vanguard' },
  // A
  { characterId: 'chen-qianyu', tier: 'A' as const, role: 'Guard' },
  { characterId: 'snowshine', tier: 'A' as const, role: 'Defender' },
  { characterId: 'xaihi', tier: 'A' as const, role: 'Supporter' },
  { characterId: 'perlica', tier: 'A' as const, role: 'Caster' },
  { characterId: 'wulfgard', tier: 'A' as const, role: 'Caster' },
  { characterId: 'avywenna', tier: 'A' as const, role: 'Striker' },
  { characterId: 'da-pan', tier: 'A' as const, role: 'Striker' },
  { characterId: 'camille', tier: 'A' as const, role: 'Vanguard' },
  { characterId: 'arclight', tier: 'A' as const, role: 'Vanguard' },
  // B
  { characterId: 'alesh', tier: 'B' as const, role: 'Vanguard' },
  { characterId: 'estella', tier: 'B' as const, role: 'Guard' },
  { characterId: 'catcher', tier: 'B' as const, role: 'Defender' },
  { characterId: 'antal', tier: 'B' as const, role: 'Supporter' },
  { characterId: 'fluorite', tier: 'B' as const, role: 'Caster' },
  { characterId: 'akekuri', tier: 'B' as const, role: 'Vanguard' },
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

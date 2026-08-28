import type { TierList } from '@gachia/core';

// 节奏榜（精灵强度榜）— 国际服（roco）早测阵容仅 6 只，数据为准。
// 御三家（meewee/sparka/cerulla）与国服同 creatures，沿用 A 级；
// 其余早测野外宠（blazehound/catapawn/dustler）强度暂定 B，待社区天梯数据补充。
// 国际服技能/种族值官方仍 TBA，本榜为养成参考的初步分级。

type RocoTierRow = { id: string; tier: 'SS' | 'S' | 'A' | 'B' | 'C' | 'D'; roleZh: string; roleEn: string };

const ROCO_TIER: RocoTierRow[] = [
  { id: 'meewee', tier: 'A', roleZh: '坦克/续航', roleEn: 'Tank' },
  { id: 'sparka', tier: 'A', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'cerulla', tier: 'A', roleZh: '魔法输出', roleEn: 'Magic DPS' },
  { id: 'blazehound', tier: 'B', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'catapawn', tier: 'B', roleZh: '坦克', roleEn: 'Tank' },
  { id: 'dustler', tier: 'B', roleZh: '辅助', roleEn: 'Support' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'roco',
    category: 'overall',
    locale: 'zh',
    updatedAt: '2026-08-28',
    entries: ROCO_TIER.map((e) => ({ characterId: e.id, tier: e.tier, role: e.roleZh })),
  },
  {
    gameId: 'roco',
    category: 'overall',
    locale: 'en',
    updatedAt: '2026-08-28',
    entries: ROCO_TIER.map((e) => ({ characterId: e.id, tier: e.tier, role: e.roleEn })),
  },
  {
    gameId: 'roco',
    category: 'overall',
    locale: 'ja',
    updatedAt: '2026-08-28',
    entries: ROCO_TIER.map((e) => ({ characterId: e.id, tier: e.tier, role: e.roleEn })),
  },
];

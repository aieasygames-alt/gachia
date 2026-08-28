import type { TierList } from '@gachia/core';

// 节奏榜（精灵强度榜）基于社区共识整理：B站/贴吧/NGA/17173/九游等 PVP 天梯与 PVE 综合榜。
// 分级映射：T0→SS，T1→S，T2→A，T3→B。updatedAt 为榜单整理日期。
// bushishi 暂无社区强度评价，未纳入榜单。数据仅供养成参考，随版本迭代。

type RocoCnTierRow = { id: string; tier: 'SS' | 'S' | 'A' | 'B' | 'C' | 'D'; roleZh: string; roleEn: string };

const ROCO_CN_TIER: RocoCnTierRow[] = [
  { id: 'dimo', tier: 'SS', roleZh: '魔法输出', roleEn: 'Magic DPS' },
  { id: 'huohua', tier: 'A', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'shuilanlan', tier: 'A', roleZh: '魔法输出', roleEn: 'Magic DPS' },
  { id: 'miaomiao', tier: 'A', roleZh: '坦克/续航', roleEn: 'Tank' },
  { id: 'huangjia-shijiu', tier: 'S', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'luoyin', tier: 'SS', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'xuewawa', tier: 'A', roleZh: '控制/魔法输出', roleEn: 'Control' },
  { id: 'youguang-rongrong', tier: 'SS', roleZh: '控制/辅助', roleEn: 'Control' },
  { id: 'huoshen', tier: 'S', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'liehuozhanshen', tier: 'S', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'shuiling', tier: 'S', roleZh: '魔法输出', roleEn: 'Magic DPS' },
  { id: 'shengshuishouhu', tier: 'SS', roleZh: '魔法输出/控制', roleEn: 'Magic DPS' },
  { id: 'molimao', tier: 'A', roleZh: '坦克/辅助', roleEn: 'Tank' },
  { id: 'yinsuquan', tier: 'A', roleZh: '物理输出/速攻', roleEn: 'Physical DPS' },
  { id: 'abu', tier: 'S', roleZh: '物理/魔法输出', roleEn: 'Physical DPS' },
  { id: 'kula', tier: 'S', roleZh: '魔法输出/对策', roleEn: 'Magic DPS' },
  { id: 'lanniao', tier: 'S', roleZh: '物理输出/速攻', roleEn: 'Physical DPS' },
  { id: 'baijindujiaoshou', tier: 'S', roleZh: '魔法输出', roleEn: 'Magic DPS' },
  { id: 'xueling', tier: 'S', roleZh: '控制/魔法输出', roleEn: 'Control' },
  { id: 'amiying', tier: 'B', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'bingfengyuanling', tier: 'B', roleZh: '控制', roleEn: 'Control' },
  { id: 'emolang', tier: 'B', roleZh: '物理输出', roleEn: 'Physical DPS' },
  { id: 'boduoxi', tier: 'A', roleZh: '坦克', roleEn: 'Tank' },
  { id: 'gongpingge', tier: 'A', roleZh: '辅助/控制', roleEn: 'Support' },
];

export const tierLists: TierList[] = [
  {
    gameId: 'roco-cn',
    category: 'overall',
    locale: 'zh',
    updatedAt: '2026-08-28',
    entries: ROCO_CN_TIER.map((e) => ({ characterId: e.id, tier: e.tier, role: e.roleZh })),
  },
  {
    gameId: 'roco-cn',
    category: 'overall',
    locale: 'en',
    updatedAt: '2026-08-28',
    entries: ROCO_CN_TIER.map((e) => ({ characterId: e.id, tier: e.tier, role: e.roleEn })),
  },
  {
    gameId: 'roco-cn',
    category: 'overall',
    locale: 'ja',
    updatedAt: '2026-08-28',
    entries: ROCO_CN_TIER.map((e) => ({ characterId: e.id, tier: e.tier, role: e.roleEn })),
  },
];

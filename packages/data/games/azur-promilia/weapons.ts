import type { Weapon } from '@gachia/core';

export const weapons: Weapon[] = [];

export const weaponSystemReference = {
  source: {
    name: 'GameWith Azur Promilia Beginner Guide',
    url: 'https://gamewith.ai/azurpromilia/en/beginner-guide',
    checkedAt: '2026-09-10',
    version: 'CBT/Beta',
  },
  types: ['sword', 'bow', 'staff', 'lance', 'hammer'],
  equipmentSlots: ['weapon', 'chestpiece', 'leggings', 'ring', 'earring', 'stellar-essence'],
  acquisition: ['farm-crafting', 'workshop-crafting', 'gacha-reference'],
  craftingFacilities: ['weapon-workbench', 'armor-workbench', 'leather-stand', 'spinning-wheel', 'crafting-workshop', 'weapon-workshop', 'armor-workshop'],
  notes: {
    zh: 'CBT 资料显示武器不改变角色外观，并与农场、工坊和抽取系统有关；逐件武器名称、属性、概率和正式获取方式仍待确认。',
    en: 'CBT references indicate that weapons do not change character appearance and are connected to farms, workshops, and a gacha system. Individual names, stats, rates, and release acquisition methods remain unverified.',
    ja: 'CBT資料では武器はキャラクターの外見を変えず、ファーム、工房、ガチャ系システムに関係します。個別名称、属性、確率、正式入手方法は未確認です。',
  },
} as const;

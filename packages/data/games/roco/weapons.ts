import type { Weapon, SupportedLocale } from '@gachia/core';
import { IMAGE_BASE } from '../../image-base';
import { localeStr } from './types';

// 洛克王国：世界没有传统数值武器，玩家使用的是「法杖（魔法杖）」——
// 这是外观/特效武器（cosmetic staff），不同法杖改变施法特效与变身表现，不携带攻击力成长。
// 以下数据来自社区整理（GameMale 论坛国服已推出法杖清单），如实建模，未编造任何数值。
// 国际服与国服共享同一套法杖外观系统，故复用同一清单。

export interface RocoWeapon {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  weaponType: string;
  rarity: number;
  effectName: string;
  effectNameEn: string;
  effectDescription: string;
  effectDescriptionEn: string;
  source: string;
  sourceEn: string;
}

export const rocoWeapons: RocoWeapon[] = [
  {
    id: 'huanxing-xingguang',
    name: '幻影星光法杖',
    nameEn: 'Phantom Starlight Staff',
    weaponType: 'staff',
    rarity: 5,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: 'S1 赛季战令限定法杖。挥舞时召唤蓝色小星星环绕，命中敌人触发黑洞吸附效果。',
    effectDescriptionEn: 'S1 battle-pass staff. Conjures blue starlight orbs and applies a black-hole pull effect on hit.',
    source: 'S1 赛季战令限定',
    sourceEn: 'S1 Battle Pass exclusive',
  },
  {
    id: 'tonghuashu',
    name: '童话书主题法杖',
    nameEn: 'Fairy Tale Book Staff',
    weaponType: 'staff',
    rarity: 4,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '治愈童话书活动附赠法杖。星星魔法击中后化作小蝴蝶飘散。',
    effectDescriptionEn: 'Gift from the Fairy Tale Book event. Star magic scatters into fluttering butterflies on hit.',
    source: '治愈童话书活动附赠',
    sourceEn: 'Fairy Tale Book event gift',
  },
  {
    id: 'lianjinshu',
    name: '炼金术主题法杖',
    nameEn: 'Alchemy Staff',
    weaponType: 'staff',
    rarity: 4,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '嘭！炼金药剂活动附赠法杖，拥有御三家同款变身特效，可化身嘟嘟锅、翡翠水母和菇菇丁。',
    effectDescriptionEn: 'Gift from the Alchemy event. Grants the same transformation effect as the starter sprites — turn into Duduguo, Emerald Jelly, or Guguoding.',
    source: '炼金药剂活动附赠',
    sourceEn: 'Alchemy event gift',
  },
  {
    id: 'shenhai-kuizeng',
    name: '深海馈赠主题法杖',
    nameEn: 'Deep Sea Gift Staff',
    weaponType: 'staff',
    rarity: 4,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '深海的馈赠活动附赠法杖，留痕魔法在地面留下专属背景。',
    effectDescriptionEn: 'Gift from the Deep Sea Gift event. Trail magic leaves a unique background pattern on the ground.',
    source: '深海的馈赠活动附赠',
    sourceEn: 'Deep Sea Gift event gift',
  },
  {
    id: 'bilu-huoban',
    name: '壁炉伙伴主题法杖',
    nameEn: 'Hearth Partner Staff',
    weaponType: 'staff',
    rarity: 3,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '免费赠送法杖。创造魔法造物时会变为金色外观。',
    effectDescriptionEn: 'Free gift staff. Creation magic constructs turn golden in appearance.',
    source: '免费赠送',
    sourceEn: 'Free gift',
  },
  {
    id: 'jufeng-xingji',
    name: '飓风行迹法杖',
    nameEn: 'Hurricane Trace Staff',
    weaponType: 'staff',
    rarity: 5,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: 'S2 赛季战令限定法杖，增强风魔法视觉效果与表现。',
    effectDescriptionEn: 'S2 battle-pass staff. Enhances wind-magic visuals and presence.',
    source: 'S2 赛季战令限定',
    sourceEn: 'S2 Battle Pass exclusive',
  },
  {
    id: 'xingluo-fanhua',
    name: '星落繁花法杖',
    nameEn: 'Starfall Blossom Staff',
    weaponType: 'staff',
    rarity: 5,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: 'S3 赛季战令限定法杖，星星魔法更加闪耀华丽。',
    effectDescriptionEn: 'S3 battle-pass staff. Star magic becomes even more dazzling and ornate.',
    source: 'S3 赛季战令限定',
    sourceEn: 'S3 Battle Pass exclusive',
  },
  {
    id: 'mimi-qianru',
    name: '秘密潜入主题法杖',
    nameEn: 'Secret Infiltration Staff',
    weaponType: 'staff',
    rarity: 4,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '秘密潜入计划活动附赠法杖，拥有特别炫酷的留影魔法。',
    effectDescriptionEn: 'Gift from the Secret Infiltration event. Features a cool signature afterimage magic.',
    source: '秘密潜入计划附赠',
    sourceEn: 'Secret Infiltration event gift',
  },
  {
    id: 'chuxinzhe',
    name: '初心者主题法杖',
    nameEn: 'Beginner Staff',
    weaponType: 'staff',
    rarity: 4,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '初心者活动附赠法杖，拥有御三家变身特效（社区公认最重量级外观）。',
    effectDescriptionEn: 'Gift from the Beginner event. Grants starter-sprite transformation effect (a community fan-favorite look).',
    source: '初心者活动附赠',
    sourceEn: 'Beginner event gift',
  },
  {
    id: 'mengjing-liulangzhe',
    name: '梦境流浪者主题法杖',
    nameEn: 'Dream Wanderer Staff',
    weaponType: 'staff',
    rarity: 4,
    effectName: '特效',
    effectNameEn: 'Effect',
    effectDescription: '梦境流浪者活动附赠法杖，星星魔法击中小洛克时附带眩晕特效。',
    effectDescriptionEn: 'Gift from the Dream Wanderer event. Star magic staggers nearby sprites on hit.',
    source: '梦境流浪者活动附赠',
    sourceEn: 'Dream Wanderer event gift',
  },
];

export function getRocoWeaponName(weapon: RocoWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.name, weapon.nameEn, locale, weapon.nameJa);
}

export function getRocoWeaponById(id: string): RocoWeapon | undefined {
  return rocoWeapons.find((w) => w.id === id);
}

export function getRocoWeaponEffect(weapon: RocoWeapon, locale: SupportedLocale): { name: string; description: string } {
  return {
    name: localeStr(weapon.effectName, weapon.effectNameEn, locale),
    description: localeStr(weapon.effectDescription, weapon.effectDescriptionEn, locale),
  };
}

export function getRocoWeaponSource(weapon: RocoWeapon, locale: SupportedLocale): string {
  return localeStr(weapon.source, weapon.sourceEn, locale);
}

export const weapons: Weapon[] = rocoWeapons.map((w) => ({
  id: w.id,
  gameId: 'roco' as const,
  name: { zh: w.name, en: w.nameEn, ja: w.nameJa ?? w.nameEn },
  rarity: w.rarity,
  weaponType: w.weaponType,
  description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  images: { icon: `${IMAGE_BASE}/images/roco/weapons/${w.id}.webp` },
  stats: { baseAtk: [] },
  passive: {
    name: { zh: w.effectName, en: w.effectNameEn, ja: w.effectNameEn },
    description: { zh: w.effectDescription, en: w.effectDescriptionEn, ja: w.effectDescriptionEn },
  },
  ascensionMaterials: [],
}));

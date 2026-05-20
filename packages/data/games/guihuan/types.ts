import type { SupportedLocale } from '@gachia/core';

// --- Character Types ---

export interface GuihuanSkillBase {
  name: string;
  nameEn: string;
  nameJa?: string;
  description: string;
  descriptionEn: string;
}

export interface GuihuanActiveSkill extends GuihuanSkillBase {
  cooldown?: string;
  cost?: string;
}

export interface GuihuanSkillSet {
  normalAttack: GuihuanSkillBase;
  skill: GuihuanActiveSkill;
  ultimate: GuihuanActiveSkill;
  passive: GuihuanSkillBase;
  additionalPassives?: GuihuanSkillBase[];
}

export interface GuihuanFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface GuihuanTeamComp {
  name: string;
  nameEn: string;
  members: string[];
  description: string;
  descriptionEn: string;
}

export interface GuihuanRecommendedBuild {
  bestWeapon: string;
  bestWeaponEn: string;
  alternativeWeapons: string[];
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

export interface GuihuanCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  elementEn: string;
  role: string;
  roleEn: string;
  weaponType?: string;
  rarity: number;
  description: string;
  descriptionEn: string;
  faq: GuihuanFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  skills: GuihuanSkillSet;
  recommendedBuild: GuihuanRecommendedBuild;
  teamComps: GuihuanTeamComp[];
  image: string;
  availableAtLaunch: boolean;
  status: string;
}

// --- Weapon Types ---

export interface GuihuanWeapon {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  rarity: number;
  weaponType: string;
  weaponTypeEn: string;
  baseAtk: number;
  substat: string;
  substatEn: string;
  substatValue: string;
  effectName: string;
  effectNameEn: string;
  effectDescription: string;
  effectDescriptionEn: string;
  howToObtain: string;
  howToObtainEn: string;
  status: string;
}

// --- Material Types ---

export interface GuihuanMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
}

// --- Character Materials Types ---

export interface GuihuanMaterialEntry {
  id?: string;
  quantity: number;
}

export interface GuihuanAscensionLevel {
  levelRange: string;
  materials: GuihuanMaterialEntry[];
}

export interface GuihuanTalentLevel {
  talentLevel: string;
  materials: GuihuanMaterialEntry[];
}

export interface GuihuanCharacterMaterials {
  characterId: string;
  ascensionMaterials: GuihuanAscensionLevel[];
  talentMaterials: GuihuanTalentLevel[];
}

// --- Region Types ---

export interface GuihuanRegion {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  highlights: string[];
  specialties: string[];
  bosses: string[];
  domains: string[];
  tips: string[];
  teleporters: number;
  statues: number;
  oculi: number;
}

// --- Accessor Helpers ---

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

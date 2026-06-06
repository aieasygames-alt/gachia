import type { SupportedLocale } from '@gachia/core';

export interface EndfieldSkillBase {
  name: string;
  nameEn: string;
  nameJa?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
}

export interface EndfieldActiveSkill extends EndfieldSkillBase {
  cooldown?: string;
  cost?: string;
}

export interface EndfieldSkillSet {
  normalAttack: EndfieldSkillBase;
  skill: EndfieldActiveSkill;
  ultimate: EndfieldActiveSkill;
  passive: EndfieldSkillBase;
  additionalPassives?: EndfieldSkillBase[];
}

export interface EndfieldFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface EndfieldTeamComp {
  name: string;
  nameEn: string;
  members: string[];
  description: string;
  descriptionEn: string;
}

export interface EndfieldRecommendedBuild {
  bestWeapon: string;
  bestWeaponEn: string;
  alternativeWeapons: string[];
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

export interface EndfieldCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  elementEn: string;
  profession: string;
  professionEn: string;
  weaponType?: string;
  rarity: number;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
  faq: EndfieldFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  skills: EndfieldSkillSet;
  recommendedBuild: EndfieldRecommendedBuild;
  teamComps: EndfieldTeamComp[];
  image: string;
  availableAtLaunch: boolean;
  status: string;
}

export interface EndfieldWeapon {
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

export interface EndfieldMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
}

export interface EndfieldMaterialEntry {
  materialId: string;
  quantity: number;
}

export interface EndfieldAscensionLevel {
  level: number;
  materials: EndfieldMaterialEntry[];
}

export interface EndfieldTalentLevel {
  talentLevel: string;
  materials: EndfieldMaterialEntry[];
}

export interface EndfieldCharacterMaterials {
  characterId: string;
  ascensionMaterials: EndfieldAscensionLevel[];
  talentMaterials: EndfieldTalentLevel[];
}

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

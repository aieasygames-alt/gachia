import type { SupportedLocale } from '@gachia/core';

// --- Skill Types ---

export interface GenshinSkillBase {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

export interface GenshinActiveSkill extends GenshinSkillBase {
  cooldown?: string;
  cost?: number;
}

export interface GenshinSkillSet {
  normalAttack: GenshinSkillBase;
  elementalSkill: GenshinActiveSkill;
  elementalBurst: GenshinActiveSkill;
  passive1: GenshinSkillBase;
  passive2: GenshinSkillBase;
  passive4?: GenshinSkillBase;
}

// --- Constellation ---

export interface GenshinConstellation {
  level: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

// --- FAQ ---

export interface GenshinFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

// --- Team Comp ---

export interface GenshinTeamComp {
  name: string;
  nameEn: string;
  members: string[];
  description: string;
  descriptionEn: string;
}

// --- Recommended Build ---

export interface GenshinRecommendedBuild {
  bestWeapon: string;
  bestWeaponEn: string;
  alternativeWeapons: string[];
  bestArtifactSet: string;
  bestArtifactSetEn: string;
  alternativeArtifactSet?: string;
  alternativeArtifactSetEn?: string;
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

// --- Character ---

export interface GenshinCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  weaponType: string;
  rarity: 4 | 5;
  region: string;
  description: string;
  descriptionEn: string;
  releaseVersion: string;
  acquisitionMethod: string;
  status: string;
  image: string;
  skills: GenshinSkillSet;
  constellations: GenshinConstellation[];
  recommendedBuild: GenshinRecommendedBuild;
  teamComps: GenshinTeamComp[];
  faq: GenshinFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  cvZh?: string;
  cvJp?: string;
  cvEn?: string;
}

// --- Weapon ---

export interface GenshinWeapon {
  id: string;
  name: string;
  nameEn: string;
  rarity: 3 | 4 | 5;
  weaponType: string;
  baseAtk: number;
  subStat: string;
  subStatValue: string;
  effectName: string;
  effectNameEn: string;
  effectDescription: string;
  effectDescriptionEn: string;
  howToObtain: string;
  howToObtainZh: string;
  howToObtainEn: string;
  signatureCharacter?: string;
  status: string;
}

// --- Material ---

export interface GenshinMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
}

// --- Artifact Set ---

export interface GenshinArtifactSet {
  id: string;
  name: string;
  nameEn: string;
  rarity: number;
  bonus2pc: string;
  bonus2pcEn: string;
  bonus4pc: string;
  bonus4pcEn: string;
  bestFor: string[];
  characters: string[];
}

// --- Character Materials ---

export interface GenshinCharacterMaterials {
  characterId: string;
  ascensionMaterials: Array<{
    levelRange: string;
    materials: Array<{ id: string; quantity: number }>;
  }>;
  talentMaterials: Array<{
    talentLevel: string;
    materials: Array<{ id: string; quantity: number }>;
  }>;
}

// --- Locale Helper ---

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

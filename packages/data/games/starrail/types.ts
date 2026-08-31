import type { SupportedLocale } from '@gachia/core';

// --- Skill Types ---

export interface StarRailSkillBase {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

export interface StarRailActiveSkill extends StarRailSkillBase {
  cooldown?: string;
  cost?: number;
}

export interface StarRailSkillSet {
  basicAtk: StarRailSkillBase;
  skill: StarRailActiveSkill;
  ultimate: StarRailActiveSkill;
  talent: StarRailSkillBase;
  technique: StarRailSkillBase;
}

// --- Eidolon ---

export interface StarRailEidolon {
  level: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

// --- FAQ ---

export interface StarRailFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

// --- Team Comp ---

export interface StarRailTeamComp {
  name: string;
  nameEn: string;
  members: string[];
  description: string;
  descriptionEn: string;
}

// --- Recommended Build ---

export interface StarRailRecommendedBuild {
  bestLightCone: string;
  bestLightConeEn: string;
  alternativeLightCones: string[];
  bestRelicSet: string;
  bestRelicSetEn: string;
  bestPlanarOrnament: string;
  bestPlanarOrnamentEn: string;
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

// --- Character ---

export interface StarRailCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  path: string;
  rarity: 4 | 5;
  description: string;
  descriptionEn: string;
  releaseVersion: string;
  acquisitionMethod: string;
  status: string;
  image: string;
  skills: StarRailSkillSet;
  eidolons: StarRailEidolon[];
  recommendedBuild: StarRailRecommendedBuild;
  teamComps: StarRailTeamComp[];
  faq: StarRailFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  cvZh?: string;
  cvJp?: string;
  cvEn?: string;
}

// --- Light Cone ---

export interface StarRailLightCone {
  id: string;
  name: string;
  nameEn: string;
  rarity: 3 | 4 | 5;
  path: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
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

export interface StarRailMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
}

// --- Relic Set ---

export interface StarRailRelicSet {
  id: string;
  name: string;
  nameEn: string;
  type: 'cavern' | 'planar';
  bonus2pc: string;
  bonus2pcEn: string;
  bonus4pc?: string;
  bonus4pcEn?: string;
  bestFor: string[];
}

// --- Character Materials ---

export interface StarRailCharacterMaterials {
  characterId: string;
  ascensionMaterials: Array<{
    levelRange: string;
    materials: Array<{ id: string; quantity: number }>;
  }>;
  traceMaterials: Array<{
    traceLevel: string;
    materials: Array<{ id: string; quantity: number }>;
  }>;
}

// --- Region ---

export interface StarRailRegion {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
  highlights: string[];
  specialties: string[];
  bosses: string[];
  domains: string[];
  tips: string[];
  spaceAnchors: number;
  calyxes: number;
  echoesOfWar: number;
}

// --- Locale Helper ---

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

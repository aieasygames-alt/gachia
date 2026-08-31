import type { SupportedLocale } from '@gachia/core';

// --- Skill Types ---

export interface ZzzSkillBase {
  name: string;
  nameEn: string;
  nameJa?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
}

export interface ZzzActiveSkill extends ZzzSkillBase {
  cooldown?: string;
  cost?: string;
}

export interface ZzzSkillSet {
  normalAttack: ZzzSkillBase;
  dodge: ZzzSkillBase;
  assist: ZzzSkillBase;
  special: ZzzActiveSkill;
  ultimate: ZzzActiveSkill;
  chain: ZzzSkillBase;
  corePassive: ZzzSkillBase;
  additionalPassives?: ZzzSkillBase[];
}

// --- Character Types ---

export interface ZzzFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface ZzzTeamComp {
  name: string;
  nameEn: string;
  nameJa?: string;
  members: string[];
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
}

export interface ZzzRecommendedBuild {
  bestWeapon: string;
  bestWeaponEn: string;
  alternativeWeapons: string[];
  bestDriveDisc: string;
  bestDriveDiscEn: string;
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

export interface ZzzCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  attribute: string;
  attributeJa?: string;
  specialty: string;
  specialtyEn: string;
  specialtyJa?: string;
  rank: 'S' | 'A';
  faction: string;
  factionEn: string;
  factionJa?: string;
  attackType: string;
  attackTypeEn: string;
  attackTypeJa?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
  faq: ZzzFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  tierReasonJa?: string;
  skills: ZzzSkillSet;
  recommendedBuild: ZzzRecommendedBuild;
  teamComps: ZzzTeamComp[];
  image: string;
  availableAtLaunch: boolean;
  acquisitionMethod: string;
  status: string;
  cvZh?: string;
  cvJp?: string;
  cvEn?: string;
  mindscapeCinema?: ZzzMindscapeCinema[];
}

export interface ZzzMindscapeCinema {
  level: number;
  name: string;
  nameEn: string;
  nameJa?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
}

// --- Weapon Types (W-Engines) ---

export interface ZzzWeapon {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  rank: 'S' | 'A' | 'B';
  specialty: string;
  specialtyEn: string;
  baseAtk: number;
  substat: string;
  substatEn: string;
  substatValue: string;
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

// --- Material Types ---

export interface ZzzMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
}

// --- Drive Disc Types ---

export interface ZzzDriveDisc {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  category: string;
  element: string | null;
  pieces: number;
  setDescription2pc: string;
  setDescription2pcEn: string;
  setDescription4pc: string;
  setDescription4pcEn: string;
  bestFor: string[];
  characters: string[];
  image: string;
}

// --- Accessor Helpers ---

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

import type { SupportedLocale } from '@gachia/core';

// --- Skill Types ---

export interface NteSkillBase {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

export interface NteActiveSkill extends NteSkillBase {
  cooldown?: string;
  cost?: string;
}

export interface NteSkillSet {
  normalAttack: NteSkillBase;
  skill: NteActiveSkill;
  ultimate: NteActiveSkill;
  passives: NteSkillBase[];
  qte?: Partial<NteSkillBase>;
  resonance?: Array<Partial<NteSkillBase> & { awakenReq: number }>;
  awakening?: Array<Partial<NteSkillBase> & { level: number }>;
}

// --- Character Types ---

export interface NteFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface NteTeamComp {
  name: string;
  nameEn: string;
  members: string[];
  description: string;
  descriptionEn: string;
}

export interface NteRecommendedBuild {
  bestWeapon: string;
  bestWeaponEn: string;
  alternativeWeapons: string[];
  bestDiskSet: string;
  bestDiskSetEn: string;
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

export interface NteCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameTw?: string;
  attribute: string;
  rank: 'S' | 'A';
  weapon: string;
  weaponEn: string;
  role: string;
  roleEn: string;
  faction: string;
  description: string;
  descriptionEn: string;
  faq: NteFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  skills: NteSkillSet;
  recommendedBuild: NteRecommendedBuild;
  teamComps: NteTeamComp[];
  image: string;
  availableAtLaunch: boolean;
  acquisitionMethod: string;
  status: string;
  cvZh?: string;
  cvJp?: string;
  cvJpEn?: string;
  cvEn?: string;
  arcType?: string;
  signatureArc?: string;
}

// --- Weapon Types ---

export interface NteWeapon {
  id: string;
  name: string;
  nameTw?: string;
  nameEn: string;
  rank: 'S' | 'A' | 'B';
  type: string;
  baseAtk: number;
  substat: string;
  substatValue: string;
  effectName: string;
  effectNameTw?: string;
  effectNameEn: string;
  effectDescription: string;
  effectDescriptionTw?: string;
  effectDescriptionEn: string;
  howToObtain: string;
  howToObtainZh: string;
  howToObtainEn: string;
  signatureCharacter?: string;
  status: string;
}

// --- Material Types ---

export interface NteMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
}

// --- Character Materials ---

export interface NteCharacterMaterials {
  characterId: string;
  levelingMaterials: Array<{
    levelRange: string;
    materials: Array<{ id: string; quantity: number }>;
  }>;
  skillMaterials: Array<{ id: string; quantity: number }>;
}

// --- Disk Set Types ---

export interface NteDiskSet {
  id: string;
  name: string;
  nameTw?: string;
  nameEn: string;
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

// --- Build Types ---

export interface NteBuild {
  characterId: string;
  builds: Array<{
    id: string;
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
    mainStat: string;
    mainStatEn: string;
    subStats: string[];
    subStatsEn: string[];
    recommendedWeapons: string[];
    teamComp: string[];
    notes: string;
    notesEn: string;
  }>;
}

// --- Accessor Helpers ---

export function localeStr(zh: string, en: string, locale: SupportedLocale): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return en; // ja falls back to en
  return zh;
}

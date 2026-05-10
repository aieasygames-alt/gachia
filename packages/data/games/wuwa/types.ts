import type { SupportedLocale } from '@gachia/core';

// --- Skill Types ---

export interface WuWaSkillBase {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

export interface WuWaActiveSkill extends WuWaSkillBase {
  cooldown?: string;
  cost?: number;
}

export interface WuWaSkillSet {
  basicAtk: WuWaSkillBase;
  resonanceSkill: WuWaActiveSkill;
  resonanceLiberation: WuWaActiveSkill;
  forteCircuit: WuWaSkillBase;
  introSkill: WuWaSkillBase;
  outroSkill: WuWaSkillBase;
}

// --- Sequence (Dupes) ---

export interface WuWaSequence {
  level: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

// --- Character ---

export interface WuWaCharacter {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  weaponType: string;
  rarity: 4 | 5;
  description: string;
  descriptionEn: string;
  releaseVersion: string;
  status: string;
  image: string;
  tierRank?: string;
  stats: {
    hp: number;
    atk: number;
    def: number;
    energy: number;
    critRate: number;
    critDmg: number;
  };
  ascensionMaterials: {
    commonDrop: string;
    boss: string;
    localSpecialty: string;
  };
  skillMaterials: {
    commonDrop: string;
    weeklyBoss: string;
  };
  skills?: WuWaSkillSet;
  sequences?: WuWaSequence[];
  minorFortes?: { stat: string; value: string }[];
  voiceActors?: {
    en?: string;
    jp?: string;
    cn?: string;
    kr?: string;
  };
}

// --- Weapon ---

export interface WuWaWeapon {
  id: string;
  name: string;
  nameEn: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  weaponType: string;
  baseAtk: number;
  subStat?: { name: string; value: string };
  passiveName?: string;
  passiveDescription?: string;
  signatureCharacter?: string;
}

// --- Item / Material ---

export interface WuWaMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
}

// --- Echo Set (Sonata Effect) ---

export interface WuWaEchoSet {
  id: string;
  name: string;       // Chinese name
  nameEn: string;     // English name
  bonus2pc: string;    // Chinese 2-piece bonus
  bonus2pcEn: string;  // English 2-piece bonus
  bonus5pc?: string;   // Chinese 5-piece bonus (optional)
  bonus5pcEn?: string; // English 5-piece bonus (optional)
  bestFor: string[];   // character IDs this set is recommended for
}

// --- Locale Helper ---

export function localeStr(zh: string, en: string, locale: SupportedLocale): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return en; // ja falls back to en
  return zh;
}

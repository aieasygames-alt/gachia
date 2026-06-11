import type { SupportedLocale } from '@gachia/core';

// --- Character Types ---

export interface SeaSkillBase {
  name: string;
  nameEn: string;
  nameJa?: string;
  description: string;
  descriptionEn: string;
}

export interface SeaActiveSkill extends SeaSkillBase {
  cooldown?: string;
  cost?: string;
}

export interface SeaSkillSet {
  passive: SeaSkillBase;
  signature: SeaActiveSkill;
  personal: SeaActiveSkill;
}

export interface SeaFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface SeaTeamComp {
  name: string;
  nameEn: string;
  members: string[];
  description: string;
  descriptionEn: string;
}

export interface SeaRecommendedBuild {
  bestWeapon: string;
  bestWeaponEn: string;
  alternativeWeapons: string[];
  mainStats: Record<string, string>;
  mainStatsEn: Record<string, string>;
  subStatPriority: string[];
  subStatPriorityEn: string[];
}

export interface SeaCharacter {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  nickname: string;
  attribute: string;
  attributeEn: string;
  role: string;
  roleEn: string;
  rarity: number;
  fleet: string;
  fleetEn: string;
  faction: string;
  position: string;
  favoriteFood: string;
  description: string;
  descriptionEn: string;
  speed: number;
  faq: SeaFaq[];
  relatedCharacters: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
  skills: SeaSkillSet;
  recommendedBuild?: SeaRecommendedBuild;
  teamComps?: SeaTeamComp[];
  image: string;
  status: string;
}

// --- Guide Types ---

export interface SeaGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface SeaGuide {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  summary: string;
  summaryEn: string;
  content: string;
  contentEn: string;
  tags: string[];
  faq: SeaGuideFaq[];
}

// --- Accessor Helpers ---

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

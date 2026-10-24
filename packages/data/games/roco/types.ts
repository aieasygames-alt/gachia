import type { SupportedLocale } from '@gachia/core';

// --- Jinie (Creature) Types ---

/** Historical schema only; active URL correction records use RocoLegacyEntry. */
export interface RocoJinie {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  attribute: string;
  attributeEn: string;
  rarity: number;
  habitat: string;
  habitatEn: string;
  evolution: string;
  evolutionEn: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
  contentReview?: RocoContentReview;
  status: string;
  skills?: RocoSkill[];
  stats?: RocoStats;
  releaseVersion?: string;
}

export interface RocoSkill {
  level?: number;
  name: string;
  nameEn: string;
  element: string;
  category: 'physical' | 'magic' | 'status' | 'defense';
  power?: number;
  description: string;
  descriptionEn: string;
}

export interface RocoStats {
  total: number;
  hp?: number;
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  spd?: number;
}

// --- Guide Types ---

export interface RocoGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface RocoGuide {
  id: string;
  title: string;
  titleEn: string;
  titleJa?: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  categoryJa?: string;
  summary: string;
  summaryEn: string;
  summaryJa?: string;
  content: string;
  contentEn: string;
  contentJa?: string;
  tags: string[];
  faq: RocoGuideFaq[];
  updatedAt?: string;
  contentReview?: RocoContentReview;
}

export interface RocoContentReview {
  status: 'needs_verification';
  reviewedAt: string;
  scope: string;
  kind?: 'editorial_proposal_archive';
}

// --- Material Types ---

export interface RocoMaterial {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
}

// --- Accessor Helpers ---

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

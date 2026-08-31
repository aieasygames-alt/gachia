import type { SupportedLocale } from '@gachia/core';

// --- Jinie (Creature) Types ---

export interface RocoCnSkill {
  level?: number;
  name: string;
  nameEn: string;
  element: string;
  category: 'physical' | 'magic' | 'status' | 'defense';
  power?: number;
  description: string;
  descriptionEn: string;
}

export interface RocoCnStats {
  total: number;
  hp?: number;
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  spd?: number;
}

export interface RocoCnJinie {
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
  status: string;
  skills?: RocoCnSkill[];
  stats?: RocoCnStats;
  releaseVersion?: string;
}

// --- Guide Types ---

export interface RocoCnGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface RocoCnGuide {
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
  faq: RocoCnGuideFaq[];
  updatedAt?: string;
}

// --- Material Types ---

export interface RocoCnMaterial {
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

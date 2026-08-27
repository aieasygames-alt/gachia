import type { SupportedLocale } from '@gachia/core';

// --- Jinie (Creature) Types ---

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
  status: string;
}

// --- Guide Types ---

export interface RocoGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface RocoGuide {
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
  faq: RocoGuideFaq[];
  updatedAt?: string;
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

import type { SupportedLocale } from '@gachia/core';

export interface SkjhGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface SkjhGuide {
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
  faq: SkjhGuideFaq[];
}

export interface SkjhMaterial {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
  sourceJa?: string;
  stackLimit?: number | string;
  acquisition?: string[];
  acquisitionEn?: string[];
  uses?: string[];
  usesEn?: string[];
  conversions?: string[];
  conversionsEn?: string[];
  notes?: string;
  notesEn?: string;
}

export interface SkjhWeapon {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  weaponType: string;
  rarity: number;
  source: string;
  sourceEn: string;
  sourceJa?: string;
  effectName: string;
  effectNameEn: string;
  effectNameJa?: string;
  effectDescription: string;
  effectDescriptionEn: string;
  effectDescriptionJa?: string;
}

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

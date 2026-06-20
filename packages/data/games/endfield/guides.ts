import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawGuides from './raw-guides.json';

export interface EndfieldGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface EndfieldGuide {
  id: string;
  title: string;
  titleEn: string;
  titleJa?: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  summary: string;
  summaryEn: string;
  summaryJa?: string;
  content: string;
  contentEn: string;
  tags: string[];
  faq: EndfieldGuideFaq[];
}

export const endfieldGuides: EndfieldGuide[] = rawGuides as unknown as EndfieldGuide[];

export function getEndfieldGuideTitle(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getEndfieldGuideContent(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getEndfieldGuideSummary(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getEndfieldGuideCategory(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getEndfieldGuideCategories(): string[] {
  return [...new Set(endfieldGuides.map((g) => g.category))];
}

export function getEndfieldGuidesByCategory(category: string): EndfieldGuide[] {
  return endfieldGuides.filter((g) => g.category === category);
}

export function getEndfieldGuideById(id: string): EndfieldGuide | undefined {
  return endfieldGuides.find((g) => g.id === id);
}

export function getEndfieldGuideSlugs(): string[] {
  return endfieldGuides.map((g) => g.id);
}

export function getEndfieldGuideFaqQuestion(faq: EndfieldGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getEndfieldGuideFaqAnswer(faq: EndfieldGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const ENDFIELD_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of endfieldGuides) {
  if (!ENDFIELD_GUIDE_CATEGORIES[g.category]) {
    ENDFIELD_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

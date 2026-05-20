import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawGuides from './raw-guides.json';

export interface AnantaGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface AnantaGuide {
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
  faq: AnantaGuideFaq[];
}

export const anantaGuides: AnantaGuide[] = rawGuides as unknown as AnantaGuide[];

export function getAnantaGuideTitle(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getAnantaGuideContent(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getAnantaGuideSummary(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getAnantaGuideCategory(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getAnantaGuideCategories(): string[] {
  return [...new Set(anantaGuides.map((g) => g.category))];
}

export function getAnantaGuidesByCategory(category: string): AnantaGuide[] {
  return anantaGuides.filter((g) => g.category === category);
}

export function getAnantaGuideById(id: string): AnantaGuide | undefined {
  return anantaGuides.find((g) => g.id === id);
}

export function getAnantaGuideSlugs(): string[] {
  return anantaGuides.map((g) => g.id);
}

export function getAnantaGuideFaqQuestion(faq: AnantaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getAnantaGuideFaqAnswer(faq: AnantaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const ANANTA_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of anantaGuides) {
  if (!ANANTA_GUIDE_CATEGORIES[g.category]) {
    ANANTA_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

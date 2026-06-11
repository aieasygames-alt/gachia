import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawGuides from './raw-guides.json';

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

export const seaGuides: SeaGuide[] = rawGuides as unknown as SeaGuide[];

export function getSeaGuideTitle(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getSeaGuideContent(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getSeaGuideSummary(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getSeaGuideCategory(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getSeaGuideCategories(): string[] {
  return [...new Set(seaGuides.map((g) => g.category))];
}

export function getSeaGuidesByCategory(category: string): SeaGuide[] {
  return seaGuides.filter((g) => g.category === category);
}

export function getSeaGuideById(id: string): SeaGuide | undefined {
  return seaGuides.find((g) => g.id === id);
}

export function getSeaGuideSlugs(): string[] {
  return seaGuides.map((g) => g.id);
}

export function getSeaGuideFaqQuestion(faq: SeaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getSeaGuideFaqAnswer(faq: SeaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const SEA_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of seaGuides) {
  if (!SEA_GUIDE_CATEGORIES[g.category]) {
    SEA_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

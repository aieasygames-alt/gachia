import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawGuides from './raw-guides.json';

export interface GenshinGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface GenshinGuide {
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
  faq: GenshinGuideFaq[];
}

export const genshinGuides: GenshinGuide[] = rawGuides as unknown as GenshinGuide[];

export function getGuideTitle(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getGuideContent(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getGuideSummary(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getGuideCategory(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getGuideCategories(): string[] {
  return [...new Set(genshinGuides.map((g) => g.category))];
}

export function getGuidesByCategory(category: string): GenshinGuide[] {
  return genshinGuides.filter((g) => g.category === category);
}

export function getGuideById(id: string): GenshinGuide | undefined {
  return genshinGuides.find((g) => g.id === id);
}

export function getGuideSlugs(): string[] {
  return genshinGuides.map((g) => g.id);
}

export function getGuideFaqQuestion(faq: GenshinGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getGuideFaqAnswer(faq: GenshinGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const GENSHIN_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of genshinGuides) {
  if (!GENSHIN_GUIDE_CATEGORIES[g.category]) {
    GENSHIN_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

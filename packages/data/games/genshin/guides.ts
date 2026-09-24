import type { SupportedLocale } from '@gachia/core';
import rawGuides from './raw-guides.json';
import { localeStr } from './types';

export interface GenshinGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface GenshinGuide {
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
  faq: GenshinGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const genshinGuides: GenshinGuide[] = rawGuides as unknown as GenshinGuide[];

export function getGuideTitle(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getGuideContent(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getGuideSummary(guide: GenshinGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
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
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getGuideFaqAnswer(faq: GenshinGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const GENSHIN_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of genshinGuides) {
  if (!GENSHIN_GUIDE_CATEGORIES[g.category]) {
    GENSHIN_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

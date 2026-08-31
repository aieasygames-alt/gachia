import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/endfield/raw-guides.json'), '/data/endfield/raw-guides.json');

export interface EndfieldGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface EndfieldGuide {
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
  faq: EndfieldGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const endfieldGuides: EndfieldGuide[] = rawGuides as unknown as EndfieldGuide[];

export function getEndfieldGuideTitle(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getEndfieldGuideContent(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getEndfieldGuideSummary(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getEndfieldGuideCategory(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
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
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getEndfieldGuideFaqAnswer(faq: EndfieldGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const ENDFIELD_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of endfieldGuides) {
  if (!ENDFIELD_GUIDE_CATEGORIES[g.category]) {
    ENDFIELD_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

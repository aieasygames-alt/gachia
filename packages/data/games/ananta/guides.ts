import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/ananta/raw-guides.json'), '/data/ananta/raw-guides.json');

export interface AnantaGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface AnantaGuide {
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
  faq: AnantaGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const anantaGuides: AnantaGuide[] = rawGuides as unknown as AnantaGuide[];

export function getAnantaGuideTitle(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getAnantaGuideContent(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getAnantaGuideSummary(guide: AnantaGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
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
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getAnantaGuideFaqAnswer(faq: AnantaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const ANANTA_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of anantaGuides) {
  if (!ANANTA_GUIDE_CATEGORIES[g.category]) {
    ANANTA_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

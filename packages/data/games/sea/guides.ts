import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/sea/raw-guides.json'), '/data/sea/raw-guides.json');

export interface SeaGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface SeaGuide {
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
  faq: SeaGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const seaGuides: SeaGuide[] = rawGuides as unknown as SeaGuide[];

export function getSeaGuideTitle(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getSeaGuideContent(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getSeaGuideSummary(guide: SeaGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
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
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getSeaGuideFaqAnswer(faq: SeaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const SEA_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of seaGuides) {
  if (!SEA_GUIDE_CATEGORIES[g.category]) {
    SEA_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

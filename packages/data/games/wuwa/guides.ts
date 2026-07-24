import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/wuwa/raw-guides.json'), '/data/wuwa/raw-guides.json');

export interface WuWaGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface WuWaGuide {
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
  faq: WuWaGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const wuwaGuides: WuWaGuide[] = rawGuides as unknown as WuWaGuide[];

export function getGuideTitle(guide: WuWaGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getGuideContent(guide: WuWaGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getGuideSummary(guide: WuWaGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getGuideCategory(guide: WuWaGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getGuideCategories(): string[] {
  return [...new Set(wuwaGuides.map((g) => g.category))];
}

export function getGuidesByCategory(category: string): WuWaGuide[] {
  return wuwaGuides.filter((g) => g.category === category);
}

export function getGuideById(id: string): WuWaGuide | undefined {
  return wuwaGuides.find((g) => g.id === id);
}

export function getGuideSlugs(): string[] {
  return wuwaGuides.map((g) => g.id);
}

export function getGuideFaqQuestion(faq: WuWaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getGuideFaqAnswer(faq: WuWaGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const WUWA_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of wuwaGuides) {
  if (!WUWA_GUIDE_CATEGORIES[g.category]) {
    WUWA_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

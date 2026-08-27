import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/roco-cn/raw-guides.json'), '/data/roco-cn/raw-guides.json');

export interface RocoCnGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface RocoCnGuide {
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
  faq: RocoCnGuideFaq[];
  updatedAt?: string;
}

export const rocoCnGuides: RocoCnGuide[] = rawGuides as unknown as RocoCnGuide[];

export function getRocoCnGuideTitle(guide: RocoCnGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getRocoCnGuideContent(guide: RocoCnGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getRocoCnGuideSummary(guide: RocoCnGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getRocoCnGuideCategory(guide: RocoCnGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getRocoCnGuideCategories(): string[] {
  return [...new Set(rocoCnGuides.map((g) => g.category))];
}

export function getRocoCnGuidesByCategory(category: string): RocoCnGuide[] {
  return rocoCnGuides.filter((g) => g.category === category);
}

export function getRocoCnGuideById(id: string): RocoCnGuide | undefined {
  return rocoCnGuides.find((g) => g.id === id);
}

export function getRocoCnGuideSlugs(): string[] {
  return rocoCnGuides.map((g) => g.id);
}

export function getRocoCnGuideFaqQuestion(faq: RocoCnGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getRocoCnGuideFaqAnswer(faq: RocoCnGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const ROCO_CN_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of rocoCnGuides) {
  if (!ROCO_CN_GUIDE_CATEGORIES[g.category]) {
    ROCO_CN_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

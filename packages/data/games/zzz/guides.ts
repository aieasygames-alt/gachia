import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/zzz/raw-guides.json'), '/data/zzz/raw-guides.json');

export interface ZzzGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface ZzzGuide {
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
  faq: ZzzGuideFaq[];
}

export const zzzGuides: ZzzGuide[] = rawGuides as unknown as ZzzGuide[];

export function getZzzGuideTitle(guide: ZzzGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getZzzGuideContent(guide: ZzzGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getZzzGuideSummary(guide: ZzzGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getZzzGuideCategory(guide: ZzzGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getZzzGuideCategories(): string[] {
  return [...new Set(zzzGuides.map((g) => g.category))];
}

export function getZzzGuidesByCategory(category: string): ZzzGuide[] {
  return zzzGuides.filter((g) => g.category === category);
}

export function getZzzGuideById(id: string): ZzzGuide | undefined {
  return zzzGuides.find((g) => g.id === id);
}

export function getZzzGuideSlugs(): string[] {
  return zzzGuides.map((g) => g.id);
}

export function getZzzGuideFaqQuestion(faq: ZzzGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getZzzGuideFaqAnswer(faq: ZzzGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const ZZZ_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of zzzGuides) {
  if (!ZZZ_GUIDE_CATEGORIES[g.category]) {
    ZZZ_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

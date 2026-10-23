import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
import type { RocoContentReview } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/roco/raw-guides.json'), '/data/roco/raw-guides.json');

export interface RocoGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface RocoGuide {
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
  faq: RocoGuideFaq[];
  updatedAt?: string;
  contentReview?: RocoContentReview;
}

export const rocoGuides: RocoGuide[] = rawGuides as unknown as RocoGuide[];

export function getRocoGuideTitle(guide: RocoGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getRocoGuideContent(guide: RocoGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getRocoGuideSummary(guide: RocoGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getRocoGuideCategory(guide: RocoGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
}

export function getRocoGuideCategories(): string[] {
  return [...new Set(rocoGuides.map((g) => g.category))];
}

export function getRocoGuidesByCategory(category: string): RocoGuide[] {
  return rocoGuides.filter((g) => g.category === category);
}

export function getRocoGuideById(id: string): RocoGuide | undefined {
  return rocoGuides.find((g) => g.id === id);
}

export function getRocoGuideSlugs(): string[] {
  return rocoGuides.map((g) => g.id);
}

export function getRocoGuideFaqQuestion(faq: RocoGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getRocoGuideFaqAnswer(faq: RocoGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const ROCO_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of rocoGuides) {
  if (!ROCO_GUIDE_CATEGORIES[g.category]) {
    ROCO_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryJa ?? g.categoryEn };
  }
}

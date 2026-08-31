import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr, type SkjhGuide, type SkjhGuideFaq } from './types';

const rawGuides = await loadJson<unknown>(
  join(process.cwd(), '../../packages/data/games/skjh/raw-guides.json'),
  '/data/skjh/raw-guides.json',
);

export type { SkjhGuide, SkjhGuideFaq } from './types';

export const skjhGuides: SkjhGuide[] = rawGuides as unknown as SkjhGuide[];

export function getSkjhGuideTitle(guide: SkjhGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getSkjhGuideContent(guide: SkjhGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getSkjhGuideSummary(guide: SkjhGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getSkjhGuideCategory(guide: SkjhGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
}

export function getSkjhGuideCategories(): string[] {
  return [...new Set(skjhGuides.map((g) => g.category))];
}

export function getSkjhGuidesByCategory(category: string): SkjhGuide[] {
  return skjhGuides.filter((g) => g.category === category);
}

export function getSkjhGuideById(id: string): SkjhGuide | undefined {
  return skjhGuides.find((g) => g.id === id);
}

export function getSkjhGuideSlugs(): string[] {
  return skjhGuides.map((g) => g.id);
}

export function getSkjhGuideFaqQuestion(faq: SkjhGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getSkjhGuideFaqAnswer(faq: SkjhGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const SKJH_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of skjhGuides) {
  if (!SKJH_GUIDE_CATEGORIES[g.category]) {
    SKJH_GUIDE_CATEGORIES[g.category] = {
      zh: g.categoryZh,
      en: g.categoryEn,
      ja: g.categoryJa ?? g.categoryEn,
    };
  }
}

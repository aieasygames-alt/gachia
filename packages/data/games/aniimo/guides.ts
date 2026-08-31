import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import type { AniimoGuide, AniimoGuideFaq } from './types';
import { localeStr } from './types';

const rawGuides = await loadJson<unknown>(
  join(process.cwd(), '../../packages/data/games/aniimo/raw-guides.json'),
  '/data/aniimo/raw-guides.json',
);

export const aniimoGuides: AniimoGuide[] = rawGuides as AniimoGuide[];

export function getAniimoGuideTitle(guide: AniimoGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getAniimoGuideContent(guide: AniimoGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getAniimoGuideSummary(guide: AniimoGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getAniimoGuideCategory(guide: AniimoGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getAniimoGuideCategories(): string[] {
  return [...new Set(aniimoGuides.map((guide) => guide.category))];
}

export function getAniimoGuidesByCategory(category: string): AniimoGuide[] {
  return aniimoGuides.filter((guide) => guide.category === category);
}

export function getAniimoGuideById(id: string): AniimoGuide | undefined {
  return aniimoGuides.find((guide) => guide.id === id);
}

export function getAniimoGuideSlugs(): string[] {
  return aniimoGuides.map((guide) => guide.id);
}

export function getAniimoGuideFaqQuestion(faq: AniimoGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getAniimoGuideFaqAnswer(faq: AniimoGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const ANIIMO_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const guide of aniimoGuides) {
  if (!ANIIMO_GUIDE_CATEGORIES[guide.category]) {
    ANIIMO_GUIDE_CATEGORIES[guide.category] = {
      zh: guide.categoryZh,
      en: guide.categoryEn,
      ja: guide.categoryEn,
    };
  }
}

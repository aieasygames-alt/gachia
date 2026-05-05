import type { SupportedLocale } from '@gachia/core';
import rawData from './raw-guides.json';

// --- NTE Guide Types ---

export interface NteGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface NteGuide {
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
  faq: NteGuideFaq[];
  date?: string;
}

// --- Data ---

export const guides: NteGuide[] = rawData as NteGuide[];

// --- Localization Helpers ---

export function getGuideTitle(guide: NteGuide, locale: SupportedLocale): string {
  if (locale === 'en') return guide.titleEn;
  if (locale === 'ja') return guide.titleEn; // ja fallback to en
  return guide.title;
}

export function getGuideContent(guide: NteGuide, locale: SupportedLocale): string {
  if (locale === 'en') return guide.contentEn;
  if (locale === 'ja') return guide.contentEn;
  return guide.content;
}

export function getGuideSummary(guide: NteGuide, locale: SupportedLocale): string {
  if (locale === 'en') return guide.summaryEn;
  if (locale === 'ja') return guide.summaryEn;
  return guide.summary;
}

export function getGuideCategory(guide: NteGuide, locale: SupportedLocale): string {
  if (locale === 'en') return guide.categoryEn;
  if (locale === 'ja') return guide.categoryEn;
  return guide.categoryZh;
}

export function getGuideFaqQuestion(faq: NteGuideFaq, locale: SupportedLocale): string {
  if (locale === 'en') return faq.question;
  if (locale === 'ja') return faq.question;
  return faq.questionZh;
}

export function getGuideFaqAnswer(faq: NteGuideFaq, locale: SupportedLocale): string {
  if (locale === 'en') return faq.answer;
  if (locale === 'ja') return faq.answer;
  return faq.answerZh;
}

// --- Category Labels ---

export const NTE_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};

// Build category labels from data to stay in sync
for (const guide of guides) {
  if (!NTE_GUIDE_CATEGORIES[guide.category]) {
    NTE_GUIDE_CATEGORIES[guide.category] = {
      zh: guide.categoryZh,
      en: guide.categoryEn,
      ja: guide.categoryEn, // ja fallback to en
    };
  }
}

export function getGuideCategories(): string[] {
  return [...new Set(guides.map((g) => g.category))];
}

export function getGuidesByCategory(category: string): NteGuide[] {
  return guides.filter((g) => g.category === category);
}

export function getGuideById(id: string): NteGuide | undefined {
  return guides.find((g) => g.id === id);
}

export function getGuideSlugs(): string[] {
  return guides.map((g) => g.id);
}

import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawData = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/nte/raw-guides.json'), '/data/nte/raw-guides.json');

// --- NTE Guide Types ---

export interface NteGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface NteGuide {
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
  faq: NteGuideFaq[];
  relatedCharacters?: string[];
  relatedLocations?: string[];
  relatedLore?: string[];
  date?: string;
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

// --- Data ---

export const guides: NteGuide[] = rawData as NteGuide[];

// --- Localization Helpers ---

export function getGuideTitle(guide: NteGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getGuideContent(guide: NteGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getGuideSummary(guide: NteGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getGuideCategory(guide: NteGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
}

export function getGuideFaqQuestion(faq: NteGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getGuideFaqAnswer(faq: NteGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
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

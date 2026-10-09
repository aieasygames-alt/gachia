import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';

const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/hi3/raw-guides.json'), '/data/hi3/raw-guides.json');

export interface Hi3GuideFaq {
  question: string;
  questionZh: string;
  questionJa: string;
  answer: string;
  answerZh: string;
  answerJa: string;
}

export interface Hi3Guide {
  id: string;
  title: string;
  titleEn: string;
  titleJa: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  categoryJa: string;
  summary: string;
  summaryEn: string;
  summaryJa: string;
  content: string;
  contentEn: string;
  contentJa: string;
  tags: string[];
  faq: Hi3GuideFaq[];
  updatedAt: string;
  currentVersion: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const hi3Guides: Hi3Guide[] = rawGuides as Hi3Guide[];

export function getHi3GuideTitle(guide: Hi3Guide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getHi3GuideContent(guide: Hi3Guide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}

export function getHi3GuideSummary(guide: Hi3Guide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getHi3GuideCategory(guide: Hi3Guide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
}

export function getHi3GuideCategories(): string[] {
  return [...new Set(hi3Guides.map((guide) => guide.category))];
}

export function getHi3GuidesByCategory(category: string): Hi3Guide[] {
  return hi3Guides.filter((guide) => guide.category === category);
}

export function getHi3GuideById(id: string): Hi3Guide | undefined {
  return hi3Guides.find((guide) => guide.id === id);
}

export function getHi3GuideSlugs(): string[] {
  return hi3Guides.map((guide) => guide.id);
}

export function getHi3GuideFaqQuestion(faq: Hi3GuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getHi3GuideFaqAnswer(faq: Hi3GuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const HI3_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const guide of hi3Guides) {
  HI3_GUIDE_CATEGORIES[guide.category] ??= {
    zh: guide.categoryZh,
    en: guide.categoryEn,
    ja: guide.categoryJa,
  };
}

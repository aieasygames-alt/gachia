import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/guihuan/raw-guides.json'), '/data/guihuan/raw-guides.json');

export interface GuihuanGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface GuihuanGuide {
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
  faq: GuihuanGuideFaq[];
}

export const guihuanGuides: GuihuanGuide[] = rawGuides as unknown as GuihuanGuide[];

export function getGuihuanGuideTitle(guide: GuihuanGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale);
}

export function getGuihuanGuideContent(guide: GuihuanGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale);
}

export function getGuihuanGuideSummary(guide: GuihuanGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale);
}

export function getGuihuanGuideCategory(guide: GuihuanGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale);
}

export function getGuihuanGuideCategories(): string[] {
  return [...new Set(guihuanGuides.map((g) => g.category))];
}

export function getGuihuanGuidesByCategory(category: string): GuihuanGuide[] {
  return guihuanGuides.filter((g) => g.category === category);
}

export function getGuihuanGuideById(id: string): GuihuanGuide | undefined {
  return guihuanGuides.find((g) => g.id === id);
}

export function getGuihuanGuideSlugs(): string[] {
  return guihuanGuides.map((g) => g.id);
}

export function getGuihuanGuideFaqQuestion(faq: GuihuanGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale);
}

export function getGuihuanGuideFaqAnswer(faq: GuihuanGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale);
}

export const GUIHUAN_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of guihuanGuides) {
  if (!GUIHUAN_GUIDE_CATEGORIES[g.category]) {
    GUIHUAN_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}

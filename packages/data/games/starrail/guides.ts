import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/starrail/raw-guides.json'), '/data/starrail/raw-guides.json');

export interface StarRailGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface StarRailGuide {
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
  faq: StarRailGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const starrailGuides: StarRailGuide[] = rawGuides as unknown as StarRailGuide[];

export function getGuideTitle(guide: StarRailGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}
export function getGuideContent(guide: StarRailGuide, locale: SupportedLocale): string {
  return localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
}
export function getGuideSummary(guide: StarRailGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}
export function getGuideCategory(guide: StarRailGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
}
export function getGuideFaqQuestion(faq: StarRailGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}
export function getGuideFaqAnswer(faq: StarRailGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}
export function getGuideCategories(): string[] {
  return [...new Set(starrailGuides.map((g) => g.category))];
}
export function getGuidesByCategory(category: string): StarRailGuide[] {
  return starrailGuides.filter((g) => g.category === category);
}
export function getGuideById(id: string): StarRailGuide | undefined {
  return starrailGuides.find((g) => g.id === id);
}
export function getGuideSlugs(): string[] {
  return starrailGuides.map((g) => g.id);
}

export const STARRAIL_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {
  beginner: { zh: '新手入门', en: 'Beginner', ja: '初心者' },
  combat: { zh: '战斗攻略', en: 'Combat', ja: 'バトル' },
  equipment: { zh: '装备攻略', en: 'Equipment', ja: '装備' },
  team: { zh: '配队攻略', en: 'Team Building', ja: 'パーティ' },
  progression: { zh: '养成攻略', en: 'Progression', ja: '育成' },
};

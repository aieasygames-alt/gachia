import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGachaSystem = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/nte/raw-gacha-system.json'), '/data/nte/raw-gacha-system.json');

export interface NteGachaBanner {
  id: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  sRate: string;
  aRate: string;
  bRate: string;
  hardPity: number;
  softPity: number;
  avgPity: number;
  no5050: boolean;
  featured?: string[];
}

export interface NteGachaFaq {
  questionZh: string;
  questionEn: string;
  answerZh: string;
  answerEn: string;
}

const data = rawGachaSystem as unknown as {
  banners: NteGachaBanner[];
  faqs: NteGachaFaq[];
};

export const gachaBanners: NteGachaBanner[] = data.banners;
export const gachaFaqs: NteGachaFaq[] = data.faqs;

export function getGachaBannerName(banner: NteGachaBanner, locale: SupportedLocale): string {
  return localeStr(banner.nameZh, banner.nameEn, locale);
}

export function getGachaBannerDesc(banner: NteGachaBanner, locale: SupportedLocale): string {
  return localeStr(banner.descZh, banner.descEn, locale);
}

export function getGachaFaqQuestion(faq: NteGachaFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.questionEn, locale);
}

export function getGachaFaqAnswer(faq: NteGachaFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answerEn, locale);
}

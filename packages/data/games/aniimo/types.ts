import type { SupportedLocale } from '@gachia/core';

export interface AniimoCharacter {
  id: string;
  no: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  element: string;
  elementEn: string;
  elementZh: string;
  elementJa: string;
  role: string;
  roleEn: string;
  roleZh: string;
  roleJa: string;
  stage: string;
  rarity: number;
  region: string;
  ability: string;
  description: string;
  descriptionEn: string;
  image: string;
  evolution: string[];
  locationNote: string;
  evolutionDetail: string;
  abilityUseCase: string;
  relatedRegionReason: string;
  sourceNote: string;
  status: string;
  aliases: string[];
  tierRank: string;
  tierReason: string;
  tierReasonZh: string;
}

export interface AniimoGuideFaq {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

export interface AniimoGuide {
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
  faq: AniimoGuideFaq[];
  updatedAt?: string;
}

export interface AniimoRegion {
  id: string;
  name: string;
  theme: string;
  aniimo: string[];
  mechanics: string[];
  checklist: string[];
  guideNote: string;
  status: string;
  source: string;
  image: string;
}

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

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
  abilityZh?: string;
  abilityJa?: string;
  description: string;
  descriptionEn: string;
  descriptionJa?: string;
  image: string;
  evolution?: string[];
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
  tierReasonJa?: string;
}

export interface AniimoGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface AniimoGuide {
  id: string;
  title: string;
  titleEn: string;
  titleJa?: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  summary: string;
  summaryEn: string;
  summaryJa?: string;
  content: string;
  contentEn: string;
  contentJa?: string;
  tags: string[];
  faq: AniimoGuideFaq[];
  updatedAt?: string;
}

export interface AniimoRegion {
  id: string;
  name: string;
  nameZh?: string;
  nameJa?: string;
  theme: string;
  themeZh?: string;
  themeJa?: string;
  aniimo: string[];
  mechanics: string[];
  mechanicsZh?: string[];
  mechanicsJa?: string[];
  checklist: string[];
  checklistZh?: string[];
  checklistJa?: string[];
  guideNote: string;
  guideNoteZh?: string;
  guideNoteJa?: string;
  status: string;
  statusZh?: string;
  statusJa?: string;
  source: string;
  image: string;
}

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

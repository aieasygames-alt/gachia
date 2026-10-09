import type { SupportedLocale } from '@gachia/core';

export interface Hi3Skill {
  name: string;
  nameEn: string;
  nameJa: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
}

export interface Hi3Character {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  rank: 'S' | 'A';
  type: string;
  typeEn: string;
  damageType: string;
  damageTypeEn: string;
  weaponType: string;
  weaponTypeEn: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  releaseVersion: string;
  status: 'available' | 'officially-announced';
  skills: Hi3Skill[];
}

export interface Hi3Weapon {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  rank: '5-star' | '4-star';
  weaponType: string;
  weaponTypeEn: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  releaseVersion: string;
  status: 'available' | 'officially-announced';
}

export interface Hi3Material {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  type: string;
  rarity: number;
  source: string;
  sourceEn: string;
  sourceJa: string;
}

export interface Hi3AstralOp {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  role: string;
  roleEn: string;
  roleJa: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  releaseVersion: string;
  status: 'available' | 'officially-announced';
}

export interface Hi3StigmaSet {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  description: string;
  descriptionEn: string;
  descriptionJa: string;
  releaseVersion: string;
  status: 'available' | 'officially-announced';
}

export interface Hi3GuideFaq {
  question: string;
  questionZh: string;
  questionJa: string;
  answer: string;
  answerZh: string;
  answerJa: string;
}

export function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

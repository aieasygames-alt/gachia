import { IMAGE_BASE } from '../../image-base';
import type { SupportedLocale, Character } from '@gachia/core';
import type { RocoCnJinie, RocoCnSkill, RocoCnStats } from './types';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';

const rawCharacters = await loadJson<unknown>(
  join(process.cwd(), '../../packages/data/games/roco-cn/raw-characters.json'),
  '/data/roco-cn/raw-characters.json',
);
const allCharacters: RocoCnJinie[] = rawCharacters as RocoCnJinie[];

export const rocoCnCharacters: RocoCnJinie[] = allCharacters.filter(
  (c) => c.status !== 'upcoming'
);

export function getRocoCnCharacterName(char: RocoCnJinie, locale: SupportedLocale): string {
  return localeStr(char.name, char.nameEn, locale, char.nameJa);
}

export function getRocoCnCharacterDescription(char: RocoCnJinie, locale: SupportedLocale): string {
  return localeStr(char.description, char.descriptionEn, locale);
}

export function getRocoCnCharacterImage(char: RocoCnJinie): string {
  return `${IMAGE_BASE}/images/roco-cn/characters/${char.id}.webp`;
}

export function getRocoCnCharacterById(id: string): RocoCnJinie | undefined {
  return rocoCnCharacters.find((c) => c.id === id);
}

export const characters: Character[] = rocoCnCharacters.map((char) => ({
  id: char.id,
  gameId: 'roco-cn' as const,
  name: { zh: char.name, en: char.nameEn, ja: char.nameJa ?? char.nameEn },
  rarity: char.rarity,
  element: char.attribute,
  weaponType: 'jinie',
  description: { zh: char.description, en: char.descriptionEn, ja: char.descriptionEn },
  images: {
    icon: `/images/roco-cn/characters/${char.id}.webp`,
    card: `/images/roco-cn/characters/${char.id}.webp`,
    gachaSplash: `/images/roco-cn/characters/${char.id}.webp`,
  },
  stats: mapStats(char.stats),
  materials: [],
  skills: mapSkills(char.skills),
  releaseVersion: char.releaseVersion ?? '国服公测',
}));

function mapStats(stats?: RocoCnStats): Character['stats'] {
  if (!stats) {
    return { baseHp: [], baseAtk: [], baseDef: [] };
  }
  return {
    baseHp: [stats.hp ?? stats.total],
    baseAtk: [stats.atk ?? stats.matk ?? 0],
    baseDef: [stats.def ?? stats.mdef ?? 0],
  };
}

function mapSkills(skills?: RocoCnSkill[]): Character['skills'] {
  if (!skills) return [];
  return skills.map((skill, index) => ({
    id: `${index + 1}`,
    name: { zh: skill.name, en: skill.nameEn, ja: skill.nameEn },
    description: { zh: skill.description, en: skill.descriptionEn, ja: skill.descriptionEn },
    type: skill.category === 'physical' ? 'normal' : skill.category === 'magic' ? 'elemental' : skill.category === 'status' ? 'passive' : 'passive',
  }));
}

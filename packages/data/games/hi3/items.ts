import type { Item, SupportedLocale } from '@gachia/core';
import type { Hi3Material } from './types';
import rawMaterials from './raw-materials.json';
import { localeStr } from './types';

export const hi3Materials: Hi3Material[] = rawMaterials as Hi3Material[];

export function getHi3MaterialName(material: Hi3Material, locale: SupportedLocale): string {
  return localeStr(material.name, material.nameEn, locale, material.nameJa);
}

export function getHi3MaterialById(id: string): Hi3Material | undefined {
  return hi3Materials.find((material) => material.id === id);
}

export const items: Item[] = hi3Materials.map((material) => ({
  id: material.id,
  gameId: 'hi3',
  name: { zh: material.name, en: material.nameEn, ja: material.nameJa },
  type: material.type,
  rarity: material.rarity,
  description: { zh: material.source, en: material.sourceEn, ja: material.sourceJa },
  icon: '/images/hi3/characters/official-v9-0.svg',
  sources: [{ zh: material.source, en: material.sourceEn, ja: material.sourceJa }],
}));

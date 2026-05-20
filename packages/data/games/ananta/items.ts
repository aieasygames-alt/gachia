import type { Item } from '@gachia/core';
import type { AnantaMaterial } from './types';
import { localeStr } from './types';
import type { SupportedLocale } from '@gachia/core';
import rawMaterials from './raw-materials.json';

export const anantaMaterials: AnantaMaterial[] = rawMaterials as unknown as AnantaMaterial[];

export function getAnantaMaterialName(mat: AnantaMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getAnantaMaterialById(id: string): AnantaMaterial | undefined {
  return anantaMaterials.find((m) => m.id === id);
}

export const items: Item[] = anantaMaterials.map((m) => ({
  id: m.id,
  gameId: 'ananta' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: '',
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

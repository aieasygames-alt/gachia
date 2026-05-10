import type { SupportedLocale, Item } from '@gachia/core';
import type { StarRailMaterial } from './types';
import { localeStr } from './types';
import rawMaterials from './raw-materials.json';

export const starrailMaterials: StarRailMaterial[] = rawMaterials as unknown as StarRailMaterial[];

export function getStarRailMaterialName(mat: StarRailMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getStarRailMaterialById(id: string): StarRailMaterial | undefined {
  return starrailMaterials.find((m) => m.id === id);
}

export const items: Item[] = starrailMaterials.map((m) => ({
  id: m.id,
  gameId: 'starrail' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: '',
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

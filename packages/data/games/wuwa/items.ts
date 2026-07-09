import type { SupportedLocale, Item } from '@gachia/core';
import type { WuWaMaterial } from './types';
import rawMaterials from './raw-materials.json';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';

export const wuwaMaterials: WuWaMaterial[] = rawMaterials as unknown as WuWaMaterial[];

export function getWuWaMaterialName(mat: WuWaMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getWuWaMaterialById(id: string): WuWaMaterial | undefined {
  return wuwaMaterials.find((m) => m.id === id);
}

export const items: Item[] = wuwaMaterials.map((m) => ({
  id: m.id,
  gameId: 'wuwa' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: `${IMAGE_BASE}/images/wuwa/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

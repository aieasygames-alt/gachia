import type { SupportedLocale, Item } from '@gachia/core';
import type { GenshinMaterial } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawMaterials from './raw-materials.json';

export const genshinMaterials: GenshinMaterial[] = rawMaterials as unknown as GenshinMaterial[];

export function getGenshinMaterialName(mat: GenshinMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getGenshinMaterialById(id: string): GenshinMaterial | undefined {
  return genshinMaterials.find((m) => m.id === id);
}

export const items: Item[] = genshinMaterials.map((m) => ({
  id: m.id,
  gameId: 'genshin' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: `${IMAGE_BASE}/images/genshin/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

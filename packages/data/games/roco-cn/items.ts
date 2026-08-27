import type { SupportedLocale, Item } from '@gachia/core';
import type { RocoCnMaterial } from './types';
import rawMaterials from './raw-materials.json';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';

export const rocoCnMaterials: RocoCnMaterial[] = rawMaterials as unknown as RocoCnMaterial[];

export function getRocoCnMaterialName(mat: RocoCnMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getRocoCnMaterialById(id: string): RocoCnMaterial | undefined {
  return rocoCnMaterials.find((m) => m.id === id);
}

export const items: Item[] = rocoCnMaterials.map((m) => ({
  id: m.id,
  gameId: 'roco-cn' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: `${IMAGE_BASE}/images/roco-cn/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

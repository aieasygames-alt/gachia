import type { SupportedLocale, Item } from '@gachia/core';
import type { SeaMaterial } from './types';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';
import rawMaterials from './raw-materials.json';

export const seaMaterials: SeaMaterial[] = rawMaterials as unknown as SeaMaterial[];

export function getSeaMaterialName(mat: SeaMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getSeaMaterialById(id: string): SeaMaterial | undefined {
  return seaMaterials.find((m) => m.id === id);
}

export const items: Item[] = seaMaterials.map((m) => ({
  id: m.id,
  gameId: 'sea' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: `${IMAGE_BASE}/images/sea/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

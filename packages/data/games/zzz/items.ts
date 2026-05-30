import type { Item } from '@gachia/core';
import type { ZzzMaterial } from './types';
import { localeStr } from './types';
import type { SupportedLocale } from '@gachia/core';
import { IMAGE_BASE } from '../../image-base';
import rawMaterials from './raw-materials.json';

export const zzzMaterials: ZzzMaterial[] = rawMaterials as unknown as ZzzMaterial[];

export function getZzzMaterialName(mat: ZzzMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getZzzMaterialById(id: string): ZzzMaterial | undefined {
  return zzzMaterials.find((m) => m.id === id);
}

export const items: Item[] = zzzMaterials.map((m) => ({
  id: m.id,
  gameId: 'zzz' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: `${IMAGE_BASE}/images/zzz/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: '', ja: '' }],
}));

import type { Item } from '@gachia/core';
import type { EndfieldMaterial } from './types';
import rawMaterials from './raw-materials.json';
import { localeStr } from './types';
import type { SupportedLocale } from '@gachia/core';
import { IMAGE_BASE } from '../../image-base';

export const endfieldMaterials: EndfieldMaterial[] = rawMaterials as unknown as EndfieldMaterial[];

export function getEndfieldMaterialName(mat: EndfieldMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getEndfieldMaterialById(id: string): EndfieldMaterial | undefined {
  return endfieldMaterials.find((m) => m.id === id);
}

export const items: Item[] = endfieldMaterials.map((m) => ({
  id: m.id,
  gameId: 'endfield' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: (m as any).description ?? '', en: (m as any).descriptionEn ?? '', ja: (m as any).descriptionEn ?? '' },
  icon: `${IMAGE_BASE}/images/endfield/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

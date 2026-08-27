import type { SupportedLocale, Item } from '@gachia/core';
import type { RocoMaterial } from './types';
import rawMaterials from './raw-materials.json';
import { localeStr } from './types';
import { IMAGE_BASE } from '../../image-base';

export const rocoMaterials: RocoMaterial[] = rawMaterials as unknown as RocoMaterial[];

export function getRocoMaterialName(mat: RocoMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getRocoMaterialById(id: string): RocoMaterial | undefined {
  return rocoMaterials.find((m) => m.id === id);
}

export const items: Item[] = rocoMaterials.map((m) => ({
  id: m.id,
  gameId: 'roco' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: `${IMAGE_BASE}/images/roco/materials/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

import type { Item, SupportedLocale } from '@gachia/core';
import { IMAGE_BASE } from '../../image-base';
import { localeStr, type SkjhMaterial } from './types';
import rawMaterials from './raw-materials.json';

export const skjhMaterials: SkjhMaterial[] = rawMaterials as unknown as SkjhMaterial[];

export function getSkjhMaterialName(mat: SkjhMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale, mat.nameJa);
}

export function getSkjhMaterialById(id: string): SkjhMaterial | undefined {
  return skjhMaterials.find((m) => m.id === id);
}

export const items: Item[] = skjhMaterials.map((m) => ({
  id: m.id,
  gameId: 'skjh' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameJa ?? m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: m.source, en: m.sourceEn, ja: m.sourceJa ?? m.sourceEn },
  icon: `${IMAGE_BASE}/images/skjh/items/${m.id}.webp`,
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceJa ?? m.sourceEn }],
}));

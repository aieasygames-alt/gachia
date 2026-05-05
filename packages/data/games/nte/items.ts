import type { Item } from '@gachia/core';
import type { NteMaterial } from './types';
import { localeStr } from './types';
import type { SupportedLocale } from '@gachia/core';
import rawMaterials from './raw-materials.json';

export const nteMaterials: NteMaterial[] = rawMaterials as unknown as NteMaterial[];

export function getNteMaterialName(mat: NteMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getNteMaterialById(id: string): NteMaterial | undefined {
  return nteMaterials.find((m) => m.id === id);
}

export const items: Item[] = nteMaterials.map((m) => ({
  id: m.id,
  gameId: 'nte' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: '',
  sources: [{ zh: m.source, en: '', ja: '' }],
}));

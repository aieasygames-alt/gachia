import type { Item } from '@gachia/core';
import type { GuihuanMaterial } from './types';
import { localeStr } from './types';
import type { SupportedLocale } from '@gachia/core';
import rawMaterials from './raw-materials.json';

export const guihuanMaterials: GuihuanMaterial[] = rawMaterials as unknown as GuihuanMaterial[];

export function getGuihuanMaterialName(mat: GuihuanMaterial, locale: SupportedLocale): string {
  return localeStr(mat.name, mat.nameEn, locale);
}

export function getGuihuanMaterialById(id: string): GuihuanMaterial | undefined {
  return guihuanMaterials.find((m) => m.id === id);
}

export const items: Item[] = guihuanMaterials.map((m) => ({
  id: m.id,
  gameId: 'guihuan' as const,
  name: { zh: m.name, en: m.nameEn, ja: m.nameEn },
  type: m.type,
  rarity: m.rarity,
  description: { zh: '', en: '', ja: '' },
  icon: '',
  sources: [{ zh: m.source, en: m.sourceEn, ja: m.sourceEn }],
}));

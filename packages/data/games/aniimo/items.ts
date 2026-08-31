import type { Item } from '@gachia/core';

export const aniimoMaterials: Item[] = [];
export const items: Item[] = aniimoMaterials;

export function getAniimoMaterialName(item: Item): string {
  return item.name.en;
}

export function getAniimoMaterialById(id: string): Item | undefined {
  return aniimoMaterials.find((item) => item.id === id);
}

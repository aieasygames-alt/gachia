import rawData from './raw-character-materials.json';

export const characterMaterials: never[] = rawData as unknown as never[];

export function getMaterialsForCharacter(_charId: string): undefined {
  return undefined;
}

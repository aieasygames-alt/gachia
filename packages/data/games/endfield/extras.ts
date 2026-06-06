import type { EndfieldCharacterMaterials } from './types';
import rawData from './raw-character-materials.json';

export const characterMaterials: EndfieldCharacterMaterials[] = rawData as unknown as EndfieldCharacterMaterials[];

export function getMaterialsForCharacter(charId: string): EndfieldCharacterMaterials | undefined {
  return characterMaterials.find((cm) => cm.characterId === charId);
}

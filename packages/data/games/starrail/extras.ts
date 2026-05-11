import type { StarRailCharacterMaterials } from './types';
import rawCharacterMaterials from './raw-character-materials.json';

export const characterMaterials: StarRailCharacterMaterials[] =
  rawCharacterMaterials as unknown as StarRailCharacterMaterials[];

export function getMaterialsForCharacter(charId: string): StarRailCharacterMaterials | undefined {
  return characterMaterials.find((m) => m.characterId === charId);
}

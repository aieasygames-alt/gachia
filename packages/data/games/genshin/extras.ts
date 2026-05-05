import type { GenshinCharacterMaterials } from './types';
import rawCharacterMaterials from './raw-character-materials.json';

export const characterMaterials: GenshinCharacterMaterials[] = rawCharacterMaterials as unknown as GenshinCharacterMaterials[];

export function getMaterialsForCharacter(charId: string): GenshinCharacterMaterials | undefined {
  return characterMaterials.find((m) => m.characterId === charId);
}

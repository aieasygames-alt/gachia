import type { AnantaCharacterMaterials } from './types';
import rawData from './raw-character-materials.json';

export const characterMaterials: AnantaCharacterMaterials[] = rawData as unknown as AnantaCharacterMaterials[];

export function getMaterialsForCharacter(charId: string): AnantaCharacterMaterials | undefined {
  return characterMaterials.find((cm) => cm.characterId === charId);
}

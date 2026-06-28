import rawData from './raw-character-materials.json';

// CRITICAL FIX: Define proper types instead of using never[]
interface CharacterMaterial {
  characterId: string;
  materials: Array<{
    materialId: string;
    quantity: number;
  }>;
}

export const characterMaterials: CharacterMaterial[] = rawData as CharacterMaterial[];

export function getMaterialsForCharacter(charId: string): CharacterMaterial | undefined {
  return characterMaterials.find(cm => cm.characterId === charId);
}

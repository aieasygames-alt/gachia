import type { GuihuanCharacterMaterials } from './types';
import rawCharacterMaterials from './raw-character-materials.json';

export const characterMaterials: GuihuanCharacterMaterials[] = rawCharacterMaterials as unknown as GuihuanCharacterMaterials[];

export function getMaterialsForCharacter(charId: string): GuihuanCharacterMaterials | undefined {
  return characterMaterials.find((m) => m.characterId === charId);
}

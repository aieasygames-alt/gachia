import type { AnantaCharacterMaterials } from './types';
import { join } from 'node:path';
import { loadJson } from '../../load-json';

const rawData = await loadJson<unknown>(
  join(process.cwd(), '../../packages/data/games/ananta/raw-character-materials.json'),
  '/data/ananta/raw-character-materials.json',
);

export const characterMaterials: AnantaCharacterMaterials[] = rawData as AnantaCharacterMaterials[];

export function getMaterialsForCharacter(charId: string): AnantaCharacterMaterials | undefined {
  return characterMaterials.find((cm) => cm.characterId === charId);
}

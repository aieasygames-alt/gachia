import rawCharacterMaterials from './raw-character-materials.json';

export interface WuWaMaterialEntry {
  id: string;
  quantity: number;
}

export interface WuWaMaterialPhase {
  levelRange: string;
  materials: WuWaMaterialEntry[];
}

export interface WuWaCharacterMaterials {
  characterId: string;
  rarity: number;
  ascensionMaterials: WuWaMaterialPhase[];
  skillMaterials: WuWaMaterialPhase[];
}

export const characterMaterials: WuWaCharacterMaterials[] =
  rawCharacterMaterials as unknown as WuWaCharacterMaterials[];

export function getMaterialsForCharacter(
  charId: string,
): WuWaCharacterMaterials | undefined {
  return characterMaterials.find((m) => m.characterId === charId);
}

/**
 * Aggregate materials across a level range for a character.
 * Returns a map of materialId → total quantity.
 */
export function aggregateMaterials(
  charId: string,
  options: {
    fromLevel: number;
    toLevel: number;
    includeSkills?: boolean;
    skillFrom?: number;
    skillTo?: number;
  },
): Record<string, number> {
  const data = getMaterialsForCharacter(charId);
  if (!data) return {};

  const agg: Record<string, number> = {};

  const levels = [1, 20, 40, 50, 60, 70, 80];
  for (const phase of data.ascensionMaterials) {
    const [lo, hi] = phase.levelRange.split('-').map(Number);
    if ((lo ?? 0) >= options.fromLevel && (hi ?? 0) <= options.toLevel) {
      for (const m of phase.materials) {
        agg[m.id] = (agg[m.id] || 0) + m.quantity;
      }
    }
  }

  if (options.includeSkills && data.skillMaterials) {
    for (const phase of data.skillMaterials) {
      const [lo, hi] = phase.levelRange.split('-').map(Number);
      const sFrom = options.skillFrom ?? 1;
      const sTo = options.skillTo ?? 10;
      if ((lo ?? 0) >= sFrom && (hi ?? 0) <= sTo) {
        for (const m of phase.materials) {
          agg[m.id] = (agg[m.id] || 0) + m.quantity;
        }
      }
    }
  }

  return agg;
}

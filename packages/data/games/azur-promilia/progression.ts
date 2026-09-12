import type { SupportedLocale } from '@gachia/core';

export type AzurProgressionTarget = 'character' | 'weapon' | 'kibo';

export type AzurProgressionMaterial = {
  id: string;
  name: Record<SupportedLocale, string>;
  quantities: number[];
  source: Record<SupportedLocale, string>;
  status: 'official' | 'reference' | 'unverified';
};

export type AzurProgressionPlan = {
  target: AzurProgressionTarget;
  targetId: string;
  currentLevel: number;
  targetLevel: number;
  materials: AzurProgressionMaterial[];
};

// Deliberately empty until official release costs are verified.
export const progressionMaterials: AzurProgressionMaterial[] = [];

export function getProgressionMaterials(targetId: string) {
  return progressionMaterials.filter((material) => material.id === targetId);
}

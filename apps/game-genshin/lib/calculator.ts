import type { GenshinCharacter, GenshinCharacterMaterials, GenshinMaterial } from '@gachia/data/games/genshin/types';

export type CalculatorCharacter = Pick<GenshinCharacter, 'id' | 'name' | 'nameEn' | 'nameJa' | 'element' | 'rarity'> & { image: string };
export type CalculatorCatalog = { characters: CalculatorCharacter[]; requirements: GenshinCharacterMaterials[]; materials: GenshinMaterial[] };
export type MaterialRange = { from: number; to: number; talentFrom: number; talentTo: number };
export const CHARACTER_LEVELS = [1, 20, 40, 50, 60, 70, 80, 90];
export const TALENT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DEFAULT_RANGE: MaterialRange = { from: 1, to: 90, talentFrom: 1, talentTo: 10 };
export const OWNED_MATERIALS_KEY = 'gachia-owned-materials';

export function calculateMaterials(requirements: GenshinCharacterMaterials[], characterIds: string[], range: MaterialRange) {
  if (!CHARACTER_LEVELS.includes(range.from) || !CHARACTER_LEVELS.includes(range.to) || range.from > range.to
    || !TALENT_LEVELS.includes(range.talentFrom) || !TALENT_LEVELS.includes(range.talentTo) || range.talentFrom > range.talentTo) {
    throw new Error('Invalid material range');
  }
  const quantities = new Map<string, number>(), missingCharacters: string[] = [];
  let invalidRows = 0;
  const add = (materials: Array<{ id: string; quantity: number }>) => {
    for (const material of materials) {
      if (!material.id || !Number.isSafeInteger(material.quantity) || material.quantity <= 0) { invalidRows++; continue; }
      const total = (quantities.get(material.id) ?? 0) + material.quantity;
      if (!Number.isSafeInteger(total)) { invalidRows++; continue; }
      quantities.set(material.id, total);
    }
  };
  for (const id of new Set(characterIds)) {
    const data = requirements.find(row => row.characterId === id);
    if (!data || (!data.ascensionMaterials.length && !data.talentMaterials.length)) { missingCharacters.push(id); continue; }
    for (const row of data.ascensionMaterials) {
      const match = /^(\d+)-(\d+)$/.exec(row.levelRange);
      if (!match || Number(match[1]) >= Number(match[2])) { invalidRows++; continue; }
      if (range.from < range.to && Number(match[2]) > range.from && Number(match[1]) < range.to) add(row.materials);
    }
    for (const row of data.talentMaterials) {
      // Parse the transition's start, not both digits concatenated (1→2 is not 12).
      const match = /^(\d+)\D+(\d+)$/.exec(row.talentLevel);
      if (!match || Number(match[2]) !== Number(match[1]) + 1) { invalidRows++; continue; }
      if (Number(match[1]) >= range.talentFrom && Number(match[1]) < range.talentTo) add(row.materials);
    }
  }
  return { items: Array.from(quantities, ([id, quantity]) => ({ id, quantity })), missingCharacters, invalidRows };
}

export function ownedQuantity(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0;
}

export function parseOwnedMaterials(raw: string | null): Record<string, number> {
  if (!raw) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid inventory');
  return Object.fromEntries(Object.entries(value).filter(([id, quantity]) => !['__proto__', 'prototype', 'constructor'].includes(id)
    && typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity >= 0));
}

export type DamageStats = { baseAtk: number; atkPercent: number; flatAtk: number; critRate: number; critDmg: number; dmgBonus: number; skillMult: number };
export const DEFAULT_DAMAGE: DamageStats = { baseAtk: 300, atkPercent: 46.6, flatAtk: 311, critRate: 60, critDmg: 120, dmgBonus: 46.6, skillMult: 300 };
export function calculateDamage(stats: DamageStats) {
  if (Object.values(stats).some(value => !Number.isFinite(value) || value < 0) || stats.critRate > 100) return null;
  const totalAtk = stats.baseAtk * (1 + stats.atkPercent / 100) + stats.flatAtk;
  const base = totalAtk * (stats.skillMult / 100) * (1 + stats.dmgBonus / 100);
  const result = { totalAtk, average: base * (1 + stats.critRate / 100 * stats.critDmg / 100), critical: base * (1 + stats.critDmg / 100), critValue: stats.critRate * stats.critDmg / 100 };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

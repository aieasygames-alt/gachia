// Structured character publications are independent of the legacy build/tier database.
export const STARRAIL_CMS_CHARACTERS = { aha: 'aha-character-data', yaoguang: 'yaoguang-character-data', 'silver-wolf-lv999': 'silver-wolf-lv999-character-data', sparxie: 'sparxie-character-data', acheron: 'acheron-character-data' } as const;
export const STARRAIL_CMS_CHARACTER_ALIASES = { 'yao-guang': 'yaoguang' } as const;
export const STARRAIL_CMS_CHARACTER_NAMES = { aha: { zh: '阿哈', en: 'Aha', ja: 'Aha' }, yaoguang: { zh: '爻光', en: 'Yao Guang', ja: 'Yao Guang' }, 'silver-wolf-lv999': { zh: '银狼LV.999', en: 'Silver Wolf LV.999', ja: 'Silver Wolf LV.999' }, sparxie: { zh: '火花', en: 'Sparxie', ja: 'Sparxie' }, acheron: { zh: '黄泉', en: 'Acheron', ja: '黄泉' } } as const;
const ordinarySkills = ['basic', 'skill', 'ultimate', 'talent'] as const;
const elationSkills = [...ordinarySkills, 'elation'] as const;
const characterSkills = { aha: elationSkills, yaoguang: elationSkills, 'silver-wolf-lv999': elationSkills, sparxie: elationSkills, acheron: ordinarySkills } satisfies Record<keyof typeof STARRAIL_CMS_CHARACTERS, readonly string[]>;
export type MaterialCost = { name: string; quantity: number }[];
export type VerifiedStarRailCharacter = {
  id: keyof typeof STARRAIL_CMS_CHARACTERS;
  name: string;
  identity: string;
  materialNote: string;
  skills: {
    key: string; label: string; name: string; trainableMax: number; note: string;
    columns: string[];
    levels: { level: number; values: string[] }[];
    upgrades: { toLevel: number; materials: MaterialCost }[];
  }[];
  ascensions: { stage: number; atLevel: number; materials: MaterialCost }[];
  nodes: { id: string; name: string; materials: MaterialCost }[];
};

const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const integer = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
const unique = (values: unknown[]) => new Set(values).size === values.length;
function costs(v: unknown): v is MaterialCost {
  return Array.isArray(v) && v.length > 0 && v.length <= 20 && v.every(c => object(c) && text(c.name, 100) && integer(c.quantity, 1, 100000000)) && unique(v.map(c => c.name));
}
const cleanCost = (v: MaterialCost): MaterialCost => v.map(({ name, quantity }) => ({ name, quantity }));

export function parseStarRailCharacter(input: unknown): VerifiedStarRailCharacter | null {
  if (!object(input) || typeof input.id !== 'string' || !Object.hasOwn(STARRAIL_CMS_CHARACTERS, input.id) || !text(input.name, 100) || !text(input.identity, 200) || !text(input.materialNote)) return null;
  const keys: readonly string[] = characterSkills[input.id as keyof typeof characterSkills];
  if (!Array.isArray(input.skills) || input.skills.length !== keys.length || !unique(input.skills.map(s => object(s) ? s.key : null))) return null;
  const expected = { basic: [6, 7], skill: [10, 12], ultimate: [10, 12], talent: [10, 12], elation: [10, 12] } as const;
  for (const s of input.skills) {
    if (!object(s) || typeof s.key !== 'string' || !keys.includes(s.key) || !Object.hasOwn(expected, s.key) || !text(s.label, 100) || !text(s.name, 100) || !text(s.note)) return null;
    const [cap, displayCap] = expected[s.key as keyof typeof expected];
    if (s.trainableMax !== cap || !Array.isArray(s.columns) || s.columns.length < 1 || s.columns.length > 6 || !s.columns.every(c => text(c, 100))) return null;
    const columnCount = s.columns.length;
    if (!Array.isArray(s.levels) || s.levels.length !== displayCap || !s.levels.every((r, i) => object(r) && r.level === i + 1 && Array.isArray(r.values) && r.values.length === columnCount && r.values.every(v => text(v, 100)))) return null;
    if (!Array.isArray(s.upgrades) || s.upgrades.length !== cap - 1 || !s.upgrades.every((r, i) => object(r) && r.toLevel === i + 2 && costs(r.materials))) return null;
  }
  if (!Array.isArray(input.ascensions) || input.ascensions.length !== 6 || !input.ascensions.every((r, i) => object(r) && r.stage === i + 1 && r.atLevel === 20 + i * 10 && costs(r.materials))) return null;
  if (!Array.isArray(input.nodes) || input.nodes.length !== 13 || !input.nodes.every(n => object(n) && text(n.id, 100) && text(n.name, 100) && costs(n.materials)) || !unique(input.nodes.map(n => n.id))) return null;
  const p = input as unknown as VerifiedStarRailCharacter;
  return {
    id: p.id, name: p.name, identity: p.identity, materialNote: p.materialNote,
    skills: p.skills.map(s => ({ key: s.key, label: s.label, name: s.name, trainableMax: s.trainableMax, note: s.note, columns: [...s.columns], levels: s.levels.map(r => ({ level: r.level, values: [...r.values] })), upgrades: s.upgrades.map(r => ({ toLevel: r.toLevel, materials: cleanCost(r.materials) })) })),
    ascensions: p.ascensions.map(r => ({ stage: r.stage, atLevel: r.atLevel, materials: cleanCost(r.materials) })),
    nodes: p.nodes.map(n => ({ id: n.id, name: n.name, materials: cleanCost(n.materials) })),
  };
}

export interface CharacterMaterialPlan {
  ascensionFrom: number; ascensionTo: number;
  skills: Record<string, { from: number; to: number }>;
  nodes: string[];
}
export function fullCharacterMaterialPlan(p: VerifiedStarRailCharacter): CharacterMaterialPlan {
  return { ascensionFrom: 0, ascensionTo: 6, skills: Object.fromEntries(p.skills.map(s => [s.key, { from: 1, to: s.trainableMax }])), nodes: p.nodes.map(n => n.id) };
}
// Return null for invalid/unknown selections; never show a plausible partial total.
export function calculateCharacterMaterials(p: VerifiedStarRailCharacter, plan: CharacterMaterialPlan): MaterialCost | null {
  if (!integer(plan.ascensionFrom, 0, 6) || !integer(plan.ascensionTo, plan.ascensionFrom, 6) || !unique(plan.nodes) || plan.nodes.some(id => !p.nodes.some(n => n.id === id)) || Object.keys(plan.skills).length !== p.skills.length) return null;
  const selected: MaterialCost[] = p.ascensions.filter(r => r.stage > plan.ascensionFrom && r.stage <= plan.ascensionTo).map(r => r.materials);
  for (const s of p.skills) {
    const range = plan.skills[s.key];
    if (!range || !integer(range.from, 1, s.trainableMax) || !integer(range.to, range.from, s.trainableMax)) return null;
    selected.push(...s.upgrades.filter(r => r.toLevel > range.from && r.toLevel <= range.to).map(r => r.materials));
  }
  selected.push(...p.nodes.filter(n => plan.nodes.includes(n.id)).map(n => n.materials));
  const totals = new Map<string, number>();
  for (const cost of selected) for (const { name, quantity } of cost) totals.set(name, (totals.get(name) ?? 0) + quantity);
  return Array.from(totals, ([name, quantity]) => ({ name, quantity }));
}

import { describe, expect, it } from 'vitest';
import batch from '../../../reports/starrail-yaoguang-2026-11-26/batch.json';
import totals from '../../../reports/starrail-yaoguang-2026-11-26/verified-totals.json';
import { parseStarRailUpdate, isCommunityStarRailSource } from '../cms/starrail-updates';
import { parseStarRailCharacter, calculateCharacterMaterials, fullCharacterMaterialPlan } from '../cms/starrail-character';
const doc = batch.creates[0]!;
const character = parseStarRailCharacter(doc.characterData)!;
const full = fullCharacterMaterialPlan(character);
const asObject = (cost: ReturnType<typeof calculateCharacterMaterials>) => Object.fromEntries(cost!.map(c => [c.name, c.quantity]));
describe('Yao Guang independent character publication', () => {
  it('accepts the registered publication and audited sources while rejecting wrong ownership', () => {
    expect(parseStarRailUpdate(doc)?.characterData).toEqual(character);
    expect(doc.sources.every(s => isCommunityStarRailSource(s.url))).toBe(true);
    for (const altered of [{ ...doc, slug: 'aha-character-data' }, { ...doc, characterData: { ...character, id: 'constructor' } }, { ...doc, characterData: { ...character, id: 'unknown' } }]) expect(parseStarRailUpdate(altered)).toBeNull();
  });
  it('preserves exact fractional multipliers and the complete reviewed material totals', () => {
    expect(character.skills.find(s => s.key === 'elation')!.levels[6]!.values).toEqual(['81.25%', '16.25%']);
    expect(asObject(calculateCharacterMaterials(character, full))).toEqual(totals);
  });
  it('separates Elation, ordinary skill, basic and individual node costs', () => {
    const none = { ...full, ascensionFrom: 6, nodes: [], skills: Object.fromEntries(character.skills.map(s => [s.key, { from: s.trainableMax, to: s.trainableMax }])) };
    expect(calculateCharacterMaterials(character, none)).toEqual([]);
    expect(asObject(calculateCharacterMaterials(character, { ...none, skills: { ...none.skills, elation: { from: 7, to: 10 } } }))).toEqual({ '信用点': 435000, '《绒绒号》典藏版合集': 22, '梦现管锥': 12 });
    expect(asObject(calculateCharacterMaterials(character, { ...none, skills: { ...none.skills, basic: { from: 1, to: 2 } } }))).toEqual({ '信用点': 4000, '《绒绒号》手绘分镜稿': 2, '童真蜡笔': 5 });
    expect(asObject(calculateCharacterMaterials(character, { ...none, nodes: ['1502103'] }))).toEqual({ '信用点': 140000, '《绒绒号》典藏版合集': 8, '命运的足迹': 1, '灭流绝溢的缄默': 1 });
    expect(asObject(calculateCharacterMaterials(character, { ...none, skills: { ...none.skills, skill: { from: 7, to: 10 } } }))['灭流绝溢的缄默']).toBe(3);
    expect(calculateCharacterMaterials(character, { ...full, skills: { ...full.skills, basic: { from: 1, to: 7 } } })).toBeNull();
  });
});

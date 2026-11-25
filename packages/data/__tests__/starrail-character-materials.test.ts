import { describe, expect, it } from 'vitest';
import batch from '../../../reports/starrail-structured-character-2026-11-25/batch.json';
import { parseStarRailUpdate } from '../cms/starrail-updates';
import { calculateCharacterMaterials, fullCharacterMaterialPlan, parseStarRailCharacter } from '../cms/starrail-character';

const doc = batch.creates[0]!;
const profile = parseStarRailCharacter(doc.characterData)!;
const full = fullCharacterMaterialPlan(profile);
const quantities = (value: ReturnType<typeof calculateCharacterMaterials>) => Object.fromEntries(value!.map(c => [c.name, c.quantity]));
describe('verified Aha materials and publication contract', () => {
  it('reproduces independently reviewed full ascension and trace totals', () => {
    expect(quantities(calculateCharacterMaterials(profile, full))).toEqual({ '信用点': 3308000, '童真蜡笔': 56, '造梦蘸钢': 71, '梦现管锥': 73, '嗤笑丑面': 65, '《绒绒号》手绘分镜稿': 18, '《绒绒号》连载纪念刊': 69, '《绒绒号》典藏版合集': 139, '伪觉者的期许': 12, '命运的足迹': 8 });
  });
  it('counts only uncompleted ascensions and skill levels, including Elation-specific costs', () => {
    const none = { ascensionFrom: 6, ascensionTo: 6, skills: Object.fromEntries(profile.skills.map(s => [s.key, { from: s.trainableMax, to: s.trainableMax }])), nodes: [] };
    expect(calculateCharacterMaterials(profile, none)).toEqual([]);
    expect(quantities(calculateCharacterMaterials(profile, { ...none, ascensionFrom: 2, ascensionTo: 3 }))).toEqual({ '信用点': 16000, '造梦蘸钢': 6, '嗤笑丑面': 3 });
    expect(quantities(calculateCharacterMaterials(profile, { ...none, skills: { ...none.skills, elation: { from: 7, to: 10 } } }))).toEqual({ '信用点': 435000, '《绒绒号》典藏版合集': 22, '梦现管锥': 12 });
    expect(quantities(calculateCharacterMaterials(profile, { ...none, skills: { ...none.skills, skill: { from: 7, to: 10 } } }))['伪觉者的期许']).toBe(3);
    expect(quantities(calculateCharacterMaterials(profile, { ...none, nodes: ['1511101'] }))).toEqual({ '信用点': 5000, '《绒绒号》手绘分镜稿': 2, '伪觉者的期许': 1 });
  });
  it('refuses impossible ranges, duplicate/unknown nodes and star-soul material targets', () => {
    for (const plan of [{ ...full, ascensionFrom: 6, ascensionTo: 1 }, { ...full, nodes: ['unknown'] }, { ...full, nodes: ['1511101', '1511101'] }, { ...full, skills: { ...full.skills, basic: { from: 1, to: 7 } } }, { ...full, skills: { ...full.skills, elation: { from: 1, to: 12 } } }]) expect(calculateCharacterMaterials(profile, plan)).toBeNull();
  });
  it('rejects incomplete, misassigned, negative or duplicate data before publication', () => {
    expect(parseStarRailUpdate(doc)?.characterData).toEqual(profile);
    for (const changed of [{ ...doc, kind: 'event' }, { ...doc, slug: 'different-owner' }, { ...doc, characterData: { ...profile, nodes: profile.nodes.slice(1) } }, { ...doc, characterData: { ...profile, skills: profile.skills.slice(1) } }, { ...doc, characterData: { ...profile, ascensions: profile.ascensions.map(r => ({ ...r, materials: [{ name: '信用点', quantity: -1 }] })) } }]) expect(parseStarRailUpdate(changed)).toBeNull();
    const withInternalFields = { ...doc, characterData: { ...profile, internalSecret: 'hidden' } };
    expect(JSON.stringify(parseStarRailUpdate(withInternalFields))).not.toContain('internalSecret');
  });
});

import { describe, expect, it } from 'vitest';
import batch from '../../../reports/starrail-silverwolf-999-2026-11-26/batch.json';
import totals from '../../../reports/starrail-silverwolf-999-2026-11-26/verified-totals.json';
import { parseStarRailUpdate } from '../cms/starrail-updates';
import { parseStarRailCharacter, calculateCharacterMaterials, fullCharacterMaterialPlan } from '../cms/starrail-character';
const doc = batch.creates[0]!;
const character = parseStarRailCharacter(doc.characterData)!;
const full = fullCharacterMaterialPlan(character);
const asObject = (plan: Parameters<typeof calculateCharacterMaterials>[1]) => Object.fromEntries(calculateCharacterMaterials(character, plan)!.map(c => [c.name, c.quantity]));
describe('Silver Wolf LV.999 verified publication', () => {
  it('keeps the separate form and ownership without replacing original Silver Wolf', () => {
    expect(parseStarRailUpdate(doc)?.characterData?.id).toBe('silver-wolf-lv999');
    expect(parseStarRailUpdate({ ...doc, slug: 'aha-character-data' })).toBeNull();
    expect(parseStarRailCharacter({ ...character, id: 'silver-wolf' })).toBeNull();
  });
  it('includes enhanced forms sharing levels, exact reviewed precision and all material totals', () => {
    expect(character.skills[0]!.levels[5]!.values).toEqual(['100%', '240%', '100%']);
    expect(character.skills[2]!.levels[6]!.values).toEqual(['73.125%']);
    expect(character.skills[3]!.levels[6]!.values).toEqual(['0.33%', '0.65%', '32.5%']);
    expect(character.skills[3]!.levels[8]!.values).toEqual(['0.38%', '0.75%', '37.5%']);
    expect(character.skills[4]!.levels[8]!.values).toEqual(['84.375%']);
    expect(asObject(full)).toEqual(totals);
  });
  it('counts Elation, ordinary skill, ascension and individual node costs independently', () => {
    const none = { ...full, ascensionFrom: 6, nodes: [], skills: Object.fromEntries(character.skills.map(s => [s.key, { from: s.trainableMax, to: s.trainableMax }])) };
    expect(asObject(none)).toEqual({});
    const late = (key: string) => ({ ...none, skills: { ...none.skills, [key]: { from: 7, to: 10 } } });
    expect(asObject(late('elation'))).toEqual({ '信用点': 435000, '《绒绒号》典藏版合集': 22, '梦现管锥': 12 });
    expect(asObject(late('skill'))['灭流绝溢的缄默']).toBe(3);
    expect(asObject({ ...none, nodes: ['1506103'] })).toEqual({ '信用点': 140000, '《绒绒号》典藏版合集': 8, '命运的足迹': 1, '灭流绝溢的缄默': 1 });
    expect(asObject({ ...none, ascensionFrom: 0 })['纷争先兆']).toBe(65);
    expect(calculateCharacterMaterials(character, { ...full, skills: { ...full.skills, basic: { from: 1, to: 7 } } })).toBeNull();
  });
});

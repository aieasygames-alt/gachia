import { describe, expect, it } from 'vitest';
import batch from '../../../reports/starrail-sparxie-2026-11-26/batch.json';
import totals from '../../../reports/starrail-sparxie-2026-11-26/verified-totals.json';
import { parseStarRailUpdate } from '../cms/starrail-updates';
import { parseStarRailCharacter, calculateCharacterMaterials, fullCharacterMaterialPlan } from '../cms/starrail-character';
const doc = batch.creates[0]!;
const character = parseStarRailCharacter(doc.characterData)!;
const full = fullCharacterMaterialPlan(character);
const asObject = (plan: Parameters<typeof calculateCharacterMaterials>[1]) => Object.fromEntries(calculateCharacterMaterials(character, plan)!.map(c => [c.name, c.quantity]));
describe('Sparxie verified publication', () => {
  it('keeps the separate form and ownership without replacing original Sparkle', () => {
    expect(parseStarRailUpdate(doc)?.characterData?.id).toBe('sparxie');
    expect(parseStarRailUpdate({ ...doc, slug: 'aha-character-data' })).toBeNull();
    expect(parseStarRailCharacter({ ...character, id: 'sparkle' })).toBeNull();
  });
  it('includes enhanced forms sharing levels, exact reviewed precision and all material totals', () => {
    expect(character.skills[0]!.levels[5]!.values).toEqual(['100%', '100%', '50%']);
    expect(character.skills[1]!.levels[6]!.values).toEqual(['16.25%', '8.13%']);
    expect(character.skills[2]!.levels[9]!.values).toEqual(['50%']);
    expect(character.skills[2]!.note).toContain('0.6');
    expect(character.skills[3]!.levels[6]!.values).toEqual(['32.5%', '16.25%', '16.25%', '39%']);
    expect(character.skills[4]!.levels[6]!.values).toEqual(['40.625%', '20.3125%']);
    expect(character.skills[4]!.levels[8]!.values).toEqual(['46.875%', '23.4375%']);
    expect(asObject(full)).toEqual(totals);
  });
  it('counts Elation, ordinary skill, ascension and individual node costs independently', () => {
    const none = { ...full, ascensionFrom: 6, nodes: [], skills: Object.fromEntries(character.skills.map(s => [s.key, { from: s.trainableMax, to: s.trainableMax }])) };
    expect(asObject(none)).toEqual({});
    const late = (key: string) => ({ ...none, skills: { ...none.skills, [key]: { from: 7, to: 10 } } });
    expect(asObject(late('elation'))).toEqual({ '信用点': 435000, '《绒绒号》典藏版合集': 22, '梦现管锥': 12 });
    expect(asObject(late('skill'))['灭流绝溢的缄默']).toBe(3);
    expect(asObject({ ...none, nodes: ['1501103'] })).toEqual({ '信用点': 140000, '《绒绒号》典藏版合集': 8, '命运的足迹': 1, '灭流绝溢的缄默': 1 });
    expect(asObject({ ...none, ascensionFrom: 0 })['明辉日珥']).toBe(65);
    expect(calculateCharacterMaterials(character, { ...full, skills: { ...full.skills, basic: { from: 1, to: 7 } } })).toBeNull();
  });
});

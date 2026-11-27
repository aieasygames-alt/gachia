import { describe, expect, it } from 'vitest';
import batch from '../../../reports/starrail-acheron-2026-11-27/batch.json';
import elationBatch from '../../../reports/starrail-sparxie-2026-11-26/batch.json';
import totals from '../../../reports/starrail-acheron-2026-11-27/verified-totals.json';
import { parseStarRailUpdate } from '../cms/starrail-updates';
import { parseStarRailCharacter, calculateCharacterMaterials, fullCharacterMaterialPlan } from '../cms/starrail-character';
const doc = batch.creates[0]!;
const character = parseStarRailCharacter(doc.characterData)!;
const full = fullCharacterMaterialPlan(character);
const asObject = (plan: Parameters<typeof calculateCharacterMaterials>[1]) => Object.fromEntries(calculateCharacterMaterials(character, plan)!.map(c => [c.name, c.quantity]));
describe('Acheron four-skill verified publication', () => {
  it('requires the exact registered four/five skill sets and canonical owner', () => {
    expect(parseStarRailUpdate(doc)?.characterData?.id).toBe('acheron');
    expect(parseStarRailUpdate({ ...doc, slug: 'aha-character-data' })).toBeNull();
    expect(parseStarRailCharacter({ ...character, skills: character.skills.slice(0, 3) })).toBeNull();
    expect(parseStarRailCharacter({ ...character, skills: [...character.skills, elationBatch.creates[0]!.characterData.skills[4]] })).toBeNull();
    expect(parseStarRailCharacter({ ...character, skills: [...character.skills.slice(0, 3), { ...character.skills[3], key: 'elation' }] })).toBeNull();
    expect(parseStarRailCharacter({ ...elationBatch.creates[0]!.characterData, skills: elationBatch.creates[0]!.characterData.skills.slice(0, 4) })).toBeNull();
  });
  it('preserves exact ultimate components and verified display precision', () => {
    expect(character.skills[1]!.levels[6]!.values).toEqual(['130%', '48.75%']);
    expect(character.skills[2]!.levels[1]!.values[0]).toBe('238.08%');
    expect(character.skills[2]!.levels[9]!.values).toEqual(['372%', '300%', '24%', '15%', '60%', '120%']);
    expect(character.skills[3]!.levels[6]!.values).toEqual(['16.25%']);
    expect(asObject(full)).toEqual(totals);
    expect(Object.keys(full.skills)).toEqual(['basic', 'skill', 'ultimate', 'talent']);
  });
  it('budgets one ultimate upgrade, individual nodes and ascensions without phantom Elation costs', () => {
    const none = { ...full, ascensionFrom: 6, nodes: [], skills: Object.fromEntries(character.skills.map(s => [s.key, { from: s.trainableMax, to: s.trainableMax }])) };
    expect(asObject(none)).toEqual({});
    expect(asObject({ ...none, skills: { ...none.skills, ultimate: { from: 7, to: 10 } } })).toEqual({ '信用点': 540000, '焚天之魔': 27, '蛀星孕灾的旧恶': 3, '造梦马达': 4, '命运的足迹': 2 });
    expect(asObject({ ...none, nodes: ['1308103'] })).toEqual({ '信用点': 160000, '焚天之魔': 8, '命运的足迹': 1, '蛀星孕灾的旧恶': 1 });
    expect(asObject({ ...none, ascensionFrom: 0 })).toEqual({ '信用点': 308000, '蓄梦元件': 15, '流梦阀门': 15, '造梦马达': 15, '炼形者雷枝': 65 });
    expect(calculateCharacterMaterials(character, { ...full, skills: { ...full.skills, elation: { from: 1, to: 10 } } })).toBeNull();
    expect(calculateCharacterMaterials(character, { ...full, skills: { ...full.skills, ultimate: { from: 1, to: 12 } } })).toBeNull();
  });
});

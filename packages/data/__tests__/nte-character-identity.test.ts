import { describe, expect, it } from 'vitest';
import rawCharacters from '../games/nte/raw-characters.json';
import rawCharacterMaterials from '../games/nte/raw-character-materials.json';
import rawMaterials from '../games/nte/raw-materials.json';
import {
  nteCharacterDisplayIds,
  nteCharacterMaterialRelationId,
  resolveNteCharacterReference,
} from '../games/nte/character-identity';

describe('NTE canonical character identity', () => {
  it('keeps Zero as one material relation while exposing both page variants', () => {
    const characterIds = rawCharacters.map(character => character.id);
    const relation = rawCharacterMaterials.find(row => row.characterId === 'zero');

    expect(relation).toBeDefined();
    expect(nteCharacterMaterialRelationId('zero-male')).toBe('zero');
    expect(nteCharacterMaterialRelationId('zero-female')).toBe('zero');
    expect(nteCharacterDisplayIds('zero')).toEqual(['zero-male', 'zero-female']);
    expect(resolveNteCharacterReference('zero', characterIds)?.displayVariantIds).toEqual(['zero-male', 'zero-female']);
  });

  it('does not fuzzy-match unknown variants or incomplete canonical data', () => {
    expect(resolveNteCharacterReference('zero-copy', ['zero-male', 'zero-female'])).toBeNull();
    expect(() => resolveNteCharacterReference('zero', ['zero-male'])).toThrow(/missing display variants/);
  });

  it('keeps every published material relationship source-bound after held references are removed', () => {
    const materialIds = new Set(rawMaterials.map(material => material.id));
    const characterIds = new Set(rawCharacters.map(character => character.id));
    const references = rawCharacterMaterials.flatMap(relation => [
      ...relation.levelingMaterials.flatMap(row => row.materials),
      ...relation.skillMaterials,
    ]);

    expect(references.length).toBe(42);
    expect(references.every(material => materialIds.has(material.id))).toBe(true);
    expect(rawCharacterMaterials.every(relation => relation.levelingMaterials.every(row => row.materials.length > 0))).toBe(true);
    expect(rawCharacterMaterials.every(relation => characterIds.has(relation.characterId)
      || (relation.characterId === 'zero' && characterIds.has('zero-male') && characterIds.has('zero-female')))).toBe(true);
  });
});


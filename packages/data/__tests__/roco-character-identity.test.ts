import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import rawCharacters from '../games/roco/raw-characters.json';
import { characters, getRocoCharacterImage, getRocoCharacterName, rocoCharacters } from '../games/roco/characters';
import { getRocoLegacyCharacterById, getRocoLegacyCharacterName, rocoLegacyCharacterEntries } from '../games/roco/character-review';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-11-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));

it('preserves original records privately while publishing only URL correction records', () => {
  const archived = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/archive/s2-14/characters.json', import.meta.url), 'utf8'));
  expect(archived).toEqual(proof.originalCharacters);
  expect(rawCharacters).toEqual(rocoLegacyCharacterEntries);
  expect(characters).toEqual([]);
  expect(rocoLegacyCharacterEntries.map(row => row.id)).toEqual(proof.originalCharacters.map((row: { id: string }) => row.id));
  expect(rocoLegacyCharacterEntries).toHaveLength(6);
  for (const row of rocoLegacyCharacterEntries) {
    expect(Object.keys(row).sort()).toEqual(['contentReview', 'id']);
    expect(getRocoLegacyCharacterById(row.id)).toBe(row);
    expect(row.contentReview.status).toBe('needs_verification');
  }
  for (const id of ['', 'missing', 'meewee/extra']) expect(getRocoLegacyCharacterById(id)).toBeUndefined();
});

it.each(['zh', 'en', 'ja'] as const)('does not promote legacy names or images through compatibility helpers in %s', locale => {
  for (const row of rocoCharacters) {
    const name = getRocoLegacyCharacterName(row.id, locale);
    expect(name).toBe(`${{ zh: '历史条目', en: 'Legacy entry', ja: '過去の項目' }[locale]} · ${row.id}`);
    expect(getRocoCharacterName(row, locale)).toBe(name);
    expect(getRocoCharacterImage(row)).toBe('');
  }
});

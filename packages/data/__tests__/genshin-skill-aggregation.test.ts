import { describe, expect, it, vi } from 'vitest';
import type { GenshinCharacter } from '../games/genshin/types';

const captured = vi.hoisted(() => ({ original: [] as GenshinCharacter[], added: [] as GenshinCharacter[] }));

// Exercise the production generic adapter with the sealed, unpublished R137
// input. Vitest isolates this mock; no raw data or other game dataset is edited.
vi.mock('../games/genshin/raw-characters.json', async () => {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { gunzipSync } = await import('node:zlib');
  const fixture = JSON.parse(gunzipSync(readFileSync(new URL('../../../services/content-cms/reviews/2026-11-20-genshin-completion-r137.json.gz', import.meta.url))).toString('utf8'));
  const review = readFileSync(new URL('../../../reports/genshin-specialty-characters-2026-11-20-r137/character-definition-candidates.json', import.meta.url));
  if (createHash('sha256').update(review).digest('hex') !== '4937f5ec3b27fce389f419c596375ae61ab0f5d43f6d3fa30f43431bdfb909a0') {
    throw new Error('R137 character definition fixture changed');
  }
  captured.original = JSON.parse(fixture.sources.find((row: { sourcePath: string }) => row.sourcePath.endsWith('/raw-characters.json')).text);
  captured.added = JSON.parse(review.toString('utf8')).reviews.map((row: { record: GenshinCharacter }) => row.record);
  return { default: [...captured.original, ...captured.added] };
});

import { CharacterSchema } from '@gachia/core';
import { characters } from '../games/genshin/characters';
import { getGameData } from '../lib/game-data-access';
import { getGameData as getPublicGameData } from '../index';

describe('Genshin generic skill aggregation with real R137 candidates', () => {
  it('retains both Nightsoul passives and Ororon’s special jump with distinct IDs and categories', () => {
    for (const source of captured.added) {
      const character = characters.find(row => row.id === source.id)!;
      const ids = ['normal-attack', 'elemental-skill', 'elemental-burst',
        ...(source.id === 'ororon' ? ['special-jump'] : []), 'passive-1', 'passive-2', 'passive-3', 'passive-4'];
      expect(character.skills.map(row => row.id)).toEqual(ids);
      expect(new Set(ids).size).toBe(character.skills.length);
      const nightsoul = character.skills.find(row => row.id === 'passive-3')!;
      expect(nightsoul.type).toBe('passive');
      expect(nightsoul.name.zh).toBe(source.skills.passive3!.name);
      expect(character.skills.find(row => row.id === 'special-jump')?.type)
        .toBe(source.id === 'ororon' ? 'special' : undefined);
    }
  });

  it('preserves every source skill’s full text in the shared schema and JSON representation', () => {
    let entries = 0;
    for (const source of captured.added) {
      const character = characters.find(row => row.id === source.id)!;
      const serialized = JSON.parse(JSON.stringify(CharacterSchema.parse(character)));
      for (const skill of Object.values(source.skills)) {
        const mapped = serialized.skills.find((row: { name: { zh: string } }) => row.name.zh === skill.name);
        expect(mapped).toBeDefined();
        expect(mapped.name).toEqual({ zh: skill.name, en: skill.nameEn, ja: skill.nameEn });
        expect(mapped.description).toEqual({ zh: skill.description, en: skill.descriptionEn, ja: skill.descriptionEn });
        entries++;
      }
    }
    expect(entries).toBe(15);
  });

  it('keeps existing generic skills and the upcoming-character filter without creating optional skills', () => {
    expect(captured.original).toHaveLength(115);
    expect(captured.original.filter(row => row.status === 'upcoming').map(row => row.id)).toEqual(['sandrone']);
    for (const source of captured.original) {
      const character = characters.find(row => row.id === source.id)!;
      if (source.status === 'upcoming') {
        expect(character).toBeUndefined();
        continue;
      }
      const legacyOrder = ['normalAttack', 'elementalSkill', 'elementalBurst', 'passive1', 'passive2', 'passive4'] as const;
      const skills = legacyOrder.map(key => source.skills[key]).filter(skill => skill !== undefined);
      expect(character.skills).toHaveLength(skills.length);
      expect(character.skills.map(row => row.name.zh)).toEqual(skills.map(row => row.name));
      expect(character.skills.map(row => row.description.en)).toEqual(skills.map(row => row.descriptionEn));
      expect(character.skills.some(row => row.id === 'passive-3' || row.id === 'special-jump')).toBe(false);
    }
  });

  it('exposes all 15 added skills through both public game data loaders', async () => {
    for (const result of [await getGameData('genshin'), await getPublicGameData('genshin')]) {
      expect(result.characters).toBe(characters);
      expect(result.characters).toHaveLength(116);
      expect(result.characters.find(row => row.id === 'mualani')!.skills).toHaveLength(7);
      expect(result.characters.find(row => row.id === 'ororon')!.skills).toHaveLength(8);
    }
  });
});

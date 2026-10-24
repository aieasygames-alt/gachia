import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import rawCharacters from '../../../reports/content-integrity/archive/s2-14/characters.json';
import rawGuides from '../../../reports/content-integrity/archive/s2-14/guides.json';
import { ROCO_CHARACTER_IDENTITY_REVIEW } from '../games/roco/character-review';
import { characters, getRocoCharacterDescription, rocoCharacters } from '../games/roco/characters';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-7-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const nextProof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-8-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const editorialProof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-9-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const ids = proof.originalCharacters.source.map((row: { id: string }) => row.id);
const guideIds = proof.originalGuides.map((row: { id: string }) => row.id);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

it('withdraws copied international skills and values without inventing zero stats or deleting identities', () => {
  expect(rawCharacters.map(row => row.id)).toEqual(proof.preservation.characterIds);
  for (const id of ids) {
    const source = rawCharacters.find(row => row.id === id)!;
    expect(source).not.toHaveProperty('skills');
    expect(source).not.toHaveProperty('stats');
    expect(source).not.toHaveProperty('releaseVersion');
    expect(source).toHaveProperty('contentReview.status', 'needs_verification');
    expect(characters.find(row => row.id === id)).toBeUndefined();
    expect(getRocoCharacterDescription(rocoCharacters.find(row => row.id === id)!, 'ja')).toBe(ROCO_CHARACTER_IDENTITY_REVIEW.ja.description);
  }
  expect(characters).toEqual([]);
  expect(proof.originalCharacters.source.every((row: { skills: unknown[]; stats: unknown }) => row.skills.length && row.stats)).toBe(true);
  expect(hash(nextProof.originalCharacters)).toBe(proof.preservation.otherThreeCharactersSerializationSha256);
});

it('preserves all other guides and original dates while replacing nine assertion pages with localized checklists', () => {
  expect(rawGuides.map(row => row.id)).toEqual(proof.preservation.guideIds);
  expect(guideIds).toHaveLength(9);
  const beforeNextWithdrawal = rawGuides.map(row => nextProof.originalGuides.find((original: { id: string }) => original.id === row.id)
    ?? editorialProof.originalGuides.find((original: { id: string }) => original.id === row.id) ?? row);
  expect(hash(beforeNextWithdrawal.filter(row => !guideIds.includes(row.id)))).toBe(proof.preservation.otherTwentyOneGuidesSerializationSha256);
  for (const old of proof.originalGuides) {
    const guide = rawGuides.find(row => row.id === old.id)!;
    expect(guide.updatedAt).toBe(old.updatedAt);
    expect(guide).toHaveProperty('contentReview.status', 'needs_verification');
    for (const suffix of ['', 'En', 'Ja'] as const) {
      expect(guide[`title${suffix}`]).not.toBe(old[`title${suffix}`]);
      expect(guide[`content${suffix}`]?.length).toBeGreaterThan(150);
      expect(guide[`content${suffix}`]).not.toMatch(/10\/27|10\/20|2026-10-27|3688140|400\+/);
    }
    expect(guide.faq).toHaveLength(1);
  }
});

it.each(['characters', 'guides'])('keeps the reviewed Roco %s public mirror equal to source', file => {
  const source = JSON.parse(readFileSync(new URL(`../games/roco/raw-${file}.json`, import.meta.url), 'utf8'));
  const mirror = JSON.parse(readFileSync(new URL(`../../../apps/web/public/data/roco/raw-${file}.json`, import.meta.url), 'utf8'));
  expect(mirror).toEqual(source);
});

it('archives removed hardcoded guide claims instead of leaving them ready to reactivate', () => {
  const page = readFileSync(new URL('../../../apps/web/app/[lang]/[game]/guides/[slug]/page.tsx', import.meta.url), 'utf8');
  expect(proof.withdrawnHardcodedGuideBlocks).toHaveLength(17);
  for (const block of proof.withdrawnHardcodedGuideBlocks) {
    expect(guideIds).toContain(block.id);
    expect(block.originalBlock.length).toBeGreaterThan(100);
    expect(page).not.toContain(block.originalBlock);
  }
});

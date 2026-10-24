import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import characters from '../../../reports/content-integrity/archive/s2-14/characters.json';
import guides from '../../../reports/content-integrity/archive/s2-14/guides.json';
import { tierLists } from '../games/roco/tier-lists';
import { characters as genericCharacters } from '../games/roco/characters';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-8-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const editorialProof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-9-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const ids = proof.originalGuides.map((row: { id: string }) => row.id);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

it('withdraws every old rating without replacing unknown performance with a default rank', () => {
  expect(tierLists.map(row => row.locale)).toEqual(['zh', 'en', 'ja']);
  for (const row of tierLists) expect(row).toMatchObject({ gameId: 'roco', updatedAt: '2026-08-28', entries: [] });
  expect(proof.originalTierSource).toContain("tier: 'A'");
  expect(proof.originalTierSource).toContain("tier: 'B'");
});

it('marks all six details unverified while preserving the earlier three corrections and navigation order', () => {
  expect(characters.map(row => row.id)).toEqual(proof.preservation.characterIds);
  expect(hash(characters.slice(0, 3))).toBe(proof.preservation.firstThreeCharactersSerializationSha256);
  for (const row of characters) {
    expect(row.contentReview.status).toBe('needs_verification');
    expect(row.descriptionJa.length).toBeGreaterThan(80);
    expect(row).not.toHaveProperty('skills');
    expect(row).not.toHaveProperty('stats');
  }
  expect(genericCharacters).toEqual([]);
});

it('rewrites exactly four mechanics guides and leaves the other twenty-six records and all dates intact', () => {
  expect(ids).toHaveLength(4);
  expect(guides.map(row => row.id)).toEqual(proof.preservation.guideIds);
  const beforeEditorialSeparation = guides.map(row => editorialProof.originalGuides.find((original: { id: string }) => original.id === row.id) ?? row);
  expect(hash(beforeEditorialSeparation.filter(row => !ids.includes(row.id)))).toBe(proof.preservation.otherTwentySixGuidesSerializationSha256);
  expect(guides.filter(row => row.contentReview.kind !== 'editorial_proposal_archive')).toHaveLength(13);
  for (const old of proof.originalGuides) {
    const row = guides.find(row => row.id === old.id)!;
    expect(row.updatedAt).toBe(old.updatedAt);
    expect(row).toHaveProperty('contentReview.status', 'needs_verification');
    for (const suffix of ['', 'En', 'Ja'] as const) {
      expect(row[`content${suffix}`]?.length).toBeGreaterThan(200);
      expect(row[`content${suffix}`]).not.toBe(old[`content${suffix}`]);
    }
  }
});

it('archives removed public claims without silently modifying the other game data', () => {
  expect(proof.withdrawnPublicBlocks.length).toBeGreaterThanOrEqual(20);
  for (const block of proof.withdrawnPublicBlocks) expect(block.originalBlock.length).toBeGreaterThan(40);
});

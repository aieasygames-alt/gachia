import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import guides from '../games/roco/raw-guides.json';
import { getRocoGuideCategory, rocoGuides, ROCO_GUIDE_CATEGORIES } from '../games/roco/guides';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-9-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

it('preserves the complete original proposals internally and keeps the thirteen prior checklists unchanged', () => {
  expect(proof.originalGuides).toHaveLength(17);
  expect(proof.originalGuides.every((row: { contentReview?: unknown }) => !row.contentReview)).toBe(true);
  expect(guides.map(row => row.id)).toEqual(proof.preservation.guideIds);
  const preserved = guides.filter(row => row.contentReview.kind !== 'editorial_proposal_archive');
  expect(preserved).toHaveLength(13);
  expect(hash(preserved)).toBe(proof.preservation.priorThirteenGuidesSerializationSha256);
  const reconstructed = guides.map(row => proof.originalGuides.find((old: { id: string }) => old.id === row.id) ?? row);
  expect(hash(reconstructed)).toBe(proof.preservation.originalAllGuidesSerializationSha256);
  const bytes = readFileSync(new URL('../games/roco/raw-characters.json', import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(proof.preservation.charactersBytesSha256);
});

it('classifies every proposal without claiming adoption, official verification or deleting public IDs', () => {
  expect(proof.classifications.map((row: { id: string }) => row.id).sort()).toEqual(proof.originalGuides.map((row: { id: string }) => row.id).sort());
  for (const old of proof.originalGuides) {
    const row = guides.find(row => row.id === old.id)!;
    expect(row.category).toBe('editorial-archive');
    expect(row.updatedAt).toBe(old.updatedAt);
    expect(row.contentReview).toMatchObject({ status: 'needs_verification', kind: 'editorial_proposal_archive', reviewedAt: '2026-10-24' });
    expect(row.faq).toHaveLength(1);
    for (const suffix of ['', 'En', 'Ja'] as const) {
      expect(row[`content${suffix}`].length).toBeGreaterThan(200);
      expect(row[`content${suffix}`]).not.toBe(old[`content${suffix}`]);
      expect(row[`summary${suffix}`].length).toBeGreaterThan(60);
      expect(row[`summary${suffix}`]).toContain({ '': '不是玩家攻略', En: 'not a player guide', Ja: 'プレイヤー攻略' }[suffix]);
    }
    expect(proof.classifications.find((item: { id: string }) => item.id === row.id).adoption).toBe('not_approved_not_implemented');
  }
});

it.each(['zh', 'en', 'ja'] as const)('provides an explicit localized editorial category in %s', locale => {
  expect(ROCO_GUIDE_CATEGORIES['editorial-archive']?.[locale]).toBe({ zh: '历史编辑设想（非官方）', en: 'Archived Editorial Proposals', ja: '過去の編集提案（非公式）' }[locale]);
  for (const guide of rocoGuides.filter(row => row.contentReview?.kind === 'editorial_proposal_archive')) {
    expect(getRocoGuideCategory(guide, locale)).toBe({ zh: '历史编辑设想（非官方）', en: 'Archived Editorial Proposals', ja: '過去の編集提案（非公式）' }[locale]);
  }
});

it('archives and removes all seventeen matching next-step blocks, keeping the release holds', () => {
  const page = readFileSync(new URL('../../../apps/web/app/[lang]/[game]/guides/[slug]/page.tsx', import.meta.url), 'utf8');
  expect(proof.withdrawnHardcodedGuideBlocks).toHaveLength(17);
  for (const block of proof.withdrawnHardcodedGuideBlocks) expect(page).not.toContain(block.originalBlock);
  const ledger = JSON.parse(readFileSync(new URL('../raw-content-review.json', import.meta.url), 'utf8'));
  expect(ledger.pending).toEqual([]);
  expect(ledger.holds.map((hold: { path: string }) => hold.path)).toEqual(['roco/raw-characters.json', 'roco/raw-guides.json']);
});

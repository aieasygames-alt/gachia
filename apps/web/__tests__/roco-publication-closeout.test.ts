import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAMES } from '@gachia/core';
import characters from '../../../packages/data/games/roco/raw-characters.json';
import guides from '../../../packages/data/games/roco/raw-guides.json';
import { getVersionSnapshot } from '@/lib/version-snapshots';

it('withdraws global classifications without changing CN registry semantics', () => {
  const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-14-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
  expect(Object.fromEntries(Object.entries(GAMES).filter(([id]) => id !== 'roco'))).toEqual(proof.nonRocoRegistryBefore);
  expect(GAMES.roco.elements).toEqual([]);
  expect(GAMES.roco.rarities).toEqual([]);
  expect(GAMES.roco.stats).toEqual({ baseStats: [], subStats: [], specialStats: [] });
  expect(GAMES['roco-cn'].elements.length).toBeGreaterThan(0);
  expect(GAMES['roco-cn'].rarities.length).toBeGreaterThan(0);
  for (const row of characters) expect(Object.keys(row).sort()).toEqual(['contentReview', 'id']);
});

it('preserves every archived guide and changes only the stale portrait navigation wording', () => {
  const archived = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/archive/s2-14/guides.json', import.meta.url), 'utf8'));
  expect(guides.map(row => row.id)).toEqual(archived.map((row: { id: string }) => row.id));
  expect(guides.filter(row => row.id !== 'jinies-guide')).toEqual(archived.filter((row: { id: string }) => row.id !== 'jinies-guide'));
  const guide = guides.find(row => row.id === 'jinies-guide')!;
  expect(guide.content).toContain('不再公开旧名称、分类或原图');
  expect(guide.contentEn).toContain('no longer published');
  expect(guide.contentJa).toContain('旧名称・分類・原画像は公開しません');
});

it('labels legacy snapshot destinations as reviews or archived proposals, never executable plans', () => {
  const links = getVersionSnapshot('roco')!.links;
  for (const link of links) {
    const guide = guides.find(row => link.href === `/roco/guides/${row.id}`);
    if (guide?.contentReview.kind === 'editorial_proposal_archive') {
      expect(link.label.zh).toContain('历史设想归档');
      expect(link.label.en).toContain('Archived proposal');
      expect(link.label.ja).toContain('過去の提案');
    }
  }
  const home = readFileSync(new URL('../app/[lang]/[game]/page.tsx', import.meta.url), 'utf8');
  expect(home).not.toContain('Quack Quack Test');
  expect(home).not.toContain('rocoCharacters.length');
  expect(home).not.toContain('Global CBT watch hub');
  expect(home).not.toContain('Global is still in CBT verification');
  for (const old of ['国际服 CBT 信息', 'global CBT information', '中国版と国際CBT']) expect(home).not.toContain(old);
});

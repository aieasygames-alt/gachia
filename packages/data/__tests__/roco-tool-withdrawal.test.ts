import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { rocoWeapons, weapons, rocoLegacyWeaponIds, isRocoLegacyWeaponId, getRocoWeaponById } from '../games/roco/weapons';
import { rocoCnWeapons } from '../games/roco-cn/weapons';

const proof = JSON.parse(readFileSync(new URL('../../../reports/content-integrity/s2-10-source-decisions-2026-10-24.json', import.meta.url), 'utf8'));
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

it('retains only ten traceable historical URL keys, not fabricated international weapon inventory', () => {
  expect(rocoWeapons).toEqual([]);
  expect(weapons).toEqual([]);
  expect(rocoLegacyWeaponIds).toEqual(proof.legacyWeaponIds);
  expect(rocoLegacyWeaponIds).toHaveLength(10);
  const original = proof.originalSources.find((row: { path: string }) => row.path === 'packages/data/games/roco/weapons.ts').originalSource;
  expect([...original.matchAll(/^    id: '([^']+)'/gm)].map(match => match[1])).toEqual([...rocoLegacyWeaponIds]);
  for (const id of rocoLegacyWeaponIds) {
    expect(isRocoLegacyWeaponId(id)).toBe(true);
    expect(getRocoWeaponById(id)).toBeUndefined();
  }
  for (const id of ['', 'missing', `${rocoLegacyWeaponIds[0]}/extra`]) expect(isRocoLegacyWeaponId(id)).toBe(false);
  expect(rocoCnWeapons).toHaveLength(10);
});

it('preserves complete withdrawn sources and the bounded phase evidence, not a permanent global content freeze', () => {
  for (const entry of proof.originalSources) expect(hash(entry.originalSource)).toBe(entry.sha256);
  expect(new Set(proof.protection.map((entry: { path: string }) => entry.path)).size).toBe(proof.protection.length);
  for (const entry of proof.protection) expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(proof.protection.filter((entry: { path: string }) => /^(packages\/data\/games|apps\/web\/public\/data)\/.*\/raw-[^/]+\.json$/.test(entry.path))).toHaveLength(185);
  expect(proof.protection.filter((entry: { path: string }) => /\/data-(client|manifest)\//.test(entry.path))).toHaveLength(345);
});

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { LEGACY_MAIN_SEARCH, MATERIAL_MAIN_SEARCH, mainManifestOptions, mainManifests, publishedMainManifestOptions } from '../scripts/main-manifests.mjs';
import { searchProjection } from '../scripts/game-public-projections.mjs';
import materials from '../games/roco-cn/raw-materials.json';

it('adds only CN material results in every locale and retains the exact legacy search elsewhere', async () => {
  const legacy = await mainManifests();
  const current = await mainManifests(undefined, { searchContract: MATERIAL_MAIN_SEARCH });
  expect(current.get('games.json')).toEqual(legacy.get('games.json'));
  for (const locale of ['zh', 'en', 'ja']) {
    const file = `search-${locale}.json`, value = current.get(file);
    expect(value['roco-cn']).toEqual({ items: searchProjection(materials, locale) });
    expect(legacy.get(file)).not.toHaveProperty('roco-cn');
    const { 'roco-cn': added, ...unchanged } = value;
    expect(unchanged).toEqual(legacy.get(file));
    expect(value).not.toHaveProperty('roco');
  }
});

it('selects the frozen workspace contract and rejects unknown or malformed selectors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'main-manifest-contract-'));
  try {
    await mkdir(join(root, 'games'));
    const games = pathToFileURL(join(root, 'games/'));
    expect(await mainManifestOptions(games)).toEqual({ searchContract: LEGACY_MAIN_SEARCH });
    const artifact = pathToFileURL(root + '/');
    expect(await publishedMainManifestOptions(artifact)).toEqual({ searchContract: LEGACY_MAIN_SEARCH });
    const selector = join(root, 'main-manifest-contract.json');
    await writeFile(selector, JSON.stringify({ searchContract: MATERIAL_MAIN_SEARCH }));
    expect(await mainManifestOptions(games)).toEqual({ searchContract: MATERIAL_MAIN_SEARCH });
    // A newer source selector cannot change an independently deployed Main.
    expect(await publishedMainManifestOptions(artifact)).toEqual({ searchContract: LEGACY_MAIN_SEARCH });
    await mkdir(join(root, 'assets/data-manifest'), { recursive: true });
    await writeFile(join(root, 'assets/data-manifest/main-contract.json'), JSON.stringify({ searchContract: MATERIAL_MAIN_SEARCH }));
    expect(await publishedMainManifestOptions(artifact)).toEqual({ searchContract: MATERIAL_MAIN_SEARCH });
    await writeFile(join(root, 'assets/data-manifest/main-contract.json'), JSON.stringify({ searchContract: LEGACY_MAIN_SEARCH }));
    expect(await publishedMainManifestOptions(artifact)).toEqual({ searchContract: LEGACY_MAIN_SEARCH });
    await writeFile(selector, JSON.stringify({ searchContract: 'unknown' }));
    await expect(mainManifestOptions(games)).rejects.toThrow('Unknown Main manifest contract');
    await writeFile(selector, '{');
    await expect(mainManifestOptions(games)).rejects.toThrow();
    await expect(mainManifests(games, { searchContract: 'unknown' })).rejects.toThrow('Unknown Main search contract');
  } finally { await rm(root, { recursive: true, force: true }); }
});

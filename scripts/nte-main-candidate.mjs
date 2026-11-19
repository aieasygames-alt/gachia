import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { artifactFiles } from './desktop-publish.mjs';
import { assertDiskBudget, treeBytes } from './desktop-disk-preflight.mjs';
import { digest } from './desktop-release-assets.mjs';
import { migrationPinned, migrationSave } from './genshin-migration-http.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { nteContentAssets } from './nte-content-assets.mjs';
import { mainManifestOptions, mainManifests } from '../packages/data/scripts/main-manifests.mjs';

export async function prepareNteMainCandidate(directory, root) {
  directory = resolve(directory); root = realpathSync(root);
  const source = join(root, 'apps/web/.open-next');
  assert(!existsSync(directory)); assert.equal(realpathSync(dirname(directory)), dirname(directory));
  assert(directory !== root && !root.startsWith(directory + '/') && !directory.startsWith(source + '/'));
  assertDiskBudget({ path: root, operation: 'Main NTE ownership asset transformation', estimatedBytes: 2 * treeBytes(source) + 256 * 1024 ** 2 });
  const original = artifactFiles(source), review = JSON.parse(readFileSync(join(root, 'packages/data/raw-content-review.json')));
  for (const row of original.filter(row => !row.path.startsWith('assets/'))) assert(!/(?:^|\/)(?:public\/data\/(?:genshin|nte)\/|public\/data-client\/(?:genshin-platform|tier-list-genshin|nte-platform)\.json$|packages\/data\/games\/(?:genshin|nte)\/raw-)/.test(row.path), `Loose owner server data: ${row.path}`);
  const removed = [], replacements = [];
  for (const game of [genshinContentAssets(root), nteContentAssets(root)]) {
    const owner = game.contract.owner, mirrors = review.pairs.filter(file => file.startsWith(`${owner}/`));
    const sourceOnly = review.sourceOnly.filter(row => row.path.startsWith(`${owner}/`)).map(row => row.path.slice(owner.length + 1));
    assert.deepEqual([...mirrors.map(file => file.slice(owner.length + 1)), ...sourceOnly].sort(),
      [...game.contract.rawFiles, ...(game.contract.sourceOnlyFiles ?? [])].sort(), `${owner} source/mirror inventory drift`);
    assert(original.filter(row => row.type !== 'directory' && row.path.startsWith(`assets/data/${owner}/`)).every(row =>
      mirrors.some(file => row.path === 'assets/data/' + file)), `Unregistered ${owner} mirror`);
    for (const file of mirrors) assert(readFileSync(join(source, 'assets/data', file)).equals(readFileSync(join(root, 'packages/data/games', file))), `Compatibility mirror drift: ${file}`);
    const platform = `assets/data-client/${owner}-platform.json`;
    assert(readFileSync(join(source, platform)).equals(game.files.get('platform.json')));
    removed.push(`assets/data/${owner}`, platform);
    if (owner === 'genshin') {
      assert.deepEqual(JSON.parse(readFileSync(join(source, 'assets/data-client/tier-list-genshin.json'))), JSON.parse(game.files.get('tier-list.json')).data);
      removed.push('assets/data-client/tier-list-genshin.json');
    }
  }
  const gamesRoot = pathToFileURL(join(root, 'packages/data/games/'));
  for (const [file, value] of await mainManifests(gamesRoot, await mainManifestOptions(gamesRoot))) {
    const name = `assets/data-manifest/${file}`; assert.deepEqual(JSON.parse(readFileSync(join(source, name))), value);
    const next = structuredClone(value), data = file === 'games.json' ? next.games : next;
    delete data.genshin; delete data.nte;
    replacements.push({ path: name, bytes: Buffer.from(JSON.stringify(next) + '\n') });
  }
  for (const file of [...removed, ...replacements.map(row => row.path)]) assert.equal(realpathSync(join(source, file)), join(source, file));
  mkdirSync(directory, { mode: 0o700 });
  const compatibility = join(directory, 'compatibility'), artifact = join(directory, 'artifact');
  cpSync(source, compatibility, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  cpSync(source, artifact, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  for (const file of removed) rmSync(join(artifact, file), { recursive: true });
  for (const row of replacements) writeFileSync(join(artifact, row.path), row.bytes);
  assert.deepEqual(artifactFiles(source), original);
  const value = { schemaVersion: 1, kind: 'nte_main_asset_candidate', original: migrationSave(directory, 'original.json', original),
    candidate: migrationSave(directory, 'candidate-tree.json', artifactFiles(artifact)), removed,
    replacements: replacements.map(row => ({ path: row.path, sha256: digest(row.bytes) })), cloudWrites: false, productionReady: false };
  const proof = migrationSave(directory, 'candidate.json', value); verifyNteMainCandidate(proof);
  return { proof, artifact };
}
export function verifyNteMainCandidate(proof) {
  const value = migrationPinned(proof), directory = dirname(proof.path);
  assert.equal(realpathSync(directory), directory); assert.equal(proof.path, join(directory, 'candidate.json'));
  assert.equal(value.kind, 'nte_main_asset_candidate'); assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false);
  const original = migrationPinned(value.original), candidate = migrationPinned(value.candidate);
  assert.deepEqual(artifactFiles(join(directory, 'compatibility')), original); assert.deepEqual(artifactFiles(join(directory, 'artifact')), candidate);
  const expected = original.filter(row => !value.removed.some(file => row.path === file || row.path.startsWith(file + '/'))).map(row => {
    const changed = value.replacements.find(file => file.path === row.path); return changed ? { ...row, sha256: changed.sha256 } : row;
  });
  assert.deepEqual(candidate, expected, 'Non-asset Main mutation');
  return { value, artifact: join(directory, 'artifact') };
}

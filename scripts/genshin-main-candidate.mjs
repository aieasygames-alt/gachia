import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { artifactFiles } from './desktop-publish.mjs';
import { assertDiskBudget, treeBytes } from './desktop-disk-preflight.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { mainManifests } from '../packages/data/scripts/main-manifests.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;

export async function prepareGenshinMainCandidate(output, root = ROOT) {
  root = realpathSync(root);
  const directory = resolve(output), source = join(root, 'apps/web/.open-next');
  assert(directory !== root && !root.startsWith(directory + '/') && !directory.startsWith(source + '/'), 'Unsafe candidate output');
  assert.equal(realpathSync(dirname(directory)), dirname(directory), 'Linked candidate output parent');
  assert(!existsSync(directory), 'Candidate output already exists');
  assertDiskBudget({ path: root, operation: 'isolated Main migration candidate', estimatedBytes: 2 * treeBytes(source) + 256 * 1024 ** 2 });
  const original = artifactFiles(source), game = genshinContentAssets(root);
  for (const { path } of original) {
    if (path.startsWith('assets/')) continue;
    assert(!/(?:^|\/)(?:public\/data\/genshin\/|public\/data-client\/(?:genshin-platform|tier-list-genshin)\.json$|packages\/data\/games\/genshin\/)/.test(path),
      `Genshin server data copy must be excluded by the Main build: ${path}`);
  }
  const replacements = [];
  for (const [file, value] of await mainManifests(pathToFileURL(join(root, 'packages/data/games/')))) {
    const name = `assets/data-manifest/${file}`, bytes = Buffer.from(`${JSON.stringify(value)}\n`);
    assert(readFileSync(join(source, name)).equals(bytes), `Main compatibility index drift: ${file}`);
    const next = structuredClone(value);
    if (file === 'games.json') delete next.games.genshin;
    else delete next.genshin;
    replacements.push({ path: name, bytes: Buffer.from(`${JSON.stringify(next)}\n`) });
  }
  const review = JSON.parse(readFileSync(join(root, 'packages/data/raw-content-review.json')));
  const mirrors = review.pairs.filter(file => file.startsWith('genshin/')).map(file => file.slice('genshin/'.length));
  const sourceOnly = review.sourceOnly.filter(row => row.path.startsWith('genshin/')).map(row => row.path.slice('genshin/'.length));
  assert.deepEqual([...mirrors, ...sourceOnly].sort(), game.contract.rawFiles, 'Genshin mirror/source-only inventory drift');
  const removed = mirrors.map(file => `assets/data/genshin/${file}`);
  for (const file of mirrors) assert(readFileSync(join(source, 'assets/data/genshin', file)).equals(game.files.get(`data/${file}`)), 'Main raw mirror drift');
  assert(readFileSync(join(source, 'assets/data-client/genshin-platform.json')).equals(game.files.get('platform.json')), 'Main platform snapshot drift');
  const tier = JSON.parse(game.files.get('tier-list.json')).data;
  assert.deepEqual(JSON.parse(readFileSync(join(source, 'assets/data-client/tier-list-genshin.json'))), tier, 'Main tier snapshot drift');
  removed.push('assets/data/genshin', 'assets/data-client/genshin-platform.json', 'assets/data-client/tier-list-genshin.json');
  assert(original.filter(row => row.path.startsWith('assets/data/genshin/')).every(row => removed.includes(row.path)), 'Unregistered Genshin mirror');
  for (const name of [...removed, ...replacements.map(row => row.path)]) assert.equal(realpathSync(join(source, name)), join(source, name), 'Linked candidate input');
  mkdirSync(directory, { mode: 0o700 });
  const artifact = join(directory, 'artifact'), compatibility = join(directory, 'compatibility');
  // Keep the original bytes in the receipt directory so a later app rebuild cannot invalidate this proof.
  cpSync(source, compatibility, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
  assert.deepEqual(artifactFiles(compatibility), original, 'Compatibility copy differs from the built artifact');
  cpSync(compatibility, artifact, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
  for (const name of removed) rmSync(join(artifact, name), { recursive: true });
  for (const row of replacements) writeFileSync(join(artifact, row.path), row.bytes);
  assert.deepEqual(artifactFiles(source), original, 'Preparation changed the compatibility artifact');
  const save = (file, value) => { const bytes = json(value); writeFileSync(join(directory, file), bytes, { flag: 'wx' }); return hash(bytes); };
  const sourceTreePin = save('source-tree.json', original);
  const candidateTreePin = save('candidate-tree.json', artifactFiles(artifact));
  const receipt = { schemaVersion: 1, kind: 'genshin_main_asset_candidate', sourceDirectory: compatibility, sourceTreePin, candidateTreePin,
    removed, replacements: replacements.map(row => ({ path: row.path, sha256: hash(row.bytes) })),
    cloudWrites: false, productionReady: false,
    scope: 'Asset-only transformation of a Main build checked for loose Genshin server data copies. Server modules, cached HTML and media are unchanged. Not CMS single-owner qualification.' };
  const pin = save('candidate.json', receipt);
  verifyGenshinMainCandidate(directory, pin);
  return { directory, artifact, pin, removed: removed.length, replaced: replacements.length, productionReady: false };
}

export function verifyGenshinMainCandidate(directory, pin) {
  directory = resolve(directory);
  assert.equal(realpathSync(directory), directory, 'Linked candidate root');
  assert(/^[a-f0-9]{64}$/.test(pin), 'External candidate pin required');
  const read = (name, expected) => {
    const file = join(directory, name);
    assert.equal(realpathSync(file), file, 'Linked candidate evidence');
    const bytes = readFileSync(file); assert.equal(hash(bytes), expected, `Candidate evidence changed: ${name}`);
    return JSON.parse(bytes);
  };
  const receipt = read('candidate.json', pin);
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'genshin_main_asset_candidate');
  assert.equal(receipt.productionReady, false); assert.equal(receipt.cloudWrites, false);
  assert.equal(receipt.sourceDirectory, join(directory, 'compatibility'), 'Candidate requires its own frozen compatibility artifact');
  const original = read('source-tree.json', receipt.sourceTreePin), candidate = read('candidate-tree.json', receipt.candidateTreePin);
  assert.deepEqual(artifactFiles(receipt.sourceDirectory), original, 'Compatibility artifact changed');
  assert.deepEqual(artifactFiles(join(directory, 'artifact')), candidate, 'Candidate artifact changed');
  const expected = original.filter(row => !receipt.removed.includes(row.path)).map(row => {
    const replacement = receipt.replacements.find(value => value.path === row.path);
    return replacement ? { ...row, sha256: replacement.sha256 } : row;
  });
  assert.deepEqual(candidate, expected, 'Unexpected non-asset change in migration candidate');
  return { receipt, artifact: join(directory, 'artifact'), pin };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.length === 4 && process.argv[2] === '--output', 'Usage: node scripts/genshin-main-candidate.mjs --output <new-directory>');
  console.log(JSON.stringify(await prepareGenshinMainCandidate(process.argv[3])));
}

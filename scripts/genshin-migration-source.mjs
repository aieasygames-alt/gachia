import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { assertDiskBudget, GiB } from './desktop-disk-preflight.mjs';
import { digest } from './desktop-release-assets.mjs';

const sourcePattern = /^(?:packages\/data\/games\/[a-z0-9-]+\/(?:raw-[a-z-]+\.json|(?:tier-lists|progression)\.ts)|apps\/game-[a-z0-9-]+\/lib\/data\.ts)$/;
const owners = ['azur-promilia', 'genshin', 'lvmeng', 'main', 'nte'];
const json = value => JSON.stringify(value, null, 2) + '\n';
function sourceFiles(root, relative = '') {
  return readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = relative ? relative + '/' + entry.name : entry.name;
    if (/^(?:(?:apps|packages)\/[^/]+\/(?:node_modules|\.next|\.open-next|\.wrangler|\.turbo)|node_modules)$/.test(name)
      || name.endsWith('.tsbuildinfo')) return [];
    assert(!entry.isSymbolicLink(), 'Linked migration source tree');
    if (entry.isDirectory()) return sourceFiles(root, name);
    assert(entry.isFile(), 'Non-regular migration source tree');
    return [{ path: name, sha256: digest(readFileSync(join(root, name))) }];
  });
}
function pinned(proof) {
  assert(proof && /^[a-f0-9]{64}$/.test(proof.pin) && resolve(proof.path) === proof.path);
  assert.equal(realpathSync(proof.path), proof.path, 'Linked migration source evidence');
  const bytes = readFileSync(proof.path); assert.equal(digest(bytes), proof.pin, 'Migration source evidence changed');
  return JSON.parse(bytes);
}

export function genshinMigrationActiveSources(sourceIndex) {
  const index = pinned(sourceIndex);
  assert.equal(index.kind, 'unified_published_source_index'); assert.equal(index.status, 'published_sources_observed');
  assert.deepEqual(Object.keys(index.owners).sort(), owners, 'Complete five-owner published A required');
  const sources = pinned(index.active);
  assert.equal(sources.length, 115, 'Complete 115-source published A required');
  assert.equal(new Set(sources.map(row => row.sourcePath)).size, sources.length, 'Duplicate published source');
  for (const row of sources) {
    assert(sourcePattern.test(row.sourcePath), 'Unregistered migration source path');
    assert.equal(typeof row.text, 'string'); assert.equal(digest(row.text), row.sha256, 'Corrupt published source');
  }
  return { index, sources };
}

// Migration copies the complete already-published A without inventing an
// editorial change or modifying a real CMS record. This is a local source
// preparation receipt, never production authorization.
export function prepareGenshinMigrationSource({ repo, commit, sourceIndex, directory }) {
  repo = realpathSync(repo); directory = resolve(directory);
  assert(/^[a-f0-9]{40}$/.test(commit), 'Exact migration source commit required');
  const git = args => execFileSync('git', args, { cwd: repo, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(git(['rev-parse', `${commit}^{commit}`]).toString().trim(), commit);
  const { index, sources } = genshinMigrationActiveSources(sourceIndex);
  assert(directory !== repo && !repo.startsWith(directory + '/'), 'Migration output overlaps repository');
  assert.equal(realpathSync(dirname(directory)), dirname(directory), 'Linked migration output parent');
  assert(!existsSync(directory), 'Migration source output exists; no overwrite');
  const tracked = git(['ls-tree', '-rlz', commit]).toString().split('\0').filter(Boolean).map(row => {
    const match = row.match(/^(100644|100755) blob [a-f0-9]{40}\s+(\d+)\t(.+)$/s);
    assert(match, 'Source links or submodules require review');
    assert(!match[3].split('/').some(part => ['.env', '.env.local', '.git', 'node_modules'].includes(part)), 'Private source entry');
    return { path: match[3], bytes: Number(match[2]) };
  });
  const sourcePaths = new Set(sources.map(row => row.sourcePath));
  assert([...sourcePaths].every(file => tracked.some(row => row.path === file)), 'Published source outside exact source commit');
  assertDiskBudget({ path: directory, operation: 'complete published A migration source', estimatedBytes: tracked.reduce((sum, row) => sum + row.bytes, 0) * 2 + GiB });
  mkdirSync(directory, { mode: 0o700 });
  const workspace = join(directory, 'source'), archive = join(directory, 'source.tar');
  mkdirSync(workspace, { mode: 0o700 });
  const save = (name, value) => { const text = json(value); writeFileSync(join(directory, name), text, { flag: 'wx', mode: 0o600 }); return digest(text); };
  const stages = [];
  try {
    git(['archive', '--format=tar', `--output=${archive}`, commit]);
    execFileSync('tar', ['-xf', archive, '-C', workspace]); unlinkSync(archive);
    const original = sourceFiles(workspace);
    const ledger = JSON.parse(readFileSync(join(workspace, 'packages/data/raw-content-review.json')));
    assert.equal(ledger.pairs.length, 90, 'Reviewed public mirror inventory changed');
    const write = (file, text) => {
      const target = join(workspace, file);
      assert.equal(realpathSync(target), target, 'Linked migration source'); assert(lstatSync(target).isFile());
      writeFileSync(target, text);
    };
    for (const row of sources) {
      write(row.sourcePath, row.text);
      if (row.sourcePath.startsWith('packages/data/games/')) {
        const pair = row.sourcePath.slice('packages/data/games/'.length);
        if (ledger.pairs.includes(pair)) write('apps/web/public/data/' + pair, row.text);
      }
    }
    for (const script of ['packages/data/scripts/generate-character-summaries.mjs', 'packages/data/scripts/generate-manifests.mjs',
      'packages/data/scripts/verify-manifests.mjs', 'packages/data/scripts/raw-inventory-contract.mjs']) {
      const args = [join(workspace, script), ...(script.endsWith('raw-inventory-contract.mjs') ? ['--release'] : [])];
      const bytes = execFileSync(process.execPath, args, { cwd: workspace, maxBuffer: 16 * 1024 * 1024,
        env: { PATH: process.env.PATH, HOME: directory, LANG: 'en_US.UTF-8', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
      writeFileSync(join(directory, `${stages.length}.log`), bytes, { flag: 'wx', mode: 0o600 }); stages.push(script);
    }
    for (const row of sources) assert.equal(digest(readFileSync(join(workspace, row.sourcePath))), row.sha256, `Published A changed during projection: ${row.sourcePath}`);
    const files = sourceFiles(workspace), old = new Map(original.map(row => [row.path, row]));
    assert.deepEqual(files.map(row => row.path), original.map(row => row.path), 'Migration projection changed source membership');
    const modified = files.filter(row => row.sha256 !== old.get(row.path).sha256);
    for (const row of modified) assert(sourcePaths.has(row.path) || /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path),
      `Migration projection changed unrelated code: ${row.path}`);
    const sourcePin = save('source-tree.json', original), filesPin = save('files.json', files);
    const receipt = { schemaVersion: 1, kind: 'genshin_complete_published_A_migration_source', commit, sourceIndex, active: index.active,
      sourcePin, filesPin, modified, stages, sources: sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })),
      editorialChanges: [], cloudWrites: false, productionReady: false };
    const pin = save('source.json', receipt);
    verifyGenshinMigrationSource(directory, pin);
    return { directory, workspace, pin, modified: modified.length, sources: sources.length, cloudWrites: false };
  } catch (error) {
    save('failure.json', { error: error.message, stages, cloudWrites: false }); throw error;
  } finally { if (existsSync(archive)) unlinkSync(archive); }
}

export function verifyGenshinMigrationSource(directory, pin) {
  directory = resolve(directory); assert.equal(realpathSync(directory), directory);
  assert(!existsSync(join(directory, 'failure.json')), 'Failed migration source cannot be consumed');
  const receipt = pinned({ path: join(directory, 'source.json'), pin });
  assert.equal(receipt.kind, 'genshin_complete_published_A_migration_source');
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.cloudWrites, false); assert.equal(receipt.productionReady, false);
  assert.deepEqual(receipt.editorialChanges, []);
  const { index, sources } = genshinMigrationActiveSources(receipt.sourceIndex);
  assert.deepEqual(receipt.active, index.active);
  assert.deepEqual(receipt.sources, sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })));
  const files = pinned({ path: join(directory, 'files.json'), pin: receipt.filesPin });
  assert.deepEqual(sourceFiles(join(directory, 'source')), files, 'Migration source tree changed');
  for (const row of sources) assert.equal(digest(readFileSync(join(directory, 'source', row.sourcePath))), row.sha256);
  return { directory, workspace: join(directory, 'source'), receipt, pin, cloudWrites: false };
}

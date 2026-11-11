import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { genshinMigrationActiveSources, prepareGenshinMigrationSource, verifyGenshinMigrationSource } from './genshin-migration-source.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'genshin-migration-source-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo'); mkdirSync(repo);
  const write = (file, bytes) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes); };
  const save = (name, value) => { const file = join(root, name), text = JSON.stringify(value, null, 2) + '\n'; write(file, text); return { path: file, pin: digest(text) }; };
  const pairs = Array.from({ length: 90 }, (_, i) => `fixture-${i}/raw-guides.json`);
  const sources = pairs.map(pair => ({ sourcePath: 'packages/data/games/' + pair, text: '[{"id":"guide","content":"Published A"}]\n' }));
  for (let i = 0; i < 25; i++) sources.push({ sourcePath: `packages/data/games/fixture-code-${i}/tier-lists.ts`, text: 'export const value = 2\n' });
  for (const row of sources) { row.sha256 = digest(row.text); write(join(repo, row.sourcePath), row.text.replace('Published A', 'Import O')); }
  for (const pair of pairs) write(join(repo, 'apps/web/public/data', pair), '[]\n');
  write(join(repo, 'packages/data/raw-content-review.json'), JSON.stringify({ pairs }));
  for (const script of ['generate-character-summaries.mjs', 'generate-manifests.mjs', 'verify-manifests.mjs', 'raw-inventory-contract.mjs']) {
    write(join(repo, 'packages/data/scripts', script), 'console.log("fixture generation")\n');
  }
  const git = args => execFileSync('git', args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-q']); git(['add', '.']); git(['-c', 'user.email=test@example.invalid', '-c', 'user.name=Fixture', 'commit', '-qm', 'fixture']);
  const commit = git(['rev-parse', 'HEAD']).toString().trim();
  const active = save('active.json', sources);
  const sourceIndex = save('source-index.json', { kind: 'unified_published_source_index', status: 'published_sources_observed',
    owners: Object.fromEntries(['azur-promilia', 'genshin', 'lvmeng', 'main', 'nte'].map(owner => [owner, {}])), active });
  return { root, repo, commit, sources, sourceIndex, save, directory: join(root, 'prepared') };
}

test('migration source carries all published A into exact source and mirrors without manufacturing an edit', t => {
  const f = fixture(t), result = prepareGenshinMigrationSource(f);
  assert.equal(result.sources, 115); assert.equal(result.cloudWrites, false);
  const opened = verifyGenshinMigrationSource(result.directory, result.pin);
  assert.deepEqual(opened.receipt.editorialChanges, []);
  for (const row of f.sources) assert.equal(readFileSync(join(result.workspace, row.sourcePath), 'utf8'), row.text);
  assert.equal(readFileSync(join(result.workspace, 'apps/web/public/data/fixture-0/raw-guides.json'), 'utf8'), f.sources[0].text);
  assert.match(readFileSync(join(f.repo, f.sources[0].sourcePath), 'utf8'), /Import O/, 'Original checkout remains untouched');
  assert.throws(() => prepareGenshinMigrationSource(f), /exists/);
  writeFileSync(join(result.workspace, f.sources[0].sourcePath), 'changed');
  assert.throws(() => verifyGenshinMigrationSource(result.directory, result.pin), /tree changed/);
});

test('source evidence rejects incomplete, duplicated, corrupt and escaped published A', t => {
  const f = fixture(t);
  for (const [i, mutate] of [
    rows => rows.pop(),
    rows => rows[1] = rows[0],
    rows => rows[0].text = 'corrupt',
    rows => rows[0].sourcePath = '../../private.json',
  ].entries()) {
    const rows = structuredClone(f.sources); mutate(rows);
    const index = JSON.parse(readFileSync(f.sourceIndex.path)); index.active = f.save(`active-${i}.json`, rows);
    assert.throws(() => genshinMigrationActiveSources(f.save(`index-${i}.json`, index)));
  }
  const index = JSON.parse(readFileSync(f.sourceIndex.path)); delete index.owners.nte;
  assert.throws(() => genshinMigrationActiveSources(f.save('missing-owner.json', index)), /five-owner/);
});

test('changed or linked source index is rejected before preparing output', t => {
  const f = fixture(t), linked = join(f.root, 'linked.json'); symlinkSync(f.sourceIndex.path, linked);
  assert.throws(() => genshinMigrationActiveSources({ ...f.sourceIndex, path: linked }), /Linked/);
  writeFileSync(f.sourceIndex.path, '{}');
  assert.throws(() => prepareGenshinMigrationSource(f), /evidence changed/);
});

test('generation cannot erase a published increment or modify unrelated source code', t => {
  const f = fixture(t), generator = join(f.repo, 'packages/data/scripts/generate-character-summaries.mjs');
  writeFileSync(generator, 'import{writeFileSync}from"node:fs";writeFileSync("packages/data/games/fixture-0/raw-guides.json","[]")\n');
  execFileSync('git', ['add', '.'], { cwd: f.repo });
  execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=Fixture', 'commit', '-qm', 'broken fixture'], { cwd: f.repo });
  f.commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: f.repo }).toString().trim();
  assert.throws(() => prepareGenshinMigrationSource(f), /Published A changed/);
  assert.equal(JSON.parse(readFileSync(join(f.directory, 'failure.json'))).cloudWrites, false);
  assert.throws(() => verifyGenshinMigrationSource(f.directory, 'a'.repeat(64)), /Failed migration/);
});

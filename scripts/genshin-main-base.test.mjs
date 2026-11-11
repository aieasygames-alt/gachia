import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { mainManifests } from '../packages/data/scripts/main-manifests.mjs';
import { writeGenshinMainBase } from './genshin-main-base.mjs';

const ROOT = resolve(import.meta.dirname, '..');

test('default manifest generation retains exact compatibility bytes for all four existing indexes', async () => {
  for (const [file, value] of await mainManifests()) {
    assert.equal(`${JSON.stringify(value)}\n`, readFileSync(join(ROOT, 'apps/web/public/data-manifest', file), 'utf8'));
  }
});

test('the candidate base omits Genshin, preserves all other games and needs no Genshin source directory', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'genshin-main-base-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const games = join(root, 'packages/data/games');
  mkdirSync(games, { recursive: true });
  for (const entry of readdirSync(join(ROOT, 'packages/data/games'), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'genshin') symlinkSync(join(ROOT, 'packages/data/games', entry.name), join(games, entry.name));
  }
  const base = await mainManifests(pathToFileURL(games + '/'), { genshinWorkerBase: true });
  const legacy = await mainManifests();
  for (const [file, value] of legacy) {
    const expected = structuredClone(value);
    if (file === 'games.json') delete expected.games.genshin;
    else delete expected.genshin;
    assert.deepEqual(base.get(file), expected);
  }
  const output = join(root, 'candidate');
  const result = await writeGenshinMainBase(output, root);
  assert.equal(result.productionReady, false);
  assert.equal(result.cloudWrites, false);
  assert.equal(result.files.length, 4);
  for (const [file, value] of base) assert.deepEqual(JSON.parse(readFileSync(join(output, file))), value);
  await assert.rejects(writeGenshinMainBase(output, root), /EEXIST/);
  await assert.rejects(writeGenshinMainBase(root, root), /cannot contain/);
  const linked = join(root, 'linked');
  symlinkSync(games, linked);
  await assert.rejects(writeGenshinMainBase(join(linked, 'outside'), root), /Linked output parent/);
});

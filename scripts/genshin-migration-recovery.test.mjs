import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { prepareGenshinMigrationRecovery, verifyGenshinMigrationRecovery } from './genshin-migration-recovery.mjs';

const source = resolve(import.meta.dirname, '..');
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'migration-recovery-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const input = { source, previous: join(root, 'old'), candidate: join(root, 'new'), forward: join(root, 'forward'), recovery: join(root, 'recovery'), runtime: Buffer.from('export default {fetch(){return new Response("old runtime")}}') };
  const put = (file, bytes) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes); };
  for (const [artifact, version] of [[input.previous, 'old'], [input.candidate, 'new']]) {
    put(join(artifact, 'worker.js'), version);
    put(join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}');
    put(join(artifact, 'assets/BUILD_ID'), version);
    put(join(artifact, 'cache/keep'), version);
    for (const prefix of ['assets/_next/static/', 'assets/_games/genshin/_next/static/']) put(join(artifact, prefix, version + '.js'), version);
    put(join(artifact, 'assets/data/genshin/raw-guides.json'), version);
  }
  const exports = genshinContentAssets(source);
  for (const [file, bytes] of exports.files) put(join(input.candidate, 'assets', exports.contract.prefix, file), bytes);
  return { input, put, exports };
}
test('initial recovery retains the exact old runtime and content while adding complete same-A exports', t => {
  const f = fixture(t), proof = prepareGenshinMigrationRecovery(f.input);
  assert.equal(proof.exports, f.exports.files.size);
  assert.equal(proof.version, f.exports.manifest.version);
  assert.equal(readFileSync(join(f.input.recovery, 'assets/data/genshin/raw-guides.json'), 'utf8'), 'old');
  assert(readFileSync(join(f.input.recovery, 'worker.js')).equals(f.input.runtime));
  assert.deepEqual(verifyGenshinMigrationRecovery(f.input), proof);
});
for (const fault of ['export', 'runtime', 'old-content', 'cache', 'extra', 'forward', 'forward-static']) test(`rejects ${fault} mutation`, t => {
  const f = fixture(t); prepareGenshinMigrationRecovery(f.input);
  const paths = { export: 'assets/_games/genshin/content/platform.json', runtime: 'worker.js', 'old-content': 'assets/data/genshin/raw-guides.json',
    cache: 'cache/keep', extra: 'assets/unreviewed.json', forward: 'assets/data/genshin/raw-guides.json', 'forward-static': 'assets/_next/static/new.js' };
  f.put(join(fault.startsWith('forward') ? f.input.forward : f.input.recovery, paths[fault]), 'changed');
  assert.throws(() => verifyGenshinMigrationRecovery(f.input));
});
test('rejects candidate content not derived from the exact source', t => {
  const f = fixture(t); f.put(join(f.input.candidate, 'assets/_games/genshin/content/platform.json'), '{}');
  assert.throws(() => prepareGenshinMigrationRecovery(f.input), /complete published A/);
});

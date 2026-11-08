import assert from 'node:assert/strict';
import fs, { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { prepareUnifiedAssetPair, unifiedService, unifiedStaticFiles, verifyUnifiedAssetPair, UNIFIED_OWNERS } from './unified-release-assets.mjs';
import { digest } from './desktop-release-assets.mjs';

function fixture(t, owner = 'main') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-asset-pair-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (name, text) => { const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
  for (const role of ['old', 'new']) {
    write(`${role}/worker.js`, `export default {role:'${role}'}`);
    write(`${role}/.build/open-next.config.edge.mjs`, 'export default {}');
    write(`${role}/assets/BUILD_ID`, role);
    write(`${role}/assets/data/game/raw-characters.json`, JSON.stringify({ role }));
    write(`${role}/cache/page.html`, `<main>${role}</main>`);
    for (const prefix of ['_next/static', ...(owner === 'main' ? [] : [`_games/${owner}/_next/static`])]) {
      write(`${role}/assets/${prefix}/media/${role}.png`, `synthetic-${role}-image-bytes`);
      write(`${role}/assets/${prefix}/${role}/chunk.js`, `console.log('${role}')`);
      write(`${role}/assets/${prefix}/shared.css`, 'body{margin:0}');
    }
  }
  const input = { owner, previous: join(root, 'old'), candidate: join(root, 'new'), forward: join(root, 'forward'), recovery: join(root, 'recovery'), runtime: Buffer.from('export default {archived:true}') };
  return { root, write, input, check: () => verifyUnifiedAssetPair({ ...input, runtimeSHA256: digest(input.runtime) }) };
}

for (const owner of UNIFIED_OWNERS) test(`${owner}: both runtimes retain the static union without copying the other content or cache`, t => {
  const f = fixture(t, owner), result = prepareUnifiedAssetPair(f.input);
  assert.equal(unifiedService(owner), owner === 'main' ? 'gachia' : `gachia-game-${owner}`);
  assert(result.forwardAdded > 0 && result.recoveryAdded > 0);
  assert.equal(readFileSync(join(f.input.forward, 'assets/data/game/raw-characters.json'), 'utf8'), '{"role":"new"}');
  assert.equal(readFileSync(join(f.input.recovery, 'assets/data/game/raw-characters.json'), 'utf8'), '{"role":"old"}');
  assert.equal(readFileSync(join(f.input.forward, 'cache/page.html'), 'utf8'), '<main>new</main>');
  assert.equal(readFileSync(join(f.input.recovery, 'cache/page.html'), 'utf8'), '<main>old</main>');
  assert.equal(readFileSync(join(f.input.recovery, 'worker.js'), 'utf8'), f.input.runtime.toString());
  f.check();
});

for (const failure of ['static-change', 'static-missing', 'runtime-change', 'json-change', 'cache-change', 'extra-file', 'static-link', 'ancestor-link']) {
  test(`independent pair verification rejects ${failure}`, t => {
    const f = fixture(t, 'lvmeng'); prepareUnifiedAssetPair(f.input);
    if (failure === 'static-change') f.write('recovery/assets/_next/static/new/chunk.js', 'wrong');
    if (failure === 'static-missing') rmSync(join(f.input.recovery, 'assets/_games/lvmeng/_next/static/new/chunk.js'));
    if (failure === 'runtime-change') f.write('recovery/worker.js', 'wrong');
    if (failure === 'json-change') f.write('recovery/assets/data/game/raw-characters.json', '{"role":"new"}');
    if (failure === 'cache-change') f.write('forward/cache/page.html', '<main>old</main>');
    if (failure === 'extra-file') f.write('forward/unauthorized.txt', 'extra');
    if (failure === 'static-link') {
      rmSync(join(f.input.previous, 'assets/_next/static/old/chunk.js'));
      symlinkSync('../../../../../new/worker.js', join(f.input.previous, 'assets/_next/static/old/chunk.js'));
    }
    if (failure === 'ancestor-link') {
      rmSync(join(f.input.recovery, 'assets/_next/static/new'), { recursive: true });
      symlinkSync(join(f.input.candidate, 'assets/_next/static/new'), join(f.input.recovery, 'assets/_next/static/new'));
    }
    assert.throws(f.check);
  });
}

test('immutable collisions fail before either output is created', t => {
  const f = fixture(t); f.write('old/assets/_next/static/shared.css', 'different');
  assert.throws(() => prepareUnifiedAssetPair(f.input), /Immutable static collision/);
  assert.throws(() => realpathSync(f.input.forward), /ENOENT/);
  assert.throws(() => realpathSync(f.input.recovery), /ENOENT/);
});

test('unknown owners and missing static inventories fail closed', t => {
  const f = fixture(t);
  assert.throws(() => unifiedService('router'), /Unknown/);
  rmSync(join(f.input.previous, 'assets/_next/static'), { recursive: true });
  assert.throws(() => unifiedStaticFiles(f.input.previous, 'main'), /coverage/);
});

test('dedicated raw and namespaced URLs must both exist with identical bytes', t => {
  const f = fixture(t, 'nte');
  const alias = 'old/assets/_games/nte/_next/static/old/chunk.js';
  f.write(alias, 'different alias');
  assert.throws(() => unifiedStaticFiles(f.input.previous, 'nte'), /alias missing or changed/);
  rmSync(join(f.root, alias));
  assert.throws(() => unifiedStaticFiles(f.input.previous, 'nte'), /alias missing or changed/);
});

test('one synchronous pair check reads each artifact once, but later checks read again', t => {
  const f = fixture(t); prepareUnifiedAssetPair(f.input);
  const targets = ['previous', 'candidate', 'forward', 'recovery'].map(role => join(f.input[role], 'assets/data/game/raw-characters.json'));
  const counts = new Map(targets.map(file => [file, 0])), original = fs.readFileSync;
  const mock = t.mock.method(fs, 'readFileSync', function(file, ...args) {
    if (counts.has(String(file))) counts.set(String(file), counts.get(String(file)) + 1);
    return original.call(this, file, ...args);
  });
  syncBuiltinESMExports();
  try {
    f.check(); assert.deepEqual([...counts.values()], [1, 1, 1, 1]);
    f.check(); assert.deepEqual([...counts.values()], [2, 2, 2, 2]);
  } finally { mock.mock.restore(); syncBuiltinESMExports(); }
});

test('pair check rejects same-size same-mtime changes after success and discards failed passes', async t => {
  const f = fixture(t); prepareUnifiedAssetPair(f.input); f.check();
  const file = join(f.input.forward, 'assets/data/game/raw-characters.json');
  const original = readFileSync(file), stat = statSync(file);
  await Promise.resolve();
  writeFileSync(file, original.toString().replace('new', 'bad')); utimesSync(file, stat.atime, stat.mtime);
  assert.throws(f.check, /unauthorized non-static change/);
  writeFileSync(file, original); utimesSync(file, stat.atime, stat.mtime); f.check();
  f.write('forward/added-after-success', 'new'); assert.throws(f.check, /unauthorized non-static change/);
  rmSync(join(f.input.forward, 'added-after-success')); f.check();
});

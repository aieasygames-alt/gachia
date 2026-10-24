import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireLocalContentOrigin, verifyManagedContent, verifyNoLegacyIndexNowTransport, verifyWithdrawnRocoAssets } from './managed-content-smoke.mjs';

test('refuses stale static images and private withdrawal evidence in compiled assets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-withdrawn-assets-'));
  const assets = join(directory, 'assets'); mkdirSync(assets);
  try {
    assert.throws(() => verifyWithdrawnRocoAssets(directory), /No compiled assets/);
    writeFileSync(join(assets, 'robots.txt'), 'User-agent: *');
    assert.equal(verifyWithdrawnRocoAssets(directory).withdrawnImagesPublished, false);
    for (const path of ['images/roco/characters/meewee.webp', 'images/roco/characters/new.webp', 'reports/content-integrity/archive/s2-14/characters.json']) {
      const target = join(assets, path); mkdirSync(join(target, '..'), { recursive: true }); writeFileSync(target, 'private');
      assert.throws(() => verifyWithdrawnRocoAssets(directory), /Withdrawn Roco asset or private evidence/);
      rmSync(target);
    }
    const original = new URL('../reports/content-integrity/archive/s2-14/images/meewee.webp', import.meta.url);
    const alias = join(assets, 'renamed.webp'); copyFileSync(original, alias);
    assert.throws(() => verifyWithdrawnRocoAssets(directory), /under another path/); rmSync(alias);
    const cn = join(assets, 'images/roco-cn/characters/miaomiao.webp'); mkdirSync(join(cn, '..'), { recursive: true }); copyFileSync(original, cn);
    assert.equal(verifyWithdrawnRocoAssets(directory).withdrawnImagesPublished, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('refuses a stale compiled IndexNow sender before starting authenticated local requests', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-compiled-indexnow-'));
  try {
    assert.throws(() => verifyNoLegacyIndexNowTransport(directory), /No compiled code/);
    const path = join(directory, 'handler.mjs');
    writeFileSync(path, 'fetch("https://api.indexnow.org/indexnow")');
    assert.throws(() => verifyNoLegacyIndexNowTransport(directory), /Legacy IndexNow transport/);
    writeFileSync(path, 'export const status = "paused";');
    assert.deepEqual(verifyNoLegacyIndexNowTransport(directory), { codeFiles: 1, legacyTransportStringsPresent: false });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('managed content checks reject remote origins, credentials and implicit ports before requesting data', async () => {
  for (const origin of ['https://gachia.com', 'http://localhost:8080', 'http://127.0.0.1', 'http://user:secret@127.0.0.1:8080', 'http://127.0.0.1:8080/other', 'http://127.0.0.1:8080/?token=secret']) {
    await assert.rejects(verifyManagedContent(origin), /explicit local Worker origin/);
  }
});
test('managed content checks accept only an explicit loopback fixture', () => {
  assert.equal(requireLocalContentOrigin('http://127.0.0.1:8080'), 'http://127.0.0.1:8080');
});
test('compiled managed content runs after browser installation and before artifact sealing', () => {
  const source = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const check = source.indexOf('run: pnpm test:managed-content:local');
  assert(check > source.indexOf('name: Install Playwright browser'));
  assert(check < source.indexOf('id: seal-web'));
  assert.match(source, /name: Verify compiled managed content and source-review decisions\n\s+if: steps.scope.outputs.scope != 'admin'\n\s+run: pnpm test:managed-content:local/);
});

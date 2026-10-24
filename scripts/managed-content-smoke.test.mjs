import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireLocalContentOrigin, requirePublishedContentOrigin, verifyPublishedIndexNow, verifyPublishedManagedContent, verifyManagedContent, verifyNoLegacyIndexNowTransport, verifyWithdrawnRocoAssets } from './managed-content-smoke.mjs';

test('cloud IndexNow probe never sends credentials, follows redirects or claims authenticated pause verification', async () => {
  const calls = [];
  const result = await verifyPublishedIndexNow('https://gachia.com', async (url, options) => {
    calls.push(url);
    assert.equal(url, 'https://gachia.com/api/indexnow');
    assert.deepEqual(options.headers, { 'content-type': 'application/json' });
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'manual');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  });
  assert.equal(calls.length, 1);
  assert.equal(result[0].submissionAttempted, false);
  assert.match(result[0].pauseEvidence, /not_cloud_authenticated_probe/);
  for (const response of [Response.json({ ok: true }), Response.json({ error: 'Unavailable' }, { status: 503 }), Response.json({ error: 'Other' }, { status: 401 })]) {
    await assert.rejects(verifyPublishedIndexNow('https://gachia.com', async () => response));
  }
  await assert.rejects(verifyPublishedIndexNow('https://evil.example', () => assert.fail('No request permitted')));
});

test('published acceptance is separate from the authenticated local fixture and rejects origin overrides', async () => {
  for (const origin of ['https://gachia.com', 'https://gachia-staging.aieasygames.workers.dev']) assert.equal(requirePublishedContentOrigin(origin), origin);
  for (const origin of ['https://gachia.com/', 'https://gachia.com?x=1', 'https://u:p@gachia.com', 'http://gachia.com', 'https://evil.example', 'http://127.0.0.1:8080']) {
    await assert.rejects(verifyPublishedManagedContent(origin), /exact main staging or production origin/);
  }
  const staging = readFileSync(new URL('./web-staging-acceptance.mjs', import.meta.url), 'utf8');
  assert(staging.includes('record.managedContent = await verifyPublishedManagedContent(origin, directory'));
});

test('cloud content, XML and durable evidence are mandatory before promotion and after deployment', () => {
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const staging = workflow.split('\n  deploy-staging:')[1].split('\n  deploy:\n')[0];
  const production = workflow.split('\n  deploy:\n')[1];
  assert(workflow.indexOf('Block loss of Main-owned fallback discovery') < workflow.indexOf('id: seal-web'));
  assert(workflow.includes('run: python3 -B scripts/web-published-sitemap-audit.py local'));
  assert(staging.includes('run: node scripts/web-staging-acceptance.mjs'));
  assert(staging.includes('run: python3 -B scripts/web-published-sitemap-audit.py staging'));
  assert(staging.includes('name: Preserve staging release acceptance records\n        if: always()'));
  assert(production.includes('needs.deploy-staging.result == \'success\''));
  assert(production.includes('run: node scripts/web-production-acceptance.mjs'));
  assert(production.indexOf('run: node scripts/web-production-acceptance.mjs') > production.indexOf('name: Deploy to Cloudflare'));
  assert(production.includes('run: python3 -B scripts/web-published-sitemap-audit.py production'));
  assert(production.includes('name: Preserve production release acceptance records\n        if: always()'));
  for (const section of [staging, production]) {
    assert(section.includes('artifact-ids: ${{ needs.build.outputs.web-artifact-id }}'));
    assert(section.includes('EXPECTED_SHA256: ${{ needs.build.outputs.web-artifact-sha256 }}'));
    assert(!/opennextjs-cloudflare build/.test(section));
  }
});

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

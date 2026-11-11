import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { digest } from './desktop-release-assets.mjs';
import { join } from 'node:path';
import test from 'node:test';
import { unifiedSourceFixture, sourceFixtureUUID } from './fixtures/unified-source-fixture.mjs';
import { UNIFIED_SOURCE_OWNERS } from './unified-historical-sources.mjs';
import { advanceUnifiedSourceIndex, bindUnifiedNextSources, captureUnifiedNextBaseline, publishedUnifiedSources, readUnifiedNextBaseline, readUnifiedSourceIndex, selectUnifiedNextPrevious } from './unified-source-advance.mjs';

test('published JSON uses accepted bytes only for exactly equal structured content', t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'published-format-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'assets/data/sea'), { recursive: true });
  const file = join(root, 'assets/data/sea/raw-guides.json');
  const value = [{ id: 'guide', enabled: false, title: 'Reviewed', optional: null }];
  const text = JSON.stringify(value, null, 2), published = JSON.stringify(value) + '\n';
  const source = { sourcePath: 'packages/data/games/sea/raw-guides.json', text, sha256: digest(text) };
  const typed = { sourcePath: 'packages/data/games/sea/tier-lists.ts', text: 'export {}', sha256: digest('export {}') };
  writeFileSync(file, published);
  const result = publishedUnifiedSources([source, typed], ['sea/raw-guides.json'], root);
  assert.equal(result[0].text, published); assert.equal(result[0].sha256, digest(published));
  assert.deepEqual(result[1], typed); assert.equal(source.text, text);
  for (const changed of [[{ ...value[0], title: 'Unreviewed' }], [{ ...value[0], enabled: 'false' }], [], [value[0], value[0]]]) {
    writeFileSync(file, JSON.stringify(changed));
    assert.throws(() => publishedUnifiedSources([source], ['sea/raw-guides.json'], root), /Published JSON differs/);
  }
  writeFileSync(file, published);
  assert.throws(() => publishedUnifiedSources([{ ...source, sha256: '0'.repeat(64) }], ['sea/raw-guides.json'], root), /Corrupt sealed/);
});

test('source advance keeps all five owners, exact published runtime/static union and all 115 new A inputs', async t => {
  const f = await unifiedSourceFixture(t), result = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') });
  const opened = await readUnifiedSourceIndex({ spec: f.spec, proof: result.proof });
  assert.equal(opened.value.schemaVersion, 1); assert.equal(Object.hasOwn(opened.value, 'ownerOrder'), false);
  assert.equal(Object.hasOwn(opened.value, 'deploymentIds'), false, 'Historical Main receipts keep their exact format');
  assert.equal(opened.sources.length, 115); assert.deepEqual(Object.keys(opened.value.owners), UNIFIED_SOURCE_OWNERS);
  assert.equal(readFileSync(join(opened.value.owners.main.directory, 'worker.js'), 'utf8'), 'published main');
  for (const path of ['old.js', 'new.js']) assert(existsSync(join(opened.value.owners.main.directory, 'assets/_next/static', path)));
  for (const owner of UNIFIED_SOURCE_OWNERS.filter(owner => owner !== 'main')) assert.deepEqual(opened.value.owners[owner], f.spec.owners[owner]);
  assert.equal(opened.value.cloudWrites, false); assert.equal(opened.newPublicationAuthorized, false); assert.equal(opened.freshnessRenewed, false);
  assert.equal(readFileSync(join(f.spec.owners.main.directory, 'worker.js'), 'utf8'), 'unbundled candidate');
});

test('next batch takes new observations and consumes published A/code plus current Main, never historical per-game Main', async t => {
  const f = await unifiedSourceFixture(t), index = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') });
  let calls = 0;
  const next = await captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: join(f.root, 'next'), request: async (...args) => { calls++; return f.request(...args); } });
  assert.equal(calls, f.spec.publicReferences.length);
  const opened = await readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof, fresh: true });
  assert.deepEqual(opened.sources, f.spec.sources); assert.equal(opened.sources.filter(row => row.sourcePath.endsWith('.ts')).length, 25);
  assert.equal(opened.previous.owners.main.versionId, f.spec.owners.main.versionId);
  assert.equal(opened.previous.owners.main.directory, index.value.owners.main.directory);
  assert.deepEqual(Object.keys(opened.previous.owners), UNIFIED_SOURCE_OWNERS); assert.equal(opened.newPublicationAuthorized, false);
  const frozen = { planSHA256: f.spec.planSHA256, owners: ['lvmeng', 'main'], candidate: { baselines: opened.sources.map(row => ({ sourcePath: row.sourcePath, activeSHA256: row.sha256 })) } };
  const previous = selectUnifiedNextPrevious(opened, frozen);
  assert.deepEqual(Object.keys(previous.owners), ['lvmeng', 'main']); assert.equal(previous.owners.main.directory, index.value.owners.main.directory);
  for (const fault of ['plan', 'old-A', 'missing-A', 'duplicate-owner', 'unknown-owner', 'missing-main']) {
    const bad = structuredClone(frozen);
    if (fault === 'plan') bad.planSHA256 = '0'.repeat(64);
    if (fault === 'old-A') bad.candidate.baselines.find(row => row.sourcePath.endsWith('.ts')).activeSHA256 = '0'.repeat(64);
    if (fault === 'missing-A') bad.candidate.baselines.pop();
    if (fault === 'duplicate-owner') bad.owners.push('main');
    if (fault === 'unknown-owner') bad.owners.unshift('router');
    if (fault === 'missing-main') bad.owners = ['lvmeng'];
    assert.throws(() => selectUnifiedNextPrevious(opened, bad));
  }
});

test('historical index remains readable but old next-batch observations never grant fresh authority', async t => {
  const f = await unifiedSourceFixture(t), index = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') });
  const next = await captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: join(f.root, 'next') });
  const now = Date.now(); t.mock.method(Date, 'now', () => now + 900001);
  assert.equal((await readUnifiedSourceIndex({ spec: f.spec, proof: index.proof })).freshnessRenewed, false);
  await assert.rejects(readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof, fresh: true }), /expired/);
  const historical = await readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof });
  assert.deepEqual(historical.sources, f.spec.sources); assert.equal(historical.newPublicationAuthorized, false);
});

for (const fault of ['none', 'old-A', 'missing-code', 'duplicate-A', 'old-Main', 'partial-index', 'wrong-plan', 'old-baseline', 'topology', 'unselected-owner']) {
  test(`production/historical next-source binding preserves complete A and exact Main: ${fault}`, async t => {
    const f = await unifiedSourceFixture(t), index = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') });
    const handoff = await captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: join(f.root, 'next') });
    const next = await readUnifiedNextBaseline({ spec: f.spec, handoff: handoff.proof });
    const frozen = { planSHA256: f.spec.planSHA256, owners: ['main'], candidate: { baselines: next.sources.map(row => ({ sourcePath: row.sourcePath, activeSHA256: row.sha256 })) } };
    const binding = { active: structuredClone(next.sources), frozen, previous: selectUnifiedNextPrevious(next, frozen), baseline: structuredClone(next.baseline) };
    if (fault === 'old-A') binding.active[0].text = 'old Git O';
    if (fault === 'missing-code') binding.active = binding.active.filter(row => !row.sourcePath.endsWith('.ts'));
    if (fault === 'duplicate-A') binding.active.push(binding.active[0]);
    if (fault === 'old-Main') binding.previous.owners.main = f.spec.owners.main;
    if (fault === 'partial-index') delete next.previous.owners.nte;
    if (fault === 'wrong-plan') frozen.planSHA256 = '0'.repeat(64);
    if (fault === 'old-baseline') binding.baseline = f.spec.baseline;
    if (fault === 'topology') binding.baseline.routes.push({ pattern: 'changed' });
    if (fault === 'unselected-owner') binding.previous.owners.nte = next.previous.owners.nte;
    if (fault !== 'none') { assert.throws(() => bindUnifiedNextSources(next, binding)); return; }
    const opened = bindUnifiedNextSources(next, binding);
    assert.deepEqual(Object.keys(opened.owners), UNIFIED_SOURCE_OWNERS); assert.deepEqual(Object.keys(binding.previous.owners), ['main']);
    assert.equal(opened.owners.main.versionId, f.spec.owners.main.versionId);
    assert.equal(opened.provenance.main.mode, 'unified_upload_time_module_receipt');
    assert.deepEqual(opened.provenance.main.moduleContext, f.spec.owners.main.moduleContext);
    assert.equal(opened.currentCloudRead, false); assert.equal(opened.freshnessRenewed, false);
  });
}

for (const fault of ['unknown-main', 'old-main', 'same-uuid-new-deployment', 'protected-game', 'topology', 'immutable-version', 'public-A', 'public-unavailable', 'public-cookie', 'public-private',
  'partial-http', 'missing-owner', 'missing-source', 'duplicate-source', 'code-bytes', 'static-tamper', 'module-receipt', 'mid-observation-drift']) {
  test(`source advance refuses ${fault} without a usable source index`, async t => {
    const f = await unifiedSourceFixture(t), directory = join(f.root, 'advance');
    if (fault === 'unknown-main') f.current.services.gachia.versions[0].version_id = sourceFixtureUUID(900);
    if (fault === 'old-main') f.current.services.gachia = f.spec.baseline.services.gachia;
    if (fault === 'same-uuid-new-deployment') f.current.services.gachia.id = sourceFixtureUUID(900);
    if (fault === 'protected-game') f.current.services['gachia-game-genshin'].versions[0].version_id = sourceFixtureUUID(900);
    if (fault === 'topology') f.current.routes.push({ pattern: 'changed' });
    if (fault === 'immutable-version') f.versions.gachia.number++;
    if (fault === 'public-A') f.request = async () => Response.json([{ id: 'old content' }]);
    if (fault === 'public-unavailable') f.request = async () => new Response('unavailable', { status: 503 });
    if (fault === 'public-cookie') { const original = f.request; f.request = async (...args) => { const response = await original(...args); response.headers.set('set-cookie', 'x=1'); return response; }; }
    if (fault === 'public-private') { const original = f.request; f.request = async (...args) => { const response = await original(...args); response.headers.set('cache-control', 'private, no-store'); return response; }; }
    if (fault === 'partial-http') { let n = 0; const original = f.request; f.request = async (...args) => { if (++n > 5) throw Error('isolated timeout'); return original(...args); }; }
    if (fault === 'missing-owner') delete f.spec.owners.lvmeng;
    if (fault === 'missing-source') f.spec.sources.splice(f.spec.sources.findIndex(row => row.sourcePath.endsWith('ananta/raw-guides.json')), 1);
    if (fault === 'duplicate-source') f.spec.sources.push(f.spec.sources[0]);
    if (fault === 'code-bytes') f.spec.sources.find(row => row.sourcePath.endsWith('.ts')).text = 'changed';
    if (fault === 'static-tamper') writeFileSync(join(f.spec.owners.main.directory, 'assets/_next/static/old.js'), 'changed');
    if (fault === 'module-receipt') writeFileSync(f.spec.owners.main.moduleProof.path, '{}');
    if (fault === 'mid-observation-drift') { let n = 0; f.reader.snapshot = async () => { if (++n > 1) f.current.services.gachia.id = sourceFixtureUUID(900); return structuredClone(f.current); }; }
    await assert.rejects(advanceUnifiedSourceIndex({ ...f, directory })); assert(!existsSync(join(directory, 'source-index.json')));
  });
}

for (const fault of ['index-pin', 'active-code', 'missing-owner', 'old-main', 'foreign-publication', 'main-json', 'static', 'version-evidence', 'public-body', 'grant-authority', 'failed-attempt']) {
  test(`source reader refuses ${fault}, even when the top-level index is repinned`, async t => {
    const f = await unifiedSourceFixture(t), result = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') }), value = structuredClone(result.value);
    if (fault === 'index-pin') result.proof.pin = '0'.repeat(64);
    if (fault === 'active-code') { const rows = structuredClone(f.spec.sources); rows.find(row => row.sourcePath.endsWith('.ts')).text = 'old O'; value.active = f.save(value.active.path, rows); }
    if (fault === 'missing-owner') delete value.owners.nte;
    if (fault === 'old-main') value.owners.main = f.spec.owners.genshin;
    if (fault === 'foreign-publication') value.publication.pin = '0'.repeat(64);
    if (fault === 'main-json') writeFileSync(join(value.owners.main.directory, 'assets/data/ananta/raw-guides.json'), '[]');
    if (fault === 'static') writeFileSync(join(value.owners.main.directory, 'assets/_next/static/new.js'), 'changed');
    if (fault === 'version-evidence') writeFileSync(value.observation.versions.main.path, '{}');
    if (fault === 'public-body') writeFileSync(join(result.proof.path, '../public/5.body'), 'old O');
    if (fault === 'grant-authority') value.newPublicationAuthorized = true;
    if (fault === 'failed-attempt') f.save(join(result.proof.path, '../failure.json'), { status: 'failed' });
    if (fault !== 'index-pin') result.proof = f.save(result.proof.path, value);
    await assert.rejects(readUnifiedSourceIndex({ spec: f.spec, proof: result.proof }));
  });
}

for (const fault of ['old-A', 'legacy-main', 'missing-owner', 'reuse-observation', 'current-drift', 'public-failure']) {
  test(`next-batch consumption refuses ${fault}`, async t => {
    const f = await unifiedSourceFixture(t), index = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') });
    if (fault === 'current-drift') f.current.services.gachia.id = sourceFixtureUUID(900);
    if (fault === 'public-failure') f.request = async () => { throw Error('isolated failure'); };
    if (['current-drift', 'public-failure'].includes(fault)) {
      await assert.rejects(captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: join(f.root, 'next') }));
      assert(!existsSync(join(f.root, 'next/source-handoff.json'))); return;
    }
    const next = await captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: join(f.root, 'next') }), value = next.value;
    if (fault === 'old-A') value.active = f.save(value.active.path, f.spec.sources.map(row => row.sourcePath.endsWith('.ts') ? { ...row, text: 'old O' } : row));
    if (['legacy-main', 'missing-owner'].includes(fault)) {
      const previous = JSON.parse(readFileSync(value.previous.path));
      if (fault === 'legacy-main') previous.owners.main = f.spec.owners.main;
      else delete previous.owners['azur-promilia'];
      value.previous = f.save(value.previous.path, previous);
    }
    if (fault === 'reuse-observation') value.observation = { ...index.value.observation, startedAt: index.value.observation.startedAt - 1 };
    next.proof = f.save(next.proof.path, value);
    await assert.rejects(readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof, fresh: true }));
  });
}

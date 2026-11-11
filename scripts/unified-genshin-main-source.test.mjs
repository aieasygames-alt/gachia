import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { genshinMainSourceFixture as fixture } from './fixtures/unified-genshin-main-source-fixture.mjs';
import { pairUUID } from './fixtures/unified-genshin-main-fixture.mjs';
import { readUnifiedGenshinMainSourceSpec } from './unified-genshin-main-source.mjs';
import { UNIFIED_SOURCE_OWNERS } from './unified-historical-sources.mjs';
import { advanceUnifiedSourceIndex, bindUnifiedNextSources, captureUnifiedNextBaseline, readUnifiedNextBaseline, readUnifiedSourceIndex, selectUnifiedNextPrevious } from './unified-source-advance.mjs';

const owners = ['genshin', 'main'], json = value => JSON.stringify(value, null, 2) + '\n', load = file => JSON.parse(readFileSync(file));
const binding = (next, selected = ['genshin', 'main']) => {
  const frozen = { planSHA256: next.value.planSHA256, owners: selected,
    candidate: { baselines: next.sources.map(row => ({ sourcePath: row.sourcePath, activeSHA256: row.sha256 })) } };
  return { frozen, baseline: structuredClone(next.baseline), active: structuredClone(next.sources), previous: selectUnifiedNextPrevious(next, frozen) };
};
async function successful(t) {
  const f = await fixture(t), index = await advanceUnifiedSourceIndex({ ...f, directory: join(f.root, 'advance') });
  const next = await captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: join(f.root, 'next') });
  return { f, index, next };
}
function snapshot(f) {
  const files = new Map(), walk = directory => { for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name); if (entry.isDirectory()) walk(file); else files.set(file, readFileSync(file));
  } }; walk(f.root); walk(f.pair.input.run);
  const spec = structuredClone(f.spec), current = structuredClone(f.current), versions = structuredClone(f.versions), { reader, request } = f;
  return () => {
    for (const file of [join(f.root, 'advance/failure.json'), join(f.root, 'next/failure.json')]) if (!files.has(file)) rmSync(file, { force: true });
    for (const [file, bytes] of files) writeFileSync(file, bytes);
    f.spec = structuredClone(spec); Object.assign(f.current, structuredClone(current)); Object.assign(f.versions, structuredClone(versions));
    f.reader = reader; f.request = request;
  };
}

test('real dual completion feeds two exact source replacements, all 115 inputs, fresh next batch and five-owner provenance', async t => {
  const { f, index, next } = await successful(t), opened = await readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof, fresh: true });
  assert.equal(f.projected.productionReady, false); assert.equal(index.value.schemaVersion, 2); assert.equal(next.value.schemaVersion, 2);
  assert.deepEqual(index.value.ownerOrder, owners); assert.deepEqual(index.value.deploymentIds, f.spec.deploymentIds);
  assert.deepEqual(Object.keys(opened.previous.owners), UNIFIED_SOURCE_OWNERS); assert.equal(opened.sources.length, 115);
  assert.equal(opened.sources.filter(row => row.sourcePath.endsWith('.ts')).length, 25);
  assert.deepEqual(opened.sources, f.spec.sources); assert.notDeepEqual(opened.sources, f.recovery);
  for (const owner of owners) {
    const row = index.value.owners[owner], original = f.spec.owners[owner];
    assert.equal(row.directory, join(f.root, 'advance', owner)); assert.equal(row.versionId, f.projected.completed.deployments[owner].versionId);
    assert.equal(readFileSync(join(row.directory, 'worker.js'), 'utf8'), f.projected.completed.modules[owner].candidate.code.toString());
    assert.equal(readFileSync(join(original.directory, 'worker.js'), 'utf8'), `unbundled candidate ${owner}`);
    const inputFiles = artifactFiles(original.directory).filter(row => row.path !== 'worker.js');
    assert.deepEqual(artifactFiles(row.directory).filter(row => row.path !== 'worker.js'), inputFiles);
    assert.equal(opened.previous.owners[owner].directory, row.directory);
  }
  for (const owner of UNIFIED_SOURCE_OWNERS.filter(owner => !owners.includes(owner))) assert.deepEqual(index.value.owners[owner], f.spec.owners[owner]);
  const expectedRequests = owners.reduce((n, owner) => n + f.spec.publicReferences[owner].length, 0);
  assert.equal(f.calls.length, expectedRequests * 2);
  for (const selected of [owners, ['main'], ['nte', 'main']]) {
    const input = binding(opened, selected), normalized = bindUnifiedNextSources(opened, input);
    assert.deepEqual(Object.keys(input.previous.owners), selected); assert.deepEqual(Object.keys(normalized.owners), UNIFIED_SOURCE_OWNERS);
    for (const owner of owners) {
      assert.equal(normalized.owners[owner].versionId, f.spec.owners[owner].versionId);
      assert.equal(normalized.provenance[owner].mode, 'unified_upload_time_module_receipt');
      assert.deepEqual(normalized.provenance[owner].moduleContext, f.spec.owners[owner].moduleContext);
    }
    assert.equal(normalized.freshnessRenewed, false);
  }
  assert.equal(index.value.cloudWrites, false); assert.equal(index.value.newPublicationAuthorized, false);
  assert.equal(opened.newPublicationAuthorized, false);
});

test('dual historical receipts remain offline and readable without granting freshness at the exact cutoff', async t => {
  const { f, index, next } = await successful(t); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('Offline source reads only'); });
  t.mock.method(Date, 'now', () => next.value.observation.startedAt + 900000);
  assert.equal((await readUnifiedSourceIndex({ spec: f.spec, proof: index.proof })).freshnessRenewed, false);
  assert.equal((await readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof })).newPublicationAuthorized, false);
  await assert.rejects(readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof, fresh: true }), /expired/); assert.equal(calls, 0);
});

test('dual source projection reopens completion and all old immutable owners rather than accepting success flags', async t => {
  const f = await fixture(t), restore = snapshot(f), cases = {
    'completion pin': () => { f.input.completed.proof.pin = 'c'.repeat(64); },
    'old protected owner': () => { f.input.priorOwners.nte.versionId = pairUUID(999); },
    'missing prior owner': () => { delete f.input.priorOwners.lvmeng; },
    'candidate artifact pin': () => { f.input.candidateArtifacts.genshin.artifactSHA256 = 'c'.repeat(64); },
    'candidate archive': () => writeFileSync(f.projected.completed.modules.genshin.candidate.receipt.archive.path, 'changed'),
    'candidate Main content': () => writeFileSync(join(f.input.candidateArtifacts.main.directory, 'assets/data/genshin/raw-characters.json'), '[]'),
    'sealed source value': () => { const row = f.input.sealedSources.find(row => row.sourcePath.endsWith('genshin/raw-characters.json')); row.text = '[]'; row.sha256 = digest(row.text); },
    'unread old module': () => writeFileSync(f.input.priorOwners['azur-promilia'].moduleProof.path, '{}'),
  };
  const { references, ...evidence } = f.input.completed, input = structuredClone({ ...f.input, completed: evidence });
  for (const [name, edit] of Object.entries(cases)) await t.test(name, async () => {
    restore(); f.input = { ...structuredClone(input), completed: { ...structuredClone(input.completed), references } };
    edit(); await assert.rejects(readUnifiedGenshinMainSourceSpec(f.input));
  });
});

test('dual source advance fails closed for incomplete identities, partial topology, either public owner or changed artifacts', async t => {
  const f = await fixture(t), restore = snapshot(f), cases = {
    'unsupported spec': f => { f.spec.kind = 'unreviewed'; },
    'wrong order': f => { f.spec.ownerOrder.reverse(); },
    'missing source owner': f => { delete f.spec.owners.nte; },
    'missing code source': f => { f.spec.sources.pop(); },
    'duplicate source': f => { f.spec.sources[1] = f.spec.sources[0]; },
    'corrupt source': f => { f.spec.sources[0].text = 'wrong'; },
    'missing public pair': f => { f.spec.pairs.pop(); },
    'missing character mirror': f => { f.spec.pairs[f.spec.pairs.indexOf('genshin/raw-characters.json')] = 'fixture-0/raw-characters.json'; },
    'single deployment ID': f => { f.spec.deploymentId = f.spec.deploymentIds.main; },
    'extra target': f => { f.spec.deploymentIds.nte = pairUUID(999); },
    'missing public owner': f => { delete f.spec.publicReferences.genshin; },
    'protected deployment': f => { f.current.services['gachia-game-nte'].id = pairUUID(999); },
    'topology': f => { f.current.routes.push({ pattern: 'wrong' }); },
    'post HTTP version drift': f => { const read = f.request; f.request = async (...args) => { const response = await read(...args); f.versions['gachia-game-genshin'].number++; return response; }; },
    'end deployment drift': f => { let n = 0; const read = f.reader; f.reader = { ...read, snapshot: async () => { if (++n === 2) f.current.services.gachia.id = pairUUID(999); return structuredClone(f.current); } }; },
  };
  for (const owner of owners) {
    const service = owner === 'main' ? 'gachia' : 'gachia-game-genshin';
    cases[`${owner} prior UUID`] = f => { f.spec.owners[owner].versionId = f.spec.baseline.services[service].versions[0].version_id; };
    cases[`${owner} old activation`] = f => { f.current.services[service] = structuredClone(f.spec.baseline.services[service]); };
    cases[`${owner} new deployment same UUID`] = f => { f.current.services[service].id = pairUUID(999); };
    cases[`${owner} split`] = f => { f.current.services[service].versions[0].percentage = 50; };
    cases[`${owner} missing deployment ID`] = f => { delete f.spec.deploymentIds[owner]; };
    cases[`${owner} wrong deployment ID`] = f => { f.spec.deploymentIds[owner] = 'missing'; };
    cases[`${owner} old module mode`] = f => { f.spec.owners[owner].mode = 'fresh_etag_bound_source_capture'; };
    cases[`${owner} recovery context`] = f => { f.spec.owners[owner].moduleContext.role = 'recovery'; };
    cases[`${owner} other transport`] = f => { f.spec.owners[owner].moduleContext.transportPin = 'c'.repeat(64); };
    cases[`${owner} immutable metadata`] = f => { f.versions[service].number++; };
    cases[`${owner} static`] = f => writeFileSync(join(f.spec.owners[owner].directory, 'assets/_next/static/old.js'), 'changed');
    cases[`${owner} module proof`] = f => writeFileSync(f.spec.owners[owner].moduleProof.path, '{}');
    for (const fault of ['status', 'cookie', 'cache', 'noindex', 'body']) cases[`${owner} public ${fault}`] = f => {
      const read = f.request, target = owner === 'main' && fault === 'noindex' ? '/sitemap.xml'
        : f.spec.publicReferences[owner].find(row => row.path.includes('/characters/'))?.path ?? '/data/genshin/raw-characters.json';
      f.request = async (url, options) => {
        const response = await read(url, options); if (new URL(url).pathname !== target) return response;
        if (fault === 'status') return new Response('unavailable', { status: 503 });
        if (fault === 'body') return new Response('changed', { status: response.status, headers: response.headers });
        response.headers.set(fault === 'cookie' ? 'set-cookie' : fault === 'cache' ? 'cache-control' : 'x-robots-tag',
          fault === 'cookie' ? 'session=wrong' : fault === 'cache' ? 'public, max-age=3600' : 'noindex'); return response;
      };
    };
  }
  let i = 0;
  for (const [name, edit] of Object.entries(cases)) await t.test(name, async () => {
    restore(); edit(f); const directory = join(f.root, `rejected-${i++}`);
    await assert.rejects(advanceUnifiedSourceIndex({ ...f, directory }));
    if (existsSync(join(directory, 'source-index.json'))) await assert.rejects(readUnifiedSourceIndex({ spec: f.spec, proof: f.save(join(directory, 'source-index.json'), load(join(directory, 'source-index.json'))) }));
  });
});

test('repinned dual indexes and next handoffs reject stale owners, changed evidence, replayed observations and downgrades', async t => {
  const { f, index, next } = await successful(t), restore = snapshot(f), originalIndex = structuredClone(index.value), originalNext = structuredClone(next.value);
  const cases = {
    'index schema downgrade': (f, value) => { value.schemaVersion = 1; },
    'index wrong order': (f, value) => { value.ownerOrder.reverse(); },
    'index wrong deployments': (f, value) => { value.deploymentIds.genshin = pairUUID(999); },
    'index missing owner': (f, value) => { delete value.owners.nte; },
    'index other publication': (f, value) => { value.publication.pin = 'c'.repeat(64); },
    'index active source': (f, value) => { value.active = f.save(value.active.path, f.recovery); },
    'index authority': (f, value) => { value.newPublicationAuthorized = true; },
    'index failed': f => f.save(join(f.root, 'advance/failure.json'), { status: 'failed' }),
    'next schema downgrade': (f, value, handoff) => { handoff.schemaVersion = 1; },
    'next wrong deployments': (f, value, handoff) => { delete handoff.deploymentIds.genshin; },
    'next old A': (f, value, handoff) => { handoff.active = f.save(handoff.active.path, f.recovery); },
    'next replayed observation': (f, value, handoff) => { handoff.observation = { ...value.observation, startedAt: value.observation.observedAt }; },
    'next failed': f => f.save(join(f.root, 'next/failure.json'), { status: 'failed' }),
  };
  for (const owner of owners) {
    cases[`index ${owner} old source`] = (f, value) => { value.owners[owner] = f.input.priorOwners[owner]; };
    cases[`index ${owner} relocated`] = (f, value) => { value.owners[owner].directory = f.spec.owners[owner].directory; };
    cases[`index ${owner} static repin`] = (f, value) => {
      writeFileSync(join(value.owners[owner].directory, 'assets/_next/static/old.js'), 'changed');
      value.owners[owner].artifactSHA256 = digest(json(artifactFiles(value.owners[owner].directory)));
    };
    cases[`index ${owner} deployment repin`] = (f, value) => {
      const proof = value.observation.before, data = load(proof.path); data.services[owner === 'main' ? 'gachia' : 'gachia-game-genshin'].id = pairUUID(999);
      value.observation.before = f.save(proof.path, data);
    };
    cases[`index ${owner} public missing`] = (f, value) => { delete value.observation.public[owner]; };
    cases[`index ${owner} public owner repin`] = (f, value) => {
      const proof = value.observation.public[owner], data = load(proof.path); data.kind = 'unreviewed'; value.observation.public[owner] = f.save(proof.path, data);
    };
    cases[`index ${owner} public noindex repin`] = (f, value) => {
      const proof = value.observation.public[owner], data = load(proof.path); data.observations[0].headers['x-robots-tag'] = 'noindex';
      value.observation.public[owner] = f.save(proof.path, data);
    };
    cases[`next ${owner} old previous`] = (f, value, handoff) => {
      const data = load(handoff.previous.path); data.owners[owner] = f.input.priorOwners[owner]; handoff.previous = f.save(handoff.previous.path, data);
    };
    cases[`next ${owner} old public interval`] = (f, value, handoff) => { handoff.observation.public[owner] = value.observation.public[owner]; };
  }
  for (const [name, edit] of Object.entries(cases)) await t.test(name, async () => {
    restore(); const value = structuredClone(originalIndex), handoff = structuredClone(originalNext);
    edit(f, value, handoff); const proof = f.save(index.proof.path, value);
    if (name.startsWith('index')) await assert.rejects(readUnifiedSourceIndex({ spec: f.spec, proof }));
    else {
      handoff.sourceIndex = proof;
      await assert.rejects(readUnifiedNextBaseline({ spec: f.spec, handoff: f.save(next.proof.path, handoff), fresh: true }));
    }
  });
});

test('next dual binding rejects old Genshin even when the next build selects Main alone', async t => {
  const { f, next } = await successful(t), opened = await readUnifiedNextBaseline({ spec: f.spec, handoff: next.proof });
  for (const selected of [owners, ['main']]) for (const owner of owners) {
    const copy = structuredClone(opened), input = binding(copy, selected);
    if (selected.includes(owner)) input.previous.owners[owner] = f.input.priorOwners[owner];
    else copy.previous.owners[owner] = f.input.priorOwners[owner];
    assert.throws(() => bindUnifiedNextSources(copy, input));
  }
});

test('source attempts are exclusive and asynchronous caller mutation cannot replace a captured pair specification', async t => {
  const f = await fixture(t), original = structuredClone(f.spec), read = f.reader;
  let edited = false;
  f.reader = { ...read, snapshot: async () => {
    if (!edited) { edited = true; f.spec.sources[0].text = 'unreviewed'; f.spec.deploymentIds.main = pairUUID(999); }
    return read.snapshot();
  } };
  const directory = join(f.root, 'advance'), index = await advanceUnifiedSourceIndex({ ...f, directory });
  await readUnifiedSourceIndex({ spec: original, proof: index.proof });
  f.spec = original; const calls = f.calls.length;
  await assert.rejects(advanceUnifiedSourceIndex({ ...f, directory }), /EEXIST/); assert.equal(f.calls.length, calls);
  await assert.rejects(advanceUnifiedSourceIndex({ ...f, directory: join(f.spec.owners.genshin.directory, 'nested') }), /overlaps/);
});

for (const completionFault of ['genshin-unknown', 'main-unknown', 'genshin-public', 'main-public']) test(`stopped ${completionFault} never enters source advance`, async t => {
  const f = await fixture(t, { completionFault }); assert(f.pair.failure); assert.equal(f.pair.input.proof, undefined);
  const value = f.pair.input.value, receipt = { schemaVersion: 1, kind: 'unified_genshin_main_publication_promotion', status: 'production_accepted',
    productionPromoted: true, sourceAdvanced: false, releaseKey: value.releaseKey, transportPin: value.transportPin, previewPin: f.pair.input.previews.pin,
    journalPin: digest(readFileSync(f.pair.journalFile)) };
  const proof = f.save(join(f.pair.directory, 'receipt.json'), receipt);
  await assert.rejects(readUnifiedGenshinMainSourceSpec({ completed: { ...f.pair.input, proof }, priorOwners: f.spec.owners,
    candidateArtifacts: f.candidateArtifacts, sealedSources: f.spec.sources, pairs: f.spec.pairs, planSHA256: f.spec.planSHA256 }), /Incomplete, stopped/);
  assert(!existsSync(join(f.root, 'advance/source-index.json')));
});

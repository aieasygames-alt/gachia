import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { multipartModule } from './desktop-cloud-transport.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { assertModuleVersionIdentity, revalidateUploadedModule } from './desktop-version-provenance.mjs';
import { readUnifiedHistoricalBytes, UNIFIED_SOURCE_OWNERS } from './unified-historical-sources.mjs';
import { recheckUnifiedMainPublic, verifyUnifiedMainPublic } from './unified-main-public.mjs';
import { unifiedPinnedJSON } from './unified-promotion-protocol.mjs';
import { unifiedService, unifiedStaticFiles } from './unified-release-assets.mjs';
import { readUnifiedUploadedModule, revalidateUnifiedSourceModule } from './unified-version-identity.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const bound = (directory, name, value) => {
  const file = join(directory, name), bytes = json(value);
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(bytes) };
};
const pinned = proof => unifiedPinnedJSON(proof.path, proof.pin);
const owners = rows => assert.deepEqual(Object.keys(rows).sort(), UNIFIED_SOURCE_OWNERS, 'Complete five-owner source index required');
const treePin = directory => digest(json(artifactFiles(directory)));

export async function readUnifiedSourceOwner(row) {
  const { service, versionId, moduleSHA256, moduleProof } = row;
  const version = row.version;
  let saved;
  if (row.mode === 'original_upload_time_receipt_fresh_immutable_identity') {
    saved = await revalidateUploadedModule({ proof: moduleProof, service, versionId, moduleSHA256, readVersion: async () => version });
  } else if (row.mode === 'fresh_etag_bound_source_capture') {
    saved = await revalidateUnifiedSourceModule({ proof: moduleProof, service, versionId, moduleSHA256, transportPin: row.proofTransportPin });
  } else {
    assert.equal(row.mode, 'unified_upload_time_module_receipt');
    saved = await readUnifiedUploadedModule(moduleProof, { service, versionId, moduleSHA256, context: row.moduleContext });
  }
  assertModuleVersionIdentity(saved.version, version);
  const archive = readUnifiedHistoricalBytes(row.modulePath);
  assert.equal(digest(archive), row.archiveSHA256);
  const module = await multipartModule(archive); assert.equal(module.moduleSHA256, moduleSHA256);
  if (saved.code) assert(module.code.equals(saved.code));
  assert.equal(realpathSync(row.directory), resolve(row.directory));
  assert.equal(treePin(row.directory), row.artifactSHA256, 'Source artifact changed');
  unifiedStaticFiles(row.directory, row.owner);
  return module;
}

// The fixed adapter derives this specification only after independently opening
// the completed publication. Protocol injection is for isolated tests, not CLI.
async function validateSpec(spec) {
  assert.equal(spec.kind, 'unified_completed_main_source_spec'); owners(spec.owners);
  assert(spec.sources.length > 0 && spec.sources.length <= 200);
  const sourcePaths = spec.sources.map(row => row.sourcePath);
  assert.equal(new Set(sourcePaths).size, sourcePaths.length, 'Duplicate source input');
  for (const row of spec.sources) {
    assert(/^(?:packages\/data\/games\/[a-z0-9-]+\/(?:raw-[a-z-]+\.json|(?:tier-lists|progression)\.ts)|apps\/game-[a-z0-9-]+\/lib\/data\.ts)$/.test(row.sourcePath));
    assert.equal(digest(row.text), row.sha256, 'Corrupt sealed content input');
  }
  assert(spec.pairs.length > 0 && new Set(spec.pairs).size === spec.pairs.length);
  for (const pair of spec.pairs) {
    assert(/^[a-z0-9-]+\/raw-[a-z0-9-]+\.json$/.test(pair));
    const source = spec.sources.find(row => row.sourcePath === `packages/data/games/${pair}`);
    assert(source, 'Public source is missing');
    assert.equal(digest(readUnifiedHistoricalBytes(join(spec.owners.main.directory, 'assets/data', pair))), source.sha256,
      'New Main must contain the complete published A');
    assert.equal(spec.publicReferences.find(row => row.path === `/data/${pair}`)?.sha256, source.sha256, 'Public acceptance must bind new A');
  }
  assertTopology(spec.baseline, spec.baseline);
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = spec.owners[owner]; assert.equal(row.owner, owner); assert.equal(row.service, unifiedService(owner));
    if (owner !== 'main') assert.equal(activeVersion(spec.baseline, row.service), row.versionId);
    await readUnifiedSourceOwner(row);
  }
}

function assertMainProjection(spec, row) {
  const expected = artifactFiles(spec.owners.main.directory).map(file => file.path === 'worker.js'
    ? { path: 'worker.js', type: 'file', sha256: spec.owners.main.moduleSHA256 } : file);
  assert.deepEqual(artifactFiles(row.directory), expected, 'Published Main may change only its sealed runtime, never its compatible static union or content');
}

function sourceTopology(spec, snapshot) {
  assertTopology(spec.baseline, snapshot, { gachia: spec.owners.main.versionId });
  assert.equal(snapshot.services.gachia.id, spec.deploymentId, 'Main must still be the exact accepted deployment');
}

async function observe(spec, directory, reader, request) {
  const startedAt = Date.now();
  const before = await reader.snapshot(); sourceTopology(spec, before);
  const beforeProof = bound(directory, 'before.json', before), versions = {};
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = spec.owners[owner], version = await reader.version(row.service, row.versionId);
    assertModuleVersionIdentity(row.version, version);
    versions[owner] = bound(directory, `${owner}-version.json`, version);
  }
  const http = await verifyUnifiedMainPublic({ references: spec.publicReferences, directory: join(directory, 'public'), request });
  recheckUnifiedMainPublic(join(directory, 'public'), http.evidenceSHA256, spec.publicReferences);
  // Include the whole HTTP interval between two fresh immutable-version reads.
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = spec.owners[owner]; assertModuleVersionIdentity(pinned(versions[owner]), await reader.version(row.service, row.versionId));
  }
  const after = await reader.snapshot(); assertTopology(before, after);
  return { before: beforeProof, after: bound(directory, 'after.json', after), versions,
    public: { path: join(directory, 'public/result.json'), pin: http.evidenceSHA256 }, startedAt, observedAt: Date.now() };
}

function readObservation(spec, observation) {
  assert(Number.isSafeInteger(observation.startedAt) && observation.startedAt > 0);
  assert(Number.isSafeInteger(observation.observedAt) && observation.startedAt <= observation.observedAt && observation.observedAt <= Date.now());
  const before = pinned(observation.before), after = pinned(observation.after);
  sourceTopology(spec, before); assertTopology(before, after); owners(observation.versions);
  for (const owner of UNIFIED_SOURCE_OWNERS) assertModuleVersionIdentity(spec.owners[owner].version, pinned(observation.versions[owner]));
  assert.equal(observation.public.path, join(dirname(observation.public.path), 'result.json'));
  recheckUnifiedMainPublic(dirname(observation.public.path), observation.public.pin, spec.publicReferences);
}

function exclusiveDirectory(directory, spec) {
  const root = resolve(directory); assert.equal(realpathSync(dirname(root)), dirname(root));
  for (const row of Object.values(spec.owners)) {
    const input = resolve(row.directory);
    assert(root !== input && !root.startsWith(input + '/') && !input.startsWith(root + '/'), 'Source output overlaps an input artifact');
  }
  mkdirSync(root, { mode: 0o700 }); return root;
}

export async function advanceUnifiedSourceIndex({ spec, directory, reader, request = fetch }) {
  await validateSpec(spec);
  const root = exclusiveDirectory(directory, spec);
  try {
    const mainDirectory = join(root, 'main');
    cpSync(spec.owners.main.directory, mainDirectory, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
    const main = await readUnifiedSourceOwner(spec.owners.main);
    assert.equal(realpathSync(join(mainDirectory, 'worker.js')), join(mainDirectory, 'worker.js'));
    writeFileSync(join(mainDirectory, 'worker.js'), main.code, { mode: 0o600 });
    const rows = structuredClone(spec.owners);
    rows.main = { ...rows.main, directory: mainDirectory, artifactSHA256: treePin(mainDirectory) };
    assertMainProjection(spec, rows.main);
    const active = bound(root, 'active.json', spec.sources), observation = await observe(spec, root, reader, request);
    await validateSpec(spec);
    const value = { schemaVersion: 1, kind: 'unified_published_source_index', status: 'published_sources_observed', publication: spec.publication,
      releaseKey: spec.releaseKey, transportPin: spec.transportPin, planSHA256: spec.planSHA256, owners: rows, active, observation,
      cloudWrites: false, activationSupported: false, newPublicationAuthorized: false };
    const proof = bound(root, 'source-index.json', value);
    await readUnifiedSourceIndex({ proof, spec }); return { proof, value };
  } catch (error) { bound(root, 'failure.json', { status: 'failed', error: error.message, cloudWrites: false, automaticRetry: false }); throw error; }
}

export async function readUnifiedSourceIndex({ proof, spec }) {
  await validateSpec(spec);
  assert(!existsSync(join(dirname(proof.path), 'failure.json')), 'Failed source advance cannot be consumed');
  const value = pinned(proof);
  assert.equal(proof.path, join(dirname(proof.path), 'source-index.json'));
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'unified_published_source_index'); assert.equal(value.status, 'published_sources_observed');
  for (const key of ['publication', 'releaseKey', 'transportPin', 'planSHA256']) assert.deepEqual(value[key], spec[key]);
  for (const key of ['cloudWrites', 'activationSupported', 'newPublicationAuthorized']) assert.equal(value[key], false);
  assert.deepEqual(pinned(value.active), spec.sources, 'All public, code and derived A must follow the completed publication');
  owners(value.owners);
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = value.owners[owner], original = spec.owners[owner];
    if (owner === 'main') {
      assert.equal(row.directory, join(dirname(proof.path), 'main'));
      const { directory: _d, artifactSHA256: _a, ...identity } = row;
      const { directory: _od, artifactSHA256: _oa, ...expected } = original;
      assert.deepEqual(identity, expected); assertMainProjection(spec, row);
    } else assert.deepEqual(row, original, 'Unchanged owner cannot come from a historical per-game Main catalog');
    await readUnifiedSourceOwner(row);
  }
  readObservation(spec, value.observation);
  return { proof, value, sources: pinned(value.active), freshnessRenewed: false, newPublicationAuthorized: false };
}

function previousArtifacts(rows) {
  return { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: Object.fromEntries(UNIFIED_SOURCE_OWNERS.map(owner => {
    const row = rows[owner]; return [owner, Object.fromEntries(['service', 'versionId', 'directory', 'artifactSHA256', 'modulePath', 'archiveSHA256', 'moduleSHA256'].map(key => [key, row[key]]))];
  })) };
}

export async function captureUnifiedNextBaseline({ proof, spec, directory, reader, request = fetch }) {
  const target = resolve(directory), source = dirname(proof.path);
  assert(target !== source && !target.startsWith(source + '/') && !source.startsWith(target + '/'), 'Next baseline overlaps its source index');
  const index = await readUnifiedSourceIndex({ proof, spec }), root = exclusiveDirectory(target, spec);
  try {
    const observation = await observe(spec, root, reader, request);
    await readUnifiedSourceIndex({ proof, spec });
    const active = bound(root, 'active.json', index.sources), previous = bound(root, 'previous.json', previousArtifacts(index.value.owners));
    const value = { schemaVersion: 1, kind: 'unified_next_batch_baseline', status: 'published_A_freshly_observed', sourceIndex: proof,
      publication: spec.publication, releaseKey: spec.releaseKey, planSHA256: spec.planSHA256, active, previous, observation,
      cloudWrites: false, activationSupported: false, newPublicationAuthorized: false };
    const handoff = bound(root, 'source-handoff.json', value);
    await readUnifiedNextBaseline({ handoff, spec }); return { proof: handoff, value };
  } catch (error) { bound(root, 'failure.json', { status: 'failed', error: error.message, cloudWrites: false, automaticRetry: false }); throw error; }
}

export async function readUnifiedNextBaseline({ handoff, spec, fresh = false }) {
  assert(!existsSync(join(dirname(handoff.path), 'failure.json')), 'Failed next baseline cannot be consumed');
  const value = pinned(handoff);
  assert.equal(handoff.path, join(dirname(handoff.path), 'source-handoff.json'));
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'unified_next_batch_baseline'); assert.equal(value.status, 'published_A_freshly_observed');
  for (const key of ['publication', 'releaseKey', 'planSHA256']) assert.deepEqual(value[key], spec[key]);
  for (const key of ['cloudWrites', 'activationSupported', 'newPublicationAuthorized']) assert.equal(value[key], false);
  const index = await readUnifiedSourceIndex({ proof: value.sourceIndex, spec });
  assert.deepEqual(pinned(value.active), index.sources, 'Next batch must preserve the exact new A, including nonpublic code');
  assert.deepEqual(pinned(value.previous), previousArtifacts(index.value.owners), 'Next batch must use current Main, not legacy game catalogs');
  readObservation(spec, value.observation);
  assert(value.observation.startedAt >= index.value.observation.observedAt, 'Next handoff cannot reuse the source-advance observation');
  if (fresh) assert(Date.now() - value.observation.startedAt < 900000, 'Next-batch source handoff expired; take fresh read-only observations');
  return { value, index, sources: index.sources, previous: pinned(value.previous), baseline: pinned(value.observation.after), newPublicationAuthorized: false };
}

export function selectUnifiedNextPrevious(next, frozen) {
  assert.equal(frozen.planSHA256, next.value.planSHA256, 'Next build uses a different import plan');
  assert.deepEqual(frozen.candidate.baselines.map(row => ({ sourcePath: row.sourcePath, sha256: row.activeSHA256 })),
    next.sources.map(row => ({ sourcePath: row.sourcePath, sha256: row.sha256 })), 'Next build must consume every new A input');
  owners(next.previous.owners);
  assert(frozen.owners.length > 0 && frozen.owners.includes('main') && new Set(frozen.owners).size === frozen.owners.length);
  for (const owner of frozen.owners) assert(UNIFIED_SOURCE_OWNERS.includes(owner), 'Unknown next-build owner');
  return { ...next.previous, owners: Object.fromEntries(frozen.owners.map(owner => [owner, next.previous.owners[owner]])) };
}

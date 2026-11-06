import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { captureUploadedModule } from './desktop-version-provenance.mjs';
import { readUnifiedHistoricalSources, UNIFIED_SOURCE_OWNERS } from './unified-historical-sources.mjs';
import { unifiedService } from './unified-release-assets.mjs';
import { captureUnifiedSourceModule } from './unified-version-identity.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';

const uuid = index => `1234abcd-0000-4000-8000-${String(index).padStart(12, '0')}`;
const json = value => JSON.stringify(value, null, 2) + '\n';
async function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-historical-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const proof = (name, value) => {
    const file = join(root, name); writeFileSync(file, json(value)); return { path: file, pin: digest(readFileSync(file)) };
  };
  const baseline = { services: Object.fromEntries(SERVICES.map((service, index) => [service,
    { id: uuid(index + 100), versions: [{ version_id: uuid(index + 1), percentage: 100 }] }])),
  bindings: {}, settings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const old = {}, owners = {}, transportPin = 'a'.repeat(64);
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const service = unifiedService(owner), versionId = baseline.services[service].versions[0].version_id;
    const directory = join(root, owner); mkdirSync(directory);
    const code = `historical ${owner}`, form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
    const archive = Buffer.from(await new Response(form).arrayBuffer()), modulePath = join(directory, 'module.multipart'); writeFileSync(modulePath, archive);
    const artifact = join(directory, 'artifact'); mkdirSync(join(artifact, 'assets/_next/static'), { recursive: true });
    mkdirSync(join(artifact, '.build'));
    writeFileSync(join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}');
    writeFileSync(join(artifact, 'assets/BUILD_ID'), owner);
    writeFileSync(join(artifact, 'worker.js'), code); writeFileSync(join(artifact, 'assets/_next/static/old.js'), 'static');
    if (owner !== 'main') {
      mkdirSync(join(artifact, `assets/_games/${owner}/_next/static`), { recursive: true });
      writeFileSync(join(artifact, `assets/_games/${owner}/_next/static/old.js`), 'static');
    }
    const version = { id: versionId, number: 7, metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) }, bindings: [] } };
    const args = { service, versionId, moduleSHA256: digest(code), directory: join(directory, 'capture'),
      readVersion: async () => version, readContent: async () => ({ archive, etag: `"${version.resources.script.etag}"` }) };
    let moduleProof, mode;
    if (['main', 'genshin', 'nte'].includes(owner)) {
      const log = join(directory, 'upload.log'); writeFileSync(log, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}\n`);
      moduleProof = await captureUploadedModule({ ...args, uploadPath: modulePath, uploadLogPath: log,
        context: { role: 'candidate', releaseKey: 'b'.repeat(64), configSHA256: 'c'.repeat(64) } });
      mode = 'original_upload_time_receipt_fresh_immutable_identity';
    } else {
      moduleProof = await captureUnifiedSourceModule({ ...args, archiveProof: { path: modulePath, pin: digest(archive) }, transportPin });
      mode = 'fresh_etag_bound_source_capture';
    }
    old[owner] = { service, versionId, directory: artifact, artifactSHA256: digest(json(artifactFiles(artifact))), modulePath,
      archiveSHA256: digest(archive), moduleSHA256: digest(code) };
    owners[owner] = { service, sourceVersionId: versionId, moduleSHA256: digest(code), moduleProof, mode, versionProof: proof(`${owner}-version.json`, version) };
  }
  const handoff = { schemaVersion: 1, kind: 'unified_observed_source_handoff', status: 'all_five_active_source_modules_verified', transportPin,
    previous: proof('previous.json', { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: old }),
    workerWrites: 0, authPOSTs: 0, owners, activationSupported: false, rawUuidRollbackAuthorized: false, topologyUnchanged: true,
    before: proof('before.json', baseline), after: proof('after.json', baseline), observedAt: '2026-11-05T00:00:00Z' };
  return { root, proof, baseline, handoff, old };
}

test('historical handoff reopens both provenance modes and all five artifacts without network or freshness renewal', async t => {
  const f = await fixture(t); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('No live reads'); });
  const result = await readUnifiedHistoricalSources(f.proof('handoff.json', f.handoff), f.baseline);
  assert.deepEqual(Object.keys(result.owners), UNIFIED_SOURCE_OWNERS); assert.equal(calls, 0);
  assert.equal(result.currentCloudRead, false); assert.equal(result.freshnessRenewed, false);
  assert.equal(result.handoff.observedAt, f.handoff.observedAt);
  for (const owner of UNIFIED_SOURCE_OWNERS) assert.match(result.owners[owner].sourceIdentityPin, /^[a-f0-9]{64}$/);
});

for (const fault of ['missing-owner', 'missing-previous', 'service', 'uuid', 'module', 'mode', 'future-clock', 'write-claim', 'activation', 'baseline',
  'version', 'receipt', 'artifact', 'archive', 'symlink']) test(`historical handoff refuses ${fault}`, async t => {
  const f = await fixture(t), source = f.handoff.owners.main;
  if (fault === 'missing-owner') delete f.handoff.owners.lvmeng;
  if (fault === 'missing-previous') {
    delete f.old['azur-promilia']; f.handoff.previous = f.proof('partial.json', { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: f.old });
  }
  if (fault === 'service') source.service = 'gachia-router';
  if (fault === 'uuid') source.sourceVersionId = uuid(99);
  if (fault === 'module') source.moduleSHA256 = 'f'.repeat(64);
  if (fault === 'mode') source.mode = 'current-cms';
  if (fault === 'future-clock') f.handoff.observedAt = '2999-01-01T00:00:00Z';
  if (fault === 'write-claim') f.handoff.workerWrites = 1;
  if (fault === 'activation') f.handoff.activationSupported = true;
  if (fault === 'baseline') f.baseline.routes.push({ pattern: 'changed' });
  if (fault === 'version') source.versionProof = f.proof('wrong-version.json', { id: uuid(99), metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) } } });
  if (fault === 'receipt') writeFileSync(source.moduleProof.path, '{}');
  if (fault === 'artifact') writeFileSync(join(f.old.lvmeng.directory, 'worker.js'), 'changed');
  if (fault === 'archive') writeFileSync(f.old.main.modulePath, 'changed');
  if (fault === 'symlink') { const linked = join(f.root, 'linked.json'); symlinkSync(source.versionProof.path, linked); source.versionProof.path = linked; }
  await assert.rejects(readUnifiedHistoricalSources(f.proof('handoff.json', f.handoff), f.baseline));
});

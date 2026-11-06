import assert from 'node:assert/strict';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { multipartModule } from './desktop-cloud-transport.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { assertModuleVersionIdentity, revalidateUploadedModule } from './desktop-version-provenance.mjs';
import { unifiedPinnedJSON } from './unified-promotion-protocol.mjs';
import { unifiedService, unifiedStaticFiles } from './unified-release-assets.mjs';
import { assertUnifiedVersionIdentity, revalidateUnifiedSourceModule } from './unified-version-identity.mjs';

export const UNIFIED_SOURCE_OWNERS = Object.freeze(['azur-promilia', 'genshin', 'lvmeng', 'main', 'nte']);
const SHA = /^[a-f0-9]{64}$/;
const sorted = value => Array.isArray(value) ? value.map(sorted)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;

export function readUnifiedHistoricalBytes(file) {
  assert.equal(realpathSync(file), resolve(file), 'Linked historical source forbidden');
  const stat = statSync(file); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Historical source byte budget exceeded');
  return readFileSync(file);
}

// Historical module receipts prove which bytes were used, not that any version
// is active now. All five owners survive even a Main-only publication.
export async function readUnifiedHistoricalSources(proof, baseline) {
  const handoff = unifiedPinnedJSON(proof.path, proof.pin);
  assert.equal(handoff.schemaVersion, 1); assert.equal(handoff.kind, 'unified_observed_source_handoff');
  assert.equal(handoff.status, 'all_five_active_source_modules_verified'); assert(SHA.test(handoff.transportPin));
  for (const key of ['workerWrites', 'authPOSTs']) assert.equal(handoff[key], 0);
  for (const key of ['activationSupported', 'rawUuidRollbackAuthorized']) assert.equal(handoff[key], false);
  assert.equal(handoff.topologyUnchanged, true);
  assert(Number.isFinite(Date.parse(handoff.observedAt)) && Date.parse(handoff.observedAt) <= Date.now());
  const pinned = reference => unifiedPinnedJSON(reference.path, reference.pin);
  const before = pinned(handoff.before), after = pinned(handoff.after), previous = pinned(handoff.previous);
  assertTopology(before, after); assertTopology(before, baseline);
  assert.equal(previous.schemaVersion, 1); assert.equal(previous.kind, 'unified_previous_artifacts');
  assert.equal(previous.purpose, 'local_compatibility_only');
  for (const owners of [handoff.owners, previous.owners]) assert.deepEqual(Object.keys(owners).sort(), UNIFIED_SOURCE_OWNERS, 'All five historical owner sources required');
  const owners = {};
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const source = handoff.owners[owner], old = previous.owners[owner], service = unifiedService(owner);
    assert.equal(source.service, service); assert.equal(old.service, service);
    assert.equal(source.sourceVersionId, old.versionId); assert.equal(old.versionId, activeVersion(baseline, service));
    assert.equal(source.moduleSHA256, old.moduleSHA256); assert(SHA.test(old.moduleSHA256));
    assert.equal(realpathSync(old.directory), resolve(old.directory), 'Linked historical artifact forbidden');
    assert.equal(digest(JSON.stringify(artifactFiles(old.directory), null, 2) + '\n'), old.artifactSHA256, 'Historical artifact changed');
    unifiedStaticFiles(old.directory, owner);
    const archive = readUnifiedHistoricalBytes(old.modulePath); assert.equal(digest(archive), old.archiveSHA256);
    const module = await multipartModule(archive); assert.equal(module.moduleSHA256, old.moduleSHA256);
    const version = pinned(source.versionProof); assertUnifiedVersionIdentity(service, old.versionId, version);
    let saved;
    if (source.mode === 'original_upload_time_receipt_fresh_immutable_identity') {
      saved = await revalidateUploadedModule({ proof: source.moduleProof, service, versionId: old.versionId, moduleSHA256: old.moduleSHA256,
        readVersion: async () => version });
      assert(module.code.equals(saved.code));
    } else {
      assert.equal(source.mode, 'fresh_etag_bound_source_capture', 'Unreviewed historical provenance mode');
      saved = await revalidateUnifiedSourceModule({ proof: source.moduleProof, service, versionId: old.versionId,
        moduleSHA256: old.moduleSHA256, transportPin: handoff.transportPin });
    }
    assertModuleVersionIdentity(saved.version, version);
    owners[owner] = { ...old, version, sourceIdentityPin: digest(JSON.stringify(sorted({ proof: source.moduleProof, version }))) };
  }
  return { handoff, previous, baseline, owners, currentCloudRead: false, freshnessRenewed: false };
}

import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { activeVersion, assertTopology, reconcileRelease } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { UNIFIED_OWNERS, unifiedService } from './unified-release-assets.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';

const SHA = /^[a-f0-9]{64}$/;
const FRESH_MS = 15 * 60 * 1000;
const json = value => JSON.stringify(value, null, 2) + '\n';
const roles = ['candidate', 'recovery'];

function fresh(at) {
  assert(Number.isSafeInteger(at) && at <= Date.now() && Date.now() - at < FRESH_MS, 'Unified cloud evidence expired');
}

// This protocol core has no CLI or production transport. Its verifier and
// adapters are trusted code, never caller-supplied authorization JSON. A fixed
// production wrapper must prove source handoff and CMS review before using it.
export function assertUnifiedPreviewIdentity(value, transportPin) {
  assert.equal(value.preview, false, 'Never upload unified fixture/rehearsal content');
  assert(SHA.test(value.transportPin) && value.transportPin === transportPin, 'Pinned unified transport required');
  assert(SHA.test(value.releaseKey), 'Explicit unified editorial release required');
  assert(Array.isArray(value.changed) && value.changed.length > 0 && new Set(value.changed).size === value.changed.length, 'No changed editorial records');
  assert(Array.isArray(value.ownerOrder) && value.ownerOrder.length > 0 && value.ownerOrder.at(-1) === 'main', 'Main must be the final owner');
  assert.equal(new Set(value.ownerOrder).size, value.ownerOrder.length);
  assert(value.ownerOrder.every(owner => UNIFIED_OWNERS.includes(owner)), 'Unreviewed unified owner');
  assert.deepEqual(Object.keys(value.owners).sort(), [...value.ownerOrder].sort(), 'Incomplete unified owner set');
  assertTopology(value.baseline, value.baseline);
  assert(Number.isSafeInteger(value.identityObservedAt) && value.identityObservedAt <= Date.now(), 'Invalid unified source observation time');
  for (const owner of value.ownerOrder) {
    const row = value.owners[owner]; assert.equal(row.service, unifiedService(owner));
    assert.equal(row.sourceVersionId, activeVersion(value.baseline, row.service), 'Recovery source is no longer active');
    assert(SHA.test(row.sourceIdentityPin), 'Fresh immutable source identity proof required');
    for (const role of roles) {
      const target = row[role];
      for (const field of ['moduleSHA256', 'configPin', 'artifactPin', 'referencesPin']) assert(SHA.test(target[field]), `Missing ${role} ${field}`);
    }
  }
}

export function assertUnifiedPreviewUploadScope(value, transportPin) {
  assertUnifiedPreviewIdentity(value, transportPin); fresh(value.identityObservedAt);
}

// Single-attempt, exclusive journal per sealed transport. Recovery versions are
// uploaded and accepted before candidates; nothing here can move live traffic.
export async function executeUnifiedPreviewProtocol({ run, directory, transportPin, authorize, verify, transport }) {
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify()); assertUnifiedPreviewUploadScope(initial, transportPin);
    assert.equal(await authorize(initial), initial.releaseKey, 'Explicit matching editorial authorization required');
    const journal = join(run, `unified-preview-${transportPin}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = value => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.releaseKey, transportPin, ...value }) + '\n', { flush: true });
    const accepted = {}, uploaded = {}; let pendingOperation, lastIdentityObservedAt = initial.identityObservedAt;
    const recheck = async () => {
      const current = await verify(); assertUnifiedPreviewUploadScope(current, transportPin);
      // The fixed verifier renews immutable source observations at each write
      // boundary. Only the read timestamp may advance, never release identity.
      assert(current.identityObservedAt >= lastIdentityObservedAt, 'Unified identity observation moved backwards');
      assert.deepEqual({ ...current, identityObservedAt: initial.identityObservedAt }, initial, 'Unified upload evidence changed');
      lastIdentityObservedAt = current.identityObservedAt;
    };
    record({ phase: 'baseline', baseline: initial.baseline, directory });
    try {
      mkdirSync(directory, { mode: 0o700 });
      for (const role of ['recovery', 'candidate']) {
        accepted[role] = {}; uploaded[role] = {};
        for (const owner of initial.ownerOrder) {
          await recheck(); assertTopology(initial.baseline, await transport.snapshot());
          const row = initial.owners[owner], service = row.service, target = row[role];
          pendingOperation = { role, owner, service };
          record({ phase: 'upload_intent', ...pendingOperation, moduleSHA256: target.moduleSHA256 });
          const result = await transport.upload({ directory, owner, role, service, row: target });
          assert(typeof result.versionId === 'string' && result.versionId.length <= 128, 'Missing upload response UUID; reconcile without retry');
          pendingOperation.versionId = result.versionId; record({ phase: 'upload_response', ...pendingOperation });
          exactUnifiedPreviewOrigin(service, result.versionId);
          assert.notEqual(result.versionId, row.sourceVersionId, 'Raw old UUID is not compatible recovery');
          if (role === 'candidate') assert.notEqual(result.versionId, accepted.recovery[owner].versionId, 'Candidate and recovery must be distinct versions');
          uploaded[role][service] = { versionId: result.versionId }; record({ phase: 'upload_returned', ...pendingOperation });
          const inspected = await transport.inspect({ directory, owner, role, service, versionId: result.versionId, row: target });
          assert.equal(inspected.moduleSHA256, target.moduleSHA256); assert(SHA.test(inspected.versionPin));
          assert(inspected.moduleProof && SHA.test(inspected.moduleProof.pin), 'Upload-time immutable module receipt required');
          await recheck(); assertTopology(initial.baseline, await transport.snapshot());
          const proof = await transport.preview({ directory, owner, role, service, versionId: result.versionId, row: target, inspected });
          assert.equal(proof.status, 'passed'); assert.equal(proof.observationMode, 'cloud_exact_version', 'Local Host checks cannot authorize cloud acceptance');
          assert.equal(proof.service, service); assert.equal(proof.versionId, result.versionId); assert(SHA.test(proof.evidenceSHA256));
          await transport.revalidate({ owner, role, service, versionId: result.versionId, row: target, inspected });
          await recheck(); assertTopology(initial.baseline, await transport.snapshot());
          accepted[role][owner] = { service, versionId: result.versionId, moduleSHA256: target.moduleSHA256, artifactPin: target.artifactPin,
            versionPin: inspected.versionPin, moduleProof: inspected.moduleProof, evidenceSHA256: proof.evidenceSHA256, acceptedAt: Date.now() };
          record({ phase: 'preview_accepted', owner, role, proof: accepted[role][owner] }); pendingOperation = undefined;
        }
      }
      await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      // A long batch must renew separately; it cannot silently accept stale
      // recovery/candidate evidence at the end of a multi-owner upload.
      for (const role of roles) for (const row of Object.values(accepted[role])) fresh(row.acceptedAt);
      record({ phase: 'all_cloud_previews_accepted_no_promotion', accepted });
      const receipt = { schemaVersion: 1, kind: 'unified_candidate_recovery_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion',
        transportPin, releaseKey: initial.releaseKey, accepted, journalPin: digest(readFileSync(journal)), productionPromoted: false, activationSupported: false };
      const text = json(receipt); writeFileSync(join(directory, 'receipt.json'), text, { flag: 'wx', mode: 0o600 });
      return { directory, receiptPin: digest(text), ...receipt };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, uploaded, accepted, error: error.message, automaticRetry: false, automaticRollback: false });
      try {
        const snapshot = await transport.snapshot();
        record({ phase: 'read_only_reconciliation', snapshot,
          recovery: reconcileRelease(initial.baseline, snapshot, uploaded.recovery ?? {}),
          candidate: reconcileRelease(initial.baseline, snapshot, uploaded.candidate ?? {}), pendingOperation });
      } catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

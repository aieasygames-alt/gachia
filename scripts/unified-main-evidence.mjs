import assert from 'node:assert/strict';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertUploadedVersion } from './desktop-cloud-transport.mjs';
import { assertTopology } from './desktop-cloud-release.mjs';
import { assertModuleVersionIdentity } from './desktop-version-provenance.mjs';
import { unifiedPinnedJSON } from './unified-promotion-protocol.mjs';
import { readUnifiedMainPromotionJournal } from './unified-promotion-reconciliation.mjs';
import { recheckUnifiedMainPublic } from './unified-main-public.mjs';
import { recheckUnifiedPreview } from './unified-version-preview.mjs';
import { readUnifiedUploadedModule } from './unified-version-identity.mjs';
import { readUnifiedHistoricalBytes } from './unified-historical-sources.mjs';
import { digest } from './desktop-release-assets.mjs';

const ROLES = ['recovery', 'candidate'];
const at = value => { assert(Number.isSafeInteger(value) && value <= Date.now(), 'Invalid historical observation time'); return value; };

export async function readUnifiedMainPreviewModules({ value, previews, runtimeConfig }) {
  assert.deepEqual(value.ownerOrder, ['main']);
  const modules = {};
  for (const role of ROLES) {
    const proof = previews.receipt.accepted[role].main, row = value.owners.main[role];
    const saved = await readUnifiedUploadedModule(proof.moduleProof, { service: 'gachia', versionId: proof.versionId,
      moduleSHA256: row.moduleSHA256, context: { role, transportPin: value.transportPin, configPin: row.configPin } });
    const version = unifiedPinnedJSON(join(previews.directory, `${role}-main/version.json`), proof.versionPin);
    assertModuleVersionIdentity(saved.version, version);
    assertUploadedVersion(version, proof.versionId, runtimeConfig, value.baseline.bindings.gachia);
    modules[role] = saved;
  }
  return modules;
}

// A historical renewal is valid only for its recorded operation. Its clocks
// are checked at that operation's time, never refreshed to authorize new work.
export function readUnifiedMainRenewal({ original, value, previews, references }) {
  assertTopology(value.baseline, original.first.baseline);
  assert.equal(original.first.previewPin, previews.pin);
  const directory = original.first.renewalDirectory, pin = original.first.renewalPin;
  const receipt = unifiedPinnedJSON(join(directory, 'receipt.json'), pin);
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_main_preview_renewal');
  assert.equal(receipt.releaseKey, value.releaseKey); assert.equal(receipt.transportPin, value.transportPin);
  assert.equal(receipt.previewPin, previews.pin); assert.equal(receipt.cloudWrites, false); assert.equal(receipt.productionPromoted, false);
  assert.deepEqual(receipt.sourceHandoff, original.first.sourceHandoff, 'Renewal source differs from promotion journal');
  assert.deepEqual(Object.keys(receipt.accepted).sort(), [...ROLES].sort());
  assert.deepEqual(receipt.accepted, original.first.accepted, 'Journal differs from its pinned renewal');
  const firstAt = Date.parse(original.first.at), lastAt = Date.parse((original.stopped
    ? original.rows.find(row => row.phase === 'promotion_intent') ?? original.first : original.rows.at(-1)).at);
  for (const role of ROLES) {
    assert.deepEqual(Object.keys(receipt.accepted[role]), ['main']);
    const proof = receipt.accepted[role].main, old = previews.receipt.accepted[role].main;
    assert.equal(proof.originalEvidenceSHA256, old.evidenceSHA256);
    const { originalEvidenceSHA256: _o, evidenceSHA256: _e, acceptedAt: _a, ...identity } = proof;
    const { evidenceSHA256: _oldE, acceptedAt: _oldA, ...oldIdentity } = old;
    assert.deepEqual(identity, oldIdentity, 'Renewal cannot replace a version, module or upload receipt');
    assert(at(old.acceptedAt) <= at(proof.acceptedAt) && proof.acceptedAt <= firstAt, 'Renewal chronology changed');
    assert(lastAt - proof.acceptedAt < 900000, 'Renewal was expired at the recorded operation');
    recheckUnifiedPreview(join(directory, role), proof.evidenceSHA256, { service: 'gachia', versionId: proof.versionId,
      references: references('main', role), parserVersion: 'streaming-v2' });
  }
  return { directory, pin, receipt, freshnessRenewed: false };
}

function deploymentResponse(directory, kind, expected) {
  const file = join(directory, `deployment-${kind}`), metadata = JSON.parse(readUnifiedHistoricalBytes(file + '.json'));
  const bytes = readUnifiedHistoricalBytes(file + '.body');
  assert.equal(metadata.kind, kind); assert(Number.isInteger(metadata.status) && metadata.status >= 200 && metadata.status < 300);
  assert.equal(metadata.sha256, digest(bytes)); assert.equal(metadata.bytes, bytes.length);
  assert.deepEqual({ status: metadata.status, sha256: metadata.sha256, bytes: metadata.bytes }, expected, 'Deployment response differs from recorded promotion');
  const response = JSON.parse(bytes); assert.equal(response.success, true); return response.result;
}

// An accepted status is not enough: reload the journal, fresh-at-the-time
// preview, exact deployment responses, module receipts and every public body.
export async function readUnifiedCompletedMainPromotion(input) {
  const receipt = unifiedPinnedJSON(input.proof.path, input.proof.pin);
  const completion = receipt.kind === 'unified_readonly_promotion_completion';
  const result = await readPromotion(input, receipt, completion);
  if (completion) {
    assert.equal(input.proof.path, join(receipt.completionDirectory, 'receipt.json'));
    assert.equal(dirname(receipt.completionDirectory), input.run);
    assert.equal(realpathSync(receipt.completionDirectory), receipt.completionDirectory);
    assert(!existsSync(join(receipt.completionDirectory, 'failure.json')), 'Failed completion cannot be consumed');
    assert.equal(receipt.cloudWrites, false);
    assert(receipt.promotionExecutorCI?.status === 'full_exact_ci_passed');
    const observations = unifiedPinnedJSON(join(receipt.completionDirectory, 'observations.json'), receipt.observationsPin);
    at(observations.startedAt); at(observations.finishedAt);
    assert(observations.startedAt >= Date.parse(result.original.rows.at(-1).at));
    assert(observations.finishedAt >= observations.startedAt && observations.finishedAt <= Date.now());
    assert(observations.finishedAt - observations.startedAt < 900000, 'Completion observations expired');
    for (const snapshot of [observations.before, observations.after]) {
      assertTopology(input.value.baseline, snapshot, receipt.versions);
      assert.equal(snapshot.services.gachia.id, result.original.rows[3].result.deploymentId, 'Completion deployment changed');
    }
    assert.deepEqual(Object.keys(observations.versions).sort(), ROLES.slice().sort());
    for (const role of ROLES) assertModuleVersionIdentity(result.modules[role].version, observations.versions[role]);
    result.publicHTTP = recheckUnifiedMainPublic(join(receipt.completionDirectory, 'public'), receipt.publicEvidencePin, input.publicReferences);
  }
  return result;
}

// This diagnostic reader cannot produce accepted publication evidence on its own.
export async function readUnifiedStoppedMainPromotion(input) {
  return readPromotion(input, input.receipt, true);
}

async function readPromotion(input, receipt, completion) {
  const { run, proof, value, previews, references, publicReferences, runtimeConfig, productionRequest, sourceCI, originExecutorCI, executorCI } = input;
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, completion ? 'unified_readonly_promotion_completion' : 'unified_publication_promotion');
  assert.equal(receipt.status, 'production_accepted'); assert.equal(receipt.productionPromoted, true); assert.equal(receipt.sourceAdvanced, false);
  assert.equal(receipt.releaseKey, value.releaseKey); assert.equal(receipt.transportPin, value.transportPin); assert.equal(receipt.previewPin, previews.pin);
  const original = readUnifiedMainPromotionJournal({ run, pin: receipt.journalPin, releaseKey: value.releaseKey, transportPin: value.transportPin });
  assert.equal(original.stopped, completion, 'A stopped promotion requires explicit read-only completion');
  if (completion) {
    assert.deepEqual(original.rows.map(row => row.phase), ['baseline', 'remote_versions_verified', 'promotion_intent', 'promoted', 'stopped', 'read_only_reconciliation']);
    assert.equal(original.rows[4].error, 'Unified promotion preview expired');
    assert.equal(original.rows[4].pendingOperation, undefined);
    assert.deepEqual(original.rows[4].promoted, { gachia: original.expected.candidate });
  } else assert.equal(proof.path, join(original.first.directory, 'receipt.json'));
  assert.equal(receipt.directory, original.first.directory);
  assert.equal(receipt.renewalPin, original.first.renewalPin); assert.deepEqual(receipt.productionRequest, productionRequest);
  assert.deepEqual(receipt.sourceHandoff, original.first.sourceHandoff, 'Promotion source differs from receipt');
  assert.deepEqual(receipt.preview, { path: join(previews.directory, 'receipt.json'), pin: previews.pin });
  for (const [name, expected] of Object.entries({ sourceCI, originExecutorCI, executorCI })) {
    assert(expected && expected.status === 'full_exact_ci_passed', 'Independently verified exact CI required');
    assert.deepEqual(receipt[name], expected, `Promotion CI differs: ${name}`);
  }
  const renewal = readUnifiedMainRenewal({ original, value, previews, references });
  const modules = await readUnifiedMainPreviewModules({ value, previews, runtimeConfig });
  const candidate = original.expected.candidate, versions = { gachia: candidate };
  assert.deepEqual(receipt.versions, versions);
  const remote = original.rows[1].proof, savedRemote = unifiedPinnedJSON(join(receipt.directory, 'remote-0.json'), remote.evidenceSHA256);
  const { evidenceSHA256: _remotePin, ...remoteIdentity } = remote;
  assert.deepEqual(savedRemote, remoteIdentity); assert.equal(remote.status, 'passed'); assert.deepEqual(remote.versions, versions);
  assert.deepEqual(remote.modules, { gachia: value.owners.main.candidate.moduleSHA256 });
  assert.deepEqual(remote.recoveryVersions, { gachia: original.expected.recovery });
  assert.deepEqual(remote.observed.map(row => row.role), ROLES);
  for (const role of ROLES) {
    const observed = remote.observed.find(row => row.role === role), accepted = previews.receipt.accepted[role].main;
    assert.equal(observed.versionId, accepted.versionId); assert.equal(observed.moduleSHA256, accepted.moduleSHA256);
    assert.deepEqual(observed.moduleProof, accepted.moduleProof); assertModuleVersionIdentity(modules[role].version, observed.version);
  }
  const result = original.rows[3].result;
  const creation = deploymentResponse(receipt.directory, 'creation', result.responses?.creation), verification = deploymentResponse(receipt.directory, 'verification', result.responses?.verification);
  assert.equal(creation.id, result.deploymentId); assert.equal(verification.id, creation.id);
  assert.equal(result.service, 'gachia'); assert.equal(result.versionId, candidate); assert.equal(result.releaseKey, value.releaseKey);
  const allocation = [{ version_id: candidate, percentage: 100 }];
  for (const [kind, response] of [['creation', creation], ['verification', verification]]) {
    if (kind === 'verification' || Object.hasOwn(response, 'strategy')) assert.equal(response.strategy, 'percentage');
    if (kind === 'verification' || Object.hasOwn(response, 'versions')) assert.deepEqual(response.versions, allocation, 'Deployment allocation differs');
  }
  const publicProof = completion ? receipt.publicProof : original.rows[4].proof;
  const acceptedPublic = unifiedPinnedJSON(join(receipt.directory, 'public-acceptance.json'), publicProof.evidenceSHA256);
  const { evidenceSHA256: _publicPin, ...publicIdentity } = publicProof;
  assert.deepEqual(acceptedPublic, publicIdentity); assert.deepEqual(receipt.publicProof, publicProof);
  assert.equal(publicProof.status, 'passed'); assert.equal(publicProof.releaseKey, value.releaseKey); assert.deepEqual(publicProof.versions, versions);
  assert.deepEqual(Object.keys(publicProof.owners), ['main']);
  const http = publicProof.owners.main; assert.equal(http.directory, join(receipt.directory, 'public'));
  assert.equal(http.responses, publicReferences.length);
  const publicHTTP = recheckUnifiedMainPublic(http.directory, http.evidenceSHA256, publicReferences);
  return { receipt, original, renewal, modules, publicHTTP, currentCMSRead: false, currentCloudRead: false, freshnessRenewed: false, sourceAdvanced: false };
}

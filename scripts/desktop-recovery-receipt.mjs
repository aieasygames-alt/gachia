import assert from 'node:assert/strict';
import { join } from 'node:path';
import { verifyRecoveryCloud } from './desktop-recovery-cloud.mjs';
import { assertEditorialRecovery, assertUploadedVersion } from './desktop-cloud-transport.mjs';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { pinnedJson } from './desktop-release-assets.mjs';
import { acceptedPreviewJournal, readReleaseJournal, verifySavedPreview } from './desktop-release-readiness.mjs';
import { exactPreviewOrigin } from './desktop-version-preview.mjs';

const SHA = /^[a-f0-9]{64}$/;

// Pure structural validation shared by the disk reader and fault tests.
export function acceptedRecoveryReceipt({ verified, receipt, journal, input, now = Date.now(), maxAge = 900000 }) {
  const { manifest, candidate } = verified;
  assertEditorialRecovery(candidate.plan, receipt.releaseKey);
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.status, 'exact_cloud_recovery_previews_accepted');
  assert.equal(receipt.retentionId, candidate.manifest.retentionId);
  assert.equal(receipt.recoveryId, input.recoveryId);
  assert.equal(receipt.recoveryBundlePin, input.recoveryBundlePin);
  assert.equal(receipt.candidatePin, manifest.candidatePin);
  assert.equal(receipt.journalSHA256, journal.sha256);
  assert(SHA.test(journal.sha256)); assert(!journal.damaged, 'Torn recovery journal');
  assert.deepEqual(Object.keys(receipt.owners).sort(), [...candidate.plan.owners].sort());
  const rows = journal.rows;
  assert.equal(rows.length, 8, 'Only complete recovery journals authorize continuation');
  assert.equal(rows[0].phase, 'baseline'); assert.equal(rows[7].phase, 'complete');
  assert.equal(rows[0].candidatePin, manifest.candidatePin);
  assertTopology(manifest.snapshot, rows[0].baseline);
  let previous = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, receipt.releaseKey); assert.equal(row.recoveryBundlePin, input.recoveryBundlePin);
    const at = Date.parse(row.at);
    assert(Number.isFinite(at) && at >= previous && at <= now, 'Invalid recovery journal chronology'); previous = at;
  }
  for (const [i, owner] of candidate.plan.owners.entries()) {
    const record = manifest.owners[owner], proof = receipt.owners[owner];
    const [intent, upload, preview] = rows.slice(1 + i * 3, 4 + i * 3);
    for (const [row, phase] of [[intent, 'upload_intent'], [upload, 'upload_returned'], [preview, 'preview_accepted']]) {
      assert.equal(row.phase, phase); assert.equal(row.owner, owner);
    }
    assert.equal(intent.service, record.service); assert.equal(upload.service, record.service);
    assert.equal(intent.moduleSHA256, record.moduleSHA256);
    assert.equal(upload.versionId, proof.versionId); exactPreviewOrigin(record.service, proof.versionId);
    assert.equal(proof.sourceVersionId, activeVersion(manifest.snapshot, record.service));
    assert.notEqual(proof.versionId, proof.sourceVersionId, 'Raw old UUID is not recovery');
    for (const key of ['service', 'sourceVersionId', 'moduleSHA256', 'candidateArtifactSHA256', 'recoveryArtifactSHA256']) assert.equal(proof[key], record[key]);
    assert(SHA.test(proof.evidenceSHA256) && SHA.test(proof.versionSHA256));
    assert(Number.isSafeInteger(proof.acceptedAt) && proof.acceptedAt <= now && now - proof.acceptedAt < maxAge, 'Recovery preview expired or future');
    assert(Math.abs(Date.parse(preview.at) - proof.acceptedAt) < 1000, 'Acceptance time differs from journal');
    assert.deepEqual(preview.proof, proof); assert.deepEqual(rows[7].owners[owner], proof);
  }
  assert.deepEqual(rows[7].owners, receipt.owners);
  return receipt;
}

// This is read-only: local acceptance is not fresh remote-version verification.
export function verifyRecoveryReceipt(input) {
  const verified = verifyRecoveryCloud(input);
  return verifyRecoveryReceiptFiles(input, verified);
}

// Internal disk verifier; callers must supply freshly verified sealed inputs.
export function verifyRecoveryReceiptFiles(input, verified, maxAge = 900000) {
  assertEditorialRecovery(verified.candidate.plan, input.releaseKey);
  const retentionId = verified.candidate.manifest.retentionId;
  assert(/^[a-f0-9]{16}$/.test(retentionId));
  const directory = join(input.run, `recovery-cloud-${retentionId}`);
  const receipt = pinnedJson(join(directory, 'receipt.json'), input.receiptPin);
  const journal = readReleaseJournal(join(input.run, `recovery-cloud-${retentionId}.jsonl`),
    { releaseKey: verified.candidate.plan.releaseKey, recoveryBundlePin: input.recoveryBundlePin }, receipt.journalSHA256);
  acceptedRecoveryReceipt({ verified, receipt, journal, input, maxAge });
  for (const owner of verified.candidate.plan.owners) {
    const row = verified.manifest.owners[owner], proof = receipt.owners[owner];
    const config = pinnedJson(join(verified.directory, owner, 'upload.json'), row.configSHA256);
    const version = pinnedJson(join(directory, `${owner}-version.json`), proof.versionSHA256);
    assertUploadedVersion(version, proof.versionId, config, verified.manifest.snapshot.bindings[row.service]);
    const references = pinnedJson(join(verified.directory, owner, 'references.json'), row.referencesSHA256);
    verifySavedPreview(join(directory, `${owner}-http`), proof, references);
  }
  return { receipt, verified, directory, recoveryPin: input.receiptPin, productionAuthorized: false };
}

// Produces the trusted local evidence shape consumed by promotion continuation.
// Its transport must still re-read cloud versions/topology before any write.
export function verifyPromotionEvidence(input) {
  return readPromotionEvidence(input, false);
}

// Read-only renewal may inspect old proofs; this never authorizes a deployment.
export function readPromotionEvidenceForRenewal(input) {
  return readPromotionEvidence(input, true);
}

function readPromotionEvidence(input, renewalOnly) {
  const recovery = renewalOnly ? verifyRecoveryReceiptFiles(input, verifyRecoveryCloud(input), Infinity) : verifyRecoveryReceipt(input);
  const candidate = recovery.verified.candidate, { plan, manifest } = candidate;
  const journal = readReleaseJournal(join(input.run, `cloud-${manifest.retentionId}.jsonl`), {
    releaseKey: plan.releaseKey, planSHA256: input.pin, retentionId: manifest.retentionId, retentionPin: manifest.retentionPin,
  }, input.journalPin);
  const accepted = acceptedPreviewJournal(journal, candidate, Date.now(), renewalOnly ? Infinity : 900000);
  for (const owner of plan.owners) {
    const row = manifest.owners[owner], proof = accepted[row.service];
    assert.notEqual(proof.versionId, recovery.receipt.owners[owner].versionId, 'Candidate UUID cannot serve as recovery');
    const refs = pinnedJson(join(candidate.directory, owner, 'references.json'), row.referencesSHA256);
    verifySavedPreview(join(input.run, `cloud-preview-${manifest.id}`, `${owner}-http`), proof, refs);
  }
  return { plan, manifest, accepted, baseline: journal.rows[0].baseline, journalPin: journal.sha256,
    recoveryPin: recovery.recoveryPin, recovery: recovery.receipt };
}

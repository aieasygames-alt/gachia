import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { createPromotionTransport } from './desktop-promotion-transport.mjs';
import { readPromotionEvidenceForRenewal } from './desktop-recovery-receipt.mjs';
import { verifyRecoveryCloud } from './desktop-recovery-cloud.mjs';
import { digest, pinnedJson } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { verifySavedPreview } from './desktop-release-readiness.mjs';
import { verifyVersionPreview } from './desktop-version-preview.mjs';
import { assertUploadedVersion, multipartModule } from './desktop-cloud-transport.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';

export function assertRenewalTopology(evidence, current, mode) {
  assertReleaseScope(evidence.plan, evidence.manifest.owners);
  assert(['promote', 'recover'].includes(mode));
  const changed = {};
  if (mode === 'recover') for (const owner of evidence.plan.owners) {
    const service = evidence.manifest.owners[owner].service, version = activeVersion(current, service);
    assert([activeVersion(evidence.baseline, service), evidence.accepted[service].versionId, evidence.recovery.owners[owner].versionId].includes(version), 'Unknown version cannot be recovered automatically');
    changed[service] = version;
  }
  assertTopology(evidence.baseline, current, changed);
}

// Fresh GET evidence is appended under a new ID; old journals and times stay intact.
export async function renewDesktopEvidence(input) {
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Desktop only');
  return executeEvidenceRenewal({ input, readEvidence: readPromotionEvidenceForRenewal, readSealed: verifyRecoveryCloud,
    makeTransport: createPromotionTransport, preview: verifyVersionPreview });
}

export async function executeEvidenceRenewal({ input, readEvidence, readSealed, makeTransport, preview }) {
  return withRunLock(input.run, async () => {
    const evidence = readEvidence(input), sealed = readSealed(input);
    assert.equal(input.releaseKey, evidence.plan.releaseKey);
    const mode = input.mode ?? 'promote';
    const id = randomBytes(8).toString('hex'), directoryName = `renewal-${id}`, directory = join(input.run, directoryName);
    const transport = makeTransport({ run: input.run, evidence, candidateDirectory: sealed.candidate.directory,
      recoveryDirectory: sealed.directory, recoveryManifest: sealed.manifest, token: input.token, request: fetch, evidenceDirectoryName: directoryName });
    const result = { schemaVersion: 1, kind: 'same_uuid_renewal', id, mode, status: 'running', releaseKey: input.releaseKey,
      originalJournalPin: input.journalPin, originalReceiptPin: input.receiptPin, recoveryBundlePin: input.recoveryBundlePin,
      owners: {}, cloudWrites: false };
    try {
      result.before = await transport.snapshot(); assertRenewalTopology(evidence, result.before, mode);
      result.remote = await transport.verifyVersions(evidence);
      assert.equal(result.remote.status, 'passed');
      for (const owner of evidence.plan.owners) {
        const service = evidence.manifest.owners[owner].service;
        for (const [kind, root, record, versionId] of [
          ['candidate', sealed.candidate.directory, evidence.manifest.owners[owner], evidence.accepted[service].versionId],
          ['recovery', sealed.directory, sealed.manifest.owners[owner], evidence.recovery.owners[owner].versionId],
        ]) {
          const refs = pinnedJson(join(root, owner, 'references.json'), record.referencesSHA256);
          const proof = await preview({ service, versionId, references: refs, directory: join(directory, `${owner}-${kind}-http`) });
          result.owners[`${owner}-${kind}`] = { service, versionId, evidenceSHA256: proof.evidenceSHA256, acceptedAt: Date.now() };
        }
      }
      assert.deepEqual(readEvidence(input), evidence, 'Original evidence changed during renewal');
      result.after = await transport.snapshot(); assertTopology(result.before, result.after); assertRenewalTopology(evidence, result.after, mode);
      result.status = 'passed';
    } catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
    finally {
      // snapshot() creates the directory before requesting the cloud inventory.
      if (existsSync(directory)) writeFileSync(join(directory, 'renewal.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    return { id, renewalPin: digest(readFileSync(join(directory, 'renewal.json'))), directory, cloudWrites: false };
  });
}

export async function verifyRenewedEvidence(input, mode) {
  return verifyRenewalFiles({ input, mode, evidence: readPromotionEvidenceForRenewal(input), sealed: verifyRecoveryCloud(input) });
}

// Internal disk verifier: production callers first validate the original sealed chain.
export async function verifyRenewalFiles({ input, mode, evidence: original, sealed }) {
  assert(/^[a-f0-9]{16}$/.test(input.renewalId));
  const evidence = structuredClone(original);
  assert.equal(input.releaseKey, evidence.plan.releaseKey);
  const directory = join(input.run, `renewal-${input.renewalId}`), renewal = pinnedJson(join(directory, 'renewal.json'), input.renewalPin);
  assert.equal(renewal.id, input.renewalId); assert.equal(renewal.schemaVersion, 1); assert.equal(renewal.kind, 'same_uuid_renewal');
  assert.equal(renewal.status, 'passed'); assert.equal(renewal.mode, mode); assert.equal(renewal.cloudWrites, false);
  assert.equal(renewal.releaseKey, evidence.plan.releaseKey); assert.equal(renewal.originalJournalPin, input.journalPin);
  assert.equal(renewal.originalReceiptPin, input.receiptPin); assert.equal(renewal.recoveryBundlePin, input.recoveryBundlePin);
  assertTopology(renewal.before, renewal.after); assertRenewalTopology(evidence, renewal.after, mode);
  const remote = pinnedJson(join(directory, 'remote-versions.json'), renewal.remote.evidenceSHA256);
  assert.equal(remote.status, 'passed'); assert.equal(remote.observations.length, 4);
  assert.deepEqual(Object.keys(renewal.owners).sort(), evidence.plan.owners.flatMap(owner => [`${owner}-candidate`, `${owner}-recovery`]).sort());
  for (const owner of evidence.plan.owners) {
    const service = evidence.manifest.owners[owner].service;
    for (const [kind, root, record, target] of [
      ['candidate', sealed.candidate.directory, evidence.manifest.owners[owner], evidence.accepted[service]],
      ['recovery', sealed.directory, sealed.manifest.owners[owner], evidence.recovery.owners[owner]],
    ]) {
      const proof = renewal.owners[`${owner}-${kind}`];
      assert.equal(proof.service, service); assert.equal(proof.versionId, target.versionId);
      assert(Number.isSafeInteger(proof.acceptedAt) && proof.acceptedAt <= Date.now() && Date.now() - proof.acceptedAt < 900000, 'Renewed preview expired or future');
      const observed = remote.observations.filter(row => row.owner === owner && row.kind === kind);
      assert.equal(observed.length, 1); assert.equal(observed[0].service, service);
      assert.equal(observed[0].versionId, target.versionId); assert.equal(observed[0].moduleSHA256, record.moduleSHA256);
      const multipart = readFileSync(join(directory, `${owner}-${kind}.multipart`));
      assert.equal(digest(multipart), observed[0].multipartSHA256);
      assert.equal((await multipartModule(multipart)).moduleSHA256, record.moduleSHA256, 'Renewed module differs from sealed bytes');
      const version = pinnedJson(join(directory, `${owner}-${kind}-version.json`), observed[0].versionSHA256);
      const config = pinnedJson(join(root, owner, 'upload.json'), record.configSHA256);
      assertUploadedVersion(version, target.versionId, config, evidence.baseline.bindings[service]);
      verifySavedPreview(join(directory, `${owner}-${kind}-http`), proof, pinnedJson(join(root, owner, 'references.json'), record.referencesSHA256));
      target.acceptedAt = proof.acceptedAt; target.evidenceSHA256 = proof.evidenceSHA256;
    }
  }
  evidence.recoveryPin = input.renewalPin;
  return { evidence, observed: renewal.after, sealed };
}

export async function verifyRenewedPromotionEvidence(input) {
  return (await verifyRenewedEvidence(input, 'promote')).evidence;
}

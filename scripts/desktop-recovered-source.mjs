import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { assertUploadedVersion } from './desktop-cloud-transport.mjs';
import { readRenewalFiles } from './desktop-evidence-renewal.mjs';
import { verifyRecoveryPromotionJournal } from './desktop-manual-recovery.mjs';
import { verifyRecoveryCloud } from './desktop-recovery-cloud.mjs';
import { readPromotionEvidenceForRenewal } from './desktop-recovery-receipt.mjs';
import { recoveryBaselineSHA256 } from './desktop-published-baseline.mjs';
import { digest, pinnedJson } from './desktop-release-assets.mjs';
import { readReleaseJournal } from './desktop-release-readiness.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';
import { loadPublicReferences, publicReferences, validatePublicResponse } from './desktop-public-acceptance.mjs';

// Historical source identity only: no expiry is extended and this cannot grant
// permission to promote/recover. Fresh cloud identity/HTTP is checked by advance.
export function readRecoveredCandidate(input) {
  const sealed = verifyRecoveryCloud(input), original = readPromotionEvidenceForRenewal(input), { plan } = sealed.candidate;
  const scope = assertReleaseScope(plan, sealed.manifest.owners);
  assert.equal(input.releaseKey, plan.releaseKey); assert(/^[a-f0-9]{16}$/.test(input.renewalId));
  assert(/^[a-f0-9]{64}$/.test(input.recoveryJournalPin), 'Completed recovery journal pin required');
  const journal = readReleaseJournal(join(input.run, `manual-recovery-${input.renewalId}.jsonl`), { releaseKey: plan.releaseKey }, input.recoveryJournalPin);
  assert(!journal.damaged, 'Incomplete recovery cannot advance sources');
  assert.deepEqual(journal.rows.map(row => row.phase), ['baseline', 'remote_versions_verified', 'recovery_intent', 'recovered', 'recovery_intent', 'recovered', 'recovery_accepted']);
  let previous = -Infinity;
  for (const row of journal.rows) {
    const time = Date.parse(row.at); assert(time >= previous && time <= Date.now(), 'Recovery chronology changed'); previous = time;
  }
  const completedAt = Date.parse(journal.rows.at(-1).at);
  const value = readRenewalFiles({ input, mode: 'recover', evidence: original, sealed, now: completedAt });
  for (const row of value.archiveChecks) assert.equal(realpathSync(row.path), row.path, 'Linked renewal archive forbidden');
  const promotion = verifyRecoveryPromotionJournal(input, value);
  for (const row of promotion.rows) assert(Date.parse(row.at) <= Date.parse(journal.rows[0].at), 'Promotion occurred after recovery began');
  assert.equal(journal.rows[0].renewalId, input.renewalId); assertTopology(value.observed, journal.rows[0].observed);
  for (const row of Object.values(value.evidence.accepted)) assert(row.acceptedAt <= Date.parse(journal.rows[0].at), 'Recovery began before renewal');
  const versions = {}, modules = {}, sourceDirectories = {}, moduleProofs = {};
  for (const [i, owner] of scope.owners.entries()) {
    const row = sealed.manifest.owners[owner], target = value.evidence.recovery.owners[owner];
    assert.notEqual(target.versionId, row.sourceVersionId, 'Raw old UUID recovery forbidden');
    assert.notEqual(target.versionId, original.accepted[row.service].versionId, 'Candidate UUID is not recovery');
    assert(target.acceptedAt <= Date.parse(journal.rows[0].at), 'Recovery began before renewal');
    for (const event of journal.rows.slice(2 + i * 2, 4 + i * 2)) {
      assert.equal(event.owner, owner); assert.equal(event.service, row.service); assert.equal(event.versionId, target.versionId);
      assert(Date.parse(event.at) >= target.acceptedAt && Date.parse(event.at) - target.acceptedAt < 900000, 'Recovery used expired preview');
    }
    versions[row.service] = target.versionId; modules[row.service] = row.moduleSHA256;
    if (target.moduleProof) moduleProofs[owner] = target.moduleProof;
    sourceDirectories[owner] = join(sealed.recovery.directory, owner, '.open-next');
  }
  assertTopology(original.baseline, value.observed, Object.fromEntries(scope.services.map(service => [service, activeVersion(value.observed, service)])));
  const directory = join(input.run, `manual-recovery-evidence-${input.renewalId}`), remote = journal.rows[1].proof;
  assert.equal(remote.status, 'passed'); assert.deepEqual(remote.versions, versions); assert.deepEqual(remote.recoveryVersions, versions); assert.deepEqual(remote.modules, modules);
  const savedRemote = pinnedJson(join(directory, 'remote-versions.json'), remote.evidenceSHA256);
  assert.deepEqual({ ...savedRemote, evidenceSHA256: remote.evidenceSHA256 }, remote);
  assert.equal(remote.observations.length, scope.owners.length * 2);
  const archiveChecks = [...value.archiveChecks];
  for (const owner of scope.owners) for (const kind of ['candidate', 'recovery']) {
    const record = sealed.manifest.owners[owner], matches = remote.observations.filter(row => row.owner === owner && row.kind === kind);
    assert.equal(matches.length, 1); const row = matches[0];
    assert.equal(row.service, record.service); assert.equal(row.versionId, versions[record.service]); assert.equal(row.moduleSHA256, record.moduleSHA256);
    const path = join(directory, `${owner}-${kind}.multipart`); assert.equal(realpathSync(path), path);
    assert.equal(digest(readFileSync(path)), row.multipartSHA256);
    archiveChecks.push({ path, sha256: row.multipartSHA256, moduleSHA256: row.moduleSHA256 });
    assertUploadedVersion(pinnedJson(join(directory, `${owner}-${kind}-version.json`), row.versionSHA256), row.versionId,
      pinnedJson(join(sealed.directory, owner, 'upload.json'), record.configSHA256), original.baseline.bindings[record.service]);
  }
  const accepted = journal.rows.at(-1).proof;
  assert.equal(accepted.status, 'passed'); assert.equal(accepted.releaseKey, plan.releaseKey); assert.deepEqual(accepted.versions, versions);
  const proof = pinnedJson(join(directory, 'public-acceptance.json'), accepted.evidenceSHA256);
  assert.deepEqual({ ...proof, evidenceSHA256: accepted.evidenceSHA256 }, accepted);
  assert.deepEqual(Object.keys(proof.owners).sort(), [...scope.owners].sort());
  for (const owner of scope.owners) {
    const row = proof.owners[owner], record = sealed.manifest.owners[owner]; assert.equal(row.status, 'passed');
    const references = publicReferences(owner, loadPublicReferences(join(sealed.directory, owner), record.referencesSHA256), plan.game);
    const saved = pinnedJson(join(directory, `${owner}-public/result.json`), row.evidenceSHA256);
    assert.equal(saved.status, 'passed'); assert.equal(saved.owner, owner); assert.equal(saved.origin, 'https://gachia.com');
    assert.equal(row.responses, references.length); assert.equal(saved.observations.length, references.length);
    for (const [i, reference] of references.entries()) {
      const observation = saved.observations[i]; assert.equal(observation.path, reference.path); assert.equal(observation.bodyFile, `${i}.body`);
      const path = join(directory, `${owner}-public`, observation.bodyFile); assert.equal(realpathSync(path), path);
      const body = readFileSync(path); assert.equal(body.length, observation.bytes); assert.equal(digest(body), observation.sha256);
      validatePublicResponse(new Response(null, { status: observation.status, headers: observation.headers }), body, reference);
    }
  }
  const owners = Object.fromEntries(scope.owners.map(owner => [owner, { ...sealed.manifest.owners[owner], artifactSHA256: sealed.manifest.owners[owner].recoveryArtifactSHA256 }]));
  return { plan, directory: sealed.directory, manifest: { ...sealed.manifest, retentionId: sealed.candidate.manifest.retentionId, owners },
    versions, sourceDirectories, archiveChecks, ...(Object.keys(moduleProofs).length ? { moduleProofs } : {}), contentSHA256: recoveryBaselineSHA256(sealed.recovery, sealed.retained) };
}

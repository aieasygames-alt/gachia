import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';

export const GENSHIN_INDEPENDENT_POLICY = 'genshin-independent-existing-character-text-production-v1';
export const NTE_INDEPENDENT_POLICY = 'nte-independent-existing-character-text-production-v1';
const SHA = /^[a-f0-9]{64}$/, UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const fresh = at => assert(Number.isSafeInteger(at) && at <= Date.now() && Date.now() - at < 900000, 'Independent release observation expired');
export function assertGenshinIndependentIdentity(value) {
  return assertIndependentIdentity(value, 'genshin');
}
export function assertNteIndependentIdentity(value) { return assertIndependentIdentity(value, 'nte'); }
function assertIndependentIdentity(value, game) {
  assert(['genshin', 'nte'].includes(game)); const service = `gachia-game-${game}`;
  assert.deepEqual(Object.keys(value).sort(), ['policy', 'releaseKey', 'sourceCommit', 'executorCI', 'bundlePin', 'reviewPin', 'baseline', 'observedAt', 'owners'].sort());
  assert.equal(value.policy, game === 'genshin' ? GENSHIN_INDEPENDENT_POLICY : NTE_INDEPENDENT_POLICY); fresh(value.observedAt);
  for (const key of ['releaseKey', 'bundlePin', 'reviewPin']) assert(SHA.test(value[key]));
  assert.equal(value.executorCI.status, 'full_exact_ci_passed'); assert.equal(value.executorCI.commit, value.sourceCommit); assert(/^[a-f0-9]{40}$/.test(value.sourceCommit));
  assert(Number.isSafeInteger(value.executorCI.runID) && value.executorCI.runID > 0);
  assertTopology(value.baseline, value.baseline); assert.deepEqual(Object.keys(value.owners), [game]);
  const owner = value.owners[game];
  assert.deepEqual(Object.keys(owner).sort(), ['service', 'sourceVersionId', 'sourceIdentityPin', 'candidate', 'recovery'].sort());
  assert.equal(owner.service, service); assert.equal(owner.sourceVersionId, activeVersion(value.baseline, service)); assert(SHA.test(owner.sourceIdentityPin));
  for (const role of ['candidate', 'recovery']) {
    assert.deepEqual(Object.keys(owner[role]).sort(), ['artifactPin', 'configPin', 'moduleSHA256', 'referencesPin']);
    for (const pin of Object.values(owner[role])) assert(SHA.test(pin));
  }
}

// Fixed desktop adapters qualify the live review, complete A and sealed B.
// Unknown writes are journalled and stop; no automatic retry or rollback.
export async function executeGenshinIndependentRelease({ run, releaseKey, verify, transport }) {
  return executeIndependentRelease({ run, releaseKey, verify, transport }, 'genshin');
}
export async function executeNteIndependentRelease(input) { return executeIndependentRelease(input, 'nte'); }
async function executeIndependentRelease({ run, releaseKey, verify, transport }, game) {
  const service = `gachia-game-${game}`;
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify()); assertIndependentIdentity(initial, game); assert.equal(releaseKey, initial.releaseKey);
    const owner = initial.owners[game], accepted = {}, journal = join(run, `${game}-independent-${releaseKey}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ policy: initial.policy, releaseKey, at: new Date().toISOString(), ...row }) + '\n', { flush: true });
    let deployed, pendingOperation, observedAt = initial.observedAt;
    const revalidate = async () => {
      const value = await verify(); assertIndependentIdentity(value, game); assert(value.observedAt >= observedAt); observedAt = value.observedAt;
      assert.deepEqual({ ...value, observedAt: initial.observedAt }, initial, 'Independent release identity changed');
      assertTopology(initial.baseline, await transport.snapshot(), deployed ? { [service]: deployed } : {});
    };
    record({ phase: 'baseline', baseline: initial.baseline, owners: initial.owners, reviewPin: initial.reviewPin });
    try {
      for (const role of ['recovery', 'candidate']) {
        await revalidate(); pendingOperation = { owner: game, role, service, sealed: owner[role] };
        record({ phase: 'upload_intent', ...pendingOperation });
        const uploaded = await transport.upload({ ...pendingOperation, releaseKey });
        assert(UUID.test(uploaded.versionId)); assert.notEqual(uploaded.versionId, owner.sourceVersionId);
        if (role === 'candidate') assert.notEqual(uploaded.versionId, accepted.recovery.versionId);
        const args = { ...pendingOperation, versionId: uploaded.versionId }; pendingOperation = args;
        record({ phase: 'upload_returned', ...args });
        const inspected = await transport.inspect(args);
        assert.equal(inspected.versionId, args.versionId); assert.equal(inspected.moduleSHA256, owner[role].moduleSHA256);
        assert(SHA.test(inspected.moduleProof?.pin) && SHA.test(inspected.versionPin));
        await revalidate();
        const preview = await transport.preview({ ...args, inspected });
        assert.equal(preview.status, 'passed'); assert.equal(preview.observationMode, 'cloud_exact_version');
        assert.equal(preview.service, service); assert.equal(preview.versionId, args.versionId); assert(SHA.test(preview.evidenceSHA256));
        await transport.revalidate({ ...args, inspected }); await revalidate();
        accepted[role] = { ...inspected, evidenceSHA256: preview.evidenceSHA256, acceptedAt: Date.now() };
        record({ phase: 'preview_accepted', owner: game, role, proof: accepted[role] }); pendingOperation = undefined;
      }
      for (const role of ['recovery', 'candidate']) {
        fresh(accepted[role].acceptedAt);
        await transport.revalidate({ owner: game, role, service, versionId: accepted[role].versionId, sealed: owner[role], inspected: accepted[role] });
      }
      await revalidate(); pendingOperation = { owner: game, service, versionId: accepted.candidate.versionId, releaseKey };
      record({ phase: 'deployment_intent', ...pendingOperation, observedAt });
      const deployment = await transport.promote(pendingOperation);
      assert.equal(deployment.service, service); assert.equal(deployment.versionId, accepted.candidate.versionId);
      assert.equal(deployment.releaseKey, releaseKey); assert(UUID.test(deployment.deploymentId)); deployed = deployment.versionId;
      record({ phase: 'deployed', owner: game, result: deployment }); pendingOperation = undefined; await revalidate();
      const proof = await transport.acceptProduction({ deployed: { [game]: deployed }, accepted: { [game]: accepted } });
      assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256)); assert.deepEqual(proof.versions, { [service]: deployed });
      await revalidate(); record({ phase: 'production_accepted', proof });
      return { status: 'production_accepted', policy: initial.policy, versions: proof.versions, deployment, accepted, publicEvidencePin: proof.evidenceSHA256,
        journalPin: digest(readFileSync(journal)), sourceAdvanced: false };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, deployed, accepted, error: error.message, automaticRetry: false, automaticRollback: false });
      try { record({ phase: 'read_only_reconciliation', snapshot: await transport.snapshot() }); }
      catch (error) { record({ phase: 'observation_unavailable', error: error.message }); }
      throw error;
    }
  });
}

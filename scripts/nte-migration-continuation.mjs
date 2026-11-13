import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { assertNteMigrationIdentity, assertNteMigrationTopology } from './nte-release-config.mjs';

const SHA = /^[a-f0-9]{64}$/, UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export function assertNteStoppedRouterRecovery(identity, rows) {
  assertNteMigrationIdentity({ ...identity, observedAt: Date.now() });
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'upload_intent', 'upload_returned', 'preview_accepted',
    'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted',
    'upload_intent', 'upload_returned', 'stopped', 'read_only_reconciliation']);
  let at = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, identity.releaseKey); assert.equal(row.policy, identity.policy);
    const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next;
  }
  assert.deepEqual(rows[0].baseline, identity.baseline); assert.deepEqual(rows[0].owners, identity.owners);
  const accepted = { nte: { recovery: rows[3].proof, candidate: rows[6].proof }, router: {} };
  const deployed = { nte: accepted.nte.candidate.versionId };
  assert(UUID.test(deployed.nte)); assert.equal(rows[8].owner, 'nte'); assert.equal(rows[8].versionId, deployed.nte);
  assert.equal(rows[8].result.versionId, deployed.nte); assert(UUID.test(rows[8].result.deploymentId));
  assert.equal(rows[9].owner, 'nte'); assert.equal(rows[9].proof.status, 'passed'); assert(SHA.test(rows[9].proof.evidenceSHA256));
  for (const row of rows.slice(10, 12)) { assert.equal(row.owner, 'router'); assert.equal(row.role, 'recovery'); assert.equal(row.service, 'gachia-router'); }
  assert.deepEqual(rows[10].sealed, identity.owners.router.recovery); assert(UUID.test(rows[11].versionId));
  assert.notEqual(rows[11].versionId, identity.owners.router.sourceVersionId);
  const pending = { phase: 'upload', owner: 'router', role: 'recovery', service: 'gachia-router', versionId: rows[11].versionId };
  assert.deepEqual(rows[12].pendingOperation, pending); assert.deepEqual(rows[13].pendingOperation, pending);
  assert.equal(rows[12].automaticRetry, false); assert.equal(rows[12].automaticRollback, false);
  assert.deepEqual(rows[12].deployed, deployed); assert.deepEqual(rows[12].accepted, accepted);
  assert.equal(rows[12].error, 'Production read failed: https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia/subdomain');
  assertNteMigrationTopology(identity.baseline, rows[13].snapshot, { configured: ['nte'], deployed });
  assert.equal(rows[13].snapshot.services['gachia-game-nte'].id, rows[8].result.deploymentId);
  return { accepted, deployed, routerRecoveryVersionId: rows[11].versionId };
}

// One explicit continuation of a known returned upload. This never invokes the
// NTE writer or the Router recovery uploader, and cannot accept an unknown write.
export async function executeNteRouterContinuation({ run, releaseKey, verify, transport, previous }) {
  assert.equal(digest(readFileSync(previous.journal.path)), previous.journal.pin);
  const rows = readFileSync(previous.journal.path, 'utf8').trimEnd().split('\n').map(JSON.parse);
  const state = assertNteStoppedRouterRecovery(previous.identity, rows);
  assert.notEqual(releaseKey, previous.identity.releaseKey);
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify()); assertNteMigrationIdentity(initial); assert.equal(initial.releaseKey, releaseKey);
    assert.deepEqual({ ...initial, releaseKey: previous.identity.releaseKey, observedAt: previous.identity.observedAt }, previous.identity);
    const journal = join(run, `nte-migration-${releaseKey}.jsonl`); writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = value => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), policy: initial.policy, releaseKey, ...value }) + '\n', { flush: true });
    const configured = ['nte'], deployed = structuredClone(state.deployed), accepted = { nte: state.accepted.nte };
    let pendingOperation, observedAt = initial.observedAt;
    const revalidate = async () => {
      const current = await verify(); assertNteMigrationIdentity(current); assert(current.observedAt >= observedAt);
      assert.deepEqual({ ...current, observedAt: initial.observedAt }, initial); observedAt = current.observedAt;
      assertNteMigrationTopology(initial.baseline, await transport.snapshot(), { configured, deployed });
    };
    record({ phase: 'continuation_baseline', previousJournal: previous.journal, previousReleaseKey: previous.identity.releaseKey, baseline: initial.baseline, owners: initial.owners, deployed, accepted });
    try {
      await revalidate();
      const step = await transport.acceptStep({ owner: 'nte', deployed: { ...deployed } });
      assert.equal(step.status, 'passed'); assert(SHA.test(step.evidenceSHA256)); record({ phase: 'step_accepted', owner: 'nte', proof: step });
      for (const owner of ['router', 'main']) {
        const row = initial.owners[owner]; accepted[owner] = {};
        for (const role of ['recovery', 'candidate']) {
          await revalidate();
          const args = { owner, role, service: row.service, sealed: row[role] };
          let result, proof;
          if (owner === 'router' && role === 'recovery') {
            result = { versionId: state.routerRecoveryVersionId }; proof = previous.routerRecovery;
            assert.equal(proof.versionId, result.versionId); assert.equal(proof.moduleSHA256, row.recovery.moduleSHA256);
            await transport.revalidate({ ...args, ...result, inspected: proof });
            record({ phase: 'known_upload_reopened', owner, role, service: row.service, versionId: result.versionId, proof });
          } else {
            pendingOperation = { phase: 'upload', owner, role, service: row.service };
            record({ ...pendingOperation, phase: 'upload_intent', sealed: row[role] });
            result = await transport.upload({ ...args, releaseKey }); assert(UUID.test(result.versionId));
            assert.notEqual(result.versionId, row.sourceVersionId);
            pendingOperation.versionId = result.versionId; record({ ...pendingOperation, phase: 'upload_returned' });
            proof = await transport.inspect({ ...args, ...result });
          }
          assert.equal(proof.versionId, result.versionId); assert.equal(proof.moduleSHA256, row[role].moduleSHA256);
          assert(SHA.test(proof.moduleProof?.pin) && SHA.test(proof.versionPin));
          if (role === 'candidate') { assert.notEqual(result.versionId, accepted[owner].recovery.versionId); configured.push(owner); }
          await revalidate();
          const preview = await transport.preview({ ...args, ...result, inspected: proof });
          assert.equal(preview.status, 'passed'); assert.equal(preview.observationMode, 'cloud_exact_version');
          assert.equal(preview.service, row.service); assert.equal(preview.versionId, result.versionId); assert(SHA.test(preview.evidenceSHA256));
          await transport.revalidate({ ...args, ...result, inspected: proof }); await revalidate();
          accepted[owner][role] = { ...proof, evidenceSHA256: preview.evidenceSHA256, acceptedAt: Date.now() };
          record({ phase: 'preview_accepted', owner, role, proof: accepted[owner][role] }); pendingOperation = undefined;
        }
        await revalidate();
        for (const role of ['recovery', 'candidate']) {
          assert(Date.now() - accepted[owner][role].acceptedAt < 900000);
          await transport.revalidate({ owner, role, service: row.service, versionId: accepted[owner][role].versionId, sealed: row[role], inspected: accepted[owner][role] });
        }
        await revalidate(); pendingOperation = { phase: 'deployment', owner, service: row.service, versionId: accepted[owner].candidate.versionId };
        record({ ...pendingOperation, phase: 'deployment_intent', observedAt });
        const result = await transport.promote({ ...pendingOperation, releaseKey });
        assert.equal(result.service, row.service); assert.equal(result.versionId, pendingOperation.versionId); assert(UUID.test(result.deploymentId));
        deployed[owner] = result.versionId; record({ ...pendingOperation, phase: 'deployed', result }); pendingOperation = undefined;
        await revalidate(); const proof = await transport.acceptStep({ owner, deployed: { ...deployed } });
        assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256)); record({ phase: 'step_accepted', owner, proof });
      }
      await revalidate(); const proof = await transport.acceptProduction({ deployed: { ...deployed }, accepted });
      assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256));
      assert.deepEqual(proof.versions, Object.fromEntries(Object.entries(deployed).map(([owner, id]) => [initial.owners[owner].service, id])));
      await revalidate(); record({ phase: 'production_accepted', proof });
      return { policy: initial.policy, status: 'production_accepted', versions: proof.versions, journalPin: digest(readFileSync(journal)), sourceAdvanced: false };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, deployed, accepted, error: error.message, automaticRetry: false, automaticRollback: false });
      try { record({ phase: 'read_only_reconciliation', snapshot: await transport.snapshot(), pendingOperation }); } catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

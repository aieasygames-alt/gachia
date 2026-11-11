import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertTopology } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { assertModuleVersionIdentity } from './desktop-version-provenance.mjs';
import { GENSHIN_MIGRATION_ORDER, GENSHIN_MIGRATION_POLICY, assertGenshinMigrationIdentity, assertGenshinMigrationTopology } from './genshin-production-migration.mjs';
import { migrationJSON, migrationPinned, recheckMigrationHTTP, verifyMigrationHTTP } from './genshin-migration-http.mjs';
import { readMainDeploymentEvidence } from './genshin-migration-main-finalization.mjs';
import { migrationJournalRows } from './genshin-migration-source-advance.mjs';

export const genshinReadonlyCompletionKey = (request, executorCI) => digest(migrationJSON({ policy: GENSHIN_MIGRATION_POLICY, request, executorCI }));

export function assertDeployedMainStop(rows, deployed, accepted) {
  assert.deepEqual(rows.map(row => row.phase), ['main_finalization_baseline', 'preview_accepted', 'preview_accepted', 'deployment_intent', 'deployed', 'stopped', 'read_only_reconciliation']);
  assert.equal(rows[5].error, 'Production read failed: https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia-game-azur-promilia/subdomain');
  for (const row of rows) assert.equal(row.pendingOperation, undefined, 'Unknown writes cannot be completed');
  assert.equal(rows[5].automaticRetry, false); assert.equal(rows[5].automaticRollback, false);
  assert.deepEqual(rows[5].deployed, deployed); assert.deepEqual(rows[5].accepted, accepted);
}

export async function readDeployedMainStop(request) {
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_deployed_migration_readonly_request');
  const stopped = request.stopped, priorRequest = migrationPinned(stopped.request), identity = migrationPinned(stopped.identity);
  const opened = await readMainDeploymentEvidence({ request: priorRequest, executorCI: request.finalizationCI, journal: stopped.journal });
  const { directory, previous, rows, evidence, deployed, deployments } = opened;
  assert.equal(stopped.request.path, join(directory, 'request.json')); assert.equal(stopped.identity.path, join(directory, 'identity.json'));
  assert.deepEqual({ ...identity, releaseKey: previous.identity.releaseKey, observedAt: previous.identity.observedAt }, previous.identity);
  assert.equal(identity.releaseKey, opened.releaseKey); assert(Number.isSafeInteger(identity.observedAt) && identity.observedAt <= Date.parse(rows[0].at));
  assertDeployedMainStop(rows, deployed, opened.accepted.main);
  const snapshot = rows[6].snapshot;
  assertGenshinMigrationTopology(evidence.value.baseline, snapshot, { configured: [...GENSHIN_MIGRATION_ORDER], deployed });
  for (const owner of GENSHIN_MIGRATION_ORDER) assert.equal(snapshot.services[evidence.value.owners[owner].service].id, deployments[owner].deploymentId);
  assert.equal(stopped.publicResult.path, join(directory, 'public/result.json'));
  const publicResult = migrationPinned(stopped.publicResult); assert.equal(publicResult.status, 'passed');
  recheckMigrationHTTP({ directory: join(directory, 'public'), pin: stopped.publicResult.pin, origin: 'https://gachia.com',
    references: migrationPinned(evidence.value.finalReferences), owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases });
  return { ...opened, request: priorRequest, identity, snapshot };
}

// The adapter exposes GET-only capabilities. It cannot upload, promote or roll back.
export function genshinReadonlyCompletionTransport({ previous, reader, directory }) {
  return {
    snapshot: reader.snapshot,
    revalidate: async () => {
      for (const owner of GENSHIN_MIGRATION_ORDER) for (const role of ['recovery', 'candidate']) {
        assertModuleVersionIdentity(previous.modules[owner][role].version,
          await reader.version(previous.evidence.value.owners[owner].service, previous.accepted[owner][role].versionId));
      }
      for (const row of Object.values(previous.evidence.index.owners))
        assertModuleVersionIdentity(row.version, await reader.version(row.service, row.versionId));
    },
    accept: () => verifyMigrationHTTP({ origin: 'https://gachia.com', references: migrationPinned(previous.evidence.value.finalReferences),
      directory: join(directory, 'public'), owner: 'router', role: 'candidate', expected: previous.evidence.expected, bases: previous.evidence.bases, request: reader.publicRequest }),
  };
}

export async function executeGenshinReadonlyCompletion({ run, releaseKey, verify, previous, transport }) {
  assert.deepEqual(Object.keys(transport).sort(), ['accept', 'revalidate', 'snapshot']);
  return withRunLock(run, async () => {
    const identity = await verify(); assertGenshinMigrationIdentity(identity); assert.equal(identity.releaseKey, releaseKey);
    const journal = join(run, `genshin-migration-${releaseKey}.jsonl`); writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), policy: GENSHIN_MIGRATION_POLICY, releaseKey, ...row }) + '\n', { flush: true });
    const check = async () => {
      const current = await verify(); assertGenshinMigrationIdentity(current); assert.deepEqual({ ...current, observedAt: identity.observedAt }, identity);
      const snapshot = await transport.snapshot(); assertTopology(previous.snapshot, snapshot); return snapshot;
    };
    record({ phase: 'read_only_completion_baseline', previousJournal: previous.journal, versions: previous.versions, cloudWrites: false });
    try {
      const before = await check(); record({ phase: 'topology_observed', snapshot: before });
      await transport.revalidate(); record({ phase: 'immutable_modules_revalidated' });
      const proof = await transport.accept(); assert.equal(proof.status, 'passed'); assert(/^[a-f0-9]{64}$/.test(proof.evidenceSHA256));
      record({ phase: 'public_accepted', proof });
      await transport.revalidate(); const after = await check(); assertTopology(before, after);
      record({ phase: 'production_accepted', snapshot: after, proof: { ...proof, versions: previous.versions }, cloudWrites: false });
      return { policy: GENSHIN_MIGRATION_POLICY, status: 'production_accepted', versions: previous.versions,
        journalPin: digest(readFileSync(journal)), sourceAdvanced: false, cloudWrites: false };
    } catch (error) {
      record({ phase: 'stopped', error: error.message, cloudWrites: false, automaticRetry: false, automaticRollback: false }); throw error;
    }
  });
}

export async function readReadonlyGenshinCompletion(proof) {
  const value = migrationPinned(proof), directory = dirname(proof.path), request = value.readOnlyRequest;
  const previous = await readDeployedMainStop(request), { evidence } = previous;
  assert.equal(proof.path, join(directory, 'completion.json')); assert.equal(value.kind, 'genshin_initial_production_migration_completion'); assert.equal(value.schemaVersion, 1);
  assert.equal(value.status, 'production_accepted'); assert.equal(value.policy, GENSHIN_MIGRATION_POLICY); assert.equal(value.sourceAdvanced, false); assert.equal(value.cloudWrites, false);
  assert.deepEqual(value.request, previous.request); assert.deepEqual(value.bundle, previous.previous.original.request.bundle);
  assert.deepEqual(value.executorCI, previous.identity.sourceCI); assert.deepEqual(value.continuationExecutorCI, previous.request.continuationCI);
  assert.deepEqual(value.finalizationExecutorCI, request.finalizationCI); assert.equal(value.finalizationReleaseKey, previous.releaseKey);
  assert.deepEqual(value.deploymentJournal, request.stopped.journal);
  assert.equal(value.readOnlyExecutorCI.status, 'full_exact_ci_passed'); assert.equal(value.readOnlyExecutorCI.runID, request.executorRunID); assert(/^[a-f0-9]{40}$/.test(value.readOnlyExecutorCI.commit));
  assert.equal(value.releaseKey, genshinReadonlyCompletionKey(request, value.readOnlyExecutorCI));
  assert.equal(value.journal.path, join(directory, `genshin-migration-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin);
  const rows = migrationJournalRows(value.journal, value.releaseKey);
  assert.deepEqual(rows.map(row => row.phase), ['read_only_completion_baseline', 'topology_observed', 'immutable_modules_revalidated', 'public_accepted', 'production_accepted']);
  assert.deepEqual(rows[0].previousJournal, request.stopped.journal); assert.deepEqual(rows[0].versions, previous.versions); assert.equal(rows[0].cloudWrites, false);
  assert(Date.parse(rows[0].at) >= Date.parse(previous.rows.at(-1).at));
  for (const row of [rows[1], rows[4]]) assertTopology(previous.snapshot, row.snapshot);
  assert.equal(rows[4].cloudWrites, false); assert.deepEqual(value.versions, previous.versions);
  assert.deepEqual(rows[4].proof, { ...rows[3].proof, versions: previous.versions }); assert.equal(rows[3].proof.status, 'passed');
  recheckMigrationHTTP({ directory: join(directory, 'public'), pin: rows[3].proof.evidenceSHA256, origin: 'https://gachia.com',
    references: migrationPinned(evidence.value.finalReferences), owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases });
  return { value, directory, evidence, rows, accepted: previous.accepted, modules: previous.modules, deployments: previous.deployments, versions: previous.versions, currentCloudRead: false };
}

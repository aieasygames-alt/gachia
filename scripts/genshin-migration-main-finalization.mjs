import assert from 'node:assert/strict';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertUploadedVersion } from './desktop-cloud-transport.mjs';
import { desktopCloudSnapshot } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { assertModuleVersionIdentity } from './desktop-version-provenance.mjs';
import { GENSHIN_MIGRATION_ORDER, GENSHIN_MIGRATION_POLICY, assertGenshinMigrationIdentity, assertGenshinMigrationTopology } from './genshin-production-migration.mjs';
import { migrationExpectedBindings } from './genshin-migration-prepare.mjs';
import { MIGRATION_FINGERPRINT_POLICY, migrationJSON, migrationPinned, migrationPreviewOrigin, migrationSave, recheckMigrationHTTP, recheckMigrationObservations, verifyMigrationHTTP } from './genshin-migration-http.mjs';
import { genshinMigrationContinuationKey, migrationGenshinStepReferences, migrationJournalRows, readMigrationOwner, readStoppedGenshinMigration } from './genshin-migration-source-advance.mjs';
import { unifiedOwnerDeploymentWriter } from './unified-owner-deployment.mjs';
import { unifiedProductionRead } from './unified-production-transport.mjs';
import { readUnifiedUploadedModule, readUnifiedVersion, revalidateUnifiedUploadedModule } from './unified-version-identity.mjs';

const SHA = /^[a-f0-9]{64}$/, UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const service = 'gachia';
export const genshinMainFinalizationKey = (request, executorCI) => digest(migrationJSON({ policy: GENSHIN_MIGRATION_POLICY, request, executorCI }));
export function assertGenshinMainFinalizationPrefix(rows) {
  assert.deepEqual(rows.map(row => row.phase), ['continuation_baseline', 'step_accepted',
    'upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted',
    'upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'stopped', 'observation_unavailable']);
  const pending = { phase: 'upload', owner: 'main', role: 'candidate', service, versionId: rows[15].versionId };
  assert(UUID.test(pending.versionId)); assert.deepEqual(rows[16].pendingOperation, pending);
  assert.equal(rows[16].automaticRetry, false); assert.equal(rows[16].automaticRollback, false);
  assert(rows[16].error.startsWith('Migration rendered content/metadata/links/media differ: /ja\n'));
  assert(rows[17].error.startsWith('Production read failed: https://api.cloudflare.com/'));
}

export async function readStoppedMainMigration(request) {
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_main_migration_finalization_request');
  const stopped = request.stopped, previousRequest = migrationPinned(stopped.request), identity = migrationPinned(stopped.identity), directory = dirname(stopped.journal.path);
  assert.equal(previousRequest.kind, 'genshin_migration_continuation_request'); assert.equal(previousRequest.schemaVersion, 1);
  assert.equal(stopped.request.path, join(directory, 'request.json')); assert.equal(stopped.identity.path, join(directory, 'identity.json'));
  const original = await readStoppedGenshinMigration(previousRequest.stopped), evidence = original.evidence;
  assert.equal(request.continuationCI.status, 'full_exact_ci_passed'); assert.equal(request.continuationCI.runID, previousRequest.executorRunID);
  assert.equal(identity.releaseKey, genshinMigrationContinuationKey(previousRequest, request.continuationCI));
  assert.deepEqual({ ...identity, releaseKey: original.identity.releaseKey, observedAt: original.identity.observedAt }, original.identity);
  assert.equal(stopped.journal.path, join(directory, `genshin-migration-${identity.releaseKey}.jsonl`));
  const rows = migrationJournalRows(stopped.journal, identity.releaseKey); assertGenshinMainFinalizationPrefix(rows);
  assert.deepEqual(rows[0].baseline, original.identity.baseline); assert.deepEqual(rows[0].owners, original.identity.owners);
  assert.deepEqual(rows[0].previousJournal, previousRequest.stopped.journal); assert.equal(rows[0].previousReleaseKey, original.identity.releaseKey);
  assert.deepEqual(rows[0].deployed, original.deployed); assert.deepEqual(rows[0].accepted, original.accepted);
  assert(Date.parse(rows[0].at) >= Date.parse(original.rows.at(-1).at));
  assert.equal(rows[1].owner, 'genshin'); assert.equal(rows[1].proof.status, 'passed');
  recheckMigrationHTTP({ directory: join(directory, 'public-0-genshin'), pin: rows[1].proof.evidenceSHA256, origin: 'https://gachia.com',
    references: migrationGenshinStepReferences(evidence), owner: 'genshin', role: 'candidate', expected: evidence.expected, bases: evidence.bases });
  const router = await readMigrationOwner({ owner: 'router', rows, offset: 2, directory, releaseKey: identity.releaseKey, evidence });
  recheckMigrationHTTP({ directory: join(directory, 'public-1-router'), pin: rows[10].proof.evidenceSHA256, origin: 'https://gachia.com',
    references: migrationPinned({ path: join(evidence.directory, 'router/candidate/local-http/responses/references.json'), pin: evidence.value.owners.router.candidate.referencesPin }),
    owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases });
  const modules = { ...original.modules, router: router.modules, main: {} }, accepted = { ...original.accepted, router: router.accepted, main: {} };
  for (const [i, role] of ['recovery', 'candidate'].entries()) {
    const offset = 11 + i * 3, sealed = evidence.value.owners.main[role], intent = rows[offset], returned = rows[offset + 1];
    for (const row of [intent, returned]) { assert.equal(row.owner, 'main'); assert.equal(row.role, role); assert.equal(row.service, service); }
    assert.deepEqual(intent.sealed, sealed); assert(UUID.test(returned.versionId)); assert.notEqual(returned.versionId, evidence.value.owners.main.sourceVersionId);
    const output = join(directory, 'main-' + role), recorded = role === 'recovery' ? rows[13].proof
      : { versionId: returned.versionId, moduleSHA256: sealed.moduleSHA256, moduleProof: stopped.mainCandidateModule, versionPin: stopped.mainCandidateVersion.pin };
    if (role === 'recovery') { assert.equal(rows[13].owner, 'main'); assert.equal(rows[13].role, role); }
    assert.equal(recorded.versionId, returned.versionId); assert.equal(recorded.moduleSHA256, sealed.moduleSHA256);
    assert.equal(recorded.moduleProof.path, join(output, 'module/receipt.json'));
    const versionProof = { path: join(output, 'version.json'), pin: recorded.versionPin };
    if (role === 'candidate') assert.deepEqual(stopped.mainCandidateVersion, versionProof);
    const version = migrationPinned(versionProof), context = { role, transportPin: identity.releaseKey, configPin: sealed.configPin };
    const module = await readUnifiedUploadedModule(recorded.moduleProof, { service, versionId: returned.versionId, moduleSHA256: sealed.moduleSHA256, context });
    assertModuleVersionIdentity(module.version, version);
    const config = migrationPinned({ path: join(evidence.directory, 'main', role, 'upload.json'), pin: sealed.configPin });
    assertUploadedVersion(version, returned.versionId, config, migrationExpectedBindings(evidence.value.baseline, 'main', role));
    const references = migrationPinned({ path: join(evidence.directory, 'main', role, 'local-http/responses/references.json'), pin: sealed.referencesPin });
    const check = { directory: join(output, 'preview'), references, owner: 'main', role, expected: evidence.expected, bases: evidence.bases, preview: true };
    if (role === 'recovery') recheckMigrationHTTP({ ...check, pin: recorded.evidenceSHA256, origin: migrationPreviewOrigin(service, returned.versionId) });
    else {
      assert.equal(stopped.failedPreview.path, join(output, 'preview/failure.json'));
      const failure = migrationPinned(stopped.failedPreview);
      assert.equal(failure.automaticRetry, false); assert.equal(failure.error, rows[16].error);
      // This only diagnoses the old failure. New exact-version HTTP previews
      // are mandatory before the sole remaining deployment can be authorized.
      recheckMigrationObservations({ ...check, observations: failure.observations, fingerprintPolicy: MIGRATION_FINGERPRINT_POLICY });
    }
    modules.main[role] = module; accepted.main[role] = recorded;
  }
  assert.notEqual(accepted.main.recovery.versionId, accepted.main.candidate.versionId);
  const deployed = { ...original.deployed, router: accepted.router.candidate.versionId };
  assert.deepEqual(rows[16].deployed, deployed);
  assert.deepEqual(rows[16].accepted, { ...accepted, main: { recovery: accepted.main.recovery } });
  if (request.preflightStop) {
    const stop = request.preflightStop, priorRequest = migrationPinned(stop.request), priorIdentity = migrationPinned(stop.identity), priorDirectory = dirname(stop.journal.path);
    assert(!Object.hasOwn(priorRequest, 'preflightStop'), 'Only one known pre-write adapter stop may continue');
    const { preflightStop, ...currentRequest } = request;
    assert.deepEqual({ ...priorRequest, executorRunID: request.executorRunID }, currentRequest);
    assert.equal(stop.executorCI.status, 'full_exact_ci_passed'); assert.equal(stop.executorCI.runID, priorRequest.executorRunID);
    assert.equal(stop.request.path, join(priorDirectory, 'request.json')); assert.equal(stop.identity.path, join(priorDirectory, 'identity.json'));
    assert.equal(priorIdentity.releaseKey, genshinMainFinalizationKey(priorRequest, stop.executorCI));
    assert.deepEqual({ ...priorIdentity, releaseKey: identity.releaseKey, observedAt: identity.observedAt }, identity);
    assert.equal(stop.journal.path, join(priorDirectory, `genshin-migration-${priorIdentity.releaseKey}.jsonl`));
    const priorRows = migrationJournalRows(stop.journal, priorIdentity.releaseKey);
    assert.deepEqual(priorRows.map(row => row.phase), ['main_finalization_baseline', 'stopped', 'read_only_reconciliation']);
    assert.deepEqual(priorRows[0].previousJournal, stopped.journal); assert.deepEqual(priorRows[0].baseline, identity.baseline); assert.deepEqual(priorRows[0].deployed, deployed);
    assert.deepEqual(priorRows[1].deployed, deployed); assert.deepEqual(priorRows[1].accepted, {});
    for (const row of priorRows.slice(1)) assert.equal(row.pendingOperation, undefined, 'An unknown write cannot continue');
    assert.equal(priorRows[1].automaticRetry, false); assert.equal(priorRows[1].automaticRollback, false);
    assert(priorRows[1].error.includes('undefined') && priorRows[1].error.includes(accepted.main.recovery.versionId));
    assertGenshinMigrationTopology(identity.baseline, priorRows[2].snapshot, { configured: [...GENSHIN_MIGRATION_ORDER], deployed });
    assert(!existsSync(join(priorDirectory, 'main-candidate-preview')));
    const previewPath = join(priorDirectory, 'main-recovery-preview/result.json');
    recheckMigrationHTTP({ directory: dirname(previewPath), pin: digest(readFileSync(previewPath)), origin: migrationPreviewOrigin(service, accepted.main.recovery.versionId),
      references: migrationPinned({ path: join(evidence.directory, 'main/recovery/local-http/responses/references.json'), pin: evidence.value.owners.main.recovery.referencesPin }),
      owner: 'main', role: 'recovery', expected: evidence.expected, bases: evidence.bases, preview: true });
  }
  return { request: previousRequest, identity, original, evidence, rows, directory, modules, accepted, deployed,
    deployments: { ...original.deployments, router: router.deployment } };
}

export function genshinMainFinalizationTransport({ previous, releaseKey, token, directory, previewRequest, publicRequest }) {
  const { evidence } = previous;
  const readVersion = (name, versionId) => readUnifiedVersion({ service: name, versionId, token, request: unifiedProductionRead });
  let writer;
  return {
    snapshot: () => desktopCloudSnapshot(token, unifiedProductionRead),
    revalidate: role => {
      const recorded = previous.accepted.main[role], sealed = evidence.value.owners.main[role];
      return revalidateUnifiedUploadedModule({ proof: recorded.moduleProof, service, versionId: recorded.versionId, moduleSHA256: sealed.moduleSHA256,
        context: { role, transportPin: previous.identity.releaseKey, configPin: sealed.configPin }, readVersion });
    },
    preview: async role => {
      const versionId = previous.accepted.main[role].versionId;
      const proof = await verifyMigrationHTTP({ origin: migrationPreviewOrigin(service, versionId),
        references: migrationPinned({ path: join(evidence.directory, 'main', role, 'local-http/responses/references.json'), pin: evidence.value.owners.main[role].referencesPin }),
        directory: join(directory, 'main-' + role + '-preview'), owner: 'main', role, expected: evidence.expected, bases: evidence.bases, preview: true, request: previewRequest });
      return { ...proof, versionId };
    },
    promote: async args => {
      assert.equal(args.owner, 'main'); assert.equal(args.service, service); assert.equal(args.versionId, previous.accepted.main.candidate.versionId);
      if (!writer) writer = unifiedOwnerDeploymentWriter({ owner: 'main', releaseKey, versionId: args.versionId, token, request: fetch,
        recordResponse: row => {
          writeFileSync(join(directory, `deployment-main-${row.kind}.body`), row.bytes, { flag: 'wx', mode: 0o600 });
          migrationSave(directory, `deployment-main-${row.kind}.json`, { kind: row.kind, status: row.status, headers: row.headers, sha256: digest(row.bytes), bytes: row.bytes.length });
        } });
      return writer(args);
    },
    accept: () => verifyMigrationHTTP({ origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences),
      directory: join(directory, 'public'), owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases, request: publicRequest }),
  };
}

export async function executeGenshinMainFinalization({ run, releaseKey, verify, previous, transport }) {
  return withRunLock(run, async () => {
    const identity = await verify(); assertGenshinMigrationIdentity(identity); assert.equal(identity.releaseKey, releaseKey);
    const journal = join(run, `genshin-migration-${releaseKey}.jsonl`); writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), policy: GENSHIN_MIGRATION_POLICY, releaseKey, ...row }) + '\n', { flush: true });
    const deployed = { ...previous.deployed }, accepted = {}, check = async () => {
      const current = await verify(); assertGenshinMigrationIdentity(current); assert.deepEqual({ ...current, observedAt: identity.observedAt }, identity);
      assertGenshinMigrationTopology(identity.baseline, await transport.snapshot(), { configured: [...GENSHIN_MIGRATION_ORDER], deployed });
      return current.observedAt;
    };
    record({ phase: 'main_finalization_baseline', previousJournal: previous.journal, baseline: identity.baseline, deployed });
    let pendingOperation;
    try {
      await check();
      for (const role of ['recovery', 'candidate']) {
        await transport.revalidate(role); const proof = await transport.preview(role);
        assert.equal(proof.status, 'passed'); assert.equal(proof.observationMode, 'cloud_exact_version'); assert.equal(proof.service, service);
        assert.equal(proof.versionId, previous.accepted.main[role].versionId); assert(SHA.test(proof.evidenceSHA256));
        await transport.revalidate(role); await check();
        accepted[role] = { ...previous.accepted.main[role], evidenceSHA256: proof.evidenceSHA256, acceptedAt: Date.now() };
        record({ phase: 'preview_accepted', owner: 'main', role, proof: accepted[role] });
      }
      for (const role of ['recovery', 'candidate']) {
        assert(Date.now() - accepted[role].acceptedAt < 900000, 'Main preview expired'); await transport.revalidate(role);
      }
      const observedAt = await check();
      pendingOperation = { phase: 'deployment', owner: 'main', service, versionId: accepted.candidate.versionId };
      record({ ...pendingOperation, phase: 'deployment_intent', observedAt });
      const deployment = await transport.promote({ ...pendingOperation, releaseKey });
      assert.equal(deployment.service, service); assert.equal(deployment.versionId, accepted.candidate.versionId);
      assert.equal(deployment.releaseKey, releaseKey); assert(UUID.test(deployment.deploymentId));
      deployed.main = accepted.candidate.versionId; record({ ...pendingOperation, phase: 'deployed', result: deployment }); pendingOperation = undefined;
      await check(); const proof = await transport.accept(); assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256));
      for (const role of ['recovery', 'candidate']) await transport.revalidate(role);
      await check();
      const versions = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => [identity.owners[owner].service, deployed[owner]]));
      record({ phase: 'production_accepted', proof: { ...proof, versions } });
      return { policy: GENSHIN_MIGRATION_POLICY, status: 'production_accepted', versions, accepted, deployment, journalPin: digest(readFileSync(journal)), sourceAdvanced: false };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, deployed, accepted, error: error.message, automaticRetry: false, automaticRollback: false });
      try { record({ phase: 'read_only_reconciliation', snapshot: await transport.snapshot(), pendingOperation }); }
      catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

export async function readFinalizedGenshinMigration(proof) {
  const value = migrationPinned(proof), directory = dirname(proof.path), previous = await readStoppedMainMigration(value.request), evidence = previous.evidence;
  assert.equal(proof.path, join(directory, 'completion.json')); assert.equal(value.kind, 'genshin_initial_production_migration_completion'); assert.equal(value.schemaVersion, 1);
  assert.equal(value.status, 'production_accepted'); assert.equal(value.policy, GENSHIN_MIGRATION_POLICY); assert.equal(value.sourceAdvanced, false);
  assert.deepEqual(value.bundle, previous.original.request.bundle); assert.deepEqual(value.executorCI, previous.identity.sourceCI);
  assert.deepEqual(value.continuationExecutorCI, value.request.continuationCI);
  assert.equal(value.finalizationExecutorCI.status, 'full_exact_ci_passed'); assert.equal(value.finalizationExecutorCI.runID, value.request.executorRunID);
  assert(/^[a-f0-9]{40}$/.test(value.finalizationExecutorCI.commit));
  assert.equal(value.releaseKey, genshinMainFinalizationKey(value.request, value.finalizationExecutorCI));
  assert.equal(value.journal.path, join(directory, `genshin-migration-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin);
  const rows = migrationJournalRows(value.journal, value.releaseKey);
  assert.deepEqual(rows.map(row => row.phase), ['main_finalization_baseline', 'preview_accepted', 'preview_accepted', 'deployment_intent', 'deployed', 'production_accepted']);
  assert.deepEqual(rows[0].previousJournal, value.request.stopped.journal); assert.deepEqual(rows[0].baseline, previous.identity.baseline); assert.deepEqual(rows[0].deployed, previous.deployed);
  assert(Date.parse(rows[0].at) >= Date.parse(previous.rows.at(-1).at));
  const accepted = { ...previous.accepted, main: value.accepted }, modules = previous.modules;
  for (const [i, role] of ['recovery', 'candidate'].entries()) {
    assert.equal(rows[i + 1].owner, 'main'); assert.equal(rows[i + 1].role, role); assert.deepEqual(rows[i + 1].proof, value.accepted[role]);
    const recorded = value.accepted[role];
    const { evidenceSHA256, acceptedAt, ...moduleIdentity } = recorded;
    const { evidenceSHA256: oldEvidence, acceptedAt: oldAcceptedAt, ...oldModuleIdentity } = previous.accepted.main[role];
    assert.deepEqual(moduleIdentity, oldModuleIdentity);
    assert(recorded.acceptedAt <= Date.parse(rows[3].at) && Date.parse(rows[3].at) - recorded.acceptedAt < 900000);
    recheckMigrationHTTP({ directory: join(directory, 'main-' + role + '-preview'), pin: recorded.evidenceSHA256, origin: migrationPreviewOrigin(service, recorded.versionId),
      references: migrationPinned({ path: join(evidence.directory, 'main', role, 'local-http/responses/references.json'), pin: evidence.value.owners.main[role].referencesPin }),
      owner: 'main', role, expected: evidence.expected, bases: evidence.bases, preview: true });
  }
  const deployment = value.deployment;
  for (const row of rows.slice(3, 5)) { assert.equal(row.owner, 'main'); assert.equal(row.service, service); assert.equal(row.versionId, accepted.main.candidate.versionId); }
  assert.deepEqual(rows[4].result, deployment); assert.equal(deployment.service, service); assert.equal(deployment.versionId, accepted.main.candidate.versionId);
  assert.equal(deployment.releaseKey, value.releaseKey); assert(UUID.test(deployment.deploymentId));
  assert(rows[3].observedAt <= Date.parse(rows[3].at) && Date.parse(rows[3].at) - rows[3].observedAt < 900000);
  for (const kind of ['creation', 'verification']) {
    const raw = readFileSync(join(directory, `deployment-main-${kind}.body`)), metadata = migrationPinned({ path: join(directory, `deployment-main-${kind}.json`), pin: digest(readFileSync(join(directory, `deployment-main-${kind}.json`))) });
    assert.equal(metadata.kind, kind); assert.equal(metadata.sha256, digest(raw)); assert.equal(metadata.bytes, raw.length); assert(metadata.status >= 200 && metadata.status < 300);
    const body = JSON.parse(raw); assert.equal(body.success, true); assert.equal(body.result.id, deployment.deploymentId);
    if (kind === 'verification' || body.result.strategy) assert.equal(body.result.strategy, 'percentage');
    if (kind === 'verification' || body.result.versions) assert.deepEqual(body.result.versions, [{ version_id: deployment.versionId, percentage: 100 }]);
  }
  const versions = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => [evidence.value.owners[owner].service, accepted[owner].candidate.versionId]));
  assert.deepEqual(value.versions, versions); assert.deepEqual(rows[5].proof.versions, versions); assert.equal(rows[5].proof.status, 'passed');
  recheckMigrationHTTP({ directory: join(directory, 'public'), pin: rows[5].proof.evidenceSHA256, origin: 'https://gachia.com',
    references: migrationPinned(evidence.value.finalReferences), owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases });
  return { value, directory, evidence, rows, accepted, modules, deployments: { ...previous.deployments, main: deployment }, versions, currentCloudRead: false };
}

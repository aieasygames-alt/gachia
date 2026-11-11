import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { assertModuleVersionIdentity, scriptETag } from './desktop-version-provenance.mjs';
import { GENSHIN_MIGRATION_ORDER, GENSHIN_MIGRATION_POLICY, assertGenshinMigrationTopology } from './genshin-production-migration.mjs';
import { verifyGenshinMigrationBundle } from './genshin-migration-prepare.mjs';
import { migrationJSON, migrationPinned, migrationPreviewOrigin, migrationSave, recheckMigrationHTTP, verifyMigrationHTTP } from './genshin-migration-http.mjs';
import { unifiedProductionRead } from './unified-production-transport.mjs';
import { migrationRouterModule } from './genshin-migration-router.mjs';
import { readUnifiedUploadedModule } from './unified-version-identity.mjs';
import { readUnifiedSourceOwner } from './unified-source-advance.mjs';

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const treePin = directory => digest(migrationJSON(artifactFiles(directory)));

export async function readCompletedGenshinMigration(proof) {
  const value = migrationPinned(proof), directory = dirname(proof.path);
  assert.equal(proof.path, join(directory, 'completion.json')); assert.equal(value.kind, 'genshin_initial_production_migration_completion');
  assert.equal(value.schemaVersion, 1); assert.equal(value.status, 'production_accepted'); assert.equal(value.policy, GENSHIN_MIGRATION_POLICY); assert.equal(value.sourceAdvanced, false);
  assert.deepEqual(value.bundle, value.request.bundle);
  const evidence = await verifyGenshinMigrationBundle(value.bundle);
  assert.equal(value.executorCI.status, 'full_exact_ci_passed'); assert.equal(value.executorCI.commit, evidence.value.sourceCommit);
  assert.equal(value.executorCI.runID, value.request.executorRunID);
  assert.equal(value.releaseKey, digest(migrationJSON({ policy: GENSHIN_MIGRATION_POLICY, bundle: value.bundle, sourceCI: value.executorCI,
    ...(value.request.previewProxy ? { previewProxy: value.request.previewProxy } : {}) })));
  assert.equal(value.journal.path, join(directory, `genshin-migration-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin);
  const raw = readFileSync(value.journal.path); assert.equal(digest(raw), value.journal.pin); assert(raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(JSON.parse);
  const phases = ['baseline', ...GENSHIN_MIGRATION_ORDER.flatMap(() => ['upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted']), 'production_accepted'];
  assert.deepEqual(rows.map(row => row.phase), phases, 'Stopped, incomplete or reordered migrations cannot advance sources');
  assert.deepEqual(rows[0].baseline, evidence.value.baseline); assert.deepEqual(rows[0].owners, evidence.value.owners);
  let previousAt = -Infinity;
  for (const row of rows) {
    assert.equal(row.policy, GENSHIN_MIGRATION_POLICY); assert.equal(row.releaseKey, value.releaseKey);
    const at = Date.parse(row.at); assert(Number.isFinite(at) && at >= previousAt && at <= Date.now()); previousAt = at;
  }
  const modules = {}, accepted = {}, deployments = {};
  for (const [i, owner] of GENSHIN_MIGRATION_ORDER.entries()) {
    const sealedOwner = evidence.value.owners[owner], offset = 1 + i * 9;
    modules[owner] = {}; accepted[owner] = {};
    for (const [j, role] of ['recovery', 'candidate'].entries()) {
      const intent = rows[offset + j * 3], returned = rows[offset + j * 3 + 1], acceptance = rows[offset + j * 3 + 2], sealed = sealedOwner[role];
      for (const row of [intent, returned, acceptance]) { assert.equal(row.owner, owner); assert.equal(row.role, role); }
      assert.equal(intent.service, sealedOwner.service); assert.deepEqual(intent.sealed, sealed);
      const recorded = acceptance.proof; accepted[owner][role] = recorded;
      assert(UUID.test(returned.versionId)); assert.equal(recorded.versionId, returned.versionId); assert.notEqual(recorded.versionId, sealedOwner.sourceVersionId);
      assert.equal(recorded.moduleSHA256, sealed.moduleSHA256);
      const output = join(directory, owner + '-' + role), version = migrationPinned({ path: join(output, 'version.json'), pin: recorded.versionPin });
      assert.equal(version.id, recorded.versionId);
      const context = { role, transportPin: value.releaseKey, configPin: sealed.configPin };
      if (owner !== 'router') modules[owner][role] = await readUnifiedUploadedModule(recorded.moduleProof, { service: sealedOwner.service,
        versionId: recorded.versionId, moduleSHA256: sealed.moduleSHA256, context });
      else {
        const module = migrationPinned(recorded.moduleProof); assert.equal(module.kind, 'genshin_migration_router_upload_module');
        assert.equal(module.service, sealedOwner.service); assert.equal(module.versionId, recorded.versionId); assert.deepEqual(module.context, context);
        assert.equal(module.moduleSHA256, sealed.moduleSHA256); assertModuleVersionIdentity(module.before, module.after); assertModuleVersionIdentity(module.before, version);
        assert.equal(scriptETag(module.etag), version.resources.script.etag);
        const archive = readFileSync(join(output, 'module/download.multipart')); assert.equal(digest(archive), module.archivePin);
        const parsed = await migrationRouterModule(archive); assert.equal(parsed.moduleSHA256, sealed.moduleSHA256);
        modules[owner][role] = { version, code: parsed.code, receipt: module };
      }
      assertModuleVersionIdentity(version, modules[owner][role].version);
      const references = migrationPinned({ path: join(evidence.directory, owner, role, 'local-http/responses/references.json'), pin: sealed.referencesPin });
      recheckMigrationHTTP({ directory: join(output, 'preview'), pin: recorded.evidenceSHA256, origin: migrationPreviewOrigin(sealedOwner.service, recorded.versionId),
        references, owner, role, expected: evidence.expected, bases: evidence.bases, preview: true });
    }
    assert.notEqual(accepted[owner].candidate.versionId, accepted[owner].recovery.versionId);
    const intent = rows[offset + 6], deployed = rows[offset + 7], step = rows[offset + 8];
    for (const row of [intent, deployed, step]) assert.equal(row.owner, owner);
    assert.equal(intent.service, sealedOwner.service); assert.equal(intent.versionId, accepted[owner].candidate.versionId);
    assert.equal(deployed.versionId, intent.versionId); assert.equal(deployed.result.service, sealedOwner.service);
    assert.equal(deployed.result.versionId, intent.versionId); assert.equal(deployed.result.releaseKey, value.releaseKey); assert(UUID.test(deployed.result.deploymentId));
    assert(intent.observedAt <= Date.parse(intent.at) && Date.parse(intent.at) - intent.observedAt < 900000);
    for (const role of ['candidate', 'recovery']) assert(accepted[owner][role].acceptedAt <= Date.parse(intent.at) && Date.parse(intent.at) - accepted[owner][role].acceptedAt < 900000);
    deployments[owner] = deployed.result;
    for (const kind of ['creation', 'verification']) {
      const raw = readFileSync(join(directory, `deployment-${owner}-${kind}.body`));
      const metadata = JSON.parse(readFileSync(join(directory, `deployment-${owner}-${kind}.json`)));
      assert.equal(metadata.kind, kind); assert.equal(metadata.sha256, digest(raw)); assert.equal(metadata.bytes, raw.length); assert(metadata.status >= 200 && metadata.status < 300);
      const body = JSON.parse(raw); assert.equal(body.success, true); assert.equal(body.result.id, deployed.result.deploymentId);
      if (kind === 'verification' || body.result.strategy) assert.equal(body.result.strategy, 'percentage');
      if (kind === 'verification' || body.result.versions) assert.deepEqual(body.result.versions, [{ version_id: intent.versionId, percentage: 100 }]);
    }
  }
  const versions = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => [evidence.value.owners[owner].service, accepted[owner].candidate.versionId]));
  assert.deepEqual(value.versions, versions); assert.deepEqual(rows.at(-1).proof.versions, versions); assert.equal(rows.at(-1).proof.status, 'passed');
  recheckMigrationHTTP({ directory: join(directory, 'public-3-router'), pin: rows.at(-1).proof.evidenceSHA256, origin: 'https://gachia.com',
    references: migrationPinned(evidence.value.finalReferences), owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases });
  return { value, directory, evidence, rows, accepted, modules, deployments, versions, currentCloudRead: false };
}

// Read-only source continuation, after reopening all six immutable upload
// proofs, previews, exact deployments and public evidence. Other owners and
// all 115 already-published source inputs remain unchanged.
export async function advanceGenshinMigrationSources({ completion, directory, reader }) {
  const completed = await readCompletedGenshinMigration(completion), { evidence } = completed;
  directory = resolve(directory); assert(!existsSync(directory)); mkdirSync(directory, { mode: 0o700 });
  try {
    const before = await reader.snapshot();
    const deployed = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => [owner, completed.accepted[owner].candidate.versionId]));
    assertGenshinMigrationTopology(evidence.value.baseline, before, { configured: [...GENSHIN_MIGRATION_ORDER], deployed });
    for (const owner of GENSHIN_MIGRATION_ORDER) assert.equal(before.services[evidence.value.owners[owner].service].id, completed.deployments[owner].deploymentId);
    const owners = structuredClone(evidence.index.owners);
    for (const owner of ['genshin', 'main']) {
      const module = completed.modules[owner].candidate, accepted = completed.accepted[owner].candidate;
      const target = join(directory, owner), original = join(evidence.directory, owner, 'candidate/artifact');
      cpSync(original, target, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
      writeFileSync(join(target, 'worker.js'), module.code, { mode: 0o600 });
      const expectedTree = artifactFiles(original).map(row => row.path === 'worker.js' ? { path: row.path, type: 'file', sha256: accepted.moduleSHA256 } : row);
      assert.deepEqual(artifactFiles(target), expectedTree);
      owners[owner] = { owner, service: evidence.value.owners[owner].service, versionId: accepted.versionId, directory: target, artifactSHA256: treePin(target),
        modulePath: module.receipt.archive.path, archiveSHA256: module.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256, version: module.version,
        mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context };
    }
    const versions = {};
    for (const [owner, row] of Object.entries(owners)) {
      await readUnifiedSourceOwner(row); const version = await reader.version(row.service, row.versionId); assertModuleVersionIdentity(row.version, version);
      versions[owner] = migrationSave(directory, owner + '-version.json', version);
    }
    const router = { service: 'gachia-router', versionId: completed.accepted.router.candidate.versionId,
      moduleProof: completed.accepted.router.candidate.moduleProof, version: completed.modules.router.candidate.version, deploymentId: completed.deployments.router.deploymentId };
    assertModuleVersionIdentity(router.version, await reader.version(router.service, router.versionId));
    const publicAcceptance = await verifyMigrationHTTP({ origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences),
      directory: join(directory, 'public'), owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases, request: unifiedProductionRead });
    const after = await reader.snapshot(); assertGenshinMigrationTopology(before, after);
    const value = { schemaVersion: 1, kind: 'genshin_independent_published_source_index', status: 'published_sources_observed', completion, originalSourceIndex: evidence.value.sourceIndex,
      sourceCommit: evidence.value.sourceCommit, executorCI: completed.value.executorCI, releaseKey: completed.value.releaseKey, owners, router,
      active: migrationSave(directory, 'active.json', evidence.sources), baseline: migrationSave(directory, 'baseline.json', after),
      observation: { before: migrationSave(directory, 'before.json', before), after: migrationSave(directory, 'after.json', after), versions, publicAcceptance, observedAt: Date.now() },
      cloudWrites: false, newPublicationAuthorized: false };
    return { proof: migrationSave(directory, 'source-index.json', value), value };
  } catch (error) { migrationSave(directory, 'failure.json', { error: error.message, cloudWrites: false }); throw error; }
}

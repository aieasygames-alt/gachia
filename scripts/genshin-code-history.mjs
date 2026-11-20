import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { migrationPinned } from './genshin-migration-http.mjs';
import { recheckNteHTTP, recheckNteReferences } from './nte-release-http.mjs';
import { readUnifiedSourceOwner } from './unified-source-advance.mjs';
import { readUnifiedUploadedModule } from './unified-version-identity.mjs';

export const GENSHIN_CODE_POLICY = 'genshin-preserved-content-code-production-v1';
export function assertGenshinCodeTransition(value, previous, completed) {
  assert.equal(value.kind, 'nte_genshin_preserved_code_source_index_v1');
  assert.equal(value.status, 'published_sources_observed');
  assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false);
  assert.equal(completed.policy, GENSHIN_CODE_POLICY); assert.equal(completed.status, 'production_accepted');
  assert.deepEqual(completed.parent, value.previousSourceIndex);
  assert.deepEqual(value.active, previous.value.active); assert.deepEqual(completed.active, value.active);
  assert.deepEqual(value.router, previous.router);
  assert.equal(value.sourceCommit, completed.commit); assert.deepEqual(value.executorCI, completed.executorCI);
  assert.equal(completed.executorCI.commit, completed.commit); assert.equal(completed.executorCI.status, 'full_exact_ci_passed');
  assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(previous.owners).sort());
  assertTopology(previous.baseline, completed.before);
  assert.deepEqual(completed.promoted, { 'gachia-game-genshin': completed.accepted.candidate.versionId });
  assertTopology(completed.before, completed.after, completed.promoted); assert.deepEqual(value.baseline, completed.after);
  for (const owner of Object.keys(previous.owners)) if (owner !== 'genshin') assert.deepEqual(value.owners[owner], previous.owners[owner]);
  assert.equal(completed.accepted.recovery.moduleSHA256, previous.owners.genshin.moduleSHA256);
  assert.equal(value.owners.genshin.versionId, completed.accepted.candidate.versionId);
  assert.equal(value.baseline.services['gachia-game-genshin'].id, completed.deployment.deploymentId);
}
export async function readGenshinCodeSource(proof, readPrevious, depth) {
  const value = migrationPinned(proof), completed = migrationPinned(value.completion);
  const previous = await readPrevious(value.previousSourceIndex, depth + 1);
  assertGenshinCodeTransition(value, previous, completed);
  assert.deepEqual(migrationPinned(value.active), previous.sources);
  const prepared = migrationPinned(completed.prepared), sealed = migrationPinned(completed.sealed);
  assert.equal(prepared.commit, completed.commit); assert.equal(sealed.commit, completed.commit);
  assert.deepEqual(prepared.contentChanges, []); assert.deepEqual(prepared.parent, value.previousSourceIndex);
  assert.equal(digest(readFileSync(completed.journal.path)), completed.journal.pin);
  const journal = readFileSync(completed.journal.path, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(journal.map(row => row.phase), ['deployment_intent', 'deployed', 'production_accepted']);
  assert.equal(journal[0].versionId, completed.accepted.candidate.versionId);
  assert.deepEqual(journal[1].deployment, completed.deployment);
  const owner = value.owners.genshin;
  assert.equal(activeVersion(value.baseline, owner.service), owner.versionId);
  assert.deepEqual(owner.moduleProof, completed.accepted.candidate.moduleProof);
  assert.equal(owner.moduleSHA256, completed.accepted.candidate.moduleSHA256);
  await readUnifiedSourceOwner(owner);
  assert.deepEqual(artifactFiles(owner.directory), artifactFiles(sealed.roles.candidate.artifact)
    .map(row => row.path === 'worker.js' ? { path: row.path, type: 'file', sha256: owner.moduleSHA256 } : row));
  for (const role of ['candidate', 'recovery']) {
    const accepted = completed.accepted[role], receipt = migrationPinned(accepted.moduleProof);
    await readUnifiedUploadedModule(accepted.moduleProof, { service: owner.service, versionId: accepted.versionId,
      moduleSHA256: accepted.moduleSHA256, context: receipt.context });
    assert.equal(accepted.moduleSHA256, sealed.roles[role].moduleSHA256);
    recheckNteHTTP({ proof: accepted.preview, origin: accepted.origin, references: recheckNteReferences(sealed.roles[role].local), preview: true });
  }
  recheckNteHTTP({ proof: completed.publicProof, origin: 'https://gachia.com', references: recheckNteReferences(sealed.finalReferences) });
  for (const source of previous.sources) assert.equal(digest(readFileSync(join(prepared.workspace, source.sourcePath))), source.sha256);
  return { ...previous, value, owners: value.owners, baseline: value.baseline, workspace: prepared.workspace,
    allOwnersCurrent: true, ancestors: [...previous.ancestors, value.executorCI] };
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { migrationPinned } from './genshin-migration-http.mjs';
import { recheckNteHTTP, recheckNteReferences } from './nte-release-http.mjs';
import { readUnifiedSourceOwner } from './unified-source-advance.mjs';
import { readUnifiedUploadedModule } from './unified-version-identity.mjs';
import { unifiedService } from './unified-release-assets.mjs';

export const PUBLIC_RUNTIME_POLICY = 'public-next-15.5.29-preserved-content-v1';
export const PUBLIC_RUNTIME_OWNERS = Object.freeze(['genshin', 'nte', 'azur-promilia', 'lvmeng', 'main']);

export function assertPublicRuntimeTransition(value, previous, completed) {
  assert.equal(value.kind, 'nte_public_runtime_source_index_v1');
  assert.equal(value.status, 'published_sources_observed');
  assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false);
  assert.equal(completed.policy, PUBLIC_RUNTIME_POLICY); assert.equal(completed.status, 'production_accepted');
  assert.equal(completed.nextVersion, '15.5.29');
  assert.deepEqual(completed.parent, value.previousSourceIndex);
  assert.deepEqual(value.active, previous.value.active); assert.deepEqual(completed.active, value.active);
  assert.deepEqual(value.router, previous.router, 'Runtime update cannot replace Router');
  assert.equal(value.sourceCommit, completed.commit); assert.deepEqual(value.executorCI, completed.executorCI);
  assert.equal(completed.executorCI.commit, completed.commit); assert.equal(completed.executorCI.status, 'full_exact_ci_passed');
  assert.deepEqual(Object.keys(value.owners).sort(), [...PUBLIC_RUNTIME_OWNERS].sort());
  assert.deepEqual(Object.keys(completed.accepted).sort(), [...PUBLIC_RUNTIME_OWNERS].sort());
  const promoted = Object.fromEntries(PUBLIC_RUNTIME_OWNERS.map(owner => [unifiedService(owner), completed.accepted[owner].candidate.versionId]));
  assert.deepEqual(completed.promoted, promoted);
  assertTopology(previous.baseline, completed.before); assertTopology(completed.before, completed.after, promoted);
  assert.deepEqual(value.baseline, completed.after);
  for (const owner of PUBLIC_RUNTIME_OWNERS) {
    const service = unifiedService(owner), row = value.owners[owner];
    assert.equal(row.service, service); assert.equal(row.versionId, promoted[service]);
    assert.equal(completed.accepted[owner].recovery.moduleSHA256, previous.owners[owner].moduleSHA256);
    assert.equal(completed.after.services[service].id, completed.deployments[owner].deploymentId);
  }
}

export async function readPublicRuntimeSource(proof, readPrevious, depth) {
  const value = migrationPinned(proof), completed = migrationPinned(value.completion);
  const previous = await readPrevious(value.previousSourceIndex, depth + 1);
  assertPublicRuntimeTransition(value, previous, completed);
  assert.deepEqual(migrationPinned(value.active), previous.sources);
  const prepared = migrationPinned(completed.prepared), sealed = migrationPinned(completed.sealed);
  assert.equal(prepared.commit, value.sourceCommit); assert.equal(sealed.commit, value.sourceCommit);
  assert.deepEqual(prepared.parent, value.previousSourceIndex); assert.deepEqual(prepared.contentChanges, []);
  assert.equal(digest(readFileSync(completed.journal.path)), completed.journal.pin);
  const journal = readFileSync(completed.journal.path, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(journal.map(row => row.phase), PUBLIC_RUNTIME_OWNERS.flatMap(() => ['deployment_intent', 'deployed', 'production_accepted']));
  for (const [index, owner] of PUBLIC_RUNTIME_OWNERS.entries()) {
    const row = value.owners[owner], candidate = completed.accepted[owner].candidate;
    assert.equal(activeVersion(value.baseline, row.service), row.versionId);
    assert.deepEqual(journal[index * 3 + 1].deployment, completed.deployments[owner]);
    assert.equal(journal[index * 3].versionId, row.versionId);
    assert.deepEqual(row.moduleProof, candidate.moduleProof); assert.equal(row.moduleSHA256, candidate.moduleSHA256);
    await readUnifiedSourceOwner(row);
    assert.deepEqual(artifactFiles(row.directory), artifactFiles(sealed.owners[owner].candidate.artifact)
      .map(file => file.path === 'worker.js' ? { path: file.path, type: 'file', sha256: row.moduleSHA256 } : file));
    for (const role of ['candidate', 'recovery']) {
      const accepted = completed.accepted[owner][role], module = migrationPinned(accepted.moduleProof);
      await readUnifiedUploadedModule(accepted.moduleProof, { service: row.service, versionId: accepted.versionId,
        moduleSHA256: accepted.moduleSHA256, context: module.context });
      assert.equal(accepted.moduleSHA256, sealed.owners[owner][role].moduleSHA256);
      recheckNteHTTP({ proof: accepted.preview, origin: accepted.origin,
        references: recheckNteReferences(sealed.owners[owner][role].local), preview: true });
    }
    recheckNteHTTP({ proof: completed.publicProofs[owner], origin: 'https://gachia.com',
      references: recheckNteReferences(sealed.publicReferences[owner]) });
  }
  recheckNteHTTP({ proof: completed.aggregate, origin: 'https://gachia.com', references: recheckNteReferences(sealed.graph) });
  for (const source of previous.sources) assert.equal(digest(readFileSync(join(prepared.workspace, source.sourcePath))), source.sha256);
  return { ...previous, value, owners: value.owners, baseline: value.baseline, workspace: prepared.workspace,
    allOwnersCurrent: true, ancestors: [...previous.ancestors, value.executorCI] };
}

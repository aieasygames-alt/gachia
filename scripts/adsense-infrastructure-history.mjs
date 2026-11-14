import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { activeVersion, assertTopology } from './desktop-cloud-release.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { readUnifiedSourceOwner } from './unified-source-advance.mjs';
import { readUnifiedUploadedModule } from './unified-version-identity.mjs';
import { unifiedPageFingerprints } from './unified-version-preview.mjs';

const OWNERS = ['genshin', 'nte', 'azur-promilia', 'lvmeng', 'main'];
const pinned = proof => { const bytes = readFileSync(proof.path); assert.equal(digest(bytes), proof.pin, 'Infrastructure evidence changed'); return JSON.parse(bytes); };
export function assertAdsenseSourceTransition(value, previous, completed) {
  assert.equal(value.kind, 'nte_adsense_infrastructure_source_index');
  assert.equal(value.status, 'published_sources_observed');
  assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false);
  assert.equal(completed.status, 'production_accepted'); assert.equal(completed.policy, 'adsense-five-owner-infrastructure-v1');
  assert.equal(value.sourceCommit, completed.commit); assert.deepEqual(value.previousSourceIndex, completed.parent);
  assert.deepEqual(value.active, previous.value.active); assert.deepEqual(completed.active, value.active);
  assert.deepEqual(value.router, previous.router, 'Advertising cannot replace Router');
  assert.deepEqual(Object.keys(value.owners).sort(), [...OWNERS].sort());
  assert.deepEqual(Object.keys(completed.promoted).sort(), OWNERS.map(o => o === 'main' ? 'gachia' : 'gachia-game-' + o).sort());
  assertTopology(previous.baseline, completed.baseline); assertTopology(completed.baseline, value.baseline, completed.promoted);
  assert.deepEqual(value.baseline, completed.after);
  assert.equal(completed.ci.headSha, value.sourceCommit); assert.equal(completed.ci.status, 'completed'); assert.equal(completed.ci.conclusion, 'success');
  assert(Number.isSafeInteger(completed.ci.runID) && completed.ci.runID > 0); assert(completed.ci.jobs.length > 0 && completed.ci.jobs.every(j => j.conclusion === 'success'));
}
function recheckReferences(proof) {
  const rows = pinned(proof);
  for (const [index, row] of rows.entries()) {
    assert.equal(row.bodyFile, index + '.body'); assert.equal(row.status, 200);
    const bytes = readFileSync(join(dirname(proof.path), row.bodyFile));
    if (row.html) assert.deepEqual(unifiedPageFingerprints([{ html: bytes.toString(), status: row.status }], 'streaming-v2')[0], row.html);
    else assert.equal(digest(bytes), row.sha256);
  }
  return rows;
}
export async function readAdsenseInfrastructureSource(proof, readPrevious, depth) {
  const value = pinned(proof), completed = pinned(value.completion), previous = await readPrevious(value.previousSourceIndex, depth + 1);
  assertAdsenseSourceTransition(value, previous, completed);
  const run = dirname(value.completion.path), sealed = pinned(completed.sealed), prepared = pinned(completed.prepared);
  assert.equal(prepared.commit, value.sourceCommit); assert.equal(sealed.commit, value.sourceCommit); assert.deepEqual(prepared.contentChanges, []);
  assert.deepEqual(pinned(value.active), previous.sources);
  assert.equal(digest(readFileSync(completed.journal.path)), completed.journal.pin);
  const journal = readFileSync(completed.journal.path, 'utf8').trim().split('\n').map(s => JSON.parse(s));
  assert.deepEqual(journal.map(r => r.phase), OWNERS.flatMap(() => ['deploy_intent', 'deployed']));
  for (const [index, owner] of OWNERS.entries()) {
    const row = value.owners[owner], candidate = completed.owners[owner].candidate, recovery = completed.owners[owner].recovery;
    assert.equal(activeVersion(value.baseline, row.service), row.versionId); assert.equal(row.versionId, candidate.versionId);
    assert.equal(journal[2 * index + 1].versionId, row.versionId); assert.equal(journal[2 * index + 1].deploymentId, value.baseline.services[row.service].id);
    assert.equal(row.moduleSHA256, candidate.moduleSHA256); assert.deepEqual(row.moduleProof, candidate.moduleProof);
    await readUnifiedSourceOwner(row);
    assert.deepEqual(artifactFiles(row.directory), artifactFiles(sealed.owners[owner].candidate.artifact).map(r => r.path === 'worker.js' ? {path:r.path,type:'file',sha256:row.moduleSHA256} : r));
    assert.equal(recovery.moduleSHA256, previous.owners[owner].moduleSHA256);
    for (const role of ['candidate', 'recovery']) {
      const accepted = completed.owners[owner][role], module = pinned(accepted.moduleProof);
      await readUnifiedUploadedModule(accepted.moduleProof, {service:row.service,versionId:accepted.versionId,moduleSHA256:accepted.moduleSHA256,context:module.context});
      const actual = recheckReferences(accepted.preview), local = recheckReferences(sealed.owners[owner][role].local);
      assert.deepEqual(actual.map(r=>r.path),local.map(r=>r.path));
      for(let i=0;i<actual.length;i++) if(actual[i].path !== '/robots.txt') assert.deepEqual(actual[i].html ?? actual[i].sha256,local[i].html ?? local[i].sha256);
    }
    recheckReferences(completed.publicReferences[owner]);
  }
  for(const source of previous.sources) assert.equal(digest(readFileSync(join(prepared.workspace, source.sourcePath))),source.sha256);
  const ci = {commit:value.sourceCommit,runID:completed.ci.runID,runAttempt:completed.ci.runAttempt,status:'full_exact_ci_passed'};
  return {...previous,value,owners:value.owners,baseline:value.baseline,workspace:prepared.workspace,ancestors:[...previous.ancestors,ci]};
}

import assert from 'node:assert/strict';
import { isAbsolute } from 'node:path';
import { activeVersion } from './desktop-cloud-release.mjs';
import { readUnifiedCompletedGenshinMainPromotion } from './unified-genshin-main-evidence.mjs';
import { UNIFIED_SOURCE_OWNERS } from './unified-historical-sources.mjs';
import { unifiedService } from './unified-release-assets.mjs';
import { publishedUnifiedSources, readUnifiedSourceOwner } from './unified-source-advance.mjs';

const owners = ['genshin', 'main'];

// Read-only projection, not a production entry. The future fixed CMS root must
// derive artifacts/sources from its verified frozen transport and ancestor.
// No caller-declared completion, module or deployment success is consumed here.
export async function readUnifiedGenshinMainSourceSpec(input) {
  const { references, ...evidence } = input.completed;
  const completedInput = { ...structuredClone(evidence), references };
  const { completed: _completed, ...sealed } = input;
  const { priorOwners, candidateArtifacts, sealedSources, pairs, planSHA256 } = structuredClone(sealed);
  assert.deepEqual(Object.keys(priorOwners).sort(), UNIFIED_SOURCE_OWNERS);
  assert.deepEqual(Object.keys(candidateArtifacts).sort(), [...owners].sort());
  assert(/^[a-f0-9]{64}$/.test(planSHA256));
  const completed = await readUnifiedCompletedGenshinMainPromotion(completedInput), value = completedInput.value;
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = priorOwners[owner];
    assert.equal(row.owner, owner); assert.equal(row.service, unifiedService(owner));
    assert.equal(row.versionId, activeVersion(value.baseline, row.service), 'Every prior owner must belong to the completed baseline');
    await readUnifiedSourceOwner(row);
  }
  const rows = structuredClone(priorOwners);
  for (const owner of owners) {
    const artifact = candidateArtifacts[owner], module = completed.modules[owner].candidate, accepted = completed.previews.receipt.accepted.candidate[owner];
    assert.deepEqual(Object.keys(artifact).sort(), ['artifactSHA256', 'directory']);
    assert(isAbsolute(artifact.directory) && /^[a-f0-9]{64}$/.test(artifact.artifactSHA256));
    assert.equal(artifact.artifactSHA256, accepted.artifactPin, 'Source artifact must be the exact accepted candidate');
    rows[owner] = { owner, service: unifiedService(owner), versionId: accepted.versionId, ...artifact,
      modulePath: module.receipt.archive.path, archiveSHA256: module.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256,
      version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context };
    await readUnifiedSourceOwner(rows[owner]);
  }
  const spec = { kind: 'unified_completed_genshin_main_source_spec', publication: completedInput.proof,
    releaseKey: value.releaseKey, transportPin: value.transportPin, planSHA256, baseline: value.baseline, ownerOrder: [...owners],
    deploymentIds: Object.fromEntries(owners.map(owner => [owner, completed.deployments[owner].deploymentId])), owners: rows,
    sources: publishedUnifiedSources(sealedSources, pairs, rows.main.directory), pairs, publicReferences: completedInput.publicReferences };
  return { completed, spec, currentCMSRead: false, currentCloudRead: false, freshnessRenewed: false, productionReady: false };
}

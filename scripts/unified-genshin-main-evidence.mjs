import assert from 'node:assert/strict';
import { join } from 'node:path';
import { assertTopology } from './desktop-cloud-release.mjs';
import { assertUploadedVersion } from './desktop-cloud-transport.mjs';
import { digest } from './desktop-release-assets.mjs';
import { assertModuleVersionIdentity } from './desktop-version-provenance.mjs';
import { readUnifiedHistoricalBytes } from './unified-historical-sources.mjs';
import { recheckUnifiedGenshinPublic } from './unified-genshin-public.mjs';
import { recheckUnifiedMainPublic } from './unified-main-public.mjs';
import { assertUnifiedPreviewIdentity } from './unified-preview-protocol.mjs';
import { assertUnifiedPromotionDirectories, readUnifiedCloudPreviews, unifiedPinnedJSON } from './unified-promotion-protocol.mjs';
import { readUnifiedUploadedModule } from './unified-version-identity.mjs';
import { recheckUnifiedPreview, unifiedHTMLParserPin } from './unified-version-preview.mjs';

const OWNERS = ['genshin', 'main'], ROLES = ['recovery', 'candidate'];
const time = at => { assert(Number.isSafeInteger(at) && at <= Date.now(), 'Invalid historical pair time'); return at; };
const fixed = value => { assertUnifiedPreviewIdentity(value, value.transportPin); assert.deepEqual(value.ownerOrder, OWNERS, 'Only the fixed Genshin/Main pair is supported'); };
const versions = (value, accepted, role) => Object.fromEntries(OWNERS.map(owner => [value.owners[owner].service, accepted[role][owner].versionId]));

// No current CMS/cloud reads, freshness renewal or production qualification.
// Fixed callers must derive references/configuration from verified sealed input.
export async function readUnifiedGenshinMainPreviews({ run, directory, pin, value, references, runtimeConfigs }) {
  fixed(value); assert.deepEqual(Object.keys(runtimeConfigs).sort(), [...OWNERS].sort());
  const raw = unifiedPinnedJSON(join(directory, 'receipt.json'), pin);
  assert.equal(raw.kind, 'unified_candidate_recovery_cloud_previews', 'Main-only preview continuations cannot qualify a pair');
  const previews = readUnifiedCloudPreviews({ run, directory, pin, value, references }), modules = {};
  for (const owner of OWNERS) {
    modules[owner] = {};
    for (const role of ROLES) {
      const proof = previews.receipt.accepted[role][owner], row = value.owners[owner][role], service = value.owners[owner].service;
      assert.equal(proof.parserVersion, 'streaming-v2'); assert.equal(proof.parserPin, unifiedHTMLParserPin('streaming-v2'));
      const saved = await readUnifiedUploadedModule(proof.moduleProof, { service, versionId: proof.versionId,
        moduleSHA256: row.moduleSHA256, context: { role, transportPin: value.transportPin, configPin: row.configPin } });
      const version = unifiedPinnedJSON(join(directory, `${role}-${owner}/version.json`), proof.versionPin);
      assertModuleVersionIdentity(saved.version, version);
      assertUploadedVersion(version, proof.versionId, runtimeConfigs[owner], value.baseline.bindings[service]);
      modules[owner][role] = saved;
    }
  }
  return { previews, modules, currentCloudRead: false, freshnessRenewed: false };
}

export function readUnifiedGenshinMainPromotionJournal({ run, pin, value, previewPin }) {
  fixed(value);
  const file = join(run, `unified-promotion-${value.transportPin}.jsonl`), raw = readUnifiedHistoricalBytes(file);
  assert.equal(digest(raw), pin, 'Pair promotion journal changed'); assert(raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(JSON.parse), first = rows[0];
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'remote_versions_verified', 'promotion_intent', 'promoted', 'promotion_intent', 'promoted', 'production_accepted'],
    'Incomplete, stopped or non-ordered pair promotion is not a completed publication');
  assert.deepEqual(first.ownerOrder, OWNERS); assertTopology(value.baseline, first.baseline);
  assert.equal(first.previewPin, previewPin); assertUnifiedPromotionDirectories(run, first.directory, first.renewalDirectory);
  assert(/^[a-f0-9]{64}$/.test(first.renewalPin));
  let previousAt = -Infinity, previousObservation = value.identityObservedAt;
  for (const row of rows) {
    assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.transportPin, value.transportPin);
    assert.equal(row.previewPin, first.previewPin); assert.equal(row.renewalPin, first.renewalPin);
    assert.equal(row.freshnessPolicy, 'write-boundary-v1', 'Pair promotion requires per-owner write authorizations');
    assert.deepEqual(row.sourceHandoff, first.sourceHandoff);
    const at = Date.parse(row.at); time(at); assert(at >= previousAt, 'Pair journal chronology changed'); previousAt = at;
    if (row.phase === 'promotion_intent') {
      const authorization = row.writeAuthorization;
      assert(authorization && typeof authorization === 'object'); assert.deepEqual(Object.keys(authorization).sort(), ['authorizedAt', 'identityObservedAt']);
      assert.equal(authorization.authorizedAt, at); time(authorization.identityObservedAt);
      assert(authorization.identityObservedAt >= previousObservation && authorization.identityObservedAt <= at
        && at - authorization.identityObservedAt < 900000, 'Pair source observation expired or moved backwards at write');
      previousObservation = authorization.identityObservedAt;
    } else assert.equal(row.writeAuthorization, undefined);
  }
  const writes = {};
  for (const [index, owner] of OWNERS.entries()) {
    const intent = rows[2 + index * 2], promoted = rows[3 + index * 2], accepted = first.accepted?.candidate?.[owner];
    assert(accepted, 'Missing pair candidate');
    for (const row of [intent, promoted]) {
      assert.equal(row.owner, owner); assert.equal(row.service, value.owners[owner].service); assert.equal(row.versionId, accepted.versionId);
    }
    writes[owner] = { intent, promoted };
  }
  return { file, rows, first, writes, stopped: false };
}

export function readUnifiedGenshinMainRenewal({ original, value, previews, references }) {
  fixed(value);
  const directory = original.first.renewalDirectory, pin = original.first.renewalPin;
  const receipt = unifiedPinnedJSON(join(directory, 'receipt.json'), pin);
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_genshin_main_preview_renewal');
  assert.equal(receipt.releaseKey, value.releaseKey); assert.equal(receipt.transportPin, value.transportPin); assert.equal(receipt.previewPin, previews.pin);
  assert.equal(receipt.cloudWrites, false); assert.equal(receipt.productionPromoted, false);
  assert.deepEqual(receipt.sourceHandoff, original.first.sourceHandoff); assert.deepEqual(receipt.accepted, original.first.accepted);
  assert.deepEqual(Object.keys(receipt.accepted).sort(), [...ROLES].sort());
  for (const role of ROLES) {
    assert.deepEqual(Object.keys(receipt.accepted[role]).sort(), [...OWNERS].sort());
    for (const owner of OWNERS) {
      const proof = receipt.accepted[role][owner], old = previews.receipt.accepted[role][owner];
      const { originalEvidenceSHA256, evidenceSHA256: _e, acceptedAt: _a, ...identity } = proof;
      const { evidenceSHA256: _oldE, acceptedAt: _oldA, ...oldIdentity } = old;
      assert.equal(originalEvidenceSHA256, old.evidenceSHA256); assert.deepEqual(identity, oldIdentity, 'Pair renewal replaced an immutable upload identity');
      assert(time(old.acceptedAt) <= time(proof.acceptedAt) && proof.acceptedAt <= Date.parse(original.first.at), 'Pair renewal chronology changed');
      for (const target of OWNERS) assert(Date.parse(original.writes[target].intent.at) - proof.acceptedAt < 900000, 'Pair renewal expired at a recorded owner write');
      recheckUnifiedPreview(join(directory, `${role}-${owner}`), proof.evidenceSHA256, { service: value.owners[owner].service,
        versionId: proof.versionId, references: references(owner, role, 'streaming-v2'), parserVersion: 'streaming-v2' });
    }
  }
  return { directory, pin, receipt, freshnessRenewed: false };
}

function deployment(directory, owner, result, expected) {
  assert.equal(result.service, expected.service); assert.equal(result.versionId, expected.versionId); assert.equal(result.releaseKey, expected.releaseKey);
  assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(result.deploymentId), 'Missing pair deployment ID');
  for (const kind of ['creation', 'verification']) {
    const file = join(directory, `deployment-${owner}-${kind}`), metadata = JSON.parse(readUnifiedHistoricalBytes(file + '.json'));
    const bytes = readUnifiedHistoricalBytes(file + '.body');
    assert.equal(metadata.owner, owner); assert.equal(metadata.kind, kind); assert(Number.isInteger(metadata.status) && metadata.status >= 200 && metadata.status < 300);
    assert.equal(metadata.sha256, digest(bytes)); assert.equal(metadata.bytes, bytes.length);
    assert.deepEqual(result.responses?.[kind], { status: metadata.status, sha256: metadata.sha256, bytes: metadata.bytes });
    const body = JSON.parse(bytes); assert.equal(body.success, true); assert.equal(body.result?.id, result.deploymentId);
    if (kind === 'verification' || Object.hasOwn(body.result, 'strategy')) assert.equal(body.result.strategy, 'percentage');
    if (kind === 'verification' || Object.hasOwn(body.result, 'versions')) assert.deepEqual(body.result.versions, [{ version_id: expected.versionId, percentage: 100 }]);
  }
  return result;
}

// Accepted only when both exact writes, all four modules/previews and both
// public evidence sets can be reopened. Partial/unknown journals always fail.
export async function readUnifiedCompletedGenshinMainPromotion(input) {
  const { run, value, references, runtimeConfigs, publicReferences } = input;
  fixed(value); assert.deepEqual(Object.keys(publicReferences).sort(), [...OWNERS].sort());
  const { previews, modules } = await readUnifiedGenshinMainPreviews({ ...input, directory: input.previews.directory, pin: input.previews.pin });
  const receipt = unifiedPinnedJSON(input.proof.path, input.proof.pin);
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_genshin_main_publication_promotion');
  assert.equal(receipt.status, 'production_accepted'); assert.equal(receipt.productionPromoted, true); assert.equal(receipt.sourceAdvanced, false);
  assert.equal(receipt.releaseKey, value.releaseKey); assert.equal(receipt.transportPin, value.transportPin); assert.equal(receipt.previewPin, previews.pin);
  const original = readUnifiedGenshinMainPromotionJournal({ run, pin: receipt.journalPin, value, previewPin: previews.pin });
  assert.equal(receipt.directory, original.first.directory); assert.equal(input.proof.path, join(receipt.directory, 'receipt.json'));
  assert.equal(receipt.renewalPin, original.first.renewalPin); assert.deepEqual(receipt.sourceHandoff, original.first.sourceHandoff);
  assert.deepEqual(receipt.productionRequest, input.productionRequest);
  assert.deepEqual(receipt.preview, { path: join(previews.directory, 'receipt.json'), pin: previews.pin });
  assert.equal(receipt.freshnessPolicy, 'write-boundary-v1');
  assert.deepEqual(receipt.writeAuthorizations, Object.fromEntries(OWNERS.map(owner => [owner, original.writes[owner].intent.writeAuthorization])));
  for (const name of ['sourceCI', 'originExecutorCI', 'executorCI']) {
    assert.equal(input[name]?.status, 'full_exact_ci_passed', 'Independently verified exact CI identity required'); assert.deepEqual(receipt[name], input[name]);
  }
  const renewal = readUnifiedGenshinMainRenewal({ original, value, previews, references });
  const expectedVersions = versions(value, previews.receipt.accepted, 'candidate'); assert.deepEqual(receipt.versions, expectedVersions);
  const remote = original.rows[1].proof, savedRemote = unifiedPinnedJSON(join(receipt.directory, 'remote-0.json'), remote.evidenceSHA256);
  const { evidenceSHA256: _remotePin, ...remoteIdentity } = remote; assert.deepEqual(savedRemote, remoteIdentity);
  assert.equal(remote.status, 'passed'); assert.deepEqual(remote.versions, expectedVersions);
  assert.deepEqual(remote.recoveryVersions, versions(value, previews.receipt.accepted, 'recovery'));
  assert.deepEqual(remote.modules, Object.fromEntries(OWNERS.map(owner => [value.owners[owner].service, value.owners[owner].candidate.moduleSHA256])));
  assert.deepEqual(remote.observed.map(row => [row.role, row.owner]), ROLES.flatMap(role => OWNERS.map(owner => [role, owner])));
  for (const observed of remote.observed) {
    const accepted = previews.receipt.accepted[observed.role][observed.owner];
    assert.equal(observed.service, accepted.service); assert.equal(observed.versionId, accepted.versionId); assert.equal(observed.moduleSHA256, accepted.moduleSHA256);
    assert.deepEqual(observed.moduleProof, accepted.moduleProof); assertModuleVersionIdentity(modules[observed.owner][observed.role].version, observed.version);
  }
  const deployments = Object.fromEntries(OWNERS.map(owner => [owner, deployment(receipt.directory, owner, original.writes[owner].promoted.result,
    { service: value.owners[owner].service, versionId: previews.receipt.accepted.candidate[owner].versionId, releaseKey: value.releaseKey })]));
  const publicProof = original.rows.at(-1).proof, savedPublic = unifiedPinnedJSON(join(receipt.directory, 'public-acceptance.json'), publicProof.evidenceSHA256);
  const { evidenceSHA256: _publicPin, ...publicIdentity } = publicProof; assert.deepEqual(savedPublic, publicIdentity); assert.deepEqual(receipt.publicProof, publicProof);
  assert.equal(publicProof.status, 'passed'); assert.equal(publicProof.releaseKey, value.releaseKey); assert.deepEqual(publicProof.versions, expectedVersions);
  assert.deepEqual(Object.keys(publicProof.owners).sort(), [...OWNERS].sort());
  const publicHTTP = {};
  for (const owner of OWNERS) {
    const http = publicProof.owners[owner], expected = publicReferences[owner];
    assert(Array.isArray(expected) && expected.length > 0); assert.equal(http.directory, join(receipt.directory, 'public', owner)); assert.equal(http.responses, expected.length);
    publicHTTP[owner] = (owner === 'main' ? recheckUnifiedMainPublic : recheckUnifiedGenshinPublic)(http.directory, http.evidenceSHA256, expected);
  }
  return { receipt, original, previews, renewal, modules, deployments, publicHTTP, currentCMSRead: false, currentCloudRead: false,
    freshnessRenewed: false, sourceAdvanced: false, productionReady: false };
}

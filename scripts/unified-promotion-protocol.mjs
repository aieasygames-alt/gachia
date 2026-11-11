import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { assertTopology, reconcileRelease } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { assertUnifiedPreviewIdentity, assertUnifiedPreviewUploadScope } from './unified-preview-protocol.mjs';
import { readUnifiedObservationStop, readUnifiedUploadedPairStop, readUnifiedUploadedPairCompletionStop, unifiedUploadedPairStopPin } from './unified-preview-completion.mjs';
import { exactUnifiedPreviewOrigin, recheckUnifiedPreview, unifiedHTMLParserPin } from './unified-version-preview.mjs';

const SHA = /^[a-f0-9]{64}$/;
const ROLES = ['recovery', 'candidate'];
const fresh = at => assert(Number.isSafeInteger(at) && at <= Date.now() && Date.now() - at < 900000, 'Unified promotion preview expired');
export function unifiedPinnedJSON(file, pin) {
  assert(SHA.test(pin)); assert.equal(realpathSync(file), resolve(file), 'Linked unified proof forbidden');
  const stat = statSync(file); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024);
  const raw = readFileSync(file); assert.equal(digest(raw), pin, 'Unified proof changed');
  return JSON.parse(raw);
}

function acceptedIdentity(accepted, value, requireFresh = false) {
  assert.deepEqual(Object.keys(accepted).sort(), [...ROLES].sort());
  for (const role of ROLES) {
    assert.deepEqual(Object.keys(accepted[role]).sort(), [...value.ownerOrder].sort());
    for (const owner of value.ownerOrder) {
      const proof = accepted[role][owner], source = value.owners[owner], target = source[role];
      assert.equal(proof.service, source.service); exactUnifiedPreviewOrigin(proof.service, proof.versionId);
      assert.notEqual(proof.versionId, source.sourceVersionId, 'Raw old UUID is not compatible recovery');
      assert.equal(proof.moduleSHA256, target.moduleSHA256); assert.equal(proof.artifactPin, target.artifactPin);
      for (const pin of [proof.evidenceSHA256, proof.versionPin, proof.moduleProof?.pin]) assert(SHA.test(pin), 'Incomplete unified cloud proof');
      assert(typeof proof.moduleProof.path === 'string' && proof.moduleProof.path.startsWith('/'));
      assert(Number.isSafeInteger(proof.acceptedAt) && proof.acceptedAt <= Date.now());
      if (requireFresh) fresh(proof.acceptedAt);
    }
  }
  for (const owner of value.ownerOrder) assert.notEqual(accepted.candidate[owner].versionId, accepted.recovery[owner].versionId);
}

// Reopening historical acceptance does not make its timestamp fresh. The fixed
// wrapper separately revalidates the upload-time immutable module receipts.
export function readUnifiedCloudPreviews({ run, directory, pin, value, references }) {
  assertUnifiedPreviewIdentity(value, value.transportPin);
  const receipt = unifiedPinnedJSON(join(directory, 'receipt.json'), pin);
  if (receipt.kind === 'unified_readonly_uploaded_pair_cloud_previews') return readUploadedPairCompletion({ run, directory, pin, value, references, receipt });
  if (receipt.kind === 'unified_completed_observation_stop_cloud_previews') return readCompletedPreviews({ run, directory, pin, value, references, receipt });
  assert.equal(directory, join(run, `unified-cloud-preview-${value.transportPin}`));
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_candidate_recovery_cloud_previews');
  assert.equal(receipt.status, 'all_cloud_previews_accepted_no_promotion');
  assert.equal(receipt.transportPin, value.transportPin); assert.equal(receipt.releaseKey, value.releaseKey);
  assert.equal(receipt.productionPromoted, false); assert.equal(receipt.activationSupported, false);
  const journal = join(run, `unified-preview-${value.transportPin}.jsonl`);
  const raw = readFileSync(journal); assert.equal(digest(raw), receipt.journalPin, 'Unified upload journal changed');
  assert(raw.length <= 16 * 1024 * 1024 && raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(line => JSON.parse(line));
  assert.equal(rows.length, 2 + value.ownerOrder.length * 8, 'Incomplete or stopped unified upload');
  assert.equal(rows[0].phase, 'baseline'); assert.equal(rows[0].directory, directory);
  assert.deepEqual(rows[0].baseline, value.baseline);
  for (const row of rows) {
    assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.transportPin, value.transportPin);
    assert(Number.isFinite(Date.parse(row.at)));
  }
  let index = 1;
  acceptedIdentity(receipt.accepted, value);
  for (const role of ROLES) for (const owner of value.ownerOrder) {
    const proof = receipt.accepted[role][owner];
    for (const phase of ['upload_intent', 'upload_response', 'upload_returned', 'preview_accepted']) {
      const row = rows[index++]; assert.equal(row.phase, phase); assert.equal(row.owner, owner); assert.equal(row.role, role);
      if (phase === 'preview_accepted') assert.deepEqual(row.proof, proof);
      else {
        assert.equal(row.service, proof.service);
        if (phase === 'upload_intent') assert.equal(row.moduleSHA256, proof.moduleSHA256);
        else assert.equal(row.versionId, proof.versionId);
      }
    }
    const root = join(directory, `${role}-${owner}`);
    unifiedPinnedJSON(join(root, 'version.json'), proof.versionPin);
    const parserVersion = proof.parserVersion ?? 'legacy-v1';
    assert(['legacy-v1', 'streaming-v2'].includes(parserVersion), 'Unreviewed cloud preview parser');
    assert.equal(proof.parserPin, parserVersion === 'legacy-v1' ? undefined : unifiedHTMLParserPin(parserVersion), 'Cloud preview parser changed');
    recheckUnifiedPreview(join(root, 'http'), proof.evidenceSHA256, { service: proof.service, versionId: proof.versionId,
      references: references(owner, role, parserVersion), parserVersion });
  }
  assert.equal(rows[index].phase, 'all_cloud_previews_accepted_no_promotion'); assert.deepEqual(rows[index].accepted, receipt.accepted);
  return { receipt, directory, pin, baseline: rows[0].baseline };
}

function readUploadedPairCompletion({ run, directory, pin, value, references, receipt }) {
  const suffix = receipt.completionStop === undefined ? '' : '-continued';
  assert.equal(directory, join(run, `unified-cloud-uploaded-pair-completion-${value.transportPin}${suffix}`));
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.status, 'all_cloud_previews_accepted_no_promotion');
  assert.equal(receipt.transportPin, value.transportPin); assert.equal(receipt.releaseKey, value.releaseKey);
  assert.equal(receipt.cloudWrites, false); assert.equal(receipt.productionPromoted, false); assert.equal(receipt.activationSupported, false);
  assert(SHA.test(receipt.networkPin)); assert.equal(receipt.stopPin, unifiedUploadedPairStopPin(receipt.stop));
  const original = receipt.completionStop === undefined ? readUnifiedUploadedPairStop({ run, stop: receipt.stop, value, references }) :
    readUnifiedUploadedPairCompletionStop({ run, completionStop: receipt.completionStop, stop: receipt.stop, value, references });
  const raw = readFileSync(join(run, `unified-uploaded-pair-completion-${value.transportPin}${suffix}.jsonl`));
  assert.equal(digest(raw), receipt.journalPin); assert(raw.length <= 16 * 1024 * 1024 && raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'observation_intent', 'preview_accepted', 'observation_intent', 'preview_accepted', 'all_cloud_previews_accepted_no_promotion']);
  let at = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.transportPin, value.transportPin); assert.equal(row.stopPin, receipt.stopPin);
    assert.deepEqual(row.completionStop, receipt.completionStop);
    const current = Date.parse(row.at); assert(current >= at && current <= Date.now()); at = current;
  }
  assertTopology(rows[0].baseline, value.baseline); assert.equal(rows[0].directory, directory);
  assert.deepEqual(rows[0].stop, receipt.stop); assert.equal(rows[0].networkPin, receipt.networkPin);
  acceptedIdentity(receipt.accepted, value);
  for (const [index, role] of ROLES.entries()) {
    const proof = receipt.accepted[role].main, old = original.existing[role], intent = rows[1 + index * 2], accepted = rows[2 + index * 2];
    assert.equal(intent.role, role); assert.equal(intent.versionId, old.versionId);
    assert.equal(accepted.role, role); assert.deepEqual(accepted.proof, proof);
    assert(proof.acceptedAt >= Date.parse(intent.at) && proof.acceptedAt <= Date.parse(accepted.at));
    assert.equal(proof.versionId, old.versionId); assert.equal(proof.versionPin, old.inspected.versionPin);
    assert.deepEqual(proof.moduleProof, old.inspected.moduleProof);
    assert.equal(proof.parserVersion, 'streaming-v2'); assert.equal(proof.parserPin, unifiedHTMLParserPin('streaming-v2'));
    const root = join(directory, `${role}-main`);
    assert.equal(unifiedPinnedJSON(join(root, 'version.json'), proof.versionPin).id, proof.versionId);
    recheckUnifiedPreview(join(root, 'http'), proof.evidenceSHA256, { service: 'gachia', versionId: proof.versionId,
      references: references('main', role, 'streaming-v2'), parserVersion: 'streaming-v2' });
  }
  assert.deepEqual(rows[5].accepted, receipt.accepted);
  return { receipt, directory, pin, baseline: rows[0].baseline };
}

function readCompletedPreviews({ run, directory, pin, value, references, receipt }) {
  assert.deepEqual(value.ownerOrder, ['main']); assert.equal(directory, join(run, `unified-cloud-preview-completion-${value.transportPin}`));
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.status, 'all_cloud_previews_accepted_no_promotion');
  assert.equal(receipt.transportPin, value.transportPin); assert.equal(receipt.releaseKey, value.releaseKey);
  assert.equal(receipt.productionPromoted, false); assert.equal(receipt.activationSupported, false); assert(SHA.test(receipt.networkPin));
  const original = readUnifiedObservationStop({ run, stop: receipt.stop, value });
  assert.equal(receipt.stopPin, digest(JSON.stringify(Object.fromEntries(Object.keys(receipt.stop).sort().map(key => [key,
    { path: receipt.stop[key].path, pin: receipt.stop[key].pin }])))), 'Original stop selection changed');
  const raw = readFileSync(join(run, `unified-preview-completion-${value.transportPin}.jsonl`));
  assert.equal(digest(raw), receipt.journalPin); assert(raw.length <= 16 * 1024 * 1024 && raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'existing_recovery_observation_intent', 'existing_recovery_preview_accepted',
    'upload_intent', 'upload_response', 'candidate_preview_accepted', 'all_cloud_previews_accepted_no_promotion']);
  let at = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.transportPin, value.transportPin); assert.equal(row.stopPin, receipt.stopPin);
    const current = Date.parse(row.at); assert(current >= at && current <= Date.now()); at = current;
  }
  assertTopology(rows[0].baseline, value.baseline); assert.equal(rows[0].directory, directory); assert.deepEqual(rows[0].stop, receipt.stop);
  assert.equal(rows[1].versionId, original.versionId); assert.equal(receipt.accepted.recovery.main.versionId, original.versionId);
  assert.deepEqual(rows[2].proof, receipt.accepted.recovery.main);
  assert.equal(rows[3].owner, 'main'); assert.equal(rows[3].role, 'candidate'); assert.equal(rows[3].service, 'gachia');
  assert.equal(rows[3].moduleSHA256, value.owners.main.candidate.moduleSHA256);
  assert.equal(rows[4].versionId, receipt.accepted.candidate.main.versionId);
  assert.deepEqual(rows[5].proof, receipt.accepted.candidate.main); assert.deepEqual(rows[6].accepted, receipt.accepted);
  acceptedIdentity(receipt.accepted, value);
  assert.equal(receipt.accepted.recovery.main.versionPin, original.inspected.versionPin);
  assert.deepEqual(receipt.accepted.recovery.main.moduleProof, original.inspected.moduleProof);
  for (const role of ROLES) {
    const proof = receipt.accepted[role].main;
    assert.equal(proof.parserVersion, 'streaming-v2'); assert.equal(proof.parserPin, unifiedHTMLParserPin('streaming-v2'));
    const root = join(directory, `${role}-main`);
    const version = unifiedPinnedJSON(join(root, 'version.json'), proof.versionPin); assert.equal(version.id, proof.versionId);
    recheckUnifiedPreview(join(root, 'http'), proof.evidenceSHA256, { service: 'gachia', versionId: proof.versionId, references: references('main', role), parserVersion: 'streaming-v2' });
  }
  return { receipt, directory, pin, baseline: rows[0].baseline };
}

export function assertUnifiedPromotionEvidence(value) {
  assertUnifiedPreviewUploadScope(value, value.transportPin);
  assertUnifiedPromotionIdentity(value);
  acceptedIdentity(value.accepted, value, true);
}

function assertUnifiedPromotionIdentity(value) {
  assertUnifiedPreviewIdentity(value, value.transportPin);
  assert(SHA.test(value.previewPin) && SHA.test(value.renewalPin), 'Pinned cloud acceptance and renewal required');
  acceptedIdentity(value.accepted, value);
}

export function assertUnifiedPromotionDirectories(run, directory, renewalDirectory) {
  assert.equal(realpathSync(run), resolve(run), 'Linked promotion run forbidden');
  assert.equal(dirname(directory), run, 'Promotion evidence must be a direct run child');
  assert(/^unified-main-promotion-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(basename(directory)), 'Invalid promotion evidence directory');
  assert.equal(renewalDirectory, join(directory, 'renewal'), 'Renewal must belong to this promotion');
  for (const path of [directory, renewalDirectory]) assert.equal(realpathSync(path), resolve(path), 'Linked promotion evidence forbidden');
}

// No upload or automatic recovery capability. Every write target comes from
// accepted exact UUIDs; an existing journal permanently blocks replay.
export async function executeUnifiedPromotionProtocol({ run, verify, authorize, makeTransport, authorizeWrite, confirmWrite, verifyAfterWrite }) {
  return withRunLock(run, async () => {
    assert.equal(typeof authorizeWrite, typeof verifyAfterWrite, 'Both write-boundary adapters are required');
    assert(authorizeWrite === undefined || typeof authorizeWrite === 'function');
    assert(confirmWrite === undefined || (typeof authorizeWrite === 'function' && typeof confirmWrite === 'function'), 'Invalid write confirmation adapter');
    const lifecycle = authorizeWrite === undefined ? {} : { freshnessPolicy: 'write-boundary-v1' };
    const initial = structuredClone(await verify()); assertUnifiedPromotionEvidence(initial);
    if (authorizeWrite && initial.ownerOrder.length > 1) assert.equal(typeof confirmWrite, 'function', 'Ordered promotion requires an owner confirmation adapter');
    assert.equal(await authorize(initial), initial.releaseKey);
    assertUnifiedPromotionDirectories(run, initial.evidenceDirectory, initial.renewalDirectory);
    const journal = join(run, `unified-promotion-${initial.transportPin}.jsonl`);
    const source = initial.sourceHandoff === undefined ? {} : { sourceHandoff: initial.sourceHandoff };
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.releaseKey,
      transportPin: initial.transportPin, previewPin: initial.previewPin, renewalPin: initial.renewalPin, ...source, ...lifecycle, ...row }) + '\n', { flush: true });
    const transport = makeTransport(initial), promoted = {};
    const versions = Object.fromEntries(initial.ownerOrder.map(owner => [initial.owners[owner].service, initial.accepted.candidate[owner].versionId]));
    let pendingOperation, lastObservedAt = initial.identityObservedAt, current = initial;
    const writeAuthorizations = {};
    const revalidate = async (afterWrite = false) => {
      current = await (afterWrite && verifyAfterWrite ? verifyAfterWrite() : verify());
      if (afterWrite && verifyAfterWrite) assertUnifiedPromotionIdentity(current);
      else assertUnifiedPromotionEvidence(current);
      assert(current.identityObservedAt >= lastObservedAt, 'Unified source observation moved backwards');
      assert.deepEqual({ ...current, identityObservedAt: initial.identityObservedAt }, initial, 'Unified promotion identity changed');
      lastObservedAt = current.identityObservedAt;
    };
    record({ phase: 'baseline', baseline: initial.baseline, accepted: initial.accepted, ownerOrder: initial.ownerOrder,
      directory: initial.evidenceDirectory, renewalDirectory: initial.renewalDirectory });
    try {
      assertTopology(initial.baseline, await transport.snapshot());
      const remote = await transport.verifyVersions(initial);
      assert.equal(remote.status, 'passed'); assert.deepEqual(remote.versions, versions);
      assert.deepEqual(remote.recoveryVersions, Object.fromEntries(initial.ownerOrder.map(owner => [initial.owners[owner].service, initial.accepted.recovery[owner].versionId])));
      assert.deepEqual(remote.modules, Object.fromEntries(initial.ownerOrder.map(owner => [initial.owners[owner].service, initial.accepted.candidate[owner].moduleSHA256])));
      assert(SHA.test(remote.evidenceSHA256)); record({ phase: 'remote_versions_verified', proof: remote });
      for (const owner of initial.ownerOrder) {
        await revalidate(); assertTopology(initial.baseline, await transport.snapshot(), promoted);
        // The final snapshot is asynchronous: recheck clocks immediately before
        // the durable intent, not just at the start of the preceding verifier.
        assertUnifiedPromotionEvidence(current);
        const authorization = authorizeWrite?.(owner);
        if (authorizeWrite) {
          assert.deepEqual(Object.keys(authorization).sort(), ['authorizedAt', 'identityObservedAt']);
          assert.equal(authorization.identityObservedAt, current.identityObservedAt);
          assert(Number.isSafeInteger(authorization.authorizedAt) && authorization.authorizedAt <= Date.now());
          assert(authorization.authorizedAt >= current.identityObservedAt && authorization.authorizedAt - current.identityObservedAt < 900000);
          writeAuthorizations[owner] = structuredClone(authorization);
        }
        assertUnifiedPromotionEvidence(current);
        const service = initial.owners[owner].service, versionId = versions[service];
        pendingOperation = { owner, service, versionId };
        record({ phase: 'promotion_intent', ...pendingOperation, ...(authorization ? {
          at: new Date(authorization.authorizedAt).toISOString(), writeAuthorization: authorization } : {}) });
        const result = await transport.promote({ ...pendingOperation, releaseKey: initial.releaseKey });
        promoted[service] = versionId;
        assertTopology(initial.baseline, await transport.snapshot(), promoted);
        record({ phase: 'promoted', ...pendingOperation, result });
        await confirmWrite?.(owner); pendingOperation = undefined;
      }
      await revalidate(true);
      const proof = await transport.acceptProduction(initial);
      assert.equal(proof.status, 'passed'); assert.equal(proof.releaseKey, initial.releaseKey);
      assert.deepEqual(proof.versions, versions); assert(SHA.test(proof.evidenceSHA256));
      assertTopology(initial.baseline, await transport.snapshot(), promoted); await revalidate(true);
      record({ phase: 'production_accepted', proof });
      return { schemaVersion: 1, kind: 'unified_publication_promotion', status: 'production_accepted', releaseKey: initial.releaseKey,
        transportPin: initial.transportPin, previewPin: initial.previewPin, renewalPin: initial.renewalPin, versions,
        ...source, ...lifecycle, ...(authorizeWrite ? { writeAuthorizations } : {}),
        publicProof: proof, journalPin: digest(readFileSync(journal)), productionPromoted: true, sourceAdvanced: false };
    } catch (error) {
      record({ phase: 'stopped', error: error.message, pendingOperation, promoted, automaticRetry: false, automaticRollback: false });
      try {
        record({ phase: 'read_only_reconciliation', result: reconcileRelease(initial.baseline, await transport.snapshot(),
          Object.fromEntries(Object.entries(versions).map(([service, versionId]) => [service, { versionId }]))), pendingOperation });
      } catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

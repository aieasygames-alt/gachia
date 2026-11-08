import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assertTopology, reconcileRelease } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { assertUnifiedPreviewIdentity, assertUnifiedPreviewUploadScope } from './unified-preview-protocol.mjs';
import { exactUnifiedPreviewOrigin, recheckUnifiedPreview, unifiedHTMLParserPin } from './unified-version-preview.mjs';

const SHA = /^[a-f0-9]{64}$/;
const fresh = at => assert(Number.isSafeInteger(at) && at <= Date.now() && Date.now() - at < 900000, 'Completed cloud preview expired');
function pinned(file, pin) {
  assert(SHA.test(pin)); assert.equal(realpathSync(file), resolve(file));
  const stat = statSync(file); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024);
  const raw = readFileSync(file); assert.equal(digest(raw), pin, 'Stopped upload evidence changed'); return raw;
}

export function unifiedUploadedPairStopPin(stop) {
  const proof = value => ({ path: value.path, pin: value.pin });
  const role = value => Object.fromEntries(['http', 'module', 'version'].map(key => [key, proof(value[key])]));
  return digest(JSON.stringify({ candidate: role(stop.candidate), journal: proof(stop.journal), recovery: role(stop.recovery) }));
}

// Historical evidence only: fresh source/CMS/immutable-version verification is
// still required by a fixed completion entry before any new acceptance receipt.
export function readUnifiedUploadedPairStop({ run, stop, value, references }) {
  assertUnifiedPreviewIdentity(value, value.transportPin); assert.deepEqual(value.ownerOrder, ['main']);
  const roles = ['recovery', 'candidate'], root = join(run, `unified-cloud-preview-${value.transportPin}`);
  const service = value.owners.main.service;
  assert.deepEqual(Object.keys(stop).sort(), ['candidate', 'journal', 'recovery']);
  assert.equal(stop.journal.path, join(run, `unified-preview-${value.transportPin}.jsonl`));
  const raw = pinned(stop.journal.path, stop.journal.pin); assert(raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'upload_intent', 'upload_response', 'upload_returned', 'preview_accepted',
    'upload_intent', 'upload_response', 'upload_returned', 'stopped', 'read_only_reconciliation'], 'Not a known uploaded pair stop');
  let at = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.transportPin, value.transportPin);
    const time = Date.parse(row.at); assert(time >= at && time <= Date.now(), 'Stopped upload chronology changed'); at = time;
  }
  assert.equal(rows[0].directory, root); assertTopology(rows[0].baseline, value.baseline);
  const stopped = rows[8], reconciliation = rows[9], existing = {};
  assert.equal(stopped.error, 'Next-batch source handoff expired; take fresh read-only observations');
  assert.equal(stopped.automaticRetry, false); assert.equal(stopped.automaticRollback, false);
  assertTopology(value.baseline, reconciliation.snapshot);
  for (const [index, role] of roles.entries()) {
    const selection = stop[role], target = value.owners.main[role], directory = join(root, `${role}-main`);
    assert.deepEqual(Object.keys(selection).sort(), ['http', 'module', 'version']);
    const expected = { http: join(directory, 'http/result.json'), module: join(directory, 'module/receipt.json'), version: join(directory, 'version.json') };
    const saved = {};
    for (const [name, file] of Object.entries(expected)) {
      assert.deepEqual(Object.keys(selection[name]).sort(), ['path', 'pin']);
      assert.equal(selection[name].path, file, 'Unexpected uploaded pair evidence path');
      saved[name] = JSON.parse(pinned(file, selection[name].pin));
    }
    const offset = index === 0 ? 1 : 5, versionId = rows[offset + 1].versionId;
    exactUnifiedPreviewOrigin(service, versionId); assert.notEqual(versionId, value.owners.main.sourceVersionId);
    for (const row of rows.slice(offset, offset + 3)) {
      assert.equal(row.owner, 'main'); assert.equal(row.role, role); assert.equal(row.service, service);
    }
    assert.equal(rows[offset].moduleSHA256, target.moduleSHA256); assert.equal(rows[offset + 2].versionId, versionId);
    assert.equal(saved.version.id, versionId);
    assert.equal(saved.module.schemaVersion, 1); assert.equal(saved.module.kind, 'unified_upload_time_module_receipt');
    assert.equal(saved.module.service, service); assert.equal(saved.module.versionId, versionId); assert.equal(saved.module.moduleSHA256, target.moduleSHA256);
    recheckUnifiedPreview(join(directory, 'http'), selection.http.pin, { service, versionId,
      references: references('main', role, 'streaming-v2'), parserVersion: 'streaming-v2' });
    const uploaded = { [service]: { versionId } };
    assert.deepEqual(reconciliation[role], reconcileRelease(value.baseline, reconciliation.snapshot, uploaded));
    existing[role] = { versionId, inspected: { moduleSHA256: target.moduleSHA256, versionPin: selection.version.pin, moduleProof: selection.module },
      evidenceSHA256: selection.http.pin };
  }
  assert.notEqual(existing.recovery.versionId, existing.candidate.versionId);
  assert.deepEqual(stopped.uploaded, Object.fromEntries(roles.map(role => [role, { [service]: { versionId: existing[role].versionId } }])));
  const pending = { role: 'candidate', owner: 'main', service, versionId: existing.candidate.versionId };
  assert.deepEqual(stopped.pendingOperation, pending); assert.deepEqual(reconciliation.pendingOperation, pending);
  const accepted = rows[4].proof;
  assert.equal(rows[4].owner, 'main'); assert.equal(rows[4].role, 'recovery');
  assert(Number.isSafeInteger(accepted.acceptedAt) && accepted.acceptedAt >= Date.parse(rows[3].at) && accepted.acceptedAt <= Date.parse(rows[4].at));
  assert.deepEqual(accepted, { service, versionId: existing.recovery.versionId, moduleSHA256: value.owners.main.recovery.moduleSHA256,
    artifactPin: value.owners.main.recovery.artifactPin, versionPin: stop.recovery.version.pin, moduleProof: stop.recovery.module,
    evidenceSHA256: stop.recovery.http.pin, acceptedAt: accepted.acceptedAt, parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2') });
  assert.deepEqual(stopped.accepted, { recovery: { main: accepted }, candidate: {} });
  return { stop, existing, historicalOnly: true, cloudWrites: false };
}

// Trusted fixed adapters must verify current CMS/source state and immutable
// modules. This protocol deliberately has no upload or deployment adapter.
export async function executeUnifiedUploadedPairCompletion({ run, verify, authorize, transport }) {
  assert.deepEqual(Object.keys(transport).sort(), ['observe', 'revalidate', 'snapshot']);
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify()); assertUnifiedPreviewUploadScope(initial, initial.transportPin);
    assert.deepEqual(initial.ownerOrder, ['main']); assert(SHA.test(initial.stopPin) && SHA.test(initial.networkPin));
    assert.equal(initial.stopPin, unifiedUploadedPairStopPin(initial.stop));
    assert.equal(await authorize(initial), initial.releaseKey);
    const directory = join(run, `unified-cloud-uploaded-pair-completion-${initial.transportPin}`);
    const journal = join(run, `unified-uploaded-pair-completion-${initial.transportPin}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.releaseKey,
      transportPin: initial.transportPin, stopPin: initial.stopPin, ...row }) + '\n', { flush: true });
    const accepted = { recovery: {}, candidate: {} }; let lastAt = initial.identityObservedAt;
    const recheck = async () => {
      const current = await verify(); assertUnifiedPreviewUploadScope(current, initial.transportPin);
      assert(current.identityObservedAt >= lastAt);
      assert.deepEqual({ ...current, identityObservedAt: initial.identityObservedAt }, initial, 'Uploaded pair completion identity changed');
      lastAt = current.identityObservedAt;
      assertTopology(initial.baseline, await transport.snapshot());
    };
    record({ phase: 'baseline', baseline: initial.baseline, directory, stop: initial.stop, networkPin: initial.networkPin });
    try {
      mkdirSync(directory, { mode: 0o700 });
      assertTopology(initial.baseline, await transport.snapshot());
      // Initial verification precedes recovery; each post-observation recheck
      // also guards the next read. No writer exists between these boundaries.
      for (const role of ['recovery', 'candidate']) {
        const existing = initial.existingPair[role], target = initial.owners.main[role];
        exactUnifiedPreviewOrigin('gachia', existing.versionId);
        assert.notEqual(existing.versionId, initial.owners.main.sourceVersionId);
        assert.notEqual(initial.existingPair.recovery.versionId, initial.existingPair.candidate.versionId);
        assert.equal(existing.inspected.moduleSHA256, target.moduleSHA256);
        const args = { directory: join(directory, `${role}-main`), role, owner: 'main', service: 'gachia',
          versionId: existing.versionId, inspected: existing.inspected, row: target };
        record({ phase: 'observation_intent', role, versionId: existing.versionId });
        await transport.revalidate(args);
        const proof = await transport.observe(args);
        assert.equal(proof.status, 'passed'); assert.equal(proof.observationMode, 'cloud_exact_version');
        assert.equal(proof.service, 'gachia'); assert.equal(proof.versionId, existing.versionId);
        assert.equal(proof.parserVersion, 'streaming-v2'); assert.equal(proof.parserPin, unifiedHTMLParserPin('streaming-v2'));
        assert(SHA.test(proof.evidenceSHA256));
        await transport.revalidate(args); await recheck();
        accepted[role].main = { service: 'gachia', versionId: existing.versionId, moduleSHA256: target.moduleSHA256,
          artifactPin: target.artifactPin, versionPin: existing.inspected.versionPin, moduleProof: existing.inspected.moduleProof,
          evidenceSHA256: proof.evidenceSHA256, parserVersion: proof.parserVersion, parserPin: proof.parserPin, acceptedAt: Date.now() };
        record({ phase: 'preview_accepted', role, proof: accepted[role].main });
      }
      for (const role of ['recovery', 'candidate']) fresh(accepted[role].main.acceptedAt);
      record({ phase: 'all_cloud_previews_accepted_no_promotion', accepted });
      const receipt = { schemaVersion: 1, kind: 'unified_readonly_uploaded_pair_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion',
        releaseKey: initial.releaseKey, transportPin: initial.transportPin, stop: initial.stop, stopPin: initial.stopPin,
        networkPin: initial.networkPin, accepted, journalPin: digest(readFileSync(journal)), cloudWrites: false,
        productionPromoted: false, activationSupported: false };
      const raw = JSON.stringify(receipt, null, 2) + '\n'; writeFileSync(join(directory, 'receipt.json'), raw, { flag: 'wx', mode: 0o600 });
      return { directory, receiptPin: digest(raw), ...receipt };
    } catch (error) {
      record({ phase: 'stopped', accepted, error: error.message, cloudWrites: false, automaticRetry: false, automaticRollback: false });
      throw error;
    }
  });
}

// This narrow reader accepts the actual observed state: one known Main recovery
// upload, zero HTTP observations and no candidate intent. It never treats a
// lost upload response, semantic failure or partial candidate as resumable.
export function readUnifiedObservationStop({ run, stop, value }) {
  assertUnifiedPreviewIdentity(value, value.transportPin); assert.deepEqual(value.ownerOrder, ['main']);
  const root = join(run, `unified-cloud-preview-${value.transportPin}`), service = value.owners.main.service;
  const expected = { journal: join(run, `unified-preview-${value.transportPin}.jsonl`),
    http: join(root, 'recovery-main/http/result.json'), version: join(root, 'recovery-main/version.json'), module: join(root, 'recovery-main/module/receipt.json') };
  assert.deepEqual(Object.keys(stop).sort(), Object.keys(expected).sort());
  for (const [name, file] of Object.entries(expected)) assert.equal(stop[name].path, file, 'Unexpected stopped evidence path');
  const raw = pinned(stop.journal.path, stop.journal.pin); assert(raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'upload_intent', 'upload_response', 'upload_returned', 'stopped', 'read_only_reconciliation'],
    'Only a known recovery upload with no candidate intent can continue');
  let at = -Infinity;
  for (const row of rows) {
    assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.transportPin, value.transportPin);
    const time = Date.parse(row.at); assert(time >= at && time <= Date.now(), 'Stopped upload chronology changed'); at = time;
  }
  assert.equal(rows[0].directory, root); assertTopology(rows[0].baseline, value.baseline);
  const versionId = rows[2].versionId; exactUnifiedPreviewOrigin(service, versionId);
  assert.notEqual(versionId, value.owners.main.sourceVersionId);
  for (const row of rows.slice(1, 4)) { assert.equal(row.owner, 'main'); assert.equal(row.role, 'recovery'); assert.equal(row.service, service); }
  assert.equal(rows[1].moduleSHA256, value.owners.main.recovery.moduleSHA256); assert.equal(rows[3].versionId, versionId);
  assert.deepEqual(rows[4].pendingOperation, { role: 'recovery', owner: 'main', service, versionId });
  assert.deepEqual(rows[4].uploaded, { recovery: { [service]: { versionId } } });
  assert.deepEqual(rows[4].accepted, { recovery: {} }); assert.equal(rows[4].error, 'fetch failed');
  assert.equal(rows[4].automaticRetry, false); assert.equal(rows[4].automaticRollback, false);
  assertTopology(rows[0].baseline, rows[5].snapshot);
  for (const role of ['recovery', 'candidate']) { assert.equal(rows[5][role].status, 'baseline_active'); assert.deepEqual(rows[5][role].drift, []); assert.equal(rows[5][role].cloudWrites, false); }
  assert.deepEqual(Object.keys(rows[5].candidate.owners), []);
  const http = JSON.parse(pinned(stop.http.path, stop.http.pin));
  assert.equal(http.schemaVersion, 1);
  assert.equal(http.kind, 'unified_exact_version_preview'); assert.equal(http.status, 'failed'); assert.equal(http.service, service);
  assert.equal(http.versionId, versionId); assert.equal(http.origin, exactUnifiedPreviewOrigin(service, versionId));
  assert.equal(http.observationMode, 'cloud_exact_version'); assert.equal(http.parserPin, unifiedHTMLParserPin());
  assert.equal(http.error, 'fetch failed'); assert.deepEqual(http.observations, []);
  const version = JSON.parse(pinned(stop.version.path, stop.version.pin)), module = JSON.parse(pinned(stop.module.path, stop.module.pin));
  assert.equal(version.id, versionId); assert.equal(module.schemaVersion, 1); assert.equal(module.kind, 'unified_upload_time_module_receipt');
  assert.equal(module.service, service); assert.equal(module.versionId, versionId); assert.equal(module.moduleSHA256, value.owners.main.recovery.moduleSHA256);
  return { stop, versionId, inspected: { moduleSHA256: module.moduleSHA256, versionPin: stop.version.pin, moduleProof: stop.module } };
}

// A separate exclusive continuation observes the existing recovery UUID and
// performs only the never-attempted candidate upload. It cannot re-upload or
// promote the recovery, and cannot retry any stopped candidate attempt.
export async function executeUnifiedPreviewCompletion({ run, directory, verify, authorize, transport }) {
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify()); assertUnifiedPreviewUploadScope(initial, initial.transportPin);
    assert.deepEqual(initial.ownerOrder, ['main']); assert(SHA.test(initial.stopPin) && SHA.test(initial.networkPin));
    assert.equal(await authorize(initial), initial.releaseKey);
    const journal = join(run, `unified-preview-completion-${initial.transportPin}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.releaseKey,
      transportPin: initial.transportPin, stopPin: initial.stopPin, ...row }) + '\n', { flush: true });
    const accepted = { recovery: {}, candidate: {} }, uploaded = { gachia: { versionId: initial.existingRecovery.versionId } };
    let pendingOperation, lastAt = initial.identityObservedAt;
    const recheck = async () => {
      const current = await verify(); assertUnifiedPreviewUploadScope(current, initial.transportPin);
      assert(current.identityObservedAt >= lastAt);
      assert.deepEqual({ ...current, identityObservedAt: initial.identityObservedAt }, initial, 'Completion release or stopped evidence changed');
      lastAt = current.identityObservedAt;
    };
    const accept = (role, versionId, inspected, proof) => {
      const target = initial.owners.main[role];
      assert.equal(inspected.moduleSHA256, target.moduleSHA256); assert(SHA.test(inspected.versionPin) && SHA.test(inspected.moduleProof?.pin));
      assert.equal(proof.status, 'passed'); assert.equal(proof.observationMode, 'cloud_exact_version');
      assert.equal(proof.parserVersion, 'streaming-v2'); assert.equal(proof.parserPin, unifiedHTMLParserPin('streaming-v2'));
      assert.equal(proof.service, 'gachia'); assert.equal(proof.versionId, versionId); assert(SHA.test(proof.evidenceSHA256));
      accepted[role].main = { service: 'gachia', versionId, moduleSHA256: target.moduleSHA256, artifactPin: target.artifactPin,
        versionPin: inspected.versionPin, moduleProof: inspected.moduleProof, evidenceSHA256: proof.evidenceSHA256,
        parserVersion: proof.parserVersion, parserPin: proof.parserPin, acceptedAt: Date.now() };
    };
    record({ phase: 'baseline', baseline: initial.baseline, directory, stop: initial.stop });
    try {
      mkdirSync(directory, { mode: 0o700 }); mkdirSync(join(directory, 'recovery-main'), { mode: 0o700 });
      await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      const existing = initial.existingRecovery, recoveryArgs = { directory, owner: 'main', role: 'recovery', service: 'gachia',
        versionId: existing.versionId, row: initial.owners.main.recovery, inspected: existing.inspected };
      pendingOperation = { phase: 'observe_existing_recovery', versionId: existing.versionId };
      record({ phase: 'existing_recovery_observation_intent', versionId: existing.versionId });
      await transport.reuseRecovery(recoveryArgs); await transport.revalidate(recoveryArgs);
      const recovery = await transport.preview(recoveryArgs);
      await transport.revalidate(recoveryArgs); await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      accept('recovery', existing.versionId, existing.inspected, recovery); record({ phase: 'existing_recovery_preview_accepted', proof: accepted.recovery.main }); pendingOperation = undefined;
      await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      const args = { directory, owner: 'main', role: 'candidate', service: 'gachia', row: initial.owners.main.candidate };
      pendingOperation = { phase: 'upload', role: 'candidate', owner: 'main', service: 'gachia' };
      record({ ...pendingOperation, phase: 'upload_intent', moduleSHA256: args.row.moduleSHA256 });
      const result = await transport.upload(args); exactUnifiedPreviewOrigin('gachia', result.versionId);
      assert.notEqual(result.versionId, existing.versionId); assert.notEqual(result.versionId, initial.owners.main.sourceVersionId);
      pendingOperation.versionId = result.versionId; uploaded.candidate = { versionId: result.versionId };
      record({ phase: 'upload_response', versionId: result.versionId });
      const inspected = await transport.inspect({ ...args, versionId: result.versionId });
      await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      const previewArgs = { ...args, versionId: result.versionId, inspected }, proof = await transport.preview(previewArgs);
      await transport.revalidate(previewArgs); await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      accept('candidate', result.versionId, inspected, proof); record({ phase: 'candidate_preview_accepted', proof: accepted.candidate.main }); pendingOperation = undefined;
      await recheck(); assertTopology(initial.baseline, await transport.snapshot());
      for (const role of ['recovery', 'candidate']) fresh(accepted[role].main.acceptedAt);
      record({ phase: 'all_cloud_previews_accepted_no_promotion', accepted });
      const receipt = { schemaVersion: 1, kind: 'unified_completed_observation_stop_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion',
        transportPin: initial.transportPin, releaseKey: initial.releaseKey, stop: initial.stop, stopPin: initial.stopPin, networkPin: initial.networkPin, accepted,
        journalPin: digest(readFileSync(journal)), productionPromoted: false, activationSupported: false };
      const raw = JSON.stringify(receipt, null, 2) + '\n'; writeFileSync(join(directory, 'receipt.json'), raw, { flag: 'wx', mode: 0o600 });
      return { directory, receiptPin: digest(raw), ...receipt };
    } catch (error) {
      record({ phase: 'stopped', pendingOperation, accepted, error: error.message, automaticRetry: false, automaticRollback: false });
      try {
        const snapshot = await transport.snapshot(), candidate = pendingOperation?.phase === 'upload' ? pendingOperation.versionId : accepted.candidate.main?.versionId;
        record({ phase: 'read_only_reconciliation', snapshot, recovery: reconcileRelease(initial.baseline, snapshot, { gachia: uploaded.gachia }),
          candidate: reconcileRelease(initial.baseline, snapshot, candidate ? { gachia: { versionId: candidate } } : {}), pendingOperation,
          candidateUploadOutcomeUnknown: pendingOperation?.phase === 'upload' && !pendingOperation.versionId });
      } catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

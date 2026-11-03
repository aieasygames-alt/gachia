import assert from 'node:assert/strict';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { artifactFiles } from './desktop-publish.mjs';
import { digest, pinnedJson } from './desktop-release-assets.mjs';
import { assertTopology, reconcileRelease } from './desktop-cloud-release.mjs';
import { exactPreviewOrigin, validatePreviewResponse } from './desktop-version-preview.mjs';
import { recoveryBaselineSHA256 } from './desktop-published-baseline.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';

const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const serviceFor = owner => owner === 'main' ? 'gachia' : `gachia-game-${owner}`;
function bytes(path) {
  assert.equal(realpathSync(path), resolve(path), 'Linked release evidence forbidden');
  const data = readFileSync(path); assert(data.length <= 16 * 1024 * 1024, 'Evidence budget exceeded'); return data;
}

// Diagnostics may read a torn final line, but such a journal never authorizes
// continuation. Complete preceding intentions remain visible for reconciliation.
export function readReleaseJournal(path, identity, pin) {
  const data = bytes(path), sha256 = digest(data);
  if (pin !== undefined) { assert(SHA.test(pin)); assert.equal(sha256, pin, 'Journal digest changed'); }
  const text = data.toString('utf8'), lines = text.split('\n');
  const incompleteTail = !text.endsWith('\n');
  if (!incompleteTail) lines.pop();
  const rows = []; const damaged = incompleteTail;
  for (let i = 0; i < lines.length; i++) {
    let row;
    try { row = JSON.parse(lines[i]); }
    catch (error) { if (i === lines.length - 1 && incompleteTail) break; throw error; }
    for (const [key, value] of Object.entries(identity)) assert.equal(row[key], value, `Journal identity mismatch: ${key}`);
    assert(Number.isFinite(Date.parse(row.at)), 'Invalid journal time');
    assert(typeof row.phase === 'string'); rows.push(row);
  }
  assert(rows.length > 0, 'No complete journal records');
  return { rows, sha256, damaged };
}

export function reconcileJournal(journal, current) {
  const { rows } = journal;
  assert.equal(rows[0].phase, 'baseline', 'Missing journal baseline');
  const uploaded = { ...(rows[0].accepted ?? {}) }; let pendingOperation;
  for (const [service, proof] of Object.entries(uploaded)) {
    assert(['gachia', 'gachia-game-genshin', 'gachia-game-nte'].includes(service)); assert(UUID.test(proof.versionId));
  }
  for (const row of rows.slice(1)) {
    if (row.phase === 'upload_intent' || row.phase === 'promotion_intent') {
      assert(['gachia', 'gachia-game-genshin', 'gachia-game-nte'].includes(row.service), 'Unexpected journal owner');
      assert.equal(row.service, serviceFor(row.owner));
      if (row.phase === 'promotion_intent') assert.equal(row.versionId, uploaded[row.service]?.versionId);
      pendingOperation = { phase: row.phase.replace('_intent', ''), service: row.service, owner: row.owner, ...(row.versionId ? { versionId: row.versionId } : {}) };
    } else if (row.phase === 'uploaded') {
      assert.equal(row.service, pendingOperation?.service); assert.equal(pendingOperation?.phase, 'upload');
      assert(UUID.test(row.result?.versionId)); assert(!uploaded[row.service], 'Duplicate upload identity');
      uploaded[row.service] = row.result; pendingOperation = undefined;
    } else if (row.phase === 'promoted') {
      assert.equal(row.service, pendingOperation?.service); assert.equal(pendingOperation?.phase, 'promotion');
      assert.equal(row.versionId, pendingOperation.versionId); pendingOperation = undefined;
    }
  }
  const result = reconcileRelease(rows[0].baseline, current, uploaded);
  if (pendingOperation) result.unresolvedOperation = pendingOperation;
  if (pendingOperation?.phase === 'upload' && result.status === 'baseline_active') result.status = 'baseline_active_upload_outcome_unknown';
  if (journal.damaged) result.status = 'damaged_journal_requires_manual_reconciliation';
  return { ...result, journalSHA256: journal.sha256, journalDamaged: journal.damaged, promotionAuthorized: false };
}

export function acceptedPreviewJournal(journal, verified, now = Date.now(), maxAge = 15 * 60 * 1000) {
  const { plan, receipt, manifest } = verified;
  assert.equal(plan.preview, false, 'Rehearsal candidates cannot continue to promotion');
  assert(plan.changed.length > 0, 'No editorial change');
  const scope = assertReleaseScope(plan, manifest.owners);
  assert(!journal.damaged, 'Incomplete journal cannot authorize promotion');
  const rows = journal.rows;
  assert.equal(rows.length, 8, 'Only a completed preview-only journal may continue');
  assert.equal(rows[0].phase, 'baseline'); assertTopology(manifest.snapshot, rows[0].baseline);
  assert.equal(rows[7].phase, 'cloud_previews_accepted_no_promotion');
  assert.deepEqual(Object.keys(rows[7].accepted).sort(), [...scope.services].sort());
  const accepted = {};
  for (const [index, owner] of plan.owners.entries()) {
    const service = serviceFor(owner), record = manifest.owners[owner];
    const [intent, upload, preview] = rows.slice(1 + index * 3, 4 + index * 3);
    for (const [row, phase] of [[intent, 'upload_intent'], [upload, 'uploaded'], [preview, 'preview_accepted']]) {
      assert.equal(row.phase, phase); assert.equal(row.owner, owner); assert.equal(row.service, service);
    }
    assert.equal(intent.artifactSHA256, record.artifactSHA256);
    const proof = preview.proof, result = upload.result, saved = rows[7].accepted[service];
    assert.equal(proof.service, service); assert.equal(proof.owner, owner);
    assert(UUID.test(result.versionId) && result.versionId !== receipt.owners[owner].previousVersion);
    for (const value of [result, proof]) {
      assert.equal(value.releaseKey, plan.releaseKey); assert.equal(value.artifactSHA256, record.artifactSHA256);
      assert.equal(value.moduleSHA256, record.moduleSHA256); assert.equal(value.versionId, result.versionId);
    }
    assert.equal(proof.status, 'passed'); assert(SHA.test(proof.evidenceSHA256));
    assert.deepEqual(saved, { ...proof, acceptedAt: saved.acceptedAt });
    assert(Number.isSafeInteger(saved.acceptedAt) && saved.acceptedAt <= now && now - saved.acceptedAt < maxAge, 'Preview acceptance expired or in future');
    assert(Math.abs(Date.parse(preview.at) - saved.acceptedAt) < 1000, 'Preview time differs from journal');
    accepted[service] = saved;
  }
  return accepted;
}

export function verifySavedPreview(directory, proof, references) {
  assert(references.length > 0 && references.length <= 2500 && new Set(references.map(row => row.path)).size === references.length, 'Invalid preview reference coverage');
  const evidence = pinnedJson(join(directory, 'result.json'), proof.evidenceSHA256);
  assert.equal(evidence.status, 'passed'); assert.equal(evidence.service, proof.service);
  assert.equal(evidence.versionId, proof.versionId); assert.equal(evidence.origin, exactPreviewOrigin(proof.service, proof.versionId));
  assert.equal(evidence.observations.length, references.length, 'Missing network coverage');
  for (const [i, reference] of references.entries()) {
    const row = evidence.observations[i]; assert.equal(row.path, reference.path); assert.equal(row.bodyFile, `${i}.body`);
    const body = bytes(join(directory, row.bodyFile)); assert.equal(body.length, row.bytes); assert.equal(digest(body), row.sha256, 'Preview response bytes changed');
    validatePreviewResponse({ path: row.path, response: new Response(null, { status: row.status, headers: row.headers }), bytes: body, reference });
  }
  return { service: proof.service, versionId: proof.versionId, responses: references.length, evidenceSHA256: proof.evidenceSHA256 };
}

export function verifyRecoveryCompatibility(path, pin, verified) {
  const recovery = pinnedJson(path, pin), { plan, receipt, directory: retained } = verified;
  assert.equal(recovery.status, 'old_runtime_with_old_and_new_static_local_http_verified');
  assert.equal(recovery.releaseKey, plan.releaseKey); assert.equal(recovery.retentionPin, verified.retentionPin);
  assert.equal(recovery.cloudWrites, false); assert.equal(recovery.rawUuidRollbackAuthorized, false);
  assert.deepEqual(Object.keys(recovery.owners).sort(), [...plan.owners].sort());
  const publishedBaselineSHA256 = recoveryBaselineSHA256(recovery, verified);
  const owners = {};
  for (const owner of plan.owners) {
    const row = recovery.owners[owner]; assert.equal(row.status, 'passed'); assert.equal(row.oldVersionId, receipt.owners[owner].previousVersion);
    const tree = pinnedJson(join(recovery.directory, `${owner}-inventory.json`), row.artifactSHA256);
    assert.deepEqual(artifactFiles(join(recovery.directory, owner, '.open-next')), tree, 'Recovery artifact changed');
    const forward = pinnedJson(join(retained, `${owner}-inventory.json`), receipt.owners[owner].artifactSHA256);
    const staticFiles = forward.filter(x => x.type === 'file' && (x.path.startsWith('assets/_next/static/') || x.path.startsWith(`assets/_games/${owner}/_next/static/`)));
    assert(staticFiles.length > 0, 'Empty recovery coverage');
    const observations = new Map();
    for (const observation of row.observations) {
      assert(!observations.has(observation.path), 'Duplicate recovery HTTP path');
      assert.match(observation.bodyFile, new RegExp(`^${owner}-[0-9]+\\.body$`));
      assert.equal(observation.status, 200); assert.equal(digest(bytes(join(recovery.directory, observation.bodyFile))), observation.sha256, 'Recovery HTTP evidence changed');
      observations.set(observation.path, observation);
    }
    for (const file of staticFiles) {
      assert(tree.some(x => x.path === file.path && x.sha256 === file.sha256), 'Recovery lacks candidate asset');
      const url = '/' + file.path.slice(7).split('/').map(encodeURIComponent).join('/');
      assert.equal(observations.get(url)?.sha256, file.sha256, 'Recovery HTTP lacks candidate asset');
    }
    assert(observations.has('/sitemap.xml'));
    if (owner === 'main') assert.equal(observations.get(`/data/${plan.game}/raw-guides.json`)?.sha256, publishedBaselineSHA256, 'Recovery Main content is not baseline');
    else for (const key of plan.changed) assert(observations.has(`/zh/${plan.game}/guides/${key}`), 'Missing baseline guide response');
    owners[owner] = { oldVersionId: row.oldVersionId, artifactSHA256: row.artifactSHA256, staticPaths: staticFiles.length, responses: row.observations.length };
  }
  return { status: 'local_recovery_evidence_verified', owners, recoveryPin: pin, cloudRecoveryAccepted: false, rawUuidRollbackAuthorized: false, productionReady: false };
}

export function saveReadiness(path, result) {
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { ...result, evidencePath: path, evidenceSHA256: digest(readFileSync(path)) };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { applicationPreviewService } from '../src/application-preview.mjs';

test('independent snapshot preserves seven draft/execution tables; restart fences unknown execution', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-draft-recovery-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'fixture.sqlite');
  const store = openStore(filename, { intentNow: () => 10000 }); t.after(() => store.close());
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', body: 'Synthetic fixture only',
    server: 'Global', language: 'en', title: 'Fixture', url: 'https://example.com' }).evidence;
  const fact = store.createFact({ evidenceId: evidence.id, entity: 'Fixture', field: 'claim', value: evidence.body,
    quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' }).fact;
  const confirmed = store.reviewFact({ factId: fact.id, expectedRevision: 0, decision: 'confirmed', reviewerType: 'agent',
    authorizationBasis: 'Synthetic test only, not a real content decision', reviewer: 'fixture', note: 'Synthetic only',
    sourceChecked: true, scopeChecked: true, valueChecked: true }).fact;
  const batch = store.createBatch(evidence.id, () => ({ gameId: 'hi3' })).batch;
  const revision = store.createRevision({ batchId: batch.id, expectedLatest: 0, requestId: randomUUID(), note: 'Fixture only',
    selectedFacts: [{ id: confirmed.id, revision: confirmed.revision }] },
  { baseline: { commit: 'fixture' }, index: { fingerprint: 'fixture', deployment: {}, findings: [] } }).revision;
  const workspace = store.reserveWorkspace(revision.id, () => ({ id: randomUUID(), revisionId: revision.id,
    path: join(directory, 'absent-workspace'), status: 'needs_reconciliation' }));
  const validation = store.saveValidation({ id: randomUUID(), workspaceId: workspace.id, revisionId: revision.id,
    summary: { status: 'partial_pass', failed: 0 }, checks: [{ ruleId: 'build', status: 'not_covered' }] });
  const packet = { workspaceId: workspace.id, validation: { id: validation.id }, revisionId: revision.id,
    digest: 'synthetic-digest', confirmedFacts: [confirmed], contents: [{ path: 'fixture', content: 'synthetic bytes' }] };
  const input = { requestId: randomUUID(), expectedLatest: 0, decision: 'accepted', reviewerType: 'agent',
    authorizationBasis: 'Synthetic only', reviewer: 'fixture', note: 'Storage fixture, no actual diff acceptance' };
  const review = store.saveDraftReview(input, packet, 'request-digest').review;
  const preview = { id: randomUUID(), reviewId: review.id, packetDigest: packet.digest,
    pages: [{ html: '<p>Synthetic HTML bytes</p>' }], capabilities: { publish: false } };
  store.saveDataPreview(preview);
  store.saveApplicationPreview({ id: 'app-running', reviewId: review.id, workspaceId: workspace.id,
    packetDigest: packet.digest, status: 'running', pid: 123456789, origin: 'http://127.0.0.1:65530' });
  store.saveExecutionMaterial({ id: 'material', reviewId: review.id, workspaceId: workspace.id,
    packetDigest: packet.digest, manifest: { digest: 'fixture' }, dependencyPlans: [{ id: 'plan' }] });
  const intentInput = { requestId: 'fixture-intent', materialId: 'material', planId: 'plan', planDigest: 'a'.repeat(64),
    ownerInstanceId: 'fixture-owner', ownerNonce: 'b'.repeat(64), leaseMs: 1000 };
  store.executionIntents.reserve(intentInput);
  const tables = ['draft_workspaces', 'draft_validations', 'draft_reviews', 'data_previews',
    'application_previews', 'execution_materials', 'execution_intents'];
  const original = new DatabaseSync(filename);
  const rows = (db) => Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
  const expected = rows(original);
  const snapshot = join(directory, 'snapshot.sqlite');
  original.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`); original.close();
  const restoredFile = join(directory, 'separate-restored.sqlite'); copyFileSync(snapshot, restoredFile);
  const raw = new DatabaseSync(restoredFile);
  assert.deepEqual(rows(raw), expected);
  assert.equal(raw.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(raw.prepare('PRAGMA foreign_key_check').all(), []); raw.close();
  const restored = openStore(restoredFile, { intentNow: () => 12000 }); t.after(() => restored.close());
  assert.equal(restored.draftReviews()[0].reviewerType, 'agent');
  assert.equal(restored.draftReviews()[0].snapshot.digest, packet.digest);
  assert.equal(restored.dataPreviews()[0].pages[0].html, preview.pages[0].html);
  assert.equal(restored.findDraftReviewRequest(input.requestId, 'request-digest').id, review.id);
  assert.throws(() => restored.findDraftReviewRequest(input.requestId, 'changed'), /请求标识/);
  assert.equal(restored.saveDataPreview(preview).duplicate, true);
  assert.equal(restored.executionIntents.list()[0].status, 'needs_reconciliation');
  assert.throws(() => restored.executionIntents.reserve({ ...intentInput, requestId: 'replacement' }), /待对账/);
  let launches = 0;
  const service = applicationPreviewService(restored, { acceptedReview() { throw new Error('Unavailable fixture workspace'); } },
    { launch() { launches++; throw new Error('Must not launch'); } });
  await service.close();
  assert.equal(launches, 0);
  assert.equal(restored.applicationPreviews()[0].status, 'needs_reconciliation');
  assert.equal(restored.workspaces()[0].status, 'needs_reconciliation');
  // Source DB remains unchanged; only the separate restored fixture was reconciled.
  assert.equal(store.applicationPreviews()[0].status, 'running');
  assert.equal(store.executionIntents.list()[0].status, 'reserved');
  const sourceCheck = new DatabaseSync(filename, { readOnly: true });
  try { assert.deepEqual(rows(sourceCheck), expected); }
  finally { sourceCheck.close(); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.mjs';
import { startWorkbench } from '../src/server.mjs';
import { buildCleanupPlan } from '../src/cleanup-plan.mjs';

test('referenced evidence, pending drafts and reconciliation records stay protected', () => {
  const report = buildCleanupPlan({ complete: true, coverage: [], records: {
    evidence: [{ id: 'used' }, { id: 'unlinked' }], facts: [{ id: 'f', evidenceId: 'used', status: 'needs_review' }],
    workspaces: [{ id: 'w', status: 'preparing' }], applicationPreviews: [{ id: 'p', workspaceId: 'w', status: 'needs_reconciliation' }],
  } });
  assert.equal(report.summary.candidates, 1);
  assert.equal(report.items.find((item) => item.id === 'used').disposition, 'protected');
  assert.ok(report.items.find((item) => item.id === 'f').reasons.includes('pending_review'));
  assert.ok(report.items.find((item) => item.id === 'p').reasons.includes('active_or_unreconciled'));
  assert.equal(report.retentionPolicy, 'not_configured');
  assert.ok(Object.values(report.permissions).every((value) => value === false));
});

test('incomplete scans, dangling references and duplicate IDs fail closed', () => {
  for (const snapshot of [
    { complete: false, records: { evidence: [{ id: 'a' }] } },
    { complete: true, records: { evidence: [{ id: 'a' }], facts: [{ id: 'f', evidenceId: 'missing' }] } },
    { complete: true, records: { evidence: [{ id: 'a' }, { id: 'a' }] } },
  ]) {
    const before = structuredClone(snapshot);
    const report = buildCleanupPlan(snapshot);
    assert.equal(report.complete, false); assert.equal(report.summary.candidates, 0);
    assert.deepEqual(snapshot, before);
    assert.ok(Object.values(report.permissions).every((value) => value === false));
  }
});

test('output and diagnostic truncation remain explicit without losing summary counts', () => {
  const report = buildCleanupPlan({ complete: true, records: {
    evidence: Array.from({ length: 600 }, (_, i) => ({ id: `e${i}` })),
    facts: Array.from({ length: 120 }, (_, i) => ({ id: `f${i}`, evidenceId: 'missing' })),
  } });
  assert.equal(report.items.length, 500); assert.equal(report.itemsTruncated, true);
  assert.equal(report.summary.observed, 720); assert.equal(report.summary.candidates, 0);
  assert.equal(report.diagnostics.length, 100); assert.equal(report.diagnosticCount, 120);
  assert.equal(report.issueCounts.unresolved_reference, 120);
});

test('record, reference and oversized-payload budgets are reported and suppress candidates', () => {
  const report = buildCleanupPlan({ complete: true, records: { evidence: [{ id: 'e' }] },
    coverage: [{ kind: 'evidence', truncated: true }], referenceCoverage: [{ kind: 'batches', truncated: true, skippedOversizedPayloads: 2 }] });
  assert.equal(report.assessment, 'incomplete_all_candidates_suppressed');
  assert.equal(report.summary.candidates, 0);
  assert.deepEqual(report.issueCounts, { record_budget_exceeded: 1, reference_budget_exceeded: 1, payload_byte_budget_exceeded: 2 });
  assert.equal(report.budgets.hardTimeLimit, false);
});

test('oversized material is skipped before nested traversal and cannot produce cleanup candidates', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-cleanup-budget-'));
  const store = openStore(join(directory, 'workbench.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  const evidence = store.importEvidence({ gameId: 'hi3', title: 'Fixture', body: 'body' }).evidence;
  store.saveExecutionMaterial({ id: 'large', snapshot: { evidenceIds: [evidence.id], content: 'x'.repeat(1048576) } });
  const snapshot = store.cleanupSnapshot();
  const coverage = snapshot.referenceCoverage.find((item) => item.kind === 'executionMaterials');
  assert.equal(coverage.skippedOversizedPayloads, 1);
  assert.equal(coverage.observed, 0);
  assert.equal(snapshot.complete, false);
  assert.equal(buildCleanupPlan(snapshot).summary.candidates, 0);
});

test('nested traversal uses the same newest record window as metadata projection', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-cleanup-window-'));
  const store = openStore(join(directory, 'workbench.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  store.saveExecutionMaterial({ id: 'oldest', snapshot: { evidenceIds: ['unobserved-old-reference'] } });
  for (let i = 0; i < 2000; i++) store.saveExecutionMaterial({ id: `new-${i}` });
  const snapshot = store.cleanupSnapshot();
  assert.equal(snapshot.records.executionMaterials.length, 2000);
  assert.equal(snapshot.coverage.find((item) => item.kind === 'executionMaterials').truncated, true);
  assert.ok(!snapshot.nestedReferences.some((edge) => edge.id === 'oldest'));
  assert.equal(buildCleanupPlan(snapshot).summary.candidates, 0);
});

test('store projects metadata only; plan HTTP is authenticated and creates no events', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-cleanup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'workbench.sqlite'); const store = openStore(filename);
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', title: 'Fixture', url: 'https://example.com',
    server: 'Global', language: 'en', body: 'SECRET_BODY_NOT_FOR_DIAGNOSTICS' }).evidence;
  store.createFact({ evidenceId: evidence.id, entity: 'Fixture', field: 'claim', value: evidence.body, quote: evidence.body,
    server: 'Global', lifecycle: 'unknown', validFrom: '', validUntil: '' });
  const before = store.events(); const snapshot = store.cleanupSnapshot();
  assert.ok(!JSON.stringify(snapshot).includes('SECRET_BODY'));
  assert.equal(snapshot.coverage.length, 14);
  assert.equal(buildCleanupPlan(snapshot).summary.candidates, 0);
  assert.deepEqual(store.events(), before); store.close();
  const app = await startWorkbench({ dataDir: directory, port: 0 }); t.after(() => app.close());
  assert.equal((await fetch(`${app.origin}/api/cleanup-plan`)).status, 401);
  const response = await fetch(`${app.origin}/api/cleanup-plan`, { headers: { Authorization: `Bearer ${app.token}` } });
  assert.equal(response.status, 200);
  const report = await response.json(); assert.equal(report.permissions.delete, false);
  assert.ok(!JSON.stringify(report).includes('SECRET_BODY'));
});

test('nested snapshots and source provenance protect evidence without projecting body or HTML', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-cleanup-nested-'));
  const store = openStore(join(directory, 'workbench.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  store.saveSourceRecord({ id: 'hi3-global-en', digest: 'older-digest', status: 'success_changed',
    articles: [{ rawHtml: 'SECRET_HTML' }] });
  store.saveSourceRecord({ id: 'hi3-global-en', digest: 'new-digest', status: 'success_changed' });
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', title: 'Fixture', url: 'https://example.com',
    server: 'Global', language: 'en', body: 'SECRET_BODY', sourceSnapshot: { sourceId: 'hi3-global-en', digest: 'older-digest' } }).evidence;
  const manual = store.importEvidence({ gameId: 'hi3', title: 'Nested only', body: 'SECRET_SECOND', server: 'Global', language: 'en' }).evidence;
  const fact = store.createFact({ evidenceId: manual.id, entity: 'Fixture', field: 'claim', value: 'SECRET_SECOND', quote: 'SECRET_SECOND',
    server: 'Global', lifecycle: 'unknown', validFrom: '', validUntil: '' }).fact;
  store.saveExecutionMaterial({ id: 'material', snapshot: { evidenceIds: [manual.id], pendingFacts: [{ evidenceId: manual.id }],
    confirmedFacts: [{ id: fact.id, evidenceId: manual.id }], factSnapshot: [{ id: fact.id }],
    contents: [{ content: 'SECRET_DIFF' }] } });
  const snapshot = store.cleanupSnapshot();
  assert.ok(!JSON.stringify(snapshot).includes('SECRET_'));
  assert.ok(snapshot.nestedReferences.some((edge) => edge.targetId === manual.id));
  assert.ok(snapshot.nestedReferences.some((edge) => edge.targetId === fact.id && edge.path.includes('confirmedFacts')));
  assert.ok(snapshot.nestedReferences.some((edge) => edge.targetId === fact.id && edge.path.includes('factSnapshot')));
  const report = buildCleanupPlan(snapshot);
  assert.equal(report.complete, true); assert.equal(report.summary.candidates, 0);
  assert.ok(report.items.find((item) => item.id === evidence.id).reasons.includes('source_provenance_protected'));
  const oldRun = report.items.find((item) => item.kind === 'sourceRuns' && item.id === '1');
  assert.ok(oldRun.referencedBy.some((reference) => reference.includes(evidence.id)));
  assert.ok(report.items.find((item) => item.id === manual.id).reasons.includes('referenced_record'));
});

test('missing nested targets and missing source digest cancel all candidates', () => {
  for (const snapshot of [
    { records: { evidence: [{ id: 'e' }], batches: [{ id: 'b' }] },
      nestedReferences: [{ kind: 'batches', id: 'b', targetKind: 'facts', targetId: 'missing', path: '$.confirmedFacts[0].id' }] },
    { records: { evidence: [{ id: 'e', sourceId: 's', sourceDigest: 'missing' }], officialSources: [{ id: 's', digest: 'other' }] } },
  ]) {
    const report = buildCleanupPlan({ ...snapshot, complete: true });
    assert.equal(report.complete, false); assert.equal(report.summary.candidates, 0);
    assert.ok(report.diagnosticCount > 0);
  }
});

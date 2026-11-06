import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { reconcileUnifiedMainPromotion } from './unified-promotion-reconciliation.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(t) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-reconcile-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const directory = join(run, `unified-main-promotion-${uuid(700)}`), renewalDirectory = join(directory, 'renewal');
  mkdirSync(renewalDirectory, { recursive: true });
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(20 + i), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const rows = [{ phase: 'baseline', ownerOrder: ['main'], directory, renewalDirectory, baseline, accepted: { candidate: { main: { service: 'gachia', versionId: uuid(100) } }, recovery: { main: { service: 'gachia', versionId: uuid(101) } } } },
    { phase: 'remote_versions_verified' }, { phase: 'promotion_intent', owner: 'main', service: 'gachia', versionId: uuid(100) },
    { phase: 'stopped', automaticRetry: false, automaticRollback: false }, { phase: 'observation_unavailable' }]
    .map(row => ({ at: new Date().toISOString(), releaseKey: sha, transportPin: sha, previewPin: sha, renewalPin: sha, ...row }));
  const file = join(run, `unified-promotion-${sha}.jsonl`), raw = rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(file, raw);
  const input = { run, pin: digest(raw), transportPin: sha, releaseKey: sha }, current = structuredClone(baseline);
  return { input, current, file, rows };
}

for (const [state, status] of [['baseline', 'baseline_active'], ['candidate', 'candidate_active_public_acceptance_still_required'],
  ['recovery', 'compatible_recovery_active_acceptance_still_required'], ['unrelated', 'drift_requires_manual_reconciliation'],
  ['split', 'drift_requires_manual_reconciliation'], ['other-service', 'drift_requires_manual_reconciliation'], ['topology', 'drift_requires_manual_reconciliation']]) {
  test(`read-only promotion reconciliation reports ${state} without granting acceptance or writes`, async t => {
    const f = fixture(t);
    if (['candidate', 'recovery', 'unrelated'].includes(state)) f.current.services.gachia = { id: uuid(999), versions: [{ version_id: uuid(state === 'candidate' ? 100 : state === 'recovery' ? 101 : 555), percentage: 100 }] };
    if (state === 'split') f.current.services.gachia.versions.push({ version_id: uuid(100), percentage: 50 });
    if (state === 'other-service') f.current.services['gachia-game-nte'].id = uuid(777);
    if (state === 'topology') f.current.routes.push({ unknown: true });
    const result = await reconcileUnifiedMainPromotion(f.input, async () => f.current);
    assert.equal(result.status, status); assert.equal(result.cloudWrites, false); assert.equal(result.acceptanceGranted, false);
    assert.equal(result.sourceAdvanced, false); assert.equal(result.automaticRetry, false); assert.equal(result.automaticRollback, false);
  });
}
test('journal mutation during the observation cannot produce a successful diagnostic', async t => {
  const f = fixture(t);
  await assert.rejects(reconcileUnifiedMainPromotion(f.input, async () => { writeFileSync(f.file, '{}\n'); return f.current; }), /journal changed/);
});

for (const fault of ['reorder', 'missing-intent', 'after-stop', 'automatic-retry', 'wrong-directory', 'missing-observation']) test(`malformed promotion chain is not reconciled: ${fault}`, async t => {
  const f = fixture(t), rows = f.rows;
  if (fault === 'reorder') [rows[1], rows[2]] = [rows[2], rows[1]];
  if (fault === 'missing-intent') rows[2].phase = 'promoted';
  if (fault === 'after-stop') rows.push(rows[2]);
  if (fault === 'automatic-retry') rows[3].automaticRetry = true;
  if (fault === 'wrong-directory') rows[0].renewalDirectory = join(f.input.run, 'foreign');
  if (fault === 'missing-observation') rows.pop();
  const raw = rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(f.file, raw); f.input.pin = digest(raw);
  let snapshots = 0;
  await assert.rejects(reconcileUnifiedMainPromotion(f.input, async () => { snapshots++; return f.current; }));
  assert.equal(snapshots, 0);
});

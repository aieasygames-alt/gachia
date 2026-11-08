import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES, assertTopology, reconcileRelease, executeReleaseProtocol, desktopCloudSnapshot } from './desktop-cloud-release.mjs';

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const sha = 'a'.repeat(64);
function snapshot() {
  return { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: [...SERVICES] };
}
function fixture(t) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'cms-cloud-protocol-')));
  t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = snapshot(), current = structuredClone(baseline), calls = [];
  const plan = { game: 'genshin', preview: false, changed: ['guide'], owners: ['genshin', 'main'], releaseKey: sha };
  const receipt = { owners: Object.fromEntries(plan.owners.map(owner => [owner, { previousVersion: baseline.services[owner === 'main' ? 'gachia' : 'gachia-game-genshin'].versions[0].version_id, artifactSHA256: sha }])) };
  const input = { run, pin: sha, retentionId: 'a'.repeat(16), retentionPin: sha, authorize: async () => sha, verify: () => ({ plan, receipt }),
    transport: {
      snapshot: async () => structuredClone(current),
      upload: async args => { calls.push(['upload', args.service]); return { ...args, versionId: uuid(args.owner === 'main' ? 200 : 100), moduleSHA256: sha }; },
      preview: async args => { calls.push(['preview', args.service]); return { ...args, status: 'passed', evidenceSHA256: sha }; },
      promote: async args => { calls.push(['promote', args.service, args.versionId]); current.services[args.service] = { id: uuid(args.owner === 'main' ? 400 : 300), versions: [{ version_id: args.versionId, percentage: 100 }] }; },
      acceptProduction: async ({ uploaded }) => ({ status: 'passed', releaseKey: sha, evidenceSHA256: sha, versions: Object.fromEntries(Object.entries(uploaded).map(([s, v]) => [s, v.versionId])) }),
    } };
  return { input, plan, receipt, current, baseline, calls, journal: () => readFileSync(join(run, `cloud-${input.retentionId}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse) };
}

test('both exact-version previews precede all traffic moves; proof and journal persist', async t => {
  const f = fixture(t), result = await executeReleaseProtocol(f.input);
  assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls.map(c => c[0]), ['upload', 'preview', 'upload', 'preview', 'promote', 'promote']);
  assert.deepEqual(f.calls.slice(-2).map(c => c[2]), [uuid(100), uuid(200)]);
  assert.equal(f.journal().at(-1).phase, 'production_accepted');
});

test('preview-only protocol persists both accepted UUIDs without ever moving traffic', async t => {
  const f = fixture(t); f.input.previewOnly = true;
  f.input.transport.promote = () => assert.fail('Preview must not promote');
  const result = await executeReleaseProtocol(f.input);
  assert.equal(result.status, 'cloud_previews_accepted_no_promotion');
  assert.deepEqual(f.current, f.baseline);
  assert.equal(f.journal().at(-1).phase, 'cloud_previews_accepted_no_promotion');
});

for (const reason of ['preview', 'unchanged', 'unauthorized', 'stale']) test(`reject ${reason} before upload`, async t => {
  const f = fixture(t);
  if (reason === 'preview') f.plan.preview = true;
  if (reason === 'unchanged') f.plan.changed = [];
  if (reason === 'unauthorized') f.input.authorize = async () => 'wrong';
  if (reason === 'stale') f.receipt.owners.main.previousVersion = uuid(999);
  await assert.rejects(executeReleaseProtocol(f.input)); assert.deepEqual(f.calls, []);
});

test('second upload failure does not promote either owner or retry automatically', async t => {
  const f = fixture(t), upload = f.input.transport.upload;
  f.input.transport.upload = async args => { if (args.owner === 'main') throw Error('upload network loss'); return upload(args); };
  await assert.rejects(executeReleaseProtocol(f.input), /network loss/);
  assert(!f.calls.some(c => c[0] === 'promote'));
  assert.equal(f.journal().at(-1).result.status, 'baseline_active_upload_outcome_unknown');
  assert.equal(f.journal().at(-1).result.unresolvedOperation.service, 'gachia');
  const calls = f.calls.length;
  await assert.rejects(executeReleaseProtocol(f.input), { code: 'EEXIST' }); assert.equal(f.calls.length, calls);
});

test('wrong UUID preview cannot authorize promotion', async t => {
  const f = fixture(t), preview = f.input.transport.preview;
  f.input.transport.preview = async args => ({ ...await preview(args), versionId: uuid(999) });
  await assert.rejects(executeReleaseProtocol(f.input), /Preview UUID/);
  assert(!f.calls.some(c => c[0] === 'promote'));
});

test('response lost after first promotion reconciles the actual partial state, never rolls back', async t => {
  const f = fixture(t), promote = f.input.transport.promote;
  f.input.transport.promote = async args => { await promote(args); throw Error('response lost'); };
  await assert.rejects(executeReleaseProtocol(f.input), /response lost/);
  assert.equal(f.calls.filter(c => c[0] === 'promote').length, 1);
  const result = f.journal().at(-1).result;
  assert.equal(result.status, 'partial_promotion_requires_manual_reconciliation');
  assert.equal(result.automaticRetry, false); assert.equal(result.automaticRollback, false);
});

test('second promotion failure leaves both upload identities for reconciliation', async t => {
  const f = fixture(t), promote = f.input.transport.promote;
  f.input.transport.promote = async args => { if (args.owner === 'main') throw Error('promotion failure'); await promote(args); };
  await assert.rejects(executeReleaseProtocol(f.input), /promotion failure/);
  assert.equal(Object.keys(f.journal().at(-1).result.owners).length, 2);
  assert.equal(f.journal().at(-1).result.status, 'partial_promotion_requires_manual_reconciliation');
});

test('tampering after first upload stops subsequent owner execution', async t => {
  const f = fixture(t), verify = f.input.verify;
  f.input.verify = (...args) => { assert.equal(f.calls.length, 0, 'retained artifact changed'); return verify(...args); };
  await assert.rejects(executeReleaseProtocol(f.input), /artifact changed/);
  assert.deepEqual(f.calls.map(c => c[0]), ['upload']);
});

test('production acceptance failure never marks the batch successful', async t => {
  const f = fixture(t); f.input.transport.acceptProduction = async () => { throw Error('network output mismatch'); };
  await assert.rejects(executeReleaseProtocol(f.input), /output mismatch/);
  assert(!f.journal().some(row => row.phase === 'production_accepted'));
  assert.equal(f.journal().at(-1).result.status, 'candidates_active_acceptance_still_required');
});

for (const field of ['routes', 'domains', 'settings', 'bindings', 'subdomains', 'scripts']) test(`protected ${field} drift fails closed`, () => {
  const before = snapshot(), after = structuredClone(before); after[field] = ['drift'];
  assert.throws(() => assertTopology(before, after), /Topology drift/);
  assert.equal(reconcileRelease(before, after).status, 'drift_requires_manual_reconciliation');
});

test('latest-upload version messages do not masquerade as operational settings drift', async t => {
  const f = fixture(t), service = 'gachia-game-genshin';
  f.baseline.settings[service] = { annotations: { 'workers/message': 'previous upload', 'workers/triggered_by': 'version_upload' }, compatibility_date: '2026-07-08' };
  f.current.settings = structuredClone(f.baseline.settings);
  const upload = f.input.transport.upload;
  f.input.transport.upload = async args => {
    const result = await upload(args);
    delete f.current.settings[service].annotations['workers/message'];
    return result;
  };
  assert.equal((await executeReleaseProtocol(f.input)).status, 'production_accepted');
  assert.equal(f.journal()[0].baseline.settings[service].annotations['workers/message'], 'previous upload');
  f.current.settings[service].annotations['workers/message'] = 'another version message';
  assertTopology(f.baseline, f.current, Object.fromEntries(Object.entries(f.current.services).filter(([s]) => ['gachia', service].includes(s)).map(([s, row]) => [s, row.versions[0].version_id])));
});

for (const change of ['unknown-annotation', 'triggered-by', 'compatibility', 'observability', 'binding', 'invalid-message']) test(`version message exclusion still rejects ${change}`, () => {
  const before = snapshot(), service = 'gachia-game-nte';
  before.settings[service] = { annotations: { 'workers/message': 'previous', 'workers/triggered_by': 'version_upload' }, compatibility_flags: ['nodejs_compat'], observability: { enabled: true }, bindings: [] };
  const after = structuredClone(before), settings = after.settings[service];
  delete settings.annotations['workers/message'];
  if (change === 'unknown-annotation') settings.annotations['unreviewed/value'] = 'new';
  if (change === 'triggered-by') settings.annotations['workers/triggered_by'] = 'other';
  if (change === 'compatibility') settings.compatibility_flags.push('unreviewed');
  if (change === 'observability') settings.observability.enabled = false;
  if (change === 'binding') settings.bindings.push({ name: 'new', type: 'assets' });
  if (change === 'invalid-message') settings.annotations['workers/message'] = {};
  assert.throws(() => assertTopology(before, after));
});

test('split traffic, a third UUID and deployment churn cannot be misread as a safe baseline', () => {
  const before = snapshot(), after = structuredClone(before), service = 'gachia';
  after.services[service].versions.push({ version_id: uuid(800), percentage: 50 });
  assert.equal(reconcileRelease(before, after).status, 'drift_requires_manual_reconciliation');
  after.services[service] = { id: uuid(999), versions: [{ version_id: uuid(801), percentage: 100 }] };
  assert.equal(reconcileRelease(before, after, { [service]: { versionId: uuid(802) } }).status, 'drift_requires_manual_reconciliation');
  after.services[service].versions = before.services[service].versions;
  assert.equal(reconcileRelease(before, after, { [service]: { versionId: uuid(802) } }).status, 'drift_requires_manual_reconciliation');
});

test('cloud snapshot uses GET only and strips secret values before persistence', async () => {
  const result = await desktopCloudSnapshot('test-credential', async (url, options) => {
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    let result = [];
    if (url.endsWith('/deployments')) result = { deployments: [snapshot().services.gachia] };
    if (url.endsWith('/settings')) result = { bindings: [{ type: 'secret_text', name: 'SECRET', text: 'must-not-persist' }] };
    if (url.endsWith('/subdomain')) result = { enabled: true };
    if (url.endsWith('/scripts')) result = SERVICES.map(id => ({ id }));
    return Response.json({ success: true, result });
  });
  assert(!JSON.stringify(result).includes('must-not-persist'));
  assertTopology(result, result);
});

test('cloud snapshot overlaps at most four service reads and preserves service ordering', async () => {
  let active = 0, peak = 0, completed = 0;
  const result = await desktopCloudSnapshot('test', async (url, options) => {
    assert.equal(options.method, 'GET'); peak = Math.max(peak, ++active);
    await new Promise(resolve => setImmediate(resolve));
    active--; completed++;
    let result = [];
    if (url.endsWith('/deployments')) result = { deployments: [snapshot().services.gachia] };
    if (url.endsWith('/settings')) result = { bindings: [] };
    if (url.endsWith('/subdomain')) result = { enabled: true };
    if (url.endsWith('/scripts')) result = SERVICES.map(id => ({ id }));
    return Response.json({ success: true, result });
  });
  assert.equal(peak, 4); assert.equal(active, 0); assert.equal(completed, SERVICES.length * 3 + 3);
  for (const field of ['services', 'settings', 'bindings', 'subdomains']) assert.deepEqual(Object.keys(result[field]), SERVICES);
});

test('failed snapshot drains all in-flight reads before returning and starts no further services', async () => {
  let active = 0, deployments = 0;
  await assert.rejects(desktopCloudSnapshot('test', async url => {
    active++; await new Promise(resolve => setImmediate(resolve)); active--;
    if (url.endsWith('/deployments')) {
      deployments++; if (url.includes('/gachia/')) return Response.json({ success: false }, { status: 503 });
      return Response.json({ success: true, result: { deployments: [snapshot().services.gachia] } });
    }
    return Response.json({ success: true, result: url.endsWith('/settings') ? { bindings: [] } : { enabled: true } });
  }), /503/);
  assert.equal(active, 0); assert.equal(deployments, 4);
});

test('read-only diagnostics preserve split deployments while strict preflight still rejects them', async () => {
  const request = async (url, options) => {
    assert.equal(options.method, 'GET'); let result = [];
    if (url.endsWith('/deployments')) result = { deployments: [{ id: uuid(1), versions: [{ version_id: uuid(2), percentage: 50 }, { version_id: uuid(3), percentage: 50 }] }] };
    if (url.endsWith('/settings')) result = { bindings: [] };
    if (url.endsWith('/subdomain')) result = { enabled: true };
    if (url.endsWith('/scripts')) result = SERVICES.map(id => ({ id }));
    return Response.json({ success: true, result });
  };
  await assert.rejects(desktopCloudSnapshot('test', request), /Split/);
  const current = await desktopCloudSnapshot('test', request, { allowSplit: true });
  assert.equal(Object.keys(current.services).length, 7);
  assert.equal(reconcileRelease(snapshot(), current).status, 'drift_requires_manual_reconciliation');
});

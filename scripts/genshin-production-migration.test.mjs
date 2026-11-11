import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { GENSHIN_MIGRATION_ORDER, GENSHIN_MIGRATION_POLICY, assertGenshinMigrationIdentity,
  assertGenshinMigrationTopology, executeGenshinMigration, genshinMigrationConfig } from './genshin-production-migration.mjs';

const sha = char => char.repeat(64);
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const serviceFor = { genshin: 'gachia-game-genshin', main: 'gachia', router: 'gachia-router' };
function baseline() {
  const value = { services: {}, bindings: {}, settings: {}, subdomains: {}, scripts: [...SERVICES], routes: [{ pattern: 'gachia.com/*', script: 'gachia-router' }], domains: [] };
  for (const [i, service] of SERVICES.entries()) {
    value.services[service] = { id: uuid(i + 1), versions: [{ version_id: uuid(i + 20), percentage: 100 }] };
    value.bindings[service] = service === 'gachia' ? [{ name: 'BETTER_AUTH_SECRET', type: 'secret_text' }] : [];
    value.settings[service] = { bindings: structuredClone(value.bindings[service]), tags: [], compatibility_date: '2026-07-08' };
    value.subdomains[service] = { enabled: true, previews_enabled: true };
  }
  return value;
}
function configured(base) {
  const value = structuredClone(base);
  for (const owner of ['main', 'router']) {
    const service = serviceFor[owner];
    value.bindings[service].push({ name: 'GENSHIN_CONTENT_ENABLED', text: 'true', type: 'plain_text' });
    if (owner === 'main') value.bindings[service].push({ name: 'GENSHIN_CONTENT', type: 'service', service: 'gachia-game-genshin', environment: 'production' });
    value.settings[service].bindings = structuredClone(value.bindings[service]);
  }
  return value;
}
function identity() {
  const value = { policy: GENSHIN_MIGRATION_POLICY, releaseKey: sha('a'), sourceCommit: 'b'.repeat(40),
    sourceCI: { commit: 'b'.repeat(40), runID: 1, status: 'full_exact_ci_passed' }, sourceIndexPin: sha('c'), activePin: sha('d'),
    baseline: baseline(), observedAt: Date.now(), owners: {} };
  for (const [i, owner] of GENSHIN_MIGRATION_ORDER.entries()) {
    const service = serviceFor[owner];
    value.owners[owner] = { service, sourceVersionId: value.baseline.services[service].versions[0].version_id, sourceIdentityPin: sha('e'),
      ...Object.fromEntries(['recovery', 'candidate'].map((role, r) => [role, { versionId: uuid(100 + i * 2 + r), moduleSHA256: sha('1'), artifactPin: sha('2'),
        configPin: sha('3'), previewPin: sha('4'), acceptedAt: Date.now() }])) };
  }
  return value;
}
function fixture(t, failure) {
  const run = mkdtempSync(join(tmpdir(), 'genshin-migration-'));
  t.after(() => rmSync(run, { recursive: true, force: true }));
  const value = identity(), cloud = configured(value.baseline), calls = [];
  return { run, value, cloud, calls, verify: async () => value, transport: {
    snapshot: async () => structuredClone(cloud),
    inspect: async row => { calls.push(`inspect:${row.owner}:${row.role}`); return row; },
    promote: async row => {
      calls.push(`promote:${row.owner}`);
      if (row.owner === failure) throw Error('response lost');
      const result = { ...row, deploymentId: uuid(200 + calls.length) };
      cloud.services[row.service] = { id: result.deploymentId, versions: [{ version_id: row.versionId, percentage: 100 }] };
      return result;
    },
    acceptStep: async ({ owner }) => { calls.push(`accept:${owner}`); return { status: 'passed', evidenceSHA256: sha('5') }; },
    acceptProduction: async () => ({ status: 'passed', evidenceSHA256: sha('6'),
      versions: Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => [serviceFor[owner], value.owners[owner].candidate.versionId])) }),
  } };
}

test('derives only reviewed production additions; staging remains unchanged', () => {
  for (const owner of GENSHIN_MIGRATION_ORDER) {
    const app = owner === 'main' ? 'web' : owner === 'router' ? 'router' : 'game-genshin';
    const text = readFileSync(new URL(`../apps/${app}/wrangler.jsonc`, import.meta.url), 'utf8');
    const result = genshinMigrationConfig(owner, text);
    assert.deepEqual(result.env, JSON.parse(text.replace(/^\s*\/\/.*$/gm, '')).env);
    if (owner !== 'genshin') assert.equal(result.vars.GENSHIN_CONTENT_ENABLED, 'true');
    assert.throws(() => genshinMigrationConfig(owner, text + '\n'), /requires review/);
  }
  assert.throws(() => genshinMigrationConfig('nte', '{}'), /Unknown/);
});

test('allows exactly the initial binding delta and exact selected deployments', () => {
  const before = baseline(), after = configured(before);
  assertGenshinMigrationTopology(before, after, { configured: [...GENSHIN_MIGRATION_ORDER] });
  assert.throws(() => assertGenshinMigrationTopology(before, after), /Topology drift/);
  assert.throws(() => assertGenshinMigrationTopology(before, after, { configured: ['router', 'main'] }), /order/);
});

test('rejects secret, tag, other game, route, domain and staging drift', () => {
  const before = baseline();
  for (const change of [
    value => value.bindings.gachia.shift(),
    value => value.settings.gachia.tags.push('changed'),
    value => value.settings['gachia-game-nte'].bindings.push({ name: 'X', type: 'plain_text', text: '1' }),
    value => value.routes[0].script = 'gachia',
    value => value.domains.push({ hostname: 'x.gachia.com' }),
    value => value.services['gachia-staging'].id = uuid(999),
    value => value.bindings.gachia.find(row => row.name === 'GENSHIN_CONTENT').service = 'gachia-game-nte',
  ]) {
    const after = configured(before); change(after);
    assert.throws(() => assertGenshinMigrationTopology(before, after, { configured: [...GENSHIN_MIGRATION_ORDER] }));
  }
});

test('rejects missing CI, stale evidence, raw recovery UUID and scope expansion', () => {
  for (const change of [
    value => value.sourceCI.status = 'local_passed',
    value => value.sourceCI.commit = 'f'.repeat(40),
    value => value.observedAt -= 900001,
    value => value.owners.main.recovery.acceptedAt -= 900001,
    value => value.owners.genshin.recovery.versionId = value.owners.genshin.sourceVersionId,
    value => value.owners.nte = structuredClone(value.owners.genshin),
    value => value.owners.main.candidate.extra = true,
  ]) { const value = identity(); change(value); assert.throws(() => assertGenshinMigrationIdentity(value)); }
});

test('activates only genshin then main then router with acceptance after every write', async t => {
  const f = fixture(t);
  const result = await executeGenshinMigration({ ...f, releaseKey: f.value.releaseKey });
  assert.equal(result.status, 'production_accepted'); assert.equal(result.sourceAdvanced, false);
  assert.deepEqual(f.calls.filter(row => row.startsWith('promote:') || row.startsWith('accept:')),
    ['promote:genshin', 'accept:genshin', 'promote:main', 'accept:main', 'promote:router', 'accept:router']);
  await assert.rejects(executeGenshinMigration({ ...f, releaseKey: f.value.releaseKey }), /EEXIST/);
  assert.equal(f.calls.filter(row => row.startsWith('promote:')).length, 3, 'A completed journal cannot be replayed');
});

for (const owner of GENSHIN_MIGRATION_ORDER) test(`unknown ${owner} deployment stops without retry, rollback or following writes`, async t => {
  const f = fixture(t, owner);
  await assert.rejects(executeGenshinMigration({ ...f, releaseKey: f.value.releaseKey }), /response lost/);
  const writes = f.calls.filter(row => row.startsWith('promote:'));
  assert.deepEqual(writes, GENSHIN_MIGRATION_ORDER.slice(0, GENSHIN_MIGRATION_ORDER.indexOf(owner) + 1).map(row => 'promote:' + row));
  const rows = readFileSync(join(f.run, `genshin-migration-${f.value.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  const stopped = rows.find(row => row.phase === 'stopped');
  assert.equal(stopped.pendingOperation.owner, owner); assert.equal(stopped.automaticRetry, false); assert.equal(stopped.automaticRollback, false);
  assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
});

test('a mismatched exact module or a changed verifier prevents activation', async t => {
  const f = fixture(t);
  f.transport.inspect = async row => ({ ...row, moduleSHA256: sha('9') });
  await assert.rejects(executeGenshinMigration({ ...f, releaseKey: f.value.releaseKey }));
  assert.equal(f.calls.length, 0);
});

test('a failed step acceptance prevents all later activations', async t => {
  const f = fixture(t);
  f.transport.acceptStep = async () => { throw Error('public mismatch'); };
  await assert.rejects(executeGenshinMigration({ ...f, releaseKey: f.value.releaseKey }), /public mismatch/);
  assert.deepEqual(f.calls.filter(row => row.startsWith('promote:')), ['promote:genshin']);
});

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { executeNteMigration } from './genshin-production-migration.mjs';
import { NTE_MIGRATION_ORDER, NTE_MIGRATION_POLICY, NTE_SERVICES, assertNteMigrationTopology, nteExpectedBindings, nteReleaseConfig } from './nte-release-config.mjs';

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function baseline() {
  const value = { services: {}, bindings: {}, settings: {}, subdomains: {}, scripts: [...SERVICES], routes: [{ pattern: 'gachia.com/*', script: 'gachia-router' }], domains: [] };
  for (const [i, service] of SERVICES.entries()) {
    value.services[service] = { id: uuid(i + 1), versions: [{ version_id: uuid(i + 20), percentage: 100 }] };
    value.bindings[service] = ['gachia', 'gachia-router'].includes(service) ? [{ name: 'GENSHIN_CONTENT_ENABLED', type: 'plain_text', text: 'true' }] : [];
    if (service === 'gachia') value.bindings[service].push({ name: 'GENSHIN_CONTENT', type: 'service', service: 'gachia-game-genshin' });
    value.settings[service] = { bindings: structuredClone(value.bindings[service]), tags: [], compatibility_date: '2026-07-08' };
    value.subdomains[service] = { enabled: true, previews_enabled: true };
  }
  return value;
}
test('candidate adds NTE while recovery retains the published Genshin bindings', () => {
  for (const owner of NTE_MIGRATION_ORDER) {
    const app = owner === 'main' ? 'web' : owner === 'router' ? 'router' : 'game-nte';
    const raw = readFileSync(new URL(`../apps/${app}/wrangler.jsonc`, import.meta.url), 'utf8');
    for (const role of ['candidate', 'recovery']) {
      const config = nteReleaseConfig(owner, raw, role);
      if (owner === 'nte') assert.equal(config.env, undefined);
      else assert(config.env);
      if (owner !== 'nte') {
        assert.equal(config.vars.GENSHIN_CONTENT_ENABLED, 'true');
        assert.equal(config.vars.NTE_CONTENT_ENABLED, role === 'candidate' ? 'true' : undefined);
        if (owner === 'main') assert(config.services.some(row => row.binding === 'GENSHIN_CONTENT' && row.service === 'gachia-game-genshin'));
      }
    }
    assert.throws(() => nteReleaseConfig(owner, raw + '\n'));
  }
});
function fixture(t, failure) {
  const run = mkdtempSync(join(tmpdir(), 'nte-migration-')); t.after(() => rmSync(run, { recursive: true, force: true }));
  const base = baseline(), cloud = structuredClone(base), calls = [], value = { policy: NTE_MIGRATION_POLICY, releaseKey: 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
    sourceCI: { commit: 'b'.repeat(40), runID: 1, status: 'full_exact_ci_passed' }, sourceIndexPin: 'c'.repeat(64), activePin: 'd'.repeat(64), baseline: base, observedAt: Date.now(), owners: {} };
  for (const owner of NTE_MIGRATION_ORDER) value.owners[owner] = { service: NTE_SERVICES[owner], sourceVersionId: base.services[NTE_SERVICES[owner]].versions[0].version_id,
    sourceIdentityPin: 'e'.repeat(64), ...Object.fromEntries(['recovery', 'candidate'].map(role => [role, Object.fromEntries(['moduleSHA256', 'artifactPin', 'configPin', 'referencesPin'].map(key => [key, 'f'.repeat(64)]))])) };
  const transport = {
    snapshot: async () => structuredClone(cloud),
    upload: async row => {
      calls.push(`upload:${row.owner}:${row.role}`);
      if (row.role === 'candidate') { cloud.bindings[row.service] = nteExpectedBindings(base, row.owner, row.role); cloud.settings[row.service].bindings = cloud.bindings[row.service]; }
      return { versionId: uuid(100 + NTE_MIGRATION_ORDER.indexOf(row.owner) * 2 + Number(row.role === 'candidate')) };
    },
    inspect: async row => ({ versionId: row.versionId, moduleSHA256: row.sealed.moduleSHA256, moduleProof: { pin: '1'.repeat(64) }, versionPin: '2'.repeat(64) }),
    preview: async row => ({ service: row.service, versionId: row.versionId, status: 'passed', observationMode: 'cloud_exact_version', evidenceSHA256: '3'.repeat(64) }),
    revalidate: async () => {},
    promote: async row => {
      calls.push(`promote:${row.owner}`); if (row.owner === failure) throw Error('Unknown deployment');
      const result = { ...row, deploymentId: uuid(200 + calls.length) }; cloud.services[row.service] = { id: result.deploymentId, versions: [{ version_id: row.versionId, percentage: 100 }] }; return result;
    },
    acceptStep: async ({ owner }) => { calls.push(`accept:${owner}`); return { status: 'passed', evidenceSHA256: '4'.repeat(64) }; },
    acceptProduction: async () => ({ status: 'passed', evidenceSHA256: '5'.repeat(64), versions: Object.fromEntries(NTE_MIGRATION_ORDER.map(owner => [NTE_SERVICES[owner], cloud.services[NTE_SERVICES[owner]].versions[0].version_id])) }),
  };
  return { run, value, cloud, calls, transport, verify: async () => value, releaseKey: value.releaseKey };
}
test('one-time migration deploys NTE, Router, Main in order and protects Genshin', async t => {
  const f = fixture(t), result = await executeNteMigration(f);
  assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls.filter(row => /^(promote|accept):/.test(row)), ['promote:nte', 'accept:nte', 'promote:router', 'accept:router', 'promote:main', 'accept:main']);
  assert.deepEqual(f.cloud.services['gachia-game-genshin'], f.value.baseline.services['gachia-game-genshin']);
  assertNteMigrationTopology(f.value.baseline, f.cloud, { configured: [...NTE_MIGRATION_ORDER], deployed: Object.fromEntries(NTE_MIGRATION_ORDER.map(owner => [owner, f.cloud.services[NTE_SERVICES[owner]].versions[0].version_id])) });
  await assert.rejects(executeNteMigration(f), /EEXIST/);
});
for (const owner of NTE_MIGRATION_ORDER) test(`an unknown ${owner} deployment stops all following writes`, async t => {
  const f = fixture(t, owner); await assert.rejects(executeNteMigration(f), /Unknown deployment/);
  assert.deepEqual(f.calls.filter(row => row.startsWith('promote:')), NTE_MIGRATION_ORDER.slice(0, NTE_MIGRATION_ORDER.indexOf(owner) + 1).map(row => 'promote:' + row));
});
test('protected Genshin configuration drift blocks even the first upload', async t => {
  const f = fixture(t); f.cloud.bindings['gachia-game-genshin'].push({ name: 'DRIFT', type: 'plain_text', text: 'true' });
  await assert.rejects(executeNteMigration(f)); assert.deepEqual(f.calls, []);
});

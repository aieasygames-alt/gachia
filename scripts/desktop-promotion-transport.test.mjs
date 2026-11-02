import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createPromotionTransport, promoteDesktopRelease } from './desktop-promotion-transport.mjs';
import { executePromotionContinuation, SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';

const sha = 'a'.repeat(64), retentionId = 'a'.repeat(16);
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const save = (path, data) => { const raw = JSON.stringify(data, null, 2) + '\n'; writeFileSync(path, raw); return digest(raw); };

async function fixture(t, failure) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'cms-promotion-transport-')));
  t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), created_on: '2026-01-01T00:00:00Z', versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: Object.fromEntries(SERVICES.map(s => [s, { bindings: [] }])), bindings: Object.fromEntries(SERVICES.map(s => [s, []])),
    routes: [], domains: [], subdomains: Object.fromEntries(SERVICES.map(s => [s, { enabled: true, previews_enabled: true }])), scripts: [...SERVICES].sort() };
  const current = structuredClone(baseline), calls = [], owners = {}, recoveryOwners = {}, accepted = {}, recoveryProofs = {};
  const candidateDirectory = join(run, 'candidate'), recoveryDirectory = join(run, 'recovery'); mkdirSync(candidateDirectory); mkdirSync(recoveryDirectory);
  const cloud = new Map();
  for (const [i, owner] of ['genshin', 'main'].entries()) {
    const service = owner === 'main' ? 'gachia' : 'gachia-game-genshin';
    for (const [kind, root, versionId] of [['candidate', candidateDirectory, uuid(100 + i)], ['recovery', recoveryDirectory, uuid(200 + i)]]) {
      const directory = join(root, owner); mkdirSync(directory);
      const code = `${owner}-${kind}-sealed-module`, moduleSHA256 = digest(code);
      const configSHA256 = save(join(directory, 'upload.json'), { name: service, compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'] });
      const row = { service, configSHA256, moduleSHA256, artifactSHA256: sha, candidateArtifactSHA256: sha };
      const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/' };
      if (owner === 'main') Object.assign(assets, { headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
        raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n' });
      const version = { id: versionId, metadata: { has_preview: true }, resources: { bindings: [], script_runtime: {
        compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'], usage_model: 'standard', assets,
      } } };
      const form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
      const bytes = Buffer.from(await new Response(form).arrayBuffer()); cloud.set(`${service}/${versionId}`, { version, bytes, kind });
      if (kind === 'candidate') {
        row.referencesSHA256 = save(join(directory, 'references.json'), [{ path: owner === 'main' ? '/data/genshin/raw-guides.json' : '/_next/static/test.js', status: 200,
          headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' }, sha256: digest('{}') }]);
        owners[owner] = row; accepted[service] = { service, versionId, moduleSHA256, artifactSHA256: sha, status: 'passed', releaseKey: sha, evidenceSHA256: sha, acceptedAt: Date.now() };
      } else {
        recoveryOwners[owner] = row; recoveryProofs[owner] = { versionId, moduleSHA256, sourceVersionId: baseline.services[service].versions[0].version_id,
          candidateArtifactSHA256: sha, evidenceSHA256: sha, acceptedAt: Date.now() };
      }
    }
  }
  const evidence = { plan: { game: 'genshin', preview: false, changed: ['guide'], owners: ['genshin', 'main'], releaseKey: sha },
    manifest: { retentionId, owners, snapshot: baseline }, accepted, baseline, journalPin: sha, recoveryPin: sha,
    recovery: { status: 'exact_cloud_recovery_previews_accepted', releaseKey: sha, owners: recoveryProofs } };
  const journal = () => readFileSync(join(run, `promotion-${retentionId}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  const request = async (url, options) => {
    calls.push({ url, method: options.method }); assert.equal(options.redirect, 'error');
    if (url.startsWith('https://gachia.com/')) {
      assert.equal(options.method, 'GET'); assert(!options.headers?.authorization, 'Never send Cloudflare credential to public site');
      assert.equal(options.credentials, 'omit');
      if (failure === 'public-drift') current.routes.push({ pattern: 'unexpected' });
      return new Response(failure === 'public' ? '{"wrong":true}' : '{}', { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' } });
    }
    assert(url.startsWith('https://api.cloudflare.com/client/v4/')); assert.equal(options.headers.authorization, 'Bearer test-only');
    const path = new URL(url).pathname, suffix = path.split('/workers/scripts/')[1];
    const [service, operation, versionId] = suffix?.split('/') ?? [];
    if (options.method === 'POST') {
      assert.equal(operation, 'deployments'); assert.equal(journal().at(-1).phase, 'promotion_intent');
      assert.equal(calls.filter(c => c.url.includes('/content/v2?')).length, 4, 'All four cloud modules checked before write');
      const body = JSON.parse(options.body);
      assert.deepEqual(body, { strategy: 'percentage', versions: [{ version_id: accepted[service].versionId, percentage: 100 }] });
      if (failure === 'second-write' && service === 'gachia') return new Response('', { status: 503 });
      current.services[service] = { id: uuid(service === 'gachia' ? 401 : 400), created_on: '2026-11-02T00:00:00Z', strategy: 'percentage', versions: body.versions };
      if (failure === 'lost-response') throw Error('Connection lost test-only');
      return Response.json({ success: true, result: current.services[service] });
    }
    assert.equal(options.method, 'GET');
    if (operation === 'versions' || operation === 'content') {
      const id = operation === 'versions' ? versionId : new URL(url).searchParams.get('version');
      const entry = cloud.get(`${service}/${id}`); assert(entry, 'Only pinned UUID reads allowed');
      if (operation === 'content') {
        if (failure === 'module' && entry.kind === 'recovery') { const form = new FormData(); form.set('worker.js', new Blob(['tampered']), 'worker.js'); return new Response(form); }
        return new Response(entry.bytes);
      }
      if (failure === 'version') return Response.json({ success: true, result: { ...entry.version, id: uuid(999) } });
      if (failure === 'read') return new Response('', { status: 403 });
      return Response.json({ success: true, result: entry.version });
    }
    let result;
    if (operation === 'deployments') result = { deployments: [current.services[service]] };
    else if (operation === 'settings') result = current.settings[service];
    else if (operation === 'subdomain') result = current.subdomains[service];
    else if (path.endsWith('/workers/scripts')) result = current.scripts.map(id => ({ id }));
    else if (path.endsWith('/workers/routes')) result = current.routes;
    else if (path.endsWith('/workers/domains')) result = current.domains;
    else assert.fail(`Unexpected route ${path}`);
    return Response.json({ success: true, result });
  };
  const transport = createPromotionTransport({ run, evidence, candidateDirectory, recoveryDirectory, recoveryManifest: { owners: recoveryOwners }, token: 'test-only', request });
  const options = { run, retentionId, verify: () => structuredClone(evidence), authorize: () => sha, transport };
  return { run, options, calls, journal, evidence, current };
}

test('composed transport verifies four cloud modules, promotes exact versions and persists public proof', async t => {
  const f = await fixture(t); const result = await executePromotionContinuation(f.options);
  assert.equal(result.status, 'production_accepted'); assert.equal(f.calls.filter(c => c.method === 'POST').length, 2);
  const path = join(f.run, `promotion-evidence-${retentionId}`);
  assert.equal(JSON.parse(readFileSync(join(path, 'remote-versions.json'))).observations.length, 4);
  assert.equal(JSON.parse(readFileSync(join(path, 'public-acceptance.json'))).status, 'passed');
  assert.equal(f.journal().at(-1).phase, 'production_accepted');
  const count = f.calls.length; await assert.rejects(executePromotionContinuation(f.options), /EEXIST/); assert.equal(f.calls.length, count);
});

for (const failure of ['module', 'version', 'read', 'second-write', 'lost-response', 'public', 'public-drift']) test(`composed transport stops and reconciles ${failure}`, async t => {
  const f = await fixture(t, failure); await assert.rejects(executePromotionContinuation(f.options));
  const rows = f.journal(); assert(rows.some(r => r.phase === 'stopped')); assert.equal(rows.at(-1).phase, 'reconciliation');
  assert(!rows.some(r => r.phase === 'production_accepted'));
  const writes = f.calls.filter(c => c.method === 'POST').length;
  assert.equal(writes, ['module', 'version', 'read'].includes(failure) ? 0 : failure === 'lost-response' ? 1 : 2);
  if (failure === 'second-write') assert.equal(rows.filter(r => r.phase === 'promoted').length, 1);
  if (failure === 'lost-response') assert(rows.at(-1).result.unresolvedOperation);
  assert(!existsSync(join(f.run, 'operation.lock')));
  const count = f.calls.length; await assert.rejects(executePromotionContinuation(f.options), /EEXIST/); assert.equal(f.calls.length, count);
});

test('production wrapper refuses CI before reading evidence or making requests', async () => {
  const old = process.env.CI; process.env.CI = 'true';
  try { await assert.rejects(promoteDesktopRelease({}), /desktop-only/); }
  finally { if (old === undefined) delete process.env.CI; else process.env.CI = old; }
});

test('new CLI commands require all pins and reject raw destination overrides', () => {
  const cli = new URL('./desktop-publish.mjs', import.meta.url).pathname;
  for (const action of ['recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote']) {
    const missing = spawnSync(process.execPath, [cli, action], { encoding: 'utf8' });
    assert.equal(missing.status, 1); assert.match(missing.stderr, /Required arguments missing/);
    const override = spawnSync(process.execPath, [cli, action, '--target', 'gachia-router'], { encoding: 'utf8' });
    assert.equal(override.status, 1); assert.match(override.stderr, /Unknown/);
  }
});

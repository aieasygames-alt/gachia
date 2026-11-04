import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createPromotionTransport, promoteDesktopRelease, verifyPromotionGuideUpdate } from './desktop-promotion-transport.mjs';
import { capturePublishedBaseline } from './desktop-published-baseline.mjs';
import { executePromotionContinuation, SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { verifiedInPass, withVerificationPass } from './desktop-release-assets.mjs';
import { moduleReceipt } from './fixtures/desktop-module-receipt.mjs';

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
      const version = { id: versionId, metadata: { has_preview: true }, resources: { script: { etag: digest(`vendor-${code}`) }, bindings: [], script_runtime: {
        compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'], usage_model: 'standard', assets,
      } } };
      const form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
      const bytes = Buffer.from(await new Response(form).arrayBuffer()); cloud.set(`${service}/${versionId}`, { version, bytes, kind });
      const moduleProof = await moduleReceipt({ directory, service, version, code, bytes, role: kind, releaseKey: sha, configSHA256 });
      if (kind === 'candidate') {
        row.referencesSHA256 = save(join(directory, 'references.json'), [{ path: owner === 'main' ? '/data/genshin/raw-guides.json' : '/_next/static/test.js', status: 200,
          headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' }, sha256: digest('{}') }]);
        owners[owner] = row; accepted[service] = { service, versionId, moduleSHA256, moduleProof, artifactSHA256: sha, status: 'passed', releaseKey: sha, evidenceSHA256: sha, acceptedAt: Date.now() };
      } else {
        recoveryOwners[owner] = row; recoveryProofs[owner] = { versionId, moduleSHA256, moduleProof, sourceVersionId: baseline.services[service].versions[0].version_id,
          candidateArtifactSHA256: sha, evidenceSHA256: sha, acceptedAt: Date.now() };
      }
    }
  }
  const evidence = { plan: { game: 'genshin', preview: false, changed: ['guide'], owners: ['genshin', 'main'], releaseKey: sha },
    manifest: { retentionId, owners, snapshot: baseline }, accepted, baseline, journalPin: sha, recoveryPin: sha,
    recovery: { status: 'exact_cloud_recovery_previews_accepted', releaseKey: sha, owners: recoveryProofs } };
  if (failure === 'module') writeFileSync(JSON.parse(readFileSync(recoveryProofs.main.moduleProof.path)).archive.path, 'tampered');
  if (failure === 'missing-proof') delete recoveryProofs.main.moduleProof;
  if (failure === 'swapped-proof') recoveryProofs.main.moduleProof = accepted.gachia.moduleProof;
  if (failure?.startsWith('missing-') && failure !== 'missing-proof') {
    const [, owner, kind] = failure.split('-'), target = kind === 'candidate' ? accepted[owners[owner].service] : recoveryProofs[owner];
    delete target.moduleProof;
  }
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
      assert.equal(calls.filter(c => c.url.includes('/content/v2?')).length, 0, 'Historical content must not be downloaded');
      assert.equal(calls.filter(c => c.url.includes('/versions/')).length, 4, 'All four immutable-version identities checked before write');
      const body = JSON.parse(options.body);
      assert.deepEqual(body, { strategy: 'percentage', versions: [{ version_id: accepted[service].versionId, percentage: 100 }] });
      if (failure === 'second-write' && service === 'gachia') return new Response('', { status: 503 });
      current.services[service] = { id: uuid(service === 'gachia' ? 401 : 400), created_on: '2026-11-02T00:00:00Z', strategy: 'percentage', versions: body.versions };
      if (failure === 'lost-response') throw Error('Connection lost test-only');
      return Response.json({ success: true, result: { id: current.services[service].id } });
    }
    assert.equal(options.method, 'GET');
    if (operation === 'versions' || operation === 'content') {
      const id = operation === 'versions' ? versionId : new URL(url).searchParams.get('version');
      const entry = cloud.get(`${service}/${id}`); assert(entry, 'Only pinned UUID reads allowed');
      if (operation === 'content') {
        if (failure === 'ignored-version-selector') return new Response(cloud.get(`${service}/${uuid(service === 'gachia' ? 201 : 200)}`).bytes);
        if (failure === 'module' && entry.kind === 'recovery') { const form = new FormData(); form.set('worker.js', new Blob(['tampered']), 'worker.js'); return new Response(form); }
        return new Response(entry.bytes);
      }
      if (failure === 'version') return Response.json({ success: true, result: { ...entry.version, id: uuid(999) } });
      if (failure === 'read') return new Response('', { status: 403 });
      return Response.json({ success: true, result: entry.version });
    }
    let result;
    if (operation === 'deployments') {
      if (versionId) assert.equal(versionId, current.services[service].id);
      result = versionId ? current.services[service] : { deployments: [current.services[service]] };
    }
    else if (operation === 'settings') result = current.settings[service];
    else if (operation === 'subdomain') result = current.subdomains[service];
    else if (path.endsWith('/workers/scripts')) result = current.scripts.map(id => ({ id }));
    else if (path.endsWith('/workers/routes')) result = current.routes;
    else if (path.endsWith('/workers/domains')) result = current.domains;
    else assert.fail(`Unexpected route ${path}`);
    return Response.json({ success: true, result });
  };
  const transportOptions = { run, evidence, candidateDirectory, recoveryDirectory, recoveryManifest: { owners: recoveryOwners }, token: 'test-only', request };
  const transport = createPromotionTransport(transportOptions);
  const options = { run, retentionId, verify: () => structuredClone(evidence), authorize: () => sha, transport };
  return { run, options, calls, journal, evidence, current, transportOptions };
}

async function updateGate(f, unsafe = false) {
  const original = Buffer.from(JSON.stringify([{ id: 'guide', title: 'O', content: 'Original' }]));
  const published = Buffer.from(JSON.stringify([{ id: 'guide', title: 'A', content: 'Original' }]));
  const candidate = Buffer.from(JSON.stringify([{ id: 'guide', title: unsafe ? 'O' : 'B', content: 'New body' }]));
  Object.assign(f.evidence.plan, { sourceSHA256: digest(original), candidateSHA256: digest(candidate) });
  const baseline = await capturePublishedBaseline({ plan: f.evidence.plan, importBytes: original,
    directory: join(f.run, 'update-baseline'), observe: async () => structuredClone(f.evidence.baseline),
    request: async () => new Response(published, { headers: { 'content-type': 'application/json' } }) });
  const retained = join(f.run, 'update-retained'), candidatePath = join(retained, 'main/.open-next/assets/data/genshin/raw-guides.json');
  mkdirSync(join(retained, 'main/.open-next/assets/data/genshin'), { recursive: true }); writeFileSync(candidatePath, candidate);
  const sealed = { recovery: baseline, retained: { plan: structuredClone(f.evidence.plan), directory: retained,
    receipt: { owners: Object.fromEntries(Object.entries(baseline.versions).map(([owner, previousVersion]) => [owner, { previousVersion }])) } } };
  f.options.verify = () => {
    verifyPromotionGuideUpdate({ evidence: f.evidence, sealed });
    return structuredClone(f.evidence);
  };
  f.options.transport = createPromotionTransport(f.transportOptions);
  return { sealed, candidatePath };
}

test('forward update gate stops an O reset before transport preparation, journal or any deployment POST', async t => {
  const f = await fixture(t); await updateGate(f, true);
  await assert.rejects(executePromotionContinuation(f.options), /Implicit reset to import O/);
  assert.equal(f.calls.length, 0);
  assert(!existsSync(join(f.run, `promotion-${retentionId}.jsonl`)));
});

test('normal continuous publication passes the same per-field gate at every continuation boundary', async t => {
  const f = await fixture(t); await updateGate(f);
  assert.equal((await executePromotionContinuation(f.options)).status, 'production_accepted');
  assert.equal(f.calls.filter(row => row.method === 'POST').length, 2);
});

test('candidate mutation during preflight is re-read by the update gate before any deployment', async t => {
  const f = await fixture(t), gate = await updateGate(f), snapshot = f.options.transport.snapshot;
  f.options.transport.snapshot = async () => {
    const value = await snapshot(); writeFileSync(gate.candidatePath, 'changed'); return value;
  };
  await assert.rejects(executePromotionContinuation(f.options), /Candidate digest mismatch/);
  assert.equal(f.calls.filter(row => row.method === 'POST').length, 0);
});

test('composed transport verifies four cloud modules, promotes exact versions and persists public proof', async t => {
  const f = await fixture(t); const result = await executePromotionContinuation(f.options);
  assert.equal(result.status, 'production_accepted'); assert.equal(f.calls.filter(c => c.method === 'POST').length, 2);
  const path = join(f.run, `promotion-evidence-${retentionId}`);
  assert.equal(JSON.parse(readFileSync(join(path, 'remote-versions.json'))).observations.length, 4);
  assert.equal(JSON.parse(readFileSync(join(path, 'public-acceptance.json'))).status, 'passed');
  assert.equal(f.journal().at(-1).phase, 'production_accepted');
  const count = f.calls.length; await assert.rejects(executePromotionContinuation(f.options), /EEXIST/); assert.equal(f.calls.length, count);
});

test('transport preparation uses the first locked verification rather than an extra unlocked pass', async t => {
  const f = await fixture(t), transport = f.options.transport;
  let verifications = 0, preparations = 0;
  delete f.options.transport; delete f.options.retentionId;
  f.options.verify = () => {
    assert(existsSync(join(f.run, 'operation.lock'))); verifications++;
    return structuredClone(f.evidence);
  };
  f.options.makeTransport = evidence => {
    assert.equal(verifications, 1); preparations++; assert.deepEqual(evidence, f.evidence);
    return transport;
  };
  assert.equal((await executePromotionContinuation(f.options)).status, 'production_accepted');
  assert.equal(preparations, 1); assert.equal(verifications, 5);
});

for (const boundary of ['first-snapshot', 'second-owner-snapshot', 'public-acceptance', 'final-snapshot']) {
  test(`fresh pass rejects evidence mutation during ${boundary} without another write`, async t => {
    const f = await fixture(t), file = join(f.run, 'pass-input'); writeFileSync(file, 'pinned');
    const read = () => verifiedInPass(read, file, () => readFileSync(file, 'utf8'));
    f.options.verify = () => withVerificationPass(() => {
      assert.equal(read(), 'pinned', 'Pinned input changed');
      assert.equal(read(), 'pinned');
      return structuredClone(f.evidence);
    });
    let snapshots = 0;
    const snapshot = f.options.transport.snapshot;
    f.options.transport.snapshot = async () => {
      const value = await snapshot(); snapshots++;
      if (snapshots === ({ 'first-snapshot': 1, 'second-owner-snapshot': 4, 'final-snapshot': 6 }[boundary])) writeFileSync(file, 'edited');
      return value;
    };
    const accept = f.options.transport.acceptProduction;
    f.options.transport.acceptProduction = async evidence => {
      const value = await accept(evidence);
      if (boundary === 'public-acceptance') writeFileSync(file, 'edited');
      return value;
    };
    await assert.rejects(executePromotionContinuation(f.options), /Pinned input changed/);
    assert.equal(f.calls.filter(row => row.method === 'POST').length, boundary === 'first-snapshot' ? 0 : boundary === 'second-owner-snapshot' ? 1 : 2);
    assert(!f.journal().some(row => row.phase === 'production_accepted'));
  });
}

test('proof that expires during a slow write-preflight snapshot causes zero deployment POSTs', async t => {
  const f = await fixture(t), snapshot = f.options.transport.snapshot, now = Date.now;
  const advanced = now() + 900001; let snapshots = 0;
  f.options.transport.snapshot = async () => {
    const value = await snapshot();
    if (++snapshots === 2) Date.now = () => advanced;
    return value;
  };
  try {
    await assert.rejects(executePromotionContinuation(f.options), /Preview acceptance expired/);
    assert.equal(f.calls.filter(row => row.method === 'POST').length, 0);
    assert(!f.journal().some(row => row.phase === 'promotion_intent'));
  } finally { Date.now = now; }
});

test('latest content ignoring the selector cannot replace any of the four archived modules', async t => {
  const f = await fixture(t, 'ignored-version-selector');
  assert.equal((await executePromotionContinuation(f.options)).status, 'production_accepted');
  assert.equal(f.calls.filter(row => row.url.includes('/content/')).length, 0);
});

for (const owner of ['genshin', 'main']) for (const kind of ['candidate', 'recovery']) test(`missing ${owner} ${kind} receipt causes zero promotion POST`, async t => {
  const f = await fixture(t, `missing-${owner}-${kind}`);
  await assert.rejects(executePromotionContinuation(f.options), /receipt required/);
  assert.equal(f.calls.filter(row => row.method === 'POST').length, 0);
});

for (const failure of ['module', 'version', 'read', 'missing-proof', 'swapped-proof', 'second-write', 'lost-response', 'public', 'public-drift']) test(`composed transport stops and reconciles ${failure}`, async t => {
  const f = await fixture(t, failure); await assert.rejects(executePromotionContinuation(f.options));
  const rows = f.journal(); assert(rows.some(r => r.phase === 'stopped')); assert.equal(rows.at(-1).phase, 'reconciliation');
  assert(!rows.some(r => r.phase === 'production_accepted'));
  const writes = f.calls.filter(c => c.method === 'POST').length;
  assert.equal(writes, ['module', 'version', 'read', 'missing-proof', 'swapped-proof'].includes(failure) ? 0 : failure === 'lost-response' ? 1 : 2);
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

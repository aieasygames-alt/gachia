import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createPromotionTransport } from './desktop-promotion-transport.mjs';
import { executePromotionContinuation, SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { executeEvidenceRenewal, verifyRenewalFiles } from './desktop-evidence-renewal.mjs';
import { executeVerifiedManualRecovery, verifyRecoveryPromotionJournal } from './desktop-manual-recovery.mjs';
import { verifyVersionPreview } from './desktop-version-preview.mjs';
import { moduleReceipt } from './fixtures/desktop-module-receipt.mjs';

const sha = 'a'.repeat(64), retentionId = 'a'.repeat(16);
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const save = (path, data) => { const raw = JSON.stringify(data, null, 2) + '\n'; writeFileSync(path, raw); return digest(raw); };

async function fixture(t, failure, game = 'genshin') {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'cms-promotion-transport-')));
  t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), created_on: '2026-01-01T00:00:00Z', versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: Object.fromEntries(SERVICES.map(s => [s, { bindings: [] }])), bindings: Object.fromEntries(SERVICES.map(s => [s, []])),
    routes: [], domains: [], subdomains: Object.fromEntries(SERVICES.map(s => [s, { enabled: true, previews_enabled: true }])), scripts: [...SERVICES].sort() };
  if (game === 'nte') {
    const bindings = [{ type: 'plain_text', name: 'NTE_DEPLOYMENT_MODE', text: 'live' }];
    baseline.bindings['gachia-game-nte'] = bindings;
    baseline.settings['gachia-game-nte'].bindings = bindings;
  }
  const current = structuredClone(baseline), calls = [], owners = {}, recoveryOwners = {}, accepted = {}, recoveryProofs = {};
  const candidateDirectory = join(run, 'candidate'), recoveryDirectory = join(run, 'recovery'); mkdirSync(candidateDirectory); mkdirSync(recoveryDirectory);
  const cloud = new Map();
  for (const [i, owner] of [game, 'main'].entries()) {
    const service = owner === 'main' ? 'gachia' : `gachia-game-${game}`;
    for (const [kind, root, versionId] of [['candidate', candidateDirectory, uuid(100 + i)], ['recovery', recoveryDirectory, uuid(200 + i)]]) {
      const directory = join(root, owner); mkdirSync(directory);
      const code = `${owner}-${kind}-sealed-module`, moduleSHA256 = digest(code);
      const configSHA256 = save(join(directory, 'upload.json'), { name: service, compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'],
        ...(owner === 'nte' ? { vars: { NTE_DEPLOYMENT_MODE: 'live' } } : {}) });
      const row = { service, configSHA256, moduleSHA256, artifactSHA256: sha, candidateArtifactSHA256: sha, recoveryArtifactSHA256: sha };
      const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/' };
      if (owner === 'main') Object.assign(assets, { headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
        raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n' });
      const version = { id: versionId, metadata: { has_preview: true }, resources: { script: { etag: digest(`vendor-${code}`) }, bindings: structuredClone(baseline.bindings[service]), script_runtime: {
        compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'], usage_model: 'standard', assets,
      } } };
      const form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
      const bytes = Buffer.from(await new Response(form).arrayBuffer()); cloud.set(`${service}/${versionId}`, { version, bytes, kind });
      const moduleProof = await moduleReceipt({ directory, service, version, code, bytes, role: kind, releaseKey: sha, configSHA256 });
      row.referencesSHA256 = save(join(directory, 'references.json'), [{ path: owner === 'main' ? `/data/${game}/raw-guides.json` : '/_next/static/test.js', status: 200,
          headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' }, sha256: digest('{}') }]);
      if (kind === 'candidate') {
        owners[owner] = row; accepted[service] = { service, versionId, moduleSHA256, moduleProof, artifactSHA256: sha, status: 'passed', releaseKey: sha, evidenceSHA256: sha, acceptedAt: Date.now() };
      } else {
        recoveryOwners[owner] = row; recoveryProofs[owner] = { versionId, moduleSHA256, moduleProof, sourceVersionId: baseline.services[service].versions[0].version_id,
          candidateArtifactSHA256: sha, evidenceSHA256: sha, acceptedAt: Date.now() };
      }
    }
  }
  const evidence = { plan: { game, preview: false, changed: ['guide'], owners: [game, 'main'], releaseKey: sha },
    manifest: { retentionId, owners, snapshot: baseline }, accepted, baseline, journalPin: sha, recoveryPin: sha,
    recovery: { status: 'exact_cloud_recovery_previews_accepted', releaseKey: sha, owners: recoveryProofs } };
  if (failure === 'module') writeFileSync(JSON.parse(readFileSync(recoveryProofs.main.moduleProof.path)).archive.path, 'tampered');
  const request = async (url, options) => {
    calls.push({ url, method: options.method }); assert.equal(options.redirect, 'error');
    if (url.startsWith('https://gachia.com/') || url.includes('.aieasygames.workers.dev/')) {
      assert.equal(options.method, 'GET'); assert(!options.headers?.authorization, 'Never send Cloudflare credential to public site');
      assert.equal(options.credentials, 'omit');
      if (failure === 'public-drift') current.routes.push({ pattern: 'unexpected' });
      return new Response(failure === 'public' ? '{"wrong":true}' : '{}', { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' } });
    }
    assert(url.startsWith('https://api.cloudflare.com/client/v4/')); assert.equal(options.headers.authorization, 'Bearer test-only');
    const path = new URL(url).pathname, suffix = path.split('/workers/scripts/')[1];
    const [service, operation, versionId] = suffix?.split('/') ?? [];
    if (options.method === 'POST') {
      assert.equal(operation, 'deployments');
      assert.equal(calls.filter(c => c.url.includes('/content/v2?')).length, 0);
      assert(calls.filter(c => c.url.includes('/versions/')).length >= 4);
      const body = JSON.parse(options.body);
      assert.equal(body.strategy, 'percentage'); assert.equal(body.versions.length, 1); assert.equal(body.versions[0].percentage, 100); assert(cloud.has(`${service}/${body.versions[0].version_id}`));
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
  return { run, calls, evidence, current, request, sealed: { directory: recoveryDirectory, candidate: { directory: candidateDirectory }, manifest: { owners: recoveryOwners } } };
}

async function renewed(t, { mode = 'promote', failure, game = 'genshin' } = {}) {
  const f = await fixture(t, failure, game);
  for (const proof of Object.values(f.evidence.accepted)) proof.acceptedAt = 1;
  for (const proof of Object.values(f.evidence.recovery.owners)) proof.acceptedAt = 1;
  if (mode === 'recover') f.current.services[`gachia-game-${game}`].versions[0].version_id = f.evidence.accepted[`gachia-game-${game}`].versionId;
  const original = structuredClone(f.evidence);
  const input = { run: f.run, mode, releaseKey: sha, journalPin: sha, receiptPin: sha, recoveryBundlePin: sha, token: 'test-only' };
  const output = await executeEvidenceRenewal({ input, readEvidence: () => structuredClone(f.evidence), readSealed: () => f.sealed,
    makeTransport: args => createPromotionTransport({ ...args, request: f.request }),
    preview: args => verifyVersionPreview({ ...args, request: f.request }) });
  assert.deepEqual(f.evidence, original); assert.equal(f.calls.filter(c => c.method !== 'GET').length, 0);
  Object.assign(input, { renewalId: output.id, renewalPin: output.renewalPin });
  if (mode === 'recover') {
    const rows = [{ phase: 'baseline', baseline: f.evidence.baseline, accepted: f.evidence.accepted },
      { phase: 'promotion_intent', owner: game, service: `gachia-game-${game}`, versionId: f.evidence.accepted[`gachia-game-${game}`].versionId },
      { phase: 'stopped', error: 'test-only lost response' }];
    const raw = rows.map(row => JSON.stringify({ at: new Date().toISOString(), releaseKey: sha, ...row }) + '\n').join('');
    writeFileSync(join(f.run, `promotion-${retentionId}.jsonl`), raw); input.promotionJournalPin = digest(raw);
  }
  const verify = async () => {
    const value = await verifyRenewalFiles({ input, mode, evidence: f.evidence, sealed: f.sealed });
    if (mode === 'recover') verifyRecoveryPromotionJournal(input, value);
    return value;
  };
  return { ...f, input, output, verify };
}

for (const game of ['genshin', 'nte']) {
test(`${game}: persisted same-UUID GET evidence is re-read and consumed by the real promotion transport`, async t => {
  const f = await renewed(t, { game }), checked = await f.verify();
  const evidence = checked.evidence;
  const transport = createPromotionTransport({ run: f.run, evidence, candidateDirectory: f.sealed.candidate.directory,
    recoveryDirectory: f.sealed.directory, recoveryManifest: f.sealed.manifest, token: 'test-only', request: f.request });
  const result = await executePromotionContinuation({ run: f.run, retentionId, verify: async () => (await f.verify()).evidence,
    authorize: () => sha, transport });
  assert.equal(result.status, 'production_accepted');
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 2);
  assert.equal(f.evidence.accepted.gachia.acceptedAt, 1);
});

for (const failure of ['pin', 'mode', 'release', 'expired', 'future', 'http-body', 'module-bytes', 'repinned-module', 'repinned-runtime', 'repinned-binding', 'repinned-service', 'topology', 'missing-owner']) {
  test(`${game}: disk renewal refuses ${failure} before any deployment`, async t => {
    const f = await renewed(t, { game }), dir = f.output.directory, path = join(dir, 'renewal.json');
    const manifest = JSON.parse(readFileSync(path));
    if (failure === 'pin') f.input.renewalPin = 'b'.repeat(64);
    if (failure === 'mode') manifest.mode = 'recover';
    if (failure === 'release') f.input.releaseKey = 'b'.repeat(64);
    if (failure === 'expired') manifest.owners['main-recovery'].acceptedAt = Date.now() - 900001;
    if (failure === 'future') manifest.owners['main-recovery'].acceptedAt = Date.now() + 60000;
    if (failure === 'topology') manifest.after.routes.push('unexpected');
    if (failure === 'missing-owner') delete manifest.owners['main-recovery'];
    if (failure === 'http-body') writeFileSync(join(dir, 'main-recovery-http/0.body'), 'changed');
    if (failure === 'module-bytes') writeFileSync(join(dir, 'main-recovery.multipart'), 'changed');
    if (failure.startsWith('repinned-')) {
      const remotePath = join(dir, 'remote-versions.json'), remote = JSON.parse(readFileSync(remotePath));
      const row = remote.observations.find(row => row.owner === 'main' && row.kind === 'recovery');
      if (failure === 'repinned-service') row.service = 'gachia-router';
      else if (failure === 'repinned-module') {
        const form = new FormData(); form.set('worker.js', new Blob(['wrong-module']), 'worker.js');
        const bytes = Buffer.from(await new Response(form).arrayBuffer());
        writeFileSync(join(dir, 'main-recovery.multipart'), bytes); row.multipartSHA256 = digest(bytes);
      } else {
        const versionPath = join(dir, 'main-recovery-version.json'), version = JSON.parse(readFileSync(versionPath));
        if (failure === 'repinned-runtime') version.resources.script_runtime.compatibility_date = '2000-01-01';
        else version.resources.bindings.push({ type: 'plain_text', name: 'UNEXPECTED', text: 'x' });
        row.versionSHA256 = save(versionPath, version);
      }
      manifest.remote.evidenceSHA256 = save(remotePath, remote);
    }
    if (failure !== 'pin') f.input.renewalPin = save(path, manifest);
    await assert.rejects(f.verify()); assert.equal(f.calls.filter(c => c.method === 'POST').length, 0);
  });
}

test(`${game}: partial candidate deployment is explicitly recovered using persisted renewal and composed recovery transport`, async t => {
  const f = await renewed(t, { mode: 'recover', game });
  const result = await executeVerifiedManualRecovery({ input: f.input, verify: f.verify, request: f.request });
  assert.equal(result.status, 'recovery_accepted');
  for (const owner of [game, 'main']) {
    const service = owner === 'main' ? 'gachia' : `gachia-game-${game}`;
    assert.equal(f.current.services[service].versions[0].version_id, f.evidence.recovery.owners[owner].versionId);
  }
  const before = f.calls.length;
  await assert.rejects(executeVerifiedManualRecovery({ input: f.input, verify: f.verify, request: f.request }), /EEXIST/);
  assert.equal(f.calls.length, before);
});

for (const failure of ['second-write', 'lost-response']) test(`${game}: composed recovery preserves ${failure} without automatic retry`, async t => {
  const f = await renewed(t, { mode: 'recover', failure, game });
  await assert.rejects(executeVerifiedManualRecovery({ input: f.input, verify: f.verify, request: f.request }));
  const rows = readFileSync(join(f.run, `manual-recovery-${f.input.renewalId}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.at(-1).phase, 'observed_after_failure'); assert(rows.find(row => row.phase === 'stopped').pendingOperation);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, failure === 'second-write' ? 2 : 1);
  assert(!rows.some(row => row.phase === 'recovery_accepted'));
});

for (const failure of ['missing-pin', 'wrong-pin', 'torn', 'no-intent', 'wrong-owner', 'wrong-service', 'wrong-candidate', 'wrong-release']) {
  test(`${game}: manual recovery rejects ${failure} promotion journal before network or writes`, async t => {
    const f = await renewed(t, { mode: 'recover', game }), path = join(f.run, `promotion-${retentionId}.jsonl`);
    if (failure === 'missing-pin') delete f.input.promotionJournalPin;
    else if (failure === 'wrong-pin') f.input.promotionJournalPin = 'b'.repeat(64);
    else {
      let rows = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
      if (failure === 'no-intent') rows = rows.filter(row => row.phase !== 'promotion_intent');
      if (failure === 'wrong-owner') rows[1].owner = game === 'genshin' ? 'nte' : 'genshin';
      if (failure === 'wrong-service') rows[1].service = 'gachia-router';
      if (failure === 'wrong-candidate') rows[1].versionId = uuid(999);
      if (failure === 'wrong-release') rows[1].releaseKey = 'b'.repeat(64);
      const raw = rows.map(row => JSON.stringify(row) + '\n').join('') + (failure === 'torn' ? '{' : '');
      writeFileSync(path, raw); f.input.promotionJournalPin = digest(raw);
    }
    const before = f.calls.length;
    await assert.rejects(executeVerifiedManualRecovery({ input: f.input, verify: f.verify, request: f.request }));
    assert.equal(f.calls.length, before);
    assert(!existsSync(join(f.run, `manual-recovery-${f.input.renewalId}.jsonl`)));
  });
}


}

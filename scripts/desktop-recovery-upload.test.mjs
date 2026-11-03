import assert from 'node:assert/strict';
import { moduleReceipt } from './fixtures/desktop-module-receipt.mjs';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeRecoveryUpload } from './desktop-cloud-transport.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { acceptedRecoveryReceipt, verifyRecoveryReceiptFiles } from './desktop-recovery-receipt.mjs';
import { verifyVersionPreview } from './desktop-version-preview.mjs';

const sha = 'a'.repeat(64), id = 'a'.repeat(16);
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function fixture(t, game = 'genshin') {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'cms-recovery-protocol-')));
  t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: [...SERVICES] };
  const current = structuredClone(baseline), calls = [];
  const plan = { game, preview: false, changed: ['guide'], owners: [game, 'main'], releaseKey: sha };
  const owners = Object.fromEntries(plan.owners.map(owner => {
    const service = owner === 'main' ? 'gachia' : `gachia-game-${game}`;
    return [owner, { service, sourceVersionId: baseline.services[service].versions[0].version_id,
      moduleSHA256: sha, candidateArtifactSHA256: sha, recoveryArtifactSHA256: sha }];
  }));
  const verified = { candidate: { plan, manifest: { retentionId: id } }, manifest: { snapshot: baseline, candidatePin: sha, owners } };
  const input = { run, releaseKey: sha, recoveryId: id, recoveryBundlePin: sha };
  const journalPath = join(run, `recovery-cloud-${id}.jsonl`);
  const journal = () => { const raw = readFileSync(journalPath); return { rows: raw.toString().trim().split('\n').map(JSON.parse), sha256: digest(raw), damaged: false }; };
  const transport = {
    snapshot: async () => { calls.push('snapshot'); return structuredClone(current); },
    upload: async ({ owner }) => {
      calls.push(`upload:${owner}`); assert.equal(journal().rows.at(-1).phase, 'upload_intent');
      return { versionId: uuid(owner === 'main' ? 200 : 100) };
    },
    inspect: async ({ owner }) => { calls.push(`inspect:${owner}`); assert.equal(journal().rows.at(-1).phase, 'upload_returned'); return { versionSHA256: sha }; },
    preview: async ({ owner, row, versionId }) => { calls.push(`preview:${owner}`); return { service: row.service, versionId, status: 'passed', evidenceSHA256: sha }; },
  };
  return { run, verified, input, current, calls, journal, options: { input, verify: () => structuredClone(verified), transport } };
}

test('NTE recovery upload/preview receipt binds NTE + Main and cannot be re-labelled as Genshin', async t => {
  const f = fixture(t, 'nte'), result = await executeRecoveryUpload(f.options);
  const receipt = JSON.parse(readFileSync(join(result.directory, 'receipt.json')));
  assert.deepEqual(Object.keys(receipt.owners).sort(), ['main', 'nte']);
  acceptedRecoveryReceipt({ verified: f.verified, receipt, journal: f.journal(), input: f.input });
  assert.deepEqual(f.calls.filter(row => row.startsWith('upload:')), ['upload:nte', 'upload:main']);
  f.verified.candidate.plan.game = 'genshin';
  assert.throws(() => acceptedRecoveryReceipt({ verified: f.verified, receipt, journal: f.journal(), input: f.input }));
});
for (const game of ['genshin', 'nte']) for (const failure of ['missing-main', 'extra-owner', 'wrong-main-service', 'wrong-main-source']) {
  test(`${game}: recovery rejects ${failure} before the first upload or journal`, async t => {
    const f = fixture(t, game), owners = f.verified.manifest.owners;
    if (failure === 'missing-main') delete owners.main;
    if (failure === 'extra-owner') owners.router = structuredClone(owners.main);
    if (failure === 'wrong-main-service') owners.main.service = `gachia-game-${game}`;
    if (failure === 'wrong-main-source') owners.main.sourceVersionId = uuid(999);
    await assert.rejects(executeRecoveryUpload(f.options));
    assert.equal(f.calls.length, 0);
    assert(!existsSync(join(f.run, `recovery-cloud-${id}.jsonl`)));
  });
}
for (const failure of ['second-upload', 'wrong-preview-game', 'drift']) test(`NTE recovery stops ${failure} without changing Genshin`, async t => {
  const f = fixture(t, 'nte'), before = structuredClone(f.current.services['gachia-game-genshin']);
  const upload = f.options.transport.upload;
  f.options.transport.upload = async args => {
    if (failure === 'second-upload' && args.owner === 'main') throw Error('test-only response lost');
    const result = await upload(args);
    if (failure === 'drift') f.current.routes.push('unexpected');
    return result;
  };
  if (failure === 'wrong-preview-game') {
    const preview = f.options.transport.preview;
    f.options.transport.preview = async args => ({ ...await preview(args), service: 'gachia-game-genshin' });
  }
  await assert.rejects(executeRecoveryUpload(f.options));
  assert(!f.journal().rows.some(row => row.phase === 'complete'));
  assert.deepEqual(f.current.services['gachia-game-genshin'], before);
});

test('recovery protocol persists both exact previews and independently validates receipt', async t => {
  const f = fixture(t), result = await executeRecoveryUpload(f.options);
  assert.equal(result.productionPromoted, false);
  assert.deepEqual(f.calls.filter(x => !x.startsWith('snapshot')), ['upload:genshin', 'inspect:genshin', 'preview:genshin', 'upload:main', 'inspect:main', 'preview:main']);
  assert.deepEqual(f.current, f.verified.manifest.snapshot);
  const receipt = JSON.parse(readFileSync(join(result.directory, 'receipt.json')));
  assert.deepEqual(acceptedRecoveryReceipt({ verified: f.verified, receipt, journal: f.journal(), input: f.input }), receipt);
  assert.equal(digest(readFileSync(join(result.directory, 'receipt.json'))), result.receiptPin);
  const before = f.calls.length; await assert.rejects(executeRecoveryUpload(f.options), /EEXIST/); assert.equal(f.calls.length, before);
  assert(!existsSync(join(f.run, 'operation.lock')));
});

for (const failure of ['upload-first', 'upload-second', 'inspect', 'preview', 'wrong-preview-version', 'drift', 'evidence', 'observation-unavailable']) {
  test(`recovery ${failure} preserves failure and blocks replay`, async t => {
    const f = fixture(t), tr = f.options.transport, originalUpload = tr.upload;
    tr.upload = async args => {
      if ((failure === 'upload-first' || failure === 'observation-unavailable') && args.owner === 'genshin' || failure === 'upload-second' && args.owner === 'main') {
        f.calls.push(`lost:${args.owner}`); throw Error('Upload response lost');
      }
      const result = await originalUpload(args);
      if (failure === 'drift') f.current.routes.push({ pattern: 'drift' });
      if (failure === 'evidence') f.verified.manifest.candidatePin = 'b'.repeat(64);
      return result;
    };
    if (failure === 'inspect') tr.inspect = async () => { throw Error('Remote module mismatch'); };
    if (failure === 'preview') tr.preview = async () => { throw Error('HTTP failure'); };
    if (failure === 'wrong-preview-version') { const preview = tr.preview; tr.preview = async args => ({ ...await preview(args), versionId: uuid(999) }); }
    if (failure === 'observation-unavailable') { const snapshot = tr.snapshot; let n = 0; tr.snapshot = () => ++n === 1 ? snapshot() : Promise.reject(Error('Read unavailable')); }
    await assert.rejects(executeRecoveryUpload(f.options));
    const rows = f.journal().rows, stopped = rows.find(r => r.phase === 'stopped');
    assert(stopped.pendingOperation); assert(!rows.some(r => r.phase === 'complete'));
    assert.equal(Object.keys(stopped.accepted).length, failure === 'upload-second' ? 1 : 0);
    assert.equal(rows.at(-1).phase, failure === 'observation-unavailable' ? 'observation_unavailable' : 'observed_after_failure');
    assert(!existsSync(join(f.run, `recovery-cloud-${id}`, 'receipt.json')));
    const before = f.calls.length; await assert.rejects(executeRecoveryUpload(f.options), /EEXIST/); assert.equal(f.calls.length, before);
    assert(!existsSync(join(f.run, 'operation.lock')));
  });
}

test('a separate process cannot replay recovery even with a different recovery bundle ID', async t => {
  const f = fixture(t); await executeRecoveryUpload(f.options);
  const input = { ...f.input, recoveryId: 'b'.repeat(16) };
  const source = `import { executeRecoveryUpload } from ${JSON.stringify(new URL('./desktop-cloud-transport.mjs', import.meta.url).href)};
    try { await executeRecoveryUpload({ input: ${JSON.stringify(input)}, verify: () => (${JSON.stringify(f.verified)}), transport: { snapshot: () => { throw Error('NETWORK_REACHED'); } } }); process.exit(2); }
    catch (e) { if(e.code !== 'EEXIST') throw e; }`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
});

for (const variant of ['rehearsal', 'no-change', 'bad-release-key', 'unreviewed-owner', 'invalid-retention']) {
  test(`protocol rejects ${variant} before journal or network`, async t => {
    const f = fixture(t);
    if (variant === 'rehearsal') f.verified.candidate.plan.preview = true;
    if (variant === 'no-change') f.verified.candidate.plan.changed = [];
    if (variant === 'bad-release-key') f.input.releaseKey = 'b'.repeat(64);
    if (variant === 'unreviewed-owner') f.verified.candidate.plan.owners = ['nte', 'main'];
    if (variant === 'invalid-retention') f.verified.candidate.manifest.retentionId = '../elsewhere';
    await assert.rejects(executeRecoveryUpload(f.options)); assert.equal(f.calls.length, 0);
    assert(!existsSync(join(f.run, `recovery-cloud-${id}.jsonl`)));
    assert(!existsSync(join(f.run, 'operation.lock')));
  });
}

test('returning the raw old version stops before inspection or HTTP preview', async t => {
  const f = fixture(t);
  f.options.transport.upload = async ({ row }) => ({ versionId: row.sourceVersionId });
  await assert.rejects(executeRecoveryUpload(f.options), /Raw old UUID/);
  assert(!f.calls.some(x => x.startsWith('inspect:') || x.startsWith('preview:')));
  assert.equal(f.journal().rows.find(x => x.phase === 'stopped').pendingOperation.versionId,
    f.verified.manifest.owners.genshin.sourceVersionId);
});

for (const variant of ['torn', 'missing-owner', 'wrong-pin', 'old-uuid', 'wrong-module', 'wrong-version', 'expired', 'future', 'extra-event', 'wrong-order', 'wrong-release', 'wrong-time', 'wrong-version-digest']) {
  test(`receipt refuses ${variant}`, async t => {
    const f = fixture(t), result = await executeRecoveryUpload(f.options);
    const receipt = JSON.parse(readFileSync(join(result.directory, 'receipt.json'))), journal = f.journal();
    const proof = receipt.owners.genshin;
    if (variant === 'torn') journal.damaged = true;
    if (variant === 'missing-owner') delete receipt.owners.main;
    if (variant === 'wrong-pin') receipt.recoveryBundlePin = 'b'.repeat(64);
    if (variant === 'old-uuid') proof.versionId = proof.sourceVersionId;
    if (variant === 'wrong-module') proof.moduleSHA256 = 'b'.repeat(64);
    if (variant === 'wrong-version') proof.versionId = uuid(999);
    if (variant === 'expired') proof.acceptedAt -= 900001;
    if (variant === 'future') proof.acceptedAt += 10000;
    if (variant === 'extra-event') journal.rows.push(journal.rows.at(-1));
    if (variant === 'wrong-order') [journal.rows[1], journal.rows[2]] = [journal.rows[2], journal.rows[1]];
    if (variant === 'wrong-release') journal.rows[2].releaseKey = 'b'.repeat(64);
    if (variant === 'wrong-time') journal.rows[3].at = new Date(0).toISOString();
    if (variant === 'wrong-version-digest') proof.versionSHA256 = 'invalid';
    assert.throws(() => acceptedRecoveryReceipt({ verified: f.verified, receipt, journal, input: f.input }));
  });
}

for (const mutation of ['none', 'body', 'version', 'journal', 'receipt']) test(`disk recovery verifier checks saved evidence: ${mutation}`, async t => {
  const f = fixture(t), save = (path, data) => { const raw = JSON.stringify(data, null, 2) + '\n'; writeFileSync(path, raw); return digest(raw); };
  f.verified.directory = join(f.run, 'sealed'); mkdirSync(f.verified.directory);
  for (const owner of ['genshin', 'main']) {
    const row = f.verified.manifest.owners[owner], directory = join(f.verified.directory, owner); mkdirSync(directory);
    row.moduleSHA256 = digest(`sealed ${owner}`);
    row.configSHA256 = save(join(directory, 'upload.json'), { name: row.service, compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'] });
    row.referencesSHA256 = save(join(directory, 'references.json'), [{ path: '/data/test.json', status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, sha256: digest('{}') }]);
    f.verified.manifest.snapshot.bindings[row.service] = [];
    f.current.bindings[row.service] = [];
  }
  f.options.transport.inspect = async ({ owner, row, versionId, directory }) => {
    const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/' };
    if (owner === 'main') Object.assign(assets, {
      headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
      raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n',
    });
    const version = { id: versionId, metadata: { has_preview: true }, resources: { script: { etag: digest(`vendor-${owner}`) }, bindings: [], script_runtime: {
      compatibility_date: '2026-01-01', compatibility_flags: ['nodejs_compat'], usage_model: 'standard', assets,
    } } };
    const code = `sealed ${owner}`, form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
    const out = join(directory, `${owner}-capture`); mkdirSync(out);
    const moduleProof = await moduleReceipt({ directory: out, service: row.service, version, code, bytes: Buffer.from(await new Response(form).arrayBuffer()),
      role: 'recovery', releaseKey: f.input.releaseKey, configSHA256: row.configSHA256 });
    return { versionSHA256: save(join(directory, `${owner}-version.json`), version), moduleProof };
  };
  f.options.transport.preview = async ({ owner, row, versionId, directory, verified }) => verifyVersionPreview({
    service: row.service, versionId, directory: join(directory, `${owner}-http`),
    references: JSON.parse(readFileSync(join(verified.directory, owner, 'references.json'))),
    request: async () => new Response('{}', { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }),
  });
  const result = await executeRecoveryUpload(f.options), input = { ...f.input, receiptPin: result.receiptPin };
  const path = { body: join(result.directory, 'genshin-http/0.body'), version: join(result.directory, 'genshin-version.json'),
    journal: join(f.run, `recovery-cloud-${id}.jsonl`), receipt: join(result.directory, 'receipt.json') }[mutation];
  if (path) writeFileSync(path, mutation === 'body' ? '[]' : 'tampered');
  if (mutation === 'none') {
    const checked = verifyRecoveryReceiptFiles(input, f.verified);
    assert.equal(checked.productionAuthorized, false); assert.equal(checked.recoveryPin, result.receiptPin);
  } else assert.throws(() => verifyRecoveryReceiptFiles(input, f.verified), /digest changed|bytes changed/);
});

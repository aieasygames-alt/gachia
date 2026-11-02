import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES, executeReleaseProtocol, executePromotionContinuation } from './desktop-cloud-release.mjs';
import { acceptedPreviewJournal, readReleaseJournal, reconcileJournal, verifySavedPreview, verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { exactPreviewOrigin } from './desktop-version-preview.mjs';
import { capturePublishedBaseline, bindPublishedBaseline } from './desktop-published-baseline.mjs';

const sha = 'a'.repeat(64), id = 'b'.repeat(16);
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const json = x => JSON.stringify(x, null, 2) + '\n';
function directory(t) { const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-readiness-'))); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
function state() { return { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])), settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: SERVICES }; }
function fixture(t) {
  const run = directory(t), baseline = state();
  const plan = { preview: false, game: 'genshin', changed: ['one'], owners: ['genshin', 'main'], releaseKey: sha };
  const owners = { genshin: { service: 'gachia-game-genshin', artifactSHA256: sha, moduleSHA256: sha }, main: { service: 'gachia', artifactSHA256: sha, moduleSHA256: sha } };
  const receipt = { owners: Object.fromEntries(Object.entries(owners).map(([owner, row]) => [owner, { ...row, previousVersion: baseline.services[row.service].versions[0].version_id }])) };
  const verified = { plan, receipt, manifest: { owners, snapshot: baseline, retentionId: id } };
  const identity = { releaseKey: sha, planSHA256: sha, retentionId: id, retentionPin: sha };
  const path = join(run, `cloud-${id}.jsonl`);
  const transport = { snapshot: async () => structuredClone(baseline), upload: async args => ({ ...args, versionId: uuid(args.owner === 'main' ? 200 : 100), moduleSHA256: sha }), preview: async args => ({ ...args, status: 'passed', evidenceSHA256: sha }) };
  return { run, baseline, verified, identity, path, transport, create: () => executeReleaseProtocol({ run, pin: sha, retentionId: id, retentionPin: sha, verify: () => verified, authorize: async () => sha, transport, previewOnly: true }) };
}

test('completed real protocol journal can be consumed without another upload', async t => {
  const f = fixture(t), result = await f.create();
  const journal = readReleaseJournal(f.path, f.identity, result.journalSHA256);
  const accepted = acceptedPreviewJournal(journal, f.verified);
  assert.equal(accepted.gachia.versionId, uuid(200)); assert.equal(reconcileJournal(journal, f.baseline).status, 'baseline_active');
});

for (const variant of ['wrong-pin', 'wrong-release', 'torn-tail', 'wrong-phase', 'wrong-module', 'expired', 'future', 'rehearsal']) test(`promotion evidence refuses ${variant}`, async t => {
  const f = fixture(t); await f.create();
  if (variant === 'wrong-pin') { assert.throws(() => readReleaseJournal(f.path, f.identity, '0'.repeat(64))); return; }
  if (variant === 'wrong-release') { assert.throws(() => readReleaseJournal(f.path, { ...f.identity, releaseKey: '0'.repeat(64) })); return; }
  if (variant === 'torn-tail') writeFileSync(f.path, readFileSync(f.path, 'utf8') + '{"phase":');
  const journal = readReleaseJournal(f.path, f.identity);
  if (variant === 'wrong-phase') journal.rows[7].phase = 'production_accepted';
  if (variant === 'wrong-module') journal.rows[2].result.moduleSHA256 = '0'.repeat(64);
  if (variant === 'expired') journal.rows[7].accepted.gachia.acceptedAt = Date.now() - 900001;
  if (variant === 'future') journal.rows[7].accepted.gachia.acceptedAt = Date.now() + 60000;
  if (variant === 'rehearsal') f.verified.plan.preview = true;
  assert.throws(() => acceptedPreviewJournal(journal, f.verified));
});

test('torn upload response retains unknown-outcome intent; a split deployment stays diagnostic', async t => {
  const f = fixture(t); f.transport.upload = async () => { throw Error('lost response'); };
  await assert.rejects(f.create());
  let journal = readReleaseJournal(f.path, f.identity);
  assert.equal(reconcileJournal(journal, f.baseline).status, 'baseline_active_upload_outcome_unknown');
  const split = structuredClone(f.baseline); split.services.gachia.versions.push({ version_id: uuid(500), percentage: 50 });
  assert.equal(reconcileJournal(journal, split).status, 'drift_requires_manual_reconciliation');
  writeFileSync(f.path, readFileSync(f.path, 'utf8') + '{'); journal = readReleaseJournal(f.path, f.identity);
  const result = reconcileJournal(journal, f.baseline); assert(result.journalDamaged); assert.equal(result.unresolvedOperation.phase, 'upload'); assert.equal(result.automaticRetry, false);
});

test('saved preview proof requires the exact origin, all responses and original body bytes', t => {
  const root = directory(t), body = Buffer.from('{}');
  const reference = { path: '/data/genshin/raw-guides.json', status: 200, headers: { 'content-type': 'application/json' }, sha256: digest(body) };
  const proof = { service: 'gachia', versionId: uuid(200) };
  const evidence = { status: 'passed', ...proof, origin: exactPreviewOrigin(proof.service, proof.versionId), observations: [{ ...reference, bodyFile: '0.body', bytes: body.length }] };
  const save = () => { writeFileSync(join(root, 'result.json'), json(evidence)); proof.evidenceSHA256 = digest(json(evidence)); };
  writeFileSync(join(root, '0.body'), body); save(); assert.equal(verifySavedPreview(root, proof, [reference]).responses, 1);
  writeFileSync(join(root, '0.body'), '[]'); assert.throws(() => verifySavedPreview(root, proof, [reference]), /bytes changed/);
  writeFileSync(join(root, '0.body'), body); evidence.origin = 'https://gachia.com'; save(); assert.throws(() => verifySavedPreview(root, proof, [reference]));
  evidence.origin = exactPreviewOrigin(proof.service, proof.versionId); evidence.observations = []; save(); assert.throws(() => verifySavedPreview(root, proof, [reference]), /coverage/);
});

function continuation(t) {
  const f = fixture(t), current = structuredClone(f.baseline), calls = [];
  const accepted = Object.fromEntries(Object.entries(f.verified.manifest.owners).map(([owner, row]) => [row.service, { ...row, status: 'passed', versionId: uuid(owner === 'main' ? 200 : 100), releaseKey: sha, evidenceSHA256: sha, acceptedAt: Date.now() }]));
  const input = { ...f.verified, accepted, baseline: f.baseline, journalPin: sha, recoveryPin: sha,
    recovery: { status: 'exact_cloud_recovery_previews_accepted', releaseKey: sha, owners: Object.fromEntries(Object.entries(f.verified.receipt.owners).map(([owner, row]) => [owner, { sourceVersionId: row.previousVersion, candidateArtifactSHA256: sha, versionId: uuid(owner === 'main' ? 700 : 600), evidenceSHA256: sha, acceptedAt: Date.now() }])) } };
  const versions = Object.fromEntries(Object.entries(accepted).map(([service, row]) => [service, row.versionId]));
  const transport = { snapshot: async () => structuredClone(current),
    verifyVersions: async () => ({ status: 'passed', versions, evidenceSHA256: sha,
      modules: Object.fromEntries(Object.keys(accepted).map(service => [service, sha])),
      recoveryVersions: { gachia: uuid(700), 'gachia-game-genshin': uuid(600) } }),
    upload: () => assert.fail('Continuation must not upload'),
    promote: async args => { calls.push(args); current.services[args.service] = { id: uuid(calls.length + 800), versions: [{ version_id: args.versionId, percentage: 100 }] }; },
    acceptProduction: async () => ({ status: 'passed', releaseKey: sha, versions, evidenceSHA256: sha }) };
  const options = { run: f.run, retentionId: id, verify: async () => structuredClone(input), authorize: async () => sha, transport };
  return { ...f, input, options, transport, current, calls, journal: () => readReleaseJournal(join(f.run, `promotion-${id}.jsonl`), { releaseKey: sha }) };
}

test('separate promotion continuation uses accepted UUIDs only; replay refuses before another move', async t => {
  const f = continuation(t); assert.equal((await executePromotionContinuation(f.options)).status, 'production_accepted');
  assert.deepEqual(f.calls.map(x => x.versionId), [uuid(100), uuid(200)]);
  await assert.rejects(executePromotionContinuation(f.options), { code: 'EEXIST' }); assert.equal(f.calls.length, 2);
  assert.equal(reconcileJournal(f.journal(), f.current).status, 'candidates_active_acceptance_still_required');
});

for (const reason of ['local-recovery', 'old-uuid', 'expired', 'stale-recovery', 'unauthorized', 'remote-uuid', 'remote-module', 'remote-recovery', 'topology', 'retention-replay', 'extra-owner']) test(`continuation gate refuses ${reason} before traffic`, async t => {
  const f = continuation(t);
  if (reason === 'local-recovery') f.input.recovery.status = 'local_recovery_evidence_verified';
  if (reason === 'old-uuid') f.input.recovery.owners.main.versionId = f.input.recovery.owners.main.sourceVersionId;
  if (reason === 'expired') f.input.accepted.gachia.acceptedAt -= 900001;
  if (reason === 'stale-recovery') f.input.recovery.owners.main.acceptedAt -= 900001;
  if (reason === 'unauthorized') f.options.authorize = async () => 'wrong';
  if (reason === 'remote-uuid') f.transport.verifyVersions = async () => ({ status: 'passed', versions: {} });
  if (reason === 'remote-module' || reason === 'remote-recovery') {
    const verify = f.transport.verifyVersions;
    f.transport.verifyVersions = async () => ({ ...await verify(), [reason === 'remote-module' ? 'modules' : 'recoveryVersions']: {} });
  }
  if (reason === 'topology') f.current.routes.push({ pattern: 'changed' });
  if (reason === 'retention-replay') f.options.retentionId = 'c'.repeat(16);
  if (reason === 'extra-owner') f.input.accepted['gachia-router'] = f.input.accepted.gachia;
  await assert.rejects(executePromotionContinuation(f.options)); assert.equal(f.calls.length, 0);
});

for (const failure of ['first-response-lost', 'second-write', 'public-acceptance', 'changed-proof']) test(`continuation stops and reconciles ${failure}`, async t => {
  const f = continuation(t), promote = f.transport.promote;
  f.transport.promote = async args => {
    if (failure === 'second-write' && args.owner === 'main') throw Error('second write failure');
    await promote(args);
    if (failure === 'first-response-lost') throw Error('response lost');
    if (failure === 'changed-proof') f.input.journalPin = 'c'.repeat(64);
  };
  if (failure === 'public-acceptance') f.transport.acceptProduction = async () => { throw Error('public mismatch'); };
  await assert.rejects(executePromotionContinuation(f.options));
  assert.equal(f.calls.length, failure === 'public-acceptance' ? 2 : 1);
  const journal = f.journal(); assert.equal(journal.rows.at(-1).phase, 'reconciliation');
  assert.equal(journal.rows.at(-1).result.automaticRollback, false);
  assert.equal(reconcileJournal(journal, f.current).status, failure === 'public-acceptance' ? 'candidates_active_acceptance_still_required' : 'partial_promotion_requires_manual_reconciliation');
});

test('local recovery audit binds full artifact, network bodies, baseline JSON and every candidate asset', async t => {
  const root = directory(t), retained = join(root, 'retained'), recovered = join(root, 'recovered'); mkdirSync(retained); mkdirSync(recovered);
  const plan = { preview: true, game: 'genshin', owners: ['genshin', 'main'], changed: ['one'], releaseKey: sha, sourceSHA256: digest('old-content') }, receipt = { owners: {} };
  const recovery = { status: 'old_runtime_with_old_and_new_static_local_http_verified', releaseKey: sha, retentionPin: sha, cloudWrites: false, rawUuidRollbackAuthorized: false, directory: recovered, owners: {} };
  for (const [index, owner] of plan.owners.entries()) {
    const artifact = join(recovered, owner, '.open-next'); mkdirSync(join(artifact, 'assets/_next/static'), { recursive: true }); writeFileSync(join(artifact, 'worker.js'), 'old runtime'); writeFileSync(join(artifact, 'assets/_next/static/a.js'), 'union');
    mkdirSync(join(artifact, '.build')); writeFileSync(join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}'); writeFileSync(join(artifact, 'assets/BUILD_ID'), 'fixture');
    const tree = artifactFiles(artifact); writeFileSync(join(recovered, `${owner}-inventory.json`), json(tree));
    const forward = tree.filter(row => row.path.startsWith('assets/')); writeFileSync(join(retained, `${owner}-inventory.json`), json(forward));
    receipt.owners[owner] = { previousVersion: uuid(index + 1), artifactSHA256: digest(json(forward)) };
    const paths = ['/_next/static/a.js', '/sitemap.xml', owner === 'main' ? '/data/genshin/raw-guides.json' : '/zh/genshin/guides/one'];
    const observations = paths.map((path, i) => { const body = i === 0 ? 'union' : 'old-content', bodyFile = `${owner}-${i}.body`; writeFileSync(join(recovered, bodyFile), body); return { path, bodyFile, sha256: digest(body), status: 200 }; });
    recovery.owners[owner] = { status: 'passed', oldVersionId: uuid(index + 1), artifactSHA256: digest(json(tree)), observations };
  }
  const path = join(root, 'receipt.json'); writeFileSync(path, json(recovery));
  const verified = { plan, receipt, directory: retained, retentionPin: sha }, pin = digest(json(recovery));
  assert.equal(verifyRecoveryCompatibility(path, pin, verified).cloudRecoveryAccepted, false);
  writeFileSync(join(recovered, 'genshin/.open-next/assets/_next/static/a.js'), 'wrong');
  assert.throws(() => verifyRecoveryCompatibility(path, pin, verified), /artifact changed/);
  writeFileSync(join(recovered, 'genshin/.open-next/assets/_next/static/a.js'), 'union');
  writeFileSync(join(recovered, 'main-2.body'), 'new-content'); assert.throws(() => verifyRecoveryCompatibility(path, pin, verified), /HTTP evidence changed/);
  const original = Buffer.from('[{"id":"one","title":"O"}]'), published = Buffer.from('[{"id":"one","title":"A"}]');
  plan.preview = false; plan.sourceSHA256 = digest(original);
  const snapshot = state();
  snapshot.services.gachia.versions[0].version_id = receipt.owners.main.previousVersion;
  snapshot.services['gachia-game-genshin'].versions[0].version_id = receipt.owners.genshin.previousVersion;
  const baseline = await capturePublishedBaseline({ plan, importBytes: original, directory: join(root, 'published-A'),
    observe: async () => structuredClone(snapshot), request: async () => new Response(published, { headers: { 'content-type': 'application/json' } }) });
  writeFileSync(join(recovered, 'main-2.body'), published);
  recovery.owners.main.observations[2].sha256 = digest(published);
  const unbound = join(root, 'unbound.json'); writeFileSync(unbound, json(recovery));
  assert.throws(() => verifyRecoveryCompatibility(unbound, digest(json(recovery)), verified), /version-bound/);
  const bound = await bindPublishedBaseline({ evidencePath: unbound, evidencePin: digest(json(recovery)), ...baseline, destination: join(root, 'bound.json'), verified });
  assert.equal(verifyRecoveryCompatibility(bound.evidencePath, bound.evidencePin, verified).status, 'local_recovery_evidence_verified');
  assert.equal(digest(readFileSync(unbound)), digest(json(recovery)), 'Binding never rewrites original receipts');
  writeFileSync(join(recovered, 'main-2.body'), original);
  assert.throws(() => verifyRecoveryCompatibility(bound.evidencePath, bound.evidencePin, verified), /HTTP evidence changed/);
});

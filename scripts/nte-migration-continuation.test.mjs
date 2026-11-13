import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { executeNteMigration } from './genshin-production-migration.mjs';
import { assertNteStoppedRouterRecovery, assertNteStoppedMainRecovery, executeNteRouterContinuation, executeNteMainContinuation } from './nte-migration-continuation.mjs';
import { NTE_MIGRATION_POLICY, NTE_MIGRATION_ORDER, NTE_SERVICES, nteExpectedBindings } from './nte-release-config.mjs';
const sha = c => c.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const timeout = 'Production read failed: https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia/subdomain';
async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'nte-continuation-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const baseline = { services: {}, bindings: {}, settings: {}, subdomains: {}, scripts: [...SERVICES], routes: [], domains: [] };
  for (const [i, service] of SERVICES.entries()) {
    baseline.services[service] = { id: uuid(i + 1), versions: [{ version_id: uuid(i + 20), percentage: 100 }] };
    baseline.bindings[service] = []; baseline.settings[service] = { bindings: [], tags: [] }; baseline.subdomains[service] = { enabled: true, previews_enabled: true };
  }
  const identity = { policy: NTE_MIGRATION_POLICY, releaseKey: sha('a'), sourceCommit: 'b'.repeat(40), sourceCI: { commit: 'b'.repeat(40), runID: 1, status: 'full_exact_ci_passed' }, sourceIndexPin: sha('c'), activePin: sha('d'), baseline, observedAt: Date.now(), owners: {} };
  for (const owner of NTE_MIGRATION_ORDER) identity.owners[owner] = { service: NTE_SERVICES[owner], sourceVersionId: baseline.services[NTE_SERVICES[owner]].versions[0].version_id, sourceIdentityPin: sha('e'), ...Object.fromEntries(['recovery', 'candidate'].map(role => [role, { moduleSHA256: sha('1'), artifactPin: sha('2'), configPin: sha('3'), referencesPin: sha('4') }])) };
  const cloud = structuredClone(baseline), calls = [], uploaded = {}; let interrupt = false, interrupted = false, recovery;
  const transport = {
    snapshot: async () => { if (interrupt && !interrupted) { interrupted = true; throw Error(timeout); } return structuredClone(cloud); },
    upload: async args => {
      calls.push(`upload:${args.owner}:${args.role}`); const id = uuid(100 + NTE_MIGRATION_ORDER.indexOf(args.owner) * 2 + (args.role === 'candidate' ? 1 : 0)); uploaded[args.owner + ':' + args.role] = id;
      if (args.role === 'candidate') { const bindings = nteExpectedBindings(baseline, args.owner, args.role); cloud.bindings[args.service] = bindings; cloud.settings[args.service].bindings = structuredClone(bindings); }
      return { versionId: id };
    },
    inspect: async args => {
      calls.push(`inspect:${args.owner}:${args.role}`); const proof = { versionId: args.versionId, moduleSHA256: args.sealed.moduleSHA256, moduleProof: { path: '/test/receipt.json', pin: sha('5') }, versionPin: sha('6') };
      if (args.owner === 'router' && args.role === 'recovery') { recovery = proof; interrupt = true; } return proof;
    },
    preview: async args => { calls.push(`preview:${args.owner}:${args.role}`); return { service: args.service, versionId: args.versionId, observationMode: 'cloud_exact_version', status: 'passed', evidenceSHA256: sha('7') }; },
    revalidate: async args => { calls.push(`revalidate:${args.owner}:${args.role}`); },
    promote: async args => { calls.push(`promote:${args.owner}`); const result = { ...args, deploymentId: uuid(200 + calls.length) }; cloud.services[args.service] = { id: result.deploymentId, versions: [{ version_id: args.versionId, percentage: 100 }] }; return result; },
    acceptStep: async ({ owner }) => { calls.push(`accept:${owner}`); return { status: 'passed', evidenceSHA256: sha('8') }; },
    acceptProduction: async () => ({ status: 'passed', evidenceSHA256: sha('9'), versions: Object.fromEntries(NTE_MIGRATION_ORDER.map(owner => [NTE_SERVICES[owner], uploaded[owner + ':candidate']])) }),
  };
  const original = join(root, 'original'); mkdirSync(original);
  await assert.rejects(executeNteMigration({ run: original, releaseKey: identity.releaseKey, verify: async () => identity, transport }), /Production read failed/);
  const bytes = readFileSync(join(original, `nte-migration-${identity.releaseKey}.jsonl`)), rows = bytes.toString().trim().split('\n').map(JSON.parse);
  const previous = { journal: { path: join(original, `nte-migration-${identity.releaseKey}.jsonl`), pin: digest(bytes) }, identity, routerRecovery: recovery };
  const next = { ...identity, releaseKey: sha('f'), observedAt: Date.now() }, run = join(root, 'continued'); mkdirSync(run);
  return { identity, rows, previous, next, run, cloud, calls, transport, verify: async () => next };
}
test('continues only remaining owners and reuses the returned Router recovery upload', async t => {
  const f = await fixture(t), before = f.calls.length, oldPin = f.previous.journal.pin;
  const result = await executeNteRouterContinuation({ ...f, releaseKey: f.next.releaseKey }); assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls.slice(before).filter(c => c.startsWith('upload:')), ['upload:router:candidate', 'upload:main:recovery', 'upload:main:candidate']);
  assert.deepEqual(f.calls.slice(before).filter(c => c.startsWith('promote:')), ['promote:router', 'promote:main']);
  assert(f.calls.slice(before).includes('preview:router:recovery')); assert.equal(digest(readFileSync(f.previous.journal.path)), oldPin);
  await assert.rejects(executeNteRouterContinuation({ ...f, releaseKey: f.next.releaseKey }), /EEXIST/);
});
test('rejects missing, unknown, reordered, drifted or different stopped prefixes', async t => {
  const f = await fixture(t); assertNteStoppedRouterRecovery(f.identity, f.rows);
  for (const mutate of [
    r => r.splice(11, 1), r => r[11].versionId = uuid(999), r => r[12].pendingOperation = undefined,
    r => r[12].automaticRetry = true, r => r[12].error = 'unknown upload', r => r[12].deployed.main = uuid(999),
    r => r[13].snapshot.services.gachia.id = uuid(999), r => r[13].snapshot.settings['gachia-staging'].tags.push('drift'),
    r => r[10].sealed.configPin = sha('0'), r => r[9].proof.status = 'failed', r => r[10].role = 'candidate',
    r => r[11].at = '2000-01-01T00:00:00Z', r => r[11].releaseKey = sha('0'),
  ]) { const rows = structuredClone(f.rows); mutate(rows); assert.throws(() => assertNteStoppedRouterRecovery(f.identity, rows)); }
});
test('changed stopped bytes and current topology stop before any new upload', async t => {
  for (const corrupt of [false, true]) {
    const f = await fixture(t), before = f.calls.length;
    if (corrupt) writeFileSync(f.previous.journal.path, 'changed'); else f.cloud.services.gachia.id = uuid(999);
    await assert.rejects(executeNteRouterContinuation({ ...f, releaseKey: f.next.releaseKey }));
    assert.equal(f.calls.slice(before).filter(c => c.startsWith('upload:')).length, 0);
  }
});
test('failed known recovery preview cannot upload candidate or deploy', async t => {
  const f = await fixture(t), before = f.calls.length; f.transport.preview = async () => { throw Error('preview failed'); };
  await assert.rejects(executeNteRouterContinuation({ ...f, releaseKey: f.next.releaseKey }), /preview failed/);
  assert.equal(f.calls.slice(before).filter(c => c.startsWith('upload:') || c.startsWith('promote:')).length, 0);
  const rows = readFileSync(join(f.run, `nte-migration-${f.next.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.at(-2).phase, 'stopped'); assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
  assert.throws(() => assertNteStoppedRouterRecovery(f.identity, rows));
});

test('Main continuation reuses both live owners and its known recovery upload, then uploads and deploys Main once', async t => {
  const f = await fixture(t), inspect = f.transport.inspect, preview = f.transport.preview; let mainRecovery;
  f.transport.inspect = async args => { const proof = await inspect(args); if (args.owner === 'main' && args.role === 'recovery') mainRecovery = proof; return proof; };
  f.transport.preview = async args => { if (args.owner === 'main' && args.role === 'recovery') throw Error('Missing page content changed: /data/genshin/raw-character-materials.json'); return preview(args); };
  await assert.rejects(executeNteRouterContinuation({ ...f, releaseKey: f.next.releaseKey }), /Missing page content changed/);
  const journalPath = join(f.run, `nte-migration-${f.next.releaseKey}.jsonl`), bytes = readFileSync(journalPath), rows = bytes.toString().trim().split('\n').map(JSON.parse);
  assertNteStoppedMainRecovery(f.next, rows);
  for (const mutate of [r => r[12].error = 'unknown upload', r => r[12].deployed.main = uuid(999), r => r[11].versionId = uuid(999), r => r[13].snapshot.services['gachia-game-genshin'].id = uuid(999), r => r[12].pendingOperation = undefined]) { const changed = structuredClone(rows); mutate(changed); assert.throws(() => assertNteStoppedMainRecovery(f.next, changed)); }
  const previous = { journal: { path: journalPath, pin: digest(bytes) }, identity: f.next, mainRecovery }, next = { ...f.next, releaseKey: sha('0'), observedAt: Date.now() }, run = join(f.run, 'main-only'); mkdirSync(run);
  f.transport.preview = preview; const before = f.calls.length;
  const result = await executeNteMainContinuation({ run, releaseKey: next.releaseKey, verify: async () => next, transport: f.transport, previous });
  assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls.slice(before).filter(c => c.startsWith('upload:')), ['upload:main:candidate']);
  assert.deepEqual(f.calls.slice(before).filter(c => c.startsWith('promote:')), ['promote:main']);
  assert(f.calls.slice(before).includes('preview:main:recovery')); assert.equal(digest(readFileSync(journalPath)), previous.journal.pin);
});

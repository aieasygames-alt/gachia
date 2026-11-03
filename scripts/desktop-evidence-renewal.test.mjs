import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeEvidenceRenewal } from './desktop-evidence-renewal.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function fixture(t, failure) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'cms-renewal-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: SERVICES };
  const evidence = { plan: { game: 'genshin', owners: ['genshin', 'main'], releaseKey: sha }, baseline, manifest: { owners: {} }, accepted: {}, recovery: { owners: {} } };
  const sealed = { candidate: { directory: join(run, 'candidate') }, directory: join(run, 'recovery'), manifest: { owners: {} } };
  const refs = '[{"path":"/sample"}]';
  for (const [i, owner] of evidence.plan.owners.entries()) {
    const service = owner === 'main' ? 'gachia' : 'gachia-game-genshin';
    const record = { service, referencesSHA256: digest(refs) };
    evidence.manifest.owners[owner] = record; sealed.manifest.owners[owner] = record;
    evidence.accepted[service] = { versionId: uuid(100 + i), acceptedAt: 1 };
    evidence.recovery.owners[owner] = { versionId: uuid(200 + i), acceptedAt: 1 };
    for (const root of [sealed.directory, sealed.candidate.directory]) {
      mkdirSync(join(root, owner), { recursive: true }); writeFileSync(join(root, owner, 'references.json'), refs);
    }
  }
  let directory, snapshots = 0, reads = 0; const calls = [];
  const options = { input: { run, releaseKey: sha, journalPin: sha, receiptPin: sha, recoveryBundlePin: sha },
    readEvidence: () => { const e = structuredClone(evidence); if (++reads > 1 && failure === 'original-changed') e.journalPin = 'changed'; return e; },
    readSealed: () => sealed,
    makeTransport: ({ evidenceDirectoryName }) => {
      directory = join(run, evidenceDirectoryName); mkdirSync(directory);
      return { snapshot: async () => { const s = structuredClone(baseline); if (++snapshots > 1 && failure === 'topology') s.routes.push('changed'); return s; },
        verifyVersions: async () => { calls.push('modules'); if (failure === 'modules') throw Error('module changed'); return { status: 'passed', evidenceSHA256: sha }; },
        promote: () => assert.fail('Renewal must never write cloud state') };
    },
    preview: async ({ versionId, service, references }) => {
      calls.push({ versionId, service }); assert.deepEqual(references, JSON.parse(refs));
      if (failure === 'http') throw Error('body differs'); return { evidenceSHA256: sha };
    },
  };
  return { options, evidence, calls, result: () => JSON.parse(readFileSync(join(directory, 'renewal.json'))) };
}
test('same UUID renewal creates new proof without overwriting original times or uploading', async t => {
  const f = fixture(t), before = structuredClone(f.evidence);
  const output = await executeEvidenceRenewal(f.options), saved = f.result();
  assert.equal(output.cloudWrites, false); assert.equal(saved.status, 'passed'); assert.equal(f.calls.length, 5);
  assert.deepEqual(f.evidence, before);
  assert.deepEqual(f.calls.slice(1).map(c => c.versionId), [uuid(100), uuid(200), uuid(101), uuid(201)]);
  for (const proof of Object.values(saved.owners)) assert(proof.acceptedAt > 1);
});
for (const failure of ['modules', 'http', 'topology', 'original-changed']) test(`renewal persists failed evidence on ${failure}`, async t => {
  const f = fixture(t, failure); await assert.rejects(executeEvidenceRenewal(f.options));
  assert.equal(f.result().status, 'failed'); assert.equal(f.result().cloudWrites, false);
});
test('four fixed read-only previews overlap without changing coverage or evidence order', async t => {
  const f = fixture(t); let active = 0, peak = 0, completed = 0;
  f.options.preview = async () => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--; completed++; return { evidenceSHA256: sha };
  };
  await executeEvidenceRenewal(f.options);
  assert.equal(peak, 4); assert.equal(completed, 4); assert.equal(active, 0);
  assert.deepEqual(Object.keys(f.result().owners), ['genshin-candidate', 'genshin-recovery', 'main-candidate', 'main-recovery']);
});
test('failed renewal waits for every sibling and preserves completed proofs before sealing failure', async t => {
  const f = fixture(t); let started = 0, completed = 0;
  f.options.preview = async () => {
    const i = started++;
    await new Promise(resolve => setTimeout(resolve, i === 0 ? 1 : 20));
    completed++; if (i === 0) throw Error('first preview failed');
    return { evidenceSHA256: sha };
  };
  await assert.rejects(executeEvidenceRenewal(f.options), /first preview failed/);
  assert.equal(started, 4); assert.equal(completed, 4);
  assert.equal(f.result().status, 'failed'); assert.equal(Object.keys(f.result().owners).length, 3);
});

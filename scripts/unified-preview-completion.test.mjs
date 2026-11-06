import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { executeUnifiedPreviewCompletion, readUnifiedObservationStop } from './unified-preview-completion.mjs';
import { unifiedHTMLParserPin } from './unified-version-preview.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const json = value => JSON.stringify(value, null, 2) + '\n';
function fixture(t) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-completion-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(20 + i), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const target = { moduleSHA256: sha, artifactPin: sha, referencesPin: sha, configPin: sha };
  const value = { preview: false, transportPin: sha, releaseKey: 'b'.repeat(64), changed: ['unified:record'], ownerOrder: ['main'], baseline,
    identityObservedAt: Date.now() - 1000, owners: { main: { service: 'gachia', sourceVersionId: uuid(1), sourceIdentityPin: sha, candidate: target, recovery: target } },
    preservedOwners: { genshin: { identityPin: sha } } };
  const root = join(run, `unified-cloud-preview-${sha}`), http = join(root, 'recovery-main/http');
  mkdirSync(http, { recursive: true, mode: 0o700 }); mkdirSync(join(root, 'recovery-main/module'), { mode: 0o700 });
  const rows = [{ phase: 'baseline', directory: root, baseline }, { phase: 'upload_intent', owner: 'main', role: 'recovery', service: 'gachia', moduleSHA256: sha },
    { phase: 'upload_response', owner: 'main', role: 'recovery', service: 'gachia', versionId: uuid(100) },
    { phase: 'upload_returned', owner: 'main', role: 'recovery', service: 'gachia', versionId: uuid(100) },
    { phase: 'stopped', pendingOperation: { role: 'recovery', owner: 'main', service: 'gachia', versionId: uuid(100) },
      uploaded: { recovery: { gachia: { versionId: uuid(100) } } }, accepted: { recovery: {} }, error: 'fetch failed', automaticRetry: false, automaticRollback: false },
    { phase: 'read_only_reconciliation', snapshot: baseline, recovery: { status: 'baseline_active', drift: [], cloudWrites: false, owners: { gachia: {} } },
      candidate: { status: 'baseline_active', drift: [], cloudWrites: false, owners: {} } }].map(row => ({ at: new Date().toISOString(), releaseKey: value.releaseKey, transportPin: sha, ...row }));
  const stop = {}, save = (name, file, contents) => { writeFileSync(file, contents, { mode: 0o600 }); stop[name] = { path: file, pin: digest(contents) }; };
  save('journal', join(run, `unified-preview-${sha}.jsonl`), rows.map(JSON.stringify).join('\n') + '\n');
  save('http', join(http, 'result.json'), json({ schemaVersion: 1, kind: 'unified_exact_version_preview', status: 'failed', service: 'gachia', versionId: uuid(100),
    origin: 'https://00000000-gachia.aieasygames.workers.dev', observationMode: 'cloud_exact_version', parserPin: unifiedHTMLParserPin(), observations: [], error: 'fetch failed' }));
  save('version', join(root, 'recovery-main/version.json'), json({ id: uuid(100) }));
  save('module', join(root, 'recovery-main/module/receipt.json'), json({ schemaVersion: 1, kind: 'unified_upload_time_module_receipt', service: 'gachia', versionId: uuid(100), moduleSHA256: sha }));
  const verifyStop = () => readUnifiedObservationStop({ run, stop, value });
  let observation = 0;
  const verify = async () => ({ ...structuredClone(value), identityObservedAt: value.identityObservedAt + observation++, stop: structuredClone(stop),
    stopPin: digest(json(stop)), networkPin: sha, existingRecovery: verifyStop() });
  const calls = [], transport = {
    snapshot: async () => structuredClone(baseline), reuseRecovery: async args => { calls.push(['reuse', args.role, args.versionId]); },
    revalidate: async () => {},
    upload: async args => { calls.push(['upload', args.role]); assert.equal(args.role, 'candidate'); return { versionId: uuid(101) }; },
    inspect: async () => ({ moduleSHA256: sha, versionPin: sha, moduleProof: { path: '/fixed-wrapper/module.json', pin: sha } }),
    preview: async args => ({ service: 'gachia', versionId: args.versionId, status: 'passed', observationMode: 'cloud_exact_version',
      parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2'), evidenceSHA256: sha }),
  };
  const args = { run, directory: join(run, `unified-cloud-preview-completion-${sha}`), verify, authorize: () => value.releaseKey, transport };
  const journal = () => readFileSync(join(run, `unified-preview-completion-${sha}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  const mutateJSON = (name, fn) => { const obj = JSON.parse(readFileSync(stop[name].path)); fn(obj); save(name, stop[name].path, json(obj)); };
  const mutateJournal = fn => { fn(rows); save('journal', stop.journal.path, rows.map(JSON.stringify).join('\n') + '\n'); };
  return { args, value, stop, calls, verifyStop, journal, mutateJSON, mutateJournal };
}

test('known recovery is observed without re-upload; only the never-attempted candidate is uploaded', async t => {
  const f = fixture(t), original = readFileSync(f.stop.journal.path), result = await executeUnifiedPreviewCompletion(f.args);
  assert.equal(result.productionPromoted, false); assert.equal(result.status, 'all_cloud_previews_accepted_no_promotion');
  assert.deepEqual(f.calls, [['reuse', 'recovery', uuid(100)], ['upload', 'candidate']]);
  assert(readFileSync(f.stop.journal.path).equals(original)); assert.equal(f.journal().at(-1).phase, 'all_cloud_previews_accepted_no_promotion');
  await assert.rejects(executeUnifiedPreviewCompletion(f.args), /EEXIST/); assert.equal(f.calls.length, 2);
});

for (const fault of ['candidate-intent', 'unknown-recovery', 'semantic-error', 'partial-http', 'local-http', 'wrong-module', 'wrong-version', 'drift', 'foreign-path', 'edited-proof', 'future-journal', 'backward-journal', 'wrong-http-schema', 'wrong-module-schema']) test(`stopped evidence refuses ${fault}`, t => {
  const f = fixture(t);
  if (fault === 'candidate-intent') f.mutateJournal(rows => rows.push({ ...rows[1], role: 'candidate' }));
  if (fault === 'unknown-recovery') f.mutateJournal(rows => { rows[2].versionId = null; });
  if (fault === 'semantic-error') f.mutateJournal(rows => { rows[4].error = 'wrong module'; });
  if (fault === 'partial-http') f.mutateJSON('http', obj => { obj.observations.push({ path: '/' }); });
  if (fault === 'local-http') f.mutateJSON('http', obj => { obj.observationMode = 'loopback_exact_host'; });
  if (fault === 'wrong-module') f.mutateJSON('module', obj => { obj.moduleSHA256 = 'c'.repeat(64); });
  if (fault === 'wrong-version') f.mutateJSON('version', obj => { obj.id = uuid(555); });
  if (fault === 'drift') f.mutateJournal(rows => { rows[5].snapshot = { ...rows[5].snapshot, scripts: [] }; });
  if (fault === 'foreign-path') f.stop.http.path += '.other';
  if (fault === 'edited-proof') writeFileSync(f.stop.http.path, '{}');
  if (fault === 'future-journal') f.mutateJournal(rows => { rows[2].at = new Date(Date.now() + 60000).toISOString(); });
  if (fault === 'backward-journal') f.mutateJournal(rows => { rows[2].at = new Date(Date.now() - 60000).toISOString(); });
  if (fault === 'wrong-http-schema') f.mutateJSON('http', obj => { obj.schemaVersion = 2; });
  if (fault === 'wrong-module-schema') f.mutateJSON('module', obj => { obj.schemaVersion = 2; });
  assert.throws(f.verifyStop); assert.equal(f.calls.length, 0);
});

for (const fault of ['recovery-http', 'local-evidence', 'legacy-parser', 'changed-parser', 'lost-candidate-response', 'inspect', 'candidate-http', 'changed-source']) test(`completion stops permanently on ${fault}`, async t => {
  const f = fixture(t);
  if (fault === 'recovery-http') f.args.transport.preview = async () => { throw Error('HTTP failed'); };
  if (fault === 'local-evidence') f.args.transport.preview = async args => ({ service: 'gachia', versionId: args.versionId, status: 'passed', observationMode: 'loopback_exact_host', evidenceSHA256: sha });
  if (fault === 'legacy-parser' || fault === 'changed-parser') { const preview = f.args.transport.preview; f.args.transport.preview = async args => ({ ...await preview(args),
    ...(fault === 'legacy-parser' ? { parserVersion: 'legacy-v1', parserPin: unifiedHTMLParserPin() } : { parserPin: 'f'.repeat(64) }) }); }
  if (fault === 'lost-candidate-response') f.args.transport.upload = async () => { f.calls.push(['upload', 'candidate']); throw Error('response lost'); };
  if (fault === 'inspect') f.args.transport.inspect = async () => { throw Error('wrong uploaded module'); };
  if (fault === 'candidate-http') { const preview = f.args.transport.preview; f.args.transport.preview = args => { if (args.role === 'candidate') throw Error('candidate body differs'); return preview(args); }; }
  if (fault === 'changed-source') { const verify = f.args.verify; let n = 0; f.args.verify = async () => { const v = await verify(); if (++n > 1) v.preservedOwners.genshin.identityPin = 'c'.repeat(64); return v; }; }
  await assert.rejects(executeUnifiedPreviewCompletion(f.args)); const rows = f.journal();
  assert.equal(rows.at(-2).phase, 'stopped'); assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
  assert.equal(rows.at(-2).automaticRetry, false); assert.equal(rows.at(-2).automaticRollback, false);
  if (fault === 'lost-candidate-response') assert.equal(rows.at(-1).candidateUploadOutcomeUnknown, true);
  const count = f.calls.length; await assert.rejects(executeUnifiedPreviewCompletion(f.args), /EEXIST/); assert.equal(f.calls.length, count);
});

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES, reconcileRelease } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { executeUnifiedPreviewCompletion, executeUnifiedUploadedPairCompletion, readUnifiedObservationStop, readUnifiedUploadedPairStop, unifiedUploadedPairStopPin } from './unified-preview-completion.mjs';
import { readUnifiedCloudPreviews } from './unified-promotion-protocol.mjs';
import { unifiedHTMLParserPin, unifiedPreviewReferences, verifyUnifiedVersionPreview } from './unified-version-preview.mjs';

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

async function uploadedPairFixture(t) {
  const f = fixture(t), { run } = f.args, root = join(run, `unified-cloud-preview-${sha}`);
  const stop = { journal: f.stop.journal }, savedRows = readFileSync(f.stop.journal.path, 'utf8').trim().split('\n').map(JSON.parse);
  const rows = [savedRows[0]], save = (file, contents) => { writeFileSync(file, contents); return { path: file, pin: digest(contents) }; };
  const bodies = ['<xml/>', 'User-agent: *\nDisallow: /\n', '<!doctype html><html><head><title>HI3</title><meta name="description" content="Guide"><link rel="canonical" href="https://gachia.com/zh/hi3/guide"></head><body><h1>Guide</h1></body></html>'],
    paths = ['/sitemap.xml', '/robots.txt', '/zh/hi3/guide'];
  const refs = bodies.map((body, i) => ({ path: paths[i], status: 200, headers: { 'content-type': ['application/xml', 'text/plain', 'text/html'][i], 'cache-control': 'private, no-store' },
    bytes: Buffer.byteLength(body), sha256: digest(body), bodyFile: `${i}.body` }));
  const references = () => unifiedPreviewReferences(refs, (_, i) => Buffer.from(bodies[i]), 'streaming-v2');
  const uploaded = {}, accepted = { recovery: {}, candidate: {} };
  for (const [i, role] of ['recovery', 'candidate'].entries()) {
    const directory = join(root, `${role}-main`), versionId = uuid(100 + i);
    mkdirSync(join(directory, 'module'), { recursive: true });
    rmSync(join(directory, 'http'), { recursive: true, force: true });
    await verifyUnifiedVersionPreview({ directory: join(directory, 'http'), service: 'gachia', versionId, references: references(), parserVersion: 'streaming-v2',
      request: async url => { const n = paths.indexOf(new URL(url).pathname); return new Response(bodies[n], { headers: { ...refs[n].headers, 'x-robots-tag': 'noindex' } }); } });
    stop[role] = { http: { path: join(directory, 'http/result.json'), pin: digest(readFileSync(join(directory, 'http/result.json'))) },
      version: save(join(directory, 'version.json'), json({ id: versionId })),
      module: save(join(directory, 'module/receipt.json'), json({ schemaVersion: 1, kind: 'unified_upload_time_module_receipt', service: 'gachia', versionId, moduleSHA256: sha })) };
    for (const phase of ['upload_intent', 'upload_response', 'upload_returned']) rows.push({ ...savedRows[1], phase, role,
      ...(phase === 'upload_intent' ? {} : { versionId }) });
    uploaded[role] = { gachia: { versionId } };
    if (role === 'recovery') {
      const proof = { service: 'gachia', versionId, moduleSHA256: sha, artifactPin: sha, versionPin: stop[role].version.pin,
        moduleProof: stop[role].module, evidenceSHA256: stop[role].http.pin, acceptedAt: Date.parse(savedRows[1].at),
        parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2') };
      accepted.recovery.main = proof; rows.push({ ...savedRows[1], phase: 'preview_accepted', proof });
    }
  }
  const pendingOperation = { role: 'candidate', owner: 'main', service: 'gachia', versionId: uuid(101) };
  rows.push({ ...savedRows[4], pendingOperation, uploaded, accepted, error: 'Next-batch source handoff expired; take fresh read-only observations' },
    { ...savedRows[5], pendingOperation, recovery: reconcileRelease(f.value.baseline, f.value.baseline, uploaded.recovery),
      candidate: reconcileRelease(f.value.baseline, f.value.baseline, uploaded.candidate) });
  const flush = () => { stop.journal = save(stop.journal.path, rows.map(JSON.stringify).join('\n') + '\n'); };
  flush();
  return { ...f, stop, rows, flush, references, read: () => readUnifiedUploadedPairStop({ run, stop, value: f.value, references }),
    mutate: (role, name, fn) => { const p = stop[role][name], obj = JSON.parse(readFileSync(p.path)); fn(obj); stop[role][name] = save(p.path, json(obj)); } };
}

test('uploaded pair reader preserves original evidence and is not fresh acceptance', async t => {
  const f = await uploadedPairFixture(t), before = readFileSync(f.stop.journal.path), result = f.read();
  assert.equal(result.historicalOnly, true); assert.equal(result.cloudWrites, false);
  assert.equal(result.existing.candidate.versionId, uuid(101)); assert.equal(result.accepted, undefined);
  assert.deepEqual(readFileSync(f.stop.journal.path), before); assert.deepEqual(f.calls, []);
  assert.throws(() => readUnifiedObservationStop({ run: f.args.run, value: f.value, stop: { journal: f.stop.journal, ...f.stop.recovery } }), /Only a known recovery/);
});

async function pairCompletionFixture(t) {
  const f = await uploadedPairFixture(t), original = f.read(), observations = [], boundaries = [];
  const args = { run: f.args.run, authorize: () => f.value.releaseKey,
    verify: async () => {
      boundaries.push(observations.length);
      return { ...f.value, identityObservedAt: Date.now(), stop: f.stop, stopPin: unifiedUploadedPairStopPin(f.stop), networkPin: sha, existingPair: original.existing };
    },
    transport: { snapshot: async () => f.value.baseline, revalidate: async () => {}, observe: async args => {
      observations.push(args.role); mkdirSync(args.directory);
      writeFileSync(join(args.directory, 'version.json'), readFileSync(f.stop[args.role].version.path));
      const old = JSON.parse(readFileSync(f.stop[args.role].http.path)), root = join(f.stop[args.role].http.path, '..');
      return verifyUnifiedVersionPreview({ directory: join(args.directory, 'http'), service: args.service, versionId: args.versionId,
        references: f.references(), parserVersion: 'streaming-v2', request: async url => {
          const row = old.observations.find(row => row.path === new URL(url).pathname);
          return new Response(readFileSync(join(root, row.bodyFile)), { status: row.status, headers: row.headers });
        } });
    } } };
  return { ...f, completionArgs: args, observations, boundaries, reopen: result => readUnifiedCloudPreviews({ run: args.run, directory: result.directory,
    pin: result.receiptPin, value: f.value, references: f.references }) };
}

test('read-only uploaded pair completion is consumable by promotion reader without rewriting original evidence', async t => {
  const f = await pairCompletionFixture(t), bytes = readFileSync(f.stop.journal.path);
  const result = await executeUnifiedUploadedPairCompletion(f.completionArgs), reopened = f.reopen(result);
  assert.equal(result.cloudWrites, false); assert.deepEqual(reopened.receipt.accepted, result.accepted);
  assert.deepEqual(f.observations, ['recovery', 'candidate']); assert.deepEqual(readFileSync(f.stop.journal.path), bytes);
  assert.deepEqual(f.boundaries, [0, 1, 2], 'Verify before observation and after each version without redundant adjacent passes');
  await assert.rejects(executeUnifiedUploadedPairCompletion(f.completionArgs), /EEXIST/);
});

for (const fault of ['writer', 'authorization', 'source', 'final-source', 'topology', 'module', 'late-module', 'http', 'parser', 'stop-pin']) test(`read-only pair completion rejects ${fault}`, async t => {
  const f = await pairCompletionFixture(t), args = f.completionArgs;
  if (fault === 'writer') args.transport.upload = async () => { throw Error('must never run'); };
  if (fault === 'authorization') args.authorize = () => sha;
  if (['source', 'final-source', 'stop-pin'].includes(fault)) {
    const verify = args.verify; let calls = 0;
    args.verify = async () => { const value = await verify();
      if (fault === 'stop-pin') value.stopPin = sha;
      else if (++calls > (fault === 'final-source' ? 2 : 1)) value.releaseKey = sha;
      return value;
    };
  }
  if (fault === 'topology') args.transport.snapshot = async () => ({ ...f.value.baseline, scripts: [] });
  if (fault === 'module') args.transport.revalidate = async () => { throw Error('module mismatch'); };
  if (fault === 'late-module') { let calls = 0; args.transport.revalidate = async () => { if (++calls === 4) throw Error('module changed after HTTP'); }; }
  if (fault === 'http') args.transport.observe = async () => { throw Error('HTTP mismatch'); };
  if (fault === 'parser') { const observe = args.transport.observe; args.transport.observe = async input => ({ ...await observe(input), parserVersion: 'legacy-v1' }); }
  await assert.rejects(executeUnifiedUploadedPairCompletion(args));
  assert.equal(existsSync(join(args.run, `unified-cloud-uploaded-pair-completion-${sha}`, 'receipt.json')), false);
  if (!['writer', 'authorization', 'stop-pin'].includes(fault)) await assert.rejects(executeUnifiedUploadedPairCompletion(args));
});

for (const fault of ['original-body', 'fresh-body', 'network', 'version', 'accepted-time', 'journal']) test(`uploaded pair completion reader rejects ${fault}`, async t => {
  const f = await pairCompletionFixture(t), result = await executeUnifiedUploadedPairCompletion(f.completionArgs);
  const receiptPath = join(result.directory, 'receipt.json'), receipt = JSON.parse(readFileSync(receiptPath));
  if (fault === 'original-body') writeFileSync(join(f.stop.candidate.http.path, '..', '0.body'), 'changed');
  if (fault === 'fresh-body') writeFileSync(join(result.directory, 'candidate-main/http/0.body'), 'changed');
  if (fault === 'network') receipt.networkPin = 'b'.repeat(64);
  if (fault === 'version') receipt.accepted.candidate.main.versionId = uuid(999);
  if (fault === 'accepted-time') receipt.accepted.candidate.main.acceptedAt = 0;
  if (fault === 'journal') writeFileSync(join(f.args.run, `unified-uploaded-pair-completion-${sha}.jsonl`), '{}\n');
  const raw = json(receipt); writeFileSync(receiptPath, raw); result.receiptPin = digest(raw);
  assert.throws(() => f.reopen(result));
});

for (const fault of ['missing-response', 'unknown-version', 'different-return', 'other-error', 'candidate-accepted', 'changed-pending', 'changed-reconciliation',
  'changed-release', 'future-time', 'backward-time', 'wrong-module', 'wrong-version', 'partial-http', 'legacy-parser', 'local-http', 'body', 'foreign-path',
  'changed-pin', 'wrong-accepted-pin', 'accepted-after-journal']) test(`uploaded pair reader refuses ${fault}`, async t => {
  const f = await uploadedPairFixture(t);
  if (fault === 'missing-response') f.rows.splice(6, 1);
  if (fault === 'unknown-version') delete f.rows[6].versionId;
  if (fault === 'different-return') f.rows[7].versionId = uuid(999);
  if (fault === 'other-error') f.rows[8].error = 'HTTP mismatch';
  if (fault === 'candidate-accepted') f.rows[8].accepted.candidate.main = {};
  if (fault === 'changed-pending') f.rows[8].pendingOperation = {};
  if (fault === 'changed-reconciliation') f.rows[9].candidate.owners.gachia.candidate = uuid(999);
  if (fault === 'changed-release') f.rows[5].releaseKey = sha;
  if (fault === 'future-time') f.rows[9].at = new Date(Date.now() + 60000).toISOString();
  if (fault === 'backward-time') f.rows[5].at = new Date(0).toISOString();
  if (fault === 'wrong-module') f.mutate('candidate', 'module', obj => { obj.moduleSHA256 = 'c'.repeat(64); });
  if (fault === 'wrong-version') f.mutate('candidate', 'version', obj => { obj.id = uuid(999); });
  if (fault === 'partial-http') f.mutate('candidate', 'http', obj => { obj.observations.pop(); });
  if (fault === 'legacy-parser') f.mutate('candidate', 'http', obj => { obj.parserVersion = 'legacy-v1'; obj.parserPin = unifiedHTMLParserPin(); });
  if (fault === 'local-http') f.mutate('candidate', 'http', obj => { obj.observationMode = 'loopback_exact_host'; });
  if (fault === 'body') writeFileSync(join(f.stop.candidate.http.path, '..', '0.body'), 'wrong');
  if (fault === 'foreign-path') f.stop.candidate.module.path += '.other';
  if (fault === 'changed-pin') f.stop.candidate.http.pin = sha;
  if (fault === 'wrong-accepted-pin') f.rows[4].proof.evidenceSHA256 = sha;
  if (fault === 'accepted-after-journal') f.rows[4].proof.acceptedAt += 1;
  f.flush(); assert.throws(f.read); assert.deepEqual(f.calls, []);
});

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { executeUnifiedPreviewCompletion } from './unified-preview-completion.mjs';
import { unifiedHTMLParserPin, unifiedPreviewReferences, verifyUnifiedVersionPreview } from './unified-version-preview.mjs';
import { readUnifiedCloudPreviews } from './unified-promotion-protocol.mjs';
import { assertUnifiedPreviewUploadScope } from './unified-preview-protocol.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const json = value => JSON.stringify(value, null, 2) + '\n';
const canonical = value => JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, { path: value[key].path, pin: value[key].pin }])));
async function fixture(t) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-completed-reader-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const save = (file, value) => { const raw = json(value); writeFileSync(file, raw, { mode: 0o600 }); return { path: file, pin: digest(raw) }; };
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(20 + i), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const target = { moduleSHA256: sha, artifactPin: sha, referencesPin: sha, configPin: sha };
  const value = { preview: false, transportPin: sha, releaseKey: 'b'.repeat(64), changed: ['unified:record'], ownerOrder: ['main'], baseline,
    identityObservedAt: Date.now(), owners: { main: { service: 'gachia', sourceVersionId: uuid(1), sourceIdentityPin: sha, candidate: target, recovery: target } } };
  const old = join(run, `unified-cloud-preview-${sha}`), recovery = join(old, 'recovery-main');
  mkdirSync(join(recovery, 'http'), { recursive: true }); mkdirSync(join(recovery, 'module'));
  const originalRows = [{ phase: 'baseline', directory: old, baseline }, { phase: 'upload_intent', owner: 'main', role: 'recovery', service: 'gachia', moduleSHA256: sha },
    { phase: 'upload_response', owner: 'main', role: 'recovery', service: 'gachia', versionId: uuid(100) },
    { phase: 'upload_returned', owner: 'main', role: 'recovery', service: 'gachia', versionId: uuid(100) },
    { phase: 'stopped', pendingOperation: { role: 'recovery', owner: 'main', service: 'gachia', versionId: uuid(100) },
      uploaded: { recovery: { gachia: { versionId: uuid(100) } } }, accepted: { recovery: {} }, error: 'fetch failed', automaticRetry: false, automaticRollback: false },
    { phase: 'read_only_reconciliation', snapshot: baseline, recovery: { status: 'baseline_active', drift: [], cloudWrites: false, owners: { gachia: {} } },
      candidate: { status: 'baseline_active', drift: [], cloudWrites: false, owners: {} } }]
    .map(row => ({ at: new Date().toISOString(), releaseKey: value.releaseKey, transportPin: sha, ...row }));
  const originalJournal = join(run, `unified-preview-${sha}.jsonl`), rawJournal = originalRows.map(JSON.stringify).join('\n') + '\n';
  writeFileSync(originalJournal, rawJournal);
  const stop = { journal: { path: originalJournal, pin: digest(rawJournal) },
    http: save(join(recovery, 'http/result.json'), { schemaVersion: 1, kind: 'unified_exact_version_preview', status: 'failed', service: 'gachia', versionId: uuid(100),
      origin: 'https://00000000-gachia.aieasygames.workers.dev', observationMode: 'cloud_exact_version', parserPin: unifiedHTMLParserPin(), observations: [], error: 'fetch failed' }),
    version: save(join(recovery, 'version.json'), { id: uuid(100) }),
    module: save(join(recovery, 'module/receipt.json'), { schemaVersion: 1, kind: 'unified_upload_time_module_receipt', service: 'gachia', versionId: uuid(100), moduleSHA256: sha }) };
  const html = '<html><head><title>Guide</title><meta name="description" content="Description"><link rel="canonical" href="https://gachia.com/zh/ananta/guides/download-install-guide"></head><body><main><h1>Guide</h1><p>Approved</p></main></body></html>';
  const bodies = [html, '<xml/>', 'User-agent: *\nDisallow: /\n'];
  const rows = bodies.map((body, i) => ({ path: ['/zh/ananta/guides/download-install-guide', '/sitemap.xml', '/robots.txt'][i], status: 200,
    headers: { 'content-type': ['text/html', 'application/xml', 'text/plain'][i], 'cache-control': 'private, no-store' }, bytes: Buffer.byteLength(body), sha256: digest(body) }));
  const references = unifiedPreviewReferences(rows, (_, i) => Buffer.from(bodies[i]), 'streaming-v2');
  const directory = join(run, `unified-cloud-preview-completion-${sha}`);
  const inspected = { moduleSHA256: sha, versionPin: stop.version.pin, moduleProof: stop.module };
  const result = await executeUnifiedPreviewCompletion({ run, directory, authorize: () => value.releaseKey,
    verify: async () => ({ ...value, stop, stopPin: digest(canonical(stop)), networkPin: sha, existingRecovery: { stop, versionId: uuid(100), inspected } }),
    transport: { snapshot: async () => baseline, reuseRecovery: async () => { writeFileSync(join(directory, 'recovery-main/version.json'), readFileSync(stop.version.path)); },
      revalidate: async () => {}, upload: async () => { mkdirSync(join(directory, 'candidate-main')); return { versionId: uuid(101) }; },
      inspect: async () => ({ moduleSHA256: sha, versionPin: save(join(directory, 'candidate-main/version.json'), { id: uuid(101) }).pin,
        moduleProof: save(join(directory, 'candidate-main/module.json'), { moduleSHA256: sha }) }),
      preview: async args => verifyUnifiedVersionPreview({ service: 'gachia', versionId: args.versionId, references, directory: join(directory, `${args.role}-main/http`),
        parserVersion: 'streaming-v2', request: async url => { const i = rows.findIndex(row => row.path === new URL(url).pathname);
          return new Response(bodies[i], { headers: { ...rows[i].headers, 'x-robots-tag': 'noindex' } }); } }) } });
  const input = { run, directory, pin: result.receiptPin, value, references: () => references };
  const mutateReceipt = fn => { const receipt = JSON.parse(readFileSync(join(directory, 'receipt.json'))); fn(receipt); input.pin = save(join(directory, 'receipt.json'), receipt).pin; };
  return { input, stop, mutateReceipt };
}

test('completed preview reader reopens the original stop and both fresh v2 HTTP results without extending timestamps', async t => {
  const f = await fixture(t), opened = readUnifiedCloudPreviews(f.input);
  assert.equal(opened.receipt.kind, 'unified_completed_observation_stop_cloud_previews');
  assert.equal(opened.receipt.accepted.recovery.main.versionId, uuid(100));
  assert.equal(opened.receipt.accepted.candidate.main.versionId, uuid(101));
});

test('historical preview and stopped evidence reopen after expiry while every upload still requires fresh identity', async t => {
  const f = await fixture(t), originalAt = Date.now() - 86400000;
  f.input.value.identityObservedAt = originalAt;
  const opened = readUnifiedCloudPreviews(f.input);
  assert.equal(opened.receipt.accepted.recovery.main.versionId, uuid(100));
  assert.equal(f.input.value.identityObservedAt, originalAt);
  assert.throws(() => assertUnifiedPreviewUploadScope(f.input.value, f.input.value.transportPin), /expired/);
  f.input.value.identityObservedAt = Date.now() + 86400000;
  assert.throws(() => readUnifiedCloudPreviews(f.input), /observation time/);
});

for (const fault of ['stop-pin', 'network-pin', 'recovery-version', 'candidate-parser', 'journal', 'http-body', 'original-stop']) test(`completed reader rejects ${fault}`, async t => {
  const f = await fixture(t);
  if (fault === 'stop-pin') f.mutateReceipt(receipt => { receipt.stopPin = 'c'.repeat(64); });
  if (fault === 'network-pin') f.mutateReceipt(receipt => { delete receipt.networkPin; });
  if (fault === 'recovery-version') f.mutateReceipt(receipt => { receipt.accepted.recovery.main.versionId = uuid(555); });
  if (fault === 'candidate-parser') f.mutateReceipt(receipt => { receipt.accepted.candidate.main.parserVersion = 'legacy-v1'; });
  if (fault === 'journal') writeFileSync(join(f.input.run, `unified-preview-completion-${sha}.jsonl`), '{}\n');
  if (fault === 'http-body') writeFileSync(join(f.input.directory, 'candidate-main/http/0.body'), 'changed');
  if (fault === 'original-stop') writeFileSync(f.stop.http.path, '{}');
  assert.throws(() => readUnifiedCloudPreviews(f.input));
});

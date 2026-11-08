import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { UNIFIED_OWNERS, unifiedService } from './unified-release-assets.mjs';
import { executeUnifiedPreviewProtocol } from './unified-preview-protocol.mjs';
import { unifiedHTMLParserPin } from './unified-version-preview.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(t, owners = UNIFIED_OWNERS) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-protocol-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(i + 20), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const value = { preview: false, transportPin: sha, releaseKey: 'b'.repeat(64), changed: ['unified:record'], ownerOrder: [...owners], identityObservedAt: Date.now(), baseline,
    owners: Object.fromEntries(owners.map(owner => {
      const service = unifiedService(owner), target = { moduleSHA256: sha, configPin: sha, artifactPin: sha, referencesPin: sha };
      return [owner, { service, sourceVersionId: baseline.services[service].versions[0].version_id, sourceIdentityPin: sha, candidate: target, recovery: target }];
    })) };
  const calls = []; let sequence = 100;
  const args = { run, directory: join(run, 'output'), transportPin: sha, verify: async () => structuredClone(value), authorize: async () => value.releaseKey,
    transport: { snapshot: async () => structuredClone(baseline),
      upload: async ({ owner, role }) => { calls.push(['upload', owner, role]); return { versionId: uuid(sequence++) }; },
      inspect: async () => ({ moduleSHA256: sha, versionPin: sha, moduleProof: { path: '/trusted-wrapper/receipt.json', pin: sha } }),
      preview: async ({ service, versionId }) => ({ service, versionId, status: 'passed', observationMode: 'cloud_exact_version', evidenceSHA256: sha }),
      revalidate: async () => {} } };
  const journal = () => readFileSync(join(run, `unified-preview-${sha}.jsonl`), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  return { args, value, calls, journal };
}

for (const owners of [UNIFIED_OWNERS, ['main'], ['azur-promilia', 'main'], ['lvmeng', 'main']]) test(`accepts explicit owner scope: ${owners.join(',')}`, async t => {
  const f = fixture(t, owners), result = await executeUnifiedPreviewProtocol(f.args);
  assert.equal(result.productionPromoted, false); assert.equal(result.activationSupported, false);
  assert.deepEqual(f.calls, ['recovery', 'candidate'].flatMap(role => owners.map(owner => ['upload', owner, role])));
  assert.equal(f.journal().at(-1).phase, 'all_cloud_previews_accepted_no_promotion');
  await assert.rejects(executeUnifiedPreviewProtocol(f.args), /EEXIST/);
});

for (const fault of ['none', 'unknown', 'pin']) test(`new cloud acceptance binds its reviewed streaming parser: ${fault}`, async t => {
  const f = fixture(t, ['main']), preview = f.args.transport.preview;
  f.args.transport.preview = async args => ({ ...await preview(args), parserVersion: fault === 'unknown' ? 'unreviewed' : 'streaming-v2',
    parserPin: fault === 'pin' ? sha : unifiedHTMLParserPin('streaming-v2') });
  if (fault === 'none') {
    const result = await executeUnifiedPreviewProtocol(f.args);
    for (const role of ['recovery', 'candidate']) {
      assert.equal(result.accepted[role].main.parserVersion, 'streaming-v2');
      assert.equal(result.accepted[role].main.parserPin, unifiedHTMLParserPin('streaming-v2'));
    }
  } else {
    await assert.rejects(executeUnifiedPreviewProtocol(f.args), /parser/);
    assert.equal(f.calls.length, 1); assert.equal(f.journal().at(-1).phase, 'read_only_reconciliation');
  }
});

for (const failure of ['fixture', 'empty', 'missing-main', 'unknown-owner', 'missing-owner', 'stale-identity', 'wrong-source', 'missing-source-proof', 'wrong-pin', 'wrong-authorization']) test(`rejects before cloud writes: ${failure}`, async t => {
  const f = fixture(t);
  if (failure === 'fixture') f.value.preview = true;
  if (failure === 'empty') f.value.changed = [];
  if (failure === 'missing-main') f.value.ownerOrder.pop();
  if (failure === 'unknown-owner') f.value.ownerOrder.unshift('router');
  if (failure === 'missing-owner') delete f.value.owners.lvmeng;
  if (failure === 'stale-identity') f.value.identityObservedAt = Date.now() - 16 * 60 * 1000;
  if (failure === 'wrong-source') f.value.owners.main.sourceVersionId = uuid(90);
  if (failure === 'missing-source-proof') delete f.value.owners.main.sourceIdentityPin;
  if (failure === 'wrong-pin') f.args.transportPin = 'c'.repeat(64);
  if (failure === 'wrong-authorization') f.args.authorize = async () => 'c'.repeat(64);
  await assert.rejects(executeUnifiedPreviewProtocol(f.args)); assert.equal(f.calls.length, 0);
});

for (const failure of ['ambiguous-upload', 'inspect', 'preview', 'local-evidence', 'revalidate', 'drift', 'changed-input', 'raw-old-uuid']) test(`stops permanently and reconciles without writes: ${failure}`, async t => {
  const f = fixture(t); let writes = 0;
  if (failure === 'ambiguous-upload') f.args.transport.upload = async () => { writes++; throw Error('response lost'); };
  if (failure === 'inspect') f.args.transport.inspect = async () => { throw Error('wrong module'); };
  if (failure === 'preview') f.args.transport.preview = async () => { throw Error('HTTP failed'); };
  if (failure === 'local-evidence') f.args.transport.preview = async ({ service, versionId }) => ({ service, versionId, status: 'passed', observationMode: 'loopback_exact_host', evidenceSHA256: sha });
  if (failure === 'revalidate') f.args.transport.revalidate = async () => { throw Error('immutable drift'); };
  if (failure === 'drift') { let calls = 0; f.args.transport.snapshot = async () => { const s = structuredClone(f.value.baseline); if (++calls > 1) s.scripts = []; return s; }; }
  if (failure === 'changed-input') { let calls = 0; f.args.verify = async () => { const v = structuredClone(f.value); if (++calls > 2) v.changed.push('another'); return v; }; }
  if (failure === 'raw-old-uuid') f.args.transport.upload = async ({ service }) => ({ versionId: f.value.baseline.services[service].versions[0].version_id });
  await assert.rejects(executeUnifiedPreviewProtocol(f.args));
  const rows = f.journal(); assert.equal(rows.at(-2).phase, 'stopped'); assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
  assert(rows.at(-2).pendingOperation); assert.equal(rows.at(-2).automaticRetry, false);
  assert.equal(rows.at(-1).candidate.cloudWrites, false); assert.equal(rows.at(-1).recovery.automaticRollback, false);
  const count = f.calls.length; await assert.rejects(executeUnifiedPreviewProtocol(f.args), /EEXIST/); assert.equal(f.calls.length, count);
  if (failure === 'ambiguous-upload') assert.equal(writes, 1);
});

test('concurrent attempts cannot overlap an upload', async t => {
  const f = fixture(t, ['main']); let release, ready;
  const started = new Promise(resolve => { ready = resolve; }), wait = new Promise(resolve => { release = resolve; });
  const upload = f.args.transport.upload; let blocked = false;
  f.args.transport.upload = async args => { if (!blocked) { blocked = true; ready(); await wait; } return upload(args); };
  const first = executeUnifiedPreviewProtocol(f.args); await started;
  await assert.rejects(executeUnifiedPreviewProtocol(f.args), /EEXIST|lock/i); release(); await first;
});

test('freshly reread source timestamps may advance while release and preserved identities stay immutable', async t => {
  const f = fixture(t, ['main']); f.value.identityObservedAt = Date.now() - 1000;
  f.value.preservedOwners = { genshin: { identityPin: sha } };
  let sequence = 0;
  f.args.verify = async () => ({ ...structuredClone(f.value), identityObservedAt: f.value.identityObservedAt + sequence++ });
  await executeUnifiedPreviewProtocol(f.args); assert.equal(f.calls.length, 2);
});

for (const fault of ['backwards', 'preserved-identity']) test(`renewal cannot hide ${fault} drift`, async t => {
  const f = fixture(t, ['main']); f.value.identityObservedAt = Date.now() - 1000;
  f.value.preservedOwners = { genshin: { identityPin: sha } };
  let calls = 0;
  f.args.verify = async () => {
    const current = structuredClone(f.value);
    if (++calls > 1) {
      if (fault === 'backwards') current.identityObservedAt--;
      else current.preservedOwners.genshin.identityPin = 'b'.repeat(64);
    }
    return current;
  };
  await assert.rejects(executeUnifiedPreviewProtocol(f.args)); assert.equal(f.calls.length, 0);
});

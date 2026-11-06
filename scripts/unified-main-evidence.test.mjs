import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { unifiedMainDeploymentWriter } from './unified-main-deployment.mjs';
import { readUnifiedCompletedMainPromotion } from './unified-main-evidence.mjs';
import { unifiedMainPublicReferences, verifyUnifiedMainPublic } from './unified-main-public.mjs';
import { executeUnifiedPromotionProtocol } from './unified-promotion-protocol.mjs';
import { captureUnifiedUploadedModule } from './unified-version-identity.mjs';
import { exactUnifiedPreviewOrigin, unifiedHTMLParserPin, unifiedPreviewReferences, verifyUnifiedVersionPreview } from './unified-version-preview.mjs';
import { unifiedSourceFixture } from './fixtures/unified-source-fixture.mjs';
import { advanceUnifiedSourceIndex, captureUnifiedNextBaseline, readUnifiedNextBaseline } from './unified-source-advance.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const paths = ['/sitemap.xml', '/robots.txt', '/api/auth/get-session', '/data/ananta/raw-guides.json', '/data/genshin/raw-guides.json', '/data/nte/raw-guides.json',
  '/zh/ananta/guides/download-install-guide', '/en/ananta/guides/download-install-guide'];
const json = value => JSON.stringify(value, null, 2) + '\n';
async function fixture(t, baselineOverride) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-main-completed-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const save = (file, value) => { const text = json(value); writeFileSync(file, text); return { path: file, pin: digest(text) }; };
  const directory = join(run, `unified-main-promotion-${randomUUID()}`), renewalDirectory = join(directory, 'renewal'), cloud = join(run, 'cloud');
  mkdirSync(renewalDirectory, { recursive: true }); mkdirSync(cloud);
  const config = { name: 'gachia', compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] };
  const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/',
    headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } },
    raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n' };
  const baseline = baselineOverride ?? { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    bindings: { gachia: [] }, settings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const roleReferences = {}, roleBodies = {}, accepted = { recovery: {}, candidate: {} }, renewed = { recovery: {}, candidate: {} }, targets = {}, versions = {};
  for (const [i, role] of ['recovery', 'candidate'].entries()) {
    const root = join(cloud, `${role}-main`); mkdirSync(root);
    const versionId = uuid(100 + i), code = `sealed ${role}`, form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
    const archive = Buffer.from(await new Response(form).arrayBuffer()), outbound = join(root, 'outbound.multipart'), log = join(root, 'upload.log');
    writeFileSync(outbound, archive); writeFileSync(log, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactUnifiedPreviewOrigin('gachia', versionId)}\n`);
    const version = { id: versionId, number: i + 1, metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) }, bindings: [],
      script_runtime: { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, usage_model: 'standard', assets } } };
    versions[role] = version;
    const moduleProof = await captureUnifiedUploadedModule({ service: 'gachia', versionId, moduleSHA256: digest(code),
      context: { role, transportPin: sha, configPin: sha }, directory: join(root, 'module'), uploadPath: outbound, uploadLogPath: log,
      readVersion: async () => version, readContent: async () => ({ archive, etag: 'e'.repeat(64) }) });
    const html = `<html><head><title>Guide</title><meta name="description" content="Install guide"><link rel="canonical" href="https://gachia.com/zh/ananta/guides/download-install-guide"></head><body><main><h1>Guide</h1><p>${role}</p></main></body></html>`;
    const bodies = paths.map(path => Buffer.from(path.includes('/guides/') ? html : path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}'
      : path === '/sitemap.xml' ? '<urlset></urlset>' : path === '/robots.txt' ? 'User-agent: *\nAllow: /\n' : '[]'));
    const rows = paths.map((path, n) => ({ path, status: path.startsWith('/api/') ? 404 : 200, bytes: bodies[n].length, sha256: digest(bodies[n]), bodyFile: `${n}.body`,
      headers: { 'content-type': path.includes('/guides/') ? 'text/html' : path.endsWith('.xml') ? 'application/xml' : path.endsWith('.txt') ? 'text/plain' : 'application/json',
        'cache-control': path.startsWith('/api/') ? 'private, no-store' : 'public, max-age=0, must-revalidate' } }));
    const references = unifiedPreviewReferences(rows, (_, n) => bodies[n], 'streaming-v2'); roleReferences[role] = references; roleBodies[role] = { rows, bodies };
    const request = async url => {
      const n = paths.indexOf(new URL(url).pathname); return new Response(paths[n] === '/robots.txt' ? 'User-agent: *\nDisallow: /\n' : bodies[n],
        { status: rows[n].status, headers: { ...rows[n].headers, 'x-robots-tag': 'noindex' } });
    };
    const originalHTTP = await verifyUnifiedVersionPreview({ service: 'gachia', versionId, references, directory: join(root, 'http'), request, parserVersion: 'streaming-v2' });
    const proof = { service: 'gachia', versionId, moduleSHA256: digest(code), artifactPin: sha, versionPin: save(join(root, 'version.json'), version).pin, moduleProof,
      evidenceSHA256: originalHTTP.evidenceSHA256, acceptedAt: Date.now(), parserVersion: 'streaming-v2', parserPin: unifiedHTMLParserPin('streaming-v2') };
    accepted[role].main = proof;
    const fresh = await verifyUnifiedVersionPreview({ service: 'gachia', versionId, references, directory: join(renewalDirectory, role), request, parserVersion: 'streaming-v2' });
    renewed[role].main = { ...proof, originalEvidenceSHA256: proof.evidenceSHA256, evidenceSHA256: fresh.evidenceSHA256, acceptedAt: Date.now() };
    targets[role] = { moduleSHA256: digest(code), configPin: sha, artifactPin: sha, referencesPin: sha };
  }
  const previews = { directory: cloud, pin: sha, receipt: { accepted } };
  const releaseKey = 'b'.repeat(64), value = { preview: false, transportPin: sha, releaseKey, changed: ['unified:record'], ownerOrder: ['main'], baseline,
    identityObservedAt: Date.now(), owners: { main: { service: 'gachia', sourceVersionId: baseline.services.gachia.versions[0].version_id, sourceIdentityPin: sha, ...targets } } };
  const renewalPin = save(join(renewalDirectory, 'receipt.json'), { schemaVersion: 1, kind: 'unified_main_preview_renewal', releaseKey, transportPin: sha,
    previewPin: previews.pin, accepted: renewed, cloudWrites: false, productionPromoted: false }).pin;
  const initial = { ...value, previewPin: previews.pin, renewalPin, accepted: renewed, evidenceDirectory: directory, renewalDirectory };
  const publicReferences = unifiedMainPublicReferences(roleReferences.candidate, (_, n) => roleBodies.candidate.bodies[n]);
  let current = structuredClone(baseline);
  const candidate = accepted.candidate.main.versionId, deploymentId = uuid(200);
  const result = await executeUnifiedPromotionProtocol({ run, verify: async () => initial, authorize: () => releaseKey, makeTransport: () => ({
    snapshot: async () => current,
    verifyVersions: async () => {
      const proof = { status: 'passed', versions: { gachia: candidate }, modules: { gachia: targets.candidate.moduleSHA256 }, recoveryVersions: { gachia: accepted.recovery.main.versionId },
        observed: ['recovery', 'candidate'].map(role => ({ role, versionId: accepted[role].main.versionId, version: versions[role],
          moduleSHA256: accepted[role].main.moduleSHA256, moduleProof: accepted[role].main.moduleProof })) };
      return { ...proof, evidenceSHA256: save(join(directory, 'remote-0.json'), proof).pin };
    },
    promote: unifiedMainDeploymentWriter({ releaseKey, versionId: candidate, token: 'fixture-token', recordResponse: ({ kind, status, headers, bytes }) => {
      writeFileSync(join(directory, `deployment-${kind}.body`), bytes); save(join(directory, `deployment-${kind}.json`), { kind, status, headers, sha256: digest(bytes), bytes: bytes.length });
    }, request: async (_url, options) => {
      if (options.method === 'POST') { current = structuredClone(baseline); current.services.gachia = { id: deploymentId, versions: [{ version_id: candidate, percentage: 100 }] }; }
      return Response.json({ success: true, result: { id: deploymentId, strategy: 'percentage', versions: [{ version_id: candidate, percentage: 100 }] } });
    } }),
    acceptProduction: async () => {
      const prefix = readFileSync(new URL('./fixtures/cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
      const http = join(directory, 'public'), checked = await verifyUnifiedMainPublic({ references: publicReferences, directory: http, request: async url => {
        const n = paths.indexOf(new URL(url).pathname), bytes = roleBodies.candidate.bodies[n];
        return new Response(paths[n] === '/robots.txt' ? Buffer.concat([prefix, bytes]) : bytes,
          { status: roleBodies.candidate.rows[n].status, headers: roleBodies.candidate.rows[n].headers });
      } });
      const proof = { status: 'passed', releaseKey, versions: { gachia: candidate }, owners: { main: { directory: http, evidenceSHA256: checked.evidenceSHA256, responses: publicReferences.length } } };
      return { ...proof, evidenceSHA256: save(join(directory, 'public-acceptance.json'), proof).pin };
    },
  }) });
  const ci = n => ({ status: 'full_exact_ci_passed', runID: n, commit: String(n).repeat(40), runAttempt: 1 });
  const sourceCI = ci(1), originExecutorCI = ci(2), executorCI = ci(3), productionRequest = { path: join(run, 'production.json'), pin: sha };
  const receipt = { ...result, directory, productionRequest, preview: { path: join(cloud, 'receipt.json'), pin: previews.pin }, sourceCI, originExecutorCI, executorCI };
  const input = { run, proof: save(join(directory, 'receipt.json'), receipt), value, previews, references: (_owner, role) => roleReferences[role], publicReferences,
    runtimeConfig: config, productionRequest, sourceCI, originExecutorCI, executorCI };
  return { input, save, directory, renewalDirectory, receipt, roleBodies, changeReceipt: fn => { fn(receipt); input.proof = save(input.proof.path, receipt); } };
}

test('completed Main reader reloads real protocol, module, renewal, deployment and public evidence without live requests', async t => {
  const f = await fixture(t); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('Historical reads must be offline'); });
  const result = await readUnifiedCompletedMainPromotion(f.input);
  assert.equal(calls, 0); assert.equal(result.currentCMSRead, false); assert.equal(result.currentCloudRead, false);
  assert.equal(result.freshnessRenewed, false); assert.equal(result.sourceAdvanced, false); assert.equal(result.publicHTTP.observations.length, paths.length);
});

test('old accepted evidence remains independently readable without making it fresh for another operation', async t => {
  const f = await fixture(t), now = Date.now();
  t.mock.method(Date, 'now', () => now + 86400000);
  const result = await readUnifiedCompletedMainPromotion(f.input);
  assert.equal(result.freshnessRenewed, false);
  assert(result.renewal.receipt.accepted.candidate.main.acceptedAt < Date.now() - 900000);
});

test('completed promotion evidence feeds five-owner source advance and fresh next-batch consumption in one isolated protocol chain', async t => {
  const s = await unifiedSourceFixture(t), f = await fixture(t, s.spec.baseline);
  const completed = await readUnifiedCompletedMainPromotion(f.input), candidate = completed.modules.candidate;
  const accepted = f.input.previews.receipt.accepted.candidate.main;
  s.spec.publication = f.input.proof; s.spec.releaseKey = f.input.value.releaseKey; s.spec.transportPin = f.input.value.transportPin;
  s.spec.deploymentId = completed.original.rows[3].result.deploymentId;
  s.spec.publicReferences = f.input.publicReferences;
  s.spec.pairs = ['ananta/raw-guides.json', 'genshin/raw-guides.json', 'nte/raw-guides.json'];
  s.spec.sources = s.spec.sources.filter(row => row.sourcePath.endsWith('.ts'));
  for (const pair of s.spec.pairs) {
    const reference = f.input.publicReferences.find(row => row.path === '/data/' + pair), index = f.input.publicReferences.indexOf(reference);
    const text = f.roleBodies.candidate.bodies[index].toString();
    writeFileSync(join(s.spec.owners.main.directory, 'assets/data', pair), text);
    s.spec.sources.push({ sourcePath: 'packages/data/games/' + pair, text, sha256: digest(text) });
  }
  s.spec.sources.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  s.spec.owners.main = { ...s.spec.owners.main, versionId: accepted.versionId, version: candidate.version,
    moduleProof: accepted.moduleProof, moduleContext: candidate.receipt.context, modulePath: candidate.receipt.archive.path,
    archiveSHA256: candidate.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256,
    artifactSHA256: digest(json(artifactFiles(s.spec.owners.main.directory))) };
  s.versions.gachia = candidate.version;
  s.current.services.gachia = { id: s.spec.deploymentId, versions: [{ version_id: accepted.versionId, percentage: 100 }] };
  const request = async url => {
    const index = f.input.publicReferences.findIndex(row => row.path === new URL(url).pathname), reference = f.input.publicReferences[index];
    return new Response(readFileSync(join(f.directory, 'public', `${index}.body`)), { status: reference.status, headers: reference.headers });
  };
  const advanced = await advanceUnifiedSourceIndex({ ...s, request, directory: join(s.root, 'advance') });
  const next = await captureUnifiedNextBaseline({ ...s, request, proof: advanced.proof, directory: join(s.root, 'next') });
  const opened = await readUnifiedNextBaseline({ spec: s.spec, handoff: next.proof, fresh: true });
  assert.equal(opened.previous.owners.main.versionId, completed.receipt.versions.gachia);
  assert.deepEqual(opened.index.value.publication, f.input.proof); assert.equal(opened.sources.length, 28);
  assert.equal(opened.sources.filter(row => row.sourcePath.endsWith('.ts')).length, 25);
  assert.equal(readFileSync(join(opened.previous.owners.main.directory, 'worker.js'), 'utf8'), candidate.code.toString());
});

test('a valid stopped journal cannot be repackaged as a completed public source', async t => {
  const f = await fixture(t), file = join(f.input.run, `unified-promotion-${sha}.jsonl`);
  const rows = readFileSync(file, 'utf8').trimEnd().split('\n').map(JSON.parse), last = rows.pop();
  rows.push({ ...last, phase: 'stopped', error: 'isolated stop', automaticRetry: false, automaticRollback: false },
    { ...last, phase: 'read_only_reconciliation', result: { status: 'candidate_active_public_acceptance_still_required' } });
  const bytes = rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(file, bytes);
  f.changeReceipt(receipt => { receipt.journalPin = digest(bytes); });
  await assert.rejects(readUnifiedCompletedMainPromotion(f.input), /stopped promotion/);
});

for (const fault of ['receipt-pin', 'journal', 'status', 'source-advanced', 'release', 'baseline', 'renewal', 'renewal-identity', 'renewal-body', 'module',
  'version', 'remote', 'creation', 'creation-repin', 'verification', 'allocation-repin', 'public-proof', 'public-body', 'public-missing', 'ci', 'unverified-ci', 'request', 'receipt-location']) {
  test(`completed Main source refuses ${fault}`, async t => {
    const f = await fixture(t), input = f.input;
    if (fault === 'receipt-pin') input.proof.pin = 'c'.repeat(64);
    if (fault === 'journal') writeFileSync(join(input.run, `unified-promotion-${sha}.jsonl`), '{}\n');
    if (fault === 'status') f.changeReceipt(receipt => { receipt.status = 'stopped'; });
    if (fault === 'source-advanced') f.changeReceipt(receipt => { receipt.sourceAdvanced = true; });
    if (fault === 'release') f.changeReceipt(receipt => { receipt.releaseKey = 'c'.repeat(64); });
    if (fault === 'baseline') input.value.baseline.routes.push({ pattern: 'changed' });
    if (fault === 'renewal') writeFileSync(join(f.renewalDirectory, 'receipt.json'), '{}');
    if (fault === 'renewal-identity') input.previews.receipt.accepted.recovery.main.moduleSHA256 = 'c'.repeat(64);
    if (fault === 'renewal-body') writeFileSync(join(f.renewalDirectory, 'recovery/0.body'), 'changed');
    if (fault === 'module') writeFileSync(input.previews.receipt.accepted.candidate.main.moduleProof.path, '{}');
    if (fault === 'version') writeFileSync(join(input.previews.directory, 'candidate-main/version.json'), '{}');
    if (fault === 'remote') writeFileSync(join(f.directory, 'remote-0.json'), '{}');
    if (fault === 'creation') writeFileSync(join(f.directory, 'deployment-creation.body'), '{}');
    if (fault === 'verification') writeFileSync(join(f.directory, 'deployment-verification.body'), '{}');
    if (['creation-repin', 'allocation-repin'].includes(fault)) {
      const kind = fault === 'creation-repin' ? 'creation' : 'verification', file = join(f.directory, `deployment-${kind}`);
      const response = JSON.parse(readFileSync(file + '.body')); response.result.versions[0].percentage = 50;
      const bytes = Buffer.from(json(response)); writeFileSync(file + '.body', bytes);
      const metadata = JSON.parse(readFileSync(file + '.json')); f.save(file + '.json', { ...metadata, sha256: digest(bytes), bytes: bytes.length });
    }
    if (fault === 'public-proof') writeFileSync(join(f.directory, 'public-acceptance.json'), '{}');
    if (fault === 'public-body') writeFileSync(join(f.directory, 'public/6.body'), 'changed');
    if (fault === 'public-missing') rmSync(join(f.directory, 'public/7.body'));
    if (fault === 'ci') input.executorCI = { ...input.executorCI, commit: 'd'.repeat(40) };
    if (fault === 'unverified-ci') delete input.sourceCI;
    if (fault === 'request') input.productionRequest = { ...input.productionRequest, pin: 'd'.repeat(64) };
    if (fault === 'receipt-location') { const file = join(input.run, 'other-receipt.json'); input.proof = f.save(file, f.receipt); }
    await assert.rejects(readUnifiedCompletedMainPromotion(input));
  });
}

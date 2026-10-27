import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { RECOVERY_WORKFLOW, REPOSITORY_ID, activeMain, sourceDeploymentJob, trustedMainRun, verifyRecoveryReceipt, assertRecoveryAcceptance, summarizeRecoveryPaint, assertRecoveryPaint } from './web-recovery-policy.mjs';
import { cloudSnapshot, verifyAllPublicStatic } from './web-production-recovery.mjs';

function fixture() {
  const input = { artifactId: '123', archiveSha256: 'a'.repeat(64), versionId: '12345678-1234-1234-1234-123456789abc', recoveryArtifactId: '789', recoverySha256: 'c'.repeat(64) };
  const source = { workflow_run: { id: 456, head_sha: 'b'.repeat(40) } };
  const run = { id: 678, run_attempt: 1, path: RECOVERY_WORKFLOW, event: 'workflow_dispatch', head_branch: 'main', repository: { id: REPOSITORY_ID }, head_repository: { id: REPOSITORY_ID }, head_sha: 'd'.repeat(40), status: 'completed', conclusion: 'success' };
  const metadata = { id: 789, name: 'main-recovery-receipt-678-1', expired: false, digest: `sha256:${input.recoverySha256}`, size_in_bytes: 100, workflow_run: { id: 678, head_sha: run.head_sha } };
  const sourceJobs = [{ name: 'build', conclusion: 'success' }, { name: 'deploy-staging', conclusion: 'success' }, { name: 'deploy', conclusion: 'failure', steps: ['Verify and restore web artifact', 'Record main deployment before promotion', 'Verify production static retention before promotion', 'Deploy to Cloudflare'].map(name => ({ name, conclusion: 'success' })) }];
  const before = { services: { gachia: { id: 'deployment', versions: [{ version_id: input.versionId, percentage: 100 }] } } };
  const receipt = { schemaVersion: 1, status: 'read_only_production_recovery_verified', deploymentPerformed: false, origin: 'https://gachia.com', service: 'gachia', verificationRunId: '678', verificationSha: run.head_sha,
    source: { artifactId: input.artifactId, archiveSha256: input.archiveSha256, versionId: input.versionId, runId: 456, headSha: source.workflow_run.head_sha, tarSha256: 'e'.repeat(64) },
    before, after: structuredClone(before), acceptanceStatus: 'main_production_verified_accounts_disabled', xmlStatus: 'published_xml_graph_verified', allStaticBytesEqual: true, ownerGraphUnchanged: true, staticFiles: 359 };
  return { input, source, run, metadata, sourceJobs, receipt, jobs: [{ name: 'verify-production', conclusion: 'success' }] };
}

test('failed postcheck source requires a separate trusted successful recovery, not a rewritten job result', () => {
  const f = fixture(); verifyRecoveryReceipt(f);
  assert.equal(f.sourceJobs[2].conclusion, 'failure');
  for (const mutate of [
    f => { f.run.path = '.github/workflows/deploy.yml'; }, f => { f.run.event = 'pull_request'; },
    f => { f.run.head_branch = 'feature'; }, f => { f.run.repository.id++; }, f => { f.run.head_repository.id++; },
    f => { f.run.conclusion = 'failure'; }, f => { f.run.status = 'in_progress'; }, f => { f.run.run_attempt++; },
    f => { f.jobs[0].conclusion = 'failure'; }, f => { f.jobs.push(f.jobs[0]); },
    f => { f.metadata.expired = true; }, f => { f.metadata.digest = 'bad'; }, f => { f.metadata.id++; },
    f => { f.metadata.size_in_bytes = 2 * 1024 * 1024; }, f => { f.metadata.workflow_run.id++; },
    f => { f.metadata.workflow_run.head_sha = 'f'.repeat(40); },
    f => { f.receipt.source.artifactId = '124'; }, f => { f.receipt.source.archiveSha256 = 'f'.repeat(64); },
    f => { f.receipt.source.versionId = 'stale'; }, f => { f.receipt.source.runId++; }, f => { f.receipt.source.headSha = 'f'.repeat(40); },
    f => { f.receipt.source.tarSha256 = ''; }, f => { f.receipt.verificationSha = 'f'.repeat(40); },
    f => { f.receipt.deploymentPerformed = true; }, f => { f.receipt.origin = 'https://evil.test'; },
    f => { f.receipt.service = 'gachia-game-genshin'; }, f => { f.receipt.status = 'running'; },
    f => { f.receipt.before.services.gachia.versions[0].percentage = 99; },
    f => { f.receipt.after.services.gachia.versions[0].version_id = 'stale'; },
    f => { f.receipt.after.routes = []; }, f => { f.receipt.acceptanceStatus = 'failed'; },
    f => { f.receipt.xmlStatus = 'failed'; }, f => { f.receipt.allStaticBytesEqual = false; },
    f => { f.receipt.ownerGraphUnchanged = false; }, f => { f.receipt.staticFiles = 0; },
    f => { f.sourceJobs[0].conclusion = 'failure'; }, f => { f.sourceJobs[1].conclusion = 'skipped'; },
    f => { f.sourceJobs[2].steps.at(-1).conclusion = 'failure'; }, f => { f.sourceJobs[2].steps.pop(); },
  ]) {
    const candidate = fixture(); mutate(candidate); assert.throws(() => verifyRecoveryReceipt(candidate));
  }
});

test('recovery source and live checks reject incomplete deployment evidence', () => {
  const f = fixture(); trustedMainRun(f.run, RECOVERY_WORKFLOW); sourceDeploymentJob(f.sourceJobs); activeMain(f.receipt.before, f.input.versionId);
  assert.throws(() => activeMain({}, f.input.versionId));
  f.receipt.before.services.gachia.versions.push({ percentage: 0 });
  assert.throws(() => activeMain(f.receipt.before, f.input.versionId));
});

test('complete static check encodes generated path segments and rejects redirects or changed bytes', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'recovery-static-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, '[lang]'));
  writeFileSync(join(directory, '[lang]/page.js'), 'sealed');
  const request = async (url, options) => {
    assert.equal(url, 'https://gachia.com/_next/static/%5Blang%5D/page.js');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    return new Response('sealed');
  };
  assert.equal((await verifyAllPublicStatic(directory, request)).files, 1);
  for (const response of [new Response('sealed', { status: 307 }), new Response('changed')]) {
    await assert.rejects(verifyAllPublicStatic(directory, async () => response));
  }
});

test('cloud snapshot only uses fixed read-only APIs and never persists secret text', async () => {
  const snapshot = await cloudSnapshot('private', async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.cloudflare.com');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.authorization, 'Bearer private');
    const result = url.endsWith('/deployments') ? { deployments: [{ created_on: '2026-10-25T00:00:00Z', versions: [{ version_id: 'v', percentage: 100 }] }] }
      : url.endsWith('/settings') ? { bindings: [{ type: 'secret_text', name: 'SECRET', text: 'never-save' }] } : [];
    return Response.json({ success: true, result });
  });
  assert(!JSON.stringify(snapshot).includes('never-save'));
  assert.equal(Object.keys(snapshot.services).length, 7);
  await assert.rejects(cloudSnapshot('private', async () => Response.json({ success: false }, { status: 401 })));
});

test('read-only workflow cannot deploy, rebuild or accept an untrusted ref', () => {
  const workflow = readFileSync(new URL('../.github/workflows/web-production-recovery.yml', import.meta.url), 'utf8');
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /group: gachia-main-release/);
  assert.match(workflow, /include-hidden-files: true/);
  assert(!/wrangler\s+(?:deploy|rollback)|opennextjs-cloudflare\s+(?:deploy|build)|contents: write|actions: write/.test(workflow));
  assert(workflow.includes('.release-records/main-recovery/paint/output/'));
  const recovery = readFileSync(new URL('./web-production-recovery.mjs', import.meta.url), 'utf8');
  assert(recovery.includes("'tests/browser/sticky-header.spec.ts'"));
  assert(recovery.includes("'--workers=2', '--retries=0'"));
  assert(recovery.includes('PLAYWRIGHT_BASE_URL: PUBLIC_ORIGIN'));
  assert(recovery.indexOf('record.paint = summarizeRecoveryPaint') < recovery.indexOf("save('receipt.json'"));
});

test('retired Genshin pre-cutover path fails before checkout or any deployment command', () => {
  const workflow = readFileSync(new URL('../.github/workflows/genshin-worker-production-origin.yml', import.meta.url), 'utf8');
  assert.match(workflow, /name: Retired Genshin Pre-cutover Origin Release/);
  assert(workflow.indexOf('exit 1') < workflow.indexOf('actions/checkout'));
  assert(!workflow.includes('continue-on-error'));
  assert.match(workflow, /cancel-in-progress: false/);
});

test('a green status without the complete existing acceptance suite cannot issue a recovery receipt', () => {
  const record = { origin: 'https://gachia.com', status: 'main_production_verified_accounts_disabled', deploymentPerformed: false,
    http: Array(32), browser: Array(18), managedContent: Object.fromEntries(Object.entries({ http: 23, fallbackHttp: 171, json: 7, search: 3, browser: 520, indexnow: 1, retainedAssets: 12 }).map(([key, count]) => [key, Array(count)])) };
  assertRecoveryAcceptance(record);
  for (const name of Object.keys(record.managedContent)) {
    const bad = structuredClone(record); bad.managedContent[name].pop(); assert.throws(() => assertRecoveryAcceptance(bad));
  }
});

function paintReport() {
  return { errors: [], stats: { expected: 42, unexpected: 0, skipped: 0, flaky: 0 }, suites: [{ suites: [{
    specs: Array.from({ length: 21 }, (_, index) => ({ id: `case-${index}`, title: `case ${index}`,
      tests: ['desktop', 'mobile'].map(projectName => ({ projectName, status: 'expected', results: [{ status: 'passed', retry: 0, errors: [] }] })) })),
  }] }] };
}

test('paint recovery rejects failed, retried, skipped, duplicate or incomplete browser reports', () => {
  const report = paintReport();
  assertRecoveryPaint(summarizeRecoveryPaint(report));
  for (const mutate of [
    r => { r.errors.push({ message: 'runner error' }); },
    r => { r.stats.expected--; }, r => { r.stats.unexpected++; }, r => { r.stats.skipped++; }, r => { r.stats.flaky++; },
    r => { r.suites[0].suites[0].specs.pop(); },
    r => { r.suites[0].suites[0].specs[0].tests[0].results[0].retry = 1; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results.push({ status: 'passed', retry: 1, errors: [] }); },
    r => { r.suites[0].suites[0].specs[0].tests[0].results[0].status = 'failed'; },
    r => { r.suites[0].suites[0].specs[0].tests[0].results[0].errors.push({ message: 'failure' }); },
    r => { r.suites[0].suites[0].specs[0].tests[0].status = 'unexpected'; },
    r => { r.suites[0].suites[0].specs[0].tests[0].projectName = 'unknown'; },
    r => { r.suites[0].suites[0].specs[0].id = 'case-1'; },
  ]) {
    const candidate = paintReport(); mutate(candidate); assert.throws(() => summarizeRecoveryPaint(candidate));
  }
});

test('a release with the new paint gate cannot use an old or incomplete recovery receipt', () => {
  const currentFixture = () => {
    const f = fixture();
    f.sourceJobs[2].steps.push({ name: 'Verify sticky header paint on production', conclusion: 'failure' });
    f.receipt.paint = summarizeRecoveryPaint(paintReport());
    f.receipt.paintReportSha256 = 'a'.repeat(64);
    f.receipt.paintTestSha256 = 'b'.repeat(64);
    return f;
  };
  verifyRecoveryReceipt(currentFixture());
  for (const mutate of [
    f => { delete f.receipt.paint; }, f => { delete f.receipt.paintReportSha256; }, f => { delete f.receipt.paintTestSha256; },
    f => { f.receipt.paint.stats.expected = 6; }, f => { f.receipt.paint.stats.unexpected = 36; },
    f => { f.receipt.paint.cases[0].retry = 1; }, f => { f.receipt.paint.cases[0].status = 'failed'; },
  ]) {
    const f = currentFixture(); mutate(f); assert.throws(() => verifyRecoveryReceipt(f));
  }
});

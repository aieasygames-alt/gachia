import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import nodeTest, { mock } from 'node:test';
import { unifiedSourceFixture, sourceFixtureUUID } from '../../../../scripts/fixtures/unified-source-fixture.mjs';
import { unifiedMainFixture } from '../../../../scripts/fixtures/unified-main-fixture.mjs';
import { unifiedWorkerFixture } from '../../../../scripts/fixtures/unified-worker-fixture.mjs';
import { uploadedPairHistoryFixture } from '../../../../scripts/fixtures/unified-uploaded-pair-history.mjs';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';
import { artifactFiles } from '../../../../scripts/desktop-publish.mjs';
import { selectUnifiedNextPrevious } from '../../../../scripts/unified-source-advance.mjs';
import { SERVICES } from '../../../../scripts/desktop-cloud-release.mjs';
import { unifiedHTMLParserPin } from '../../../../scripts/unified-version-preview.mjs';
import { prepareProductionSource, sealProductionLocal } from './unified-production-state.mjs';

const shard = process.env.GACHIA_FIXED_ADAPTER_TEST_SHARD;
assert(shard === undefined || ['0/2', '1/2'].includes(shard), 'Unknown fixed-adapter test shard');
let registeredTests = 0;
const test = (name, run) => {
  const index = registeredTests++;
  if (shard === undefined || index % 2 === Number(shard[0])) nodeTest(name, run);
};

// Only this child process redirects desktop checkout selection and replaces
// historical publication root/network boundaries and promotion-only installed/CMS local checks.
// Git/CI, historical previews, completed receipt, module, renewal,
// cloud snapshot, frozen/build, public, source and local-publication readers remain real.
let state;
const realFetch = globalThis.fetch;
const src = name => new URL(`../../src/${name}.ts`, import.meta.url).href;
const script = name => new URL(`../../../../scripts/${name}.mjs`, import.meta.url).href;
const originalExec = childProcess.execFileSync;
mock.method(childProcess, 'execFileSync', (file, args, ...rest) => {
  if (file !== 'gh') return originalExec(file, args, ...rest);
  assert.deepEqual(args, ['auth', 'token', '--hostname', 'github.com']); state.credentialReads++;
  return 'isolated-github-token';
});
syncBuiltinESMExports();

const build = await import(src('unified-owner-build'));
const { unifiedTree } = await import(src('unified-build'));
const { canonical } = await import(src('record-mapping'));
const { COMMUNITY_PUBLICATION_POLICY } = await import(src('unified-baseline'));

const production = await import(src('unified-production'));
// Keep the real checkout/CI verifier; substitute only desktop eligibility/path
// selection so isolated Linux CI can verify a disposable repository.
mock.module(src('unified-production'), { namedExports: { ...production,
  verifyUnifiedProductionLocal: async (request, cmsToken) => {
    assert(state.productionLocal, 'Only promotion qualification replaces installed/CMS local checks');
    assert.equal(request.executorRunID, 5); assert.equal(cmsToken, 'isolated-cms-token');
    state.localPreflights++;
    state.onPromotionOpen?.();
    if (state.failLocalPreflight) throw Error('Isolated current CMS review changed');
    return state.productionLocal;
  }, createUnifiedExecutorVerifier: async (runID, token) => {
  state.onExecutor?.();
  const checked = await production.verifyUnifiedExecutorCheckout(state.executorRepo, runID, token);
  return { ...checked, verify: () => {
    state.executorChecks++;
    const mutate = state.failFinalExecutor && state.output && ['source-index.json', 'source-handoff.json', 'publication/publication.json']
      .some(file => existsSync(path.join(state.output, file)));
    if (mutate) writeFileSync(state.executorFile, 'changed during final verification');
    try { checked.verify(); }
    finally { if (mutate) writeFileSync(state.executorFile, state.executorText); }
  } };
} } });

const historical = await import(src('unified-historical-publication'));
mock.module(src('unified-historical-publication'), { namedExports: { ...historical,
  readUnifiedHistoricalPublication: async request => {
    assert.deepEqual(request, state.historyRequest); state.historyReads++;
    if (state.failHistory) throw Error('Isolated historical source rejected');
    return state.historical;
  },
} });

const publication = await import(src('unified-publication'));

const previewNetwork = await import(script('unified-preview-network'));
mock.module(script('unified-preview-network'), { namedExports: { ...previewNetwork, createUnifiedPreviewNetwork: async server => {
  assert.equal(server, 'http://127.0.0.1:7890'); state.networkOpened++;
  return { route: { kind: 'isolated_loopback_preview' }, request: async (url, options) => {
    assert.equal(options.method, 'GET'); state.previewReads++;
    if (state.failPreview) throw Error('Isolated preview failed');
    const i = state.f.paths.indexOf(new URL(url).pathname);
    const role = state.previewRole ?? 'recovery'; assert(i >= 0);
    assert(new URL(url).hostname.startsWith(state.f.versions[role].id.slice(0, 8) + '-'));
    const row = state.f.roleBodies[role].rows[i], body = new URL(url).pathname === '/robots.txt' ? 'User-agent: *\nDisallow: /\n' : state.f.roleBodies[role].bodies[i];
    return new Response(body, { status: row.status, headers: { ...row.headers, 'x-robots-tag': 'noindex' } });
  }, close: async () => { state.networkClosed++; } };
} } });

const source = await import(src('unified-source-advance'));
const recovery = await import(src('unified-recovery'));
const promotion = await import(src('unified-promotion'));
const completion = await import(src('unified-promotion-completion'));
const promotionSource = await import(src('unified-promotion-source'));
const published = await import(src('unified-published-main'));

const steps = ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
  'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds',
  'Test documentation and verification scope gates'];
mock.method(globalThis, 'fetch', async (input, options) => {
  const url = new URL(input), s = state; assert(s, 'No network without an active isolated fixture');
  if (s.allowLocalWorkerHTTP && url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port) {
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    s.localWorkerReads++; return realFetch(input, options);
  }
  const ci = url.hostname === 'api.github.com' && url.pathname.match(/\/actions\/runs\/(\d+)(\/jobs)?$/);
  if (ci) {
    assert.equal(options.method, 'GET'); assert.equal(new Headers(options.headers).get('authorization'), 'Bearer isolated-github-token');
    const runID = Number(ci[1]); s.ciReads.push(runID);
    if (ci[2]) return Response.json({ total_count: 1, jobs: [{ conclusion: 'success', steps: steps.map(name => ({ name,
      conclusion: s.skippedCI === runID && name === steps[3] ? 'skipped' : 'success' })) }] });
    if (runID === 5) s.onExecutorCI?.();
    return Response.json({ repository: { full_name: 'aieasygames-alt/gachia' }, id: runID, path: '.github/workflows/payload-verify.yml',
      head_branch: 'codex/payload-unified-maintenance', head_sha: runID === 5 && !s.wrongExecutorCommit ? s.executorCI.commit : String(runID).repeat(40),
      status: 'completed', conclusion: 'success', run_attempt: s.changedCIAttempt === runID ? 2 : 1 });
  }
  if (url.hostname === 'api.cloudflare.com') {
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer isolated-cloud-token');
    const base = '/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers';
    const topology = url.pathname.match(/\/scripts\/([^/]+)\/(deployments|settings|subdomain)$/);
    if (options.method === 'GET' && (topology || url.pathname === base + '/scripts' || url.pathname === base + '/domains'
      || url.pathname === '/client/v4/zones/9ebfe7f1aeb7225947a1fc50c0deffc8/workers/routes')) {
      s.topologyReads.push(url.pathname);
      if (topology?.[1] === 'gachia' && topology[2] === 'deployments') s.snapshots++;
      if (s.failTopology === url.pathname) return Response.json({ success: false }, { status: 503 });
      let result;
      if (topology) {
        const [, service, kind] = topology;
        assert(SERVICES.includes(service)); assert.equal(url.pathname, `${base}/scripts/${service}/${kind}`);
        result = kind === 'deployments' ? { deployments: [s.s.current.services[service]] }
          : kind === 'settings' ? s.s.current.settings[service] : s.s.current.subdomains[service];
      } else if (url.pathname === base + '/scripts') result = s.s.current.scripts.map(id => ({ id }));
      else if (url.pathname === base + '/domains') result = s.s.current.domains;
      else result = s.s.current.routes;
      return Response.json({ success: true, result });
    }
    const version = url.pathname.match(/\/scripts\/([^/]+)\/versions\/([^/]+)$/);
    if (version) {
      assert.equal(options.method, 'GET'); s.versionReads++; s.onVersion?.(version[2]);
      const row = s.versions.get(version[1] + '/' + version[2]); assert(row, 'Unexpected immutable version');
      return Response.json({ success: true, result: s.changedVersion === version[2] ? { ...row, number: row.number + 1 } : row });
    }
    assert(url.pathname.includes('/scripts/gachia/deployments'), 'Only the Main deployment endpoint may be written');
    const id = s.recoveryDeployment, allocation = [{ version_id: s.f.versions[s.promotionEvidence ? 'candidate' : 'recovery'].id, percentage: 100 }];
    if (options.method === 'POST') {
      assert.deepEqual(JSON.parse(options.body), { strategy: 'percentage', versions: allocation }); s.writes++;
      s.s.current.services.gachia = { id, versions: allocation };
      if (s.loseWriteResponse) throw Error('Isolated response lost after activation');
    } else { assert.equal(options.method, 'GET'); assert(url.pathname.endsWith('/' + id)); }
    return Response.json({ success: true, result: { id, strategy: 'percentage', versions: allocation } });
  }
  assert.equal(url.hostname, 'gachia.com'); assert.equal(options.method, 'GET'); s.publicReads++;
  if (s.failPublic) throw Error('Isolated public HTTP failed');
  const role = s.writes && !s.promotionEvidence ? 'recovery' : 'candidate', i = s.f.paths.indexOf(url.pathname); assert(i >= 0);
  const row = s.f.roleBodies[role].rows[i], bytes = s.f.roleBodies[role].bodies[i];
  const prefix = readFileSync(new URL('../../../../scripts/fixtures/cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
  return new Response(url.pathname === '/robots.txt' ? Buffer.concat([prefix, bytes]) : bytes, { status: row.status, headers: row.headers });
});

async function fixture(t, { baseline, generation = 0, networkPin, productionState = false } = {}) {
  const s = await unifiedSourceFixture(t, { originalMain: true });
  s.spec.baseline.bindings = Object.fromEntries(SERVICES.map(service => [service, []]));
  s.spec.baseline.settings = Object.fromEntries(SERVICES.map(service => [service, { bindings: [] }]));
  s.spec.baseline.subdomains = Object.fromEntries(SERVICES.map(service => [service, { enabled: true, previews_enabled: true }]));
  s.spec.baseline.scripts = [...SERVICES].sort();
  if (generation) {
    for (const row of [s.spec.sources.find(row => row.sourcePath.endsWith('/ananta/raw-guides.json')), s.spec.sources.find(row => row.sourcePath.endsWith('.ts'))]) {
      row.text = row.sourcePath.endsWith('.json') ? '[{"id":"existing","title":"second published increment"}]\n' : 'export const ranks = 999\n';
      row.sha256 = digest(row.text);
      if (row.sourcePath.endsWith('.json')) writeFileSync(path.join(s.spec.owners.main.directory, 'assets/data/ananta/raw-guides.json'), row.text);
    }
    s.spec.owners.main.artifactSHA256 = digest(JSON.stringify(artifactFiles(s.spec.owners.main.directory), null, 2) + '\n');
  }
  const moduleCode = { candidate: unifiedWorkerFixture('published editorial increment', generation), recovery: unifiedWorkerFixture('previous editorial', generation) };
  const preparedProduction = productionState ? prepareProductionSource(s) : undefined;
  const f = await unifiedMainFixture(t, baseline ?? s.spec.baseline, s, { generation, moduleCode, sealedHistory: true, networkPin,
    productionIdentity: preparedProduction?.productionIdentity });
  f.moduleCode = moduleCode;
  const originalOwners = structuredClone(s.spec.owners), versions = new Map(Object.values(originalOwners).map(row => [row.service + '/' + row.versionId, row.version]));
  for (const version of Object.values(f.versions)) versions.set('gachia/' + version.id, version);
  const buildDirectory = f.input.run, publicationDirectory = path.join(s.root, 'publication');
  mkdirSync(path.join(publicationDirectory, 'main'), { recursive: true });
  cpSync(originalOwners.main.directory, path.join(publicationDirectory, 'main/candidate'), { recursive: true });
  mkdirSync(path.join(buildDirectory, 'source/packages/data'), { recursive: true });
  mkdirSync(path.join(buildDirectory, 'source/apps/web'), { recursive: true });
  cpSync(new URL('../../../../apps/web/wrangler.jsonc', import.meta.url), path.join(buildDirectory, 'source/apps/web/wrangler.jsonc'));
  f.save(path.join(buildDirectory, 'source/packages/data/raw-content-review.json'), { pairs: s.spec.pairs });
  const old = Object.fromEntries(Object.entries(originalOwners).map(([owner, row]) => [owner, { ...row, sourceIdentityPin: 'a'.repeat(64) }]));
  const ci = n => ({ runID: n, commit: String(n).repeat(40), runAttempt: 1, status: 'full_exact_ci_passed' });
  const dummy = f.save(path.join(s.root, 'dummy.json'), {});
  const historyRequest = { schemaVersion: 1, kind: 'unified_historical_publication_request', production: dummy, audit: dummy };
  const historyProof = f.save(path.join(s.root, 'history.json'), historyRequest);
  const previewsProof = { path: path.join(f.input.previews.directory, 'receipt.json'), pin: f.input.previews.pin };
  const execution = f.save(path.join(s.root, 'execution.json'), { ...f.input.previews.receipt, directory: f.input.previews.directory,
    receiptPin: f.input.previews.pin, sourceCI: f.input.sourceCI, originExecutorCI: f.input.originExecutorCI, executorCI: ci(4) });
  const publishedRequest = { schemaVersion: 1, kind: 'unified_published_main_request', history: historyProof, previews: previewsProof, previewExecution: execution, promotion: f.input.proof };
  const publishedProof = f.save(path.join(s.root, 'published-request.json'), publishedRequest);
  const historyMain = f.save(path.join(s.root, 'main-history.json'), { ...publishedRequest, kind: 'unified_historical_main_previews_request', promotion: undefined });
  const executorRepo = path.join(s.root, 'executor-checkout'); mkdirSync(path.join(executorRepo, 'scripts'), { recursive: true });
  const executorFile = path.join(executorRepo, 'scripts/executor.mjs'), executorText = 'export const fixture = true\n';
  writeFileSync(executorFile, executorText);
  const executorGit = (...args) => originalExec('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: executorRepo, stdio: ['ignore', 'pipe', 'pipe'] });
  executorGit('init'); executorGit('add', '.'); executorGit('commit', '-m', 'isolated executor');
  const executorCI = { ...ci(5), commit: executorGit('rev-parse', 'HEAD').toString().trim() };
  s.current = structuredClone(s.spec.baseline); s.current.services.gachia = { id: f.deploymentId, versions: [{ version_id: f.versions.candidate.id, percentage: 100 }] };
  state = { s, f, versions, publishedProof, publishedRequest, historyMain, historyRequest, previewsProof, executorCI, preparedProduction,
    productionLocal: preparedProduction ? await sealProductionLocal(s, f, preparedProduction) : undefined, localPreflights: 0,
    executorRepo, executorFile, executorText, executorGit, recoveryDeployment: sourceFixtureUUID(999),
    historical: { request: { production: f.input.productionRequest }, sources: { owners: old,
      provenance: Object.fromEntries(Object.entries(originalOwners).map(([owner, row]) => [owner, { ...row, proofTransportPin: s.spec.transportPin }])),
      handoff: { owners: originalOwners, transportPin: s.spec.transportPin } }, value: f.input.value,
      production: { sourceRunID: 1, executorRunID: 2 }, built: { frozen: { sourceCommit: ci(1).commit } },
      audit: { sourceCI: f.input.sourceCI, executorCI: f.input.originExecutorCI },
      plan: { sources: s.spec.sources, planSHA256: s.spec.planSHA256 }, build: buildDirectory, sealedSources: s.spec.sources,
      transport: { directory: f.transportDirectory, receipt: { publicationDirectory } }, publication: { owners: { main: { candidate: { artifactSHA256: originalOwners.main.artifactSHA256 } } } },
      sourceCI: f.input.sourceCI, originExecutorCI: f.input.originExecutorCI },
    credentialReads: 0, snapshots: 0, topologyReads: [], versionReads: 0, publicReads: 0, ciReads: [], historyReads: 0, executorChecks: 0, writes: 0, localWorkerReads: 0,
    networkOpened: 0, networkClosed: 0, previewReads: 0 };
  return state;
}

async function advance(s, kind = 'advance', index) {
  const request = { schemaVersion: 1, kind: kind === 'advance' ? 'unified_source_advance_request' : 'unified_next_source_request',
    publication: s.publishedProof, executorRunID: 5, ...(index ? { sourceIndex: index } : {}) };
  s.output = path.join(s.s.root, kind);
  return source.advanceUnifiedPublishedSources({ request, directory: s.output, cloudToken: 'isolated-cloud-token' });
}

for (const fault of ['none', 'preview', 'module', 'review', 'network', 'topology']) {
  test(`read-only preview renewal preserves uploaded identities and fails closed: ${fault}`, async t => {
    const s = await fixture(t), value = s.f.input.value;
    s.s.current = structuredClone(value.baseline);
    const network = { schemaVersion: 1, kind: 'explicit_loopback_preview_network', server: 'http://127.0.0.1:7890' };
    const networkProof = s.f.save(path.join(s.s.root, 'renewal-network.json'), network);
    const directory = path.join(s.s.root, 'readonly-renewal'), modules = [];
    s.failPreview = fault === 'preview';
    const original = structuredClone(s.f.input.previews.receipt);
    const opened = { evidence: { value, baseline: value.baseline, verify: async () => {
      if (fault === 'review') throw Error('Review changed');
      if (fault === 'network') writeFileSync(networkProof.path, '{}');
      if (fault === 'topology') s.s.current.services.gachia.versions[0].version_id = sourceFixtureUUID(998);
      return value;
    } }, previews: s.f.input.previews, references: s.f.input.references,
    revalidateModule: async (role, proof) => {
      s.previewRole = role;
      modules.push(role); assert.equal(proof.versionId, original.accepted[role].main.versionId);
      if (fault === 'module') throw Error('Module changed');
    }, request: { network: networkProof, previews: s.previewsProof }, network, server: network.server };
    const run = () => promotion.renewUnifiedMainPreviews(opened, 'isolated-cloud-token', directory);
    if (fault === 'none') {
      const result = await run();
      assert.equal(result.receipt.cloudWrites, false); assert.equal(result.receipt.productionPromoted, false);
      assert.deepEqual(modules, ['recovery', 'recovery', 'candidate', 'candidate']);
      for (const role of ['recovery', 'candidate']) {
        const renewed = result.receipt.accepted[role].main, old = original.accepted[role].main;
        assert.equal(renewed.originalEvidenceSHA256, old.evidenceSHA256);
        assert.equal(renewed.versionId, old.versionId); assert.equal(renewed.moduleSHA256, old.moduleSHA256);
      }
      await assert.rejects(run, /EEXIST/);
    } else {
      const message = { preview: /Isolated preview failed/, module: /Module changed/, review: /Review changed/,
        network: /Unified proof changed/, topology: /topology|deployment|version|changed|differ/i }[fault];
      await assert.rejects(run, message);
      assert.equal(existsSync(path.join(directory, 'receipt.json')), false);
    }
    assert.deepEqual(s.f.input.previews.receipt, original);
    assert.equal(s.networkOpened, 1); assert.equal(s.networkClosed, 1); assert.equal(s.writes, 0);
  });
}

for (const fault of ['none', 'reconciled', 'reconciled-continued', 'preflight-reconciled-ci', 'preflight-reconciled-input', 'normal-previews', 'normal-preview-legacy', 'normal-preview-parser', 'normal-preview-downgrade', 'completion', 'caller-mutation', 'open-caller-mutation', 'authorization', 'preview', 'lost-response', 'public',
  'preflight-ci', 'preflight-handoff', 'preflight-version', 'preflight-settings', 'preflight-metadata', 'preflight-review', 'late-review',
  'preflight-snapshot', 'preflight-guarded-reuse', 'preflight-executor-drift', 'preflight-source-attempt', 'preflight-origin-attempt']) {
  test(`private fixed promotion writer produces independently consumable evidence: ${fault}`, async t => {
    const network = { schemaVersion: 1, kind: 'explicit_loopback_preview_network', server: 'http://127.0.0.1:7890' };
    const s = await fixture(t, { networkPin: digest(JSON.stringify(network, null, 2) + '\n'), productionState: true }), f = s.f, value = f.input.value;
    // Preserve the seed's synthetic completion; this attempt must create its own journal.
    const journal = path.join(f.input.run, `unified-promotion-${value.transportPin}.jsonl`);
    renameSync(journal, journal + '.fixture-seed');
    s.s.current = structuredClone(value.baseline);
    const dummy = f.save(path.join(s.s.root, 'promotion-dummy.json'), {});
    const productionRequest = { schemaVersion: 1, kind: 'unified_production_preview_request', repo: s.s.root,
      ...Object.fromEntries(['localPreview', 'editorial', 'selection', 'active', 'application', 'sourceHandoff'].map(key => [key, dummy])),
      sourceRunID: 1, executorRunID: 2, sourceHandoff: s.preparedProduction.handoff,
      active: f.save(path.join(s.s.root, 'production-active.json'), s.s.spec.sources) };
    const productionProof = f.save(f.input.productionRequest.path, productionRequest);
    const { scope, qualification } = s.productionLocal;
    let audit = f.save(path.join(s.s.root, 'promotion-audit.json'), { requestPin: productionProof.pin,
      status: 'production_preview_preflight_passed_no_upload', scopeClosureRequired: false, productionPromoted: false,
      ownerOrder: ['main'], executorCI: f.input.originExecutorCI, releaseKey: value.releaseKey, qualification });
    s.historyRequest = { schemaVersion: 1, kind: 'unified_historical_publication_request', production: productionProof, audit };
    s.publishedRequest.history = f.save(s.publishedRequest.history.path, s.historyRequest);
    s.historical.request = s.historyRequest; s.historical.scope = scope;
    if (fault.includes('reconciled')) {
      const pair = uploadedPairHistoryFixture(f, digest(JSON.stringify(network, null, 2) + '\n'), { continued: fault === 'reconciled-continued' });
      const executorCI = { runID: 4, commit: '4'.repeat(40), runAttempt: 1, status: 'full_exact_ci_passed' };
      const originalProduction = f.save(path.join(s.s.root, 'original-upload-request.json'), { ...productionRequest,
        ...(fault === 'preflight-reconciled-input' ? { sourceRunID: 3 } : {}) });
      const data = { ...JSON.parse(readFileSync(audit.path)), schemaVersion: 1, kind: 'unified_uploaded_pair_reconciled_preflight',
        status: 'readonly_uploaded_pair_preflight_passed', transportPin: value.transportPin, sourceCI: f.input.sourceCI,
        reconciliation: { originalProduction, previews: pair.proof, executorCI }, cloudWrites: false, productionReady: false, activationSupported: false };
      audit = f.save(audit.path, data);
      s.historyRequest = { ...s.historyRequest, audit };
      s.historical.request = s.historyRequest; s.historical.audit = data; s.historical.production = productionRequest;
      s.publishedRequest.history = f.save(s.publishedRequest.history.path, s.historyRequest);
      s.previewsProof = pair.proof; s.publishedRequest.previews = pair.proof;
      s.publishedRequest.previewExecution = f.save(s.publishedRequest.previewExecution.path, { ...pair.receipt, directory: pair.directory, receiptPin: pair.proof.pin,
        sourceCI: f.input.sourceCI, originExecutorCI: f.input.originExecutorCI, executorCI });
      if (fault === 'preflight-reconciled-ci') s.changedCIAttempt = 4;
    }
    if (fault.startsWith('normal-preview')) {
      const directory = path.join(f.input.run, `unified-cloud-preview-${value.transportPin}`);
      const accepted = structuredClone(f.input.previews.receipt.accepted);
      if (fault === 'normal-preview-parser') accepted.candidate.main.parserPin = '0'.repeat(64);
      for (const role of ['recovery', 'candidate']) cpSync(path.join(f.input.previews.directory, `${role}-main`), path.join(directory, `${role}-main`), { recursive: true });
      if (fault === 'normal-preview-legacy' || fault === 'normal-preview-downgrade') for (const role of ['recovery', 'candidate']) {
        delete accepted[role].main.parserVersion; delete accepted[role].main.parserPin;
        if (fault === 'normal-preview-legacy') {
          const file = path.join(directory, `${role}-main/http/result.json`), result = JSON.parse(readFileSync(file));
          delete result.parserVersion; result.parserPin = unifiedHTMLParserPin();
          accepted[role].main.evidenceSHA256 = f.save(file, result).pin;
        }
      }
      const common = { at: new Date().toISOString(), releaseKey: value.releaseKey, transportPin: value.transportPin };
      const rows = [{ ...common, phase: 'baseline', baseline: value.baseline, directory }];
      for (const role of ['recovery', 'candidate']) for (const phase of ['upload_intent', 'upload_response', 'upload_returned', 'preview_accepted']) {
        rows.push({ ...common, phase, owner: 'main', role, ...(phase === 'preview_accepted' ? { proof: accepted[role].main }
          : { service: 'gachia', ...(phase === 'upload_intent' ? { moduleSHA256: accepted[role].main.moduleSHA256 } : { versionId: accepted[role].main.versionId }) }) });
      }
      rows.push({ ...common, phase: 'all_cloud_previews_accepted_no_promotion', accepted });
      const raw = rows.map(row => JSON.stringify(row) + '\n').join('');
      writeFileSync(path.join(f.input.run, `unified-preview-${value.transportPin}.jsonl`), raw);
      const receipt = { schemaVersion: 1, kind: 'unified_candidate_recovery_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion',
        transportPin: value.transportPin, releaseKey: value.releaseKey, accepted, journalPin: digest(raw), productionPromoted: false, activationSupported: false };
      s.previewsProof = f.save(path.join(directory, 'receipt.json'), receipt);
      s.publishedRequest.previews = s.previewsProof;
      s.publishedRequest.previewExecution = f.save(s.publishedRequest.previewExecution.path, { ...receipt, directory, receiptPin: s.previewsProof.pin,
        sourceCI: f.input.sourceCI, originExecutorCI: f.input.originExecutorCI, executorCI: { runID: 4, commit: '4'.repeat(40), runAttempt: 1, status: 'full_exact_ci_passed' } });
    }
    s.promotionEvidence = true;
    s.onVersion = id => { s.previewRole = id === f.versions.candidate.id ? 'candidate' : 'recovery'; };
    const input = { request: { schemaVersion: 1, kind: 'unified_main_promotion_request', production: structuredClone(productionProof), audit,
      previews: structuredClone(s.previewsProof), network: f.save(path.join(s.s.root, 'promotion-network.json'), network), executorRunID: 5 },
      cmsToken: 'isolated-cms-token', cloudToken: 'isolated-cloud-token', releaseKey: value.releaseKey };
    const original = structuredClone(input);
    if (fault === 'open-caller-mutation') {
      s.onPromotionOpen = () => {
        input.cmsToken = 'changed-cms-token'; input.cloudToken = 'changed-cloud-token';
        input.request.production.pin = '0'.repeat(64); input.request.network.pin = '0'.repeat(64);
      };
      const opened = await promotion.openUnifiedPromotion(input);
      assert.deepEqual(opened.request, original.request);
      for (const role of ['recovery', 'candidate']) {
        await opened.revalidateModule(role, opened.previews.receipt.accepted[role].main);
      }
      assert.equal((await opened.evidence.verify()).releaseKey, original.releaseKey);
      assert.equal(s.writes, 0); assert.equal(existsSync(journal), false);
      return;
    }
    if (['preflight-snapshot', 'preflight-guarded-reuse'].includes(fault)) {
      const request = structuredClone({ ...productionRequest, executorRunID: 5 });
      const options = { originExecutor: { runID: 2, commit: '2'.repeat(40) } };
      s.onExecutorCI = () => { request.sourceHandoff.pin = '0'.repeat(64); options.originExecutor.runID = 999; options.originExecutor.commit = '9'.repeat(40); };
      const evidence = await production.createUnifiedProductionVerifier(request, input, options);
      assert.equal(s.localPreflights, 1, 'Initialization must perform one complete local preflight');
      assert.equal(evidence.value.releaseKey, value.releaseKey);
      assert.deepEqual(evidence.originExecutorCI, f.input.originExecutorCI);
      const identities = s.versionReads;
      assert.equal((await evidence.verify()).releaseKey, value.releaseKey);
      assert.equal(s.localPreflights, 2, 'Current CMS/local checks must run at each boundary');
      assert(s.versionReads >= identities + 5, 'Every owner immutable identity must be read again');
      assert.equal(s.ciReads.includes(999), false); assert.equal(s.writes, 0);
      if (fault === 'preflight-guarded-reuse') {
        const file = path.join(s.s.spec.owners.nte.directory, 'worker.js'), original = readFileSync(file), stat = statSync(file);
        writeFileSync(file, Buffer.concat([original.subarray(0, -1), Buffer.from('!')])); utimesSync(file, stat.atime, stat.mtime);
        await assert.rejects(evidence.verify(), /artifact|module|changed|differs/i);
        writeFileSync(file, original); utimesSync(file, stat.atime, stat.mtime);
        await assert.rejects(evidence.verify(), /session is busy or failed/);
      }
      return;
    }
    if (fault === 'caller-mutation') s.onPromotionOpen = () => {
      input.request.production.pin = '0'.repeat(64); input.request.previews.pin = '0'.repeat(64);
      input.releaseKey = '0'.repeat(64); input.cloudToken = 'changed-token';
    };
    if (fault === 'authorization') input.releaseKey = '0'.repeat(64);
    s.failPreview = fault === 'preview'; s.loseWriteResponse = fault === 'lost-response'; s.failPublic = fault === 'public';
    if (fault === 'preflight-ci') s.skippedCI = 1;
    if (fault === 'preflight-source-attempt') s.changedCIAttempt = 1;
    if (fault === 'preflight-origin-attempt') s.changedCIAttempt = 2;
    if (fault === 'preflight-handoff') writeFileSync(s.preparedProduction.handoff.path, '{}');
    if (fault === 'preflight-version') s.changedVersion = s.s.spec.owners.nte.versionId;
    if (fault === 'preflight-settings') s.s.current.settings.gachia.compatibility_flags = [];
    if (fault === 'preflight-metadata') await sealProductionLocal(s.s, f, { ...s.preparedProduction,
      metadata: { ...s.preparedProduction.metadata, main_module: 'wrong.js' } });
    if (fault === 'preflight-review') s.failLocalPreflight = true;
    if (fault === 'preflight-executor-drift') s.onVersion = () => { writeFileSync(s.executorFile, 'changed during immutable-version reads'); };
    if (fault === 'late-review') s.onPromotionOpen = () => { s.failLocalPreflight = s.writes > 0; };
    if (fault === 'completion') s.onPromotionOpen = () => {
      if (s.writes && s.publicReads) throw Error('Unified promotion preview expired');
    };
    if (['none', 'reconciled', 'reconciled-continued', 'normal-previews', 'normal-preview-legacy', 'caller-mutation'].includes(fault)) {
      const result = await promotion.promoteUnifiedMain(input);
      assert.equal(result.status, 'production_accepted'); assert.equal(s.writes, 1);
      assert.deepEqual(result.productionRequest, original.request.production); assert.deepEqual(result.preview, original.request.previews);
      s.publishedRequest.promotion = { path: path.join(result.directory, 'receipt.json'), pin: result.receiptPin };
      s.publishedProof = f.save(s.publishedProof.path, s.publishedRequest);
      const advanced = await advance(s);
      const opened = await source.verifyUnifiedPublishedSource({ publication: s.publishedProof, sourceIndex: advanced.proof, githubToken: 'isolated-github-token' });
      assert.equal(opened.sources.length, 115);
      assert.equal(opened.value.owners.main.versionId, f.versions.candidate.id);
      assert.equal(s.writes, 1);
      assert(s.localPreflights > 2); for (const runID of [1, 2, 5]) assert(s.ciReads.includes(runID));
      if (['none', 'reconciled', 'reconciled-continued'].includes(fault)) {
        const next = await advance(s, 'baseline', advanced.proof), request = nextBuild(s, next);
        s.output = path.join(s.s.root, 'promoted-next-preparation');
        const prepared = await source.prepareUnifiedNextPublication({ request, directory: s.output });
        const checked = await publication.verifyUnifiedPublication(path.dirname(prepared.value.publication.path), prepared.value.publication.pin);
        assert.deepEqual(prepared.value.sourceIndex, advanced.proof);
        const previous = JSON.parse(readFileSync(prepared.value.previous.path, 'utf8'));
        assert.equal(previous.owners.main.versionId, f.versions.candidate.id);
        assert.equal(checked.receipt.owners.main.runtimeModuleSHA256, digest(f.moduleCode.candidate));
        assert.equal(Object.keys(JSON.parse(readFileSync(next.value.previous.path, 'utf8')).owners).length, 5);
        assert.equal(prepared.value.activationSupported, false); assert.equal(s.writes, 1);
        assert(s.localWorkerReads >= 190);
      }
    } else {
      const messages = { authorization: /Explicit matching release authorization/, preview: /Isolated preview failed/,
        completion: /Unified promotion preview expired/,
        'lost-response': /Main deployment outcome unknown/, public: /Production read failed/,
        'preflight-ci': /Full exact-CI/, 'preflight-handoff': /Editorial input pin/, 'preflight-settings': /drift/,
        'preflight-executor-drift': /unverified source edits/,
        'preflight-source-attempt': /Source CI differs from sealed historical audit/,
        'preflight-origin-attempt': /Original executor CI differs from sealed historical audit/,
        'preflight-review': /current CMS review changed/, 'late-review': /current CMS review changed/ };
      await assert.rejects(promotion.promoteUnifiedMain(input), error => {
        assert(!(error instanceof TypeError), 'Fixture wiring must not masquerade as preflight rejection');
        if (messages[fault]) assert.match(error.message, messages[fault]);
        else assert.equal(error.code, 'ERR_ASSERTION');
        return true;
      });
      assert.equal(s.writes, ['lost-response', 'public', 'late-review', 'completion'].includes(fault) ? 1 : 0);
      const attempts = readdirSync(f.input.run).filter(name => name.startsWith('unified-main-promotion-') && path.join(f.input.run, name) !== f.directory);
      assert.equal(attempts.length, ['authorization', 'normal-preview-parser', 'normal-preview-downgrade'].includes(fault) || fault.startsWith('preflight-') ? 0 : 1);
      for (const attempt of attempts) assert.equal(existsSync(path.join(f.input.run, attempt, 'receipt.json')), false);
      if (s.writes) {
        const rows = readFileSync(journal, 'utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(rows.filter(row => row.phase === 'promotion_intent').length, 1);
        assert.equal(rows.some(row => row.phase === 'production_accepted'), false);
        assert.equal(rows.find(row => row.phase === 'stopped').automaticRetry, false);
      }
    }
    assert.equal(s.networkOpened, s.networkClosed);
    if (s.writes) {
      const writes = s.writes;
      const afterPromotion = structuredClone(s.s.current);
      s.onPromotionOpen = undefined; s.failLocalPreflight = false;
      await assert.rejects(promotion.promoteUnifiedMain(original), /Protected deployment drift/);
      // Even if the simulated cloud returns to the old baseline, the journal forbids replay.
      s.s.current = structuredClone(value.baseline);
      await assert.rejects(promotion.promoteUnifiedMain(original), /Existing promotion requires read-only reconciliation/);
      assert.equal(s.writes, writes);
      if (fault === 'completion') {
        s.s.current = afterPromotion;
        const bytes = readFileSync(journal);
        const history = f.save(path.join(s.s.root, 'completion-history.json'), {
          ...s.publishedRequest, kind: 'unified_historical_main_previews_request', promotion: undefined,
        });
        const result = await completion.completeStoppedMainPromotion({ history,
          journal: { path: journal, pin: digest(bytes) }, promotionCI: f.save(path.join(s.s.root, 'promotion-ci.json'), { ci: s.executorCI }),
          executorRunID: 5, directory: path.join(f.input.run, 'readonly-completion'), cloudToken: original.cloudToken });
        assert.equal(result.status, 'production_accepted'); assert.equal(result.cloudWrites, false);
        assert.equal(s.writes, writes); assert.deepEqual(readFileSync(journal), bytes);
        s.publishedRequest.promotion = result.proof;
        s.publishedProof = f.save(s.publishedProof.path, s.publishedRequest);
        const advanced = await advance(s);
        const checked = await source.verifyUnifiedPublishedSource({ publication: s.publishedProof, sourceIndex: advanced.proof, githubToken: 'isolated-github-token' });
        assert.equal(checked.sources.length, 115); assert.equal(checked.value.owners.main.versionId, f.versions.candidate.id);
        assert.equal(s.writes, writes);
      }
      if (fault === 'public') {
        // Consume this writer's stopped journal unchanged, not the synthetic stopped() helper.
        s.s.current = afterPromotion; s.failPublic = false; s.promotionEvidence = false;
        const bytes = readFileSync(journal);
        const history = f.save(path.join(s.s.root, 'stopped-main-history.json'), {
          ...s.publishedRequest, kind: 'unified_historical_main_previews_request', promotion: undefined,
        });
        const request = { schemaVersion: 1, kind: 'unified_main_compatible_recovery_request', history,
          promotionJournal: { path: journal, pin: digest(bytes) }, network: original.request.network, executorRunID: 5 };
        const recovered = await recovery.recoverUnifiedMain({ request, cloudToken: original.cloudToken, releaseKey: original.releaseKey });
        assert.equal(recovered.status, 'recovery_accepted'); assert.equal(recovered.sourceAdvanced, false);
        assert.equal(s.writes, writes + 1); assert.deepEqual(readFileSync(journal), bytes);
        assert.equal(s.s.current.services.gachia.versions[0].version_id, f.versions.recovery.id);
        assert(!existsSync(path.join(s.s.root, 'advance/source-index.json')));
        assert.equal(s.networkOpened, s.networkClosed);
      }
    }
  });
}

function nextBuild(s, next, { missingA = false, workerFault } = {}) {
  const directory = path.join(s.s.root, 'next-build'), write = (file, bytes) => {
    mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes); return digest(bytes);
  };
  const sources = JSON.parse(readFileSync(next.value.active.path, 'utf8'));
  if (missingA) sources.pop();
  const candidate = path.join(directory, 'artifacts/main'); mkdirSync(path.dirname(candidate), { recursive: true });
  const previous = JSON.parse(readFileSync(next.value.previous.path, 'utf8'));
  cpSync(previous.owners.main.directory, candidate, { recursive: true });
  write(path.join(candidate, 'worker.js'), workerFault === 'worker-syntax' ? 'export default { broken syntax'
    : unifiedWorkerFixture(workerFault === 'worker-body' ? 'unreviewed runtime body' : 'next editorial'));
  write(path.join(candidate, 'assets/_next/static/next.js'), 'next static');
  const config = { name: 'gachia', compatibility_date: s.f.config.compatibility_date, compatibility_flags: s.f.config.compatibility_flags };
  write(path.join(directory, 'source/apps/web/wrangler.jsonc'), JSON.stringify(config));
  write(path.join(directory, 'source/pnpm-lock.yaml'), readFileSync(new URL('../../../../pnpm-lock.yaml', import.meta.url)));
  write(path.join(directory, 'source/packages/data/raw-content-review.json'), JSON.stringify({ pairs: s.s.spec.pairs }));
  const expectations = [{ owner: 'main', path: '/zh/ananta/guides/download-install-guide', status: 200, contains: ['next editorial'] }];
  const save = (name, value) => { const file = path.join(directory, name), text = JSON.stringify(value, null, 2) + '\n'; return { path: file, pin: write(file, text) }; };
  const active = sources.map((row, i) => {
    write(path.join(directory, 'source', row.sourcePath), row.text);
    const file = `active/${i}.source`; write(path.join(directory, file), row.text);
    return { sourcePath: row.sourcePath, sha256: row.sha256, file };
  });
  for (const pair of s.s.spec.pairs) write(path.join(directory, 'source/apps/web/public/data', pair), readFileSync(path.join(candidate, 'assets/data', pair)));
  const files = unifiedTree(path.join(directory, 'source'));
  const compiler = { preview: true, productionReady: false, activationSupported: false, cloudWrites: false,
    baselines: sources.map(row => ({ sourcePath: row.sourcePath, activeSHA256: row.sha256 })) };
  const frozen = { schemaVersion: 1, kind: 'unified_frozen_source', status: 'generated_source_only',
    sourceAuthentication: 'not_required_by_operator', publicationPolicy: COMMUNITY_PUBLICATION_POLICY,
    productionReady: false, activationSupported: false, cloudWrites: false, websiteChanged: false,
    planSHA256: s.s.spec.planSHA256, owners: ['main'],
    candidate: { ...compiler, candidateSHA256: digest(canonical(compiler)) }, activePin: save('active.json', active).pin,
    filesPin: save('files.json', files).pin, sourceTreeSHA256: digest(canonical(files)) };
  const frozenPin = save('manifest.json', frozen).pin;
  const rows = build.consumerRequests('main', expectations, build.publicFiles(directory, 'main'));
  const references = rows.map((row, i) => {
    const body = row.contains ? '<main>next editorial</main>' : row.path === '/sitemap.xml' ? '<urlset />'
      : row.path === '/robots.txt' ? 'User-agent: *\n' : row.path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}'
        : readFileSync(path.join(candidate, 'assets', row.path));
    const bodyFile = `${i}.body`, sha256 = write(path.join(directory, 'main-http', bodyFile), body);
    return { path: row.path, status: row.status, bodyFile, sha256, bytes: Buffer.byteLength(body),
      headers: { 'content-type': row.contains ? 'text/html' : row.path === '/sitemap.xml' ? 'application/xml'
        : row.path === '/robots.txt' ? 'text/plain' : 'application/json' } };
  });
  const owners = { main: { status: 'built_and_locally_accepted', artifactSHA256: save('main-artifact.json', artifactFiles(candidate)).pin,
    referencesPin: save('main-http/references.json', references).pin, responses: references.length } };
  save('build-state.json', { status: 'all_owners_built_and_locally_accepted', owners, cloudWrites: false });
  const proof = save('build.json', { schemaVersion: 1, kind: 'unified_owner_build', frozenPin,
    sourceTreeSHA256: frozen.sourceTreeSHA256, candidateSHA256: frozen.candidate.candidateSHA256,
    publicationPolicy: frozen.publicationPolicy, owners, expectationsPin: save('consumer-expectations.json', expectations).pin,
    preview: true, productionReady: false, cloudWrites: false, pending: ['synthetic fixture, not an OpenNext build'] });
  s.built = build.verifyUnifiedOwnerBuild(directory, proof.pin);
  s.allowLocalWorkerHTTP = true;
  const baseline = save('baseline-expectations.json', [{ ...expectations[0], contains: ['published editorial increment'] }]);
  return { schemaVersion: 1, kind: 'unified_next_publication_request', publication: s.publishedProof, handoff: next.proof,
    build: proof, expectations: baseline, executorRunID: 5 };
}

function sourceBinding(s, next) {
  const active = JSON.parse(readFileSync(next.value.active.path, 'utf8'));
  const frozen = { planSHA256: s.s.spec.planSHA256, owners: ['main'], candidate: { baselines: active.map(row => ({ sourcePath: row.sourcePath, activeSHA256: row.sha256 })) } };
  const allPrevious = JSON.parse(readFileSync(next.value.previous.path, 'utf8'));
  return { active, frozen, identityObservedAt: Date.now(), baseline: structuredClone(s.s.current), previous: selectUnifiedNextPrevious({ value: next.value, sources: active, previous: allPrevious }, frozen) };
}

for (const fault of ['none', 'expired-at-operation', 'source-body', 'source-index', 'source-module', 'source-provenance']) {
  test(`historical promotion source reopens the full new observation while preserving sealed A: ${fault}`, async t => {
    const s = await fixture(t), index = await advance(s), original = await advance(s, 'baseline', index.proof);
    const binding = sourceBinding(s, original), sealed = await source.readUnifiedPublicationSources(original.proof, binding);
    const previous = s.f.save(path.join(s.s.root, 'promotion-source-previous.json'), binding.previous);
    const historical = { production: { active: original.value.active, sourceHandoff: original.proof }, active: binding.active,
      built: { frozen: binding.frozen }, value: { baseline: binding.baseline }, sources: sealed,
      publication: { previousPath: previous.path, previousPin: previous.pin } };
    const next = await source.advanceUnifiedPublishedSources({ request: { schemaVersion: 1, kind: 'unified_next_source_request',
      publication: s.publishedProof, sourceIndex: index.proof, executorRunID: 5 }, directory: path.join(s.s.root, 'promotion-fresh-baseline'), cloudToken: 'isolated-cloud-token' });
    const proof = next.proof, before = readFileSync(original.proof.path);
    let observedAt = Date.now();
    if (fault === 'expired-at-operation') observedAt = next.value.observation.startedAt + 900001;
    if (fault === 'source-body') writeFileSync(path.join(path.dirname(proof.path), 'public/0.body'), 'tampered');
    if (fault === 'source-index') {
      const value = { ...next.value, sourceIndex: original.proof };
      Object.assign(proof, s.f.save(proof.path, value));
    }
    if (fault === 'source-module') historical.sources.owners.main.moduleSHA256 = '0'.repeat(64);
    if (fault === 'source-provenance') historical.sources.provenance.main.moduleProof.pin = '0'.repeat(64);
    if (fault === 'none') {
      const opened = await promotionSource.readUnifiedHistoricalPromotionSource(historical, proof, observedAt);
      assert.equal(opened.ancestor.historical.value.releaseKey, s.f.input.value.releaseKey);
      assert.deepEqual(opened.owners, sealed.owners);
      const reads = s.ciReads.length;
      await published.verifyUnifiedPublishedMainEvidence(opened.ancestor, 'isolated-github-token');
      assert(s.ciReads.length > reads);
    } else await assert.rejects(promotionSource.readUnifiedHistoricalPromotionSource(historical, proof, observedAt));
    assert.deepEqual(readFileSync(original.proof.path), before); assert.equal(s.writes, 0);
  });
}

function stopped(s) {
  const file = path.join(s.f.input.run, `unified-promotion-${s.f.input.value.transportPin}.jsonl`);
  const rows = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse), last = rows[2];
  const bytes = [...rows.slice(0, 3), { ...last, phase: 'stopped', automaticRetry: false, automaticRollback: false },
    { ...last, phase: 'observation_unavailable' }].map(JSON.stringify).join('\n') + '\n';
  writeFileSync(file, bytes);
  const network = s.f.save(path.join(s.s.root, 'network.json'), { schemaVersion: 1, kind: 'explicit_loopback_preview_network', server: 'http://127.0.0.1:7890' });
  return { schemaVersion: 1, kind: 'unified_main_compatible_recovery_request', history: s.historyMain, promotionJournal: { path: file, pin: digest(bytes) }, network, executorRunID: 5 };
}

test('fixed source entry reopens real completed evidence and consumes all five owners / 115 A / 90 public pairs', async t => {
  const s = await fixture(t), advanced = await advance(s);
  const opened = await source.verifyUnifiedPublishedSource({ publication: s.publishedProof, sourceIndex: advanced.proof, githubToken: 'isolated-github-token' });
  assert.equal(opened.sources.length, 115); assert.equal(opened.value.observation.public.pin.length, 64);
  assert.deepEqual(Object.keys(opened.value.owners).sort(), Object.keys(s.s.spec.owners).sort());
  assert.equal(readFileSync(path.join(opened.value.owners.main.directory, 'worker.js'), 'utf8'), s.f.moduleCode.candidate);
  for (const owner of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) assert.equal(opened.value.owners[owner].directory, s.s.spec.owners[owner].directory);
  const next = await advance(s, 'baseline', advanced.proof);
  const consumed = await source.verifyUnifiedNextSource({ publication: s.publishedProof, handoff: next.proof, githubToken: 'isolated-github-token' });
  assert.equal(consumed.sources.length, 115); assert.equal(s.versionReads, 20); assert.equal(s.snapshots, 4);
  assert.equal(s.publicReads, s.f.paths.length * 2); assert.equal(s.writes, 0);
  for (const runID of [1, 2, 3, 4, 5]) assert(s.ciReads.includes(runID));
  for (const result of [advanced, next]) { assert.equal(result.cloudWrites, false); assert.equal(result.newPublicationAuthorized, false); }
});

for (const fault of ['none-expired', 'stop-journal', 'stop-http', 'completion-journal', 'references', 'body', 'version', 'module', 'receipt', 'config']) {
  test(`fixed historical preview reader validates sealed history offline: ${fault}`, async t => {
    const s = await fixture(t), { previews, value } = s.f.input;
    const files = {
      'stop-journal': previews.receipt.stop.journal.path,
      'stop-http': previews.receipt.stop.http.path,
      'completion-journal': path.join(s.f.input.run, `unified-preview-completion-${value.transportPin}.jsonl`),
      references: path.join(s.f.transportDirectory, 'main/candidate/http/references.json'),
      body: path.join(s.f.transportDirectory, 'main/recovery/http/0.body'),
      version: path.join(previews.directory, 'candidate-main/version.json'),
      module: previews.receipt.accepted.recovery.main.moduleProof.path,
      receipt: s.previewsProof.path,
      config: path.join(s.historical.build, 'source/apps/web/wrangler.jsonc'),
    };
    if (fault !== 'none-expired') writeFileSync(files[fault], 'corrupt');
    const counts = () => [s.credentialReads, s.snapshots, s.versionReads, s.publicReads, s.previewReads, s.ciReads.length, s.writes];
    const before = counts();
    if (fault === 'none-expired') {
      const now = Date.now(); t.mock.method(Date, 'now', () => now + 900001);
      const opened = await historical.readUnifiedHistoricalMainPreviews(s.historical, s.previewsProof);
      assert.deepEqual(opened.previews.receipt.accepted, previews.receipt.accepted);
      assert.equal(opened.publicReferences('candidate').length, s.f.paths.length);
    } else {
      await assert.rejects(historical.readUnifiedHistoricalMainPreviews(s.historical, s.previewsProof), error => {
        assert(!(error instanceof TypeError), 'Fixture wiring must not masquerade as rejection');
        return true;
      });
    }
    assert.deepEqual(counts(), before);
  });
}

test('fixed production source adapter keeps legacy all-five handoffs compatible and revalidates all identities', async t => {
  const s = await fixture(t), proof = (name, value) => s.f.save(path.join(s.s.root, name), value);
  const owners = {}, old = {};
  for (const [owner, row] of Object.entries(s.s.spec.owners)) {
    old[owner] = Object.fromEntries(['service', 'versionId', 'directory', 'artifactSHA256', 'modulePath', 'archiveSHA256', 'moduleSHA256'].map(key => [key, row[key]]));
    owners[owner] = { service: row.service, sourceVersionId: row.versionId, moduleSHA256: row.moduleSHA256, mode: row.mode, moduleProof: row.moduleProof,
      versionProof: proof(`${owner}-legacy-version.json`, row.version) };
  }
  const handoff = proof('legacy-handoff.json', { schemaVersion: 1, kind: 'unified_observed_source_handoff', status: 'all_five_active_source_modules_verified',
    transportPin: s.s.spec.transportPin, previous: proof('legacy-previous.json', { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: old }),
    owners, workerWrites: 0, authPOSTs: 0, activationSupported: false, rawUuidRollbackAuthorized: false, topologyUnchanged: true,
    before: proof('legacy-before.json', s.s.spec.baseline), after: proof('legacy-after.json', s.s.spec.baseline), observedAt: new Date().toISOString() });
  const result = await source.verifyUnifiedProductionSources(handoff, { baseline: s.s.spec.baseline }, { githubToken: 'isolated-github-token', cloudToken: 'isolated-cloud-token' });
  assert.equal(result.handoff.kind, 'unified_observed_source_handoff'); assert.equal(s.versionReads, 5);
  assert.equal(s.ciReads.length, 0); assert.equal(s.writes, 0);
});

for (const fault of ['none', 'old-A', 'missing-code', 'legacy-Main', 'old-baseline', 'expired', 'source-ci', 'preview-ci', 'promotion-ci',
  'unchanged-version', 'request-mutation', 'expired-during-read']) {
  test(`fixed production source adapter accepts only fresh complete next-batch evidence: ${fault}`, async t => {
    const s = await fixture(t), index = await advance(s), next = await advance(s, 'baseline', index.proof), binding = sourceBinding(s, next);
    const proof = { ...next.proof }, original = structuredClone(binding), now = Date.now();
    if (fault === 'old-A') binding.active[0].text = 'old O';
    if (fault === 'missing-code') binding.active = binding.active.filter(row => !row.sourcePath.endsWith('.ts'));
    if (fault === 'legacy-Main') binding.previous.owners.main.versionId = s.s.spec.owners.main.versionId;
    if (fault === 'old-baseline') binding.baseline = s.s.spec.baseline;
    if (fault === 'expired') t.mock.method(Date, 'now', () => now + 900001);
    if (fault.endsWith('-ci')) s.skippedCI = { 'source-ci': 1, 'preview-ci': 4, 'promotion-ci': 3 }[fault];
    if (fault === 'unchanged-version') s.changedVersion = s.s.spec.owners['azur-promilia'].versionId;
    s.versionReads = 0;
    if (fault === 'request-mutation') s.onVersion = () => { proof.pin = 'f'.repeat(64); binding.active[0].text = 'mutated after await'; };
    if (fault === 'expired-during-read') s.onVersion = () => { if (s.versionReads === 5) t.mock.method(Date, 'now', () => now + 900001); };
    const input = () => source.verifyUnifiedProductionSources(proof, binding, { githubToken: 'isolated-github-token', cloudToken: 'isolated-cloud-token' });
    if (['none', 'request-mutation'].includes(fault)) {
      const result = await input(); assert.deepEqual(Object.keys(result.owners).sort(), Object.keys(s.s.spec.owners).sort());
      assert.equal(result.owners.main.versionId, s.f.versions.candidate.id); assert.equal(s.versionReads, 5);
      assert.equal(result.provenance.main.mode, 'unified_upload_time_module_receipt');
      assert.deepEqual(result.previous.owners.main, original.previous.owners.main);
    } else await assert.rejects(input(), error => { assert(!(error instanceof TypeError)); return true; });
    assert.equal(s.writes, 0);
  });
}

test('fixed historical next-source read stays offline after expiry and revalidates ancestor CI only when requested', async t => {
  const s = await fixture(t), index = await advance(s), next = await advance(s, 'baseline', index.proof), binding = sourceBinding(s, next);
  const now = Date.now(); t.mock.method(Date, 'now', () => now + 900001);
  const counts = [s.snapshots, s.versionReads, s.publicReads, s.ciReads.length];
  const opened = await source.readUnifiedPublicationSources(next.proof, binding);
  assert.equal(opened.freshnessRenewed, false); assert.equal(opened.currentCloudRead, false);
  assert.deepEqual([s.snapshots, s.versionReads, s.publicReads, s.ciReads.length], counts);
  for (const githubToken of [undefined, '']) {
    await assert.rejects(source.verifyUnifiedNextSource({ publication: s.publishedProof, handoff: next.proof, githubToken }), /Authenticated ancestor CI/);
    await assert.rejects(source.verifyUnifiedProductionSources(next.proof, binding, { githubToken, cloudToken: 'isolated-cloud-token' }), /Authenticated ancestor CI/);
  }
  await assert.rejects(source.verifyUnifiedProductionSources(next.proof, binding, { githubToken: 'isolated-github-token', cloudToken: '' }), /Authenticated immutable/);
  await assert.rejects(source.readUnifiedPublicationSources(next.proof, { ...binding, identityObservedAt: now + 900001 }), /while fresh/);
  await assert.rejects(source.readUnifiedPublicationSources(next.proof, { ...binding, identityObservedAt: next.value.observation.startedAt - 1 }), /while fresh/);
  const evidence = { ...s.historical, sources: opened };
  assert.equal((await historical.verifyUnifiedHistoricalPublicationEvidence(evidence, 'isolated-github-token')).ciVerified, true);
  for (const runID of [1, 2, 3, 4]) assert(s.ciReads.slice(counts[3]).includes(runID));
  s.skippedCI = 3;
  await assert.rejects(historical.verifyUnifiedHistoricalPublicationEvidence(evidence, 'isolated-github-token'), /Full exact-CI/);
  assert.deepEqual([s.snapshots, s.versionReads, s.publicReads], counts.slice(0, 3)); assert.equal(s.writes, 0);
});

test('a second completed publication advances new Main and nonpublic A while preserving the first baseline ancestry', async t => {
  const first = await fixture(t), index = await advance(first), next = await advance(first, 'baseline', index.proof);
  const sources = await source.readUnifiedPublicationSources(next.proof, sourceBinding(first, next));
  const second = await fixture(t, { baseline: sources.baseline, generation: 1 });
  second.historical.sources = sources;
  const advanced = await advance(second);
  assert.notEqual(advanced.value.owners.main.versionId, sources.owners.main.versionId);
  assert.equal(readFileSync(path.join(advanced.value.owners.main.directory, 'worker.js'), 'utf8'), second.f.moduleCode.candidate);
  const active = JSON.parse(readFileSync(advanced.value.active.path, 'utf8'));
  assert.equal(active.length, 115); assert(active.find(row => row.sourcePath.endsWith('.ts')).text.includes('999'));
  assert(active.find(row => row.sourcePath.endsWith('/ananta/raw-guides.json')).text.includes('second published increment'));
  for (const owner of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) assert.equal(advanced.value.owners[owner].versionId, sources.owners[owner].versionId);
  assert.equal(first.writes + second.writes, 0);
});

for (const fault of ['history', 'incomplete-sources', 'incomplete-pairs', 'stopped-promotion', 'module', 'public-body', 'deployment', 'preview-execution',
  'source-ci', 'origin-ci', 'promotion-ci', 'preview-ci', 'executor-ci', 'wrong-main', 'other-service', 'version', 'public-http']) {
  test(`fixed source entry rejects ${fault} without granting a usable source`, async t => {
    const s = await fixture(t);
    if (fault === 'history') s.failHistory = true;
    if (fault === 'incomplete-sources') s.historical.plan.sources = s.historical.plan.sources.slice(1);
    if (fault === 'incomplete-pairs') s.f.save(path.join(s.f.input.run, 'source/packages/data/raw-content-review.json'), { pairs: s.s.spec.pairs.slice(1) });
    if (fault === 'stopped-promotion') {
      const request = stopped(s); s.f.changeReceipt(receipt => { receipt.journalPin = request.promotionJournal.pin; });
      s.publishedRequest.promotion = s.f.input.proof; s.publishedProof = s.f.save(s.publishedProof.path, s.publishedRequest);
    }
    if (fault === 'module') writeFileSync(s.f.input.previews.receipt.accepted.candidate.main.moduleProof.path, '{}');
    if (fault === 'public-body') writeFileSync(path.join(s.f.directory, 'public/3.body'), 'corrupt');
    if (fault === 'deployment') writeFileSync(path.join(s.f.directory, 'deployment-verification.body'), '{}');
    if (fault === 'preview-execution') writeFileSync(s.publishedRequest.previewExecution.path, '{}');
    if (fault.endsWith('-ci')) s.skippedCI = { 'source-ci': 1, 'origin-ci': 2, 'promotion-ci': 3, 'preview-ci': 4, 'executor-ci': 5 }[fault];
    if (fault === 'wrong-main') s.s.current.services.gachia.versions[0].version_id = sourceFixtureUUID(888);
    if (fault === 'other-service') s.s.current.services['gachia-game-nte'].id = sourceFixtureUUID(888);
    if (fault === 'version') s.changedVersion = s.f.versions.candidate.id;
    if (fault === 'public-http') s.failPublic = true;
    await assert.rejects(advance(s), error => {
      assert(!(error instanceof TypeError), 'A fixture wiring error must not masquerade as a gate rejection');
      if (fault === 'history') assert.match(error.message, /historical source rejected/);
      if (fault === 'public-http') assert.match(error.message, /Production read failed/);
      if (fault === 'stopped-promotion') assert.match(error.message, /stopped promotion/);
      if (fault.endsWith('-ci')) assert.match(error.message, /Full exact-CI step required/);
      return true;
    });
    assert.equal(s.writes, 0);
    assert(!existsSync(path.join(s.output, 'source-index.json')));
  });
}

for (const fault of ['none', 'http', 'split', 'settings', 'subdomain', 'scripts', 'routes', 'domains']) {
  test(`fixed source entry consumes real seven-service cloud snapshot parsing: ${fault}`, async t => {
    const s = await fixture(t), service = 'gachia-router';
    const base = '/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers';
    if (fault === 'http') s.failTopology = `${base}/scripts/${service}/settings`;
    if (fault === 'split') s.s.current.services[service].versions[0].percentage = 50;
    if (fault === 'settings') s.s.current.settings[service].compatibility_date = '2026-11-01';
    if (fault === 'subdomain') s.s.current.subdomains[service].enabled = false;
    if (fault === 'scripts') s.s.current.scripts.push('unreviewed-service');
    if (fault === 'routes') s.s.current.routes.push({ id: 'unexpected', pattern: 'gachia.com/*', script: service });
    if (fault === 'domains') s.s.current.domains.push({ hostname: 'gachia.com', service });
    if (fault === 'none') {
      await advance(s);
      assert.equal(s.topologyReads.length, s.snapshots * 24);
      for (const target of SERVICES) for (const endpoint of ['deployments', 'settings', 'subdomain']) {
        assert.equal(s.topologyReads.filter(url => url === `${base}/scripts/${target}/${endpoint}`).length, s.snapshots);
      }
    } else {
      await assert.rejects(advance(s), fault === 'http' ? /Read-only Cloudflare request failed: 503/
        : fault === 'split' ? /Split\/missing deployment/ : /Topology drift:/);
      assert(!existsSync(path.join(s.output, 'source-index.json')));
    }
    assert.equal(s.writes, 0);
  });
}

for (const fault of ['dirty', 'untracked', 'staged-add', 'staged-delete', 'changed-during-ci', 'added-during-ci', 'wrong-ci-commit']) {
  test(`fixed source entry uses real checkout and CI integrity: ${fault}`, async t => {
    const s = await fixture(t);
    const add = staged => {
      writeFileSync(path.join(s.executorRepo, 'scripts/extra.mjs'), 'export {}\n');
      if (staged) s.executorGit('add', 'scripts/extra.mjs');
    };
    if (fault === 'dirty') writeFileSync(s.executorFile, 'changed');
    if (fault === 'untracked') add(false);
    if (fault === 'staged-add') add(true);
    if (fault === 'staged-delete') s.executorGit('rm', 'scripts/executor.mjs');
    if (fault === 'changed-during-ci') s.onExecutorCI = () => writeFileSync(s.executorFile, 'changed while reading CI');
    if (fault === 'added-during-ci') s.onExecutorCI = () => add(true);
    if (fault === 'wrong-ci-commit') s.wrongExecutorCommit = true;
    await assert.rejects(advance(s), error => {
      if (fault === 'wrong-ci-commit') {
        assert.equal(error.actual, '5'.repeat(40)); assert.equal(error.expected, s.executorCI.commit);
      } else assert.match(error.message, fault === 'untracked' ? /Uncommitted production executor files/
        : ['dirty', 'changed-during-ci'].includes(fault) ? /unverified source edits/ : /file inventory changed/);
      return true;
    });
    assert.equal(s.snapshots, 0); assert.equal(s.publicReads, 0); assert.equal(s.historyReads, 0); assert.equal(s.writes, 0);
    assert(!existsSync(s.output));
    if (fault.includes('during-ci') || fault === 'wrong-ci-commit') assert(s.ciReads.includes(5));
    else assert.equal(s.ciReads.length, 0);
  });
}

for (const kind of ['advance', 'baseline']) test(`fixed ${kind} invalidates protocol success when final executor verification fails`, async t => {
  const s = await fixture(t), index = kind === 'baseline' ? await advance(s) : undefined;
  s.failFinalExecutor = true;
  await assert.rejects(advance(s, kind, index?.proof), /unverified source edits/);
  const name = kind === 'advance' ? 'source-index.json' : 'source-handoff.json', file = path.join(s.output, name);
  assert(existsSync(file)); assert(existsSync(path.join(s.output, 'failure.json')));
  const input = { publication: s.publishedProof, githubToken: 'isolated-github-token' }, proof = { path: file, pin: digest(readFileSync(file)) };
  await assert.rejects(kind === 'advance' ? source.verifyUnifiedPublishedSource({ ...input, sourceIndex: proof }) : source.verifyUnifiedNextSource({ ...input, handoff: proof }), /Failed/);
  s.failFinalExecutor = false; await assert.rejects(advance(s, kind, index?.proof), /EEXIST/); assert.equal(s.writes, 0);
});

test('fixed source request cannot change its pinned publication during asynchronous verification', async t => {
  const s = await fixture(t), request = { schemaVersion: 1, kind: 'unified_source_advance_request', publication: { ...s.publishedProof }, executorRunID: 5 };
  const directory = path.join(s.s.root, 'immutable-request'), changedDirectory = path.join(s.s.root, 'changed-output');
  const input = { request, directory, cloudToken: 'isolated-cloud-token' };
  s.onExecutor = () => { request.publication.pin = 'f'.repeat(64); input.cloudToken = 'changed'; input.directory = changedDirectory; };
  const result = await source.advanceUnifiedPublishedSources(input);
  assert(existsSync(path.join(directory, 'source-index.json'))); assert(!existsSync(changedDirectory));
  assert.deepEqual(result.value.publication, s.publishedProof); assert.equal(s.writes, 0);
});

for (const fault of ['none', 'missing-A', 'wrong-build-path', 'expired-handoff', 'local-http', 'final-executor', 'request-mutation',
  'frozen-source', 'active-source', 'artifact', 'build-state', 'response-body', 'expectations', 'build-pin', 'manifest', 'worker-body', 'worker-syntax']) {
  test(`fixed next preparation consumes the fresh complete baseline and real local publication: ${fault}`, async t => {
    const s = await fixture(t), index = await advance(s), next = await advance(s, 'baseline', index.proof), request = nextBuild(s, next,
      { missingA: fault === 'missing-A', workerFault: fault });
    if (fault === 'wrong-build-path') request.build.path = path.join(s.built.directory, 'other.json');
    if (fault === 'expired-handoff') { const now = Date.now(); t.mock.method(Date, 'now', () => now + 900001); }
    if (fault === 'local-http') request.expectations = s.f.save(request.expectations.path,
      [{ owner: 'main', path: '/zh/ananta/guides/download-install-guide', status: 200, contains: ['absent editorial content'] }]);
    if (fault === 'final-executor') s.failFinalExecutor = true;
    const corrupt = (file, bytes) => writeFileSync(path.join(s.built.directory, file), bytes);
    if (fault === 'frozen-source') corrupt('source/apps/web/wrangler.jsonc', '{}');
    if (fault === 'active-source') corrupt('active/0.source', '{}');
    if (fault === 'artifact') corrupt('artifacts/main/worker.js', 'changed runtime');
    if (fault === 'build-state') corrupt('build-state.json', JSON.stringify({ status: 'failed' }));
    if (fault === 'response-body') corrupt('main-http/0.body', '<main>evil editorial</main>');
    if (fault === 'expectations') corrupt('consumer-expectations.json', '[]');
    if (fault === 'build-pin') request.build.pin = '0'.repeat(64);
    if (fault === 'manifest') corrupt('manifest.json', '{}');
    const original = structuredClone(request);
    s.output = path.join(s.s.root, 'next-preparation');
    const input = { request, directory: s.output };
    const changedDirectory = path.join(s.s.root, 'changed-preparation');
    if (fault === 'request-mutation') s.onExecutor = () => {
      request.handoff.pin = 'f'.repeat(64); request.expectations.pin = 'f'.repeat(64); input.directory = changedDirectory;
    };
    if (['none', 'request-mutation'].includes(fault)) {
      const result = await source.prepareUnifiedNextPublication(input);
      assert.equal(result.proof.path, path.join(s.output, 'next-publication.json')); assert(!existsSync(changedDirectory));
      assert.deepEqual(result.value.request, original); assert.deepEqual(result.value.sourceIndex, index.proof);
      assert.equal(result.value.activationSupported, false); assert.equal(result.value.newPublicationAuthorized, false);
      const selected = JSON.parse(readFileSync(result.value.previous.path, 'utf8'));
      assert.deepEqual(Object.keys(selected.owners), ['main']); assert.equal(selected.owners.main.versionId, s.f.versions.candidate.id);
      assert.equal(Object.keys(JSON.parse(readFileSync(next.value.previous.path, 'utf8')).owners).length, 5);
      const checked = await publication.verifyUnifiedPublication(path.dirname(result.value.publication.path), result.value.publication.pin);
      assert.equal(checked.receipt.preview, true); assert.equal(checked.receipt.owners.main.runtimeModuleSHA256, digest(s.f.moduleCode.candidate));
      assert(s.localWorkerReads >= 190, 'Both real Worker directions must serve the complete consumer and static set');
    } else {
      const pattern = { 'missing-A': /every new A/, 'wrong-build-path': /build\.json/, 'expired-handoff': /expired/,
        'local-http': /Edited value missing/, 'final-executor': /unverified source edits/,
        'frozen-source': /Frozen source files changed/, 'active-source': /Active source bytes changed/,
        artifact: /Owner artifact changed/, 'build-state': /Partial or failed owner build/,
        'response-body': /Consumer body changed/, expectations: /Build evidence changed/,
        'build-pin': /Build evidence changed/, manifest: /Frozen manifest changed/,
        'worker-body': /Edited value missing/, 'worker-syntax': /Loopback Worker exited/ }[fault];
      await assert.rejects(source.prepareUnifiedNextPublication(input), pattern);
      assert(!existsSync(path.join(s.output, 'next-publication.json')));
      if (['local-http', 'final-executor', 'worker-body', 'worker-syntax'].includes(fault)) {
        assert(existsSync(path.join(s.output, 'failure.json')));
        s.failFinalExecutor = false;
        await assert.rejects(source.prepareUnifiedNextPublication(input), /EEXIST/);
      } else assert(!existsSync(s.output));
    }
    assert.equal(s.writes, 0);
  });
}

test('fixed recovery captures request pins before asynchronous executor verification', async t => {
  const s = await fixture(t), request = stopped(s), original = structuredClone(request);
  const input = { request, cloudToken: 'isolated-cloud-token' };
  s.onExecutor = () => { request.history.pin = 'f'.repeat(64); request.network.pin = 'f'.repeat(64); input.cloudToken = 'changed-token'; };
  const result = await recovery.openUnifiedRecovery(input);
  assert.deepEqual(result.request, original); await result.verify(); await result.revalidateModule('recovery'); assert.equal(s.writes, 0);
});

for (const fault of ['none', 'unknown-main', 'already-recovered', 'other-service', 'immutable-version', 'module', 'journal', 'history', 'ci']) {
  test(`fixed recovery audit reopens stopped history and constrained topology: ${fault}`, async t => {
    const s = await fixture(t), request = stopped(s);
    if (fault === 'unknown-main') s.s.current.services.gachia.versions[0].version_id = sourceFixtureUUID(888);
    if (fault === 'already-recovered') s.s.current.services.gachia.versions[0].version_id = s.f.versions.recovery.id;
    if (fault === 'other-service') s.s.current.services['gachia-game-nte'].id = sourceFixtureUUID(888);
    if (fault === 'immutable-version') s.changedVersion = s.f.versions.recovery.id;
    if (fault === 'module') writeFileSync(s.f.input.previews.receipt.accepted.recovery.main.moduleProof.path, '{}');
    if (fault === 'journal') writeFileSync(request.promotionJournal.path, '{}\n');
    if (fault === 'history') s.failHistory = true;
    if (fault === 'ci') s.skippedCI = 5;
    const input = { request, cloudToken: 'isolated-cloud-token' };
    if (fault === 'none') { const result = await recovery.openUnifiedRecovery(input); await result.verify(); assert.equal(s.versionReads, 14); }
    else await assert.rejects(recovery.openUnifiedRecovery(input));
    assert.equal(s.writes, 0); assert.equal(s.networkOpened, 0);
  });
}

for (const fault of ['none', 'caller-mutation', 'authorization', 'preview', 'lost-response', 'public']) test(`private fixed recovery writer composes real evidence without retry: ${fault}`, async t => {
  const s = await fixture(t), request = stopped(s), original = readFileSync(request.promotionJournal.path);
  if (fault === 'preview') s.failPreview = true;
  if (fault === 'lost-response') s.loseWriteResponse = true;
  if (fault === 'public') s.failPublic = true;
  const input = { request, cloudToken: 'isolated-cloud-token', releaseKey: fault === 'authorization' ? 'f'.repeat(64) : s.f.input.value.releaseKey };
  const originalInput = structuredClone(input), success = ['none', 'caller-mutation'].includes(fault);
  if (fault === 'caller-mutation') s.onExecutor = () => {
    input.cloudToken = 'changed-token'; input.releaseKey = 'f'.repeat(64);
    input.request.history.pin = 'f'.repeat(64); input.request.promotionJournal.pin = 'f'.repeat(64);
  };
  if (success) {
    const result = await recovery.recoverUnifiedMain(input);
    assert.equal(result.status, 'recovery_accepted'); assert.equal(result.sourceAdvanced, false);
    assert.deepEqual(result.request, originalInput.request);
  }
  else await assert.rejects(recovery.recoverUnifiedMain(input));
  assert.equal(s.writes, success || ['lost-response', 'public'].includes(fault) ? 1 : 0);
  assert.equal(s.networkOpened, s.networkClosed); assert.deepEqual(readFileSync(request.promotionJournal.path), original);
  if (s.writes) {
    const file = path.join(s.f.input.run, `unified-manual-recovery-${s.f.input.value.transportPin}.jsonl`), rows = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(rows.at(-1).phase, success ? 'recovery_accepted' : 'read_only_reconciliation');
    s.s.current.services.gachia = { id: s.f.deploymentId, versions: [{ version_id: s.f.versions.candidate.id, percentage: 100 }] };
    s.onExecutor = undefined;
    const count = s.writes; await assert.rejects(recovery.recoverUnifiedMain(originalInput), /Existing recovery requires read-only reconciliation/); assert.equal(s.writes, count);
  }
});

assert.equal(registeredTests, 134, 'Update both complete shard counts when adding a fixed-adapter case');

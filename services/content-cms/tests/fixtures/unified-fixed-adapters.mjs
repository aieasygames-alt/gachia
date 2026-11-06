import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import test, { mock } from 'node:test';
import { unifiedSourceFixture, sourceFixtureUUID } from '../../../../scripts/fixtures/unified-source-fixture.mjs';
import { unifiedMainFixture } from '../../../../scripts/fixtures/unified-main-fixture.mjs';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';
import { unifiedMainPublicReferences } from '../../../../scripts/unified-main-public.mjs';

// Only this child process replaces external trust boundaries. Completed receipt,
// module, renewal, public, source and local-publication readers remain real.
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

const cloud = await import(script('desktop-cloud-release'));
mock.module(script('desktop-cloud-release'), { namedExports: { ...cloud, desktopCloudSnapshot: async (token, _read, options) => {
  assert.equal(token, 'isolated-cloud-token'); state.snapshots++; state.onSnapshot?.(options);
  return structuredClone(state.s.current);
} } });

const build = await import(src('unified-owner-build'));
mock.module(src('unified-owner-build'), { namedExports: { ...build, verifyUnifiedOwnerBuild: (directory, pin) => {
  assert.equal(directory, state.built.directory); assert.equal(pin, state.built.buildPin);
  state.buildReads++; return structuredClone(state.built);
} } });

const production = await import(src('unified-production'));
mock.module(src('unified-production'), { namedExports: { ...production, createUnifiedExecutorVerifier: async (runID, token) => {
  state.onExecutor?.();
  const executorCI = await production.verifyUnifiedCI(runID, state.executorCI.commit, token);
  return { executorCI, verify: () => {
    state.executorChecks++;
    if (state.failFinalExecutor && state.output && ['source-index.json', 'source-handoff.json', 'publication/publication.json']
      .some(file => existsSync(path.join(state.output, file)))) throw Error('Isolated final executor changed');
  } };
} } });

const historical = await import(src('unified-historical-publication'));
mock.module(src('unified-historical-publication'), { namedExports: { ...historical,
  verifyUnifiedHistoricalPublication: async (request, token) => {
    assert.deepEqual(request, state.historyRequest); state.historyReads++;
    if (state.failHistory) throw Error('Isolated historical source rejected');
    const sourceCI = await production.verifyUnifiedCI(state.historical.sourceCI.runID, state.historical.sourceCI.commit, token);
    const originExecutorCI = await production.verifyUnifiedCI(state.historical.originExecutorCI.runID, state.historical.originExecutorCI.commit, token);
    return { ...state.historical, sourceCI, originExecutorCI };
  },
  readUnifiedHistoricalMainPreviews: async (_historical, proof) => {
    assert.deepEqual(proof, state.previewsProof);
    return { previews: state.f.input.previews, references: state.f.input.references, runtimeConfig: state.f.config,
      publicReferences: role => unifiedMainPublicReferences(state.f.input.references('main', role), (_, i) => state.f.roleBodies[role].bodies[i]) };
  },
} });

// Use real loopback HTTP and the existing local-publication test seam, without
// requiring real OpenNext bundles for these synthetic, preview-only artifacts.
const serve = async (_cwd, configPath, _home, _log, accept) => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const server = createServer((request, response) => {
    const url = request.url, file = path.join(config.assets.directory, url);
    let body, mime = 'text/html', status = 200;
    if (url === '/sitemap.xml') { body = '<urlset />'; mime = 'application/xml'; }
    else if (url === '/robots.txt') { body = 'User-agent: *\n'; mime = 'text/plain'; }
    else if (url.startsWith('/api/')) { body = '{"code":"ACCOUNT_FEATURES_DISABLED"}'; mime = 'application/json'; status = 404; }
    else if (existsSync(file)) { body = readFileSync(file); mime = url.endsWith('.js') ? 'application/javascript' : 'application/json'; }
    else body = `<main>${config.name.includes('recovery') ? 'published editorial increment' : 'next editorial'}</main>`;
    response.writeHead(status, { 'content-type': mime }); response.end(body);
  });
  server.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`; state.localOrigins.add(origin);
  try { await accept(origin); }
  finally { state.localOrigins.delete(origin); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
};
const publication = await import(src('unified-publication'));
mock.module(src('unified-publication'), { namedExports: { ...publication,
  prepareUnifiedPublication: input => publication.prepareUnifiedPublication(input, { serve: state.failLocalHTTP ? async () => { throw Error('Isolated local HTTP failed'); } : serve }),
} });

const previewNetwork = await import(script('unified-preview-network'));
mock.module(script('unified-preview-network'), { namedExports: { ...previewNetwork, createUnifiedPreviewNetwork: async server => {
  assert.equal(server, 'http://127.0.0.1:7890'); state.networkOpened++;
  return { route: { kind: 'isolated_loopback_preview' }, request: async (url, options) => {
    assert.equal(options.method, 'GET'); state.previewReads++;
    if (state.failPreview) throw Error('Isolated preview failed');
    const i = state.f.paths.indexOf(new URL(url).pathname), role = 'recovery'; assert(i >= 0);
    const row = state.f.roleBodies[role].rows[i], body = new URL(url).pathname === '/robots.txt' ? 'User-agent: *\nDisallow: /\n' : state.f.roleBodies[role].bodies[i];
    return new Response(body, { status: row.status, headers: { ...row.headers, 'x-robots-tag': 'noindex' } });
  }, close: async () => { state.networkClosed++; } };
} } });

// Access the private writer for qualification only; production exports and CLI
// stay audit-only. No body or production request grammar is changed by the hook.
const hook = registerHooks({ load(url, context, next) {
  const result = next(url, context);
  return url === src('unified-recovery') ? { ...result, source: Buffer.from(result.source).toString() + '\nexport { recoverUnifiedMain };\n' } : result;
} });
const source = await import(src('unified-source-advance'));
const recovery = await import(src('unified-recovery'));
hook.deregister();

const steps = ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
  'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds',
  'Test documentation and verification scope gates'];
mock.method(globalThis, 'fetch', async (input, options) => {
  const url = new URL(input), s = state; assert(s, 'No network without an active isolated fixture');
  if (s.localOrigins.has(url.origin)) { assert.equal(options.method, 'GET'); return realFetch(input, options); }
  const ci = url.hostname === 'api.github.com' && url.pathname.match(/\/actions\/runs\/(\d+)(\/jobs)?$/);
  if (ci) {
    assert.equal(options.method, 'GET'); assert.equal(new Headers(options.headers).get('authorization'), 'Bearer isolated-github-token');
    const runID = Number(ci[1]); s.ciReads.push(runID);
    if (ci[2]) return Response.json({ total_count: 1, jobs: [{ conclusion: 'success', steps: steps.map(name => ({ name,
      conclusion: s.skippedCI === runID && name === steps[3] ? 'skipped' : 'success' })) }] });
    return Response.json({ repository: { full_name: 'aieasygames-alt/gachia' }, id: runID, path: '.github/workflows/payload-verify.yml',
      head_branch: 'codex/payload-unified-maintenance', head_sha: String(runID).repeat(40), status: 'completed', conclusion: 'success', run_attempt: 1 });
  }
  if (url.hostname === 'api.cloudflare.com') {
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer isolated-cloud-token');
    const version = url.pathname.match(/\/scripts\/([^/]+)\/versions\/([^/]+)$/);
    if (version) {
      assert.equal(options.method, 'GET'); s.versionReads++;
      const row = s.versions.get(version[1] + '/' + version[2]); assert(row, 'Unexpected immutable version');
      return Response.json({ success: true, result: s.changedVersion === version[2] ? { ...row, number: row.number + 1 } : row });
    }
    assert(url.pathname.includes('/scripts/gachia/deployments'), 'Only the Main deployment endpoint may be written');
    const id = s.recoveryDeployment, allocation = [{ version_id: s.f.versions.recovery.id, percentage: 100 }];
    if (options.method === 'POST') {
      assert.deepEqual(JSON.parse(options.body), { strategy: 'percentage', versions: allocation }); s.writes++;
      s.s.current.services.gachia = { id, versions: allocation };
      if (s.loseWriteResponse) throw Error('Isolated response lost after activation');
    } else { assert.equal(options.method, 'GET'); assert(url.pathname.endsWith('/' + id)); }
    return Response.json({ success: true, result: { id, strategy: 'percentage', versions: allocation } });
  }
  assert.equal(url.hostname, 'gachia.com'); assert.equal(options.method, 'GET'); s.publicReads++;
  if (s.failPublic) throw Error('Isolated public HTTP failed');
  const role = s.writes ? 'recovery' : 'candidate', i = s.f.paths.indexOf(url.pathname); assert(i >= 0);
  const row = s.f.roleBodies[role].rows[i], bytes = s.f.roleBodies[role].bodies[i];
  const prefix = readFileSync(new URL('../../../../scripts/fixtures/cloudflare-robots-prefix-2026-11-01.txt', import.meta.url));
  return new Response(url.pathname === '/robots.txt' ? Buffer.concat([prefix, bytes]) : bytes, { status: row.status, headers: row.headers });
});

async function fixture(t) {
  const s = await unifiedSourceFixture(t, { originalMain: true }), f = await unifiedMainFixture(t, s.spec.baseline, s);
  const originalOwners = structuredClone(s.spec.owners), versions = new Map(Object.values(originalOwners).map(row => [row.service + '/' + row.versionId, row.version]));
  for (const version of Object.values(f.versions)) versions.set('gachia/' + version.id, version);
  const buildDirectory = f.input.run, publicationDirectory = path.join(s.root, 'publication');
  mkdirSync(path.join(publicationDirectory, 'main'), { recursive: true });
  cpSync(originalOwners.main.directory, path.join(publicationDirectory, 'main/candidate'), { recursive: true });
  mkdirSync(path.join(buildDirectory, 'source/packages/data'), { recursive: true });
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
  s.current = structuredClone(s.spec.baseline); s.current.services.gachia = { id: f.deploymentId, versions: [{ version_id: f.versions.candidate.id, percentage: 100 }] };
  state = { s, f, versions, publishedProof, publishedRequest, historyMain, historyRequest, previewsProof, executorCI: ci(5), recoveryDeployment: sourceFixtureUUID(999),
    historical: { request: { production: f.input.productionRequest }, sources: { owners: old, handoff: { owners: originalOwners, transportPin: s.spec.transportPin } }, value: f.input.value,
      plan: { sources: s.spec.sources, planSHA256: s.spec.planSHA256 }, build: buildDirectory, sealedSources: s.spec.sources,
      transport: { receipt: { publicationDirectory } }, publication: { owners: { main: { candidate: { artifactSHA256: originalOwners.main.artifactSHA256 } } } },
      sourceCI: f.input.sourceCI, originExecutorCI: f.input.originExecutorCI },
    credentialReads: 0, snapshots: 0, versionReads: 0, publicReads: 0, ciReads: [], historyReads: 0, executorChecks: 0, writes: 0, localOrigins: new Set(),
    buildReads: 0, networkOpened: 0, networkClosed: 0, previewReads: 0 };
  return state;
}

async function advance(s, kind = 'advance', index) {
  const request = { schemaVersion: 1, kind: kind === 'advance' ? 'unified_source_advance_request' : 'unified_next_source_request',
    publication: s.publishedProof, executorRunID: 5, ...(index ? { sourceIndex: index } : {}) };
  s.output = path.join(s.s.root, kind);
  return source.advanceUnifiedPublishedSources({ request, directory: s.output, cloudToken: 'isolated-cloud-token' });
}

function nextBuild(s, next) {
  const directory = path.join(s.s.root, 'next-build'), write = (file, bytes) => {
    mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes); return digest(bytes);
  };
  const sources = JSON.parse(readFileSync(next.value.active.path, 'utf8'));
  const candidate = path.join(directory, 'artifacts/main'); mkdirSync(path.dirname(candidate), { recursive: true });
  const previous = JSON.parse(readFileSync(next.value.previous.path, 'utf8'));
  cpSync(previous.owners.main.directory, candidate, { recursive: true });
  write(path.join(candidate, 'worker.js'), 'next candidate runtime');
  write(path.join(candidate, 'assets/_next/static/next.js'), 'next static');
  const config = { name: 'gachia', compatibility_date: s.f.config.compatibility_date, compatibility_flags: s.f.config.compatibility_flags };
  write(path.join(directory, 'source/apps/web/wrangler.jsonc'), JSON.stringify(config));
  write(path.join(directory, 'source/packages/data/raw-content-review.json'), JSON.stringify({ pairs: s.s.spec.pairs }));
  const expectations = [{ owner: 'main', path: '/zh/ananta/guides/download-install-guide', status: 200, contains: ['next editorial'] }];
  const save = (name, value) => { const file = path.join(directory, name), text = JSON.stringify(value, null, 2) + '\n'; return { path: file, pin: write(file, text) }; };
  save('active.json', sources); save('consumer-expectations.json', expectations);
  save('files.json', s.s.spec.pairs.map(pair => ({ path: 'apps/web/public/data/' + pair, sha256: digest(readFileSync(path.join(candidate, 'assets/data', pair))) })));
  const proof = save('build.json', { kind: 'isolated_verified_build_boundary', preview: true });
  s.built = { directory, buildPin: proof.pin, receipt: { candidateSHA256: 'b'.repeat(64), preview: true },
    frozen: { planSHA256: s.s.spec.planSHA256, owners: ['main'], candidate: { baselines: sources.map(row => ({ sourcePath: row.sourcePath, activeSHA256: row.sha256 })) } } };
  const baseline = save('baseline-expectations.json', [{ ...expectations[0], contains: ['published editorial increment'] }]);
  return { schemaVersion: 1, kind: 'unified_next_publication_request', publication: s.publishedProof, handoff: next.proof,
    build: proof, expectations: baseline, executorRunID: 5 };
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
  assert.equal(readFileSync(path.join(opened.value.owners.main.directory, 'worker.js'), 'utf8'), 'sealed candidate');
  for (const owner of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) assert.equal(opened.value.owners[owner].directory, s.s.spec.owners[owner].directory);
  const next = await advance(s, 'baseline', advanced.proof);
  const consumed = await source.verifyUnifiedNextSource({ publication: s.publishedProof, handoff: next.proof, githubToken: 'isolated-github-token' });
  assert.equal(consumed.sources.length, 115); assert.equal(s.versionReads, 20); assert.equal(s.snapshots, 4);
  assert.equal(s.publicReads, s.f.paths.length * 2); assert.equal(s.writes, 0);
  for (const runID of [1, 2, 3, 4, 5]) assert(s.ciReads.includes(runID));
  for (const result of [advanced, next]) { assert.equal(result.cloudWrites, false); assert.equal(result.newPublicationAuthorized, false); }
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

for (const kind of ['advance', 'baseline']) test(`fixed ${kind} invalidates protocol success when final executor verification fails`, async t => {
  const s = await fixture(t), index = kind === 'baseline' ? await advance(s) : undefined;
  s.failFinalExecutor = true;
  await assert.rejects(advance(s, kind, index?.proof), /final executor changed/);
  const name = kind === 'advance' ? 'source-index.json' : 'source-handoff.json', file = path.join(s.output, name);
  assert(existsSync(file)); assert(existsSync(path.join(s.output, 'failure.json')));
  const input = { publication: s.publishedProof, githubToken: 'isolated-github-token' }, proof = { path: file, pin: digest(readFileSync(file)) };
  await assert.rejects(kind === 'advance' ? source.verifyUnifiedPublishedSource({ ...input, sourceIndex: proof }) : source.verifyUnifiedNextSource({ ...input, handoff: proof }), /Failed/);
  s.failFinalExecutor = false; await assert.rejects(advance(s, kind, index?.proof), /EEXIST/); assert.equal(s.writes, 0);
});

test('fixed source request cannot change its pinned publication during asynchronous verification', async t => {
  const s = await fixture(t), request = { schemaVersion: 1, kind: 'unified_source_advance_request', publication: { ...s.publishedProof }, executorRunID: 5 };
  s.onExecutor = () => { request.publication.pin = 'f'.repeat(64); };
  const result = await source.advanceUnifiedPublishedSources({ request, directory: path.join(s.s.root, 'immutable-request'), cloudToken: 'isolated-cloud-token' });
  assert.deepEqual(result.value.publication, s.publishedProof); assert.equal(s.writes, 0);
});

for (const fault of ['none', 'missing-A', 'wrong-build-path', 'expired-handoff', 'local-http', 'final-executor', 'request-mutation']) {
  test(`fixed next preparation consumes the fresh complete baseline and real local publication: ${fault}`, async t => {
    const s = await fixture(t), index = await advance(s), next = await advance(s, 'baseline', index.proof), request = nextBuild(s, next);
    if (fault === 'missing-A') s.built.frozen.candidate.baselines.pop();
    if (fault === 'wrong-build-path') request.build.path = path.join(s.built.directory, 'other.json');
    if (fault === 'expired-handoff') { const now = Date.now(); t.mock.method(Date, 'now', () => now + 900001); }
    if (fault === 'local-http') s.failLocalHTTP = true;
    if (fault === 'final-executor') s.failFinalExecutor = true;
    const original = structuredClone(request);
    if (fault === 'request-mutation') s.onExecutor = () => { request.handoff.pin = 'f'.repeat(64); request.expectations.pin = 'f'.repeat(64); };
    s.output = path.join(s.s.root, 'next-preparation');
    const input = { request, directory: s.output };
    if (['none', 'request-mutation'].includes(fault)) {
      const result = await source.prepareUnifiedNextPublication(input);
      assert.deepEqual(result.value.request, original); assert.deepEqual(result.value.sourceIndex, index.proof);
      assert.equal(result.value.activationSupported, false); assert.equal(result.value.newPublicationAuthorized, false);
      const selected = JSON.parse(readFileSync(result.value.previous.path, 'utf8'));
      assert.deepEqual(Object.keys(selected.owners), ['main']); assert.equal(selected.owners.main.versionId, s.f.versions.candidate.id);
      assert.equal(Object.keys(JSON.parse(readFileSync(next.value.previous.path, 'utf8')).owners).length, 5);
      const checked = await publication.verifyUnifiedPublication(path.dirname(result.value.publication.path), result.value.publication.pin);
      assert.equal(checked.receipt.preview, true); assert.equal(checked.receipt.owners.main.runtimeModuleSHA256, digest('sealed candidate'));
    } else {
      const pattern = { 'missing-A': /every new A/, 'wrong-build-path': /build\.json/, 'expired-handoff': /expired/,
        'local-http': /local HTTP failed/, 'final-executor': /final executor changed/ }[fault];
      await assert.rejects(source.prepareUnifiedNextPublication(input), pattern);
      assert(!existsSync(path.join(s.output, 'next-publication.json')));
      if (['local-http', 'final-executor'].includes(fault)) {
        assert(existsSync(path.join(s.output, 'failure.json')));
        s.failLocalHTTP = false; s.failFinalExecutor = false;
        await assert.rejects(source.prepareUnifiedNextPublication(input), /EEXIST/);
      } else assert(!existsSync(s.output));
    }
    assert.equal(s.writes, 0);
  });
}

test('fixed recovery captures request pins before asynchronous executor verification', async t => {
  const s = await fixture(t), request = stopped(s), original = structuredClone(request);
  s.onExecutor = () => { request.history.pin = 'f'.repeat(64); request.network.pin = 'f'.repeat(64); };
  const result = await recovery.openUnifiedRecovery({ request, cloudToken: 'isolated-cloud-token' });
  assert.deepEqual(result.request, original); await result.verify(); assert.equal(s.writes, 0);
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

for (const fault of ['none', 'authorization', 'preview', 'lost-response', 'public']) test(`private fixed recovery writer composes real evidence without retry: ${fault}`, async t => {
  const s = await fixture(t), request = stopped(s), original = readFileSync(request.promotionJournal.path);
  if (fault === 'preview') s.failPreview = true;
  if (fault === 'lost-response') s.loseWriteResponse = true;
  if (fault === 'public') s.failPublic = true;
  const input = { request, cloudToken: 'isolated-cloud-token', releaseKey: fault === 'authorization' ? 'f'.repeat(64) : s.f.input.value.releaseKey };
  if (fault === 'none') { const result = await recovery.recoverUnifiedMain(input); assert.equal(result.status, 'recovery_accepted'); assert.equal(result.sourceAdvanced, false); }
  else await assert.rejects(recovery.recoverUnifiedMain(input));
  assert.equal(s.writes, ['none', 'lost-response', 'public'].includes(fault) ? 1 : 0);
  assert.equal(s.networkOpened, s.networkClosed); assert.deepEqual(readFileSync(request.promotionJournal.path), original);
  if (s.writes) {
    const file = path.join(s.f.input.run, `unified-manual-recovery-${s.f.input.value.transportPin}.jsonl`), rows = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(rows.at(-1).phase, fault === 'none' ? 'recovery_accepted' : 'read_only_reconciliation');
    s.s.current.services.gachia = { id: s.f.deploymentId, versions: [{ version_id: s.f.versions.candidate.id, percentage: 100 }] };
    const count = s.writes; await assert.rejects(recovery.recoverUnifiedMain(input), /Existing recovery requires read-only reconciliation/); assert.equal(s.writes, count);
  }
});

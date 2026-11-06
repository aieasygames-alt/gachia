import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { mock } from 'node:test';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';
import { SERVICES } from '../../../../scripts/desktop-cloud-release.mjs';
import { readPinnedUnifiedInput } from '../../src/unified-desktop.ts';

const file = process.env.UNIFIED_SEALED_PROMOTION_HISTORY;
const pin = process.env.UNIFIED_SEALED_PROMOTION_PIN;
const networkPath = process.env.UNIFIED_SEALED_PROMOTION_NETWORK;
assert(file && path.isAbsolute(file) && /^[a-f0-9]{64}$/.test(pin ?? '') && networkPath && path.isAbsolute(networkPath),
  'Require explicit UNIFIED_SEALED_PROMOTION_HISTORY, UNIFIED_SEALED_PROMOTION_PIN and UNIFIED_SEALED_PROMOTION_NETWORK');

const src = name => new URL(`../../src/${name}.ts`, import.meta.url).href;
const originalExec = childProcess.execFileSync;
let executorRepo, executorChecks = 0, credentialReads = 0;
mock.method(childProcess, 'execFileSync', (command, args, ...rest) => {
  if (command !== 'gh') return originalExec(command, args, ...rest);
  assert.deepEqual(args, ['auth', 'token', '--hostname', 'github.com']); credentialReads++;
  return 'isolated-github-token';
});
syncBuiltinESMExports();
const production = await import(src('unified-production'));
// Redirect only desktop checkout selection. Local preflight and every evidence reader remain real.
mock.module(src('unified-production'), { namedExports: { ...production,
  createUnifiedExecutorVerifier: async (runID, token) => {
    const checked = await production.verifyUnifiedExecutorCheckout(executorRepo, runID, token);
    return { ...checked, verify: () => { executorChecks++; checked.verify(); } };
  },
} });
const { unifiedHistoricalMainRequest } = await import(src('unified-published-main'));
const { readUnifiedHistoricalPublication, unifiedHistoricalPublicationRequest } = await import(src('unified-historical-publication'));
const { openUnifiedPromotion } = await import(src('unified-promotion'));
const steps = ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
  'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds',
  'Test documentation and verification scope gates'];

test('sealed promotion composes real local, historical, source and preview readers', async t => {
  let respond;
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.equal(options?.method, 'GET', 'All network writes forbidden');
    assert.equal(options?.redirect, 'error');
    assert(respond, 'Historical bootstrap must be offline');
    calls.push(String(input));
    return respond(new URL(String(input)), options);
  });
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-sealed-promotion-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  executorRepo = path.join(root, 'executor'); mkdirSync(path.join(executorRepo, 'scripts'), { recursive: true });
  const executorFile = path.join(executorRepo, 'scripts/executor.mjs');
  writeFileSync(executorFile, 'export const isolated = true\n');
  const git = (...args) => originalExec('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: executorRepo, encoding: 'utf8' }).trim();
  git('init', '--quiet'); git('add', '.'); git('commit', '--quiet', '-m', 'isolated executor');
  const executorCommit = git('rev-parse', 'HEAD'), executorRunID = 987654321;
  const main = unifiedHistoricalMainRequest(readPinnedUnifiedInput(file, pin));
  const history = unifiedHistoricalPublicationRequest(readPinnedUnifiedInput(main.history.path, main.history.pin));
  console.log('Reopening real sealed history for isolated network responses');
  const sealed = await readUnifiedHistoricalPublication(history);
  assert.equal(calls.length, 0);
  const previews = readPinnedUnifiedInput(main.previews.path, main.previews.pin);
  const network = { path: networkPath, pin: previews.networkPin };
  readPinnedUnifiedInput(network.path, network.pin);
  const originals = [file, main.history.path, history.production.path, history.audit.path, main.previews.path,
    network.path, sealed.production.application.path, sealed.production.editorial.path];
  const originalPins = originals.map(name => digest(readFileSync(name)));
  const documents = sealed.review.records.map((record, index) => ({ ...structuredClone(record),
    id: sealed.review.reviews[index].id, updatedAt: sealed.review.reviews[index].updatedAt, game: index + 1 }));
  const versions = new Map(Object.values(sealed.sources.owners).map(row => [`${row.service}/${row.versionId}`, row.version]));
  for (const role of ['recovery', 'candidate']) {
    const accepted = previews.accepted[role].main;
    const receipt = readPinnedUnifiedInput(accepted.moduleProof.path, accepted.moduleProof.pin);
    versions.set(`gachia/${accepted.versionId}`, readPinnedUnifiedInput(receipt.before.path, receipt.before.pin));
  }
  const ci = new Map([sealed.audit.sourceCI, sealed.audit.executorCI,
    { runID: executorRunID, commit: executorCommit, runAttempt: 1 }].map(row => [row.runID, row]));
  const baseline = sealed.value.baseline;
  let cmsReads = 0, changedVersion;
  const input = { request: { schemaVersion: 1, kind: 'unified_main_promotion_request', production: structuredClone(history.production),
    audit: structuredClone(history.audit), previews: structuredClone(main.previews), network, executorRunID },
    cmsToken: 'isolated-cms-token', cloudToken: 'isolated-cloud-token' };
  const originalRequest = structuredClone(input.request);
  respond = (url, options) => {
    const auth = new Headers(options.headers).get('authorization');
    if (url.origin === 'http://127.0.0.1:3100') {
      assert.equal(auth, 'JWT isolated-cms-token');
      if (url.pathname === '/api/users/me') { cmsReads++; return Response.json({ user: { role: 'reviewer' } }); }
      if (url.pathname === '/api/content-records') {
        for (const [key, value] of Object.entries({ draft: 'false', locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '2' })) assert.equal(url.searchParams.get(key), value);
        const doc = documents.find(row => row.stableKey === url.searchParams.get('where[stableKey][equals]')); assert(doc);
        return Response.json({ totalDocs: 1, docs: [doc], hasNextPage: false });
      }
      const doc = documents.find(row => url.pathname === `/api/games/${row.game}`); assert(doc, 'Unexpected CMS path');
      return Response.json({ id: doc.game, key: doc.sourceRecord.game });
    }
    if (url.origin === 'https://api.github.com') {
      assert.equal(auth, 'Bearer isolated-github-token');
      const match = url.pathname.match(/^\/repos\/aieasygames-alt\/gachia\/actions\/runs\/(\d+)(\/jobs)?$/); assert(match);
      const run = ci.get(Number(match[1])); assert(run, 'Unexpected CI run');
      if (match[2]) return Response.json({ total_count: 1, jobs: [{ conclusion: 'success', steps: steps.map(name => ({ name, conclusion: 'success' })) }] });
      // Mutation during the first await must not alter any later pinned request or credential.
      input.request.production.pin = '0'.repeat(64); input.cmsToken = 'changed'; input.cloudToken = 'changed';
      return Response.json({ repository: { full_name: 'aieasygames-alt/gachia' }, id: run.runID,
        path: '.github/workflows/payload-verify.yml', head_branch: 'codex/payload-unified-maintenance', head_sha: run.commit,
        status: 'completed', conclusion: 'success', run_attempt: run.runAttempt });
    }
    assert.equal(url.origin, 'https://api.cloudflare.com', 'Unexpected network destination');
    assert.equal(auth, 'Bearer isolated-cloud-token');
    const base = '/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers';
    const servicePath = url.pathname.match(/^\/client\/v4\/accounts\/e6472b6c6172a3ac1e1596ef100543ae\/workers\/scripts\/([^/]+)\/(deployments|settings|subdomain|versions\/[^/]+)$/);
    let result;
    if (servicePath) {
      const [, service, kind] = servicePath; assert(SERVICES.includes(service));
      if (kind.startsWith('versions/')) {
        const key = `${service}/${kind.slice('versions/'.length)}`, value = versions.get(key); assert(value, 'Unexpected immutable version');
        result = key === changedVersion ? { ...value, number: value.number + 1 } : value;
      } else result = kind === 'deployments' ? { deployments: [baseline.services[service]] }
        : kind === 'settings' ? baseline.settings[service] : baseline.subdomains[service];
    } else if (url.pathname === base + '/scripts') result = baseline.scripts.map(id => ({ id }));
    else if (url.pathname === base + '/domains') result = baseline.domains;
    else {
      assert.equal(url.pathname, '/client/v4/zones/9ebfe7f1aeb7225947a1fc50c0deffc8/workers/routes'); result = baseline.routes;
    }
    return Response.json({ success: true, result });
  };
  console.log('Opening promotion through complete real local and historical verification');
  const opened = await openUnifiedPromotion(input);
  await t.test('real composition preserves sealed release identity and closes preservation owners', () => {
    assert.deepEqual(opened.request, originalRequest);
    assert.deepEqual(opened.evidence.scope, sealed.scope);
    assert.deepEqual(opened.evidence.scope.uploadOwners, ['main']);
    assert.deepEqual(Object.keys(opened.evidence.value.preservedOwners).sort(), ['genshin', 'nte']);
    assert.equal(opened.evidence.value.releaseKey, sealed.value.releaseKey);
    assert.equal(opened.historical.plan.sources.length, 115);
    assert.deepEqual(opened.evidence.ci, sealed.audit.sourceCI);
    assert.deepEqual(opened.evidence.originExecutorCI, sealed.audit.executorCI);
    assert.equal(opened.evidence.executorCI.commit, executorCommit);
    assert.equal(cmsReads, 4); assert(executorChecks >= 3); assert.equal(credentialReads, 1);
  });
  await t.test('both real uploaded modules revalidate using the captured credential', async () => {
    for (const role of ['recovery', 'candidate']) await opened.revalidateModule(role, previews.accepted[role].main);
  });
  await t.test('changed immutable candidate is rejected without writes', async () => {
    changedVersion = `gachia/${previews.accepted.candidate.main.versionId}`;
    await assert.rejects(opened.revalidateModule('candidate', previews.accepted.candidate.main), error => error.code === 'ERR_ASSERTION');
    changedVersion = undefined;
  });
  const { qualifySealedRenewal } = await import('./unified-sealed-renewal.mjs');
  await qualifySealedRenewal(t, opened, root);
  await t.test('executor drift stops the final verifier before more CMS or cloud reads', async () => {
    const count = calls.length;
    writeFileSync(executorFile, 'changed after opening\n');
    await assert.rejects(opened.evidence.verify(), /unverified source edits/);
    assert.equal(calls.length, count);
  });
  await t.test('original evidence remains unchanged', () => {
    assert.deepEqual(originals.map(name => digest(readFileSync(name))), originalPins);
  });
  t.diagnostic(JSON.stringify({ sources: 115, cmsReads, executorChecks, requests: calls.length,
    localVerifierReplaced: false, historicalReaderReplaced: false, networkSynthetic: true, productionReady: false }));
});

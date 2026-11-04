import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture as catalogFixture } from './fixtures/desktop-catalog-source.mjs';
import { fixture as candidateFixture } from './fixtures/desktop-published-source.mjs';
import { registerSourceCatalog } from './desktop-source-catalog.mjs';
import { artifactFiles, assertRunLock, verifyBuilt, withRunLock } from './desktop-publish.mjs';
import { digest, retainCandidate, retainCandidateWithLock } from './desktop-release-assets.mjs';
import { prepareEvidence, verifyEvidencePreparation } from './desktop-evidence-preparation.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { writeFileSync(path, json(value)); return digest(json(value)); };
const attempts = run => readdirSync(run).filter(name => /^evidence-preparation-[a-f0-9]{16}$/.test(name)).map(name => join(run, name));
function stageNow(run) {
  const directory = attempts(run).at(-1);
  return directory ? JSON.parse(readFileSync(join(directory, 'stages.jsonl'), 'utf8').trim().split('\n').at(-1)).stage : undefined;
}

async function fixture(t, game = 'genshin', options = {}) {
  const f = await catalogFixture(t, game);
  const content = options.unchanged ? (options.reformatted ? json(JSON.parse(f.published)) : f.published.toString())
    : json([{ id: 'one', title: options.reset ? JSON.parse(f.original)[0].title : 'B', content: 'Candidate B' }]);
  const candidate = await candidateFixture(t, game, { builtOnly: true, original: f.original.toString(), content });
  let config; const calls = [];
  const respond = url => {
    const path = new URL(url).pathname, local = new URL(url).hostname === '127.0.0.1';
    let bytes, mime = 'text/javascript', status = 200, cache = 'public, max-age=0';
    if (path.startsWith('/api/')) { bytes = '{"code":"ACCOUNT_FEATURES_DISABLED"}'; mime = 'application/json'; status = 404; cache = 'no-store'; }
    else if (path.startsWith('/data/')) { bytes = local ? readFileSync(join(config.assets.directory, path)) : f.published; mime = 'application/json'; }
    else if (path === '/sitemap.xml') { bytes = '<urlset/>'; mime = 'application/xml'; }
    else if (path.includes('/_next/static/')) bytes = local ? readFileSync(join(config.assets.directory, path)) : path.endsWith('/new.js') ? 'new static' : 'old static';
    else { bytes = readFileSync(join(f.root, 'old', game, 'assets/guide.html')); mime = 'text/html'; }
    return new Response(bytes, { status, headers: { 'content-type': mime, 'cache-control': cache } });
  };
  const request = async (url, options) => {
    assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    calls.push(url); return respond(url);
  };
  const serve = async (_cwd, path, _home, _log, accept) => { config = JSON.parse(readFileSync(path)); return accept('http://127.0.0.1:12345'); };
  await registerSourceCatalog({ ...f.input, request });
  return { ...f, ...candidate, catalogRoot: f.input.root, calls, respond,
    input: { run: candidate.run, pin: candidate.pin, repo: candidate.repo, root: f.input.root, reader: f.reader, request, serve } };
}

for (const game of ['genshin', 'nte']) test(`${game}: prepares pinned A-not-O recovery for B and revalidates every saved file`, async t => {
  const f = await fixture(t, game), result = await prepareEvidence(f.input);
  const checked = await verifyEvidencePreparation(result.manifestPath, result.manifestPin);
  assert.equal(checked.releaseKey, f.plan.releaseKey); assert.equal(checked.productionReady, false);
  assert.equal(checked.cloudWrites, false); assert.equal(checked.cloudRecoveryAccepted, false);
  assert(checked.pending.includes('preview-retained')); assert(checked.pending.includes('cloud-check'));
  assert.equal(readFileSync(join(result.directory, 'published-baseline/published.body')).toString(), f.published.toString());
  assert.notEqual(digest(f.published), f.plan.sourceSHA256);
  const recovery = JSON.parse(readFileSync(result.recovery.evidencePath));
  assert.equal(recovery.releaseKey, f.plan.releaseKey);
  assert.equal(recovery.retentionPin, result.retention.retentionPin);
  assert.equal(recovery.owners.main.observations.find(row => row.path.startsWith('/data/')).sha256, digest(f.published));
  assert.equal(recovery.owners[game].observations.filter(row => row.path.includes('/guides/')).length, 3);
  assert.equal(recovery.owners.main.auxiliary.length, 1);
  assert(!existsSync(join(f.run, 'operation.lock'))); verifyBuilt(f.run, f.pin);
});

test('actual loopback HTTP persists body/metadata/JSON-LD/sitemap/static/account responses without cloud writes', async t => {
  const f = await fixture(t), server = createServer(async (req, res) => {
    try {
      assert.equal(req.method, 'GET'); const response = f.respond(req.headers['x-original-url']);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { res.writeHead(500); res.end(error.message); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`, seen = [];
  const request = async (url, options) => { seen.push(url); return fetch(origin, { ...options, headers: { 'x-original-url': url } }); };
  const result = await prepareEvidence({ ...f.input, request });
  await verifyEvidencePreparation(result.manifestPath, result.manifestPin);
  assert(seen.some(url => url.endsWith('/api/auth/get-session')));
  for (const path of ['/sitemap.xml', '/zh/genshin/guides/one', '/en/genshin/guides/one', '/ja/genshin/guides/one', '/_next/static/new.js', '/_games/genshin/_next/static/old.js']) {
    assert(seen.some(url => new URL(url).pathname === path), `Missing actual HTTP ${path}`);
  }
  const recovery = JSON.parse(readFileSync(result.recovery.evidencePath));
  const row = recovery.owners.genshin.observations.find(row => row.path.includes('/guides/'));
  const body = readFileSync(join(recovery.directory, row.bodyFile), 'utf8');
  assert.match(body, /<title>A/); assert.match(body, /application\/ld\+json/); assert.match(body, /Published A/);
});

for (const [name, change, expected] of [
  ['plan pin', f => { f.input.pin = '0'.repeat(64); }, /Plan changed/],
  ['build state', f => save(join(f.run, 'state.json'), { status: 'prepared' }), /Both owners/],
  ['artifact bytes', f => writeFileSync(join(f.run, 'artifacts/genshin/worker.js'), 'tampered'), /changed/],
  ['preview candidate', f => { const plan = JSON.parse(readFileSync(join(f.run, 'plan.json'))); plan.preview = true; f.input.pin = save(join(f.run, 'plan.json'), plan); }, /non-preview/],
  ['no changes', f => { const plan = JSON.parse(readFileSync(join(f.run, 'plan.json'))); plan.changed = []; f.input.pin = save(join(f.run, 'plan.json'), plan); }, /Changed guides/],
  ['missing sources', f => rmSync(f.catalogRoot, { recursive: true }), /ENOENT/],
  ['wrong import repo', f => { f.input.repo = f.root; }, /git|Command failed/],
]) test(`rejects ${name}, leaves a failed diagnostic and releases the lock`, async t => {
  const f = await fixture(t); change(f);
  await assert.rejects(prepareEvidence(f.input), expected);
  const dirs = attempts(f.run); assert.equal(dirs.length, 1);
  assert.equal(JSON.parse(readFileSync(join(dirs[0], 'failure.json'))).status, 'failed');
  assert(!existsSync(join(dirs[0], 'manifest.json'))); assert(!existsSync(join(f.run, 'operation.lock')));
});

for (const prefix of ['cloud', 'recovery-cloud', 'promotion', 'manual-recovery']) test(`even an empty ${prefix} write journal blocks preparation before network access`, async t => {
  const f = await fixture(t); writeFileSync(join(f.run, `${prefix}-torn.jsonl`), '');
  let reads = 0;
  await assert.rejects(prepareEvidence({ ...f.input, reader: { snapshot: async () => { reads++; throw Error('network forbidden'); } } }), /cloud-write journal/);
  assert.equal(reads, 0);
});

for (const stage of ['sources', 'assets', 'baseline', 'recovery', 'revalidation']) test(`${stage} failure stops, preserves evidence and does not produce approval`, async t => {
  const f = await fixture(t), originalRequest = f.input.request;
  f.input.request = async (url, options) => {
    if (stageNow(f.run) === stage) throw Error(`injected ${stage} failure`);
    return originalRequest(url, options);
  };
  await assert.rejects(prepareEvidence(f.input), new RegExp(`injected ${stage} failure`));
  const directory = attempts(f.run)[0], failure = JSON.parse(readFileSync(join(directory, 'failure.json')));
  assert.equal(failure.stage, stage); assert(!existsSync(join(directory, 'manifest.json')));
  assert(!existsSync(join(f.run, 'operation.lock')));
});

test('retention immutable collision stops before baseline capture', async t => {
  const f = await fixture(t), artifact = join(f.run, 'artifacts/genshin');
  writeFileSync(join(artifact, 'assets/_next/static/old.js'), 'collision');
  const state = JSON.parse(readFileSync(join(f.run, 'state.json')));
  state.owners.genshin.artifactSHA256 = save(join(f.run, 'genshin-artifact.json'), artifactFiles(artifact)); save(join(f.run, 'state.json'), state);
  await assert.rejects(prepareEvidence(f.input), /collision/);
  const directory = attempts(f.run)[0]; assert.equal(JSON.parse(readFileSync(join(directory, 'failure.json'))).stage, 'retention');
  assert(!existsSync(join(directory, 'published-baseline')));
});

test('candidate equal to current A is not a new publication even when different from O', async t => {
  const f = await fixture(t, 'genshin', { unchanged: true });
  await assert.rejects(prepareEvidence(f.input), /unchanged from current published A/);
  assert.equal(JSON.parse(readFileSync(join(attempts(f.run)[0], 'failure.json'))).stage, 'baseline');
});

test('formatting-only differences from A cannot manufacture a new publication', async t => {
  const f = await fixture(t, 'nte', { unchanged: true, reformatted: true });
  assert.notEqual(f.plan.candidateSHA256, digest(f.published));
  await assert.rejects(prepareEvidence(f.input), /unchanged from current published A/);
});

for (const game of ['genshin', 'nte']) test(`${game}: local preparation refuses same-row implicit title reset even when body genuinely changes`, async t => {
  const f = await fixture(t, game, { reset: true });
  await assert.rejects(prepareEvidence(f.input), /Implicit reset to import O/);
  const directory = attempts(f.run)[0];
  assert.equal(JSON.parse(readFileSync(join(directory, 'failure.json'))).stage, 'baseline');
  assert(!existsSync(join(directory, 'manifest.json')));
  assert(!existsSync(join(f.run, 'operation.lock')));
  assert(!readdirSync(f.run).some(name => name.startsWith('cloud-') || name.startsWith('promotion-')));
});

for (const kind of ['uuid', 'topology', 'cookie', 'static', 'baseline-O', 'module']) test(`rejects ${kind} drift during preparation`, async t => {
  const f = await fixture(t), reader = f.input.reader, request = f.input.request;
  f.input.reader = { ...reader, snapshot: async () => {
    const result = await reader.snapshot();
    if (stageNow(f.run) === 'revalidation') {
      if (kind === 'uuid') result.services.gachia.versions[0].version_id = '00000000-0000-0000-0000-000000000999';
      if (kind === 'topology') result.routes = [{ pattern: 'changed' }];
    }
    return result;
  }, module: async (...args) => {
    const result = await reader.module(...args);
    return kind === 'module' && stageNow(f.run) === 'assets' ? { ...result, moduleSHA256: 'f'.repeat(64) } : result;
  } };
  f.input.request = async (url, options) => {
    const response = await request(url, options);
    if (kind === 'cookie' && stageNow(f.run) === 'assets') response.headers.set('set-cookie', 'session=bad');
    if (kind === 'static' && stageNow(f.run) === 'assets') return new Response('not old static');
    if (kind === 'baseline-O' && stageNow(f.run) === 'baseline') return new Response(f.original, { headers: { 'content-type': 'application/json' } });
    return response;
  };
  await assert.rejects(prepareEvidence(f.input)); assert(!existsSync(join(attempts(f.run)[0], 'manifest.json')));
});

test('failed rerun starts a new attempt and never reuses incomplete results', async t => {
  const f = await fixture(t);
  await assert.rejects(prepareEvidence({ ...f.input, request: async () => { throw Error('temporary network failure'); } }));
  const first = attempts(f.run)[0], failed = readFileSync(join(first, 'failure.json'));
  const result = await prepareEvidence(f.input); assert.notEqual(result.directory, first);
  assert.deepEqual(readFileSync(join(first, 'failure.json')), failed);
  await verifyEvidencePreparation(result.manifestPath, result.manifestPin);
  const second = await prepareEvidence(f.input); assert.notEqual(second.directory, result.directory);
  assert.notEqual(second.retention.id, result.retention.id);
});

for (const file of ['asset-capture/0.body', 'local-recovery/main-2.body', 'source-selection/published.body', 'local-recovery/genshin-baseline-1.body', 'stages.jsonl']) test(`aggregate verifier rejects tampered ${file}`, async t => {
  const f = await fixture(t), result = await prepareEvidence(f.input);
  assert(existsSync(join(result.directory, file))); writeFileSync(join(result.directory, file), 'tampered');
  await assert.rejects(verifyEvidencePreparation(result.manifestPath, result.manifestPin), /changed/);
});

test('aggregate verification revalidates external source and retained dependencies', async t => {
  const f = await fixture(t), result = await prepareEvidence(f.input);
  writeFileSync(join(f.run, 'retained', result.retention.id, 'genshin/.open-next/worker.js'), 'tampered');
  await assert.rejects(verifyEvidencePreparation(result.manifestPath, result.manifestPin), /changed/);
});

test('aggregate verification revalidates transitive catalog recovery HTTP, not just its manifest pin', async t => {
  const f = await fixture(t), result = await prepareEvidence(f.input);
  const catalog = JSON.parse(readFileSync(result.sources.manifestPath));
  const source = JSON.parse(readFileSync(catalog.recovery.path));
  writeFileSync(join(source.directory, source.owners.genshin.observations[0].bodyFile), 'tampered ancestor');
  await assert.rejects(verifyEvidencePreparation(result.manifestPath, result.manifestPin), /changed/);
});

test('a write journal appearing mid-operation still prevents the final manifest', async t => {
  const f = await fixture(t), serve = f.input.serve;
  await assert.rejects(prepareEvidence({ ...f.input, serve: async (...args) => {
    writeFileSync(join(f.run, 'cloud-unexpected.jsonl'), ''); return serve(...args);
  } }), /cloud-write journal/);
  assert(!existsSync(join(attempts(f.run)[0], 'manifest.json')));
});

test('frozen candidate drift after sampling is caught before approval', async t => {
  const f = await fixture(t), serve = f.input.serve;
  await assert.rejects(prepareEvidence({ ...f.input, serve: async (...args) => {
    const result = await serve(...args);
    writeFileSync(join(f.run, 'artifacts/genshin/worker.js'), 'concurrent artifact change'); return result;
  } }), /changed/);
  assert(!existsSync(join(attempts(f.run)[0], 'manifest.json')));
});

test('a later cloud journal invalidates offline preparation verification without deleting history', async t => {
  const f = await fixture(t), result = await prepareEvidence(f.input);
  writeFileSync(join(f.run, 'promotion-started.jsonl'), '');
  await assert.rejects(verifyEvidencePreparation(result.manifestPath, result.manifestPin), /cloud-write journal/);
  assert(existsSync(result.manifestPath));
});

test('opaque run leases reject absent, forged, other-run and expired capabilities', async t => {
  const f = await fixture(t), other = join(f.root, 'other-run'); mkdirSync(other); let expired;
  for (const lease of [undefined, {}, Object.freeze({})]) await assert.rejects(retainCandidateWithLock(f.run, f.pin, '', '', lease), /Live lock lease/);
  await withRunLock(f.run, async lease => {
    expired = lease; assertRunLock(f.run, lease); assert(Object.isFrozen(lease));
    assert.throws(() => assertRunLock(other, lease), /Live lock lease/);
    await assert.rejects(retainCandidate(f.run, f.pin, '', ''), /EEXIST/);
    await assert.rejects(prepareEvidence(f.input), /EEXIST/);
  });
  assert.throws(() => assertRunLock(f.run, expired), /Live lock lease/);
  await assert.rejects(withRunLock(f.run, () => { throw Error('cleanup'); }), /cleanup/);
  assert(!existsSync(join(f.run, 'operation.lock')));
});

test('preparation holds the existing run lock across awaited network stages', async t => {
  const f = await fixture(t), reader = f.input.reader; let unblock, started;
  const gate = new Promise(resolve => { unblock = resolve; }), ready = new Promise(resolve => { started = resolve; });
  let first = true;
  const operation = prepareEvidence({ ...f.input, reader: { ...reader, snapshot: async () => {
    if (first) { first = false; started(); await gate; } return reader.snapshot();
  } } });
  await ready;
  try {
    await assert.rejects(retainCandidate(f.run, f.pin, '', ''), /EEXIST/);
    await assert.rejects(prepareEvidence(f.input), /EEXIST/);
  } finally { unblock(); }
  const result = await operation; await verifyEvidencePreparation(result.manifestPath, result.manifestPin);
});

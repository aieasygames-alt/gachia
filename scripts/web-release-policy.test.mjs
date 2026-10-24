import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requiredWebSecrets, WEB_FEATURES, DISABLED_ACCOUNT_ROUTES, verifyDisabledAccounts } from './web-release-policy.mjs';
import { webStagingOrigin } from './web-staging-acceptance.mjs';
import { rawSemanticHash } from '../packages/data/scripts/raw-inventory-contract.mjs';

test('raw review CLI admits explicit withdrawals without claiming verified game facts', () => {
  const script = fileURLToPath(new URL('../packages/data/scripts/raw-inventory-contract.mjs', import.meta.url));
  for (const release of [false, true]) {
    const result = spawnSync(process.execPath, [script, ...(release ? ['--release'] : [])], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.engineeringReady, true);
    assert.equal(report.contentReleaseReady, true);
    assert.equal(report.pending.length, 0);
    assert.equal(report.holds.length, 0);
    assert.equal(report.withdrawal.decision, 'withdrawn_not_verified');
    assert.equal(report.withdrawal.officialFactsApproved, false);
    assert.equal(report.equal, 90);
  }
  const unknown = spawnSync(process.execPath, [script, '--allow-pending'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Usage/);
});

test('raw review CLI still blocks an equal factual hold before a chained build or upload', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-held-cli-')));
  const data = [{ id: 'one', title: 'Unverified' }];
  const put = (path, bytes) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); };
  const path = 'pilot/raw-guides.json';
  try {
    for (const script of ['raw-inventory-contract.mjs', 'roco-publication-contract.mjs']) {
      const destination = join(root, 'packages/data/scripts', script); mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(new URL(`../packages/data/scripts/${script}`, import.meta.url), destination);
    }
    for (const prefix of ['packages/data/games', 'apps/web/public/data']) put(`${prefix}/${path}`, JSON.stringify(data));
    put('plans/review.md', 'Unresolved factual scope.');
    put('packages/data/raw-content-review.json', JSON.stringify({ schemaVersion: 1, pairs: [path], sourceOnly: [], pending: [], holds: [{ path,
      status: 'needs_review', sourceSha256: rawSemanticHash(data), mirrorSha256: rawSemanticHash(data), reason: 'Unverified', reviewDocument: 'plans/review.md' }] }));
    for (const release of [false, true]) {
      const result = spawnSync(process.execPath, [join(root, 'packages/data/scripts/raw-inventory-contract.mjs'), ...(release ? ['--release'] : [])], { encoding: 'utf8' });
      assert.equal(result.status, release ? 1 : 0, result.stderr);
      assert(result.stdout.trim(), result.stderr);
      assert.equal(JSON.parse(result.stdout).contentReleaseReady, false);
    }
    const result = spawnSync('/bin/sh', ['-c', '"$NODE" packages/data/scripts/raw-inventory-contract.mjs --release && echo MUST_NOT_BUILD_OR_UPLOAD'], { cwd: root, env: { ...process.env, NODE: process.execPath }, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert(!result.stdout.includes('MUST_NOT_BUILD_OR_UPLOAD'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('main production deploy and upload check content before building, while staging remains reviewable', () => {
  const pkg = JSON.parse(readFileSync(new URL('../apps/web/package.json', import.meta.url), 'utf8'));
  for (const key of ['deploy', 'upload']) assert.match(pkg.scripts[key], /^node .*raw-inventory-contract\.mjs --release && node .*require-patched-next\.mjs && opennextjs-cloudflare build/);
  for (const key of ['build', 'preview', 'preview:staging', 'deploy:staging']) assert(!pkg.scripts[key].includes('--release'), key);
  const gate = readFileSync(new URL('./require-patched-next.mjs', import.meta.url), 'utf8');
  assert.match(gate, /await verifyRawInventory\(\)/);
  const generator = readFileSync(new URL('../packages/data/scripts/generate-manifests.mjs', import.meta.url), 'utf8');
  assert(generator.indexOf('await verifyRawInventory()') < generator.indexOf('await writeRawMirrors()'));
});

test('main Actions block production content before expensive build and recheck before promotion', () => {
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const build = workflow.split('\n  deploy-staging:')[0];
  assert.match(build, /name: Block unresolved Main content before production build\n\s+if: inputs\.release_target == 'production'\n\s+run: node packages\/data\/scripts\/raw-inventory-contract\.mjs --release/);
  assert(build.indexOf('Block unresolved Main content') < build.indexOf('pnpm install --frozen-lockfile'));
  assert(build.indexOf('check:raw-inventory') < build.indexOf('Generate data manifests'));
  const production = workflow.split('\n  deploy:\n')[1];
  assert(production.includes('run: node packages/data/scripts/raw-inventory-contract.mjs --release'));
  assert(production.indexOf('Recheck Main content') < production.indexOf('name: Deploy to Cloudflare'));
});

test('main staging acceptance cannot select production, another service or an arbitrary origin', () => {
  assert.equal(webStagingOrigin(), 'https://gachia-staging.aieasygames.workers.dev');
  for (const args of [['https://gachia.com'], ['--origin', 'https://example.test'], ['nte']]) assert.throws(() => webStagingOrigin(args), /only the isolated/);
});

test('only retired account secrets are optional; IndexNow remains mandatory', () => {
  assert.equal(WEB_FEATURES.accountFeatures, false);
  assert.deepEqual(requiredWebSecrets(), ['INDEXNOW_AUTH_TOKEN']);
  assert.deepEqual(requiredWebSecrets({ accountFeatures: true }), ['INDEXNOW_AUTH_TOKEN', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);
  for (const value of [null, {}, { accountFeatures: 'false' }]) assert.throws(() => requiredWebSecrets(value), /Invalid/);
});

test('disabled acceptance checks every account method with retired cookies and malformed bodies', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push([url, options]);
    assert.equal(options.redirect, 'manual');
    assert.match(options.headers.cookie, /retired-session/);
    assert.equal(options.body, options.method === 'GET' ? undefined : '{');
    return Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404,
      headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  };
  const results = await verifyDisabledAccounts('http://localhost:8080', request);
  assert.equal(results.length, DISABLED_ACCOUNT_ROUTES.length);
  assert.equal(calls.length, 14);
  assert(!results.some(r => r.path === '/api/shared-builds' && r.method === 'GET'));
});

test('acceptance fails on an enabled endpoint, cookie refresh, or missing privacy headers', async () => {
  for (const response of [Response.json(null), Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404 }),
    Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404,
      headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'set-cookie': 'new=session' } })]) {
    await assert.rejects(verifyDisabledAccounts('http://localhost:8080', async () => response));
  }
});

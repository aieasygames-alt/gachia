import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { checkExecutionPermission, createReleasePlan, executeRelease, parseArguments, parseWrangler, prepareNamespacedAssets, readReleasePlan, verifyBuiltIndexing } from './game-release.mjs';
import { verifyOrigin } from './game-release-smoke.mjs';

const root = resolve(import.meta.dirname, '..');
const rollbackVersion = '01234567-89ab-cdef-0123-456789abcdef';
const fixture = (game = 'nte') => parseWrangler(readFileSync(resolve(root, `apps/game-${game}/wrangler.jsonc`), 'utf8'));
const planFor = (environment = 'staging', game = 'nte') => readReleasePlan({ game, environment, rollbackVersion });

for (const game of ['nte', 'azur-promilia']) {
  test(`${game}: staging is a separate, explicitly non-indexable service`, () => {
    const text = readFileSync(resolve(root, `apps/game-${game}/wrangler.jsonc`), 'utf8');
    const { config, error } = ts.parseConfigFileTextToJson('wrangler.jsonc', text);
    assert.equal(error, undefined);
    assert.equal(config.env?.staging?.name, `gachia-game-${game}-staging`);
    assert.notEqual(config.env.staging.name, config.name);
    const modeKey = `${game.toUpperCase().replaceAll('-', '_')}_DEPLOYMENT_MODE`;
    assert.equal(config.env.staging.vars[modeKey], 'preview');
  });

  test(`${game}: preview deploy cannot alias the production command`, () => {
    const { scripts } = JSON.parse(readFileSync(resolve(root, `apps/game-${game}/package.json`), 'utf8'));
    assert.match(scripts['deploy:preview'], /game-release\.mjs deploy/);
    assert.match(scripts['deploy:preview'], /--environment staging/);
    assert.match(scripts.deploy, /game-release\.mjs deploy.*--environment production/);
    assert.equal(scripts['deploy:staging'], scripts['deploy:preview']);
    assert.equal(scripts['deploy:production'], scripts.deploy);
    assert.equal(scripts.build, 'node ../../scripts/require-app-runtime.mjs && next build', 'nested Next builds must retain the selected mode and verified runtime');
    assert.match(scripts.preview, /--env staging.*--env staging/);
    assert.match(scripts['verify:bundle'], /game-release\.mjs verify.*--environment production/);
  });

  for (const environment of ['staging', 'production']) {
    test(`${game}/${environment}: all commands bind the same explicit config, environment and mode`, () => {
      const plan = planFor(environment, game);
      const expected = environment === 'staging' ? 'staging' : '';
      for (const command of Object.values(plan.commands)) {
        assert.deepEqual(command.slice(-4), ['--config', 'wrangler.jsonc', '--env', expected]);
      }
      assert.equal(plan.buildEnvironment.CLOUDFLARE_ENV, expected);
      assert.equal(plan.buildEnvironment.SKIP_NEXT_APP_BUILD, 'false');
      assert.equal(plan.buildEnvironment.SKIP_WRANGLER_CONFIG_CHECK, 'false');
      assert.equal(plan.indexingMode, environment === 'staging' ? 'preview' : game === 'nte' ? 'live' : 'production');
      assert.equal(plan.currentVersion.status, 'not_observed');
      assert.equal(plan.candidateVersion.status, 'not_observed');
      assert.equal(plan.rollbackVersion.status, 'operator_supplied_unverified');
      assert.equal(plan.effects.productionTraffic, environment === 'production');
      assert.equal(plan.effects.routerDeployment, false);
    });
  }
}

test('JSONC accepts comments/trailing commas but rejects ambiguous or invalid inputs', () => {
  assert.deepEqual(parseWrangler('{/* comment */"a": 1,}'), { a: 1 });
  for (const input of ['{"name":"a","name":"b"}', '{"vars":{"x":1,"x":2}}', '{invalid}', '[]', 'null']) {
    assert.throws(() => parseWrangler(input));
  }
});

test('NTE page metadata helpers cannot override layout preview protection', () => {
  for (const path of ['lib/seo.ts', 'lib/metadata.ts']) {
    const source = readFileSync(resolve(root, 'apps/game-nte', path), 'utf8');
    assert(source.includes("const isPreview = process.env.NTE_DEPLOYMENT_MODE !== 'live'"));
    assert(source.includes('robots: isPreview ? { index: false, follow: false } : indexable ? undefined : { index: false, follow: true }'));
  }
});

for (const mode of ['preview', 'live', undefined]) {
  test(`NTE metadata behavior with mode=${mode}: preview is closed, live Japanese gate retained`, () => {
    const source = readFileSync(resolve(root, 'apps/game-nte/lib/seo.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const module = { exports: {} };
    const requireFixture = (name) => {
      assert.equal(name, './data');
      return { isNteLocaleIndexable: (locale) => locale !== 'ja', isNteJapanesePathIndexable: () => false };
    };
    new Function('require', 'module', 'exports', 'process', outputText)(requireFixture, module, module.exports, { env: { NTE_DEPLOYMENT_MODE: mode } });
    for (const locale of ['zh', 'en', 'ja']) {
      const metadata = module.exports.productionMetadata('Title', 'Description', locale);
      assert.deepEqual(metadata.robots, mode !== 'live' ? { index: false, follow: false } : locale === 'ja' ? { index: false, follow: true } : undefined);
      assert.equal(metadata.alternates.canonical, `https://gachia.com/${locale}/nte`);
    }
  });
}

const unsafeMutations = {
  'missing staging': (c) => delete c.env.staging,
  'missing staging name': (c) => delete c.env.staging.name,
  'staging uses production name': (c) => { c.env.staging.name = c.name; },
  'unknown production service': (c) => { c.name = 'other-worker'; },
  'production uses preview indexing': (c) => { c.vars.NTE_DEPLOYMENT_MODE = 'preview'; },
  'missing preview mode must not inherit': (c) => delete c.env.staging.vars.NTE_DEPLOYMENT_MODE,
  'preview uses live indexing': (c) => { c.env.staging.vars.NTE_DEPLOYMENT_MODE = 'live'; },
  'unexpected canonical origin': (c) => { c.env.staging.vars.NEXT_PUBLIC_APP_URL = 'https://example.com'; },
  'production route': (c) => { c.routes = ['gachia.com/*']; },
  'preview custom route': (c) => { c.env.staging.routes = [{ pattern: 'gachia.com', custom_domain: true }]; },
  'production database': (c) => { c.d1_databases = [{ binding: 'DB' }]; },
  'preview service binding': (c) => { c.env.staging.services = [{ binding: 'MAIN', service: 'gachia' }]; },
  'custom build hook': (c) => { c.build = { command: 'echo unsafe' }; },
  'different worker': (c) => { c.main = 'other.js'; },
  'different asset directory': (c) => { c.assets.directory = '../other'; },
  'preview worker override': (c) => { c.env.staging.main = 'other.js'; },
  'preview asset override': (c) => { c.env.staging.assets = c.assets; },
};
for (const [name, mutate] of Object.entries(unsafeMutations)) {
  test(`rejects ${name} for either release environment`, () => {
    const config = fixture(); mutate(config);
    for (const environment of ['staging', 'production']) {
      assert.throws(() => createReleasePlan({ game: 'nte', environment }, JSON.stringify(config)));
    }
  });
}

test('unknown game, implicit environment and malformed rollback fail closed', () => {
  const text = JSON.stringify(fixture());
  for (const options of [
    { game: '../web', environment: 'staging' }, { game: 'toString', environment: 'staging' },
    { game: 'nte' }, { game: 'nte', environment: '' }, { game: 'nte', environment: 'preview' },
    { game: 'nte', environment: 'production', rollbackVersion: 'not-a-uuid' },
  ]) assert.throws(() => createReleasePlan(options, text));
});

test('production execution requires exact service and rollback, local verification does not', () => {
  const plan = planFor('production');
  assert.throws(() => checkExecutionPermission(plan, { action: 'deploy' }), /Production blocked/);
  assert.throws(() => checkExecutionPermission(plan, { action: 'deploy', confirmation: 'gachia' }));
  assert.throws(() => checkExecutionPermission({ ...plan, rollbackVersion: { value: null } }, { action: 'deploy', confirmation: plan.service }));
  assert.doesNotThrow(() => checkExecutionPermission(plan, { action: 'deploy', confirmation: plan.service }));
  assert.doesNotThrow(() => checkExecutionPermission(plan, { action: 'verify' }));
  assert.doesNotThrow(() => checkExecutionPermission(planFor(), { action: 'deploy' }));
});

test('CLI rejects extra passthrough and duplicate target flags', () => {
  const base = ['plan', '--game', 'nte', '--environment', 'staging'];
  assert.equal(parseArguments(base).environment, 'staging');
  for (const args of [[], ['deploy'], [...base, '--env', ''], [...base, '--game', 'azur-promilia'], [...base, '--remote', 'true'], [...base, '--confirm'], ['status', '--record', 'x', '--game', 'nte']]) {
    assert.throws(() => parseArguments(args));
  }
});

test('unsupported Next exception requires an explicit verify-only option and can never deploy', () => {
  const flag = '--allow-unsupported-next-for-verification';
  const args = ['--game', 'nte', '--environment', 'staging'];
  const options = parseArguments(['verify', ...args, flag]);
  const plan = readReleasePlan(options);
  assert.equal(plan.compatibilityException, 'local_verification_only_unsupported_next');
  assert(plan.commands.build.includes('--dangerouslyUseUnsupportedNextVersion'));
  assert.doesNotThrow(() => checkExecutionPermission(plan, { action: 'verify' }));
  assert.throws(() => checkExecutionPermission(plan, { action: 'deploy' }), /never deployment/);
  for (const action of ['plan', 'deploy', 'status']) assert.throws(() => parseArguments([action, ...args, flag]));
  assert.throws(() => parseArguments(['verify', ...args, flag, flag]));
  assert(!planFor().commands.build.includes('--dangerouslyUseUnsupportedNextVersion'));
});

function harness(plan, overrides = {}) {
  const calls = []; const saved = [];
  return {
    calls, saved,
    dependencies: {
      run: async (args, env) => { calls.push({ args, env }); },
      refreshPlan: () => structuredClone(plan),
      verifyArtifacts: () => ({ status: 'built_indexing_verified' }),
      save: (record) => saved.push(structuredClone(record)),
      ...overrides,
    },
  };
}

test('successful deploy is verification-pending, never released or cloud-observed', async () => {
  const plan = planFor(); const h = harness(plan);
  const record = await executeRelease(plan, { action: 'deploy' }, h.dependencies);
  assert.deepEqual(h.calls.map((c) => c.args), [plan.commands.build, plan.commands.deploy]);
  assert(h.calls.every((c) => c.env.NTE_DEPLOYMENT_MODE === 'preview'));
  assert.equal(record.status, 'deployment_command_succeeded_verification_pending');
  assert.equal(record.cloudVerification, 'not_performed');
  assert.equal(record.plan.candidateVersion.value, null);
  assert(h.saved.every((r) => r.status !== 'released'));
});

test('verify performs only build and dry-run without production permission', async () => {
  const plan = planFor('production'); const h = harness(plan);
  const record = await executeRelease(plan, { action: 'verify' }, h.dependencies);
  assert.deepEqual(h.calls.map((c) => c.args), [plan.commands.build, plan.commands.verify]);
  assert(plan.commands.verify.includes('--dry-run'));
  assert.equal(record.status, 'bundle_verified_not_deployed');
});

test('production rejection occurs before any build, artifact check or record mutation', async () => {
  const plan = planFor('production'); const h = harness(plan);
  await assert.rejects(executeRelease(plan, { action: 'deploy' }, h.dependencies), /Production blocked/);
  assert.equal(h.calls.length, 0); assert.equal(h.saved.length, 0);
});

for (const phase of ['build', 'artifacts', 'changed-config', 'deploy']) {
  test(`failure at ${phase} stops without retry or implicit rollback`, async () => {
    const plan = planFor(); let runs = 0;
    const h = harness(plan, {
      run: async () => { runs++; if (phase === 'build' || (phase === 'deploy' && runs === 2)) throw new Error('injected failure'); },
      verifyArtifacts: () => { if (phase === 'artifacts') throw new Error('wrong indexing'); return {}; },
      refreshPlan: () => phase === 'changed-config' && runs > 0 ? { ...plan, configurationSha256: 'changed' } : plan,
    });
    await assert.rejects(executeRelease(plan, { action: 'deploy' }, h.dependencies));
    assert.equal(runs, phase === 'deploy' ? 2 : 1);
    assert.equal(h.saved.at(-1).status, phase === 'deploy' ? 'deployment_failed_needs_reconciliation' : 'failed_before_deployment');
  });
}

test('record persistence failure after deploy still requires cloud reconciliation', async () => {
  const plan = planFor(); const h = harness(plan);
  const originalSave = h.dependencies.save;
  h.dependencies.save = (record) => {
    if (record.status === 'deployment_command_succeeded_verification_pending') throw new Error('disk full');
    originalSave(record);
  };
  await assert.rejects(executeRelease(plan, { action: 'deploy' }, h.dependencies));
  assert.equal(h.saved.at(-1).status, 'deployment_failed_needs_reconciliation');
});

function artifactFixture(t, environment) {
  const root = mkdtempSync(resolve(tmpdir(), 'gachia-release-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const plan = planFor(environment);
  const app = resolve(root, plan.app);
  const put = (path, text) => {
    const target = resolve(app, path); mkdirSync(resolve(target, '..'), { recursive: true }); writeFileSync(target, text);
  };
  const preview = environment === 'staging';
  put('.next/routes-manifest.json', JSON.stringify({ headers: preview ? [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] : [] }));
  put('.next/server/app/robots.txt.body', preview ? 'User-Agent: *\nDisallow: /\n' : 'User-Agent: *\nAllow: /\nSitemap: https://gachia.com/sitemaps/nte/index.xml\n');
  put('.next/server/app/zh/nte.html', preview ? '<meta name="robots" content="noindex, nofollow"/>' : '<h1>NTE</h1>');
  put('.open-next/worker.js', 'export default {}');
  return { root, plan, put };
}

for (const environment of ['staging', 'production']) {
  test(`${environment}: inspect generated headers, robots, homepage and Worker`, (t) => {
    const f = artifactFixture(t, environment);
    assert.equal(verifyBuiltIndexing(f.plan, f.root).status, 'static_indexing_checked_runtime_smoke_required');
    const otherPlan = planFor(environment === 'staging' ? 'production' : 'staging');
    assert.throws(() => verifyBuiltIndexing(otherPlan, f.root), /indexing/);
  });
}

test('preview detail pages cannot override the noindex protection', (t) => {
  const f = artifactFixture(t, 'staging');
  f.put('.next/server/app/en/nte/characters/example.html', '<h1>Missing preview protection</h1>');
  assert.throws(() => verifyBuiltIndexing(f.plan, f.root), /Preview HTML lacks noindex/);
});

test('missing build output fails instead of assuming the source configuration is enough', (t) => {
  const f = artifactFixture(t, 'staging');
  rmSync(resolve(f.root, f.plan.app, '.open-next/worker.js'));
  assert.throws(() => verifyBuiltIndexing(f.plan, f.root));
});

test('dynamic homepages are explicitly deferred to runtime smoke, not silently skipped', (t) => {
  const f = artifactFixture(t, 'staging');
  rmSync(resolve(f.root, f.plan.app, '.next/server/app/zh/nte.html'));
  assert.throws(() => verifyBuiltIndexing(f.plan, f.root));
  f.put('.next/server/app-paths-manifest.json', JSON.stringify({ '/[lang]/nte/page': 'app/[lang]/nte/page.js' }));
  const result = verifyBuiltIndexing(f.plan, f.root);
  assert.equal(result.homepageRendering, 'dynamic');
  assert.match(result.status, /runtime_smoke_required/);
});

test('direct preview assets retain the production Router paths and do not copy game data', (t) => {
  const f = artifactFixture(t, 'staging');
  f.put('.open-next/assets/_next/static/main.js', 'const value = 1;');
  f.put('.open-next/assets/images/hero.webp', 'image');
  const result = prepareNamespacedAssets(f.plan, f.root);
  assert.equal(result.files, 1);
  const assets = resolve(f.root, f.plan.app, '.open-next/assets');
  assert.equal(readFileSync(resolve(assets, '_next/static/main.js'), 'utf8'), readFileSync(resolve(assets, '_games/nte/_next/static/main.js'), 'utf8'));
  assert.throws(() => readFileSync(resolve(assets, '_games/nte/images/hero.webp')));
});

function fakeWorker(plan, mutate = (value) => value) {
  return async (url) => {
    const path = url.pathname;
    const preview = plan.environment === 'staging';
    let body; let status = 200; const headers = {};
    if (path === '/robots.txt') body = preview ? 'Disallow: /\n' : 'Allow: /\n';
    else if (path === '/sitemap.xml') {
      body = `<urlset><url><loc>https://gachia.com/zh/${plan.game}/characters/example</loc></url></urlset>`;
      headers['content-type'] = 'application/xml';
    } else if (/\.(js|css)$/.test(path)) {
      body = 'asset'; headers['content-type'] = path.endsWith('.js') ? 'application/javascript' : 'text/css';
    } else if (path.endsWith('__release_smoke_missing__')) { body = 'not found'; status = 404; }
    else {
      body = `<h1>Game</h1><link rel="canonical" href="https://gachia.com${path}"/><script src="/_games/${plan.game}/_next/main.js"></script><link href="/_games/${plan.game}/_next/main.css"/>`;
      headers['content-type'] = 'text/html';
      if (preview) { body += '<meta name="robots" content="noindex, nofollow"/>'; headers['x-robots-tag'] = 'noindex, nofollow'; }
    }
    const result = mutate({ path, body, status, headers });
    return new Response(result.body, { status: result.status, headers: result.headers });
  };
}

for (const environment of ['staging', 'production']) {
  test(`${environment}: runtime smoke checks pages, real detail, robots, sitemap, JS/CSS and 404`, async () => {
    const plan = planFor(environment);
    const result = await verifyOrigin(plan, 'http://127.0.0.1:1234', fakeWorker(plan));
    assert.equal(result.observations.length, 11);
    assert.equal(result.cloudVerification, 'not_performed');
  });
}

for (const kind of ['noindex', 'canonical', 'assets', 'redirect', 'soft404', 'xml']) {
  test(`runtime smoke rejects ${kind} regressions`, async () => {
    const plan = planFor();
    const request = fakeWorker(plan, (r) => {
      if (kind === 'noindex') delete r.headers['x-robots-tag'];
      if (kind === 'canonical') r.body = r.body.replace('rel="canonical"', 'rel="alternate"');
      if (kind === 'assets' && r.path.endsWith('.js')) r.status = 404;
      if (kind === 'redirect' && r.path === '/zh/nte') r.status = 301;
      if (kind === 'soft404' && r.status === 404) r.status = 200;
      if (kind === 'xml' && r.path === '/sitemap.xml') r.headers['content-type'] = 'text/html';
      return r;
    });
    await assert.rejects(verifyOrigin(plan, 'http://127.0.0.1:1234', request));
  });
}

test('local smoke cannot silently inspect a production or arbitrary remote origin', async () => {
  for (const origin of ['https://gachia.com', 'http://example.com:1234', 'http://127.0.0.1', 'http://127.0.0.1:1234/path']) {
    await assert.rejects(verifyOrigin(planFor(), origin, () => { throw new Error('must not fetch'); }), /only accepts/);
  }
});

test('CLI plan is read-only and blocked production command exits before build', () => {
  const cli = resolve(root, 'scripts/game-release.mjs');
  const args = ['--game', 'nte', '--environment', 'production'];
  const planned = spawnSync(process.execPath, [cli, 'plan', ...args], { encoding: 'utf8', cwd: tmpdir() });
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(JSON.parse(planned.stdout).status, 'planned_not_executed');
  const blocked = spawnSync(process.execPath, [cli, 'deploy', ...args], { encoding: 'utf8', cwd: tmpdir() });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /Production blocked/);
  assert.doesNotMatch(blocked.stderr, /Local release record/);
});

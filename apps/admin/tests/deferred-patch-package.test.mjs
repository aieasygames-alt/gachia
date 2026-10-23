import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, readlinkSync, chmodSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyNextDeferredPatch } from '../../../scripts/verify-next-deferred-patch.mjs';

test('primary deployment workflow requires patched dependencies before build', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const require = createRequire(import.meta.url);
  const { parse } = require('yaml');
  const config = parse(workflow);
  for (const job of ['build', 'deploy-staging', 'deploy']) {
    const commands = config.jobs[job].steps.map(step => step.run ?? '');
    const install = commands.indexOf('pnpm install --frozen-lockfile');
    const gate = commands.indexOf('node scripts/verify-next-deferred-patch.mjs --require-patched');
    const build = commands.indexOf('pnpm --filter @gachia/web exec opennextjs-cloudflare build');
    const restore = config.jobs[job].steps.findIndex(step => step.name === 'Verify and restore web artifact');
    assert.ok(install >= 0 && gate > install, job);
    if (job === 'build') assert.ok(build > gate, job);
    else assert.ok(build === -1 && restore > gate, job);
  }
  assert.deepEqual(config.jobs.deploy.needs, ['build', 'deploy-staging']);
  assert.ok(config.jobs.deploy.if.includes("needs.deploy-staging.result == 'success'"));
  assert.ok(!config.jobs.deploy.if.includes('always()'));
});

test('web promotion uses one immutable artifact ID and digest, preserving hidden files and links', () => {
  const require = createRequire(import.meta.url);
  const { parse } = require('yaml');
  const { jobs } = parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const seal = jobs.build.steps.find(step => step.id === 'seal-web');
  const upload = jobs.build.steps.find(step => step.id === 'web-artifact');
  assert.equal(jobs.build.outputs['web-artifact-id'], '${{ steps.web-artifact.outputs.artifact-id }}');
  assert.equal(jobs.build.outputs['web-artifact-sha256'], '${{ steps.seal-web.outputs.sha256 }}');
  assert.equal(upload.with.path, 'web-worker.tar.gz');
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.ok(jobs.build.steps.indexOf(seal) > jobs.build.steps.findIndex(step => step.name === 'Browser navigation smoke tests'));
  assert.ok(jobs.build.steps.indexOf(upload) > jobs.build.steps.indexOf(seal));
  const root = mkdtempSync(join(tmpdir(), 'web-promotion-'));
  const run = (command, cwd, env = {}) => spawnSync('bash', ['-c', command], {
    cwd, env: { ...process.env, ...env }, encoding: 'utf8',
  });
  try {
    mkdirSync(join(root, 'apps/web/.open-next/.build'), { recursive: true });
    writeFileSync(join(root, 'apps/web/.open-next/worker.js'), 'synthetic worker');
    writeFileSync(join(root, 'apps/web/.open-next/.build/open-next.config.edge.mjs'), 'export default {};');
    symlinkSync('worker.js', join(root, 'apps/web/.open-next/worker-link.js'));
    const output = join(root, 'outputs');
    const sealed = run(seal.run, root, { GITHUB_OUTPUT: output });
    assert.equal(sealed.status, 0, sealed.stderr);
    const digest = readFileSync(output, 'utf8').trim().split('=')[1];
    for (const job of ['deploy-staging', 'deploy']) {
      const download = jobs[job].steps.find(step => step.name === 'Download verified web artifact');
      assert.equal(download.with['artifact-ids'], '${{ needs.build.outputs.web-artifact-id }}');
      assert.equal(download.with['merge-multiple'], true);
      assert.equal(download.with.name, undefined);
      const restore = jobs[job].steps.find(step => step.name === 'Verify and restore web artifact');
      assert.equal(restore.env.EXPECTED_SHA256, '${{ needs.build.outputs.web-artifact-sha256 }}');
      assert.ok(jobs[job].steps.indexOf(restore) < jobs[job].steps.findIndex(step => step.name?.startsWith('Verify ') && step.name.endsWith('Worker secrets')));
      const target = join(root, job);
      mkdirSync(join(target, 'apps/web'), { recursive: true });
      mkdirSync(join(target, '.release-web'));
      writeFileSync(join(target, '.release-web/web-worker.tar.gz'), readFileSync(join(root, 'web-worker.tar.gz')));
      assert.notEqual(run(restore.run, target, { EXPECTED_SHA256: '0'.repeat(64) }).status, 0);
      assert.notEqual(run(restore.run, target, { EXPECTED_SHA256: '' }).status, 0);
      const restored = run(restore.run, target, { EXPECTED_SHA256: digest });
      assert.equal(restored.status, 0, restored.stderr);
      assert.equal(readFileSync(join(target, 'apps/web/.open-next/.build/open-next.config.edge.mjs'), 'utf8'), 'export default {};');
      assert.equal(readlinkSync(join(target, 'apps/web/.open-next/worker-link.js')), 'worker.js');
      assert.notEqual(run(restore.run, target, { EXPECTED_SHA256: digest }).status, 0, 'must not overlay an existing output');
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('web direct build and release scripts check their own resolved patch first', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../web/package.json', import.meta.url), 'utf8'));
  for (const name of ['build', 'preview', 'preview:staging', 'deploy', 'deploy:staging', 'upload']) {
    assert.ok(pkg.scripts[name].startsWith('node ../../scripts/require-patched-next.mjs && '), name);
  }
  const result = spawnSync(process.execPath,
    [fileURLToPath(new URL('../../../scripts/require-patched-next.mjs', import.meta.url))],
    { cwd: fileURLToPath(new URL('../../web', import.meta.url)), encoding: 'utf8' });
  const require = createRequire(new URL('../../web/package.json', import.meta.url));
  const state = verifyNextDeferredPatch(dirname(require.resolve('next/package.json'))).state;
  if (state === 'original') {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Patched Next required/);
  } else {
    assert.equal(result.status, 0, result.stderr);
  }
});

test('staging and production require all 12 HI3 reading routes and reject redirects or failures', () => {
  const require = createRequire(import.meta.url);
  const { parse } = require('yaml');
  const { jobs } = parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const root = mkdtempSync(join(tmpdir(), 'hi3-smoke-fixture-'));
  try {
    // A fake curl exercises the actual CI shell without network or a local service.
    writeFileSync(join(root, 'curl'), '#!/bin/bash\nprintf "%s\\n" "$*" >> "$CALL_LOG"\nprintf "%s" "${FAKE_STATUS:-200}"\nexit "${FAKE_EXIT:-0}"\n');
    chmodSync(join(root, 'curl'), 0o755);
    for (const job of ['deploy-staging', 'deploy']) {
      const step = jobs[job].steps.find(step => step.name === 'Smoke test HI3 reading routes');
      assert.ok(step);
      const deploy = jobs[job].steps.findIndex(step => step.name === (job === 'deploy' ? 'Deploy to Cloudflare' : 'Deploy to Cloudflare staging'));
      assert.ok(jobs[job].steps.indexOf(step) > deploy);
      assert.equal(step.env.READING_ORIGIN, job === 'deploy' ? 'https://gachia.com' : '${{ env.STAGING_ORIGIN }}');
      const log = join(root, `${job}.log`);
      const run = overrides => spawnSync('bash', ['-c', step.run], { encoding: 'utf8', env: {
        ...process.env, PATH: `${root}:${process.env.PATH}`, CALL_LOG: log,
        READING_ORIGIN: 'https://synthetic.invalid/', FAKE_STATUS: '200', FAKE_EXIT: '0', ...overrides,
      } });
      const passed = run({});
      assert.equal(passed.status, 0, passed.stderr);
      const calls = readFileSync(log, 'utf8').trim().split('\n');
      const expected = ['zh', 'en', 'ja'].flatMap(lang => ['', '/vermillion-liuli', '/vermillion-liuli-full-burn', '/volatile-sparkler']
        .map(suffix => `https://synthetic.invalid/${lang}/hi3/weapons${suffix}`));
      assert.deepEqual(calls.map(line => line.split(' ').at(-1)), expected);
      assert.ok(calls.every(line => line.includes('--max-time 30') && !line.includes('--location')));
      for (const status of ['301', '302', '404', '500']) assert.notEqual(run({ FAKE_STATUS: status }).status, 0, status);
      assert.notEqual(run({ FAKE_EXIT: '28' }).status, 0, 'timeout must fail');
      assert.notEqual(run({ READING_ORIGIN: '' }).status, 0, 'missing origin must fail');
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('distribution patch applies exactly and verifier rejects partial, drift and wrong version', () => {
  const require = createRequire(new URL('../../web/package.json', import.meta.url));
  const next = dirname(require.resolve('next/package.json'));
  const root = mkdtempSync(join(tmpdir(), 'next-patch-fixture-'));
  try {
    writeFileSync(join(root, 'package.json'), readFileSync(join(next, 'package.json')));
    const before = verifyNextDeferredPatch(next);
    for (const file of before.files) {
      const target = join(root, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(next, file.path)));
    }
    const patch = fileURLToPath(new URL(`../../../patches/next-${before.nextVersion}-deferred-initial.patch`, import.meta.url));
    if (before.state === 'patched') {
      const reverse = spawnSync('git', ['apply', '--reverse', '--unsafe-paths', patch], { cwd: root, encoding: 'utf8' });
      assert.equal(reverse.status, 0, reverse.stderr);
    }
    const originalFirst = readFileSync(join(root, before.files[0].path));
    assert.throws(() => verifyNextDeferredPatch(root, { requirePatched: true }), /Patched Next required/);
    const result = spawnSync('git', ['apply', '--unsafe-paths', patch], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(verifyNextDeferredPatch(root).state, 'patched');
    assert.equal(verifyNextDeferredPatch(root, { requirePatched: true }).state, 'patched');
    const first = before.files[0].path;
    writeFileSync(join(root, first), originalFirst);
    assert.throws(() => verifyNextDeferredPatch(root), /Partial patch/);
    writeFileSync(join(root, first), 'drift');
    assert.throws(() => verifyNextDeferredPatch(root), /Source digest/);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'next', version: '16.0.0' }));
    assert.throws(() => verifyNextDeferredPatch(root), /Exact Next version/);
    assert.equal(verifyNextDeferredPatch(next).state, before.state);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

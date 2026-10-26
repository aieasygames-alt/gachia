import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { parseProductionArguments, productionPlan, rejectProductionMutation, PRODUCTION_TARGETS } from './production-release.mjs';
import { checkExecutionPermission, checkSourcePermission, executeRelease, parseWrangler, readReleasePlan } from './game-release.mjs';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'scripts/production-release.mjs');
const targets = ['main', 'genshin', 'nte', 'azur-promilia', 'lvmeng', 'router'];

test('every live owner has a distinct explicit target; Router is not a content owner', () => {
  assert.deepEqual(Object.keys(PRODUCTION_TARGETS).sort(), [...targets].sort());
  assert.equal(new Set(Object.values(PRODUCTION_TARGETS).map(row => row.service)).size, 6);
  const plan = productionPlan(['main', 'genshin', 'nte', 'azur-promilia', 'lvmeng']);
  assert.equal(plan.ready, false);
  assert.equal(plan.atomic, false);
  assert.equal(plan.cloudState, 'not_observed');
  assert.equal(plan.sourceValidation, 'not_performed');
  assert(plan.targets.every(row => row.status !== 'released'));
  assert.deepEqual(plan.effects, { build: false, upload: false, promote: false, rollback: false, router: false });
  assert(plan.excludedServices.includes('gachia-router'));
  assert.equal(plan.targets.find(row => row.target === 'lvmeng').environment, 'production');
  assert.equal(plan.targets.find(row => row.target === 'nte').environment, '');
  assert.equal(productionPlan(['router']).targets[0].kind, 'routing');
  assert.throws(() => productionPlan(['main', 'router']), /separate/);
});

test('target selection fails closed without defaults, duplicates or passthrough', () => {
  assert.deepEqual(parseProductionArguments(['plan', '--targets', 'nte,lvmeng']), { action: 'plan', targets: ['nte', 'lvmeng'] });
  for (const args of [[], ['plan'], ['plan', '--targets', ''], ['plan', '--targets', 'all'],
    ['plan', '--targets', 'nte,nte'], ['plan', '--targets', 'nte,'], ['plan', '--targets', ' main'],
    ['plan', '--targets', 'constructor'], ['plan', '--targets', '../web'], ['plan', '--targets', 'main', '--env', 'production'],
    ['deploy', '--targets', 'nte', '--confirm', 'gachia-game-nte'], ['deploy', '--targets', 'nte', '--targets', 'main']]) {
    assert.throws(() => parseProductionArguments(args), undefined, JSON.stringify(args));
  }
  for (const value of [null, [], ['unknown'], ['nte', 'nte'], 'nte']) assert.throws(() => productionPlan(value));
});

test('target inventory agrees with config selection and all Router bindings', () => {
  const router = parseWrangler(readFileSync(join(root, 'apps/router/wrangler.jsonc'), 'utf8'));
  for (const [target, policy] of Object.entries(PRODUCTION_TARGETS)) {
    const config = parseWrangler(readFileSync(join(root, policy.app, 'wrangler.jsonc'), 'utf8'));
    const selected = policy.environment ? config.env[policy.environment] : config;
    assert.equal(selected.name, policy.service, target);
    if (target !== 'router') assert(router.services.some(binding => binding.service === policy.service), target);
    if (target === 'lvmeng') {
      assert.equal(config.name, selected.name);
      assert.equal(config.vars.LVMENG_DEPLOYMENT_MODE, 'preview');
      assert.equal(selected.vars.LVMENG_DEPLOYMENT_MODE, 'production');
    }
  }
});

for (const target of targets) for (const action of ['deploy', 'upload', 'promote', 'rollback']) {
  test(`${target}/${action}: even an authenticated environment cannot unlock a local production mutation`, t => {
    const cwd = mkdtempSync(join(tmpdir(), 'production-block-'));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    const bin = join(cwd, 'bin'); mkdirSync(bin);
    for (const name of ['pnpm', 'wrangler', 'gh', 'git']) writeFileSync(join(bin, name), '#!/bin/sh\ntouch unexpected-child-process\nexit 99\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, [cli, action, '--targets', target], { cwd, encoding: 'utf8',
      env: { ...process.env, PATH: bin, CI: 'true', CLOUDFLARE_API_TOKEN: 'synthetic-not-a-secret', CLOUDFLARE_ENV: 'production' } });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Production blocked/);
    assert.deepEqual(readdirSync(cwd), ['bin']);
    assert.throws(() => rejectProductionMutation(target, action), /Production blocked/);
  });
}

test('package aliases converge without hidden build/upload prefixes', () => {
  for (const target of targets) {
    const app = PRODUCTION_TARGETS[target].app;
    const { scripts } = JSON.parse(readFileSync(join(root, app, 'package.json'), 'utf8'));
    assert.equal(scripts.deploy, `node ../../scripts/production-release.mjs deploy --targets ${target}`);
    assert.equal(scripts['release:plan'], `node ../../scripts/production-release.mjs plan --targets ${target}`);
    if (scripts['deploy:production']) assert.equal(scripts['deploy:production'], scripts.deploy);
    if (target === 'main') assert.equal(scripts.upload, 'node ../../scripts/production-release.mjs upload --targets main');
    for (const [name, command] of Object.entries(scripts)) {
      if (/^(?:deploy|upload|promote|rollback)(?::|$)/.test(name)) {
        assert(['deploy', 'deploy:production', 'deploy:staging', 'deploy:preview', ...(target === 'main' ? ['upload'] : [])].includes(name), `${target}/${name}: unreviewed write alias`);
      }
      if (/\b(?:wrangler|opennextjs-cloudflare)\s+(?:deploy|upload|rollback|versions)\b/.test(command)) {
        assert((name.startsWith('verify:') && command.includes('--dry-run')) ||
          (name === 'deploy:staging' && command.includes('--env staging')), `${target}/${name}: raw production write`);
      }
    }
  }
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['release:production'], 'node scripts/production-release.mjs');
  assert(pkg.scripts['test:release'].includes('scripts/production-release.test.mjs'));
});

for (const game of ['nte', 'azur-promilia']) {
  test(`${game}: legacy CLI refuses production before reading a supplied receipt or taking a release lock`, () => {
    const result = spawnSync(process.execPath, [join(root, 'scripts/game-release.mjs'), 'deploy', '--game', game,
      '--environment', 'production', '--confirm', `gachia-game-${game}`, '--rollback-version', '00000000-0000-0000-0000-000000000000',
      '--previous-assets-receipt', '/nonexistent/do-not-read-this-receipt.json'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Production blocked/);
    assert(!result.stderr.includes('ENOENT'));
    assert(!result.stderr.includes('Local release record:'));
  });
  test(`${game}: direct legacy production entry is blocked before any callback even with a rollback UUID`, async () => {
    const plan = readReleasePlan({ game, environment: 'production', rollbackVersion: '00000000-0000-0000-0000-000000000000' });
    const options = { action: 'deploy', confirmation: plan.service };
    assert.throws(() => checkExecutionPermission(plan, options), /Production blocked/);
    let calls = 0;
    await assert.rejects(executeRelease(plan, options, {
      refreshPlan: () => { calls++; return plan; }, verifyArtifacts: () => { calls++; },
      run: () => { calls++; }, save: () => { calls++; },
    }), /Production blocked/);
    assert.equal(calls, 0);
    assert.throws(() => checkSourcePermission(plan, options, { dirty: true }), /clean committed/);
    assert.throws(() => checkSourcePermission(plan, options, { dirty: false, commit: 'b', expectedCommit: 'a' }), /clean committed/);
    assert.doesNotThrow(() => checkExecutionPermission(plan, { action: 'verify' }));
  });
}

test('legacy Router cutover workflows are inert and contain no deployment credentials or executor', () => {
  for (const file of ['genshin-router-full-cutover.yml', 'genshin-router-canary-enable.yml']) {
    const text = readFileSync(join(root, '.github/workflows', file), 'utf8');
    assert.match(text, /exit 1/);
    assert(!/wrangler|opennextjs|secrets\.|actions\/checkout|continue-on-error|workflow_call/.test(text));
  }
});

test('no second workflow silently introduces a raw production publisher', () => {
  for (const file of readdirSync(join(root, '.github/workflows'))) {
    if (!/\.ya?ml$/.test(file) || file === 'deploy.yml') continue;
    const text = readFileSync(join(root, '.github/workflows', file), 'utf8');
    assert(!/\b(?:wrangler|opennextjs-cloudflare)\s+(?:deploy|upload|rollback|versions\s+(?:deploy|upload))\b/.test(text), file);
  }
});

test('Main retains its existing explicit production workflow and never deploys other owners', () => {
  const text = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.match(text, /inputs.production_confirmation == 'RELEASE_MAIN_ONLY'/);
  assert.match(text, /needs.deploy-staging.result == 'success'/);
  assert.match(text, /group: gachia-/);
  const production = text.split('\n  deploy:\n')[1];
  assert(text.includes('inputs.previous_web_artifact_sha256'));
  assert(production.includes('needs.build.outputs.web-artifact-sha256'));
  assert(production.includes('ROLLBACK_VERSION'));
  assert(!/working-directory: apps\/(?:router|game-)/.test(production));
  assert.equal(PRODUCTION_TARGETS.main.workflow, '.github/workflows/deploy.yml');
});

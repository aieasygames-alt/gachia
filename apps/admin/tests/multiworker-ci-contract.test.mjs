import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Azur PR verification follows the live registry and retains staging isolation without rg', () => {
  const require = createRequire(import.meta.url);
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const workflow = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/azur-promilia-preview.yml', import.meta.url), 'utf8'));
  const steps = workflow.jobs.verify.steps;
  assert.ok(steps.some(s => s.run === 'pnpm validate:game-deployments'));
  assert.ok(!steps.some(s => /\brg\s/.test(s.run ?? '')));
  const gate = steps.find(s => s.name === 'Keep staging routing explicitly disabled');
  assert.ok(gate);
  const result = spawnSync('bash', ['-c', gate.run], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const router = JSON.parse(readFileSync(new URL('../../../apps/router/wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(router.vars.AZUR_PROMILIA_ENABLED, 'true', 'live production is not rolled back to make an old check pass');
  assert.ok(!steps.some(s => /(?:--remote|secret list|wrangler deploy(?! --dry-run))/.test(s.run ?? '')));
});

test('main release is explicit, serialized and cannot migrate or redeploy other Workers', () => {
  const require = createRequire(import.meta.url);
  const workflow = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  assert.equal(workflow.on.workflow_dispatch.inputs.release_target.default, 'verify');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.permissions.contents, 'read');
  for (const name of ['deploy-staging', 'deploy']) {
    const job = workflow.jobs[name];
    assert.ok(job.if.includes("github.event_name == 'workflow_dispatch'"));
    assert.ok(!job.if.includes("github.event_name == 'push'"));
    assert.equal(job.environment, name === 'deploy' ? 'production' : 'staging');
    for (const step of job.steps) {
      assert.doesNotMatch(step.run ?? '', /migrations apply|game-.*deploy|generate:manifests|wrangler deploy\b/);
      if (/opennextjs-cloudflare deploy/.test(step.run ?? '')) assert.equal(step['working-directory'], 'apps/web');
      assert.notEqual(step['working-directory'], 'apps/router');
    }
  }
  const gate = workflow.jobs.build.steps.find(s => s.name === 'Validate explicit release request');
  const run = env => spawnSync('bash', ['-c', gate.run], { encoding: 'utf8', env: { ...process.env,
    RELEASE_TARGET: 'production', RELEASE_REF: 'refs/heads/main', CONFIRMATION: '', ROLLBACK_VERSION: '',
    PREVIOUS_WEB_ARTIFACT_ID: '123', PREVIOUS_WEB_ARTIFACT_SHA256: 'a'.repeat(64), ...env } });
  assert.notEqual(run({}).status, 0);
  assert.notEqual(run({ CONFIRMATION: 'RELEASE_MAIN_ONLY', ROLLBACK_VERSION: 'not-a-version' }).status, 0);
  assert.equal(run({ CONFIRMATION: 'RELEASE_MAIN_ONLY', ROLLBACK_VERSION: '12345678-1234-1234-1234-123456789abc' }).status, 0);
  assert.notEqual(run({ RELEASE_REF: 'refs/heads/candidate', CONFIRMATION: 'RELEASE_MAIN_ONLY', ROLLBACK_VERSION: '12345678-1234-1234-1234-123456789abc' }).status, 0);
  for (const invalid of [{ PREVIOUS_WEB_ARTIFACT_ID: '' }, { PREVIOUS_WEB_ARTIFACT_SHA256: 'invalid' }]) {
    assert.notEqual(run({ CONFIRMATION: 'RELEASE_MAIN_ONLY', ROLLBACK_VERSION: '12345678-1234-1234-1234-123456789abc', ...invalid }).status, 0);
  }
  assert.equal(run({ RELEASE_TARGET: 'verify' }).status, 0);
  const steps = workflow.jobs.deploy.steps;
  assert.ok(steps.findIndex(s => s.name === 'Preserve rollback evidence') < steps.findIndex(s => s.name === 'Deploy to Cloudflare'));
});

test('previous static assets are pinned, sealed once and verified before both cloud writes', () => {
  const require = createRequire(import.meta.url);
  const workflow = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  assert.equal(workflow.jobs.build.permissions.actions, 'read');
  const steps = workflow.jobs.build.steps;
  const retain = steps.findIndex(s => s.name === 'Retain previous production static assets');
  assert(retain > steps.findIndex(s => s.name === 'Build Cloudflare Worker'));
  assert(retain < steps.findIndex(s => s.id === 'seal-web'));
  assert.match(steps[retain].if, /workflow_dispatch/);
  assert.match(steps[retain].if, /release_target == 'production'/);
  assert.equal(steps[retain].run, 'node scripts/prepare-previous-web-assets.mjs');
  for (const name of ['deploy-staging', 'deploy']) {
    const release = workflow.jobs[name].steps;
    const gate = release.findIndex(s => s.run === 'node scripts/retain-web-assets.mjs verify "$ROLLBACK_VERSION"');
    assert(gate > release.findIndex(s => s.name === 'Verify and restore web artifact'));
    assert(gate < release.findIndex(s => /opennextjs-cloudflare deploy/.test(s.run ?? '')));
    assert(!release.some(s => /opennextjs-cloudflare build/.test(s.run ?? '')));
  }
  assert(workflow.jobs['deploy-staging'].steps.some(s => s.run === 'node scripts/retain-web-assets.mjs staging "$ROLLBACK_VERSION"'));
});

test('production waits for browser acceptance of the exact compiled staging artifact', () => {
  const require = createRequire(import.meta.url);
  const workflow = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const steps = workflow.jobs['deploy-staging'].steps;
  const deploy = steps.findIndex(s => s.name === 'Deploy to Cloudflare staging');
  const browser = steps.findIndex(s => s.name === 'Install browser for production candidate acceptance');
  const runtime = steps.findIndex(s => s.run === 'node scripts/web-staging-acceptance.mjs');
  const boundary = steps.findIndex(s => s.name === 'Verify compiled cross-owner navigation on staging');
  assert(browser > deploy && runtime > browser && boundary > runtime);
  for (const index of [browser, runtime, boundary]) {
    assert.equal(steps[index].if, "inputs.release_target == 'production'");
    assert.notEqual(steps[index]['continue-on-error'], true);
  }
  assert.equal(steps[boundary].env.PLAYWRIGHT_BASE_URL, 'https://gachia-staging.aieasygames.workers.dev');
  assert.match(steps[boundary].run, /without RSC prefetch/);
  assert(workflow.jobs.deploy.needs.includes('deploy-staging'));
  assert.match(workflow.jobs.deploy.if, /needs\.deploy-staging\.result == 'success'/);
});

test('rollback evidence must identify the latest fully active main version', () => {
  const require = createRequire(import.meta.url);
  const workflow = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const step = workflow.jobs.deploy.steps.find(s => s.name === 'Record main deployment before promotion');
  const source = step.run.split("<<'EOF'\n")[1].split('\nEOF')[0]
    .replace("JSON.parse(fs.readFileSync('/tmp/main-deployments-before.json', 'utf8'))", 'JSON.parse(process.env.FIXTURE)');
  const run = fixture => spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    encoding: 'utf8', env: { ...process.env, ROLLBACK_VERSION: 'active', FIXTURE: JSON.stringify(fixture) },
  });
  const deployment = (date, id, percentage = 100) => ({ created_on: date, versions: [{ version_id: id, percentage }] });
  assert.equal(run([deployment('2026-10-15', 'active'), deployment('2026-10-14', 'old')]).status, 0);
  for (const fixture of [[], {}, [deployment('2026-10-14', 'active'), deployment('2026-10-15', 'other')],
    [deployment('2026-10-15', 'active', 50)]]) assert.notEqual(run(fixture).status, 0);
});

test('main secret gates share the checked-in account policy without weakening other releases', () => {
  const require = createRequire(import.meta.url);
  const workflow = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  for (const job of ['deploy-staging', 'deploy']) {
    const step = workflow.jobs[job].steps.find(s => s.name === `Verify ${job === 'deploy' ? 'production' : 'staging'} Worker secrets`);
    assert.match(step.run, /wrangler secret list/);
    assert.match(step.run, /node ..\/..\/scripts\/web-release-policy.mjs secrets \/tmp\/worker-secrets.json/);
  }
  const smoke = workflow.jobs['deploy-staging'].steps.find(s => s.name === 'Smoke test staging');
  assert.match(smoke.run, /account-smoke "\$STAGING_ORIGIN"/);
  assert.doesNotMatch(smoke.run, /for path in .*api\/auth\/get-session/);
});

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

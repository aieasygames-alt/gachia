import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { options } from './desktop-publish.mjs';

const text = readFileSync(new URL('../docs/payload-operator-runbook.md', import.meta.url), 'utf8');
const lines = text.match(/^cms publish-[^\n]+/gm);
const sha = 'a'.repeat(64), id = 'a'.repeat(16);
for (const [index, line] of lines.entries()) test(`runbook command ${index + 1} matches the real argument gate`, () => {
  const parts = line.match(/"[^"]*"|'[^']*'|\S+/g).map(s => s.replace(/^["']|["']$/g, ''));
  const action = parts[1].slice('publish-'.length), args = [];
  for (let i = 2; i < parts.length; i += 2) {
    const key = parts[i], value = key === '--run' ? `${id}-${'a'.repeat(12)}`
      : key === '--mode' ? parts[i + 1] : ['--retention', '--bundle', '--recovery', '--renewal'].includes(key) ? id
        : ['--repo', '--evidence', '--baseline', '--source'].includes(key) ? '/tmp/runbook-fixture' : sha;
    args.push(key, value);
  }
  assert.equal(options([action === 'plan' ? 'inspect' : action, ...args]).action, action === 'plan' ? 'inspect' : action);
});
test('runbook publish actions exist in the installed manager parser', () => {
  const help = spawnSync('python3', ['-B', new URL('./fixtures/desktop-parser-probe.py', import.meta.url).pathname, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  for (const line of lines) assert(help.stdout.includes(line.split(' ')[1]));
});
test('operator handoff makes the remaining manual evidence and cloud gaps explicit', () => {
  assert.match(text, /尚无一键自动生成全部资源\/恢复证据并从零建立可信来源/);
  assert.match(text, /publish-assets-refresh/);
  assert.match(text, /publish-recovery-local-prepare/);
  assert.match(text, /publish-source-register/);
  assert.match(text, /publish-source-select/);
  assert.match(text, /没有“latest”、原始O回退或部署后自动接续/);
  assert.match(text, /仍须为新候选执行assets-refresh、baseline-capture、recovery-local-prepare与全部云门禁/);
  assert.match(text, /首次真实编辑的云端验收尚未完成/);
  assert.match(text, /不能删日志/);
  assert.match(text, /title \/ body/);
  assert.match(text, /admin\/reviewer/);
  assert(!/仅适用 Genshin|推广未接通|NTE 尚未接入/.test(text));
});
test('Payload CI permits only the task branch, remains read-only and has no deployment credentials', () => {
  const workflow = readFileSync(new URL('../.github/workflows/payload-verify.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\n    branches: \[codex\/payload-unified-maintenance\]/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/codex\/payload-unified-maintenance'/);
  const triggers = workflow.split('\npermissions:')[0];
  assert(!/\bmain\b|\*|pull_request|branches-ignore/.test(triggers));
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert(!/secrets\.|(?:contents|actions|packages|id-token): write|wrangler|desktop\.py|release:production|\bpull_request:/.test(workflow));
  for (const check of ['next typegen', 'typecheck', 'test:release', 'inventory:check', '@gachia/router check:generated', 'validate:game-deployments', '@gachia/router type-check', '@gachia/router test']) assert(workflow.includes(check));
});

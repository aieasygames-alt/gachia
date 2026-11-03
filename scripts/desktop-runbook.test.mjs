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
        : ['--repo', '--evidence', '--baseline', '--source', '--main-source'].includes(key) ? '/tmp/runbook-fixture' : sha;
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
  assert.match(text, /publish-source-advance/);
  assert.match(text, /publish-source-recover/);
  assert.match(text, /不延长实时15分钟门禁/);
  assert.match(text, /publish-source-rebind/);
  assert.match(text, /publish-prepare-evidence/);
  assert.match(text, /创建全新尝试/);
  assert.match(text, /productionReady:false/);
  assert.match(text, /原始游戏来源/);
  assert.match(text, /没有“latest”、原始O回退或部署后自动接续/);
  assert.match(text, /仍须为新候选执行assets-refresh、baseline-capture、recovery-local-prepare与全部云门禁/);
  assert.match(text, /保存或 published 不等于公网更新/);
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

test('limited V1 stays on this Mac and separates verified local recovery from independent key custody', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const plan = read('../plans/payload-v1-completion-2026-11-03.md');
  const recovery = read('../docs/payload-offsite-recovery.md');
  const entry = read('../services/content-cms/deploy/desktop.md');
  assert.match(plan, /第二台 Mac、跨机安装\/启动\/迁移不属于限定 V1 验收条件/);
  assert.match(plan, /C05a本机应用恢复实际通过；C05b独立密钥托管待办/);
  assert.match(plan, /原DB摘要不变/);
  assert.match(recovery, /不要求第二台Mac或跨机安装\/启动验收/);
  assert.match(recovery, /C05a已通过/);
  assert.match(recovery, /C05b独立key托管仍待办/);
  assert.match(recovery, /不声称从零重建应用、跨机启动或整机损坏后可恢复/);
  assert(!recovery.includes('### 第二台Mac验收清单'));
  assert.match(text, /Payload CMS只在这台Mac运行，不要求第二台Mac或跨机启动验收/);
  assert.match(entry, /只在这台Mac运行，不要求第二台Mac或跨机启动验收/);
  assert.match(plan, /payload-version-provenance-2026-11-03\.md/);
  assert.match(text, /未知外部UUID仍拒绝/);
});

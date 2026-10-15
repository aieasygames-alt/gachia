import { GAME_DEPLOYMENTS } from '../../../packages/core/deployments.ts';
import { recoveryCoverage } from './storage-lifecycle.mjs';
import { deploymentDiagnostics } from './deployment-diagnostics.mjs';
import { readConfigInput, parseConfigObject, configInputLimit } from './config-input.mjs';

const gateDefinitions = [
  ['baseline', '代码基线审查与授权提交', [], '绑定经审查的提交摘要；当前未提交内容不能当作草案基线。'],
  ['draft', '重建草案并核对精确审核输入', ['baseline'], '在同一基线上重建草案，核对事实、差异和当前审核；历史接受不自动沿用。'],
  ['dependencies', '独立依赖准备与制品校验', ['baseline'], '单独准备并校验依赖和制品闭包；锁文件元数据不等于依赖可运行。'],
  ['preview', '明确执行模式与真实草案预览验收', ['draft', 'dependencies'], '明确非沙箱执行授权并验收原草案；开发快照或固定模板不能替代。'],
  ['build', '完整工作树测试、构建与Worker产物绑定', ['preview'], '测试、构建、Worker包体与精确提交/内容/制品摘要绑定；未实际运行不算通过。'],
  ['staging', '发布锁与预发布页面、资源、Router验收', ['build'], '核验跨进程/CI发布锁，以及真实Worker、Router绑定和公共资源影响。'],
  ['release', '单独正式上线批准', ['staging'], '正式批准必须绑定同一组已验收输入，不由本计划或草案接受授予。'],
  ['reconciliation', '线上版本对账与回滚验收', ['release'], '上线后核对真实版本与路由，按独立授权核验失败处理和回滚。'],
];

const buildAcceptanceChecks = [
  ['input_binding', '输入与制品绑定', '明确提交、内容审核、依赖、工具链和产物摘要；历史构建不自动覆盖当前对象。'],
  ['hydration_recovery', '水合与阻塞恢复', '真实阻塞条件、原始错误、恢复交互及重试活动均需核验；没有报错不等于水合完成。'],
  ['server_body', '服务端正文保留', '同URL、语言、视口、JavaScript策略和User-Agent对照正文；减少重试不能以丢失正文为代价。'],
  ['navigation', '搜索与详情导航', '弹窗内明确关键词、精确同语言目标、详情正文和关闭焦点恢复；不得用背景链接代替搜索结果。'],
  ['artifact_budget', 'Worker与公共资源', '实际最终Worker测量与资源摘要、平台限额和共享影响均需核对；目录大小不等于上传包体。'],
];

function gateSummary(inputs) {
  const items = gateDefinitions.map(([id, title, dependsOn, requirement]) => ({ id, title, dependsOn, requirement,
    status: 'not_verified', reason: '本接口未采集该门禁的当前验收证据；不判定为失败，也不判定为通过。',
    ...(id === 'build' ? { acceptanceChecks: buildAcceptanceChecks.map(([checkId, checkTitle, checkRequirement]) => ({
      id: checkId, title: checkTitle, requirement: checkRequirement, status: 'not_verified',
    })) } : {}) }));
  return { version: 1, result: 'not_assessed_not_release_ready',
    scope: 'fixed_gate_requirements_and_configuration_observation_only',
    currentAcceptanceVerified: false,
    counts: { total: items.length, verified: 0, notVerified: items.length }, items,
    observations: { configuration: { result: inputs.every((item) => item.status === 'read') ? 'fixed_inputs_read_only' : 'incomplete_fixed_inputs',
      read: inputs.filter((item) => item.status === 'read').length, unavailable: inputs.filter((item) => item.status === 'unavailable').length,
      invalid: inputs.filter((item) => item.status === 'invalid').length,
      meaning: '只读取固定配置及摘要，不验证配置有效性、源码闭包、实时部署或绑定。' },
    recovery: { result: recoveryCoverage.result, source: 'code_declared_fixture_coverage_not_current_test_run',
      tableCount: recoveryCoverage.verifiedTables.length, meaning: recoveryCoverage.tableVerificationMeaning,
      notCovered: [...recoveryCoverage.notCovered], permissions: { restore: false, delete: false } } },
    notObserved: ['Git HEAD/工作树与真实草案状态', '历史报告时效及输入摘要匹配', '本次测试/构建执行结果', '依赖/工作区/进程状态', '线上Worker/Router/资源/权限'],
    next: { gateId: 'baseline', action: '先只读审查当前基线及差异；实际提交需要单独授权，不由本接口执行。' },
    permissions: { execute: false, install: false, commit: false, publish: false, restore: false, delete: false },
    warning: '门禁未核验不等于检测到失败；配置读取或合成恢复覆盖不等于当前草案验收通过。' };
}

export function releasePlan(root) {
  const inputs = []; const commands = {}; const configTexts = {};
  for (const path of ['apps/web/package.json', 'apps/router/package.json', 'packages/core/deployments.ts', 'apps/web/wrangler.jsonc', 'apps/router/wrangler.jsonc']) {
      const observed = readConfigInput(root, path);
      const { text, ...metadata } = observed;
      const input = { path, ...metadata }; inputs.push(input);
      if (input.status !== 'read') continue;
      if (path === 'apps/web/wrangler.jsonc') configTexts.web = text;
      if (path === 'apps/router/wrangler.jsonc') configTexts.router = text;
      if (path.endsWith('package.json')) {
        try {
          const parsed = parseConfigObject(text);
          if (parsed.status !== 'parsed') { input.status = 'invalid'; input.reason = parsed.reason; continue; }
          const value = parsed.value;
          if (!value || typeof value !== 'object' || Array.isArray(value) ||
            (value.scripts !== undefined && (!value.scripts || typeof value.scripts !== 'object' || Array.isArray(value.scripts) ||
              Object.values(value.scripts).some((command) => typeof command !== 'string')))) throw new Error('Invalid package scripts');
          commands[path] = value.scripts ?? {};
        } catch { input.status = 'invalid'; input.reason = 'invalid_package_json_or_scripts'; }
      }
  }
  const deployment = GAME_DEPLOYMENTS.hi3 ?? { deployment: 'main', worker: 'gachia', status: 'not_live_verified' };
  return { version: 2, gameId: 'hi3', result: 'planning_only_not_release_ready', gateSummary: gateSummary(inputs),
    deployment, configurationDiagnostics: deploymentDiagnostics(configTexts, deployment),
    inputBinding: { result: 'same_read_bytes_for_digest_and_parsing_not_atomic_snapshot', maxBytesPerFile: configInputLimit,
      followsSymlinks: false, hardTimeLimit: false, warning: '逐文件有界读取；不是跨文件原子快照，也不保证抵御恶意父目录并发替换。' },
    scope: 'fixed_HI3_static_configuration_not_live_cloud_state', inputs, commands,
    impact: ['HI3三语页面/源与公共镜像', '主站共享JS/CSS与搜索索引/OG/sitemap', 'Router路由/绑定需单独检查，不推定已生效', '主Worker共享产物可能影响其他游戏'],
    gates: ['精确内容审核与commit/产物digest绑定', '完整工作树测试/构建及Worker包体', '单通道跨进程/CI发布锁', '预发布真实页面/资源/路由验收', '单独正式上线批准', '线上版本对账与失败/回滚计划'],
    notCovered: ['锁/构建/上传/切流实际执行', '部署环境/绑定/权限/实时版本核验', '构建产物闭包与全部影响文件', '生产与回滚验收'],
    permissions: { execute: false, upload: false, publish: false, rollback: false } };
}

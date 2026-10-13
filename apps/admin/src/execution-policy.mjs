import { accessSync, constants, statSync } from 'node:fs';
import { executionLaunchProtocol, targetExecutionBudget } from './execution-protocol.mjs';
import { isolationIntegrationReport } from './isolation-integration.mjs';

const candidates = [
  { runtime: 'docker', path: '/usr/local/bin/docker' },
  { runtime: 'docker', path: '/opt/homebrew/bin/docker' },
  { runtime: 'docker', path: '/usr/bin/docker' },
  { runtime: 'podman', path: '/opt/homebrew/bin/podman' },
  { runtime: 'podman', path: '/usr/local/bin/podman' },
  { runtime: 'podman', path: '/usr/bin/podman' },
];

export function executionPolicy({ inspect = (path) => {
  accessSync(path, constants.X_OK);
  return statSync(path).isFile();
}, platform = process.platform } = {}) {
  const runtimes = candidates.map((candidate) => {
    try { return { ...candidate, executablePresent: inspect(candidate.path) === true }; }
    catch { return { ...candidate, executablePresent: false }; }
  });
  return { version: 'execution-policy-v1', platform, checkedAt: new Date().toISOString(),
    probe: 'fixed_path_filesystem_only', runtimes,
    limitations: ['仅检查固定路径可执行文件，不遍历PATH', '不执行运行时、不查询daemon、不验证版本/虚拟机/网络/配额', '发现命令不等于隔离可用'],
    defaultMode: 'disabled', launchProtocol: executionLaunchProtocol(), integration: isolationIntegrationReport({ platform }),
    modes: {
      disabled: { available: true, executesCode: false },
      legacy_trusted_local: { available: true, executesCode: true, sandboxed: false, requiresRiskConfirmation: true,
        effectiveLimits: { concurrency: 1, nodeHeapMiB: 1024, hardMemory: false, hardCpu: false, hardDisk: false, filesystemIsolation: false, networkIsolation: false } },
      isolated_linux: { available: false, executesCode: false, reasons: ['完整执行材料与Linux依赖制品未验证', '控制面租约基础已实现，但未接入准备器/执行适配器，待对账不可自动释放', '文件/网络/资源隔离未实测'],
        targetLimits: { ...targetExecutionBudget }, targetLimitsEffective: false },
    } };
}

export function executionMode(input) {
  const mode = input?.executionMode ?? 'disabled';
  if (mode !== 'legacy_trusted_local') throw new Error(mode === 'isolated_linux'
    ? '隔离执行尚未实现或验收，拒绝启动；不会自动降级到本机执行'
    : '默认禁止代码执行；请明确选择可信本机非沙箱模式');
  return mode;
}

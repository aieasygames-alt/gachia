import { createHash } from 'node:crypto';
import { FactError } from './facts.mjs';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function dependencyPlanIdentity(plan) {
  return Object.fromEntries(['version', 'materialId', 'materialDigest', 'reviewId', 'packetDigest', 'lockSha256',
    'image', 'platform', 'nodeVersion', 'pnpmVersion', 'sourceUrl', 'note', 'preparationPolicy'].map((key) => [key, plan[key]]));
}

export function dependencyPreparationReport(material, plan) {
  const blockers = [];
  const add = (code, detail) => blockers.push({ code, detail });
  const lock = material.manifest.files.find((file) => file.path === 'pnpm-lock.yaml');
  const bindingCurrent = material.assessment?.status === 'current' && plan.materialId === material.id &&
    plan.materialDigest === material.manifest.digest && plan.reviewId === material.reviewId &&
    plan.packetDigest === material.packetDigest && !!lock && plan.lockSha256 === lock.sha256 &&
    plan.digest === digest(dependencyPlanIdentity(plan));
  if (!bindingCurrent) add('stale_binding', '材料、审核、锁文件或计划摘要已变化/不可核验');
  for (const [key, label] of [['inputScope', '静态输入范围'], ['dependencyScope', '锁依赖范围']]) {
    const report = material[key];
    if (!report || report.materialDigest !== material.manifest.digest) add(`${key}_unchecked`, `${label}缺失或摘要不匹配`);
    else {
      if (report.status !== 'partial_pass') add(`${key}_issues`, `${label}存在问题，必须先处理`);
      add(`${key}_incomplete`, `${label}仅为局部检查，未覆盖项必须由准备器验证`);
    }
  }
  if (material.dependencyScope?.omittedImporters?.length) add('workspace_install_scope', '冻结材料未包含全部锁importer，不能直接视为全workspace安装输入');
  if (material.manifest.sourceExclusions?.length) add('excluded_runtime_inputs', '排除文件的运行时影响尚未验证');
  // Claimed validation flags cannot supply evidence: no trusted preparer exists yet.
  add('image_unverified', '镜像存在性、平台、签名/来源与实际Node/pnpm版本均未核验');
  add('artifacts_unverified', '依赖制品字节、安装日志摘要和Linux原生模块结果缺失');
  add('preparer_unimplemented', '准备器及独立授权、跨实例租约、预算和恢复尚未实现');
  add('isolation_untested', 'OS隔离及资源/网络/文件边界未实测');
  return { version: 'dependency-preparation-readiness-v1', materialId: material.id, planId: plan.id, planDigest: plan.digest,
    status: bindingCurrent ? 'blocked_unverified' : 'stale', bindingCurrent, blockers,
    capabilities: { exportContract: bindingCurrent, prepare: false, execute: false, publish: false } };
}

export function dependencyPreparationContract(material, plan) {
  const readiness = dependencyPreparationReport(material, plan);
  if (!readiness.bindingCurrent) throw new FactError('材料或计划绑定已失效，不能导出当前准备契约', 409);
  const contract = { version: 'linux-dependency-preparer-contract-v1', purpose: 'specification_only',
    inputs: { planId: plan.id, planDigest: plan.digest, identity: dependencyPlanIdentity(plan),
      sourceFiles: material.manifest.files, sourceExclusions: material.manifest.sourceExclusions ?? [],
      scopes: { input: material.inputScope ?? null, dependencies: material.dependencyScope ?? null } },
    requiredOutputs: ['Exact input plan/material/packet/lock digest echo', 'Observed immutable image digest, Linux platform and Node/pnpm versions',
      'Dependency artifact manifest with paths, bytes, modes and SHA-256; actual artifact verification evidence',
      'Preparation policy and effective budgets, isolated instance identity and ownership',
      'Sanitized build-log SHA-256, native-module/platform test results and uncovered scope',
      'Lifecycle outcome: completed, failed, cancelled or needs_reconciliation; never infer success from missing output'],
    requirements: { separateAuthorization: true, crossProcessLease: true, isolatedPreparation: true,
      lifecycleScripts: 'disabled', hostDependencies: 'forbidden', hostCredentials: 'forbidden',
      network: 'deny_by_default_requires_separate_allowlist_authorization', runtimeInstall: 'forbidden',
      outputValidation: 'trusted_adapter_must_verify_artifact_bytes_not_accept_user_claims' },
    readiness, capabilities: { prepare: false, execute: false, publish: false } };
  return { ...contract, digest: digest(contract) };
}

export function validateDependencyPlan(input, material, packageJson) {
  const text = (key, max = 300) => {
    if (typeof input?.[key] !== 'string' || !input[key].trim() || input[key].length > max) throw new FactError(`Invalid dependency plan field: ${key}`);
    return input[key].trim();
  };
  if (input.confirmPlanOnly !== true) throw new FactError('必须确认仅记录计划，不下载或执行');
  const image = text('image');
  if (!/^[a-z0-9][a-z0-9.-]*(?::[0-9]{1,5})?\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(image) || image.includes('..') || image.includes('//')) throw new FactError('镜像必须为完整registry/repository@sha256摘要，不接受tag或凭据');
  const platform = text('platform', 30);
  if (!['linux/arm64', 'linux/amd64'].includes(platform)) throw new FactError('仅支持显式linux/arm64或linux/amd64计划');
  const nodeVersion = text('nodeVersion', 30); const pnpmVersion = text('pnpmVersion', 30);
  const exact = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  if (!exact.test(nodeVersion) || !exact.test(pnpmVersion)) throw new FactError('Node/pnpm必须填写精确版本，不接受范围或浮动版本');
  const [major, minor] = nodeVersion.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 18)) throw new FactError('计划Node版本必须至少22.18.0');
  let pkg; try { pkg = JSON.parse(packageJson); } catch { throw new FactError('冻结根package.json无法解析', 409); }
  if (pkg?.packageManager !== `pnpm@${pnpmVersion}`) throw new FactError('pnpm版本必须与冻结packageManager完全一致', 409);
  const sourceUrl = text('sourceUrl', 1000);
  let url; try { url = new URL(sourceUrl); } catch { throw new FactError('镜像来源必须为HTTPS链接'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new FactError('来源仅允许无凭据、查询参数和fragment的HTTPS链接');
  const note = text('note', 1000);
  const lock = material.manifest.files.find((file) => file.path === 'pnpm-lock.yaml');
  if (!lock) throw new FactError('冻结锁文件缺失', 409);
  const identity = { version: 'linux-dependency-plan-v1', materialId: material.id, materialDigest: material.manifest.digest,
    reviewId: material.reviewId, packetDigest: material.packetDigest, lockSha256: lock.sha256,
    image, platform, nodeVersion, pnpmVersion, sourceUrl: url.href, note,
    preparationPolicy: { scripts: 'disabled', hostDependencies: 'forbidden', hostCredentials: 'forbidden', runtimeNetwork: 'disabled', runtimeInstall: 'forbidden' } };
  return { ...identity, digest: digest(identity), status: 'planned_unverified',
    validation: { status: 'metadata_valid_only', artifactVerified: false, imageInspected: false, linuxTested: false },
    notCovered: ['Image existence, registry trust, signature and actual digest/platform/version verification', 'Dependency artifact bytes, preparation logs and Linux native module tests', 'Complete installation closure, OS isolation and execution authorization'],
    capabilities: { prepare: false, execute: false, publish: false } };
}

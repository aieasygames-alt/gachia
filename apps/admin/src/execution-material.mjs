import { readdirSync, lstatSync, mkdirSync, writeFileSync, realpathSync, chmodSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { FactError } from './facts.mjs';
import { inspectExecutionInputs } from './execution-inputs.mjs';
import { inspectExecutionDependencies } from './execution-dependencies.mjs';
import { validateDependencyPlan, dependencyPreparationReport, dependencyPreparationContract } from './dependency-plan.mjs';
import { stagingMountContract } from './staging-contract.mjs';
import { readBoundedFile } from './bounded-file.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const excluded = new Set(['.git', 'node_modules', '.next', '.gachia-workbench', '.wrangler', '.open-next', '.turbo', 'coverage']);
const roots = ['apps/web', 'packages', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json'];
const secretName = (name) => /^\.env(?:\.|$)/.test(name) || /^(?:\.npmrc|\.netrc|\.pypirc|id_rsa|id_ed25519|credentials|.*\.(?:pem|key|p12|pfx))$/i.test(name);
const templatePath = 'apps/web/.env.example';
const templateReason = '环境模板不进入执行材料；排除不证明其无凭据，也不证明运行时不需要此文件。';

const readOrdinary = readBoundedFile;

export function captureExecutionMaterial(root, { maxFiles = 20000, maxBytes = 256 * 1024 * 1024, excludeEnvironmentTemplate = false } = {}) {
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 20000 ||
    !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 256 * 1024 * 1024 ||
    typeof excludeEnvironmentTemplate !== 'boolean') throw new FactError('冻结材料预算或排除参数无效', 400);
  root = realpathSync(root);
  const files = []; const sourceExclusions = []; let totalBytes = 0;
  function visit(path, required = false) {
    const absolute = join(root, path); let stat;
    try { stat = lstatSync(absolute); } catch (error) { if (error.code === 'ENOENT' && !required) return; throw error; }
    if (stat.isSymbolicLink() || realpathSync(absolute) !== absolute) throw new FactError(`冻结材料拒绝符号链接: ${path}`, 409);
    if (excludeEnvironmentTemplate && path === templatePath) {
      if (!stat.isFile() || stat.size > maxBytes) throw new FactError('排除候选必须是预算内普通文件', 409);
      const bytes = readOrdinary(absolute, maxBytes);
      sourceExclusions.push({ path, bytes: bytes.length, sha256: sha(bytes), reason: templateReason });
      return;
    }
    if (secretName(path.split('/').at(-1))) throw new FactError(`冻结材料含凭据候选文件: ${path}`, 409);
    if (stat.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) {
        if (excluded.has(name)) continue;
        visit(`${path}/${name}`, true);
      }
    } else {
      if (!stat.isFile() || stat.size > maxBytes || files.length >= maxFiles || totalBytes + stat.size > maxBytes) throw new FactError('冻结材料类型或文件/字节预算超限', 409);
      const bytes = readOrdinary(absolute, maxBytes - totalBytes);
      totalBytes += bytes.length;
      if (totalBytes > maxBytes) throw new FactError('冻结读取期间超出预算', 409);
      files.push({ path, bytes: bytes.length, sha256: sha(bytes), mode: stat.mode & 0o111 ? 0o555 : 0o444 });
    }
  }
  for (const path of roots) visit(path, ['apps/web', 'packages', 'package.json', 'pnpm-lock.yaml'].includes(path));
  const contentDigest = sha(JSON.stringify(files));
  return { version: 'execution-source-v2', roots, excluded: [...excluded], files, totalBytes, sourceExclusions, contentDigest,
    digest: sha(JSON.stringify({ contentDigest, sourceExclusions })), dependenciesIncluded: false,
    notCovered: ['Linux依赖镜像及其摘要', 'OS隔离', '运行时镜像', '未列入roots的执行输入', '非标准文件名或源码内嵌凭据的完整检测'],
    executable: false };
}

export function executionMaterialService(dataDir, store, workspaces, { afterCopy = () => {} } = {}) {
  const directory = resolve(realpathSync(dataDir), 'execution-materials');
  function context(input) {
    if (typeof input?.reviewId !== 'string') throw new FactError('Review ID required');
    const review = workspaces.acceptedReview(input.reviewId);
    const workspace = store.workspaces().find((item) => item.id === review.workspaceId);
    if (!workspace) throw new FactError('Workspace not found', 404);
    const source = realpathSync(workspace.path);
    if (source !== workspace.path) throw new FactError('工作区不能是符号链接', 409);
    return { review, source };
  }
  function proposal(review, manifest) {
    return { version: 'source-exclusions-v1', reviewId: review.id, packetDigest: review.packetDigest,
      materialDigest: manifest.digest, exclusions: manifest.sourceExclusions,
      digest: sha(JSON.stringify({ reviewId: review.id, packetDigest: review.packetDigest, materialDigest: manifest.digest })),
      executable: false };
  }
  function assess(record) {
    const reasons = [];
    if (record.status !== 'frozen_source_only') reasons.push('冻结未完成或失败');
    try {
      const review = workspaces.acceptedReview(record.reviewId);
      if (review.packetDigest !== record.packetDigest) reasons.push('草案审核已变化');
      const current = captureExecutionMaterial(record.path);
      if (current.contentDigest !== (record.manifest.contentDigest ?? record.manifest.digest)) reasons.push('冻结副本清单已变化');
    } catch { reasons.push('草案审核或冻结副本不可核验'); }
    const material = { ...record, assessment: { status: reasons.length ? 'stale' : 'current', reasons } };
    return { ...material, dependencyPlans: (record.dependencyPlans ?? []).map((plan) => {
      const readiness = dependencyPreparationReport(material, plan);
      return { ...plan, readiness, assessment: { status: readiness.bindingCurrent ? 'current' : 'stale',
        meaning: '仅表示计划绑定仍匹配；制品和隔离均未验证' } };
    }),
      capabilities: { execute: false, publish: false } };
  }
  return { list: () => store.executionMaterials().map(assess), prepareExclusions(input) {
    const { review, source } = context(input);
    const manifest = captureExecutionMaterial(source, { excludeEnvironmentTemplate: true });
    if (workspaces.acceptedReview(review.id).packetDigest !== review.packetDigest) throw new FactError('审核已变化', 409);
    return proposal(review, manifest);
  }, stagingContract(input) {
    const record = store.executionMaterials().find((item) => item.id === input?.materialId);
    if (!record) throw new FactError('冻结材料不存在', 404);
    const material = assess(record);
    const plan = material.dependencyPlans.find((item) => item.id === input?.planId);
    if (!plan) throw new FactError('依赖计划不存在', 404);
    return stagingMountContract(material, plan);
  }, preparationContract(input) {
    const record = store.executionMaterials().find((item) => item.id === input?.materialId);
    if (!record) throw new FactError('冻结材料不存在', 404);
    const material = assess(record);
    const plan = material.dependencyPlans.find((item) => item.id === input?.planId);
    if (!plan) throw new FactError('依赖计划不存在', 404);
    return dependencyPreparationContract(material, plan);
  }, recordDependencyPlan(input) {
    const record = store.executionMaterials().find((item) => item.id === input?.materialId);
    if (!record) throw new FactError('冻结材料不存在', 404);
    if (assess(record).assessment.status !== 'current') throw new FactError('冻结材料或审核已过期', 409);
    const file = record.manifest.files.find((item) => item.path === 'package.json');
    if (!file) throw new FactError('冻结根package.json缺失', 409);
    const path = join(record.path, file.path);
    if (realpathSync(path) !== path) throw new FactError('冻结路径已变化', 409);
    const bytes = readOrdinary(path, file.bytes);
    if (sha(bytes) !== file.sha256) throw new FactError('冻结根package.json已变化', 409);
    const plan = validateDependencyPlan(input, record, bytes.toString('utf8'));
    record.dependencyPlans ??= [];
    const existing = record.dependencyPlans.find((item) => item.digest === plan.digest);
    if (existing) return { material: assess(record), plan: existing, duplicate: true };
    if (record.dependencyPlans.length >= 20) throw new FactError('每份材料最多记录20个计划，不覆盖旧记录', 409);
    if (assess(record).assessment.status !== 'current') throw new FactError('记录前材料或审核已变化', 409);
    const saved = { ...plan, id: randomUUID(), createdAt: new Date().toISOString() };
    record.dependencyPlans.push(saved); store.saveExecutionMaterial(record);
    return { material: assess(record), plan: saved, duplicate: false };
  }, freeze(input) {
    if (input?.confirmSourceOnly !== true || typeof input.reviewId !== 'string') throw new FactError('必须确认仅冻结源材料，不安装依赖或执行代码');
    const { review, source } = context(input);
    const hasExclusions = input.confirmExclusions === true;
    if (!hasExclusions && input.exclusionDigest !== undefined) throw new FactError('排除清单必须单独确认');
    const captureOptions = { excludeEnvironmentTemplate: hasExclusions };
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (realpathSync(directory) !== directory) throw new FactError('冻结材料目录不能是符号链接', 409);
    const manifest = captureExecutionMaterial(source, captureOptions);
    const exclusionReview = hasExclusions ? proposal(review, manifest) : null;
    if (hasExclusions && input.exclusionDigest !== exclusionReview.digest) throw new FactError('排除清单或源材料已变化，请重新检查并确认', 409);
    const id = randomUUID(); const destination = join(directory, id);
    if (!relative(source, destination).startsWith(`..${sep}`)) throw new FactError('冻结输出不得位于源工作区内', 409);
    mkdirSync(destination, { mode: 0o700 });
    const record = { id, reviewId: review.id, packetDigest: review.packetDigest, workspaceId: review.workspaceId,
      path: destination, createdAt: new Date().toISOString(), status: 'preparing', manifest,
      exclusionReview: exclusionReview ? { ...exclusionReview, confirmedAt: new Date().toISOString() } : null };
    store.saveExecutionMaterial(record);
    try {
      for (const file of manifest.files) {
        const inputPath = join(source, file.path);
        if (realpathSync(inputPath) !== inputPath) throw new Error('Input path changed');
        const bytes = readOrdinary(inputPath, file.bytes);
        if (sha(bytes) !== file.sha256) throw new Error('Input changed');
        const output = join(destination, file.path); mkdirSync(join(output, '..'), { recursive: true, mode: 0o700 });
        writeFileSync(output, bytes, { flag: 'wx', mode: file.mode }); chmodSync(output, file.mode);
      }
      afterCopy();
      if (captureExecutionMaterial(source, captureOptions).digest !== manifest.digest || captureExecutionMaterial(destination).contentDigest !== manifest.contentDigest) throw new Error('Manifest drift');
      const contents = new Map();
      for (const file of manifest.files) {
        if (!/\.(?:json|yaml|[cm]?[jt]sx?)$/.test(file.path)) continue;
        const path = join(destination, file.path);
        if (realpathSync(path) !== path) throw new Error('Inspection path changed');
        const bytes = readOrdinary(path, file.bytes);
        if (sha(bytes) !== file.sha256) throw new Error('Inspection input changed');
        contents.set(file.path, bytes.toString('utf8'));
      }
      record.inputScope = inspectExecutionInputs(manifest, contents);
      record.dependencyScope = inspectExecutionDependencies(manifest, contents);
      if (captureExecutionMaterial(destination).contentDigest !== manifest.contentDigest || captureExecutionMaterial(source, captureOptions).digest !== manifest.digest) throw new Error('Inspection manifest drift');
      if (workspaces.acceptedReview(review.id).packetDigest !== review.packetDigest) throw new Error('Review drift');
      record.status = 'frozen_source_only';
    } catch {
      record.status = 'failed'; record.message = '复制期间输入、审核或输出变化；保留失败副本供对账，不允许执行。';
    }
    store.saveExecutionMaterial(record); return assess(record);
  } };
}

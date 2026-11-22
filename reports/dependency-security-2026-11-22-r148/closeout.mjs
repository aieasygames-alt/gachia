// Derive a receipt after the fixed R148 executor completes. No cloud or CMS writer.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statfsSync } from 'node:fs';
import path from 'node:path';
import { migrationPinned } from '../../scripts/genshin-migration-http.mjs';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { PUBLIC_DEPENDENCY_POLICY } from '../../scripts/public-runtime-history.mjs';
const root = import.meta.dirname, repo = path.resolve(root, '../..');
const load = file => JSON.parse(readFileSync(path.join(root, file)));
const proof = file => ({ path: path.join(root, file), pin: digest(readFileSync(path.join(root, file))) });
const save = (file, value) => writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const c = load('completion.json'), s = load('sealed.json'), indexProof = load('source-result.json');
const index = migrationPinned(indexProof), ci = load('ci-final.json'), browser = load('browser-acceptance.json');
assert.equal(c.status, 'production_accepted'); assert.equal(c.policy, PUBLIC_DEPENDENCY_POLICY);
assert.equal(ci.headSha, c.commit); assert.equal(ci.conclusion, 'success'); assert.equal(ci.status, 'completed');
assert.equal(index.sourceCommit, c.commit); assert.deepEqual(index.completion, proof('completion.json'));
assert.equal(index.owners.main.versionId, c.accepted.main.candidate.versionId);
assert.equal(browser.status, 'passed'); assert.equal(browser.browser.length, 18);
assert.equal(load('cms-final-proof.json').records, 2966);
assert.equal(load('installed-reader-boundary.json').installedPolicySupported, false);
const portability = load('artifact-portability.json'), cleanup = load('cleanup.json'), frozen = load('cleanup-source-verification.json');
assert.equal(portability.status, 'passed'); assert.equal(portability.owners.length, 5);
assert(portability.owners.every(owner => owner.allInternalAndResolved && owner.links.length === 19));
assert.equal(frozen.sourceFilesUnchanged, true); assert.equal(frozen.manifestsPassed, true); assert.equal(frozen.sources, 115);
assert.equal(cleanup.contentOrWorkerWrites, 0); assert(cleanup.freeAfterGiB >= 8);
const journal = readFileSync(path.join(root, 'production.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.deepEqual(journal.map(row => row.phase), ['deployment_intent', 'deployed', 'production_accepted']);
const jsonCount = load('json-preservation.json').rows.reduce((sum, row) => sum + row.count, 0); assert.equal(jsonCount, 449);
const references = role => migrationPinned(s.owners.main[role].local).length;
const checks = p => migrationPinned(p).observations.length;
const fresh = role => {
  const x = load('fresh-main-' + role + '/result.json');
  assert.equal(x.status, 'passed'); assert.equal(x.preview, true);
  assert.equal(x.observations.length, checks(c.accepted.main[role].preview));
  return x.observations.length;
};
for (const name of ['accounts-candidate-local.json','accounts-recovery-local.json','accounts-candidate-preview.json','accounts-recovery-preview.json','accounts-production.json']) {
  const x = load(name); assert.equal(x.accountFeatures, false); assert.equal(x.checks.length, 14);
  assert(x.checks.every(row => row.status === 404));
}
const previous = migrationPinned(index.previousSourceIndex);
for (const owner of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) assert.deepEqual(index.owners[owner], previous.owners[owner]);
assert.equal(c.accepted.main.recovery.moduleSHA256, previous.owners.main.moduleSHA256);
const available = statfsSync(root);
const result = {
  batch: 'R148', status: 'production_complete', at: new Date().toISOString(), implementationCommit: c.commit,
  executorCI: c.executorCI, ciURL: ci.url, targets: c.dependencyVersions,
  deployed: { owner: 'main', service: 'gachia', versionId: index.owners.main.versionId,
    deploymentId: c.deployments.main.deploymentId, moduleSHA256: index.owners.main.moduleSHA256,
    recoveryVersionId: c.accepted.main.recovery.versionId },
  counts: { publicJSONPreserved: jsonCount, contentSources: 115, contentChanges: 0, cmsContentWrites: 0, schemaMigrations: 0,
    workerUploads: 2, productionDeployments: 1, toolchainBuilds: 5, browserScenarios: browser.browser.length,
    candidateLocal: references('candidate'), recoveryLocal: references('recovery'),
    candidateCloud: checks(c.accepted.main.candidate.preview), recoveryCloud: checks(c.accepted.main.recovery.preview),
    freshCandidate: fresh('candidate'), freshRecovery: fresh('recovery'),
    publicMain: checks(c.publicProofs.main), publicAggregate: checks(c.aggregate),
    localAggregate: migrationPinned(s.graph).length },
  sourceIndex: indexProof, cmsAfter: { path: path.join(repo, 'reports/genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz'), pin: 'b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20' },
  cmsObserved: proof('cms-final-proof.json'), installedReader: proof('installed-reader-boundary.json'),
  preserved: { games: Object.fromEntries(['genshin','nte','azur-promilia','lvmeng'].map(owner => [owner,index.owners[owner].versionId])),
    router: true, staging: true, accountFeatures: false, lvmengLocales: ['zh'], residentCMS: 'R147' },
  validation: { local: proof('local-validation.json'), browser: proof('browser-acceptance.json'), json: proof('json-preservation.json'),
    security: proof('security-assessment.json'), completed: proof('completion.json'), currentModule: proof('published-runtime-version.json'),
    artifactPortability: proof('artifact-portability.json'), generatedCacheCleanup: proof('cleanup.json'), frozenSourceAfterCleanup: proof('cleanup-source-verification.json') },
  diskFreeGiB: Number((available.bavail * available.bsize / 2**30).toFixed(2)),
  next: 'Install the CI-verified R148 preserved-runtime policy reader in the resident CMS, preserving R144 AFTER and R147 application recovery. No public content or Worker redeploy is needed.',
  doNotReplay: ['R140 drafts','R141 structural staging','R142 review','R143 content deploy','R144 editing source sync','R145 CMS upgrade','R146 public runtime rollout','R147 CMS installation','R148 Main security deployment'],
};
save('delivery.json', result);
save('STATUS.json', { batch: 'R148', status: result.status, implementationCommit: c.commit, ciRunID: c.executorCI.runID,
  sourceIndex: indexProof, workerUploads: 2, productionDeployments: 1, contentChanges: 0, cmsWrites: 0,
  next: result.next, diskFreeGiB: result.diskFreeGiB });
const text = `# R148：剩余依赖安全修复及主站单 Worker 发布完成

Better Auth/core/adapter/telemetry 已从 **1.6.22 → 1.7.7**，qs **6.16.1**、glob **14.0.2**、minimatch **11.0.1** 已锁定。17 个新增或升级的官方 tarball integrity 已验证；本次全仓、生产依赖及独立 CMS 当前公告扫描均为 **0**，没有 ignore 或隐藏告警。CMS 的旧 deepmerge 公告已于 2026-11-16 被官方撤回，不是本批依赖升级；原风险记录已补充官方复核。账号功能保持关闭，未执行公网账号登录或 auth 数据库迁移。

主站正式版本 **\`${result.deployed.versionId}\`**，deployment **\`${result.deployed.deploymentId}\`**，100% 流量；兼容恢复 **\`${result.deployed.recoveryVersionId}\`** 已验收，未真实回滚。精确实现/编译/执行源码 **\`${c.commit}\`** 的[完整 CI ${c.executorCI.runID}](${ci.url})成功。Next 15.5.29、OpenNext 1.20.13、Wrangler 4.148.0 及 deferred-initial patch 保持；四个游戏、Router、四个 staging 和 R147 常驻 CMS 安装保持。

五个应用均用冻结的正式 R146 内容完成标准 OpenNext 构建，449 份公开 JSON 清单、值与字节 SHA256 全部保持。600 项 Web、44 项聚焦 auth、4 项工具链安全/兼容测试、20 项来源合同、全公开消费者类型和发布工具测试通过；glob promise/stream 中止后不再继续读取，真实 node-minify/ESLint 与 qs 异常输入均验证。首次工具链测试调用 node-minify 导出方式错误，已修正测试为其真实函数入口后通过；原失败日志保留，没有修改上游实现。CMS 只读捕获脚本初次相对路径错误在登录前停止，修正后通过，原失败日志保留。

候选/恢复本机 HTTP **${result.counts.candidateLocal}/${result.counts.recoveryLocal}** 项、聚合 **${result.counts.localAggregate}** 项，18 个桌面/手机、三语、有/无 JavaScript 和延迟脚本浏览器场景通过。候选/恢复精确 UUID 云预览 **${result.counts.candidateCloud}/${result.counts.recoveryCloud}** 项及切流前同规模复验通过；正式 Main **${result.counts.publicMain}** 项和聚合 **${result.counts.publicAggregate}** 项通过。本机聚合使用精确已发布 Router 模块的 HTTP binding bridge 调用真实 workerd，没有声称 Router 自身在 workerd 执行。账号禁用接口在本机候选/恢复、云候选/恢复和正式站均验证；没有创建/刷新公网账号 cookie。

实际已发布模块包含 Better Auth 1.7.7，旧 1.6.22 版本标识消失；恢复模块与发布前 Main 精确摘要一致，并保留新旧静态资源。内容来源 115 份完全保持，胡桃、异环/Zero/27 材料与 441 引用删除状态、攻略增量和 R143 完整集合保留。真实 CMS 2,966 条 draft/published 经稳定双读仍与 R144 AFTER 一致。**本批 0 CMS 内容/审核写入、0 编辑源同步、0 schema 迁移、2 个 Main 版本上传、1 次 Main 正式部署。**

唯一正式接续入口：[published-sources/source-index.json](published-sources/source-index.json)，pin **\`${indexProof.pin}\`**。真实工作区读取器已重开 115 来源、五 owner，allOwnersCurrent=true。CMS 编辑源继续 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin \`${result.cmsAfter.pin}\`，不得重放既有写入或 R148 部署。

五份构建制品各 19 条符号链接均在制品内部且可解析；正式来源推进后只清理本批可再生成的依赖/构建缓存，冻结源码、115 来源和派生清单再次验证保持。详见 artifact-portability.json、cleanup.json、cleanup-source-verification.json；候选、恢复与全部发布证据保留。

R147 常驻 CMS 的旧来源合同尚不识别本次 Main 专用依赖升级 policy；直接调用已安装合同已确认拒绝，详见 installed-reader-boundary.json。这是下一批的安装任务，不能用工作区通过冒充已安装版已接通。下一批安装已通过 CI 的新合同，保持内容、审核、媒体、依赖和应用恢复能力；无需重发任何公开内容。绿梦保持中文。可用约 **${result.diskFreeGiB} GiB**；后续完整游戏构建继续 14 GiB 标准、8 GiB 保留线。
`;
writeFileSync(path.join(root, 'EXECUTION.md'), text);
const plan = path.join(repo, 'plans/payload-all-content-implementation-2026-11-05.md');
const previousPlan = readFileSync(plan, 'utf8');
assert(previousPlan.startsWith('# Payload 全内容实施队列\n\n## 当前完成状态（2026-11-22 R147'));
const section = `## 当前完成状态（2026-11-22 R148：剩余依赖安全修复及 Main 单 Worker 正式更新）

Better Auth/core/adapter/telemetry **1.7.7**、qs **6.16.1**、glob **14.0.2**、minimatch **11.0.1** 已固定；官方 17 tarball integrity 核验通过，当前全仓/生产依赖与独立 CMS audit 均 0 公告。五应用标准 OpenNext 构建通过，449 公开 JSON 和 115 内容来源逐字节保持。精确源码 \`${c.commit.slice(0,7)}\` 的[完整 CI ${c.executorCI.runID}](${ci.url})通过，Main 候选/兼容恢复、本机/云预览/公网与 18 浏览器场景通过。

Main 正式版本 \`${result.deployed.versionId}\`，100%；仅 2 个 Main 版本上传、1 次正式部署，四个游戏、Router、四个 staging 保持。Next/OpenNext/patch 保持，账号关闭、绿梦中文。2,966 CMS draft/published 仍与 R144 AFTER 一致；0 内容/审核/编辑源同步或 schema 写入。见 [R148 完成回执](../reports/dependency-security-2026-11-22-r148/EXECUTION.md)和[交付索引](../reports/dependency-security-2026-11-22-r148/delivery.json)。

正式接续使用 [R148 来源](../reports/dependency-security-2026-11-22-r148/published-sources/source-index.json)，pin \`${indexProof.pin}\`，工作区真实读取器已重开、allOwnersCurrent=true；CMS 仍用 R144 AFTER，pin \`${result.cmsAfter.pin}\`。下一批先把已通过 CI 的 R148 新 Main policy 读取合同安装到常驻 CMS：当前 R147 安装版对此 policy 明确拒绝，不能宣称已接通。保持内容/审核/媒体和依赖；无需重发公开内容，不重放 R140–R148 已完成操作。可用约 ${result.diskFreeGiB} GiB，后续完整构建继续 14 GiB 标准/8 GiB 保留线。

`;
writeFileSync(plan, '# Payload 全内容实施队列\n\n' + section + previousPlan.slice('# Payload 全内容实施队列\n\n'.length).replace(/^## 当前完成状态/,'## 前批完成状态'));
console.log(JSON.stringify({ completed: true, deployed: result.deployed, counts: result.counts, sourceIndex: indexProof }));

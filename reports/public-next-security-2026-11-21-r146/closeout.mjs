// Derive the completion receipt only after the fixed production executor and
// source reader have completed. This script performs no cloud or CMS writes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { migrationPinned, migrationSave } from '../../scripts/genshin-migration-http.mjs';
const root = import.meta.dirname;
const load = name => JSON.parse(readFileSync(root + '/' + name));
const proof = name => ({ path: root + '/' + name, pin: digest(readFileSync(root + '/' + name)) });
const c = load('completion.json'), s = load('sealed.json'), q = load('local-qualification.json');
const nextSource = load('source-result.json'), index = migrationPinned(nextSource);
assert.equal(c.status, 'production_accepted'); assert.equal(index.kind, 'nte_public_runtime_source_index_v1');
assert.deepEqual(index.completion, proof('completion.json')); assert.deepEqual(index.baseline, c.after);
assert.equal(load('locale-boundary-after.json').status, 'passed');
assert(readFileSync(root + '/advance.log', 'utf8').split('\n').some(line => {
  try { const row = JSON.parse(line); return row.phase === 'advance' && row.completed === true; } catch { return false; }
}));
const owners = ['genshin', 'nte', 'azur-promilia', 'lvmeng', 'main'];
const count = p => migrationPinned(p).observations.length;
const rows = owners.map(owner => {
  const candidate = c.accepted[owner].candidate, recovery = c.accepted[owner].recovery;
  assert.equal(index.owners[owner].versionId, candidate.versionId);
  const fresh = role => {
    const result = load(`fresh-${owner}-${role}/result.json`);
    assert.equal(result.status, 'passed'); assert.equal(result.preview, true);
    return result.observations.length;
  };
  return { owner, service: index.owners[owner].service, candidate: candidate.versionId, recovery: recovery.versionId,
    deploymentId: c.deployments[owner].deploymentId,
    localCandidate: migrationPinned(s.owners[owner].candidate.local).length,
    localRecovery: migrationPinned(s.owners[owner].recovery.local).length,
    cloudCandidate: count(candidate.preview), cloudRecovery: count(recovery.preview), freshCandidate: fresh('candidate'), freshRecovery: fresh('recovery'),
    publicChecks: count(c.publicProofs[owner]) };
});
const browserScenarios = load('browser-acceptance.json').results.reduce((sum, row) => sum + row.browser.length, 0);
const value = { batch: 'R146', status: 'production_complete', completedAt: new Date().toISOString(),
  executorCommit: c.commit, compiledCommit: load('prepared-final.json').compiledCommit, executorCI: c.executorCI,
  nextVersion: '15.5.29', owners: rows, sourceIndex: nextSource,
  cmsAfter: { path: root.replace(/public-next-security-2026-11-21-r146$/, 'genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz'), pin: 'b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20' },
  contentSources: 115, publicJSONPreserved: load('json-preservation.json').rows.reduce((sum, row) => sum + row.count, 0),
  contentChanges: 0, cmsWrites: 0, workerUploads: 10, productionDeployments: 5,
  routerChanged: false, stagingChanged: false, lvmengLocales: ['zh'],
  validation: { directLocal: q.owners.reduce((sum, row) => sum + row.requests, 0), aggregateLocal: q.graphRequests,
    browserScenarios, aggregatePublic: count(c.aggregate), localQualification: proof('local-qualification.json'),
    localeBoundary: proof('locale-boundary-after.json'), completion: proof('completion.json'),
    buildReuse: proof('build-reuse.json'), networkUsed: proof('network-used.mjs') },
  interruptions: { preUploadGithubRoute: proof('preview-preflight-reconciliation.json'),
    lvmengUploadReconciliation: proof('lvmeng-upload-reconciliation.json'),
    oauthRefresh: proof('oauth-precutover-refresh.json'), oauthAuthorization: proof('oauth-precutover-authorization.json'),
    finalStageOAuth: existsSync(root + '/oauth-final-refresh.json') ? proof('oauth-final-refresh.json') : null,
    publicQualification: proof('public-reference-qualification.json'), continuation: c.continuation },
  security: { targetNextAffected: load('security-assessment.json').targetNextAffected,
    remainingAdvisories: proof('security-assessment.json'), allRepositoryVulnerabilitiesCleared: false },
  continuation: { publicSource: nextSource, cmsAfter: 'R144 AFTER; preserved by R145',
    installedCMSReader: proof('installed-source-reader-boundary.json'),
    next: 'Install the checked R146 source reader in the resident CMS before using its release CLI with this new source kind, preserving CMS records and R144 sync. Then handle remaining better-auth/adapters, qs, glob and minimatch advisories in bounded compatibility work; account routes remain disabled.',
    doNotReplay: ['R140 drafts', 'R141 staging', 'R142 review', 'R143 content deploy', 'R144 editing source sync', 'R145 CMS install', 'R146 Worker upload/deploy'] } };
migrationSave(root, 'delivery.json', value);
writeFileSync(root + '/STATUS.json', JSON.stringify({ batch: 'R146', status: value.status, implementationCommit: value.compiledCommit,
  executorCommit: value.executorCommit, ciRunID: value.executorCI.runID, next: value.nextVersion, owners,
  routerChanged: false, contentChanges: 0, cmsWrites: 0, workerUploads: 10, productionDeployments: 5, sourceIndexAdvanced: true, sourceIndex: nextSource }, null, 2) + '\n');
const labels = { genshin: '原神', nte: '异环', 'azur-promilia': '蓝色星原', lvmeng: '绿梦', main: 'Main' };
const table = rows.map(row => `| ${labels[row.owner]} | \`${row.candidate}\` | \`${row.recovery}\` | ${row.cloudCandidate}/${row.cloudRecovery} | ${row.publicChecks} |`).join('\n');
const publicCount = rows.reduce((sum, row) => sum + row.publicChecks, 0);
const cloudCount = rows.reduce((sum, row) => sum + row.cloudCandidate + row.cloudRecovery, 0);
const receipt = `# R146：五个公开站 Next.js 15.5.29 正式发布完成

Main、原神、异环、蓝色星原、绿梦均已从 Next.js 15.5.28 升级至 **15.5.29**，各一次正式部署、100% 流量。Router 保持版本 \`00ab8c66-9387-4b12-9c77-c401c2a21e0c\`；四个 staging 的部署/配置保持。OpenNext 1.20.13、Wrangler 4.148.0 和四处 deferred-initial patch 保留。CMS 仍为 R145 的 Next.js 16.4.6，本批没有 CMS 内容、审核、schema 或编辑源同步写入。

实际编译提交 \`${value.compiledCommit}\`；执行提交 \`${value.executorCommit}\` 的[完整 CI ${value.executorCI.runID}](https://github.com/aieasygames-alt/gachia/actions/runs/${value.executorCI.runID})成功。两者仅报告操作文件不同，五应用、依赖和 Worker 构建输入未变，见 build-reuse.json。官方 Next tarball integrity、四处 patch 原版/修改后 SHA256、冻结安装及运行时门禁均已核验；没有升级其他注册表包。

| 站点 | 正式版本 | 已验收兼容恢复版本 | 候选/恢复云预览检查数 | 公网检查数 |
| --- | --- | --- | ---: | ---: |
${table}

兼容恢复保持各站升级前的精确 runtime，并合并新旧静态资源；候选与恢复均完成本机、精确 UUID 云预览和切流前新鲜复验，未执行真实回滚。详细 deployment ID、模块 SHA256、上传身份、控制面前后快照见 completion.json / delivery.json。10 次版本上传、5 次正式部署均保留 intent 与结果，production.jsonl 为固定 15 行。

原神首次切流后的公网验收因错误复用独立 Worker 的 HTML 缓存头停止；既有 Router 实际会将游戏成功 HTML 设为 private/no-cache/no-store。用精确已发布 Router 模块对已捕获的真实 workerd HTML 响应执行投影，逐字节保持正文和指纹，仅得到该模块实际生成的缓存头；1,164 个原神、294 个异环 HTML 的预期因此修正，其他 owner 不变。原始 sealed.json/失败结果保留，新的 sealed-public.json 与 qualification/源码均独立 pin；没有改通用 validator、产品或重新编译。原神 1,655 项公网重新完整验收后，固定接续适配器仅调用其余四站已通过 CI 的部署 writer，未重放原神 POST。核心执行提交仍为 551a3b5，额外操作适配器源码 pin 见 completion.continuation；不能将这些后续操作脚本说成已包含在先前 CI 提交中。

本机独立站 ${value.validation.directLocal} 项、聚合 ${q.graphRequests} 项、浏览器 ${browserScenarios} 场景全部通过；云候选/恢复共 ${cloudCount} 项，切流前同规模复验通过；公网逐 owner ${publicCount} 项及最终聚合 ${value.validation.aggregatePublic} 项通过。验证覆盖页面、JSON、搜索、Main 聚合、客户端导航、桌面/手机和有/无 JavaScript。449 份公开 JSON 的值和字节 SHA256 保持，115 份已发布内容来源全部保持，保留胡桃、异环文本/Zero/27 材料与 441 引用删除状态、攻略增量和 R143 完整原神集合。

本机聚合使用精确已发布 Router 模块在 Node 中，经 HTTP binding bridge 调用五个真实 workerd，不声称 Router 自身运行在 workerd。绿梦仍仅中文；en/ja 两个 Router 原有空 404 的状态、字节与关键响应头已在发布前后独立核验，未套用 owner HTML 404 合同。

最初缺少对应 Chromium、原神旧 QA 未展开标签、Router 非中文绿梦边界与聚合重复覆盖导致 proof 超过 16 MiB，均已修正验收编排并保留失败日志；没有扩大 validator 上限、放宽指纹或修改产品。首次云预检因本批代理白名单拒绝 GitHub API，在任何上传前停止，确认 0 云写后仅让 api.github.com 显式直连；后续 Cloudflare 与站点验收仍经受限代理。网络恢复中误停用户既有代理后已用原程序原配置恢复，配置未改，临时重复进程已停；最终网络路径见 network-used.mjs、preview-preflight-reconciliation.json 和 network-reconciled.json。

绿梦候选 CLI 在已经输出上传 UUID 后退出延迟；对该 UUID 和云模块完成额外只读对账，进程随后自行退出，未重传或强制伪造退出成功。仅对本批 CLI 做过临时本机 Node 句柄诊断，随进程退出关闭；诊断清理请求到达时端口已关闭，保留该 ECONNREFUSED 结果。Main 恢复预览期间按固定 Wrangler 4.148.0 的 refresh_token 协议续期既有 OAuth，账户与 scopes 保持；role 字符串的诊断映射由独立只读账户复核补充，凭据没有进入报告。见 lvmeng-upload-reconciliation.json、oauth-precutover-refresh.json 和 oauth-precutover-authorization.json。

本批修复目标 Next 原有三类公告，目标版本匹配数为 0；全仓仍有 better-auth/adapter、qs、glob、minimatch 公告，含 high/critical，不能称为全仓无漏洞。账号功能保持关闭，详见 security-assessment.json。

唯一正式接续来源：[published-sources/source-index.json](published-sources/source-index.json)，pin \`${nextSource.pin}\`。真实 readNteSourceIndex 已重开全部云响应/模块与来源，115 来源、allOwnersCurrent=true。CMS 继续使用 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin \`${value.cmsAfter.pin}\`，不重放 R140–R146 的已完成写入/部署。

下一批先将已通过 CI 的 R146 来源读取器安装到常驻 CMS；当前 R145 安装版尚不识别新增来源种类，不能宣称常驻 CMS 已接通该新索引。安装时保持内容/审核/媒体及 R144 编辑源同步状态，无需重发公开内容。随后独立处理剩余依赖公告。见 installed-source-reader-boundary.json 和 delivery.json。
`;
writeFileSync(root + '/EXECUTION.md', receipt);
const planFile = root + '/../../plans/payload-all-content-implementation-2026-11-05.md';
const oldPlan = readFileSync(planFile, 'utf8');
assert(oldPlan.startsWith('# Payload 全内容实施队列\n\n## 当前完成状态（2026-11-21 R145'));
const section = `## 当前完成状态（2026-11-21 R146：五个公开站 Next.js 安全补丁已正式上线）

Main、原神、异环、蓝色星原、绿梦已由 Next.js **15.5.28 → 15.5.29**，各一次正式部署、100% 流量；Router 和四个 staging 部署/配置保持。保留 OpenNext / deferred-initial patch，新旧静态资源双向兼容；5 个恢复版本已验收，未真实回滚。实际编译 \`${value.compiledCommit.slice(0, 7)}\`，执行 \`${value.executorCommit.slice(0, 7)}\` 的[完整 CI ${value.executorCI.runID}](https://github.com/aieasygames-alt/gachia/actions/runs/${value.executorCI.runID})成功，复用构建输入不变。11,980 独立站本机、778 聚合、66 浏览器场景、${cloudCount} 云预览及同规模切流前复验、${publicCount} 逐 owner 公网与 ${value.validation.aggregatePublic} 最终聚合检查通过。

449 公开 JSON 的值和字节、115 内容来源保持；保留胡桃、异环/Zero/27 材料与 441 引用删除、攻略及 R143 完整集合。**0 CMS 内容/审核写入、0 schema 迁移、10 版本上传、5 正式部署。** 唯一正式接续来源改为 [R146 source-index.json](../reports/public-next-security-2026-11-21-r146/published-sources/source-index.json)，pin \`${nextSource.pin}\`，真实读取器重开 115 来源、allOwnersCurrent=true；CMS 仍用 R144 AFTER（pin \`${value.cmsAfter.pin}\`），不重放已完成操作。见 [R146 完成回执](../reports/public-next-security-2026-11-21-r146/EXECUTION.md)和[交付索引](../reports/public-next-security-2026-11-21-r146/delivery.json)。

下一批先安装已通过 CI 的 R146 新来源读取器到常驻 CMS；R145 安装版仍不识别该新来源种类，不应继续使用旧 R143 代表当前部署。保持所有 CMS 内容、审核、媒体和 R144 同步状态，无需重发公开内容。随后独立修复 better-auth/adapter、qs、glob、minimatch 剩余公告；本批仅目标 Next 三类公告归零，不能称为全仓无漏洞。账号功能保持关闭，绿梦保持中文。完整重建继续 14 GiB 标准/8 GiB 保留线。

`;
writeFileSync(planFile, '# Payload 全内容实施队列\n\n' + section + oldPlan.slice('# Payload 全内容实施队列\n\n'.length).replace(/^## 当前完成状态/, '## 前批完成状态'));
console.log(JSON.stringify({ completed: true, sourceIndex: nextSource, owners: rows, validation: value.validation }));

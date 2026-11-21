"""Seal the R145 receipt only after installed verification and implementation CI succeed."""
import fcntl
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/cms-next-security-2026-11-21-r145'

def read(name):
    return json.loads((REPORT / name).read_text())

def pin(file):
    file = Path(file)
    return {'path': str(file), 'pin': hashlib.sha256(file.read_bytes()).hexdigest()}

def save(name, value):
    with (REPORT / name).open('x') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')

previous = json.loads((REPO / 'reports/genshin-editing-source-sync-2026-11-21-r144/delivery.json').read_text())
ci = read('ci-implementation.json')
installed = read('application-installed.json')
verification = read('installed-verification.json')
assert ci['status'] == 'completed' and ci['conclusion'] == 'success'
assert ci['headSha'] == installed['sourceCommit']
assert verification['sourceCommit'] == installed['sourceCommit']
assert verification['result']['verified'] and verification['result']['contentWrites'] == 0
assert verification['result']['records'] == 2966
assert verification['beforeDeployments'] == verification['afterDeployments']
assert sorted(verification['afterDeployments'], key=lambda r: r['service']) == sorted(previous['deployments'], key=lambda r: r['service'])
assert read('advisories-target.json') == read('advisories-lock-after.json') == {}
for proof in [previous['sourceIndex'], previous['cmsAfter'], installed['application']]:
    assert pin(proof['path']) == proof
old = json.loads(gzip.decompress(Path(previous['cmsAfter']['path']).read_bytes()))
for phase in ['before', 'final']:
    snapshot = json.loads(gzip.decompress((REPORT / f'cms-{phase}.json.gz').read_bytes()))
    assert snapshot['draft'] == old['draft'] and snapshot['published'] == old['published']
spec = importlib.util.spec_from_file_location('r145_install', REPO / 'reports/cms-r145-install.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
with (installer.ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    cfg = json.loads((installer.ROOT / 'settings.json').read_text())
    assert cfg['app'] == installed['app']
    final = installer.state(cfg, installer.helpers.manager())
    assert final == read('database-before.json') == read('database-final.json')
    save('database-after-verification.json', final)
free = shutil.disk_usage(REPO).free / 2**30
validation = read('validation.json')
evidence_names = ['security-assessment.json', 'dependency-scope.json', 'advisories-target.json', 'advisories-lock-after.json',
    'validation.json', 'cms-build.log', 'cms-tests.log', 'typecheck.log', 'postgres-smoke/postgres-smoke.json',
    'application-prepared.json', 'cms-dependency-files.json.gz', 'runtime-dependencies.json', 'cold-backup.json',
    'application-recovery.json', 'application-installed.json', 'database-before.json', 'database-after-verification.json',
    'cms-final-proof.json', 'installed-http.json', 'installed-verification.json', 'preservation.json',
    'control-plane-diagnostic.json', 'wrangler-auth-refresh.json', 'control-plane-after-refresh.json',
    'public-next-followup-candidates.json', 'ci-implementation.json']
delivery = {'kind': 'cms-next-security-delivery-r145', 'status': 'installed_verified_and_recoverable',
    'sourceCommit': installed['sourceCommit'], 'nextVersionBefore': '16.4.2', 'nextVersionAfter': '16.4.6',
    'payloadVersion': '3.92.1', 'reactVersion': '19.2.6', 'application': installed,
    'sourceIndex': previous['sourceIndex'], 'cmsAfter': previous['cmsAfter'],
    'cmsObservation': pin(REPORT / 'cms-final.json.gz'), 'records': 2966,
    'databaseTablesPreserved': len(final['tables']), 'databaseSequencesAndMediaPreserved': True,
    'installedSourceReaderPassed': True, 'allOwnersCurrent': True,
    'contentWrites': 0, 'reviewWrites': 0, 'schemaMigrations': 0, 'workerUploads': 0, 'productionDeployments': 0,
    'deployments': verification['afterDeployments'], 'validation': validation, 'ci': ci['url'],
    'freeGiB': round(free, 2), 'evidence': [pin(REPORT / name) for name in evidence_names],
    'next': 'Patch public Next.js 15.5.28 using verified 15.5.29 candidate, preserving deferred-initial patch and OpenNext; validate affected owners and recovery separately. Continue content from R143 source + unchanged R144 CMS AFTER. Do not replay prior drafts, staging, decisions, deployments or editing sync.'}
save('delivery.json', delivery)
save('STATUS.json', {'batch': 'R145', 'status': 'complete', 'delivery': pin(REPORT / 'delivery.json'),
    'sourceCommit': installed['sourceCommit'], 'cmsRecords': 2966, 'contentWrites': 0, 'workerUploads': 0, 'productionDeployments': 0})
execution = f'''# R145 本机 CMS Next.js 安全升级完成回执

本机常驻 CMS 已由 Next.js **16.4.2 升级至 16.4.6**，精确源码 `{installed['sourceCommit']}`，Payload 3.92.1 / React 19.2.6 保持。新应用已标准构建、封存安装并通过实际恢复演练。本批只修改 CMS 的独立 package/锁文件及交付工具；公开站依赖、定制 patch 和生产内容均保持。

## 安全与依赖范围

- 官方 npm registry 确认 16.4.6 满足当前 Payload 明确的 Next peer 范围；精确包 integrity 保存在 `security-assessment.json`。
- 目标 Next 及完整 CMS 锁文件 359 个包名的 bulk advisory 查询均返回空结果；这表示查询时未报告已知漏洞。
- 仅 Next、`@next/env`、SWC 及对应 peer 引用改变，其他包版本与 integrity 保持。独立 overrides 保持，公开站根锁文件未改。
- 新版标准构建成功，旧版安全提醒消失；既有 legacy-intake 动态文件追踪提示保留，完整日志可查。

## 安装、功能与恢复

- 新安装：`{installed['app']}`；应用清单 pin `{installed['application']['pin']}`。完整依赖 43,788 项文件/链接和应用文件核对通过，旧安装完整保留。
- 冷备：`{installed['backup']}`。实际恢复到隔离 PostgreSQL 并提取媒体，完整数据/媒体核对通过。
- 实际切换顺序：新版 → 旧安装 → 新版；每次均健康，最终运行 16.4.6。没有在常驻数据库运行 schema 迁移。
- 本地完整 CMS **623/623**，0 失败/跳过；完整类型检查通过；标准 Next 构建通过。
- 隔离 PostgreSQL + 构建后 HTTP **15 组**通过，覆盖登录/ACL、草稿编辑、独立发布状态、版本/锁、媒体私有访问、撤回、导出、注销和故障健康检查。
- 常驻登录 HTML 和 15 个静态资源均为 200，3 类匿名内容读取为 403，noindex/nofollow 和隐藏框架头保持；只读验收没有修改真实内容。

## 内容、来源与生产保持

- 常驻 CMS **2,966 条**：升级前后 draft/published 稳定双读与 R144 完全一致，含全部时间戳。
- **43 张表、数据库序列和媒体完整指纹保持**；用户、会话、审核、hold、版本与原始来源均保持。
- 新封存安装的真实来源读者和同步只读验证通过；R143 正式源仍可接续，`allOwnersCurrent=true`。476 条已同步原神编辑源没有再次导入。
- 六个生产服务 deployment/version 均与 R144 一致。**0 内容写入、0 审核写入、0 schema 迁移、0 Worker 上传、0 正式部署。**
- 首次控制面只读验证遇到过期 OAuth（401，原凭据到期 10:12 UTC），保留原日志和诊断；通过项目固定 Wrangler 4.148.0 `whoami --json` 刷新现有登录后，六服务读取和安装版完整只读验证成功。未修改云端资源。官方命令文档读取返回 403，命令以本机安装版 help 校验。
- 实现提交[完整 CI 44897652258]({ci['url']})成功。收尾仅回执/队列/只读交付工具，不要求重新安装应用或重复内容发布。

## 下一批入口

继续使用 [R143 正式来源](../genshin-collection-production-2026-11-21-r143/published-sources/source-index.json)，pin `{previous['sourceIndex']['pin']}`；CMS 继续使用 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin `{previous['cmsAfter']['pin']}`，本批只是增加相同内容的新版应用观测。

下一优先级是公开站 Next.js 15.5.28 安全补丁。已只读确认官方 **15.5.29** 存在且公告查询为空；保留现有 deferred-initial patch/OpenNext，在独立一批完成受影响 owner 构建、消费者、兼容恢复与受控发布。不得把本机 CMS 升级等同于公开 Worker 已升级。

不重放 R140 草稿、R141 暂存、R142 决定、R143 部署或 R144 编辑源同步；胡桃、异环、Zero 清理和攻略增量保持，绿梦继续中文范围。最后可用空间约 **{free:.2f} GiB**；完整游戏构建继续遵守 14 GiB 标准预算和 8 GiB 保留线。

完整校验和接续合同见 [delivery.json](delivery.json)，安装/恢复/功能、安全公告和首次失败记录均在本目录保留。
'''
with (REPORT / 'EXECUTION.md').open('x') as stream:
    stream.write(execution)
queue = REPO / 'plans/payload-all-content-implementation-2026-11-05.md'
text = queue.read_text()
assert text.startswith('# Payload 全内容实施队列\n\n## 当前完成状态（2026-11-21 R144')
text = text.replace('## 当前完成状态（2026-11-21 R144', '## 前批开发完成状态（2026-11-21 R144', 1)
intro = f'''## 当前完成状态（2026-11-21 R145：本机 CMS Next.js 安全升级完成）

常驻 CMS 已由 Next.js **16.4.2 → 16.4.6**，Payload 3.92.1 / React 19.2.6 保持；精确源码 `{installed['sourceCommit']}`，完整 CI [44897652258]({ci['url']})成功。官方目标与完整 CMS 锁文件 359 包公告查询为空，仅 Next 相关依赖改变。标准构建、类型检查、本地 623/623（无跳过）、隔离 PostgreSQL/HTTP 15 组通过。新安装已校验完整文件/依赖，冷备真实恢复及旧/新应用往返切换通过。

升级前后 2,966 条 CMS draft/published 与 R144 完全一致；43 表、序列和媒体完整指纹保持。新封存安装的来源读者及 476 条原神编辑源只读核验通过，六个生产服务 deployment/version 保持。**本批 0 内容/审核写入、0 schema 迁移、0 Worker 上传、0 正式部署。** 初次只读控制面 401 已确认是本机 OAuth 到期，刷新现有登录后复核成功；原失败日志保留。见 [R145 完成回执](../reports/cms-next-security-2026-11-21-r145/EXECUTION.md)和[接续交付](../reports/cms-next-security-2026-11-21-r145/delivery.json)。

下一批优先修复公开站 Next.js **15.5.28 → 已核验的 15.5.29 候选**，保留 deferred-initial patch/OpenNext，独立验收受影响 owner 构建、消费者、兼容恢复和受控发布；本机 CMS 升级不能替代公开 Worker 升级。内容仍从 [R143 正式来源](../reports/genshin-collection-production-2026-11-21-r143/published-sources/source-index.json)（pin `{previous['sourceIndex']['pin']}`）和 [R144 CMS AFTER](../reports/genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)（pin `{previous['cmsAfter']['pin']}`）接续，不重放草稿、暂存、审核、部署或同步；绿梦保持中文。可用约 {free:.2f} GiB，完整游戏构建继续执行 14 GiB 标准/8 GiB 保留线。

'''
queue.write_text(text.replace('# Payload 全内容实施队列\n\n', '# Payload 全内容实施队列\n\n' + intro, 1))
print(json.dumps({'complete': True, 'records': 2966, 'databaseTablesPreserved': 43, 'productionDeployments': 0, 'freeGiB': round(free, 2)}))

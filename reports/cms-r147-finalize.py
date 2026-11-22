"""Seal R147 after actual installation, two release-reader traversals and preservation checks."""
import fcntl
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/cms-source-reader-2026-11-22-r147'

def load(name):
    return json.loads((REPORT / name).read_text())

def proof(file):
    file = Path(file)
    return {'path': str(file), 'pin': hashlib.sha256(file.read_bytes()).hexdigest()}

def save(name, value):
    with (REPORT / name).open('x') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')

installed = load('application-installed.json')
prepared_reader, reader = load('prepared-reader.json'), load('installed-reader.json')
assert prepared_reader['allOwnersCurrent'] and reader['allOwnersCurrent']
assert prepared_reader['sourceHashes'] == reader['sourceHashes'] and reader['sourceCount'] == 115
assert reader['currentApplicationVerified'] and reader['sourceCommit'] == installed['sourceCommit']
cloud_before, cloud_after = load('cloud-before.json'), load('cloud-after.json')
assert cloud_before['snapshot'] == cloud_after['snapshot'] and cloud_before['staging'] == cloud_after['staging']
assert load('http.json')['healthy'] and load('postgres-smoke/postgres-smoke.json')['passed']
assert len(load('postgres-smoke/postgres-smoke.json')['checks']) == 15
assert not (REPORT / 'typecheck.log').read_text().strip()
assert 'pass 13' in (REPORT / 'source-reader-tests.log').read_text()
assert 'fail 0' in (REPORT / 'source-reader-tests.log').read_text()
assert 'skipped 0' in (REPORT / 'source-reader-tests.log').read_text()
assert 'pass 39' in (REPORT / 'docs-scope.log').read_text()
assert 'fail 0' in (REPORT / 'docs-scope.log').read_text()
baseline_file = REPO / 'reports/genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz'
assert proof(baseline_file)['pin'] == 'b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20'
baseline = json.loads(gzip.decompress(baseline_file.read_bytes()))
for phase in ['before', 'final']:
    observed = json.loads(gzip.decompress((REPORT / f'cms-{phase}.json.gz').read_bytes()))
    assert observed['draft'] == baseline['draft'] and observed['published'] == baseline['published']
assert len(baseline['draft']) == 2966
editing_paths = {f'packages/data/games/genshin/raw-{family}.json' for family in ['materials', 'characters', 'character-materials']}
genshin = [r for r in baseline['draft'] if r['legacyPath'] in editing_paths]
assert len(genshin) == 476
editing_counts = {family: sum(r['legacyPath'] == f'packages/data/games/genshin/raw-{family}.json' for r in genshin)
                  for family in ['materials', 'characters', 'character-materials']}
assert editing_counts == {'materials': 269, 'characters': 117, 'character-materials': 90}
spec = importlib.util.spec_from_file_location('r147_install', REPO / 'reports/cms-r147-install.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
with (installer.ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    cfg = json.loads((installer.ROOT / 'settings.json').read_text())
    assert cfg['app'] == installed['app']
    final = installer.state(cfg, installer.helpers.manager())
    assert final == load('database-before.json') == load('database-final.json')
    save('database-after-verification.json', final)
ci_file = REPO / 'reports/public-next-security-2026-11-21-r146/closeout-ci-final.json'
ci = json.loads(ci_file.read_text())
assert ci['headSha'] == installed['sourceCommit'] and ci['status'] == 'completed' and ci['conclusion'] == 'success'
free = round(shutil.disk_usage(REPO).free / 2**30, 2)
validation = {'standardNextBuild': 'passed', 'cmsTypecheck': 'passed', 'sourceContractTests': 13,
              'sourceContractSkipped': 0, 'postgresHTTPGroups': 15,
              'docsScopeTests': 39,
              'actualReleaseReaderTraversals': 2, 'installedHTTPChecks': len(load('http.json')['checks']),
              'installationSourceCI': {'path': str(ci_file), 'pin': proof(ci_file)['pin'], 'url': ci['url'], 'commit': ci['headSha']}}
save('validation.json', validation)
names = ['application-prepared.json', 'application-installed.json', 'application-recovery.json',
         'cms-dependency-files.json.gz', 'runtime-dependencies.json', 'cold-backup.json',
         'database-before.json', 'database-before-install.json', 'database-after-install.json',
         'database-final.json', 'database-after-verification.json', 'cms-before-proof.json', 'cms-final-proof.json',
         'prepared-reader.json', 'installed-reader.json', 'cloud-before.json', 'cloud-after.json',
         'http.json', 'postgres-smoke/postgres-smoke.json', 'source-reader-tests.log', 'typecheck.log',
         'cms-build.log', 'docs-scope.log', 'validation.json', 'wrangler-auth-refresh.json']
next_step = 'Independently review and patch remaining better-auth/adapter, qs, glob and minimatch advisories. Account features stay disabled. Continue from R146 source and unchanged R144 CMS AFTER; do not replay completed content, reviews, synchronization or deployments.'
delivery = {'kind': 'cms-source-reader-delivery-r147', 'status': 'installed_verified_and_recoverable',
            'sourceCommit': installed['sourceCommit'], 'application': installed,
            'sourceIndex': reader['sourceIndex'], 'cmsAfter': proof(baseline_file),
            'cmsObservation': proof(REPORT / 'cms-final.json.gz'), 'records': 2966, 'genshinEditingRecords': 476,
            'genshinEditingCounts': editing_counts,
            'sourceCount': 115, 'allOwnersCurrent': True, 'databaseTablesPreserved': len(final['tables']),
            'databaseSequencesAndMediaPreserved': True, 'dependenciesChanged': False,
            'nextVersion': '16.4.6', 'payloadVersion': '3.92.1', 'reactVersion': '19.2.6',
            'contentWrites': 0, 'reviewWrites': 0, 'schemaMigrations': 0, 'editingSourceSyncs': 0,
            'workerUploads': 0, 'productionDeployments': 0, 'productionServicesPreserved': 6,
            'stagingServicesPreserved': 4, 'validation': validation,
            'evidence': [proof(REPORT / name) for name in names], 'freeGiB': free, 'next': next_step}
save('delivery.json', delivery)
save('STATUS.json', {'batch': 'R147', 'status': 'complete', 'delivery': proof(REPORT / 'delivery.json'),
                     'sourceCommit': installed['sourceCommit'], 'records': 2966, 'workerUploads': 0, 'productionDeployments': 0})
text = f'''# R147 常驻 CMS 新来源读取器安装完成回执

常驻 CMS 已安装 R146 来源读取器，精确源码 `{installed['sourceCommit']}`；该源码的[完整 CI 44914833496]({ci['url']})已成功。Next.js 16.4.6、Payload 3.92.1、React 19.2.6 及独立锁文件保持；无 schema 迁移。

新安装：`{installed['app']}`。标准 Next 构建、CMS 类型、来源合同 13/13（0 跳过）及隔离 PostgreSQL/构建后 HTTP 15 组通过。完整校验 801 个应用文件、356 个跨目录文件与 43,788 项依赖文件/链接，包含 `scripts/public-runtime-history.mjs` 及运行时依赖。

准备后和正式安装后，分别使用新封存安装中的真实 `readNteSourceIndex` 完整重开 R146。两次均为 115 来源、五个 owner、`allOwnersCurrent=true`，来源指纹完全一致。第二次额外通过当前安装身份和精确 Git 源码校验。执行模块全部来自新安装；工作仓库仅提供历史 Git 对象及固定绝对证据，不以工作区读取器替代安装版验收。

冷备 `{installed['backup']}` 已真实恢复到隔离 PostgreSQL并提取媒体，核对通过。新安装 → 旧 R145 → 新安装的实际往返切换均健康，最终保留新安装，旧安装和恢复文件完整保留。

安装前后全站 2,966 条 draft/published（含时间戳）与 R144 AFTER 完全一致；476 条原神编辑源、43 张表、序列、用户/会话、审核/hold、版本/provenance 与媒体完整指纹保持。新安装登录页面/静态资源、健康和匿名拒绝共 {validation['installedHTTPChecks']} 项通过。安装前后六个生产、四个 staging 的部署与配置和 R146 一致。

**本批 0 内容/审核写入、0 编辑源同步、0 schema 迁移、0 Worker 上传、0 正式部署。** R146 的公开站发布无需重做，胡桃、异环文本/Zero 清理、27 材料及 441 引用删除状态、攻略增量和 R143 完整原神集合保持。绿梦继续中文范围。

接续仍使用 [R146 source-index.json](../public-next-security-2026-11-21-r146/published-sources/source-index.json)，pin `{reader['sourceIndex']['pin']}`；CMS 使用 [R144 AFTER](../genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz)，pin `{proof(baseline_file)['pin']}`。本批交付见 [delivery.json](delivery.json)，不推进新的公开来源索引。

下一批独立处理 better-auth/adapter、qs、glob、minimatch 剩余安全项，账号功能保持关闭。不得重放 R140–R146 已完成的草稿、暂存、审核、内容部署或编辑源同步。最终可用约 {free:.2f} GiB；游戏完整构建继续遵守 14 GiB 标准、8 GiB 保留线。
'''
with (REPORT / 'EXECUTION.md').open('x') as stream:
    stream.write(text)
queue = REPO / 'plans/payload-all-content-implementation-2026-11-05.md'
current = queue.read_text()
assert current.startswith('# Payload 全内容实施队列\n\n## 当前完成状态（2026-11-21 R146')
current = current.replace('## 当前完成状态（2026-11-21 R146', '## 前批完成状态（2026-11-21 R146', 1)
intro = f'''## 当前完成状态（2026-11-22 R147：常驻 CMS 已接通 R146 来源读取器）

已标准构建并封存安装精确源码 `{installed['sourceCommit']}`（[完整 CI 44914833496]({ci['url']})），Next 16.4.6 / Payload 3.92.1 / React 19.2.6 和锁文件保持。801 应用文件、356 跨目录文件、43,788 项依赖校验通过；新安装中的真实读取器准备后/安装后两次重开 R146 均为 115 来源、五 owner、allOwnersCurrent=true。来源合同 13/13、类型、隔离 PostgreSQL/HTTP 15 组与常驻 {validation['installedHTTPChecks']} HTTP 项通过，冷备真实恢复及新→旧→新应用切换通过。

2,966 条 CMS draft/published、476 条原神编辑源、43 表/序列和媒体保持；六生产/四 staging 部署与配置保持。**0 内容/审核写入、0 编辑源同步、0 schema 迁移、0 Worker 上传、0 正式部署。** 见 [R147 完成回执](../reports/cms-source-reader-2026-11-22-r147/EXECUTION.md)和[交付索引](../reports/cms-source-reader-2026-11-22-r147/delivery.json)。正式入口继续 [R146 来源](../reports/public-next-security-2026-11-21-r146/published-sources/source-index.json)，pin `{reader['sourceIndex']['pin']}`；CMS 继续 R144 AFTER，pin `{proof(baseline_file)['pin']}`，不重放既有操作。

下一批独立修复 better-auth/adapter、qs、glob、minimatch 剩余安全项，账号功能保持关闭，绿梦保持中文。胡桃、异环/Zero/27 材料与 441 引用删除、攻略和 R143 集合保持。可用约 {free:.2f} GiB；完整游戏重建仍为 14 GiB 标准、8 GiB 保留线。

'''
queue.write_text(current.replace('# Payload 全内容实施队列\n\n', '# Payload 全内容实施队列\n\n' + intro, 1))
print(json.dumps({'complete': True, 'records': 2966, 'sources': 115, 'freeGiB': free}))

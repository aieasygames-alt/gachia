# Final receipt creation only after the production observer and source reader pass.
from pathlib import Path
import json, hashlib, datetime
REPO = Path(__file__).resolve().parent.parent
ROOT = REPO / 'reports/genshin-collection-production-2026-11-21-r143'
def load(name): return json.loads((ROOT / name).read_text())
def proof(name):
 p=ROOT/name
 return {'path': str(p), 'pin': hashlib.sha256(p.read_bytes()).hexdigest()}
c=load('completion.json'); q=load('qualification.json'); s=load('source-result.json'); a=load('accepted.json')
assert c['status']=='production_accepted' and c['commit']==q['commit']==a['commit']
assert c['promoted']=={'gachia-game-genshin': a['accepted']['candidate']['versionId']}
assert hashlib.sha256(Path(s['path']).read_bytes()).hexdigest()==s['pin']
source=json.loads(Path(s['path']).read_text()); assert source['active'] and source['baseline']==c['after']
assert load('ci-completed.json')['conclusion']=='success'
assert load('cms-final-proof.json')['records']==2880 and load('cms-final-proof.json')['stableDoubleRead']
counts={}
for key,file in [('candidate','cloud/candidate/preview/result.json'),('recovery','cloud/recovery/preview/result.json'),
 ('freshCandidate','fresh-candidate/result.json'),('freshRecovery','fresh-recovery/result.json'),
 ('production','public/result.json'),('sourceObservation','published-sources/public/result.json')]:
 result=load(file);assert result['status']=='passed';counts[key]=len(result['observations'])
assert counts=={'candidate':1995,'recovery':1743,'freshCandidate':1995,'freshRecovery':1743,'production':1960,'sourceObservation':1960}
rows=[json.loads(line) for line in (ROOT/'production.jsonl').read_text().splitlines()]
assert [r['phase'] for r in rows]==['deployment_intent','deployed','production_accepted']
version=a['accepted']['candidate']['versionId']; recovery=a['accepted']['recovery']['versionId']; dep=c['deployment']['deploymentId']
text=f'''# R143：原神审核后完整集合正式发布完成

日期：2026-11-21。原神 Worker 已正式切换至 `{version}`，deployment `{dep}`，100% 流量。只执行一次原神正式部署，其余 5 个生产服务和 4 个 staging 服务的部署及配置保持；Main、Router、NTE、蓝色星原和绿梦没有部署。

从 R142 已有 221 条独立审核、42 条既有草稿和 179 条结构暂存接续，没有重放内容或审核写入。新 `genshin-reviewed-collection-production-v1` 发布资格独立重建完整导出，拒绝部分/拒绝/重复决定、未审核来源、缺失派生摘要和候选混入恢复；所有来源字节、revision、证据及 CMS 前态绑定保持。安装应用在资格、上传前、切流前和生产后四次真实只读导出均相同，exportKey `{q['exportKey']}`。

完整集合包含 269 个材料定义、117 个角色定义、90 条角色材料关系和 5,490 次引用，新增 84 个材料和玛拉妮/欧洛伦，修正既有材料及全部关系候选。三份原神编辑源和一份派生角色摘要变化，其余 111 来源逐字节保持。胡桃、异环文本/Zero/27 个未证实材料及 441 引用删除状态、五份攻略增量保持。49 个特产的 rank=1 仍是社区资料 API 展示值，不称官方一星认证。

## 发布资格与真实云验收

发布执行提交 `{q['commit']}` 的完整 CI [44879215838](https://github.com/aieasygames-alt/gachia/actions/runs/44879215838) 全部通过；包括 CMS、库存与 Router、发布工具、公开消费者、类型和文档门禁。本地新增发布资格回归 3 项和相关工具回归 49 项通过，CMS 类型检查通过。

复用 R142 精确提交 `{q['compiledCommit']}` 的完整 Next/OpenNext 构建与封存包；只存在 reports/plans/CMS 差异，全部 Worker 构建输入保持。原构建包含 1,821 个静态页面、16 份内容资产，候选内容版本 `4c1c97cbf8ec52ee423a4650699e5701ca8ab349549eb1e927069fd353be2fa5`。R142 的 7,658 项实际本地 HTTP 验收完整保留，不重新构建游戏。

候选云版本 `{version}` 的 1,995 项、兼容恢复云版本 `{recovery}` 的 1,743 项全部通过；切流前对相同不可变版本再次完成 1,995/1,743 项云复验。上传 multipart、实际云模块、版本设置及全部验证响应均绑定摘要。恢复仍使用 R139 原始运行时和内容，保留旧版 74 个缺失材料 ID、4 个关系身份缺口及新实体 404，保留新旧共 774 条静态资源路径；没有实际回滚。

正式切流后，公网 Router 的 1,960 项请求通过；来源推进时再有 1,960 项公网观察通过。覆盖三语材料/角色页面、公开 JSON、三语搜索、Main 成员/平台/tier 聚合、兼容静态资源及其他游戏公开数据。R142 候选三语 HTML 的 16,470 次材料 ID/数量匹配与 45 处技能展示检查作为冻结响应基准，真实云页面与这些基准匹配。两轮公网检查均包含 83 份其他游戏 JSON 的保持验证。

## 正式来源与 CMS 接续

新的完整来源为 [R143 source-index.json](published-sources/source-index.json)，pin `{s['pin']}`。已由真实 `readNteSourceIndex` 新结构集合读取器重开，115 来源、`allOwnersCurrent=true`。来源读取器核对逐项审核、完整导出重建、生产 journal、候选/恢复云身份及响应、单 Worker 拓扑、精确冻结代码和来源资产；该索引不授权下一次发布。

本批没有修改或推进通用 content-records 编辑源、版本、hold 或原始 provenance。221 条决定依然是不可变接受导出记录，其生产使用通过本回执、completion 和正式来源索引连接。后续优先处理结构集合在正式发布后的 CMS 编辑源受控推进，尤其新实体与关系身份迁移；该工作不是本次已上线事实的前置条件。不要直接用通用编辑 hook 或旧叶子文本发布器写入结构，也不要把 R142 的旧 R139 发布 A 再当作当前 A。

下一批从 R143 发布来源和本批 `cms-final.json.gz` 全量写后快照接续，不重放 42 草稿、179 暂存、221 决定或本次部署。真实 import O 与当前编辑状态保留，后续源推进须与 R143 A 对账，保留新实体、关系和胡桃/异环/攻略增量。Next.js 16.4.2 安全公告修复保持独立待办；绿梦保持中文范围。

OAuth 只刷新既有授权，scope 集合不变，凭据只写入本机受保护配置；无 token、密码或 settings.environment 进入回执。上线后 1,960 项公网验收已通过，最后一轮控制面 Router subdomain GET 曾直连超时；保留原始日志，通过 Node 25 的 `NODE_USE_ENV_PROXY=1` 和既有 `127.0.0.1:1087` 代理完成只读配置对账，复用原通过的公网证据封口，0 次重新部署/上传。后续远端配置读取继续使用该已验证通道，`NO_PROXY=127.0.0.1,localhost` 保留 CMS 本机访问。首次 GitHub 直连 push 的 HTTP/2 连接失败后，只读确认远端未改变，使用既有本机代理和 HTTP/1.1 完成非强推；没有重复 CMS 或云发布写入。
'''
(ROOT/'EXECUTION.md').write_text(text)
delivery={'kind':'genshin-collection-production-delivery-r143','status':'production_accepted_sources_observed','sourceCommit':q['commit'],
 'sourceIndex':s,'completion':proof('completion.json'),'qualification':proof('qualification.json'),'executorCI':c['executorCI'],
 'candidateVersion':version,'recoveryVersion':recovery,'deploymentId':dep,'exportKey':q['exportKey'],
 'cmsAfter':load('cms-final-proof.json')['proof'],'cmsFinalProof':proof('cms-final-proof.json'),
 'counts':{'materialDefinitions':269,'characterDefinitions':117,'relations':90,'materialReferences':5490,'independentDecisionsReused':221},
 'httpChecks':counts,'workerUploads':2,'productionDeployments':1,'otherServicesPreserved':9,'sourceAdvanced':True,'cmsEditingSourceAdvanced':False,
 'contentRecordWrites':0,'reviewWrites':0,'next':'Continue from R143 published A and cms-final.json.gz; controlled CMS editing-source advance for reviewed structures. Never replay drafts, staging, reviews or deployment.',
 'evidence':{name:proof(name) for name in ['EXECUTION.md','post-public-reconciliation.json','cms-final-proof.json','ci-completed.json','accepted.json','cms-after-production.json','production.jsonl',
 'deployment-creation.json','deployment-verification.json','cloud/candidate/preview/result.json','cloud/recovery/preview/result.json',
 'fresh-candidate/result.json','fresh-recovery/result.json','public/result.json','published-sources/public/result.json','oauth-refresh-01.json','oauth-refresh-02.json']}}
(ROOT/'delivery.json').write_text(json.dumps(delivery,ensure_ascii=False,indent=2)+'\n')
status={'phase':'complete','productionAccepted':True,'sourceAdvanced':True,'cmsEditingSourceAdvanced':False,'candidateVersion':version,
 'deploymentId':dep,'sourceIndex':s,'delivery':proof('delivery.json'),'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(ROOT/'STATUS.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n')
queue=REPO/'plans/payload-all-content-implementation-2026-11-05.md';old=queue.read_text()
assert '## 当前开发完成状态（2026-11-21 R142' in old
old=old.replace('## 当前开发完成状态（2026-11-21 R142','## 前批开发完成状态（2026-11-21 R142',1)
old=old.replace('## 当前生产完成状态（2026-11-20 R139','## 前批生产完成状态（2026-11-20 R139',1)
heading='''## 当前生产完成状态（2026-11-21 R143：原神审核后完整集合已正式上线）

'''
body=f'''原神 Worker 已正式更新为 `{version}`，deployment `{dep}`，100% 流量。精确提交 `{q['commit']}` 的[完整 CI 44879215838](https://github.com/aieasygames-alt/gachia/actions/runs/44879215838)通过，复用 R142 完整构建且 Worker 输入不变；候选/恢复 1,995/1,743 项云预览及相同规模切流前复验通过，两轮公网 Router 各 1,960 项通过。仅一次原神正式部署，其余 5 个生产与 4 个 staging 服务的部署和配置保持；兼容恢复 `{recovery}` 已验证，未实际回滚。

完整导出与 221 条既有独立审核实际用于本次发布，没有重放 42 草稿、179 暂存或决定。上线集合含 269 材料、117 角色、90 关系、5,490 引用；新增 84 材料、玛拉妮/欧洛伦和关系/数值修正，三份编辑源及一份派生角色摘要变化，其余 111 来源保持。Hu Tao、异环、Zero、27 材料及 441 引用删除状态和攻略增量保留。页面、JSON、搜索、Main 聚合与兼容资源正确，83 份其他游戏 JSON 保持。

当前完整来源：[R143 source-index.json](../reports/genshin-collection-production-2026-11-21-r143/published-sources/source-index.json)，pin `{s['pin']}`；真实结构集合读取器重开通过，115 来源、`allOwnersCurrent=true`。见 [完成回执](../reports/genshin-collection-production-2026-11-21-r143/EXECUTION.md)和[接续交付](../reports/genshin-collection-production-2026-11-21-r143/delivery.json)。本批只读 CMS 四次导出均一致，通用 content-records 编辑源、版本、hold 和 provenance 未推进。下一批从此 R143 A 与 `cms-final.json.gz` 接续，独立处理新实体/关系等结构集合的 CMS 编辑源受控推进，不重放草稿、暂存、审核和部署，不把旧 R139 A 或 checkout 当作当前线上。Next.js 16.4.2 安全修复独立待办；绿梦保持中文范围。

'''
first,rest=old.split('\n',1);queue.write_text(first+'\n\n'+heading+body+rest.lstrip('\n'))
runner=REPO/'reports/genshin-collection-r143-run.mts';content=runner.read_text();content=content.replace('// Fixed R139 code/resource publication. Content comes exclusively from published R134 A.', '// R143 publishes the independently reviewed R142 collection with exact R139 recovery.',1);runner.write_text(content)
print(json.dumps({'productionAccepted':True,'sourceIndex':s,'delivery':proof('delivery.json'),'httpChecks':counts},ensure_ascii=False))

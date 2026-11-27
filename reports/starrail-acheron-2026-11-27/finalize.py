# -*- coding: utf-8 -*-
"""Assemble reviewed release evidence after all gates pass."""
import pathlib,json,subprocess,re
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
required=['baseline-content-acceptance.json','source-comparison.json','editor-acceptance.json','local-acceptance.json','preview-acceptance.json','production-acceptance.json','runtime-protection.json','compatible-main-acceptance.json','browser-acceptance.json','browser-local-acceptance.json','local-worker-stop.json','original-characters-acceptance.json']
for name in required:assert read(name)['status']=='passed',name
cloud=read('cloud-after.json');receipt=read('sync-receipt.json');expected=read('expected-publication.json');prepared=read('runtime-prepared.json');ci=read('ci.json');version=read('runtime-upload.json')['versionId'];prod=read('production-acceptance.json')
assert receipt['ok'] and receipt['count']==79 and receipt['revision']==cloud['revision']
assert sorted(expected['docs'],key=lambda x:x['slug'])==sorted(cloud['docs'],key=lambda x:x['slug'])
assert sum(len(d.get('eventSchedule',{}).get('entries',[])) for d in cloud['docs'])==15
assert ci['conclusion']=='success' and ci['headSha']==prepared['sourceCommit']
for name,needles in {'data-tests.log':['23 passed','205 passed'],'web-tests.log':['107 passed','637 passed'],'main-build.log':['OpenNext build complete.'],'mirrors.log':['managed-raw-mirrors-v1'],'manifests.log':['Data manifests verified.']}.items():assert all(n in (r/name).read_text() for n in needles),name
ports={p:subprocess.run(['lsof','-nP','-iTCP:'+p,'-sTCP:LISTEN'],capture_output=True,text=True).stdout.strip() for p in ['4320','4398','4399','4400']}
assert ports['4320'] and not ports['4400'] and all(ports[p]==read('local-services-before.json')[p] for p in ['4398','4399'])
size=len(json.dumps({'revision':cloud['revision'],'docs':cloud['docs']},ensure_ascii=False,separators=(',',':')).encode());assert size<512*1024
checks={'status':'passed','sources':read('source-comparison.json'),'web':{'files':107,'tests':637,'types':'passed','productionBuild':'passed'},'data':{'files':23,'tests':205,'types':'passed'},'cms':read('editor-acceptance.json'),'rawMirrors':'passed','manifests':'passed','CI':ci,'releaseGates':required,'publication':{'count':79,'revision':cloud['revision'],'created':1,'calendarEntries':15,'canonicalUTF8Bytes':size},'localServices':{'editor4320Running':True,'test4400Stopped':True,'unrelatedListenersPreserved':True},'backup':{'before':read('backup-before.json'),'after':read('backup-after.json')}}
(r/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
para=f'''
## 正式发布与验收

兼容Main版本`{version}`，源码`{prepared['sourceCommit']}`，模块SHA256 `{prepared['moduleSHA256']}`。候选及正式各{len(read('preview-acceptance.json')['checks'])}/{len(prod['checks'])}项检查，正式站{len(prod['assets'])}个静态资源逐字节核对。先确认78条基线、revision及15项日历保持、黄泉草稿未公开，再经Payload正式发布与`publish:starrail`同步至79条，revision `{cloud['revision']}`，规范JSON为{size} UTF-8字节；英日文独立空发布。

旧版全部{prepared['staticRetention']['previous']}条静态路径保留，复制{prepared['staticRetention']['copied']}个文件，同路径碰撞均摘要相同。七服务前后独立快照证明仅Main部署变化，其余六服务部署与全部routes/subdomain/bindings/settings保持。原版银狼和花火三语主内容部署前后摘要一致。真实Worker验收四项/五项严格校验、动态更新、撤回和缺译；本地及正式浏览器核对完整预算、扣除雷心后的3,148,000信用点、终结技7→10独立540,000信用点及五种材料、角色切换重置与115格倍率。4320编辑器运行，4400测试Worker整棵进程树已停，前后SQLite一致性备份完整性检查通过。CI、测试、类型和生产构建通过，见`checks.json`。

下一顺位为丹恒·饮月，然后景元；兑换码及活动独立窗口等继续按独立证据核验。已注册黄泉后续数值修订只需CMS正式发布与同步，无需再次部署Main。
'''
p=r/'README.md';assert '## 正式发布与验收' not in p.read_text();p.write_text(p.read_text()+para)
previous=read('../starrail-sparxie-2026-11-26/remaining-priorities.json');previous['currentBatch']={'creates':1,'updates':0,'totalPublication':79,'calendarEntries':15,'character':'黄泉'};previous['completed']=['黄泉115格四项技能倍率、六次晋阶、32段技能升级和13节点材料，经Payload发布接入详情、目录及材料计算器','按角色严格支持四项/五项技能，黄泉不补造欢愉技，缺译或撤回不回退旧资料','18格展示精度差异留证；终结技群体最高总倍率与累计上限条件明确，三斩及返渡不重复计费'];previous['priorityOrder'][0]='第二期复刻剩余按丹恒·饮月→景元逐个补齐完整技能倍率、材料及强化形态（如适用），先核验技能结构和星魂加级';previous['independentEvidenceRequired'].insert(0,'黄泉奇缘星魂的适用模式与解锁条件；未混入基础倍率和材料');previous['boundary']='黄泉四项基础技能和材料已按第三方可见展示与固定数据核对，未把共享上游当独立官方证据；奇缘星魂的模式和解锁条件待独立核准。';(r/'remaining-priorities.json').write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n')
doc=r.parents[1]/'docs/starrail-cms-main-site.md';s=doc.read_text();needle='2026-11-26 火花批次';assert needle in s
update=f'''2026-11-27 黄泉批次新增`acheron-character-data`，补齐115格四项技能倍率、六次晋阶、32段技能和13节点材料。按注册角色严格要求四项/五项技能，黄泉不补造欢愉技；原`acheron`入口由CMS接管，撤回和缺译不回退旧正文。完整目标3,308,000信用点，终结技7→10为540,000；三斩及返渡不重复收费。18格一位小数截断差异留证，终结技群体由15%提高至60%、372%/300%累计上限的条件明确。第三方可能共享上游；奇缘星魂适用模式和解锁待核准。兼容Main`{version}`，源码`{prepared['sourceCommit']}`，确认原78条后经Payload发布同步至79条，revision `{cloud['revision']}`，15项日历保持。候选/正式三语、静态资源、实际Worker动态更新/撤回和四项/五项校验、浏览器完整/分段预算、七服务保护及原版银狼/花火保护通过。见`reports/starrail-acheron-2026-11-27/`。后续黄泉数值维护只需CMS发布同步；下一顺位丹恒·饮月，再景元。

'''
s=s.replace(needle,update+needle,1)
s=re.sub(r'2026-11-26 已部署至 \[正式星铁版本页\].*?不能把本站核验日理解为官方重新发布了公告或热修。',f'2026-11-27 已部署至 [正式星铁版本页](https://gachia.com/zh/starrail/version)。当前正式 Main 版本为 `{version}`，源码提交为 `{prepared["sourceCommit"]}`。当前中文已发布总数 **79**，内容 revision 为 `{cloud["revision"]}`。各条目保留各自来源核验日，黄泉本批为2026-11-27；热修来源本身最后编辑于11月18日，不能把本站核验日理解为官方重新发布了公告或热修。',s,flags=re.S)
s=s.replace('阿哈、爻光、银狼LV.999和火花还需查看','阿哈、爻光、银狼LV.999、火花和黄泉还需查看')
a=s.index('阿哈、爻光、银狼LV.999和火花日常数值维护');b=s.index('\n',a)
s=s[:a]+'''阿哈、爻光、银狼LV.999、火花和黄泉日常数值维护分别使用 `aha-character-data`、`yaoguang-character-data`、`silver-wolf-lv999-character-data`、`sparxie-character-data`、`acheron-character-data` 条目的「角色倍率与材料数据」字段。按注册结构保留完整技能：黄泉四项、前四名欢愉角色五项，另有六次晋阶与十三个节点；材料上限及星魂展示等级须分别核对。角色详情与材料总量从同份数据更新，无需手改第二份合计。原两条叙述性阿哈公告保留为历史核验记录，若事实有修订也应检查其表述。'''+s[b:]
s=s.replace('## 边界与恢复\n','''## 边界与恢复

- 回退至黄泉注册之前的Main（火花版本`f5a9c7b9-c330-40a8-aaee-c7c6dd20fbaf`及更早）前，先经Payload撤回黄泉、同步并验收原78条完整副本，再回退代码；旧Main不接受黄泉身份及来源。若继续回退至爻光/银狼LV.999/火花注册之前，须逐个撤回旧Main不支持的新角色记录并同步验收。以下活动/材料旧恢复计数以这四条新角色已撤回、恢复75条兼容副本为前提。日常数值回退优先Payload版本历史，无需回退Main。
''')
s=s.replace('当前副本含34条`material`、共75条中文记录','该旧恢复基线含34条`material`、共75条中文记录');doc.write_text(s)
print('Final release evidence assembled:',79,cloud['revision'],version)

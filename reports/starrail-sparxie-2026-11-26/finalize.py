# -*- coding: utf-8 -*-
"""Assemble final release evidence after all publication gates pass."""
import pathlib,json,subprocess,re
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
required=['source-comparison.json','editor-acceptance.json','local-acceptance.json','preview-acceptance.json','production-acceptance.json','runtime-protection.json','compatible-main-acceptance.json','browser-acceptance.json','browser-local-acceptance.json','local-worker-stop.json','original-sparkle-acceptance.json']
for name in required:assert read(name)['status']=='passed',name
cloud=read('cloud-after.json');receipt=read('sync-receipt.json');expected=read('expected-publication.json');prepared=read('runtime-prepared.json');ci=read('ci.json');version=read('runtime-upload.json')['versionId'];prod=read('production-acceptance.json')
assert receipt['ok'] and receipt['count']==78 and receipt['revision']==cloud['revision']
assert sorted(expected['docs'],key=lambda x:x['slug'])==sorted(cloud['docs'],key=lambda x:x['slug'])
assert sum(len(d.get('eventSchedule',{}).get('entries',[])) for d in cloud['docs'])==15
assert ci['conclusion']=='success' and ci['headSha']==prepared['sourceCommit']
for name,needles in {'data-tests.log':['22 passed','202 passed'],'web-tests.log':['107 passed','636 passed'],'main-build.log':['OpenNext build complete.'],'mirrors.log':['managed-raw-mirrors-v1'],'manifests.log':['Data manifests verified.']}.items():assert all(n in (r/name).read_text() for n in needles),name
ports={p:subprocess.run(['lsof','-nP','-iTCP:'+p,'-sTCP:LISTEN'],capture_output=True,text=True).stdout.strip() for p in ['4320','4398','4399','4400']}
assert ports['4320'] and not ports['4400'] and all(ports[p]==read('local-services-before.json')[p] for p in ['4398','4399'])
size=len(json.dumps({'revision':cloud['revision'],'docs':cloud['docs']},ensure_ascii=False,separators=(',',':')).encode());assert size<512*1024
checks={'status':'passed','sources':read('source-comparison.json'),'web':{'files':107,'tests':636,'types':'passed','productionBuild':'passed'},'data':{'files':22,'tests':202,'types':'passed'},'cms':read('editor-acceptance.json'),'rawMirrors':'passed','manifests':'passed','CI':ci,'releaseGates':required,'publication':{'count':78,'revision':cloud['revision'],'created':1,'calendarEntries':15,'canonicalUTF8Bytes':size},'localServices':{'editor4320Running':True,'test4400Stopped':True,'unrelatedListenersPreserved':True},'backup':{'before':read('backup-before.json'),'after':read('backup-after.json')}}
(r/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
para=f'''\n## 正式发布与验收

兼容Main版本`{version}`，源码`{prepared['sourceCommit']}`，模块SHA256 `{prepared['moduleSHA256']}`。候选和正式分别通过{len(read('preview-acceptance.json')['checks'])}、{len(prod['checks'])}项检查，正式站{len(prod['assets'])}个静态资源逐字节核对。兼容Main切换后先确认原77条、revision及15项日历保持，火花草稿未公开，再经Payload正式发布与`publish:starrail`同步至78条，revision `{cloud['revision']}`，规范JSON为{size} UTF-8字节；英日文独立空发布。

旧版全部{prepared['staticRetention']['previous']}条静态路径保留，复制{prepared['staticRetention']['copied']}个文件，同路径碰撞均摘要相同。七服务前后独立快照证明仅Main部署变化，其余六服务部署与全部routes/subdomain/bindings/settings保持。原版花火三语主内容在部署前后摘要一致。真实Worker验收动态更新、撤回和缺译；本地及正式浏览器核对完整预算、扣除晋阶6额外能力后的3,168,000信用点、欢愉技7→10独立材料、角色切换重置。4320编辑器运行，4400测试Worker整棵进程树已停，前后SQLite一致性备份完整性检查通过。CI、测试、类型和生产构建通过，见`checks.json`。

下一顺位为第二期复刻角色的完整技能与材料；命途升格两档适用条件、兑换码和活动独立窗口继续按证据核验。已注册火花后续数值修订只需CMS正式发布与同步，无需再次部署Main。
'''
p=r/'README.md';assert '## 正式发布与验收' not in p.read_text();p.write_text(p.read_text()+para)
previous=read('../starrail-silverwolf-999-2026-11-26/remaining-priorities.json');previous['currentBatch']={'creates':1,'updates':0,'totalPublication':78,'calendarEntries':15,'character':'火花'};previous['completed']=['火花129格普通/强化技能倍率、六次晋阶、41段技能升级与13节点材料，经Payload发布接入详情、目录及多角色计算器','接管sparxie旧不完整入口，原版sparkle三语独立保留，撤回或缺译不回退旧资料','记录17格倍率展示差异与5格欢愉技更长小数来源；强化形态不重复计费，欢愉技高等级材料独立计算'];previous['priorityOrder'][0]='第二期复刻按黄泉→丹恒·饮月→景元逐个补齐完整技能倍率与材料；先让角色结构支持非欢愉角色的四项技能与对应材料，不补造欢愉技';previous['independentEvidenceRequired'].insert(0,'火花命途升格「欢愉万相★兔子戏法」两档适用条件；基础倍率与材料已分开');previous['boundary']='火花基础与强化倍率、材料已按第三方展示与固定数据核对，未将共享上游当作独立官方证据；命途升格两档条件待核准。';(r/'remaining-priorities.json').write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n')
doc=r.parents[1]/'docs/starrail-cms-main-site.md';s=doc.read_text();needle='2026-11-26 银狼LV.999批次';assert needle in s
update=f'''2026-11-26 火花批次新增`sparxie-character-data`，补齐129格普通/强化普攻、互动陷阱、终结技、天赋及欢愉技倍率、六次晋阶、41段技能与13节点材料。接管现有`sparxie`入口，原版花火`sparkle`三语主内容保持；缺译和撤回不回退旧资料。完整目标3,308,000信用点，欢愉技7→10不收周本与足迹，强化形态不重复计费。17格展示精度差异与欢愉技5格更长小数均留证，第三方来源可能共享上游；命途升格两档条件仍待独立核准。兼容Main`{version}`，源码`{prepared['sourceCommit']}`，确认77条基线后经Payload发布同步至78条，revision `{cloud['revision']}`，保留15项日历。候选/正式三语、静态资源、真实Worker动态更新/撤回、浏览器完整和分段预算及七服务保护均通过。报告见`reports/starrail-sparxie-2026-11-26/`。后续火花数值维护只需CMS发布同步；下一顺位为第二期复刻角色。

'''
s=s.replace(needle,update+needle,1)
s=re.sub(r'2026-11-26 已部署至 \[正式星铁版本页\].*?不能把本站核验日理解为官方又发布了新热修。',f'2026-11-26 已部署至 [正式星铁版本页](https://gachia.com/zh/starrail/version)。当前正式 Main 版本为 `{version}`，源码提交为 `{prepared["sourceCommit"]}`。当前中文已发布总数 **78**，内容 revision 为 `{cloud["revision"]}`。各条目保留各自来源核验日，火花本批为2026-11-26；热修来源本身最后编辑于11月18日，不能把本站核验日理解为官方重新发布了公告或热修。',s,flags=re.S)
s=s.replace('阿哈、爻光和银狼LV.999还需查看各自独立角色页','阿哈、爻光、银狼LV.999和火花还需查看各自独立角色页').replace('阿哈、爻光和银狼LV.999日常数值维护分别使用 `aha-character-data`、`yaoguang-character-data`、`silver-wolf-lv999-character-data` 条目的','阿哈、爻光、银狼LV.999和火花日常数值维护分别使用 `aha-character-data`、`yaoguang-character-data`、`silver-wolf-lv999-character-data`、`sparxie-character-data` 条目的');doc.write_text(s)
print('Final evidence assembled:',78,cloud['revision'],version)

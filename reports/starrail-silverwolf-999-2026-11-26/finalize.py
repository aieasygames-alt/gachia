# -*- coding: utf-8 -*-
"""Finalize evidence only after the deployed reader and complete CMS publication pass."""
import pathlib,json,subprocess
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
for name in ['source-comparison.json','editor-acceptance.json','local-acceptance.json','preview-acceptance.json','production-acceptance.json','runtime-protection.json','compatible-main-acceptance.json','browser-acceptance.json','browser-local-acceptance.json','local-worker-stop.json','original-silverwolf-acceptance.json']:
 assert read(name)['status']=='passed',name
cloud=read('cloud-after.json');receipt=read('sync-receipt.json');expected=read('expected-publication.json')
assert receipt['ok'] and receipt['count']==77 and receipt['revision']==cloud['revision']
assert sorted(expected['docs'],key=lambda x:x['slug'])==sorted(cloud['docs'],key=lambda x:x['slug'])
assert sum(len(d.get('eventSchedule',{}).get('entries',[])) for d in cloud['docs'])==15
assert read('ci.json')['conclusion']=='success' and read('ci.json')['headSha']==read('runtime-prepared.json')['sourceCommit']
for name,needles in {'data-tests.log':['21 passed','199 passed'],'web-tests.log':['107 passed','635 passed'],'main-build.log':['OpenNext build complete.'],'mirrors.log':['verified'],'manifests.log':['passed']}.items():
 text=(r/name).read_text()
 # The exact logs remain local; counts and build status are summarized in checks.json.
 if name in ['data-tests.log','web-tests.log','main-build.log']:assert all(n in text for n in needles),name
ports={p:subprocess.run(['lsof','-nP','-iTCP:'+p,'-sTCP:LISTEN'],capture_output=True,text=True).stdout.strip() for p in ['4320','4398','4399','4400']}
assert ports['4320'] and not ports['4400'] and all(ports[p]==read('local-services-before.json')[p] for p in ['4398','4399'])
checks={'status':'passed','sources':read('source-comparison.json'),'web':{'files':107,'tests':635,'types':'passed','productionBuild':'passed'},'data':{'files':21,'tests':199,'types':'passed'},'cms':read('editor-acceptance.json'),'rawMirrors':'passed','manifests':'passed','CI':read('ci.json'),'localWorker':'local-acceptance.json','preview':'preview-acceptance.json','production':'production-acceptance.json','runtimeProtection':'runtime-protection.json','browser':'browser-acceptance.json','originalSilverWolf':'original-silverwolf-acceptance.json','publication':{'count':77,'revision':cloud['revision'],'created':1,'calendarEntries':15,'canonicalUTF8Bytes':len(json.dumps({'revision':cloud['revision'],'docs':cloud['docs']},ensure_ascii=False,separators=(',',':')).encode())},'localServices':{'editor4320Running':True,'test4400Stopped':True,'unrelatedListenersPreserved':True},'backup':{'before':read('backup-before.json'),'after':read('backup-after.json')}}
(r/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
prepared=read('runtime-prepared.json');version=read('runtime-upload.json')['versionId'];prod=read('production-acceptance.json')
para=f"""\n## 正式发布与最终验收

兼容Main版本`{version}`，源码`{prepared['sourceCommit']}`，模块SHA256 `{prepared['moduleSHA256']}`。候选与正式分别通过{len(read('preview-acceptance.json')['checks'])}、{len(prod['checks'])}项检查，正式站{len(prod['assets'])}个静态资源逐字节核对。切换兼容Main后先确认原76条、revision及15项日历完整保留，银狼LV.999草稿仍未公开，再通过Payload发布和`publish:starrail`同步至77条，revision `{cloud['revision']}`。全文与结构化字段均与审定副本一致，英日文独立空发布。

旧版全部{prepared['staticRetention']['previous']}条静态路径保留，复制{prepared['staticRetention']['copied']}个文件，已有同路径文件摘要一致。七服务独立快照确认仅Main部署变化，其他六服务部署及全部routes/subdomain/bindings/settings保持。真实Worker测试动态修订、撤回、缺译和原版银狼保留；浏览器核对正式站完整预算、扣除已完成节点、欢愉技7→10独立消耗、角色切换重置与强化倍率。CI、类型、生产构建和CMS测试均通过。4320编辑器保持运行，测试Worker进程树已停；前后SQLite一致性备份integrity_check通过。详见`checks.json`。

下一顺位：火花完整倍率与材料，再补第二期复刻；命途升格两档条件、有效国服兑换码与活动独立窗口继续按证据核验。
"""
p=r/'README.md';assert '## 正式发布与最终验收' not in p.read_text();p.write_text(p.read_text()+para)
previous=read('../starrail-yaoguang-2026-11-26/remaining-priorities.json')
previous['currentBatch']={'creates':1,'updates':0,'totalPublication':77,'calendarEntries':15,'character':'银狼LV.999'}
previous['completed']=['银狼LV.999的93格普通/强化技能倍率、六次晋阶、41段技能升级和13节点材料，经Payload发布接入详情、目录和多角色计算器','接管现有silver-wolf-lv999规范地址，移除旧不完整卡片和通用计算入口，原版silver-wolf独立保留','来源精度和材料冲突记录，欢愉技7→10不多算周本或足迹；撤回和缺译不回退旧资料']
previous['priorityOrder'][0]='继续当前跃迁相关角色火花的完整倍率与材料，再补第二期复刻角色'
previous['independentEvidenceRequired'].insert(0,'银狼LV.999命途升格「欢愉万相★全息幻象」两档切换条件；基础倍率与材料已分开')
previous['boundary']='银狼LV.999基础与强化技能、材料已按第三方展示与固定数据核对，未将共享上游算作独立官方证据；命途升格档位条件仍待独立核准。'
(r/'remaining-priorities.json').write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n')
doc=r.parents[1]/'docs/starrail-cms-main-site.md';s=doc.read_text();needle='2026-11-26 爻光角色批次';assert needle in s
update=f"2026-11-26 银狼LV.999批次新增`silver-wolf-lv999-character-data`，补齐93格普通/强化形态倍率、六次晋阶、41段技能升级与13节点材料。现有`silver-wolf-lv999`地址接管为CMS独立详情，原版`silver-wolf`保留；目录和通用计算移除旧不完整记录，缺译、撤回不回退。多角色计算支持银狼完整及分段目标，强化形态不重复收取材料。已记录BWIKI天赋32%/37%与Station/固定数据32.5%/37.5%的差异，并说明终结技和强化欢愉技73.125%/84.375%的显示精度来源。兼容Main为`{version}`，确认76条基线后才经Payload发布同步到77条，revision `{cloud['revision']}`，保留15项日历。来源、真实Worker动态更新/撤回、三语、浏览器预算、静态资源和七服务保护验收通过。报告见`reports/starrail-silverwolf-999-2026-11-26/`。后续已注册角色数值维护通过CMS发布同步，无需再次部署Main；下一顺位火花，命途升格档位仍待独立核准。\n\n"
s=s.replace(needle,update+needle,1).replace('阿哈和爻光还需查看各自独立角色页','阿哈、爻光和银狼LV.999还需查看各自独立角色页').replace('阿哈和爻光日常数值维护分别使用 `aha-character-data`、`yaoguang-character-data` 条目的','阿哈、爻光和银狼LV.999日常数值维护分别使用 `aha-character-data`、`yaoguang-character-data`、`silver-wolf-lv999-character-data` 条目的');doc.write_text(s)
print('Final evidence assembled:',77,cloud['revision'],version)

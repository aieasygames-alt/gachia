# -*- coding: utf-8 -*-
"""Assemble final evidence only after publication and runtime acceptance pass."""
import json,pathlib,subprocess,urllib.request
r=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((r/n).read_text())
for name in ['source-comparison.json','editor-acceptance.json','local-acceptance.json','preview-acceptance.json','production-acceptance.json','runtime-protection.json','compatible-main-acceptance.json','browser-acceptance.json']:
 assert read(name)['status']=='passed',name
receipt=read('sync-receipt.json');cloud=read('cloud-after.json');expected=read('expected-publication.json')
assert receipt['ok'] and receipt['count']==76 and cloud['revision']==receipt['revision']
assert sorted(cloud['docs'],key=lambda d:d['slug'])==sorted(expected['docs'],key=lambda d:d['slug'])
assert sum(len(d.get('eventSchedule',{}).get('entries',[])) for d in cloud['docs'])==15
assert read('ci.json')['conclusion']=='success'
listeners={p:subprocess.run(['lsof','-nP','-iTCP:'+p,'-sTCP:LISTEN'],capture_output=True,text=True).stdout.strip() for p in ['4320','4398','4399','4400']}
assert listeners['4320'] and not listeners['4400']
assert all(listeners[p]==read('local-services-before.json')[p] for p in ['4398','4399'])
checks={'status':'passed','sourceComparison':'source-comparison.json','web':{'files':107,'tests':634,'types':'passed','productionBuild':'passed'},'data':{'files':20,'tests':196,'types':'passed'},'cms':{'repositoryTests':11,'actualEditorTests':5,'actualTypes':'passed','actualProductionBuild':'passed','schemaMigrationRequired':False},'rawMirrors':'passed','manifests':'passed','CI':read('ci.json'),'localWorker':'local-acceptance.json','preview':'preview-acceptance.json','production':'production-acceptance.json','runtimeProtection':'runtime-protection.json','publication':{'count':76,'revision':cloud['revision'],'created':1,'calendarEntries':15,'canonicalUTF8Bytes':len(json.dumps({'revision':cloud['revision'],'docs':cloud['docs']},ensure_ascii=False,separators=(',',':')).encode())},'localServices':{'editor4320Running':True,'test4400Stopped':True,'unrelated4398And4399Preserved':True}}
(r/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
version=read('runtime-upload.json')['versionId'];prepared=read('runtime-prepared.json');result=read('production-acceptance.json')
summary=f"\n## 正式发布与最终验收\n\n兼容Main已切换至`{version}`，源码`{prepared['sourceCommit']}`，模块SHA256 `{prepared['moduleSHA256']}`；正式切换前原75条、revision和15项日历完整保留，爻光尚未公开。确认兼容Main后，通过Payload正式发布爻光并执行既有`publish:starrail`，回执`ok:true`、count76、revision `{cloud['revision']}`。\n\n正式站76条与审定Payload全文及结构化字段精确一致，英日文仍为独立空发布。候选与正式均通过页面、同语旧链接跳转及静态资源逐字节摘要验证；正式检查{len(result['checks'])}项、资源{len(result['assets'])}个。原版本全部{prepared['staticRetention']['previous']}个静态路径保留，复制{prepared['staticRetention']['copied']}个，碰撞摘要一致。七服务独立快照确认仅Main部署变化，其他六服务部署及全部routes/subdomain/bindings/settings保持一致。浏览器已在正式计算器选择爻光，确认完整目标、节点扣除、分段欢愉技以及切换重置。4320编辑器运行、4400测试Worker已停，SQLite前后备份integrity_check通过；完整回执见`checks.json`。\n\n下一顺位继续当前跃迁相关角色（银狼LV.999、火花）的完整数值与材料，再补第二期复刻；命途升格档位、有效国服码及活动独立窗口继续按证据单独核验。\n"
p=r/'README.md';assert '## 正式发布与最终验收' not in p.read_text();p.write_text(p.read_text()+summary)
doc=r.parents[1]/'docs/starrail-cms-main-site.md';s=doc.read_text();para=f"2026-11-26 爻光角色批次新增`yaoguang-character-data`，接入五项基础倍率、六次晋阶、41档技能升级和13节点材料，默认完整目标3,308,000信用点；欢愉技高等级消耗独立处理。角色目录、详情与计算器共用Payload数据，计算器新增角色选择，旧`yao-guang`地址同语308跳转，移除旧目录和通用计算占位记录，撤回或缺译不回退旧库。BWIKI的Lv7群攻81.125%与Station/固定参数冲突，采用81.25%；材料不套BWIKI通用模板。第三方展示与提取可能共享上游，不算独立官方证据；命途升格两档切换条件仍待核准。兼容Main为`{version}`，确认75条基线完整后才通过CMS正式发布并同步至76条，revision `{cloud['revision']}`，15项日历保留。已验收来源、分段预算、草稿隔离、三语隔离、撤回、旧链路、静态资源和七服务部署保护。报告见`reports/starrail-yaoguang-2026-11-26/`。后续爻光数值维护只需CMS发布同步，无需再次部署Main。\n\n"
needle='2026-11-26 材料额外来源批次';assert needle in s;s=s.replace(needle,para+needle,1);s=s.replace('阿哈还需查看独立角色页、角色目录与计算器','阿哈和爻光还需查看各自独立角色页、角色目录与计算器');s=s.replace('阿哈日常数值维护使用 `aha-character-data` 条目的','阿哈和爻光日常数值维护分别使用 `aha-character-data`、`yaoguang-character-data` 条目的');doc.write_text(s)
print('Final evidence assembled:',76,cloud['revision'],version)

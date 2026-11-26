# -*- coding: utf-8 -*-
import json,pathlib
r=pathlib.Path(__file__).resolve().parent;repo=r.parents[1]
read=lambda n:json.loads((r/n).read_text())
prod=read('production-acceptance.json');preview=read('preview-acceptance.json');sync=read('sync-receipt.json');upload=read('runtime-upload.json');prepared=read('runtime-prepared.json');ci=read('ci.json')
assert prod['status']==preview['status']=='passed' and sync['ok'] and sync['count']==71 and prod['revision']==sync['revision']
assert read('runtime-protection.json')['status']==read('migration-data-acceptance.json')['status']=='passed'
assert read('local-services.json')['publicPublishedCount']==71 and read('local-publication.json')['totalPublished']==71
assert len(read('local-publication.json')['records'])==3 and ci['conclusion']=='success' and ci['headSha']==upload['sourceCommit']
calendar=[c for c in prod['checks'] if 'calendarEntries' in c];assert len(calendar)==3 and sum(c['calendarEntries'] for c in calendar)==11
version=upload['versionId'];source=upload['sourceCommit'];revision=sync['revision']
p=r/'README.md';s=p.read_text();assert '## 正式发布与验收' not in s
s=s.replace('正式回执在实际完成后补充。','完整回执见下文。')
s+=f'''
## 正式发布与验收

源码`{source}`，CI [{ci['databaseId']}]({ci['url']})通过。主站由`{prepared['previousVersion']}`切换至`{version}`，实际模块SHA256 `{prepared['moduleSHA256']}`；前版{prepared['staticRetention']['previous']}个不可变静态资源路径保留，复制{prepared['staticRetention']['copied']}个，碰撞摘要一致。候选{len(preview['checks'])}项路由和{len(preview['assets'])}个静态资源摘要检查通过；候选阶段未发布日历。

兼容Main正式上线后确认原71条全文、revision及三语隔离保留，日历仍未公开。随后通过Payload Local API发布3条已审定草稿，版本历史保留；`publish:starrail`返回ok:true、count71、revision `{revision}`，云端完整规范字段与审定副本精确一致，含11项日历。正式{len(prod['checks'])}项路由和{len(prod['assets'])}个静态资源摘要检查通过，验收结束再次确认revision未变化，见`production-acceptance.json`。

主站107文件632项、数据19文件193项、CMS11项测试通过，类型检查及主站/实际CMS生产构建通过。隔离本地D1验证全部71条、11项日历即时日期修改、非法日期/时区/重复ID拒绝、部分及全部撤回、三语隔离，同时回归角色/计算器、5篇攻略、17项装备、34种材料及历史别名。测试数据只写隔离D1，见`local-acceptance.json`。

一致性备份与隔离迁移逐表比较确认全部原始列、原始行和版本历史保留，仅增加两列可空字段及一条迁移元数据，见`migration-data-acceptance.json`；实际迁移保留71条公开记录与原最新时间戳。最终4320编辑器运行并匿名回读71条，发布后一致性备份integrity_check通过，4400测试Worker已停，4398/4399保持开始时未运行状态，见`local-services.json`。

七服务独立快照确认只变更Main版本，其他六个部署与全部七服务routes/subdomain/bindings/settings均未变化，见`runtime-protection.json`。新日历字段接入后，日常时间/条件/正文修订继续只需Payload发布和同步，无需重建Main。
'''
p.write_text(s)
p=repo/'docs/starrail-cms-main-site.md';s=p.read_text();assert '2026-11-26 国服结构化活动日历' not in s
intro='''2026-11-26 国服结构化活动日历已接入活动页：复用3条既有event记录维护11项活动、版本好礼、赛季与周期挑战。共享可选`eventSchedule`字段保留国服公告原文时刻，明确区分更新后开放、版本结束前和未公告独立截止；跨年周期不截断到版本结束。日历日期、参与条件、说明、来源与正文一并经Payload发布，撤回移除对应卡片，缺译不借用中文。独立编辑器以增量迁移增加当前表/历史表两列可空JSON文本，不删除旧内容；71条总数不变，完整规范副本为210204字节（约205KiB）。报告及编辑格式见`reports/starrail-event-calendar-2026-11-26/`。

'''
s=s.replace('2026-11-26 第三批关联材料',intro+'2026-11-26 第三批关联材料',1)
s=s.replace('当前正式 Main 版本为 `ff1d61b0-0877-4127-9ef9-0f2691f55b4b`，源码提交为 `2426dcf143a9e99c440598b954605bf545bb152f`。当前中文已发布总数 **71**，内容 revision 为 `1795656122294`。',f'当前正式 Main 版本为 `{version}`，源码提交为 `{source}`。当前中文已发布总数 **71**，内容 revision 为 `{revision}`。')
s=s.replace('下一主优先级为国服结构化活动日历；','国服结构化活动日历首批11项现已接入，后续优先补充独立活动窗口与不同奖励截止；')
s=s.replace('国服结构化活动日历继续按顺序推进。','国服结构化活动日历首批11项现已接入；独立活动窗口及其他待核验项继续按证据补充。')
s=s.replace('各条目保留各自来源核验日，新批材料为2026-11-26，旧批保留原日期；','各条目保留各自来源核验日，新批材料与本批3条日历为2026-11-26，其余保留原日期；')
s=s.replace('本批71条规范副本约200KiB（204906字节）。','第三批材料完成时71条规范副本约200KiB（204906字节）。',1)
needle='取消发布或删除记录后同样执行同步命令。'
s=s.replace(needle,'活动日历日常维护选择原3条活动记录，在「国服结构化活动日历」编辑对应项，并同步核对facts、summary、boundary与sources。`at.value`填写无时区的`YYYY-MM-DDTHH:mm`公告时刻；`after-update`填写date/version；`version-end`填写version；`not-announced`不填推测时间。发布、同步后检查活动页的起止、参与条件、来源及正文锚点，不能把国服公告的无时区时刻改写为自动倒计时。\n\n'+needle,1)
needle='- 当前副本含34条`material`、共71条中文记录。'
s=s.replace(needle,'- 当前副本有3条活动记录含`eventSchedule`、共11项日历。回退至`ff1d61b0` Main前，先经Payload历史恢复本批3条原记录、同步并验收原71条兼容副本，再回退代码；保留新可空列和所有历史版本。日常日历修订直接使用Payload版本历史。\n'+needle,1)
s=s.replace('- 当前副本含34条`material`、共71条中文记录。','- 回退至以下更早Main版本，还须先完成上述3条日历记录恢复与同步。当前副本含34条`material`、共71条中文记录。',1)
assert f'当前正式 Main 版本为 `{version}`' in s and f'内容 revision 为 `{revision}`' in s
p.write_text(s)
p=repo/'tools/payload-cms/README.md';s=p.read_text().replace('以及三批34种关联材料/货币图鉴。','以及三批34种关联材料/货币图鉴、11项国服结构化活动日历。');p.write_text(s)
p=r/'checks.json';x=read('checks.json');x.update({'CI':ci,'localWorker':'local-acceptance.json','runtimePreview':'preview-acceptance.json','runtimeProduction':'production-acceptance.json','runtimeProtection':'runtime-protection.json','migrationDataPreservation':'migration-data-acceptance.json','published':{'count':71,'revision':revision,'recordsUpdated':3,'calendarEntries':11}});p.write_text(json.dumps(x,indent=2)+'\n')
print('Archived calendar production release:',len(prod['checks']),'routes;',len(prod['assets']),'assets;',revision)

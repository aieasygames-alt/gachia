# -*- coding: utf-8 -*-
import pathlib,json
r=pathlib.Path(__file__).resolve().parent;repo=r.parents[1]
read=lambda name:json.loads((r/name).read_text())
prod=read('production-acceptance.json');preview=read('preview-acceptance.json');sync=read('sync-receipt.json');upload=read('runtime-upload.json');prepared=read('runtime-prepared.json')
assert prod['status']==preview['status']=='passed' and prod['revision']==sync['revision'] and sync['count']==71
assert read('runtime-protection.json')['status']=='passed' and read('local-services.json')['publicPublishedCount']==71
source=upload['sourceCommit'];version=upload['versionId'];revision=sync['revision']
p=r/'README.md';s=p.read_text();assert '## 正式发布与验收' not in s
s=s.replace('完成回执随后补充。','完整回执见下文。')
s+=f'''
## 正式发布与验收

源码`{source}`，远端CI [45733965835](https://github.com/aieasygames-alt/gachia/actions/runs/45733965835)通过。Main由`{prepared['previousVersion']}`切换至`{version}`，实际上传与下载模块SHA256 `{prepared['moduleSHA256']}`。前版{prepared['staticRetention']['previous']}个不可变静态资源路径全部保留，复制{prepared['staticRetention']['copied']}个，碰撞摘要一致；候选{len(preview['checks'])}项路由与{len(preview['assets'])}个静态资源摘要比对通过。

兼容Main上线后先确认原55条及revision保留，新增16种材料/信用点的48个三语详情均待发布/noindex，目录无旧卡片回退。随后经Payload Local API正式发布16条，各保留草稿及正式版本；匿名导出71条与审定内容相同。`publish:starrail`返回`ok:true`、count71、revision `{revision}`，云端完整规范字段与审定副本精确一致。见`compatible-main-acceptance.json`、`local-publication.json`、`sync-receipt.json`和`cloud-after.json`。

隔离本地D1验收完整71条、匿名/草稿/来源/旧revision保护，全部34种材料的修订、撤回、缺译和双向链接；撤回不恢复旧正文/卡片/FAQ。阿哈/计算器、5篇攻略、17件装备及历史别名回归通过。测试只写隔离D1，见`local-acceptance.json`。

正式站{len(prod['checks'])}项路由与{len(prod['assets'])}个静态资源摘要比对通过。71条完整正文/来源/边界、34种材料三语详情、目录唯一入口及光锥双向关系均通过；缺译noindex、CMS路由no-store，公共镜像与三语清单和构建产物一致。验收结束再次读取revision，确认没有并发发布变化。见`production-acceptance.json`。

七服务独立快照确认仅Main版本变化，其他六个部署及全部七服务routes/subdomain/bindings/settings均未变，见`runtime-protection.json`。本机4320编辑器继续运行并回读71条；发布前后一致性SQLite备份integrity_check通过，原文、数据库备份及前版编辑器构建均保存在忽略`.private/`。4400测试Worker已停止，4398/4399保持本轮开始时未运行状态，未操作其他任务进程，见`local-services.json`。
'''
p.write_text(s)
p=repo/'docs/starrail-cms-main-site.md';s=p.read_text();assert '2026-11-26 第三批关联材料' not in s
intro='''2026-11-26 第三批关联材料新增16条`material`：存护旧系列（青铜的执着、寒铁的誓言、琥珀的坚守）、丰饶旧系列（丰饶之种、生命之芽、永恒之花）、步离犬牙系列、陨铁弹丸系列、炽情之灵系列及信用点。15条新稳定URL加原`credit`，累计34种关联材料/货币接入；原始库新增15条并修订信用点来源，保留currency类型，68条增至83条。三语搜索清单仅星铁变化。主获取地点按逐材料核验，信用点【鸽川区】未得到本次BWIKI印证，未列入已核验来源，并公开说明差异；晋阶信用点示例明确不含喂经验、角色培养或其他开支。报告见`reports/starrail-materials-traces-2026-11-26/`。

此前34种候选现已完成身份及主要来源接入，不代表全量星铁材料库完成核验。下一主优先级为国服结构化活动日历；信用点【鸽川区】、此前BWIKI独有商店来源、异器盈界独立日程和有效国服码继续独立核验。容量仍为每语言100、全体300且受512KiB限制，本批71条规范副本约200KiB（204906字节）。

'''
s=s.replace('2026-11-25 第二批关联材料',intro+'2026-11-25 第二批关联材料',1)
s=s.replace('当前累计18条材料详情','该批完成后累计18条材料详情')
s=s.replace('本批55条规范副本约168 KiB。','第二批55条规范副本约168 KiB。')
s=s.replace('2026-11-25 已部署至 [正式星铁版本页]','2026-11-26 已部署至 [正式星铁版本页]')
s=s.replace('同日剩余光锥批次','2026-11-25 剩余光锥批次',1)
s=s.replace('当前正式 Main 版本为 `b4460f8c-7de7-488e-8c51-804a3d1e2e2e`，源码提交为 `729a9abdd2e7c2dcf9dd56f5611bde10231e1152`。当前中文已发布总数 **55**，内容 revision 为 `1795616809786`。',f'当前正式 Main 版本为 `{version}`，源码提交为 `{source}`。当前中文已发布总数 **71**，内容 revision 为 `{revision}`。')
s=s.replace('所有条目的来源核验日为 2026-11-25；','各条目保留各自来源核验日，新批材料为2026-11-26，旧批保留原日期；')
s=s.replace('随后两批18种材料已按上文独立接入，剩余16种材料与国服结构化活动日历继续按顺序推进。','随后三批34种材料/信用点已按上文接入，国服结构化活动日历继续按顺序推进。')
s=s.replace('编辑上述18个稳定标识对应的记录','编辑上述34个稳定标识对应的记录')
old='- 当前副本含18条`material`、共55条中文记录。回退至`b0d62b83` Main前，须先通过Payload撤回第二批九条材料并同步完整兼容副本至46条、验收；该旧版缺少新材料注册与来源且每语言上限50，不能读取55条完整副本。回退至`157633b1`或更早Main前，须撤回全部18条材料并同步、验收；旧版解析器不识别材料类型。文字恢复优先Payload版本历史。'
new='- 当前副本含34条`material`、共71条中文记录。回退至`b4460f8c` Main前，须先经Payload撤回第三批16条并同步、验收原55条兼容副本；该旧版不认识新身份/来源。回退至`b0d62b83`前还须撤回第二批九条，恢复46条并验收，满足该旧版每语言50条限制。回退至`157633b1`或更早前须撤回全部34条材料并同步、验收；旧版不识别material。文字恢复优先Payload版本历史。'
assert old in s;s=s.replace(old,new)
s=s.replace('当前全部18条材料','当前全部34条材料').replace('当前18条材料','当前34条材料').replace('上述17条装备及18条材料','上述17条装备及34条材料')
assert f'当前正式 Main 版本为 `{version}`' in s and f'内容 revision 为 `{revision}`' in s
assert '剩余16种材料' not in s and '当前副本含18条' not in s
p.write_text(s)
p=repo/'tools/payload-cms/README.md';s=p.read_text().replace('以及两批18种材料图鉴','以及三批34种关联材料/货币图鉴');p.write_text(s)
p=r/'checks.json';x=json.loads(p.read_text());x.update({'CI':read('ci.json'),'runtimeProduction':'production-acceptance.json','runtimeProtection':'runtime-protection.json','published':{'count':71,'revision':revision,'materialsAndCredit':34}});p.write_text(json.dumps(x,indent=2)+'\n')
print('Archived production acceptance:',len(prod['checks']),'routes,',len(prod['assets']),'assets; revision',revision)

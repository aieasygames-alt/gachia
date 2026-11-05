# R37：上线后最新异地备份、隔离恢复与保留基线

日期：2026-11-05，Asia/Shanghai。工程工作树为`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`。继续R36后的下一阶段运维，不制造内容发布、不重新开放已关闭的V1验收，不改独立密钥暂缓决定。

## 1. 本轮结论

**最新异地数据包已从R29刷新到R37，并通过新鲜下载、AES认证解密和实际隔离数据库/媒体恢复。** 包含两游戏各1条已发布编辑、其他82条草稿/hold、私有媒体/settings、当前全部28工具、本机导出状态，以及源码/锁/测试；不再只保护首发前的旧数据。

另外完成只读磁盘/根级依赖盘点和保留规则，以及既有low依赖的新鲜官方公告/registry/audit复核。**没有删除任何文件、回收空间、升级依赖、修改内容或上传/部署Worker。** 限定V1保持完成；C01/C02/C03/C04/C05a保持关闭，C05b未完成/用户暂缓，原始P/T全范围等级不提升。

当前入口：[任务表](../../plans/project-task-status-current.md)、[V1清单](../../plans/payload-v1-completion-2026-11-03.md)、[恢复手册](../../docs/payload-offsite-recovery.md)、[磁盘保留规则](../../docs/payload-storage-retention.md)、[依赖风险决定](../../docs/payload-dependency-risk-2026-11-02.md)。

## 2. 最新备份与真实恢复

| 项目 | 本轮实际结果 |
| --- | --- |
| 新冷备 | `~/Library/Application Support/GachiaCMS/backups/20261105T001452Z-90c4d4` |
| 新对象身份 | `20261105T001452Z-6447ebfc7aa48ecc8fd27178`；完整桶/key/pin及keyPath仅本机原始回执保存 |
| 密文大小 | 52,082,293字节；AES-256-GCM，key留在既有本机私有key目录，不随对象上传 |
| 私有桶边界 | `gachia-cms-private-backups`，r2.dev关闭、无custom domain、七个网站服务无此桶binding |
| R2动作 | 1次新对象PUT；存在性检查、上传后新鲜GET、密文pin/格式/隐私检查通过，0写重试 |
| 认证/成员 | 实际下载密文认证解密，明文pin一致；45归档成员逐个大小/摘要验证，通过路径/链接/预算检查后排他提取 |
| 源码/工具 | 2671源码文件完整验证，当前28安装工具逐文件与在线安装摘要一致；含应用manifest及两个已安装TS helper |
| 源码快照 | `f6a0b21d48ff2001635de6939dbb6cde742848c2`，含此前发布工具修复；不把后续R37文档提交称为包内源码 |
| 隔离恢复 | 从下载解密后的副本另建本机备份目录，manager创建/恢复/校验/删除临时PG数据库，媒体字节一致；没有替换`gachia_cms` |
| 数据状态 | 1用户/84内容/1媒体；Genshin30draft/hold+1published，NTE52draft/hold+1published；完整DB逻辑摘要与R36及在线观察一致 |

完整DB摘要为`7fb83e21f6a68ea89a08234cb673ffc20a270d2ec7448bd8c2230bd32e044c83`。冷备短暂停启CMS后恢复健康；下载恢复阶段没有重启在线CMS或修改其settings/内容。恢复用的新目录保留，临时数据库已正常删除。

本轮**不是**再次恢复应用登录/重启、从零安装、跨机运行或整机灾难恢复。R30实际应用恢复证据保持，安装应用仍为R33源码`23c8e3e3bb49884763b34d8e8be619bc4d42c3da`，本轮未升级。包不含依赖/build、OAuth、Git历史或完整历史release/source制品链，不能用它继续旧云上传/推广journal；公众未知UUID仍fail closed。

旧R17/R29对象与key均保留，R29–R36封存报告不重写。最新R37key仍仅同机，C05b明确暂缓；Mac与key一并丢失时，R2密文仍可能无法解密，不把本轮真实数据恢复冒称完整灾备。

## 3. 磁盘预算与保留依赖

最终只读盘点可用空间约**17.9GiB**，没有低于本轮手册10GiB预警线。发布根目录约39.15GiB、CMS数据根约4.32GiB、本机异地备份工作目录约0.83GiB、reports约0.57GiB；各根可能共享hardlink，不能把独立du结果相加当唯一物理占用。

解析2931份JSON/JSONL、30个发布根一级目录、87条根级路径引用，无解析失败；第一份盘点发生于备份进行时，`storage-final.json`为恢复结束后的第二份稳定观察。所有目录保守保护，可删候选为空，**零删除/零回收**。剩余空间与R36不同也不归因于本轮清理。

这是根级引用图，不是全pin可达性证明，跳过源码/依赖/build等目录；被pin的Wrangler/CLI文件可能就在node_modules，不能当普通缓存删掉。新规则为低于10GiB预警、低于8GiB停止开始新构建，均为操作手册预算，**没有新增已安装自动门禁、自动GC、生命周期删除或调度**。后续实际清理须先证明当前双游戏/Main来源、兼容恢复、封存历史及partial/停止journal全部可保留，不按年龄或“暂未找到引用”删除。

## 4. 依赖复核：已查、未修复

新执行生产audit仍为1low、0moderate/high/critical，audit退出1保留；官方[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)未撤回、暂无修复版本，npm registry最新deepmerge仍4.3.1。源码/实际安装入口SHA与原原型污染复现相同，未改变依赖或安装文件。

原返回对象原型污染及Payload实际合并路径风险继续成立，不宣称不可达，也没有新声称完整HTTP权限利用已复现。仅延续可信单用户loopback的限定接受；9项本机安全HTTP保持，不能据此开放远程/多人或不可信JSON。**复核截止2026-11-16不顺延**，若官方修复/评级/暴露面变化须先处理。

首次pnpm registry查询EACCES、虚拟包路径解析失败均不当作安全结论；改用只读npm查询与真实包路径核对成功。云预查helper最初误从安装publisher导入独立offsite模块，在请求前失败，修正为源码已测试模块后成功；原日志保留。没有失败的R2上传、写重试或产品运行代码修改。

## 5. 本机、公众与多Worker保持

- CMS/PG healthy且loaded，匿名用户/内容/媒体与外部Origin/Host/cross-site拒绝，安全HTTP9/9；前后DB摘要与安装文件摘要完全一致，698应用文件/28工具通过。
- Cloudflare前后观察10Worker/保护7服务及额外staging，部署/settings与R36最终快照一致；Router和staging无变化，私有桶边界前后通过。
- 两篇指南HTML和两个Main公开JSON共4样本新鲜直连均200/无set-cookie，标题/可见新段落/canonical/description/JSON-LD及精确JSON SHA保持；缓存策略保持，不清缓存。
- Main仍`63b9b839-5ad7-4f61-9add-5df5ee336bc4`，Genshin仍`347eb5c8-36d5-4f9c-b548-bb19c8617304`，NTE仍`c1247d65-734d-42a9-8f6f-16d6ab0a1173`。本轮Worker上传/部署POST均0，不改Router/线上文章或批量解除hold。
- 生产Git main及两个false部署变量在交付时另核对；只推维护分支文档，最终精确提交CI为验证型，不携带部署凭据。不是账户级所有Dashboard/token入口已经封堵。

本机新鲜备份28/28、源码交付14/14与手册命令测试通过，文档链接/差异另验；没有冒称又跑一次本机完整CMS/806发布工具或应用build。最终文档HEAD验证CI的新鲜CMS/typecheck/Router/inventory/release结果单列，不复用R36 CI身份。

## 6. 状态与下一阶段

| 事项 | 状态 |
| --- | --- |
| 当前CMS数据/工具异地包刷新 | 完成，R37替代R29为最新回执 |
| 本轮下载包隔离DB/媒体恢复 | 完成，在线库不替换 |
| 磁盘/根级引用盘点与操作保留规则 | 完成；实际清理、完整GC及自动门禁未实现 |
| low依赖最新复核 | 完成复核，漏洞未修复，11-16截止不变 |
| C01/C02/C03/C04/C05a及修订限定V1 | 保持关闭/完成，不重复发布或恢复凑验收 |
| C05b独立密钥 | 未完成、用户暂缓，不阻塞当前限定V1 |
| 原P0–P5/P7 | 部分完成；P6未完成，等级不提升 |
| 原T01/T02 | 完成/限定本地完成，保持 |
| 原T03–T08/T10–T12 | 部分完成；T09未完成，等级不提升 |

下一步优先按实际业务方向运营既有指南：代理规划→CMS草稿/批准→新run完整发布/公网/来源交接。若继续工程扩范围，建议选“既有guides新增/删除能力”作为独立切片，先设计身份/URL/另一游戏保留及恢复语义，再实现，不将它悄悄纳入当前六字段发布器。不重复当前releaseKey，不扩建通用队列平台来阻塞已可用更新；全类型账本、普通请求全链releaseKey/原子ReleaseMap、完整旧入口退役及整机恢复仍另排。

## 7. 本机原始证据

仅本README和操作文档提交Git；账号、settings、key、DB、私有媒体、原始回执/日志不提交。

- `backup-paths.json`、`encrypted-backup.json`、`offsite-roundtrip.json`、`download-authentication.json`：精确新对象、pin/路径和认证，key值不输出。
- `downloaded-restore-result.json`：45成员/2671源码/28工具/隔离DB和媒体恢复及在线摘要不变。
- `project-{before,after}.json`、`cloud-*-check.json`、`public-final.json`、`local-{before,final}.json`：运行边界、公众内容及多Worker前后保持。
- `storage-inventory.json`、`storage-final.json`：两次只读容量/依赖观察，零删除。
- `dependency-audit.json`、`deepmerge-advisory.json`、`deepmerge-registry-version.json`、`dependency-review.json`：新鲜风险及未修复决定。
- `delivery.json`、`github-final-result.json`、`prior-sealed-reports.json`、`evidence-index.json`：最终提交/验证CI、旧封存校验及本轮排除自身的索引；封存后不改写。

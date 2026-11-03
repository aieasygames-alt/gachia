# R24：发布成功后的新 UUID 来源接续

日期：2026-11-03。承接[R23](../payload-staging-inspection-2026-11-02-r23/README.md)的下一工程优先级：减少连续发布的手工来源交接，而不是重复staging审计、重建或内容校对。

**新增并安装`publish-source-advance`：本机完整发布成功后，显式只读验证并登记新game/Main UUID来源。** Genshin/NTE均有完整隔离回归；没有真实发布成功的候选，因此没有在生产运行成功接续，不将模拟journal或loopback结果当成云验收。

## 1. 已补的工程缺口

原来源目录按固定game/Main UUID选择；发布A之后，下一次B遇到新UUID就停止，维护者需手工组装新资源/来源。此外Main静态保留只接受GitHub artifact ID，无法诚实表达本机已发布的bundle/journal来源。

本轮补齐：

- 管理器/严格CLI新增`publish-source-advance --run --pin --repo --bundle --bundle-pin --promotion-journal-pin`；无任意service/URL/百分比/force，也不接受上传journal冒充推广journal。
- 重读固定run的封存bundle、保留树与**完整七阶段推广journal**，限定双owner均promoted且以`production_accepted`结束；重新验证全部保存的公网正文、状态、cookie/cache/metadata/JSON-LD/media指纹及证据pin。
- 重新读取当前七服务拓扑、双目标100%精确UUID、版本runtime/assets/bindings及实际下载模块；旧版本、split、partial failure、torn journal、外部未知部署或其他受保护漂移均停止。
- 对全部封存引用重新GET精确版本：三语言变更指南、body/metadata/JSON-LD/media、sitemap、Main JSON/停用账号、全部登记静态，仍用现有noindex/cache/无cookie门禁，不降级成别名或HTTP200即可。
- 保留原封存树，仅在派生`.open-next`副本替换为下载且匹配封存SHA的runtime；生成新公开A的版本绑定baseline、完整树pin和双owner资源证据，再通过现有目录登记/选择校验。
- Main来源新增明确的`published_desktop_candidate`类型，绑定实际bundle/journal路径及pin，不伪造GitHub artifact ID；旧GitHub归档来源合约保留，下一轮retain会重新验证本机来源pin。

这是**显式只读交接**，不是推广完成后后台自动跟踪。旧来源不覆盖，没有latest/O回退；旧journal只证明历史来源，不延长候选/恢复15分钟批准。来源被删除/篡改时仍拒绝，不能清理旧run后假定目录自包含。

## 2. 验证与持久安装

| 项目 | 本轮结果 | 范围 |
| --- | --- | --- |
| 新来源接续测试 | **33/33** | Genshin/NTE已发布A→新来源→B选择、Main下一轮retain；云UUID/控制面/发布journal为隔离fixture |
| 真实loopback HTTP | **1项集成测试**，包含于33 | 实际HTTP服务器/客户端和正文落盘；云部署/UUID仍模拟，不是云E2E |
| 最终定向回归 | **121/121** | 新来源/本地证据/CLI/操作手册 |
| 完整发布回归 | 桌面 **495/495**、既有Node **304/304**、Python **49/49** | 含33新增来源、3新增CLI及1新增手册命令测试；未重跑公众应用build/parity |
| 本机安装 | **21模块+manager=22文件** | 维护锁、备份、原子替换、依赖闭包导入、实际安装版缺参拒绝；smoke网络调用0 |
| CMS/PG | healthy/loaded，安全HTTP **9/9**，DB摘要不变 | 84draft/hold、0eligible，无内容写入或CMS应用覆盖/重启 |
| Git/CI | 专用维护分支、只验证workflow | 精确提交和实际CI身份记入本地`delivery.json`，不套用R23旧run、不合并main或部署 |

首次测试暴露fixture遗漏旧Main归档身份/游戏namespaced静态，以及校验器误把静态子目录当完整Worker树，分别修复并保留失败日志。没有把失败路径改成跳过校验。共享Main本机来源缺口通过新明确类型解决，不伪造外部artifact身份。

CMS163/typegen/typecheck与Router35基线沿用R22/R23，不冒称本轮本机重跑；本轮精确提交实际CI另存。1low依赖风险沿用，没有新依赖扫描或修复声明。在线DB摘要仍为`c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`，不重复无合格内容导出。

安装后仅只读盘点云项目。首次读取401保留，使用既有Wrangler whoami刷新OAuth后另轮读取；不新增grants或修改系统网络。最终清单核验结果见本地`cloud-final-check.json`，不能将认证失败算作空清单。无Worker/R2上传、部署、切流、内容编辑、CMS重启；仅工具安装与Git工程交付写入。

## 3. 任务状态与剩余边界

1. **L06/T12：已完成“本机完整发布后的显式新UUID来源接续”实现、隔离验收与安装子任务**。真实A云发布后的接续成功仍待验，不能关闭连续发布/真实云T04/T06/T08。
2. **L04/L05：仍待真实预期公开的文字编辑**。有编辑即Genshin首次发布→source-advance→第二次发布/兼容恢复，再NTE；不等待准确度、不批量清hold、不制造演练文本。
3. **首次无可信来源、跨游戏共享Main变化、外部部署/手工恢复后的来源交接仍需维护者**。特别是Genshin更新共享Main后，不能直接把Genshin来源条目用于NTE；后续可补受控source-only重绑定，以免阻塞NTE接续。该余项不是放宽新命令资格的理由。
4. L03独立key/第二Mac、实际云partial failure/恢复、普通请求全程releaseKey和全scope权威接管仍待验；R23历史staging调查不重做。账户级“仅本机发布”未技术强制，403/hook/token边界不因此改变。

P0–P5/P7仍部分完成，P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。当前无真实编辑时下一可执行工程项是**跨游戏共享Main新UUID的受控来源重绑定**，复用现有证据且重验来源，不再重复开发当前同游戏成功发布接续。

## 4. 操作与证据

命令位置、变量含义和失败处理见[现行手册](../../docs/payload-operator-runbook.md)。推广的`journalSHA256`才是`PROMOTION_JOURNAL_PIN`，上传的`JOURNAL_PIN`不可混用；失败保留诊断，不自动重试写操作。

入Git仅源码/测试、报告、脱敏`verification-summary.json`及现行文档。本地保留`source-tests.log`、`focused-*.log`、`release-tests.log`、`installation.json`、`installed-integrity.json`、`local-final.json`、`local-http.json`、实际manager缺参smoke、项目只读盘点、GitHub部署开关和实际CI回执，以及最终`delivery.json`/排除自身的`evidence-index.json`。原始日志、数据库、私有媒体、凭据/key和诊断脚本不入Git。

任务表：[当前状态](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)；架构：[多Worker地图](../../docs/payload-project-worker-map.md)。

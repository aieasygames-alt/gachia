# R27 Payload 完成导向全面审计

日期：2026-11-03。目标是把项目推进到可持续使用，不再以无限增加发布工具替代真实验收。执行清单：[V1有限完成计划](../../plans/payload-v1-completion-2026-11-03.md)。完整状态：[当前任务表](../../plans/project-task-status-current.md)。

## 1. 结论与剩余工作

**本机 CMS 已可编辑，双游戏发布/恢复工程大部就绪，但真实云首发、连续发布、恢复验收未完成；不能称项目已上线完成。** DB仍84条 draft/hold、0条合格 published。内容准确度不作门槛；具体预期公开的编辑仍不能由演练或批量解除hold替代。

1. **下一工程项：兼容恢复后的来源接续。** `desktop-source-advance.mjs`只读取成功promotion journal并要求`production_accepted`；实际人工兼容恢复输出独立manual-recovery journal及`recovery_accepted`。目前不能把恢复后的新UUID登记为下一正常发布来源。R25跨游戏rebind的Main也只接受成功发布来源，不接受恢复来源。恢复→再次发布的闭环因此未全通；不要把已有恢复入口算成持续运维完成。
2. **实际 Genshin 首发/第二次/partial failure/兼容恢复/再发布**仍待真实编辑候选，NTE及跨游戏共享Main实际验收随后执行。本轮只做来源选择，未生成候选或云发布。
3. **独立密钥/跨机恢复**未完成。R17私有R2下载解密/同机隔离恢复仍有效；本轮确认挂载的Antigravity卷不可写，只有该卷和系统卷，不冒充独立介质。没有新的密钥复制或第二Mac启动证明。
4. **原始全范围迁移仍未完成**：全类型/内联/内容责任账本、全scope/owner、完整请求releaseKey/激活、批量队列/新游戏、完整角色矩阵/权威接管/退役等保留在计划；多数不阻塞既有指南文字首发。新增媒体权利不被“准确度后置”豁免。

## 2. 本轮发现并修复的两个操作风险

### 导入的 preview 参数没有只读语义

旧manager和直接TypeScript CLI均允许`content-import --preview`，但导入分支不读取preview，仍会执行导入。现在import严格仅收repository/game，preview仅供export；多余/未知参数在环境和DB解析前拒绝。新增纯解析及真实CLI子进程回归，不操作真实内容。

### 旧发布命令静默忽略不适用参数

manager旧分支手工重组部分参数，可能丢弃`--game`、`--preview`、`--backup`等参数，让错误命令继续运行。现在所有发布参数完整送入既有Node action白名单；非发布动作在读取运行设置前按自身合约拒绝无关/缺少参数。覆盖手册全部发布命令的实际manager分派与无副作用parser回归。没有扩展发布权限或新增force/skip。

## 3. 新鲜核验

| 范围 | 本轮结果 | 边界 |
| --- | --- | --- |
| CMS | **165/165**；next typegen/typecheck通过 | `cms-tests-final.log`，不是更早164结果；未重建常驻CMS bundle |
| 发布回归 | **桌面594/594、既有Node304/304、Python49/49** | `release-tests.log`；CLI/手册定向79/79为其子集，不相加；云控制面/写入测试仍模拟 |
| inventory / Router | 16 scope清单校验；生成配置/部署映射/typecheck、**35/35**测试通过 | 不等于全scope内容已迁移；未重跑公众应用build/parity |
| 常驻本机 | CMS/PG healthy/loaded，安全HTTP **9/9**，DB摘要不变 | PG审计连接强制只读；Genshin31/NTE53、1用户，未重启CMS |
| 来源 | 安装版模块对Genshin/NTE当前来源均重新选择通过 | 读取实际控制面/模块与所需HTTP，无虚构run/releaseKey或候选；不是新内容云验收 |
| 安装 | **23 publisher模块+root manager+2个TS helper，共26文件**备份安装/验摘要 | 仅更新工具/CLI源文件，无应用bundle覆盖；实际安装命令缺参/不适用参数拒绝与只读目标smoke通过 |
| Cloudflare | 前后10Worker观察与R26一致，7服务保护集不变 | 每次发布仍仅game/Main；本轮无资源、版本或deployment写入 |
| 依赖 | 生产依赖**1 low，0 moderate/high/critical** | deepmerge风险未修复；限定单用户loopback接受到11月16日前复核 |

实际工程提交与精确提交CI以本地`delivery.json`为准；不借用R26成功run。本轮只验证CI不部署，main不合并、两项Cloudflare GitHub部署变量保持false。原始日志/云响应/目录路径等本地证据不纳入Git，仓库仅保留本报告及脱敏汇总。

## 4. 安装审计的边界

本轮开始检查安装应用97个source/script文件，有3处与当前开发树不一致：`scripts/continuous-export-probe.ts`为测试辅助；`scripts/inventory.ts`为开发清单工具；安装应用内的`scripts/desktop.py`是历史冻结副本，**日常入口为数据根目录的`desktop.py`**。实际应用src/routes与运行bundle未因本轮修复改变；不能声称全部安装源码与开发树完全一致。最终26文件校验只覆盖当前发布工具闭包、真正manager及本轮两个CLI helper，不用覆盖全应用来掩盖辅助文件差异。

## 5. 状态更新与下一轮

- C01参数安全工程子项本轮关闭；C02恢复来源接续未实现，列为下一工程最高优先级；C03/C04真实云验收、C05独立恢复未关闭。
- 总计划、T04矩阵、架构决定与编辑端决策的旧“当前R20/执行器待接通”入口已更正或标为历史；原始验收定义保留，避免下一轮沿旧顺序重复开发。11份现行/关联文档的170个本地链接检查通过。
- P0–P5/P7仍部分完成、P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。不因回归数增加升级整体状态。
- 优先次序：**窄范围修好恢复来源接续→有真实候选即Genshin云首发→连续/恢复/再发→NTE与共享Main→独立介质/第二Mac具备即验收灾备**。不等待准确度、不重做架构选型、不再为方便性新增一轮工具。
- 本轮无内容修改、无云资源写入、无CMS重启；旧脏checkout未修改。所有原始记录保留本地，完成后生成非循环证据索引。

# Payload V1 有限完成计划

更新：2026-11-04，R33。当前执行清单以本文为准；完整历史范围仍见[任务表](project-task-status-current.md)。下一阶段安全修复见[R33编辑批准与撤回权限](../reports/payload-editorial-lifecycle-2026-11-04-r33/README.md)，首次发布见[R32](../reports/payload-promotion-critical-path-2026-11-04-r32/README.md)，本机恢复见[R30](../reports/payload-single-host-closeout-2026-11-03-r30/README.md)，历史失败见[R31](../reports/payload-version-provenance-2026-11-03-r31/README.md)，操作见[手册](../docs/payload-operator-runbook.md)。

## 1. 完成的定义

目标不是再扩建 CMS 平台，而是交付**本机单用户编辑、Genshin/NTE 既有指南文字可持续安全发布**。用户已明确 Payload CMS 只在这台 Mac 运行；第二台 Mac、跨机安装/启动/迁移不属于限定 V1 验收条件。Payload/PostgreSQL 保留在本机，公众请求继续由 Cloudflare 多 Worker 服务，不依赖 Mac 在线。内容事实准确度、翻译补齐不作为首发门槛。

- **首次可用发布：已完成。** R32 的真实 Genshin 编辑已从 CMS 经双 owner 构建/四版本云预览/新鲜续验/正式推广，公网验收与 source-advance 通过；这不等于稳定 V1 全部完成。
- **稳定限定 V1：尚未全部完成。** C01–C05 均须满足各自关闭条件，包括独立正常连续发布、NTE 实际发布/双向共享 Main 连续性，以及独立密钥托管；恢复后再次成功发布已验证，不要求跨机运行。
- **原始项目完整完成：仍未完成。** 全类型、全 scope、全 owner、完整 ReleaseMap/请求一致性与权威移交/退役等原始任务另行验收。稳定 V1 不能替代 P0–P7 / T01–T12 的全范围完成。

不以新增测试数、报告轮数、工具数量或同机重复演练衡量进度。已完成首发，不再重复执行该候选或已有恢复；V1后续发布验收只围绕真实下一条编辑推进。用户要求进入下一阶段时，可以推进原任务中独立可做的编辑安全缺口，不把暂缺编辑输入等同于所有工程停工，也不扩建通用运营平台。

## 2. 仅五个 V1 工作包

| ID | 当前状态 | 工作与关闭条件 |
| --- | --- | --- |
| C01 CLI 参数安全 | **工程/回归/安装关闭** | import/export/action 参数在环境/数据库/网络前拒绝；当前25模块+manager+2helper共28文件安装验摘要。精确提交CI通过，不以测试数代替云验收 |
| C02 兼容恢复后的可信来源接续 | **工程与真实恢复后再发闭环关闭** | R31实际partial→显式双owner兼容恢复→source-recover；R32从该可信来源另建run，真实编辑成功推广、公网验收/source-advance通过。原失败journal保留，未重放/重试云写，未放宽900秒门禁；任意外部UUID仍拒绝 |
| C03 Genshin 真实完整生命周期 | **首次真实公网发布/source-advance完成；独立正常连续发布待验** | R32完整四版本云预览/新鲜续验，Genshin与Main两次部署POST成功，公网新标题/JSON一致；推广202.16秒。关键路径重复读取已修复，两个写入intent时证明最大年龄约96.85/134.24秒。下一条独立真实编辑后才验正常连续发布，不重发同一releaseKey凑验收 |
| C04 NTE 与共享 Main 连续性 | **Genshin成功后的真实NTE共享Main只读交接/重新选择通过；实际NTE发布及反向交接待验** | NTE保持原UUID与公开JSON，只跟随已成功发布的新Main。首次交接因preview robots与历史公网缓存比较冲突失败，原目录保留；R32修复统一精确预览合约后另建只读交接并验证。不是NTE上传/推广，不批量清hold或制造编辑 |
| C05 本机恢复与独立密钥 | **C05a本机应用恢复实际通过；C05b独立密钥托管待办；跨机运行出范围** | R30已完成私有R2新鲜下载、解密/归档/源码校验、隔离loopback PG与实际CMS登录/导出/重启验收，原DB摘要不变。复用本机应用，不声称离线重建或整机灾难恢复；密钥仍仅同机，真实独立目的地尚未配置。C05b不阻塞已完成的首次文字发布 |

DB仍为Genshin31/NTE53共84条：**83条draft/hold，1条Genshin既有指南published/eligible且已公网更新**。已发布标题为“原神快速上手指南：基础操作、元素反应与资源规划”；releaseKey为`61cf1ede43df373693eea8cb2b83641ef3791876953ab8024c0233873de0bef6`。本轮未改DB、正文事实、身份、媒体或其他83记录；来源登记不授予下一次发布许可。

### 后续只读核对（2026-11-04 12:25，Asia/Shanghai）

CMS/PostgreSQL均healthy/loaded，本机安全HTTP为9/9；完整数据库摘要与R32交付一致，没有新增真实编辑。Genshin仍30条draft/hold加1条published/eligible，NTE仍53条draft/hold。公网curl直连复核已发布指南HTML、Genshin JSON、NTE JSON均200，标题/canonical/JSON-LD存在；Genshin JSON仍为已接受SHA `9e49bee84613e11cc261204eb83454ee1848809af094474fd8eccedcc550518b`，NTE JSON与既有公开文件逐字节一致。

因此首次上线保持可用，C03/C04后续验收尚无新候选；已知安装配置未提供独立key目的地，当前挂载观察也未发现可用独立介质，不代表用户没有其他保管方式。本次未新建发布run、修改内容/hold、上传/部署、重跑恢复或重验云控制面/完整CI，不将R32版本快照当作新控制面观察。仅修正灾备手册中“尚未公网生效”的过期描述，不增加首发门槛或准备工具；C01–C05关闭状态不虚增。

### 下一阶段：T07批准/撤回资格（R33）

已复现并修复editor通过普通单条/批量更新写入draft而撤回已批准记录的问题。非草稿更新统一要求admin/reviewer；editor必须显式保存草稿，不能用draft标志或overrideAccess绕过发布权限。完整CMS174/174、typecheck/build、精确代码CI通过；真实PostgreSQL/HTTP覆盖多语言草稿保留正式A、reviewer批准B、hold/撤回、活跃锁/版本恢复与注销后的拒绝。待安装应用又在Homebrew PG17.11隔离运行通过，随后冷备/切换独立本机版本，在线DB摘要不变、安全HTTP9/9，旧应用保留可回退。25发布模块/manager/2helper摘要不变，无云写或在线内容写入。

该限定子项关闭，T07/P1整体仍部分完成；C03/C04/C05b状态不变。下一可执行工程项是T07/T08的撤回/hold与后续候选导出保留边界：在隔离fixture中验证未批准记录不会在下一次B中被隐式退回导入O；不据此制造真实编辑或宣称网站撤回已实现。完整证据与边界见[R33](../reports/payload-editorial-lifecycle-2026-11-04-r33/README.md)。

## 3. 执行顺序与停止扩建规则

1. **下一条真实NTE编辑优先验C04**：仅针对确实希望公开的既有指南title/body编辑，单条明确发布意图；从本次已验证的NTE/新Main来源另建run，执行冷备、导出、完整双owner构建、四版本精确云预览/900秒新鲜续验、正式推广/公网/source-advance。随后只读反向交接Genshin来源。没有真实编辑时不制造文案、不解除其他hold，不重发旧候选。
2. **下一条独立Genshin编辑验C03正常连续发布**：与R32首发及R31失败run分开；保留新Main中已公开的NTE JSON，全部新鲜门禁照常。恢复后再发已关闭，不重复故障/恢复演练凑进度。
3. **独立key目的地具备即完成C05b**：独立介质/安全托管不需要运行CMS；不以同盘目录/R2密文/授权文字替代，不擅自上传iCloud、报告或密文桶。目的地尚未配置时明确保留待办，不影响已上线文字链路。
4. **C01–C05实际关闭后冻结限定V1**：不扩建通用运营平台，不把测试或报告数量当验收。原始P0–P7/T01–T12另排；准确度、翻译和第二Mac均不作首发门槛。

R32本轮新增4个版本上传、2个成功部署POST，无恢复部署或云写重试；连同R31共21个版本上传/6个部署POST。生产Git main与两个GitHub部署false开关保持。四版本取证固定releaseKey/UUID，不等于普通应用请求已全程注入releaseKey或ReleaseMap原子激活；两owner仍顺序切流，partial后必须停止/只读对账/显式恢复。900秒实时门禁、字节/身份/写前漂移与媒体边界不放宽，详见[版本取证协议](../docs/payload-version-provenance-2026-11-03.md)。

## 4. 保留但不阻塞首次发布的原始任务

| 原始任务 | 仍需完成 | 排期边界 |
| --- | --- | --- |
| P0/P2、T03 | 全类型 DTO/内联结构、依赖闭包、责任及内容账本；新媒体权利链 | 既有指南文字先发；新增媒体在使用前仍必须有权利依据，不能取消安全/权利门禁 |
| P3/P4、T04/T06 | 全关联类型/全 owner 的生产读侧、ReleaseMap/Snapshot 激活与完整请求链 releaseKey 一致性 | 当前身份绑定为候选/文件/UUID/证据，不声称每条普通请求注入 releaseKey；限定双 owner 首发不等于通用原子激活 |
| P5、T08 | 队列、受控批量、调度、死信、吞吐及告警 | 手动单批持续发布先完成，不为首发建设通用运营平台 |
| P6、T09 | 新游戏配置驱动的导航/搜索/SEO与扩展边界 | 未完成，后续里程碑 |
| T07、T05/T11 | 完整角色/异常/并发矩阵及运维安全生命周期 | 当前仅此Mac单用户限定V1；本机最低恢复归C05a且已实测，独立密钥归C05b仍待办，不新增跨Mac验收 |
| T10/T11 | 全16 scope 的实际权威接管/最终同步、其他游戏 owner、旧入口停写与退役 | 当前只接管两游戏 guides 的限定文本流程；主站/游戏文件镜像相同不等于完成移交 |
| T12 | 无可信来源的首次托管、任意外部部署来源、账户级仅本机发布约束 | 当前双游戏来源可用，不把任意外部部署自动接纳加入 C02；外部未知 UUID 继续 fail closed，发生时走独立可信交接 |

全类型事实校对、翻译/命名优化均为上线后内容工作，不属于上述技术关闭门槛。已有1项 low依赖风险依照[限定风险决定](../docs/payload-dependency-risk-2026-11-02.md)在2026-11-16前复核，本轮未修复，不以重复扫描宣称清零。

## 5. 不改变的多 Worker 边界

当前观察10个 Worker，推广保护集7个，每次只写 `[game, main]`；Router和staging不在发布写入目标。Genshin/NTE指南 HTML 属于各 game Worker，`/data/<game>/raw-guides.json` 属于 Main。两 owner 顺序推广不是原子事务，partial failure必须停止并显式恢复。公众网站无 CMS Tunnel、无 Mac 回源依赖。本清单不新增 Worker、云存储产品或公网 CMS。

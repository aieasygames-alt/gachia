# R28 兼容恢复后的可信来源接续

日期：2026-11-03。本轮关闭[V1有限完成计划](../../plans/payload-v1-completion-2026-11-03.md)的C02工程子项；当前总状态见[任务表](../../plans/project-task-status-current.md)，操作见[手册](../../docs/payload-operator-runbook.md)。不把工程回归或已有公网基线采样算成真实候选云发布验收。

## 1. 本轮实际推进

- 新增显式只读`publish-source-recover`，从本机已知完整成功的兼容恢复建立固定双UUID来源目录。不复用普通成功推广身份、不补伪`production_accepted`、不自动接受外部未知部署。
- 重验原plan/candidate/recovery封存链、recover模式renewal、原推广journal与完整恢复journal、历史版本配置/8份multipart模块/保存的实际公网正文，以及恢复树和静态并集。重新GET当前双UUID/模块/配置、精确预览/完整封存静态、公开A及七服务拓扑；派生树仅替换runtime，不改原树。
- 恢复后的A来源可用于下一候选source-select、prepare-evidence和Main资源retain；另一游戏可显式rebind恢复后的共享Main，但目标game UUID和公开A必须不变。未知/split/漂移/partial/torn/错身份/篡改均停止，目录排他写入、不覆盖旧项。
- 历史来源按已pin的实际恢复完成时间检查当时有效性，不改原时间/日志，不延长实时15分钟门禁，不授权任何新上传、推广或恢复。正常live verifier仍用当前时间，过期测试在来源交接前后均继续拒绝。
- 完整NTE磁盘链暴露并修复旧`acceptedPreviewJournal`硬编码Genshin的问题，改用现有双游戏scope校验；旧注入式协议测试没有暴露这一真实路径缺陷。

## 2. 验证与安装

| 项目 | 本轮结果与边界 |
| --- | --- |
| 恢复来源新回归 | 57/57；双游戏完整封存磁盘链、真实协议/transport组合、故障/篡改、历史时效、共享Main、下一候选准备及实际loopback HTTP。云控制面/Worker响应模拟，封存runtime为测试替身，不是新真实应用build |
| 完整release | 桌面655/655，既有Node304/304，Python49/49；全部通过 |
| CMS | 165/165；next typegen、typecheck通过 |
| 当前inventory | 16scope检查通过，语义迁移仍待办 |
| 手册/CLI最终回归 | 83/83；包括实际manager转发、新命令精确参数、缺参/多参拒绝及安装依赖闭包 |
| 实际安装 | 24publisher模块+manager+2个未变TS helper，共27文件，独占维护锁/备份/导入smoke/摘要校验；新命令通过真实已安装进程缺参拒绝。CMS未重启、运行bundle未覆盖 |
| 本地状态 | CMS/PG健康且loaded；安全HTTP9/9；只读PG连接下逻辑摘要与开始/R27一致，84draft/hold、0eligible published |
| 现有实际来源 | 安装版模块重新选择Genshin/NTE当前基线通过；没有创建候选run或伪releaseKey，也没有成功执行假的恢复交接 |
| 多Worker | 只读观察10Worker，保护7服务，每次写组仍game/Main；本轮前后与R27一致，Router/staging不变 |

最初来源复核返回401，保留失败诊断；仅用既有Wrangler whoami刷新认证后，以新目录重新执行只读选择，没有绕过门禁或重试任何云写入。原始控制面/HTTP/安装私有路径、诊断和测试日志仅本机保留；Git只跟踪本README和安全汇总。精确提交/实际只验证CI身份记录于本机delivery.json，不能用旧run替代。

本轮未重跑公众Genshin/NTE build/parity、Router本机全套或生产依赖扫描：公众应用未改，Router沿用R27本机基线，精确提交CI包含Router验证。既有1low依赖风险未修复，继续按11月16日前复核的限定风险决定处理。

## 3. 状态与下一项

- C01参数安全保持完成；**C02实现/隔离回归/安装完成**，真实云恢复接续→再次发布仍归C03/C04验收，不声称C02真实云已验。
- **下一项是C03：真实Genshin既有指南文字候选的首次云发布，再连续发布/partial failure/兼容恢复/source-recover/再发。** 随后C04真实NTE/共享Main连续性；独立key/第二Mac具备即交错做C05。
- 当前没有合格published候选；默认操作授权已具备，不再重复征询操作权限，但不制造编辑、不批量清hold或发布诊断文字来凑验收。准确度/全类型校对仍不是首发门槛。
- 不再新增首发便利命令或重复旧本地A/B演练。首次无可信来源/外部未知版本仍需独立可信交接，不扩大为任意版本自动接纳。
- C03/C04/C05、限定稳定V1和原始P0–P7/T01–T12完整范围都未完成；本轮只关闭T12/L06恢复来源工程子项，不提升P/T总体等级。

本轮没有内容/云资源/版本/部署写入、没有CMS重启或公网架构变更；没有新媒体权利批准。维护分支独立交付，main不合并，两个GitHub部署开关仍false。网站继续完全由Cloudflare服务，不回源本机CMS。

# Payload 架构决定与实施风险

> 2026-11-03 R27当前执行边界：[有限完成计划](../plans/payload-v1-completion-2026-11-03.md)、[审计报告](../reports/payload-completion-audit-2026-11-03-r27/README.md)。本机PostgreSQL/Cloudflare网站架构不重选；双游戏当前来源有效，参数安全修复并安装。下一工程缺口是已知成功兼容恢复后的可信来源接续，真实云发布/恢复与独立key/跨机仍未验。CMS165/typecheck、桌面594/Node304/Python49、Router35/inventory为本轮本机结果；新鲜依赖扫描仍1low，风险决定有效至11月16日前复核，未修复。

> 2026-11-02 R20历史基线：Payload/PostgreSQL常驻本机，公众Cloudflare多Worker不实时依赖Mac，仍仅本机发起发布。inventory版本化/历史不变、Router和inventory实际CI成功，工程提交a0634a9已同步。资源刷新/兼容恢复准备与10Worker只读观察命令已安装；该轮首次来源登记仍需维护者，真实编辑云E2E、独立key/跨机启动与完整交接未关。10Worker观察、7服务保护、game/Main写入分别限定。见[R20报告](../reports/payload-launch-closeout-2026-11-02-r20/README.md)、[项目地图](payload-project-worker-map.md)、[手册](payload-operator-runbook.md)和[任务表](../plans/project-task-status-current.md)。deepmerge仍1low，沿用R19扫描及[限定风险接受](payload-dependency-risk-2026-11-02.md)，不是漏洞修复。

下表保留早期实验决定，A03/A05/A09已补现行状态。历史R9与[T05 ADR v2](payload-production-adr-2026-11-01-v2.md)中的“PG待实验/选型未批”是当时状态，不覆盖后来用户选择与实际本机安装；D1底层实验不再是当前上线前置。其余未完成的全平台语义、安全/调度/恢复范围仍需逐项验收，不因本机方案已运行而自动关闭。

| 编号 | 决定 | 状态 / 依据与后果 |
|---|---|---|
| A01 | 一套全游戏 CMS，保留区域 scope | 已决定；不以单游戏试点代替全量迁移 |
| A02 | 独立于公众站点的依赖环境 | 已决定；Payload 3.92.1 的 Next peer 不包含主站 15.5.28；禁止升级主站来凑兼容 |
| A03 | Payload 3.92.1 + Next 16.4.2 + React 19.2.6 | 本机编辑端已安装运行；模板Next16.3.3扫描问题促成升级，DOMPurify3.4.17固定。R20 CMS163/typecheck通过、生产依赖仍1low；Node要求 `^22.23.4 || >=24.22.1`，不能推断不受支持运行时可用 |
| A04 | 本批本地 SQLite | 显式启用 transactionOptions，已测试提交/回滚、版本恢复和冷备跨进程恢复；libSQL SQLite 与 Cloudflare D1 不是同一运行环境，不构成生产选型 |
| A05 | 用户已选本机Node/PostgreSQL、私有媒体，仅从本机发布 | 已决定并安装，替代历史候选比较。网站仍Cloudflare，不复用玩家D1、不用Tunnel；私有R2仅存独立加密备份，不是公开CMS。完整并发/队列/跨机恢复余项另验，不重新选型 |
| A06 | CMS 账号独立于玩家账号 | 已决定；公众账号保持停用；生产首管理员需受控引导，不开放注册 |
| A07 | 每迁移单元只有一个权威源 | 已决定；停写、最终同步、摘要对账后交接，回退显式交还权威 |
| A08 | 已批准不可变快照供公开读侧使用 | 已决定方向；快照存储、激活 CAS/协调器、保留期与成本待验证 |
| A09 | 多 Worker 按路径消费 | R19实际10Worker/正式路由与bindings已盘点；7服务保护不等于全项目验收。NTE items详情/共享资源仍Main，Lvmeng专属仅zh；staging实际值不等于模板，见项目地图 |
| A10 | 首批保留正文原格式 | 本地实验；Markdown/HTML 不是 Lexical JSON，禁止无损证据不足时强制转换；最终渲染必须消毒 |
| A11 | REST 优先、GraphQL 关闭 | 本地实验；减少初始表面，不承诺 Workers GraphQL 支持 |
| A12 | 原始来源先入不可变只读暂存 | 本地实验；原文字节和来源摘要保留，尚未转换为可编辑内容。116 份来源覆盖注册记录、raw JSON、四 data.ts 与审阅门禁，不代表所有内联事实完成映射 |
| A13 | 记录身份、修订与完整导入批次分离 | 本地实验；身份按 scope/类型/旧 ID 生成，修订绑定规范化内容及映射/政策版本，完整批次绑定全部来源与修订引用。校验来源重算结果后才写入，全部记录验证通过才建立完整批次标记；不是公开 Snapshot 或 ReleaseMap |
| A14 | 任务先验证执行边界，再决定生产调度 | 本地原生队列只读探针已验证入队/执行分离、成功日志及失败重试上限；禁用 HTTP run/queue/cancel，不配置 autoRun/cron。尚无网络采集、分布式抢占、去重或死信运营系统，不作为 D1 选型证据 |
| A15 | 内联源码只做白名单 AST 数据提取 | 本地实验；允许字面量、同模块常量/静态属性引用，拒绝调用、动态键、展开、循环引用等；不导入或执行游戏模块。按符号契约分为有 ID 记录、无 ID 具名区块、未转换读侧代码；内联源码任何变化均要求来源复核 |
| A16 | 映射升级建立新批次，不重写旧历史 | v2 保留 v1 的 3,206 条修订/批次，新增 3,440 条 v2 修订。映射版本不同不直接做内容差异；FAQ 按原字段区分语言并保存来源位置，图片引用不等于素材已下载或权利已核验 |
| A17 | 审核任务、决定与编辑草稿分离 | 本地实验；确定性差异任务绑定完整候选批次；服务端校验完整性与角色后，在同一事务追加决定并首次接收结构化草稿。hold 不解除，来源权威不转交；首次接收入口仍拒绝覆盖已有草稿，第六批更新改走 A20，决定纠正尚未实现 |
| A18 | 草稿历史不能绕过来源与 hold | 本地实验；保留 30 个历史版本和编辑锁，新 editorial-drafts 禁用版本恢复。其他实验 Content records 的旧恢复测试不等于此工作流已支持恢复；需另建带来源核验的恢复机制 |
| A19 | 本地写事务有界排队，schema 变更原子执行 | 真实并发失败后增加进程内队列；Drizzle 外键表重建重复索引问题通过窄范围去重、DDL 事务与提交前 FK 校验处理。旧库多进程重启回归通过，但不支持分布式互斥，也不能代替生产显式迁移 |
| A20 | 三方更新保留人工修改，不把合并稿冒充来源 | 本地实验；基线是上次已接收来源候选，当前是编辑稿，目标是完整同映射/政策的前向差异。比较绑定内容指纹，审核者显式解决全部冲突后同事务写决定/草稿/来源头，原始 intake 历史不改；过期方案、错误基线及拒绝项阻断 |
| A21 | 无稳定条目身份的结构不做位置级合并 | FAQ 有序列表作为整个冲突单元，图片关联元组整体选择；明确空字符串与 null，不按数组下标拼接。正文仍是文本字段比较，替换正文后格式重置未分类；富文本/FAQ 细粒度合并需新契约 |
| A22 | 关闭与重审采用追加事件，不改写终态 | 本地实验；reviewer/admin 可 close 未决定的过期方案，或 reconsider closed/dismissed 方案。新比较绑定父方案与替代事件，必须重新批准；创建失败整体回滚，已应用合并和初次 reject 不允许走此旁路 |

## 风险与分阶段验收

旧九项风险不是所有项目都必须在首条guides文字发布前完成。首发优先工程清单、可操作的版本/资源证据、真实双目标云验收与最低灾备；全类型、队列、新游戏/全scope迁移后置，事实准确度不作发布审稿门槛。

1. **D1事务语义（历史候选）**：不再是本机方案前置。当前PG/Payload已实际运行并做过克隆恢复；多进程竞争/完整运营队列需按PG真实环境继续验收，不能拿SQLite/D1底层实验替代。
2. **Workers运行环境**：CMS不部署Workers。公众OpenNext仍受包体、运行时及静态资源约束，应按受影响owner验证封存模块与预算；本轮没做账单/新价格估算，不虚构费用。
3. **鉴权默认绕过**：Payload Local API 默认 overrideAccess=true，更新锁也可默认覆盖。用户动作必须明确 overrideAccess=false、overrideLock=false 并传入身份；特权导入需独立入口/记录。API status 不能充当网站发布批准。
4. **历史证据与私有资源**：即使内容标记 published，证据/草稿不应可匿名读取。媒体文件直链、搜索、深层关系、版本接口、错误日志都要审查；本地 ACL 测试不能代替生产安全验收。
5. **跨 Worker 发布**：Router 归属与运行时 bindings 分开核验。不能用一次 CMS 保存冒充全站原子激活；缓存/RSC/SEO需共享版本上下文，部分 owner 未升级时阻断不兼容内容。
6. **现有发布门禁**：Genshin/Main与NTE/Main受控执行器已安装，真实云E2E未验；Azur/Lvmeng/Router没有完整Payload推广器，普通生产命令拒绝。保护7服务之外还有3staging，不能将项目盘点与写入授权混为一谈。
7. **调度与恢复**：serverless 不能只依赖 autoRun。外部调度、入队、执行、去重、异常重试和恢复均需测试；备份文件存在不等于恢复通过。
8. **迁移完整性**：raw JSON 只是部分来源；TypeScript 内联版本/活动/来源、共享页、素材与地区差异同样纳入。当前文件清单明确保留语义映射待办，不自动迁移未经复核的记录。
9. **真实数据体积**：本地导入发现默认 textarea 40,000 字符不足。只读暂存区已设显式容量与字节上限；生产需逐记录映射或受控对象存储，不能照搬整文件大文本表到 D1。系统锁集合的权限和真实竞争同样不能仅凭单进程 lock 拒绝测试判定通过。

第二批已通过真实工具链测试移除旧 esm-loader 的中危依赖路径；第五批新增 graphql-scalars 高危命中，独立 CMS 对 Payload GraphQL 依赖边固定至 2.0.1，相关导出、超时拒绝、构建与 HTTP 通过。最终仍有 deepmerge 低危未修复，禁止以“原文暂存不做对象合并”或 GraphQL 已禁用作为整个 CMS 的风险豁免。最新证据见[第五批记录](../reports/payload-migration-2026-10-29/batch5.md)。

## 固定版本参考

- [Payload v3.92.1](https://github.com/payloadcms/payload/tree/v3.92.1)
- [Cloudflare D1 模板](https://github.com/payloadcms/payload/tree/v3.92.1/templates/with-cloudflare-d1)；模板依赖仍有 3.92.0 项，不直接复制 deploy 脚本。
- [Next peer 与 Node engine](https://github.com/payloadcms/payload/blob/v3.92.1/packages/next/package.json)
- [Local API 默认行为](https://github.com/payloadcms/payload/blob/v3.92.1/docs/local-api/overview.mdx)
- [任务队列](https://github.com/payloadcms/payload/blob/v3.92.1/docs/jobs-queue/overview.mdx)
- [D1 adapter](https://github.com/payloadcms/payload/blob/v3.92.1/packages/db-d1-sqlite/src/index.ts)

后续升级须重新核验 peer、engine、公告与行为；本文链接不是永久兼容承诺。

## A23：维护规划与执行授权分离（第八批）

跨游戏维护清单绑定完整审核批次，以单事务汇总状态，按游戏、类型、状态稳定分块。planKey/chunkKey 只作规划身份，不作为执行授权；计划始终 executable=false、publishable=false。已有草稿与终态决定不得进入新草稿接收分组。下一阶段执行器必须重新验证权限、来源、基线与锁，不能直接消费旧计划批准内容。此批无多 Worker 运行保证，生产发布仍由独立 Snapshot/ReleaseMap 协议处理。见[第八批](../reports/payload-migration-2026-10-29/batch8.md)。

## A24：类型契约预览不隐式升级历史审核（第九批）

共享 material-contract-v1 与 legacy-records-v2、review-v1 分离。契约预览必须保真还原、拒绝未知字段、绑定候选身份和 revision；转换通过不增加草稿支持，不改变历史摘要。后续接入须显式版本化审核及合并模型，同时保证旧批次可验证。材料 type、source、stackLimit 保留原有游戏语义，不把分类标签、获取说明或描述性堆叠限制误当统一枚举、可信证据或整数。见[材料契约](payload-material-contract.md)及[第九批](../reports/payload-migration-2026-10-29/batch9.md)。

## A25：材料按显式策略接入编辑，旧版本保持可验证（第十批）

review-v1 仍默认，review-v2-material 需要显式 CLI opt-in 并保存独立 manifest，不覆盖旧批次。校验器从 manifest 选择策略，未知版本拒绝；v2 不得绕过同一候选修订的跨策略 reject。材料原生字段使用显式 absent/null/value 和文本/数字/有序条目值槽，避免 SQLite/Payload 可空字段丢失 presence。材料使用 draft-merge-material-v1，每个原字段独立比较，列表整体冲突；非材料继续 draft-merge-v1，旧摘要不变。仅在副本验证 schema 升级和新策略，原迁移库未升级；没有内容自动获批。见[第十批](../reports/payload-migration-2026-10-29/batch10.md)。

## A26：真实 loopback 验收与公开接管分离（2026-10-31）

本地实验。Genshin/NTE 使用独立 `/shadow/<releaseKey>/...` 路由，不向仍读旧数据的普通页面添加成功版本标记。CMS 与 owner 共用不可变协议校验；实际应用在暴露内容前验证完整的双 scope ReleaseMap 与 Snapshot，缺失其他 owner 或篡改内容时也拒绝输出。React request cache 只在同一请求的正文/metadata/JSON-LD 中复用验证消费者，不实现跨请求的旧版保留。

影子 sitemap 仅列 loopback 路由；媒体为 release 绑定的合成 SVG，不能证明真实素材权利。HTTP 使用 no-store，cache endpoint 只验证版本化键与实际响应策略；不代表 CDN/Worker 缓存。运行 CMS 原生 Turbopack build 时保持其独立 root，HTTP fixture transport 不引入站点依赖。双 owner 构建后 81 个真实网络样本通过，证明限定切片可运行，不关闭 T04 整体、P4 或 T05。见[运行契约](../services/content-cms/docs/shadow-reader-integration.md)及[证据](../reports/payload-t04-loopback-2026-10-31-r4/README.md)。

# Payload 架构决定与实施风险

> 2026-11-02 当前决定：Payload + PostgreSQL 常驻本机、私有本机媒体、仅本机发起封存发布，Cloudflare 多 Worker 服务公众且不实时依赖 Mac。Genshin/NTE 双owner推广、续验和兼容恢复协议已安装，本地连续发布/恢复已有实测；不再以 D1/PG 云托管比较作为首发前置。真实云发布/恢复、异地灾备及工程交付仍未完成。deepmerge仍1 low，R16已复现并形成[限定本机临时风险接受](payload-dependency-risk-2026-11-02.md)，不是修复。操作看[现行手册](payload-operator-runbook.md)，状态以[当前任务表](../plans/project-task-status-current.md)为准；下方R9/ADR为历史。

更新：2026-11-01；状态分为已决定、本地实验、待验证。用户已选择 Payload；不是重新选型。当前交付状态见 [R9 状态更新](../reports/payload-status-audit-2026-10-30/comprehensive-audit-2026-11-01-r9.md)，早期架构实验见[第七批记录](../reports/payload-migration-2026-10-29/batch7.md)。[T05 ADR v2](payload-production-adr-2026-11-01-v2.md)新增七项本地 D1/R2 底层实验；PG/Payload adapters 与生产 runtime/storage/security 仍未验。A05 评估顺序不变，不代表生产方案批准；沿用 R8 的 1 low 风险待办。

| 编号 | 决定 | 状态 / 依据与后果 |
|---|---|---|
| A01 | 一套全游戏 CMS，保留区域 scope | 已决定；不以单游戏试点代替全量迁移 |
| A02 | 独立于公众站点的依赖环境 | 已决定；Payload 3.92.1 的 Next peer 不包含主站 15.5.28；禁止升级主站来凑兼容 |
| A03 | Payload 3.92.1 + Next 16.4.2 + React 19.2.6 | 本地实验；模板 Next 16.3.3 安全扫描不通过，升级至兼容 peer 的 16.4.2，并固定 DOMPurify 3.4.17；实际检查与剩余公告见实施记录；Node 要求 `^22.23.4 || >=24.22.1` |
| A04 | 本批本地 SQLite | 显式启用 transactionOptions，已测试提交/回滚、版本恢复和冷备跨进程恢复；libSQL SQLite 与 Cloudflare D1 不是同一运行环境，不构成生产选型 |
| A05 | 按 ADR v1 建议优先以 Node/PostgreSQL 做生产基准验证，保留 Workers/D1 与独立对象存储候选 | 待验证、未批准生产选型；替代早期 D1 优先的评估建议。两条路线使用相同事务/并发/队列/恢复标准，不复用玩家 DB，不凭模板或本地 SQLite 推断生产可用 |
| A06 | CMS 账号独立于玩家账号 | 已决定；公众账号保持停用；生产首管理员需受控引导，不开放注册 |
| A07 | 每迁移单元只有一个权威源 | 已决定；停写、最终同步、摘要对账后交接，回退显式交还权威 |
| A08 | 已批准不可变快照供公开读侧使用 | 已决定方向；快照存储、激活 CAS/协调器、保留期与成本待验证 |
| A09 | 多 Worker 按路径消费 | 已决定；NTE items 详情与共享资源仍归 Main，绿梦语言有限；实际线上配置需另核验 |
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

## 上线前必须解决的问题

1. **D1 事务语义**：固定版本适配器对 transactionOptions 有条件处理。验证失败回滚、多记录关联一致性、抢占/重复执行、迁移限制、数据库体量；不通过就重新决定数据库/调度方案。
2. **Workers 运行环境**：官方模板有付费套餐、包体及图片处理限制；不支持的裁剪/焦点/Sharp 能力需独立图片服务或上传前处理。需要实测，不在此填虚构成本。
3. **鉴权默认绕过**：Payload Local API 默认 overrideAccess=true，更新锁也可默认覆盖。用户动作必须明确 overrideAccess=false、overrideLock=false 并传入身份；特权导入需独立入口/记录。API status 不能充当网站发布批准。
4. **历史证据与私有资源**：即使内容标记 published，证据/草稿不应可匿名读取。媒体文件直链、搜索、深层关系、版本接口、错误日志都要审查；本地 ACL 测试不能代替生产安全验收。
5. **跨 Worker 发布**：Router 归属与运行时 bindings 分开核验。不能用一次 CMS 保存冒充全站原子激活；缓存/RSC/SEO需共享版本上下文，部分 owner 未升级时阻断不兼容内容。
6. **现有发布门禁**：Main 可受控发布，四游戏/Router 通用远程执行器尚未齐备。内容系统不能借此绕过原生产入口。
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

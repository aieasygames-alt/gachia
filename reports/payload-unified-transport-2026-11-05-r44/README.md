# R44 五目标精确模块传输

2026-11-05。本轮完成五目标候选/兼容恢复的精确模块封存与本地验收，接续 R43 输入。没有云上传、部署、常驻 CMS 安装或数据库写入，不能据此宣称全内容正式更新已交付。

## 实现

- `scripts/unified-cloud-module.mjs`：五目标精确配置政策、固定 Wrangler 4.148.0 launcher/CLI 字节、无凭据 dry-run 和严格 outbound metadata。复用既有纯校验函数，不放宽旧双游戏云发布器。
- `services/content-cms/src/unified-transport.ts`：接收 R43 外部 pin；候选打包一次，恢复保留旧模块字节，随后两方向均再次实际 no-bundle dry-run。独立 `module/` 不允许旁带文件，避免自动模块发现和日志触发重载。
- `unified:transport-local prepare|verify`：严格显式参数，不提供 upload/promote。输出目录不能覆盖或位于上游构建、发布产物或历史旧产物中；失败状态不可覆盖/自动续跑。复用 R43 只读资产树，不再复制五套资产或重建应用。
- 独立 verifier 重开 R43 源码/全部资产/历史 multipart、固定运行配置、工具字节、两次实际 dry-run 的 archive/参数/日志、封存模块与完整 HTTP 证据。配置降级、额外模块、秘密值/asset JWT、遗漏 owner、篡改、失败状态和 preview 降级拒绝。

## 成功批次

[transport-03/transport.json](transport-03/transport.json)，外部 pin：

`c4dada10737b73f903b912c96bd7efd0bbc54404fde7986a31d0515a6d42d0fd`

上游为 R43 `publication-03`，pin `54caead16024ca1827ff517cf8c931b892b2b6d3bac3871c98ec9061fcc8537f`；没有修改 R42/R43 封存输入。

| Owner | 环境 | 实际 Wrangler 分组语义 | 候选响应 | 恢复响应 |
|---|---|---|---:|---:|
| 蓝色星原 | 空字符串 | 保留 service tag | 203 | 203 |
| 原神 | 空字符串 | 空 grouping | 537 | 537 |
| 绿梦 | production | service + production environment tags | 199 | 199 |
| 异环 | 空字符串，live 变量 | 空 grouping | 371 | 371 |
| Main | 空字符串 | 保留 `cf:service=gachia` | 1,268 | 1,268 |

蓝色星原保留 staging 环境声明；绿梦保留 production 声明且显式选择 production，不能使用同名服务顶层的 preview 变量。这些由已安装 Wrangler 的实际配置解析/标签函数验证，不是复制的标签模型，也不是本轮云控制面观察。

成功批次执行 **20 次无凭据实际 dry-run、10 个真实本地 Worker、5,156 个 HTTP 响应**。其中 4,254 次静态资源字节/MIME检查；Main 两方向各 435 份公开 JSON。所有恢复模块与上游旧封存字节相同，候选新正文与恢复旧正文均通过；sitemap、robots、无 cookie 和关闭账号 API 也检查。原神 32 篇（含 `cms-returning-player-checklist`）/异环 53 篇攻略在两方向字节相同。

此处 dry-run 数量仅统计成功批次，不混入单元测试或失败诊断调用。清理沙箱后另起 CLI、使用上述外部 pin 独立复验通过。结果见 [summary.json](summary.json)、[independent-verify-final.log](independent-verify-final.log) 与 [closeout.log](closeout.log)。

## 验证

- CMS 全套：249/249；含实际 dry-run + Node loopback 编排测试、额外 SQL/HTML 模块回归、输出重叠/篡改/部分失败/重试拒绝和严格 CLI。合成 loopback 不冒称真实 Worker，真实 Worker 证据在上方单列。
- 相关发布工具：283/283，其中新底层测试 13 项；测试已接入根 `test:release` / `test:desktop-publish`，本轮实际运行相关文件集合，不冒称完整远端 CI。
- 文档/CI 范围：40/40；CMS TypeScript 与 `git diff --check` 通过。
- 最后补入旧产物目录输出重叠检查及回归；不影响已封存模块和验收字节，源码全套测试重新执行。日志分别保留初始与最终批次，不覆盖此前诊断。

## 失败记录

初始测试发现 Wrangler 的 dry-run multipart 包含空 `annotations:{}`，原严格字段白名单拒绝；已将空对象纳入明确合同，非空仍拒绝。首次 CLI 启动的 npm 版本检查在当前网络下拖延退出；关闭 banner/update check 与错误上报，不修改 Wrangler 代码。独立 Node 22 诊断进程已结束，没有云写入。初始测试的 3 通过/2 失败不算最终结果。

`transport-01` 的真实 Worker 因模块与日志位于同一被监听目录而持续重载，最终本地就绪超时并按失败退出。改为独立 `module/worker.js` 子目录；新批次不得覆盖失败目录。原始失败状态、dry-run multipart 和日志保留。

`transport-02` 蓝色星原候选真实 HTTP 验收完成，恢复 dry-run 被单模块合同拒绝：Wrangler no-bundle 自动把旧 OpenNext 目录里的 SQL 与 404 HTML 当成额外模块。恢复 Worker 现在先逐字节复制到隔离单模块目录再 dry-run，不能通过放宽 multipart 合同接受这些旁带模块。第二批失败证据同样保留。

初次 TypeScript 检查发现 Next 的 `ProcessEnv` 声明要求测试子进程明确设置 `NODE_ENV`，已修正；初始失败和最终通过日志分开保留。

## 空间与边界

仅清理本轮 16 个 `home` / `.wrangler` 沙箱目录，约 **4.53 MiB**；清理前后都重新验 pin。完整模块、multipart、HTTP 响应、失败诊断、R42/R43 输入及历史 release/source/备份/密钥保留。本轮报告与证据约 363 MiB 逻辑字节，当前约 **31.08 GiB** 可用，没有需要紧急删除的历史内容。详见 [cleanup.json](cleanup.json)。

所有回执保持 `preview:true`、`productionReady:false`、`activationSupported:false`、`cloudWrites:false`、`credentials:false`、`rawUuidRollbackAuthorized:false`。没有 Git 提交推送、实际 CI、持久 CMS/PG 迁移/导入/安装、Worker/R2 上传或切流；常驻和公众仍 R39。本轮历史旧模块只是完整性输入，不是新鲜云身份，也不是内容权威性认证。用户取消的公开内容来源认证不加入门槛。

下一阶段：五目标精确候选/恢复云预览协议与实时拓扑/不可变版本身份，再接受控推广、partial 对账和 source-advance；随后精确源码 CI、冷备/有界安装/显式迁移/held 导入及真实 CMS 内容批次。全领域/引用规则、逐类型消费者、其他代码/TSX 内联内容、结构扩展、新增/撤回/媒体仍未全部关闭。

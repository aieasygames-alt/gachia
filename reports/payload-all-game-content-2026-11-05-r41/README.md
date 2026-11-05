# R41 全游戏现有内容编辑与冻结源码

日期：2026-11-05。维护目录：`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`。继承提交 `c120316e8e7f2173e279d768e4f8d67ac9048c79`；本轮代码仍在工作区，不是已提交/CI/安装版本。目标、准确合同与剩余队列见[编辑契约](../../docs/payload-unified-content-editor.md)及[实施队列](../../plans/payload-all-content-implementation-2026-11-05.md)。R40 封存证据未改。

## 实际交付

- 16 个技术 game/region scope、115 份数据来源、2,795 个现有记录/具名区块进入同一套 Payload 编辑、审核、锁与版本模型。不是 2,795 篇文章，也不是所有页面内容已迁移。
- raw JSON、四独立应用 `lib/data.ts` 与 `tier-lists.ts`/`progression.ts` 独立字面量输入使用静态 AST 提取，不执行源模块。已有原神/异环攻略继续委托运行中的独立合同，摘要继续委托生成器。
- `structuredValue` 保存现有叶子字段修改；身份、来源、审核证据与媒体权利禁止直接改写。受控 held 导入、按游戏事务、重跑保留人工编辑、来源修订拒绝与管理员删除拒绝已验。
- O/A/B 导出保留全部来源的公开 A，包括未编辑游戏与 Git 中没有的已公开记录；同字段冲突拒绝，没有新编辑不生成发布变更。
- 增量迁移仅添加当前表与版本表 JSONB 列；有任何新值/历史时 downgrade 拒绝，保留成果。只在隔离 PostgreSQL 执行。
- 续接新增冻结源码：显式提交/全来源 SHA、原台账先验、完整 A 与 B、镜像/角色摘要/搜索/榜单客户端/Sea 生成及检查、12 Main-only/四独立游戏 owner 计算、完整 A 存档与源码逐文件验 pin。摘要与 A 不一致拒绝；二进制媒体按原字节计算 SHA。

## 验证结果

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 最终 CMS 全套 | 225/225 | [cms-with-freeze.log](cms-with-freeze.log) |
| PostgreSQL 增量迁移与真实 HTTP | 最终 15 组通过，schema push 关闭 | [postgres-with-freeze/postgres-smoke.json](postgres-with-freeze/postgres-smoke.json) |
| 最终 CMS Next 构建 | 通过 | [build-with-freeze.log](build-with-freeze.log) |
| 最终类型检查 | 构建后独立执行通过 | [typecheck-after-build.log](typecheck-after-build.log) |
| 最终文档/只读 CI 分类 | 38/38 | [documentation-with-freeze.log](documentation-with-freeze.log) |
| 完整计划 | 16 scope / 2,795 编辑单元 | [plan-final.json](plan-final.json) |

最终套件包含真实 115 来源的临时 Git 冻结：原神/HI3/洛克中文角色与绿梦字面量共四条隔离编辑，检查 raw 镜像、摘要、搜索、榜单客户端、角色详情数据和未编辑攻略 A；人为增加的 public-only 指南仅为临时 fixture，绝未发布。篡改源码/保存的 A 与摘要不一致、目录覆盖、浮动提交、缺基线等拒绝回归均包含。临时源码/数据库/进程在测试后清除；没有保留一套额外全站构建。

计划 SHA：`03ad336434e125bad1cbe56ab17319227c9e5e344bfe6344dc29e30451c5cb0d`。早期 [build-final.log](build-final.log) 的 PostgreSQL probe 类型错误、[frozen-source.log](frozen-source.log) 的 macOS `/var` 临时路径别名失败、[typecheck-with-freeze.log](typecheck-with-freeze.log) 的并发 Next 类型生成竞态均保留；之后修正/串行复验，没有放宽断言或删失败证据。

最终[工作区源码摘要](source-seal.json)和[验证摘要](verification.json)只绑定本地文件/结果，不冒充提交、CI 或发布授权。常驻 `/health` 最后只读检查为 200/ready；磁盘约 35 GiB 可用。CMS 可再生成 `.next/cache` 约 477 MiB，仅列建议，未删除。测试自己的空 namespace 可清理，不触碰历史缓存/发布/恢复资料。

## 尚未交付

所有新候选仍 `productionReady:false`、`activationSupported:false`；冻结回执为 `generated_source_only`、`sourceAuthentication:not_verified`。完整公网来源认证、完整领域/引用校验、实际全 owner Next/OpenNext 构建与消费者验收、兼容恢复及正式推广仍待完成。现有发布器不接受该新合同。剩余页面内联事实、结构扩展/新增/撤回、媒体替换和完整领域模型没有被通用 JSON 编辑代替。

本轮未升级常驻 CMS、未迁移真实数据库、未写正式内容、未提交/推送/运行实际 CI、未上传 Worker/R2 或切换流量。常驻/公众版本仍 R39，原神 32 / 异环 53 篇公开攻略与 85 条 CMS 记录不由本轮测试替换。HI3 旧工作台在前轮已按授权删除，不再次删除 HI3 代码或资料；其他历史发布、恢复、备份和密钥均保留。

# R144：R143 收尾推送与 CMS 编辑源同步完成

完成时间：2026-11-21T17:39:55.203186+08:00。本批已完成用户指定的 R143 收尾提交推送和 CMS 编辑源同步；**没有重新上传或发布 R143 内容，Worker 上传 0、正式部署 0、审核写入 0。**

## 实际同步结果

- 同步 390 条既有原神 CMS 记录，保留原数据库 ID、创建时间、真实原始导入 `sourceRecord`、原 `hold` 和 `_status`。
- 从已接受且已上线的 R143 A 首次导入 84 个材料和 2 个角色，共 86 个新实体，保持 held 草稿。编辑基线不会替代原有真实导入 O，也不产生新的审核决定。
- 关系记录 609：`shinobu → kuki-shinobu`；关系记录 611：`sara → kujou-sara`。两项已审核身份迁移均保留原 CMS 记录 ID 和原始导入来源。
- 原神三个集合现在共 476 条：269 材料、117 角色、90 条角色材料关系；CMS 全量 2,880 → 2,966 条。其余 2,490 条内容逐条保持。
- 原 179 条结构暂存和 221 条独立审核比较/决定保持。胡桃既有正式文本、异环/Zero/27 材料及 441 引用删除状态、既有攻略增量沿用 R143。

同步键：`e853cb99187fea52348e6115131ca82a9d2f9893f718d1ebcacf053ff1403231`。全部内容写入与唯一 `migration-batches` 完成标记在一个真实 PostgreSQL 事务中提交。

## 真实验收与重复执行

[首次成功安装版执行](installed-apply.json)记录创建 86、更新 390；[重复执行](installed-repeat.json)创建 0、更新 0、复用 476。重复前后的全量 REST draft/published 读取和所有内容时间戳完全一致，两份快照均通过稳定双读。

通用完整导出实际检查得到 **0 条变更**，不会将已上线内容再次当成待发布增量。两次执行前后六个生产服务的 deployment 和 version 完全一致；原神保持 `c76c9d57-f814-410c-843a-1dcef57412e3`，deployment 保持 `8586474e-c106-495a-a4d7-4b2f2b5f4348`。

数据库完整表指纹对账仅五张表变化：`_content_records_v`、`_content_records_v_locales`、`content_records`、`content_records_locales`、`migration_batches`。内容新增恰为 86 条、批次新增恰为 1；审核、暂存、旧批次、媒体、用户、会话和其他所有表保持。见 [写前](database-after-install.json)、[写后](database-after-stage.json)和[最终机器回执](delivery.json)。

## 安装、修复与验证

执行源码提交 `dbc87d403207cd75c14931b5c5175735b1f48df4` 已非强推到 `origin/codex/payload-unified-maintenance`。修正版使用精确源码标准构建，安装前完成冷备和独立真实恢复演练；安装前后所有数据库表指纹一致，未做 schema 迁移，旧安装保留。最终安装与依赖 pin 见 [application-installed-final.json](application-installed-final.json)和 [runtime-dependencies.json](packaging-02/runtime-dependencies.json)。

首次独立安装执行暴露仓库级 TypeScript/Playwright/Zod 依赖闭包缺失；补齐后又发现历史来源读取假定运行在开发仓库。两次 apply 启动失败均在 intent 和 CMS 初始化之前，未写内容；两次安装之间数据库完整指纹也完全一致。失败日志保留为 `installed-apply-startup-01.log`、`installed-apply-startup-02.log`，没有盲目重复写入。

最终执行代码仍来自封存安装包；来源只读核验在显式 `--repo` Git 根目录的异步范围内读取既有合同和历史对象，不改变全局 cwd、环境或普通编辑器。正式来源的路径、pin、Git 对象和完整历史门禁保持。安装依赖闭包逐文件 pin，在 apply/repeat 前核对。

验证记录：

- SQLite 真实同步 8/8：[sync-test-03.log](sync-test-03.log)。
- 隔离 PostgreSQL、真实既有 schema、`schemaPush=false` 的同步 8/8：[postgres-probe-01.log](postgres-probe-01.log)。
- 首轮相关回归 60/61 暴露普通记录 stale 来源被错误放行，已修复；最终相关复验 43/43：[regression-02.log](regression-02.log)。首轮日志 `regression-01.log` 保留。
- 修正版异步仓库范围、历史合同、主站来源、安装完整性和真实同步回归 29/29：[path-fix-test-01.log](path-fix-test-01.log)；最终 CMS 类型检查通过：[typecheck-02.log](typecheck-02.log)。
- 文档/范围门禁 39/39：[docs-scope-01.log](docs-scope-01.log)；本批完成文档后再次运行，见 `docs-scope-02.log`。
- R143 收尾提交 `95f26d9` 的[完整 CI 44887084808](https://github.com/aieasygames-alt/gachia/actions/runs/44887084808)成功；同步实现 `0d0a5d4` 的[完整 CI 44888535920](https://github.com/aieasygames-alt/gachia/actions/runs/44888535920)成功。修正版 `dbc87d4` 的[CI 44889727050](https://github.com/aieasygames-alt/gachia/actions/runs/44889727050)完整通过（CMS、Router、发布工具、页面/数据消费者、公共类型与文档门禁全部成功），见 [ci-implementation.json](ci-implementation.json)。

Next.js 16.4.2 构建曾显示已知安全公告并在首次提醒后退出，同一标准命令按提示重试成功。安全升级仍为独立待办，本批没有改框架依赖或重发线上应用。

## 唯一接续入口

正式内容继续使用 [R143 source-index.json](../genshin-collection-production-2026-11-21-r143/published-sources/source-index.json)，pin：

`6598ff503df109ca57e0df4928ed99a9084f0e7d366401e39e9c2fe06117db57`

CMS 编辑前态使用 [R144 cms-final.json.gz](cms-final.json.gz)，pin：

`b25b29e1fc523c767252e4059cb9ba8d7574be651b08b783002f9096a9cfaf20`

本批[接续交付](delivery.json)，pin：

`ccf4815b18f7381cea6077b171a7e8e220b7a71f7cdcf1edf5a32689f890b276`

**不要重放 R140 的 42 草稿、R141 的 179 暂存、R142 的审核决定、R143 的生产部署或 R144 的同步。** R142 导出器绑定的是旧 CMS 前态，不应再套用到当前已同步 CMS；后续新编辑从 R143 A 与本批 CMS AFTER 开始，并按其内容类型走独立审核/发布合同。原有 hold/status 和真实 O 保持，新实体保持 held；绿梦继续中文范围。

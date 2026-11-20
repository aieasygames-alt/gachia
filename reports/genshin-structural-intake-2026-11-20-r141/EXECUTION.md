# R141：写后快照接续与 179 条结构修订真实暂存

状态：本批已完成。R140 的 42 条材料草稿保持，剩余 179 条结构提案已原子导入常驻 CMS 的只读候选集合；尚未审核为编辑源或发布到网站。

## 实际结果

- 校验 R140 delivery pin `f612e802132fa7e3a1af36e6076be9c59eccf353c6bb9c4ae650455c7d651892` 与写后快照 pin `7100b065d9d1da84de5a016c39a6aeff483fafbb06727d4cbbf323412f9bbfde`。新捕获稳定双读 2,880 条，草稿及 published 读取均与 R140 写后快照完全相同。
- 从写后状态重新对账，221 条相对 A 的提案中，42 条 `structuredValue` 已等于合并结果，全部保持 `draft`、`hold=true`，明确计入 `alreadyApplied`。旧 PATCH 准备函数也新增已应用拒绝，防止以后误用旧入口重复写入。
- 剩余 179 条：3 条既有材料受保护来源修订、84 个新材料、90 条角色材料关系、2 个新角色。关系包含 `sara → kujou-sara` 与 `shinobu → kuki-shinobu` 的显式迁移，两个新角色为 `mualani`、`ororon`。
- 复用现有 `migration-records` / `migration-batches`，建立独立 `genshin-structural-stage-v1` 合同，没有修改数据库 schema 或放宽通用内容 hooks。每条保存完整 O、A、CMS 前态、候选、字段变化、证据 pin 和恢复信息，固定 held、不可发布。
- 一次真实事务创建 179 条只读修订及 1 份完整 manifest。批次 `f173c9de5587920b011ab9d9c3a82015634f296c8e569d315c5882860b21c83d`。独立安装入口复验通过；重复执行返回 `created=0`、`reused=179`、`alreadyAppliedSkipped=42`、`contentRecordWrites=0`。
- REST 独立读取 179 条及完整 manifest，逐字段和 revision SHA256 匹配。最终再次稳定双读全部 2,880 条 `content-records`，与 R140 写后状态完全相同，42 条及其余 2,838 条均保持，已有 published 内容保持。匿名候选读取返回 403。
- 数据库 42 张表前后逐表比较，仅 `migration_records` 由 0 增至 179、`migration_batches` 由 0 增至 1；其余 40 张表（包括内容、版本、原始来源、已有审核和媒体）完整行摘要保持。

这些 179 条目前可在后台的 Migration records 中按 `stableKey contains genshin-staged:` 查看。它们尚未替换 `content-records` 中的编辑源，也没有进入旧 Review decisions 的审核通道。

## 安装及恢复保障

精确应用源码提交为 `30d3ecc2f83ec232d1abed5c325141aa8406fc7b`。构建使用隔离的临时配置，checkout 未连接常驻数据库。安装包验证 787 个应用文件及 354 个发布依赖文件，BUILD_ID 为 `XWyTCu4vPkx__D9vS29Wv`。

常驻应用：`/Users/robert/Library/Application Support/GachiaCMS/releases/20261120T151905Z-genshin-stage-r141-30d3ecc2/services/content-cms`。原应用和切换前 settings/LaunchAgent 保留。冷备为 `20261120T152456Z-898be3`；在隔离 PostgreSQL 中实际恢复并核验完整规范数据摘要、1 个媒体文件，计数 `1|2880|1` 通过。应用切换前后全部数据库表摘要相同，无 schema migration。

所有失败记录保留：

1. 稀疏依赖链接超出 Turbopack 根目录，首次构建失败。
2. Webpack 模式因顶层缺少 libsql 入口失败。
3. 临时完整依赖副本中的标准构建编译/类型/页面均通过，随后被 Next 的一次性安全升级提醒停止；按其正常重试机制再次构建成功。Next 16.4.2 已知安全公告需作为独立修复项处理，依赖版本本批保持。
4. 首次已安装 CLI 在打开数据库前发现缺失 `packages/data/package.json` 的 ESM 边界；未生成数据库 intent。补齐精确提交中的该文件并重新封存 manifest，初始 manifest/安装回执保留。第二次执行完成唯一一次真实导入。

上述构建和包装修复没有产生重复的草稿写入或候选导入。完成后核验安装副本，清除本批工作区可重建 `.next` 输出；正式和历史安装、来源、失败日志、冷备均保留。可用空间约 13.92 GiB，8 GiB 保留线保持，后续完整游戏构建仍需满足 14 GiB 预算。

## 验证

- 接续/结构合同、既有编辑约束、依赖及安装身份聚焦：70/70。
- 真实 SQLite 事务、回滚、幂等、ACL、损坏拒绝：7/7。
- 现有 migrations、非超级用户、关闭 schema push 的隔离 PostgreSQL 同组验证：7/7。
- 文档与 CI 范围：41/41。
- CMS TypeScript：通过。
- CMS 完整标准构建、冷备实际恢复、安装全文件校验、真实导入、独立 CLI/REST 复核和全表差异：通过。

通过的测试均无跳过；首次构建/包装失败作为独立失败证据保留，不记为通过。没有新远端 CI、Worker 上传/部署或实际生产回滚。

## 接续入口

以 [delivery.json](delivery.json)、[installed-apply-02.json](installed-apply-02.json)、[installed-repeat.json](installed-repeat.json)、[rest-stage-readback.json](rest-stage-readback.json) 和 **cms-after.json.gz** 为接续来源。不要重放 R140 的 42 次 PATCH，也不要创建第二套 179 条候选。

下一步为来源字段、数值/分类、完整关系与身份迁移、新实体建立独立审核合同，并将审核后的修订纳入完整集合导出；随后验收页面、公开 JSON、搜索、主站聚合和兼容恢复，再做原神单 Worker 正式内容发布。原始 A 的历史依赖缺口需要纳入恢复预期，不以候选替换旧恢复原状。

正式来源仍为 [R139 source-index.json](../genshin-code-production-2026-11-20-r139/published-sources/source-index.json)，pin `59b5831d8547d02b37c4052506e777a11d6d75fbfc1d604a0a3412010cb99fca`，本批没有推进来源。原神生产版本仍为 `882906a4-328a-4a3c-ba3a-5e6130a8ed99`。115 份发布来源和 11 份既有 checkout 差异保持；胡桃、异环咲里/收藏家剧作核心、Zero、27 个未证实材料的删除状态及攻略增量保持，绿梦继续中文范围。

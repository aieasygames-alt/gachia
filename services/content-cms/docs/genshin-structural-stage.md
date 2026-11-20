# 原神结构候选暂存与写后接续

R140 已把 42 条兼容的既有材料修正写入 `content-records`，全部保持 held 草稿。
接续必须绑定 R140 的 **写后**快照，以新捕获的完整 CMS 状态重建对账。
与公开 A 不同的提案仍然有 221 条；其中 CMS `structuredValue` 已等于合并结果的
42 条属于 `alreadyApplied`，不再进入 PATCH。旧准备函数现在也拒绝重复写入。

R141 使用现有 `migration-records` / `migration-batches` 暂存剩余 179 条结构提案：
3 条受保护来源修订、84 个新材料、90 条关系（包含两个显式身份迁移）、2 个新角色。
这些记录是 CMS 内可查看的不可变候选，**尚未成为 `content-records` 编辑源**。
它们不具备发布资格；审核和完整集合导出须另行实现并验收。

## 存储与边界

- 专用合同 `genshin-structural-stage-v1`，与旧 `legacy-records-v2` 分开验证。
  不调用旧映射器、不伪造原始导入 O，也不向通用编辑 hooks 添加例外。
- 一条提案对应一个 `migration-records`，`stableKey` 使用 `genshin-staged:` 前缀。
  `candidateText` 保存完整 CMS 前态、O/A/候选/合并结果、变更类别、恢复信息和来源 pin；
  `revisionKey` 是其规范 JSON 的 SHA256。`rawRecord` 是候选值，`reviewText` 给出字段差异。
- 一个完整 manifest 对应一个 `migration-batches`，`mapperVersion` 为上述专用合同，
  `batchKey` 是 manifest 的 SHA256。已有候选和审核记录不覆盖。
- 两个集合已有 staff 只读权限；普通 REST 和管理员界面不能创建、修改或删除。
  无 schema 变化，`content-records`、版本、原始 provenance 和已审核内容不写入。
- 导入在一个真实事务中核对全部 390 条原神 CMS 前态、创建并逐字节验证179条修订及
  完整 manifest，再提交。中途失败全部回滚。再次执行先完整核对，只读复用已完成批次。
  并发冲突/网络结果不明确时先 `verify`；不得盲目生成新批次重试。

## 安装入口

只能由当前安装应用执行 `scripts/genshin-structural-stage.ts`，执行前验证应用 manifest、
精确 Git 提交、全部源码/发布文件、BUILD_ID，以及输入/源索引/候选证据/CMS 快照 pin。
checkout 不得直接连接桌面数据库。命令需要明确 `apply` 或 `verify`，以及：

```
--input <absolute JSON> --input-pin <sha256>
--application <installed application-manifest.json> --application-pin <sha256>
--commit <exact git commit> --repo <repository> --output <new absolute receipt>
```

`apply` 在数据库操作前写出独立 intent；回执写入使用 `wx`，避免覆盖历史结果。
`verify` 只读重新验证已完成的批次。

管理员界面可在 Migration records 中按 `stableKey contains genshin-staged:` 查看候选，
在 Migration batches 中按 `mapperVersion equals genshin-structural-stage-v1` 查看完整 manifest。
审核不通过现有 Review decisions 通道：该旧通道要求 `legacy-records-v2`，不会把此批次
自动转换为旧 editorial draft。

## 后续资格

下一步单独处理数值/分类、来源字段、关系/身份迁移与新实体审核，审核结果须绑定当前
候选 revision、证据和 CMS 前态；编辑已有草稿后旧审核失效。完整导出需将已审核结构
修订与已有内容显式合并，验收新实体、公开 JSON、页面、搜索、主站聚合和兼容恢复。
只有满足这些资格后才进行原神单 Worker 内容发布。R139 正式来源继续保持。

## 验证

`tests/genshin-structural-stage.test.ts` 使用写后快照测试 42 条排除、179 条范围、完整
provenance 和旧快照拒绝；`tests/genshin-structural-payload.test.ts` 在真实 SQLite/
隔离 PostgreSQL 测试原子回滚、CMS 漂移拒绝、幂等复用、只读 ACL 和存储损坏拒绝。
PostgreSQL 可用 `scripts/genshin-stage-postgres-probe.ts <new absolute log>` 重放，
使用现有 migrations，关闭 schema push，不接触常驻数据库。

# T05 ADR v2：本地运行时实验补充

> 历史实验记录。后续用户已选择并实际运行本机 Payload/PostgreSQL，公众保持 Cloudflare；不继续等待云 CMS/D1 选型。当前剩余为持续发布/恢复/灾备与真实验收，见 [R10](../reports/payload-status-audit-2026-10-30/comprehensive-audit-2026-11-02-r10.md)。

日期：2026-11-01。承接 [ADR v1](payload-production-adr-2026-11-01.md)，不覆盖历史证据，不改变“建议、待实测、未批准生产选型”的状态。

## 新增证据

`reports/payload-real-slice-2026-11-01/local-runtime-final.json`：在已安装的 Miniflare 5.20261006.0-alpha / workerd 1.20261006.1 上，临时 D1/R2 API 的七项合成实验通过。

| 实验 | 已证明 | 未证明 |
|---|---|---|
| D1 batch 回滚 / 外键 | 本地 batch 内唯一键失败不残留先前写入，外键错误被拒 | Payload transaction API、生产 D1 事务语义与迁移 |
| 12 路条件更新 / 任务 claim | 同一本地实例的条件 SQL 各只有一个胜者 | 多 owner 激活协议、真实分布式锁、Payload 编辑锁/队列、租约恢复 |
| 三表逻辑恢复 | 合成记录导出后在另一个本地 DB 精确重建 | 在线一致备份、完整 CMS/媒体/证据/版本联合恢复 |
| R2 条件创建与读回 | 同 key 再写被拒，合成字节摘要一致 | 远端权限/耐久性/传播/限额，真实 Snapshot 审批与解析 |
| 运行时重开 | 正常关闭后同机 D1/R2 状态可再读 | 崩溃/断电/跨区恢复、GC、撤回、应用离线保留 |

工具：`node scripts/payload-local-runtime-probe.mjs <new-report.json>`。只创建临时状态和本地 loopback 运行时，关闭后删除；没有生产数据库或云资源操作。

## 尚不能作出的决定

- PostgreSQL/initdb/pg_ctl/psql/docker 不在当前环境；Payload PG/D1/R2 adapters 未安装。没有 PostgreSQL 对比基准，也没有 Payload-on-D1/PG 的完整应用实验。
- 继续优先以 Node/PostgreSQL 为完整编辑服务基准验证路线，保留 Workers/D1 候选；这不是供应商/数据库批准。
- 原始 SQL 证明底层候选具有部分所需机制，不能证明现有 Payload adapter 使用了它们。alpha 模拟器尤其不能作为生产 SLA、容量、价格或稳定性承诺。
- T05 仍部分完成；不得因七个底层实验成功推进真实 T06 激活。

## 下一套同等验收矩阵

为 PG 与 D1 各准备版本隔离、可丢弃命名空间，先验证 Payload CRUD/关系/版本/显式事务失败回滚，再进行跨进程编辑锁、队列抢占/重试、显式迁移失败与恢复。用同一组断言，不削弱失败条件以适应候选。
对象存储要补权限分离、完整制品读回验证、保留/撤回/GC 和故障恢复；生产成本/容量/SLO 仍须实际需求与最新供应商信息。真实云、业务数据、部署及激活仍需独立授权。

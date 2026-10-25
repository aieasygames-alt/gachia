# 依赖安全修复生产推广

用户已明确授权推送本批提交，并在门禁全部通过后执行生产部署。工程提交为 `6906e5c`，基线为 `855254b`。账号保持关闭，不执行数据库迁移、路由修改或清理。

## 发布前记录

- 修复分支已推送；本地发布测试 244 项 Node 和 30 项 Python 再次通过，内容门禁通过。
- Cloudflare 只读快照确认 Main 当前单版本 100% 为 `c96323b1-c9a3-4390-aa7d-d17a4fa83c45`，其他 owner 与 S2.23 记录一致。
- 前版 Main 产物 `12585908102`，ZIP SHA-256 `c15aed231444dae9520192aac6b1239dad5c82e08f24c90d22f846fd0c63de6c`；独立恢复回执 `12587311797`，ZIP SHA-256 `103cd3d6e09ef07da5f8e5e0c332c131ffa648e22ebb4397114f5c2ef9551f55`。执行时仍验证来源与摘要，不凭文档放行。
- GitHub Actions 用量接口缺少 user scope；Cloudflare subscriptions 返回 403。未扩大凭据权限，余额和套餐未知。主站 dry-run gzip 2896.82 KiB，按保守 3 MiB 上限检查。
- GitHub production/staging 环境没有独立 protection rules，本次由用户明确授权，不声称具备独立审批机制。

## 执行边界

本准备文档以 `[skip ci]` 集中推送，避免一次普通 push 验证加一次相同的手动生产构建重复消耗 Actions。手动 production 仍执行全部 build、staging、旧静态资源保留、同产物生产推广与验收门禁，不跳过测试。预计 Main 一次完整流程约 30–50 runner 分钟，实际用量以运行记录为准。

Main 先执行；四个游戏必须分别完成当前旧资源来源、封存、预览与同产物推广，Main 成功不能代表全站依赖升级完成。任一阶段失败停止后续切流，保留现场，不盲目回滚或重跑。

现场证据保存在 `.release-records/security-production/`。本文件是执行计划，不是已部署声明。

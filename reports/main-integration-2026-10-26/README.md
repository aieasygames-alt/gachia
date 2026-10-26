# Main 分支合入与 CI 验收

日期：2026-10-26。main 从 `334de6e6945c228b65860e3709558871d4e551ff` 快进至 `19a60f14105ec05a8be1ee706f1313e3ed58c0b3`，纳入 `6f7a01e` 功能修复、`caea9ff` 干净源码验收及 `19a60f1` 远端预检记录。没有 force push、改写历史、创建 PR 或更改平台保护设置。

## 合入前检查

- fetch 后 main 没有新增分叉，候选与远端工作分支一致，工作区干净。
- apps/packages/scripts/.github/package.json/lock 与已验收功能提交 `6f7a01e` 无差异，后续两笔仅文档证据。代码/文档空白检查通过；原始日志空白按原样保留。
- main 查询返回 protected=false；保护/rules API 返回 403 并提示需要升级 GitHub Pro 或公开仓库。本轮没有更改仓库可见性、订阅、权限或规则，不将接口不可用当作可配置保护已审查完成。
- 工作流明确要求 workflow_dispatch 才进入 staging/production；本次仅普通 push，未手动发起发布。

## CI 结果

运行：[40301600523](https://github.com/aieasygames-alt/gachia/actions/runs/40301600523)，事件 push，精确源码 `19a60f1`，最终 conclusion=success。

- build 作业成功，时间 `2026-10-26T09:42:18Z` 至 `2026-10-26T10:03:24Z`，墙钟约 21 分 06 秒。此值不是账单计费分钟或剩余额度证明。
- 类型、测试、Lint、数据、内容清单、Main 编译与 dry-run、Router 检查、编译后 SEO/受管内容、浏览器导航、Azur/Lvmeng bundle 与内容相关检查、llms、自包含性及封存步骤全部按条件完成。
- 浏览器导航套件 16 通过、8 跳过；跳过不计作通过。原 auth-dialog ref cleanup warning 保留。
- deploy-staging 和 deploy 作业均 skipped，没有发布 Main/staging/游戏/Router。
- 生产专用的 fallback publication 预检和旧静态资源保留步骤在本次 push 中跳过；此前本地覆盖通过不等于该 CI 制品已经完成生产专用门禁。

## 验证制品

GitHub artifact `12641657198`，名称 `web-worker-19a60f14105ec05a8be1ee706f1313e3ed58c0b3-1`，metadata ZIP digest `sha256:fc03135bb9c8cb5c935833c50d51074b54cab2392e87919a973c8907679d2554`，metadata 大小 52,912,263 bytes，expires_at `2026-11-02T10:03:19Z`。

本轮仅读取新验证制品 metadata，未下载并核对其 ZIP；它未部署，也没有本次生产旧资源合入步骤。不得作为当前生产旧来源或直接推广。当前生产旧来源仍应在正式发布前重新核验，而非用最新 main 的验证制品替代。

## 边界与剩余任务

- 本轮没有 Cloudflare 写入、真实用户数据操作、账户扩权、审批规则修改或自动重试 CI。
- Actions 账单权限仍不足，剩余额度未知；一次 CI 成功不能证明下一次完整发布额度充足。production environment 仍无已核实的审批保护规则，正式发布需明确授权与审批安排。
- 下一阶段需要正式 Main 发布的生产状态重读、旧来源/期限复核、资源保留、封存、staging 完整验收、授权后的生产推广及跨 owner 验收。完整游戏/Router 通用远程执行器仍属 S5。
- CI 提示 upload-artifact@v4 的 Node 20 action runtime 被强制转为 Node 24，以及 ubuntu-latest 迁移通知；本次运行成功，后续应单独评估兼容性升级，不能为消除提示临时修改本候选。

本目录保存精确运行结果与精简制品元数据。完整日志留在 `.release-records/main-integration-2026-10-26/`。结果记录为仅文档 `[skip ci]` 提交，避免重复消耗完整验证额度，不跳过本次已成功的功能 CI，也不触发生产。

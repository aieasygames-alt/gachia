# 多 Worker 生产入口与拒绝策略

## 当前能力

2026-10-25 的 P1 修复采用 fail-closed：统一生产目标入口并退役绕过门禁的命令，**没有新增能自动发布六个 Worker 的执行器**。命令不会构建、联网、读取凭据、上传或切流；不通过本地 JSON receipt、确认字符串或 CI 环境变量开放隐藏路径。

Main 继续通过现有 `deploy.yml` 手动流程执行真实生产发布。四个游戏已有本地封存、验收工具和历史受控发布记录，但还没有提交到仓库并完整验收的通用远程执行器；在其就绪前，普通生产命令拒绝写入。Router 始终单独审查。此为旁路修复，不是 S5 自动化平台完成。

## 唯一目标入口

在仓库根执行只读策略计划：

```sh
pnpm release:production plan --targets main
pnpm release:production plan --targets genshin,nte,azur-promilia,lvmeng
pnpm release:production plan --targets router
```

六个应用均有 `release:plan` 别名。必须显式选择目标，不支持默认目标、`all`、重复目标、未知目标或附加环境/配置参数；Router 不可与内容 Worker 混选。

计划只表示固定策略，`ready: false`、`cloudState: not_observed`、版本字段为 null，不表示源文件、审批、云状态或 receipt 已验证。多目标计划不是原子事务，不会隐式发布 Main、创建 staging 或切换 Router。

| 目标 | 现有服务 | 生产环境选择 | 当前真实发布路径 |
|---|---|---|---|
| main | gachia | 显式默认环境 `""` | 现有 Main 手动 workflow |
| genshin | gachia-game-genshin | 显式默认环境 `""` | 游戏同制品版本推广契约；通用远程执行器未接入，普通命令拒绝 |
| nte | gachia-game-nte | 显式默认环境 `""` | 同上；不能仅凭回退 UUID 格式放行 |
| azur-promilia | gachia-game-azur-promilia | 显式默认环境 `""` | 同上；保留环境定义派生的服务标签 |
| lvmeng | gachia-game-lvmeng | `production` | 同上；默认 preview 配置使用同一个 live 服务名，不能充当隔离预览 |
| router | gachia-router | 显式默认环境 `""` | 独立路由审查，无普通生产执行器 |

服务名、环境和 Router bindings 的对应关系由发布测试交叉检查；清单不是云端自动发现，不会新增或修正服务。

## 已封堵入口

- 六应用 `deploy`、既有 `deploy:production`、Main `upload` 均进入统一拒绝入口，退出码 1，不先构建或联网。
- 直接调用 `game-release.mjs deploy --environment production` 也拒绝，发生在读取 receipt、创建 lock/记录和构建之前。`executeRelease` 生产分支同样拒绝；旧计划不再输出可复制的原始生产 deploy 命令。
- 旧原神 Router canary/full-cutover 工作流退役：仅输出错误并退出，无凭据、checkout 或发布步骤。Router 已承载多个 live owner，不能继续当成原神接入初期的一次性切流。
- 本地 build、verify、生产模式 dry-run 与资源准备仍可用。隔离 staging 命令不因此获得生产授权；异环/蓝色星原 staging deploy 的干净源码检查现在一致，并在构建前后复核。
- Main workflow 内部的受控底层部署命令保留，不改为调用拒绝别名；原有来源、内容、静态资源、staging、确认、当前版本重读和线上验收不降低。

旧确认参数或 receipt 不能重新启用生产路径。若 Dashboard/外部脚本使用旧 package 别名，现在会失败而非直接上线；应迁移到受控流程，不能改用原始 Wrangler 命令绕开。

## Main 的受控流程

按 `docs/main-release-static-retention.md` 准备 Main 当前版本、旧制品及摘要/来源，必要时准备独立恢复验收回执。完整通过本地门禁后，使用 `.github/workflows/deploy.yml` 手动 production 输入、`RELEASE_MAIN_ONLY` 和 production environment；游戏 receipt 不能代替 Main artifact 来源。

本入口不会触发 workflow。environment 名称不等于已经配置审批人；每次仍须核实审批与预算。Main 保留既有封存产物流程，不冒称游戏的同 UUID 推广。

## 游戏远程执行器的后续要求

未来接入远程写入必须逐 owner 验收，不能把本地“通过”字段当作外部证明：

1. 绑定干净已推送 commit、运行时、完整封存树及外部 pin，校验配置、旧资源来源、目标服务与环境，保留标签差异。
2. 新鲜读取目标部署、模块和旧资源，同时对账其他 owner、staging、bindings、routes、domains、服务标签和清单；拒绝目标不存在、状态过期或范围不符。
3. 只上传封存包；上传 UUID 绑定云模块摘要、精确版本预览和完整验收，不在推广时重建。
4. 推广前再验来源、pin、旧版本与控制面，获得该目标授权；具备跨进程/CI 互斥及过期审批拒绝。旧 `.release-records` 脚本不能自动继承权限。
5. 每个目标独立记录上传、预览、推广、生产验收与失败状态；全部选定目标及跨 owner 验收通过才算整批完成。部分失败停止，不自动重试、回滚或继续下一个目标。
6. 验证正式域名、命名空间和直连静态资源字节、语言、noindex、XML、404、交互、图片归属及跨 Worker 导航。

路径级归属以 `packages/core/route-ownership.json` 为准。游戏前缀不代表全部属于专属 Worker：Main 仍承载部分异环详情、账号 API 和共享图片。局部发布需做交叉验收，但不能因此自动发布 Main/Router。

现有工具 `genshin-release-artifact.mjs`、`live-owner-artifact.mjs`、`retain-game-assets.mjs`、`live-owner-acceptance.mjs` 继续保留；本地 seal/verify 不授予远程权限。详见 `docs/live-owner-version-promotion.md`。

## 安全边界

这是仓库支持入口的误操作防护，不是 Cloudflare 账户级权限控制。持有凭据的人仍可手工调用原始 CLI/API，旧 checkout 或未更新的远端分支仍含旧命令。真正限制凭据使用需要平台权限和组织流程，不能以本地脚本保证不可绕过。

发布测试覆盖六目标映射、绿梦环境、Router 排他选择、24 种目标/动作子进程拒绝、无子命令/文件写入、别名收敛、旧 API/CLI 拒绝、伪 UUID/脏源码、Main 原门禁及退役工作流；没有移除原有制品和资源兼容测试。

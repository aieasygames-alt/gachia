# P1：多 Worker 生产入口旁路封堵

2026-10-25，基线 `334de6e`，本地未提交工作树。保留原有 119 份浏览器记录删除、忽略规则和审计材料。本批没有部署、触发 Actions、调用云 API、清除缓存、迁移数据库或操作用户数据。

## 本地实现

- 新增 `scripts/production-release.mjs`，明确 Main、原神、异环、蓝色星原、绿梦、Router 六个目标；显式选择，无默认/all，无配置/环境透传，Router 不与内容目标混选。
- 六应用生产 `deploy`、既有 `deploy:production`、Main `upload` 统一到拒绝入口，根命令为 `pnpm release:production`，各应用提供 `release:plan`。
- Main 继续使用原有手动 production workflow，未更改该 workflow 内容、审批确认、旧资产和生产验收门禁；没有为了统一命令另造较弱的 Main 发布流程。
- 原神/绿梦不再通过 package 脚本 build 后直发生产。异环/蓝色星原的旧 generic production CLI 及函数入口同样拒绝，旧确认参数、伪 UUID 或 receipt 不能解锁；生产计划不输出原始部署命令。
- NTE/Azur staging 发布的源码检查一致，构建前后复核干净 HEAD；本地 verify/dry-run 保留。未新增 staging 服务，未改变生产模式/域名/绑定/标签。
- 旧原神 Router canary/full-cutover 工作流变为无凭据、无发布能力的拒绝任务，避免把多 owner Router 当作单游戏历史切流入口。
- 新策略测试纳入 `test:release`，Azur 预览工作流路径过滤包含新策略及测试文件。

## 多 Worker 边界

绿梦明确使用 `production` 环境，因为其默认 preview 配置仍指向 live 服务名。其他目标记录显式默认环境，服务名与对应配置及 Router bindings 对账。游戏前缀不代表完整路径归属，计划要求跨 owner 验收，不把 Main 所属异环详情、共享图片和 API 误归游戏 Worker。

多目标计划标记 `ready: false`、`atomic: false`、`cloudState: not_observed`。没有执行循环、隐式继续下一目标或整批成功状态，也不读取历史报告来假称候选已经通过验收。Router 的路由变更独立审查。

## 验证

| 检查 | 结果 |
|---|---|
| 新生产策略测试 | 35 项通过，包含六目标四类写操作的 24 项拒绝测试 |
| 全发布工具 | 300 Node + 31 Python 通过 |
| Web / Router | 376 / 35 项通过 |
| 类型 | 九包通过 |
| 配置/生成 | 四游戏配置验证、Router 生成对账通过 |
| 数据 | 90/90 镜像一致、pending/holds 0 |
| 策略计划 | 五内容目标和单独 Router 计划成功，均无执行授权 |
| 语法 | 变更 workflow YAML、脚本语法和 diff 空白检查通过 |

子进程拒绝测试带合成凭据/CI 环境和假 pnpm/wrangler/gh/git 哨兵：全部退出 1，未调用外部命令、未创建新文件。直接 legacy CLI 测试提供不存在的 receipt 路径，验证在读取 receipt 或创建发布 lock/记录前拒绝。现有制品摘要、旧资源保留、索引与运行时测试没有移除。

开发过程中先新增测试，首次因统一模块尚未存在失败；首轮全量出现一项新测试断言位置错误（旧资产输入在 build job，生产 job 使用 build 输出摘要），修正测试后全量通过，没有放宽真实 Main workflow 门禁。失败日志与最终原始日志均保留在 `.release-records/production-entrypoint-unification/`。

## 未完成与交付边界

本批完成的是**支持入口的 P1 旁路阻断**，不是完整自动化多 Worker 发布平台。四游戏及 Router 的通用远程执行器、可信来源与新鲜云状态绑定、跨 CI/进程互斥、过期审批与部分失败对账仍待 S5 单独实现及验收。在完成之前，游戏生产命令保持拒绝，不推荐回到历史操作脚本或原始 CLI 绕过。

Main 的既有受控路径保留；不能把游戏同 UUID 推广规则套到 Main 的既有封存产物流程。配置检查只是本地一致性，本轮没有重新查询线上版本或演练真实云写入/回滚，也没有重建五应用的 Worker 包。

本批尚未提交、推送，因此远端旧分支和 workflow 尚未获得这些保护。持有凭据的人仍可使用原始 Cloudflare CLI/API；本地入口不能替代账户级权限控制。本次不自动扩大为凭据变更、生产发布或其他 P2 修复。

使用方式与后续执行器验收要求：`docs/production-release-entrypoints.md`。当前任务状态：`plans/project-task-status-current.md`。本目录 `summary.json` 绑定本批工程文件摘要，计划文件不构成发布授权。

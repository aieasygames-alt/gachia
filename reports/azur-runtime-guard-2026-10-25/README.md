# 蓝色星原运行时防索引修复

2026-10-25。基线 `305bea9`。本批完成工程修复及本地编译验证，未上传 Worker、未切换生产，也未执行账号操作或数据库迁移。

## 修复范围

- 新增 middleware，按解析后的请求 origin hostname 识别 `.workers.dev`，保护稳定直连、版本预览和 staging 主机。robots 返回全站禁止抓取，页面、sitemap 和 404 返回 `X-Robots-Tag: noindex, nofollow`。
- 生产域名保持原 robots、canonical 与索引策略。不读取客户端 `X-Forwarded-Host` 决定索引策略；保留原 preview 构建模式保护，生产包预览不依赖该模式。
- 严格同制品封存工具新增蓝色星原白名单。逐字段核对现有 wrangler 配置，保持 production 构建变量与空环境目标，封存执行配置不携带 staging 块。没有新增上传或生产切流入口。
- 新增可重复执行的本地编译产物检查 `scripts/azur-runtime-guard-smoke.mjs`，不具备远端上传能力。

## 验证结果

| 项目 | 结果 |
|---|---|
| 单元与封存防篡改测试 | 54 通过，包含路径/userinfo 伪装、错误配置、文件或清单修改 |
| 全量发布工具测试 | 264 Node + 31 Python 全部通过 |
| 应用类型检查 | 通过 |
| 四款 Router 游戏配置校验 | 通过；未改 Router |
| 生产模式 OpenNext 构建 | 通过；包括新增 middleware |
| 编译产物 Host 检查 | 4 主机 × 4 路径，共 16 项；同时发送相反的 X-Forwarded-Host，正式域名不误封，Worker 主机不能绕过 |
| 本地页面 / 资源 | 150 个 sitemap 页面 canonical 与状态验证；16 个页面引用资源返回非 HTML 200 |
| 本地浏览器 | 三种语言 × 两个视口，共 6 项通过，无 pageerror |
| Wrangler dry-run | 通过，gzip 1104.90 KiB；无上传 |

本地运行：先使用 Node 22 执行 `pnpm --filter @gachia/game-azur-promilia build:worker`，再运行 `node scripts/azur-runtime-guard-smoke.mjs OUTPUT.json`。检查脚本会启动并关闭本地 Worker，输出必须指向已存在的目录。

## 尚未完成的生产门禁

本批本地构建来自包含本次修改的工作树，不是已封存、已上传的生产候选，不能直接拿这个结果当作远端发布验收。下一批须从干净已推送提交重新构建，读取最新云端版本与旧资产，合并并验证旧资源，严格封存、外部 pin、验证回退兼容；再上传既有服务的版本预览，验收同一制品后才推广并完成生产回归。

当前生产状态仍沿用上一批记录：原神、异环已升级；蓝色星原和绿梦未升级。蓝色星原“缺少运行时防索引实现”的代码缺口已修复，但线上缺口尚未消除。绿梦的上传故障不属于本批修复范围，没有继续重试。

本目录保存可复核的本地验收结果和测试日志；构建日志保留在 `.release-records/azur-runtime-guard/`。这些是本地操作记录，不是远端制品来源证明或生产验收。

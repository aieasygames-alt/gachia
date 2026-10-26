# 累积改动复核与本地发布门禁

日期：2026-10-26。基线 `334de6e`，分支 `codex/security-runtime-closeout`，包含尚未提交的 P1、F2–F4、119 份旧浏览器记录清理。没有推送、触发 Actions、上传、切流或修改真实用户数据。

## 影响范围与复核发现

- Main 运行时代码涉及 URL 规范化、地图瓦片缓存身份、公开分享读取与缓存边界。已重新构建 Main；本轮没有改动四游戏/Router 运行时代码、配置、绑定或路由，不因 package 别名变更重发其他 Worker。
- P1 六目标入口保持 fail-closed，旧 Router 工作流退役；Main 原受控发布 workflow 仍在，游戏/Router 通用远程执行器仍未实现。
- 复核没有发现需新增业务修复的问题，但补跑 Admin 全套发现一个确定的 CI 契约冲突：`deferred-patch-package.test.mjs` 仍断言 deploy/upload 先执行构建。首次为 264 通过、1 失败、17 跳过（admin-before.log）。已更新为验证生产别名精确进入拒绝入口、真实子进程退出 1，同时保留构建补丁检查并校验受控 workflow 内容门禁在构建前。最终 265 通过、17 跳过，未削弱发布门禁。
- 新增 `verify-boundaries.mjs` 为本地新制品回归脚本：只生成隔离配置、以 `--local` 使用合成 D1/R2，使用独立临时状态目录；不复制真实绑定、凭据、路由或环境配置。测试退出后本地 Worker 已停止。

## 本地验收

| 检查 | 结果 |
|---|---|
| Main OpenNext build | 通过，使用 Node 22.22.2 与已验证 Next 补丁 |
| Main Wrangler dry-run | 通过，gzip 2885.40 KiB；dry-run 不上传 |
| Worker 文件可移植性 | 3146 文件、19 链接，通过 |
| 新增边界 HTTP 验收 | 22 条通过，真实新 Worker + 隔离合成 D1/R2 |
| Main 基础运行时 | 32 条 HTTP +18 个浏览器场景通过，包含桌面/手机、语言、交互/延迟脚本/无 JS |
| 发布合约 | Node 300 + Python 31 通过 |
| Web / Data / Router | 438 /168 /35 通过 |
| Admin | 265 通过、17 默认跳过；本轮未运行 Admin 浏览器套件 |
| 类型检查 | 九个配置包全部通过 |
| Lint | 通过，保留既有 auth-dialog ref cleanup warning |
| 依赖审计 | 生产与全量各级均 0 命中 |
| 数据/manifest/raw inventory | 通过，90/90 镜像一致 |
| Router 配置及生成检查 | 四个 dedicated owner 通过 |
| Main fallback sitemap | 本地新制品包含 171/171 个必需 NTE item URL，无云端请求 |

初次 runtime 预检误在仓库根执行，因根包不直接依赖 Next 失败，未开始构建；随后按脚本要求在 apps/web 执行成功。构建保留既有 ref cleanup 和 punycode 弃用提示，没有新增构建错误。包体低于历史 3 MiB 参考线约 186.6 KiB，但未核验当前云账户套餐，不将历史预算当作平台接受证明。

## 真实本地 Worker 边界证明

- F2：非法百分号、截断 UTF-8、编码斜杠/反斜杠均为 400；中文未知路径正常 404，不自重定向；编码 ASCII 路径 301 且查询参数保留，规范页 200。
- F3：以独立 Node SHA-256 预置 Aa.png、BB.png 对应的新命名空间对象，新 Worker 各自 HIT 并返回正确合成字节，没有真实上游瓦片请求。MISS、旧命名空间隔离、错误回源等另由单元测试覆盖。
- F4：永久/未来分享 API 和页面 200，过期/不存在及跨游戏页面 404；实际 HTTP 响应包含 no-store，公开字段白名单正确，HTML 与 JSON 不含合成私有 owner。合成 soon 记录先 200，等待到期后相同 URL 的 API/页面均 404，证明没有被公共缓存头或静态页面绕过。
- 账号停用、共享图片/静态资源及基础阅读交互保留，由现有 runtime 脚本覆盖。本轮不是全站页面、真实登录或完整多 Worker 线上拓扑验收。

## 证据与尚未闭合的生产门禁

本目录保存测试/构建日志、两类运行时结果、扫描结果和源码摘要；合成数据库、R2 本地状态、dry-run 包及完整 Worker 留在忽略的 `.release-records` / 构建目录，不纳入报告。`candidate-source-hashes.json` 是当前候选文件摘要，不是已签名封存制品或远程发布授权。

119 份已批准旧浏览器记录保持删除，另外 59 个保留候选 SHA-256 不变；素材、备份与历史发布证据未删除。

尚未提交/推送，构建来自脏工作区，不可直接当作正式候选推广。仍需干净源码与封存制品绑定、当前生产 UUID/配置和旧静态资源来源验证、回退兼容、云端同制品预览、预算/审批及经授权的生产验收。未查询当前云端状态，未清理旧浏览器/CDN/R2 缓存。Main 发布不自动授权四游戏或 Router 发布，P1 完整远程执行器仍属 S5。

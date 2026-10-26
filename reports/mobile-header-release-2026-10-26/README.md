# 移动端导航修复发布门禁（2026-10-26）

本轮只推进 Main 移动端 sticky header 修复，不发布四游戏或 Router。初始基线为 `71d7851`，与本轮开始时重新 fetch 的 `origin/main` 一致。前一轮本地修复证据见 `reports/mobile-header-fix-2026-10-26/README.md`；原始线上发现保留在 `reports/online-verification-2026-10-26/README.md`。

## 验收门禁补齐

- `.github/workflows/deploy.yml` 增加 staging/production 的实际已发布 header 绘制测试，每侧 42 场景、明确零重试。staging 作业失败阻断 production，不设置 continue-on-error，不自动重试、回滚或重发。
- 两侧既有验收 artifact 追加 JUnit 结果与失败截图目录；不额外上传所有成功场景的大体积截图。原来同一 artifact/内层摘要、旧静态资源保留、内容/XML、版本重读和账号停用门禁不变。
- 新增发布契约测试检查固定 origin、阶段依赖、零重试及 always 保存结果；本地发布测试为 Node 301 + Python 31 通过。

## 当前执行边界

本节为初始发布前记录，后续按实际结果追加，不以本地通过代替云端验收。账号删除保持取消；没有真实账号/分享/R2 业务数据操作、数据库迁移或缓存清除。公网 NUL/点段契约差异不属于本次修复，继续保留。

## 干净提交与本地 Worker 门禁

- 功能提交 `146a8425bddaa6471c981a47f8c8f605c12b1f0b`，分支 `codex/mobile-header-fix`；已推送该分支并快进远端 main，没有重置或覆盖原目录的未提交修改。
- 构建前后 Git 均干净，Node 22.22.2 下重新执行 Main OpenNext build 与 dry-run，gzip 2880.50 KiB；初始可移植性 3146 文件/19 链接通过。
- 新 Worker 的隔离无凭据验收：32 HTTP、18 既有运行时浏览器、42 新增绘制浏览器场景通过；另以独立合成 D1/R2 完成 22 条边界检查。Main fallback sitemap 171/171，内容门禁 90/90 镜像一致、无 pending/hold。
- 当前生产对应旧 artifact `12645502112` 的来源/成功 deploy 日志/活跃 UUID/ZIP 实际摘要均已复核。保留 437 文件、11,129,450 bytes，其中 350 个补入新候选；全部 437 个资源通过本地 Worker HTTP 字节校验。保留后可移植性为 3497 文件/19 链接。
- 初次直连下载旧 ZIP 在 300 秒超时，失败日志保留；随后仅改用已配置的本地代理 `127.0.0.1:7890` 完成下载，未关闭 TLS 校验、未扩展权限或放宽摘要/来源门禁。这不是部署失败或生产重试。
- 新鲜公网只读预检 15 基础 GET、19 owner/静态资源检查通过。控制面确认 Main 仍为 `9addf3a5-ff70-4ad5-9419-eb82b115ec92` 单版本 100%，四游戏及 Router deployment 与上次发布一致。
- production environment 保护规则为空；两个部署开关开启。Actions 剩余额度因当前凭据无 billing user scope 无法观测，已披露，未刷新权限。生产请求会在 staging 完整通过后自动进入 production，不把环境名称当作人工审批证明。

机器摘要见 `local-gates.json`；原始构建、测试、控制面、下载和本地 HTTP 记录在 `.release-records/mobile-header-release-2026-10-26/`。

## 首次 CI 阻断与真实溢出补修

- main push 验证 `40338798567` 在浏览器门禁失败，未进入部署：50 通过、8 失败、8 跳过。失败为英文 390px 的正常/延迟脚本/无 JS，以及 768px 正常脚本，分别在两种 Chromium 模拟配置复现；宽度分别为 410px/769px。原始失败记录保留，不重跑旧 job 或改写为通过。
- 根因不是透明 header：武器卡片头部将较长的资料标签、名称和类型放在不可换行的 flex 行中，grid item 的自动最小宽度随 Linux 字体指标变宽，撑出视口。本地 macOS 默认字体没有触发，但使用 Verdana 后稳定复现 411px；新增宽字体断言先失败，证明不是 CI 开发工具误报。
- `WeaponCard` 增加 `min-w-0`，头部允许 flex-wrap，标题允许收缩与 break-words；没有使用 overflow hidden 掩盖内容、删减提示文字或放宽原来的视口宽度断言。该组件仍仅属于 Main，不改变独立 Worker。
- 在原 42 场景内，英文 390/768px 正常模式追加宽字体滚动/返回检查；本地开发模式最终 42/42，零重试通过。新增 build 浏览器失败归档保留截图/trace 7 天；发布测试新增契约后为 Node 302 + Python 31 通过。
- 首次干净提交/Worker 记录仅证明对应源码在当时本地环境通过，不能代表 Linux 已通过或为补修后的新代码背书。补修须重新干净构建、Worker 验收和新 CI，仍未发起 production workflow。

## 补修后的独立重验

- 补修提交 `a7d52c6b1d1f0475c3bdeecbe05b8b15127993cb` 已推送分支与 main；新 push CI 为 `40343990122`，没有重跑或覆盖失败的第一次 CI。
- 从该干净提交重新构建 Main OpenNext，dry-run gzip 2891.34 KiB；32 HTTP、18 既有运行时浏览器、42 新绘制/宽字体浏览器、22 合成 D1/R2 边界检查全部通过。
- 再次执行旧 artifact 来源/下载摘要验证，437 个保留资源全部通过新 Worker HTTP 字节校验；可移植性、内容与 171/171 fallback sitemap 门禁通过。
- Web 438 测试、Web/新浏览器测试类型、两个修改组件 ESLint、Node 302 + Python 31 发布合约通过。机器摘要见 `font-fix-gates.json`，该记录与首个候选分别保存。
- 复核 `mobile-zh-scrolled.png`、`mobile-zh-returned-list.png`、`mobile-en-wide-font-returned-list.png`、`tablet-en-wide-font-returned-list.png`：导航不透底，卡片完整换行，没有通过裁切隐藏提示内容。这里仍是本地 Worker 截图，不是新版本线上截图。

## 新 CI 通过

main push 验证 [40343990122](https://github.com/aieasygames-alt/gachia/actions/runs/40343990122) 成功，源提交 `a7d52c6`。Linux 浏览器 58 通过、8 跳过、0 失败；build 成功，deploy-staging/deploy 均因 push 事件跳过，没有产生部署。元数据见 `ci-success.json`。

该验证 artifact 不含正式 production 请求的旧资源保留步骤，不能直接推广，也不是当前生产旧资源的来源。正式发布仍必须由新的 production workflow 按当前 UUID 与 artifact `12645502112`/精确 ZIP 摘要重新构建和封存，经 staging 验收同一制品后再发布；不复用本地目录或把跳过的部署算作完成。

后续本段证据与任务表采用文档提交 `[skip ci]`，不改动已验收功能源码、workflow 或测试。Actions 剩余额度仍不可观测，未额外授权凭据或配置环境保护规则。
